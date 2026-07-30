import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrintJobKind, PrintJobStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { runBypass } from '../prisma/tenant-context';
import { buildEscPos } from './escpos';
import {
  buildKitchenTicket,
  buildTestTicket,
  TicketItem,
} from './print-ticket';
import { sendToPrinter } from './tcp-printer';

// Tenta de novo enquanto a impressora não volta. Depois disso o trabalho
// fica marcado como falho e aparece na tela para reimpressão manual.
const MAX_ATTEMPTS = 5;

export interface KitchenPrintRequest {
  establishmentId: string;
  origem: string;
  waiter?: string | null;
  reprint?: boolean;
  // Itens já agrupados por impressora pelo chamador.
  porImpressora: Map<string, TicketItem[]>;
}

@Injectable()
export class PrintingService {
  private readonly logger = new Logger(PrintingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Cria um trabalho por impressora e dispara o envio sem travar a resposta
  // ao garçom — o pedido some da tela dele mesmo se a impressora estiver fora.
  async enqueueKitchen(req: KitchenPrintRequest): Promise<number> {
    const printerIds = [...req.porImpressora.keys()];
    if (printerIds.length === 0) return 0;

    const printers = await this.prisma.printer.findMany({
      where: {
        id: { in: printerIds },
        establishmentId: req.establishmentId,
        active: true,
      },
    });

    const jobs = printers.map((printer) => ({
      establishmentId: req.establishmentId,
      printerId: printer.id,
      kind: PrintJobKind.KITCHEN,
      title: req.origem,
      content: buildKitchenTicket(
        {
          origem: req.origem,
          setor: printer.name,
          waiter: req.waiter,
          reprint: req.reprint,
          items: req.porImpressora.get(printer.id) ?? [],
          at: new Date(),
        },
        printer.columns,
      ),
    }));
    if (jobs.length === 0) return 0;

    await this.prisma.printJob.createMany({ data: jobs });
    void this.flush(req.establishmentId);
    return jobs.length;
  }

  async enqueueTest(establishmentId: string, printerId: string) {
    const printer = await this.prisma.printer.findFirst({
      where: { id: printerId, establishmentId },
    });
    if (!printer) throw new NotFoundException('Impressora não encontrada');

    await this.prisma.printJob.create({
      data: {
        establishmentId,
        printerId,
        kind: PrintJobKind.TEST,
        title: `Teste — ${printer.name}`,
        content: buildTestTicket(printer.name, printer.columns),
      },
    });
    await this.flush(establishmentId);
    return this.listJobs(establishmentId);
  }

  // Processa a fila do estabelecimento. Chamado após enfileirar e pelo botão
  // "tentar de novo"; roda em bypass porque também é disparado fora de request.
  async flush(establishmentId: string): Promise<void> {
    await runBypass(async () => {
      const pendentes = await this.prisma.printJob.findMany({
        where: {
          establishmentId,
          status: { in: [PrintJobStatus.PENDING, PrintJobStatus.PRINTING] },
          attempts: { lt: MAX_ATTEMPTS },
        },
        orderBy: { createdAt: 'asc' },
        include: { printer: true },
        take: 20,
      });

      for (const job of pendentes) {
        const copies = Math.max(1, job.printer.copies);
        try {
          const bytes = buildEscPos(job.content);
          for (let i = 0; i < copies; i++) {
            await sendToPrinter(job.printer.host, job.printer.port, bytes);
          }
          await this.prisma.printJob.update({
            where: { id: job.id },
            data: {
              status: PrintJobStatus.DONE,
              printedAt: new Date(),
              attempts: { increment: 1 },
              lastError: null,
            },
          });
        } catch (e) {
          const attempts = job.attempts + 1;
          const erro = e instanceof Error ? e.message : 'Falha desconhecida';
          this.logger.warn(
            `Impressão falhou (${job.printer.name}, tentativa ${attempts}): ${erro}`,
          );
          await this.prisma.printJob.update({
            where: { id: job.id },
            data: {
              // Esgotou as tentativas: para de tentar e fica visível na tela.
              status:
                attempts >= MAX_ATTEMPTS
                  ? PrintJobStatus.FAILED
                  : PrintJobStatus.PENDING,
              attempts,
              lastError: erro,
            },
          });
        }
      }
    });
  }

  listJobs(establishmentId: string) {
    return this.prisma.printJob.findMany({
      where: { establishmentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { printer: { select: { name: true } } },
    });
  }

  // Reimprime um trabalho: zera as tentativas e devolve para a fila.
  async retry(establishmentId: string, jobId: string) {
    const job = await this.prisma.printJob.findFirst({
      where: { id: jobId, establishmentId },
    });
    if (!job) throw new NotFoundException('Impressão não encontrada');
    await this.prisma.printJob.update({
      where: { id: jobId },
      data: { status: PrintJobStatus.PENDING, attempts: 0, lastError: null },
    });
    await this.flush(establishmentId);
    return this.listJobs(establishmentId);
  }
}
