import { useState } from 'react';
import clsx from 'clsx';
import { useSalesReport, useTabsReport, useWaitersReport } from '../hooks/useReports';
import { brl } from '../lib/format';

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
  PIX: 'PIX',
  OTHER: 'Outro',
};

const TAB_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Aberta',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  CLOSED: 'Fechada',
  CANCELLED: 'Cancelada',
};

const TAB_STATUS_CLS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  AWAITING_PAYMENT: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

function isoDaysAgo(days: number) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().slice(0, 10);
}

const PRESETS: { label: string; from: number; to: number }[] = [
  { label: 'Hoje', from: 0, to: 0 },
  { label: 'Ontem', from: 1, to: 1 },
  { label: 'Últimos 7 dias', from: 6, to: 0 },
  { label: 'Últimos 30 dias', from: 29, to: 0 },
];

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export function RelatoriosPage() {
  const [from, setFrom] = useState(isoDaysAgo(6));
  const [to, setTo] = useState(isoDaysAgo(0));
  const { data, isLoading } = useSalesReport(from, to);
  const { data: waiters } = useWaitersReport(from, to);
  const { data: tabs } = useTabsReport(isoDaysAgo(0));

  const maxDay = Math.max(1, ...(data?.byDay.map((d) => Number(d.total)) ?? [0]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Relatório de vendas</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {PRESETS.map((p) => {
            const active = from === isoDaysAgo(p.from) && to === isoDaysAgo(p.to);
            return (
              <button
                key={p.label}
                onClick={() => {
                  setFrom(isoDaysAgo(p.from));
                  setTo(isoDaysAgo(p.to));
                }}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-sm transition',
                  active
                    ? 'bg-primary text-primary-fg'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50',
                )}
              >
                {p.label}
              </button>
            );
          })}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 outline-none focus:border-primary" />
          <span className="text-gray-400">até</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 outline-none focus:border-primary" />
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-gray-500">Carregando…</p>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card label="Vendas" value={brl(data.summary.total)} />
            <Card label="Pedidos" value={String(data.summary.orders)} />
            <Card label="Ticket médio" value={brl(data.summary.averageTicket)} />
            <Card label="Descontos" value={brl(data.summary.discount)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Por dia */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-3 font-medium text-gray-800">Por dia</h2>
              <div className="space-y-2">
                {data.byDay.map((d) => (
                  <div key={d.date} className="text-sm">
                    <div className="mb-1 flex justify-between text-gray-600">
                      <span>
                        {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                      <span className="font-medium text-gray-800">
                        {brl(d.total)} · {d.orders}p
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${(Number(d.total) / maxDay) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {data.byDay.length === 0 && (
                  <p className="text-sm text-gray-400">Sem vendas no período.</p>
                )}
              </div>
            </div>

            {/* Por forma de pagamento */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-3 font-medium text-gray-800">Por forma de pagamento</h2>
              <table className="w-full text-sm">
                <tbody>
                  {data.byPaymentMethod.map((m) => (
                    <tr key={m.method} className="border-b border-gray-50">
                      <td className="py-1.5 text-gray-600">
                        {METHOD_LABEL[m.method] ?? m.method}
                      </td>
                      <td className="py-1.5 text-right text-gray-400">{m.count}x</td>
                      <td className="py-1.5 text-right font-medium text-gray-800">
                        {brl(m.total)}
                      </td>
                    </tr>
                  ))}
                  {data.byPaymentMethod.length === 0 && (
                    <tr><td className="py-2 text-gray-400">Sem pagamentos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Por produto */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-medium text-gray-800">Por produto</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400">
                  <th className="pb-2">Produto</th>
                  <th className="pb-2 text-right">Qtd</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.byProduct.map((p) => (
                  <tr key={p.name} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-700">{p.name}</td>
                    <td className="py-1.5 text-right text-gray-600">{p.quantity}</td>
                    <td className="py-1.5 text-right font-medium text-gray-800">
                      {brl(p.total)}
                    </td>
                  </tr>
                ))}
                {data.byProduct.length === 0 && (
                  <tr><td className="py-2 text-gray-400">Sem produtos vendidos.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Por garçom */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-medium text-gray-800">Vendas por garçom</h2>
            <table className="w-full text-sm">
              <tbody>
                {waiters?.waiters.map((w) => (
                  <tr key={w.name} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-700">{w.name}</td>
                    <td className="py-1.5 text-right text-gray-400">
                      {w.orders} pedido(s)
                    </td>
                    <td className="py-1.5 text-right font-medium text-gray-800">
                      {brl(w.total)}
                    </td>
                  </tr>
                ))}
                {(!waiters || waiters.waiters.length === 0) && (
                  <tr>
                    <td className="py-2 text-gray-400">Sem vendas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Comandas do dia (hoje) — inclui as ainda em andamento */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-medium text-gray-800">Comandas do dia</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400">
                  <th className="pb-2">Comanda</th>
                  <th className="pb-2">Atendente</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Itens</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Abertura</th>
                </tr>
              </thead>
              <tbody>
                {tabs?.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-700">
                      {t.label}
                      {t.isDelivery && ' 🛵'}
                    </td>
                    <td className="py-1.5 text-gray-600">
                      {t.waiterName ?? t.courierName ?? '—'}
                    </td>
                    <td className="py-1.5">
                      {/* Conta juntada em outra não é venda: mostra o destino
                          em vez de "Fechada" com valor zerado. */}
                      {t.mergedInto ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                          Juntada com {t.mergedInto}
                        </span>
                      ) : (
                        <span
                          className={clsx(
                            'rounded-full px-2 py-0.5 text-xs',
                            TAB_STATUS_CLS[t.status],
                          )}
                        >
                          {TAB_STATUS_LABEL[t.status]}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-gray-600">
                      {t.itemCount}
                    </td>
                    <td className="py-1.5 text-right font-medium text-gray-800">
                      {brl(t.total)}
                    </td>
                    <td className="py-1.5 text-right text-gray-400">
                      {new Date(t.openedAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
                {tabs?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-2 text-gray-400">
                      Nenhuma comanda aberta hoje.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
