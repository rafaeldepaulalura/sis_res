import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ESTABLISHMENT_ROLES } from '../auth/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrinterDto, UpdatePrinterDto } from './dto/printer.dto';
import { PrintingService } from './printing.service';

@Roles(...ESTABLISHMENT_ROLES)
@Controller('printers')
export class PrintingController {
  constructor(
    private readonly printing: PrintingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@CurrentUser('establishmentId') establishmentId: string) {
    return this.prisma.printer.findMany({
      where: { establishmentId },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  @Permissions('configuracoes')
  create(
    @CurrentUser('establishmentId') establishmentId: string,
    @Body() dto: CreatePrinterDto,
  ) {
    return this.prisma.printer.create({
      data: { establishmentId, ...dto },
    });
  }

  @Patch(':id')
  @Permissions('configuracoes')
  async update(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrinterDto,
  ) {
    await this.assertPrinter(establishmentId, id);
    return this.prisma.printer.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  @Permissions('configuracoes')
  async remove(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.assertPrinter(establishmentId, id);
    // As categorias que apontavam para ela voltam a "só tela" (SetNull).
    await this.prisma.printer.delete({ where: { id } });
    return { deleted: true };
  }

  // Página de teste: confere IP, porta, largura e acentuação.
  @Post(':id/test')
  @Permissions('configuracoes')
  test(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.printing.enqueueTest(establishmentId, id);
  }

  // ---- Fila ----

  @Get('jobs/list')
  jobs(@CurrentUser('establishmentId') establishmentId: string) {
    return this.printing.listJobs(establishmentId);
  }

  @Post('jobs/:jobId/retry')
  retry(
    @CurrentUser('establishmentId') establishmentId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.printing.retry(establishmentId, jobId);
  }

  private async assertPrinter(establishmentId: string, id: string) {
    const p = await this.prisma.printer.findFirst({
      where: { id, establishmentId },
    });
    if (!p) throw new NotFoundException('Impressora não encontrada');
  }
}
