import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useOpenTabs, type OpenTabSummary } from '../hooks/useOpenTabs';
import { brl } from '../lib/format';
import type { TabType } from '../types/api';

const TYPE_LABEL: Record<TabType, string> = {
  TABLE: 'Mesa',
  INDIVIDUAL: 'Individual',
  COUNTER: 'Balcão',
  DELIVERY: 'Delivery',
};

const TYPE_ICON: Record<TabType, string> = {
  TABLE: '🍽️',
  INDIVIDUAL: '👤',
  COUNTER: '🧾',
  DELIVERY: '🛵',
};

function title(t: OpenTabSummary) {
  if (t.table) return `Mesa ${t.table.number}`;
  return t.label ?? TYPE_LABEL[t.type];
}

function elapsed(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`;
}

const FILTERS: { key: TabType | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Todas' },
  { key: 'TABLE', label: 'Mesas' },
  { key: 'COUNTER', label: 'Balcão' },
  { key: 'INDIVIDUAL', label: 'Individuais' },
  { key: 'DELIVERY', label: 'Delivery' },
];

export function ComandasPage() {
  const { data: tabs, isLoading } = useOpenTabs();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TabType | 'ALL'>('ALL');

  const list = (tabs ?? []).filter((t) => filter === 'ALL' || t.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">
          Comandas abertas{' '}
          <span className="text-base font-normal text-gray-400">
            ({tabs?.length ?? 0})
          </span>
        </h1>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                'rounded-full px-3 py-1 text-sm transition',
                filter === f.key
                  ? 'bg-primary text-primary-fg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Carregando…</p>
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          Nenhuma comanda aberta.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {list.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/comanda/${t.id}`)}
              className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-primary hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-gray-800">
                  <span>{TYPE_ICON[t.type]}</span>
                  {title(t)}
                </span>
                {t.status === 'AWAITING_PAYMENT' && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                    pgto
                  </span>
                )}
              </div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {brl(t.totals.total)}
              </div>
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>{t.itemCount} item(s)</span>
                <span>{elapsed(t.openedAt)}</span>
              </div>
              {t.waiter && (
                <div className="mt-1 text-xs text-gray-400">{t.waiter.name}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
