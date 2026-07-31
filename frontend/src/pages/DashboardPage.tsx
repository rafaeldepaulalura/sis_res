import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { AreaChart, BarChart, DonutChart } from '../components/Charts';
import { useDashboard, type Dashboard } from '../hooks/useDashboard';
import { useEstablishmentBranding } from '../hooks/useEstablishmentBranding';
import { brl } from '../lib/format';
import { imagemSrc } from '../lib/imagem';

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
  PIX: 'PIX',
  OTHER: 'Outro',
};

// Cor fixa por forma de pagamento — a legenda tem que casar com a rosca.
const METHOD_COLOR: Record<string, string> = {
  CASH: 'text-emerald-500',
  CREDIT: 'text-emerald-700',
  DEBIT: 'text-emerald-400',
  PIX: 'text-teal-500',
  OTHER: 'text-gray-400',
};

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

function Panel({
  title,
  legend,
  children,
}: {
  title: string;
  legend?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-800">{title}</h2>
        {legend && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-current" />
            {legend}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// Variação vs. período anterior. Sem base de comparação, não mostra nada.
function Delta({ value, hint }: { value: number | null; hint: string }) {
  if (value === null) return <span className="text-xs text-gray-400">{hint}</span>;
  const up = value >= 0;
  return (
    <span
      className={clsx(
        'text-xs font-medium',
        up ? 'text-emerald-600' : 'text-red-600',
      )}
    >
      {up ? '↑' : '↓'} {Math.abs(value).toLocaleString('pt-BR')}%{' '}
      <span className="font-normal text-gray-400">{hint}</span>
    </span>
  );
}

function Kpi({
  icon,
  tint,
  label,
  value,
  delta,
}: {
  icon: string;
  tint: string;
  label: string;
  value: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg',
            tint,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            {label}
          </div>
          <div className="truncate text-2xl font-semibold text-gray-900">
            {value}
          </div>
          {delta}
        </div>
      </div>
    </div>
  );
}

function OperationalRow({
  icon,
  tint,
  label,
  value,
  hint,
}: {
  icon: string;
  tint: string;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className={clsx(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm',
          tint,
        )}
      >
        {icon}
      </span>
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      <span className="text-right">
        <span className="block font-semibold text-gray-900">{value}</span>
        {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
      </span>
    </div>
  );
}

function Alerts({ data }: { data: Dashboard }) {
  const { lateKitchenTabs, lateMinutes } = data.alerts;
  return (
    <div className="space-y-2">
      {lateKitchenTabs > 0 ? (
        <div className="flex gap-2 rounded-lg bg-amber-50 p-2.5">
          <span>⚠️</span>
          <span className="text-xs">
            <span className="block font-medium text-amber-900">
              {lateKitchenTabs} pedido(s) há mais de {lateMinutes} min
            </span>
            <span className="text-amber-700">na cozinha</span>
          </span>
        </div>
      ) : (
        <div className="flex gap-2 rounded-lg bg-emerald-50 p-2.5">
          <span>✅</span>
          <span className="text-xs">
            <span className="block font-medium text-emerald-900">
              Cozinha em dia
            </span>
            <span className="text-emerald-700">
              nenhum pedido atrasado agora
            </span>
          </span>
        </div>
      )}
      {data.operational.tablesTotal === 0 && (
        <div className="flex gap-2 rounded-lg bg-gray-50 p-2.5">
          <span>💡</span>
          <span className="text-xs">
            <span className="block font-medium text-gray-800">
              Nenhuma mesa cadastrada
            </span>
            <Link to="/configuracoes" className="text-primary hover:underline">
              cadastrar em Configurações
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: branding } = useEstablishmentBranding();
  const [now, setNow] = useState(new Date());

  // Relógio da tela — o painel costuma ficar aberto o expediente inteiro.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (isLoading || !data) {
    return <p className="text-gray-500">Carregando…</p>;
  }

  const nome = branding?.name ?? 'seu restaurante';
  const s = data.summary;
  const op = data.operational;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Visão geral</h1>

      {/* Apresentação: quem é a casa, que dia e que horas são. */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-5">
        {branding?.logoUrl ? (
          <img
            src={imagemSrc(branding.logoUrl)}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-2xl">
            🏪
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold text-gray-900">
            Bem-vindo(a) ao {nome}! 👋
          </div>
          <p className="text-sm text-gray-500">
            Tudo em ordem por aqui. Acompanhe o desempenho do seu restaurante em
            tempo real e gerencie suas operações com facilidade.
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">{dateFmt.format(now)}</div>
          <div className="text-2xl font-semibold text-gray-900">
            {timeFmt.format(now)}
          </div>
        </div>
      </div>

      {/* Indicadores do dia. Sem permissão de relatórios, o dinheiro some. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {s ? (
          <>
            <Kpi
              icon="💵"
              tint="bg-emerald-50"
              label="Vendas do dia"
              value={brl(s.salesToday)}
              delta={<Delta value={s.salesTodayChange} hint="vs ontem" />}
            />
            <Kpi
              icon="📅"
              tint="bg-emerald-50"
              label="Vendas da semana"
              value={brl(s.salesWeek)}
              delta={
                <Delta value={s.salesWeekChange} hint="vs semana passada" />
              }
            />
            <Kpi
              icon="🧾"
              tint="bg-blue-50"
              label="Pedidos hoje"
              value={String(s.ordersToday)}
              delta={<Delta value={s.ordersTodayChange} hint="vs ontem" />}
            />
            <Kpi
              icon="🎯"
              tint="bg-violet-50"
              label="Ticket médio"
              value={brl(s.averageTicket)}
              delta={<Delta value={s.averageTicketChange} hint="vs ontem" />}
            />
          </>
        ) : (
          <>
            <Kpi
              icon="🍽️"
              tint="bg-emerald-50"
              label="Mesas ocupadas"
              value={`${op.tablesOccupied} de ${op.tablesTotal}`}
            />
            <Kpi
              icon="👨‍🍳"
              tint="bg-amber-50"
              label="Na cozinha"
              value={String(op.kitchenTabs)}
            />
            <Kpi
              icon="🛵"
              tint="bg-blue-50"
              label="Entregas ativas"
              value={String(op.activeDeliveries)}
            />
            <Kpi
              icon="🪑"
              tint="bg-gray-100"
              label="Mesas livres"
              value={String(op.tablesFree)}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Coluna dos gráficos */}
        <div className="grid gap-4 lg:col-span-2 xl:grid-cols-2">
          {data.showsRevenue && (
            <>
              <Panel title="Vendas do dia por hora" legend="Vendas (R$)">
                <AreaChart
                  points={data.salesByHour.map((h) => ({
                    label: `${h.hour}h`,
                    value: Number(h.total),
                  }))}
                  labelEvery={3}
                  empty="Nenhuma venda registrada hoje."
                />
              </Panel>

              <Panel title="Vendas da semana" legend="Vendas (R$)">
                <BarChart
                  points={data.salesByDay.map((d) => ({
                    label: d.weekday,
                    value: Number(d.total),
                  }))}
                  empty="Sem vendas nos últimos 7 dias."
                />
              </Panel>
            </>
          )}

          <Panel title="Pedidos por hora (hoje)" legend="Pedidos">
            <AreaChart
              points={data.salesByHour.map((h) => ({
                label: `${h.hour}h`,
                value: h.orders,
              }))}
              colorClass="text-blue-500"
              labelEvery={3}
              integer
              empty="Nenhum pedido registrado hoje."
            />
          </Panel>

          <Panel title="Últimos pedidos">
            {data.recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Nenhum pedido fechado ainda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="pb-2 font-medium">Origem</th>
                      <th className="pb-2 font-medium">Cliente</th>
                      {data.showsRevenue && (
                        <th className="pb-2 text-right font-medium">Valor</th>
                      )}
                      <th className="pb-2 text-right font-medium">Horário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.id} className="border-t border-gray-50">
                        <td className="py-2">
                          <Link
                            to={`/comanda/${o.tabId}`}
                            className="text-gray-800 hover:text-primary hover:underline"
                          >
                            {o.label}
                          </Link>
                          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                            {o.kind}
                          </span>
                        </td>
                        <td className="py-2 text-gray-500">
                          {o.customerName ?? 'Consumidor final'}
                        </td>
                        {data.showsRevenue && (
                          <td className="py-2 text-right font-medium text-gray-800">
                            {o.total ? brl(o.total) : '—'}
                          </td>
                        )}
                        <td className="py-2 text-right text-gray-500">
                          {timeFmt.format(new Date(o.at))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Coluna lateral: operação em tempo real */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-1 text-sm font-medium text-gray-800">
              Resumo operacional
            </h2>
            <div className="divide-y divide-gray-50">
              <OperationalRow
                icon="🍽️"
                tint="bg-emerald-50"
                label="Mesas ocupadas"
                value={op.tablesOccupied}
                hint={`de ${op.tablesTotal}`}
              />
              <OperationalRow
                icon="🪑"
                tint="bg-gray-100"
                label="Mesas livres"
                value={op.tablesFree}
                hint={`de ${op.tablesTotal}`}
              />
              <OperationalRow
                icon="👨‍🍳"
                tint="bg-amber-50"
                label="Pedidos em andamento"
                value={op.kitchenTabs}
                hint="na cozinha"
              />
              <OperationalRow
                icon="🛵"
                tint="bg-blue-50"
                label="Entregas ativas"
                value={op.activeDeliveries}
                hint="em rota"
              />
            </div>
          </div>

          {data.showsRevenue && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-medium text-gray-800">
                Formas de pagamento (hoje)
              </h2>
              {data.paymentMethods.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">
                  Nenhum pagamento hoje.
                </p>
              ) : (
                <div className="flex items-center gap-4">
                  <DonutChart
                    slices={data.paymentMethods.map((m) => ({
                      label: m.method,
                      percent: m.percent,
                      colorClass: METHOD_COLOR[m.method] ?? 'text-gray-400',
                    }))}
                  />
                  <div className="flex-1 space-y-1.5">
                    {data.paymentMethods.map((m) => (
                      <div
                        key={m.method}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={clsx(
                            'h-2.5 w-2.5 rounded-full bg-current',
                            METHOD_COLOR[m.method] ?? 'text-gray-400',
                          )}
                        />
                        <span className="flex-1 text-gray-600">
                          {METHOD_LABEL[m.method] ?? m.method}
                        </span>
                        <span className="font-medium text-gray-800">
                          {m.percent}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-800">
              Alertas rápidos
            </h2>
            <Alerts data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
