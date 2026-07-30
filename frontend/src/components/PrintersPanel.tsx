import { useState } from 'react';
import clsx from 'clsx';
import {
  useCreatePrinter,
  useDeletePrinter,
  usePrinters,
  usePrintJobs,
  useRetryJob,
  useTestPrinter,
  useUpdatePrinter,
  type PrintJob,
} from '../hooks/usePrinters';
import { useCategories } from '../hooks/useCatalog';
import { useUpdateCategory } from '../hooks/useCatalogAdmin';
import { apiErrorMessage } from '../lib/api';

const STATUS: Record<PrintJob['status'], { label: string; cls: string }> = {
  PENDING: { label: 'na fila', cls: 'bg-amber-100 text-amber-700' },
  PRINTING: { label: 'enviando', cls: 'bg-blue-100 text-blue-700' },
  DONE: { label: 'impresso', cls: 'bg-emerald-100 text-emerald-700' },
  FAILED: { label: 'falhou', cls: 'bg-red-100 text-red-600' },
};

// Impressoras de rede por setor + para onde vai cada categoria do cardápio.
export function PrintersPanel() {
  const { data: printers } = usePrinters();
  const { data: categories } = useCategories();
  const { data: jobs } = usePrintJobs();
  const create = useCreatePrinter();
  const update = useUpdatePrinter();
  const del = useDeletePrinter();
  const test = useTestPrinter();
  const retry = useRetryJob();
  const updateCategory = useUpdateCategory();

  const [f, setF] = useState({ name: '', host: '', port: '9100', columns: '48' });
  const pendentes = (jobs ?? []).filter(
    (j) => j.status === 'PENDING' || j.status === 'FAILED',
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-1 font-medium text-gray-800">Impressoras</h2>
      <p className="mb-4 text-xs text-gray-500">
        Impressora térmica ligada na rede (cabo ou wi-fi), com IP fixo. O
        sistema fala direto com ela — não precisa de programa instalado em
        nenhum computador.
      </p>

      <div className="mb-4 space-y-2">
        {printers?.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 px-3 py-2"
          >
            <span className="font-medium text-gray-800">{p.name}</span>
            <span className="font-mono text-xs text-gray-500">
              {p.host}:{p.port}
            </span>
            <span className="text-xs text-gray-400">
              {p.columns === 32 ? '58mm' : '80mm'}
              {p.copies > 1 && ` · ${p.copies} vias`}
            </span>
            <span className="ml-auto flex items-center gap-3 text-xs">
              <button
                onClick={() =>
                  test.mutate(p.id, { onError: (e) => alert(apiErrorMessage(e)) })
                }
                disabled={test.isPending}
                className="text-primary hover:underline disabled:opacity-50"
              >
                imprimir teste
              </button>
              <button
                onClick={() =>
                  update.mutate({ id: p.id, dto: { active: !p.active } })
                }
                className={
                  p.active
                    ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700'
                    : 'rounded-full bg-gray-100 px-2 py-0.5 text-gray-500'
                }
              >
                {p.active ? 'ativa' : 'inativa'}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Remover a impressora "${p.name}"?`))
                    del.mutate(p.id, {
                      onError: (e) => alert(apiErrorMessage(e)),
                    });
                }}
                className="text-gray-300 hover:text-red-500"
                title="Remover"
              >
                ✕
              </button>
            </span>
          </div>
        ))}
        {printers?.length === 0 && (
          <p className="text-sm text-gray-400">
            Nenhuma impressora — os pedidos só aparecem na tela da cozinha.
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-3">
        <div className="text-sm font-medium text-gray-700">Nova impressora</div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={f.name}
            onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))}
            placeholder="Setor (ex: Cozinha, Copa)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={f.host}
            onChange={(e) => setF((s) => ({ ...s, host: e.target.value }))}
            placeholder="IP (ex: 192.168.0.50)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={f.port}
            onChange={(e) => setF((s) => ({ ...s, port: e.target.value }))}
            placeholder="Porta"
            inputMode="numeric"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <select
            value={f.columns}
            onChange={(e) => setF((s) => ({ ...s, columns: e.target.value }))}
            className="rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="48">Bobina 80mm (padrão)</option>
            <option value="32">Bobina 58mm</option>
          </select>
        </div>
        <p className="text-xs text-gray-400">
          A porta quase sempre é 9100. O IP você encontra imprimindo a
          autoteste da impressora (segure o botão de avanço ao ligar).
        </p>
        <button
          onClick={() =>
            create.mutate(
              {
                name: f.name.trim(),
                host: f.host.trim(),
                port: Number(f.port) || 9100,
                columns: Number(f.columns) || 48,
              },
              {
                onSuccess: () =>
                  setF({ name: '', host: '', port: '9100', columns: '48' }),
                onError: (e) => alert(apiErrorMessage(e)),
              },
            )
          }
          disabled={!f.name.trim() || !f.host.trim()}
          className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
        >
          Adicionar impressora
        </button>
      </div>

      {/* Roteamento: qual setor prepara cada categoria. */}
      <div className="mt-5 border-t border-gray-100 pt-4">
        <div className="mb-1 text-sm font-medium text-gray-700">
          Para onde vai cada categoria
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Bebida para a copa, lanche para a chapa. Categoria sem impressora não
          imprime — o setor acompanha pela tela da cozinha.
        </p>
        <div className="space-y-1">
          {categories?.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm"
            >
              <span className="flex-1 text-gray-700">{c.name}</span>
              <select
                value={c.printerId ?? ''}
                onChange={(e) =>
                  updateCategory.mutate({
                    id: c.id,
                    dto: { printerId: e.target.value || null },
                  })
                }
                className="rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-primary"
              >
                <option value="">só tela</option>
                {printers?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Fila: o que travou fica visível para reimprimir. */}
      {(jobs ?? []).length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Últimas impressões
            </span>
            {pendentes.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                {pendentes.length} pendente(s)
              </span>
            )}
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {jobs?.slice(0, 15).map((j) => (
              <div
                key={j.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-50 px-2 py-1.5 text-xs"
              >
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 font-medium',
                    STATUS[j.status].cls,
                  )}
                >
                  {STATUS[j.status].label}
                </span>
                <span className="text-gray-700">{j.printer.name}</span>
                <span className="text-gray-400">{j.title}</span>
                {j.lastError && (
                  <span
                    className="max-w-full truncate text-red-500"
                    title={j.lastError}
                  >
                    {j.lastError}
                  </span>
                )}
                {j.status !== 'DONE' && (
                  <button
                    onClick={() =>
                      retry.mutate(j.id, {
                        onError: (e) => alert(apiErrorMessage(e)),
                      })
                    }
                    className="ml-auto text-primary hover:underline"
                  >
                    tentar de novo
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
