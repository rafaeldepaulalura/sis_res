import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { TableActions } from '../components/TableActions';
import { useTables } from '../hooks/useTables';
import { useOpenTab } from '../hooks/useTabs';
import { apiErrorMessage } from '../lib/api';
import type { TableMap, TableStatus } from '../types/api';

const STATUS: Record<
  TableStatus,
  { label: string; card: string; dot: string }
> = {
  FREE: {
    label: 'Livre',
    card: 'bg-white border-gray-200 hover:border-primary',
    dot: 'bg-emerald-500',
  },
  OCCUPIED: {
    label: 'Ocupada',
    card: 'bg-primary/5 border-primary/40 hover:border-primary',
    dot: 'bg-primary',
  },
  AWAITING_PAYMENT: {
    label: 'Aguardando pgto',
    card: 'bg-amber-50 border-amber-300 hover:border-amber-400',
    dot: 'bg-amber-500',
  },
  RESERVED: {
    label: 'Reservada',
    card: 'bg-blue-50 border-blue-200',
    dot: 'bg-blue-500',
  },
};

export function TablesPage() {
  const { data: tables, isLoading, isError } = useTables();
  const openTab = useOpenTab();
  const navigate = useNavigate();
  // Mesa com o painel de mudar/juntar aberto.
  const [actions, setActions] = useState<TableMap | null>(null);

  const areas = useMemo(() => {
    const map = new Map<string, { name: string; tables: TableMap[] }>();
    for (const t of tables ?? []) {
      const entry = map.get(t.roomArea.id) ?? {
        name: t.roomArea.name,
        tables: [],
      };
      entry.tables.push(t);
      map.set(t.roomArea.id, entry);
    }
    return [...map.values()];
  }, [tables]);

  const handleClick = (t: TableMap) => {
    if (t.openTab) {
      navigate(`/comanda/${t.openTab.id}`);
      return;
    }
    openTab.mutate(
      { type: 'TABLE', tableId: t.id },
      {
        onSuccess: (tab) => navigate(`/comanda/${tab.id}`),
        onError: (err) => alert(apiErrorMessage(err, 'Erro ao abrir comanda')),
      },
    );
  };

  if (isLoading) return <p className="text-gray-500">Carregando mesas…</p>;
  if (isError)
    return <p className="text-red-600">Erro ao carregar as mesas.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Mapa de mesas</h1>
        <div className="flex gap-4 text-xs text-gray-500">
          {(
            ['FREE', 'OCCUPIED', 'AWAITING_PAYMENT', 'RESERVED'] as TableStatus[]
          ).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={clsx('h-2.5 w-2.5 rounded-full', STATUS[s].dot)} />
              {STATUS[s].label}
            </span>
          ))}
        </div>
      </div>

      {areas.map((area) => (
        <section key={area.name}>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
            {area.name}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
            {area.tables.map((t) => {
              const s = STATUS[t.status];
              return (
                <div key={t.id} className="relative">
                  <button
                    onClick={() => handleClick(t)}
                    disabled={openTab.isPending}
                    className={clsx(
                      'flex aspect-square w-full flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition disabled:opacity-50',
                      s.card,
                    )}
                  >
                    <span className="text-2xl font-bold text-gray-800">
                      {t.number}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                      <span className={clsx('h-2 w-2 rounded-full', s.dot)} />
                      {s.label}
                    </span>
                  </button>

                  {/* Mudar de mesa / juntar — só onde há conta aberta. */}
                  {t.openTab && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActions(t);
                      }}
                      title="Mudar de mesa ou juntar"
                      className="absolute right-1.5 top-1.5 rounded-md bg-white/90 px-1.5 py-0.5 text-xs text-gray-500 shadow-sm hover:text-primary"
                    >
                      ⇄
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {actions && (
        <TableActions
          origem={actions}
          tables={tables ?? []}
          onClose={() => setActions(null)}
        />
      )}
    </div>
  );
}
