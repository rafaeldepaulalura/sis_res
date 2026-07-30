import {
  useKitchenQueue,
  useUpdateKitchenStatus,
  type KitchenItem,
} from '../hooks/useKitchen';
import { itemLabel } from '../lib/format';
import type { TabItemStatus } from '../types/api';

type KitchenTargetStatus =
  | 'SENT_TO_KITCHEN'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED';

const COLUMNS: {
  status: TabItemStatus;
  title: string;
  accent: string;
  prev?: { status: KitchenTargetStatus; label: string };
  next?: { status: KitchenTargetStatus; label: string };
}[] = [
  {
    status: 'SENT_TO_KITCHEN',
    title: 'Na fila',
    accent: 'border-t-gray-400',
    next: { status: 'PREPARING', label: 'Preparar' },
  },
  {
    status: 'PREPARING',
    title: 'Preparando',
    accent: 'border-t-indigo-500',
    prev: { status: 'SENT_TO_KITCHEN', label: '◀ Voltar' },
    next: { status: 'READY', label: 'Pronto ✓' },
  },
  {
    status: 'READY',
    title: 'Pronto',
    accent: 'border-t-emerald-500',
    prev: { status: 'PREPARING', label: '◀ Voltar' },
    next: { status: 'DELIVERED', label: 'Entregue' },
  },
  {
    status: 'DELIVERED',
    title: 'Entregue',
    accent: 'border-t-gray-300',
    prev: { status: 'READY', label: '◀ Voltar' },
  },
];

function elapsed(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'agora';
  return `${mins} min`;
}

// Agrupa os itens de uma mesma comanda para exibir juntos no KDS — a cozinha
// precisa ver de cara que vários pratos pertencem a um único pedido.
function groupByTab(items: KitchenItem[]): KitchenItem[][] {
  const map = new Map<string, KitchenItem[]>();
  for (const item of items) {
    const group = map.get(item.tab.id);
    if (group) group.push(item);
    else map.set(item.tab.id, [item]);
  }
  return Array.from(map.values());
}

function ItemLine({ item }: { item: KitchenItem }) {
  const update = useUpdateKitchenStatus();
  const col = COLUMNS.find((c) => c.status === item.status)!;

  return (
    <div className="pt-2 first:pt-0">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-gray-800">
          {item.quantity}× {itemLabel(item)}
        </span>
        <span className="text-xs text-gray-400">{elapsed(item.createdAt)}</span>
      </div>
      {/* Complementos e observação: é o que muda o preparo, então ficam
          destacados — a cozinha lê isso antes de montar o prato. */}
      {item.modifiers?.length > 0 && (
        <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
          {item.modifiers.map((m) => m.name).join(' · ')}
        </div>
      )}
      {item.notes && (
        <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
          {item.notes}
        </div>
      )}
      {(col.prev || col.next) && (
        <div className="mt-1.5 flex gap-1.5">
          {col.prev && (
            <button
              onClick={() =>
                update.mutate({ itemId: item.id, status: col.prev!.status })
              }
              disabled={update.isPending}
              title="Voltar ao status anterior"
              className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              {col.prev.label}
            </button>
          )}
          {col.next && (
            <button
              onClick={() =>
                update.mutate({ itemId: item.id, status: col.next!.status })
              }
              disabled={update.isPending}
              className="flex-1 rounded-md bg-gray-900 py-1 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {col.next.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Um "ticket" por comanda: agrupa todos os itens do mesmo pedido num único
// cartão, com o local/atendente exibido uma vez só no topo.
function OrderTicket({ items }: { items: KitchenItem[] }) {
  const first = items[0];
  const where = first.tab.table
    ? `Mesa ${first.tab.table.number}`
    : first.tab.label ?? 'Balcão';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">{where}</span>
        {items.length > 1 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {items.length} itens
          </span>
        )}
      </div>
      {first.tab.waiter && (
        <div className="text-xs text-gray-500">{first.tab.waiter.name}</div>
      )}
      <div className="mt-1 divide-y divide-gray-100">
        {items.map((item) => (
          <ItemLine key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export function KitchenPage() {
  const { data: items, isLoading } = useKitchenQueue();

  if (isLoading) return <p className="text-gray-500">Carregando cozinha…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Cozinha (KDS)</h1>
        <span className="flex items-center gap-1 text-xs text-emerald-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          tempo real
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {COLUMNS.map((col) => {
          const colItems = (items ?? []).filter((i) => i.status === col.status);
          return (
            <div
              key={col.status}
              className={`rounded-xl border-t-4 bg-gray-100/60 p-3 ${col.accent}`}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-gray-700">
                  {col.title}
                </h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
                  {colItems.length}
                </span>
              </div>
              <div className="space-y-2">
                {groupByTab(colItems).map((group) => (
                  <OrderTicket key={group[0].tab.id} items={group} />
                ))}
                {colItems.length === 0 && (
                  <p className="py-6 text-center text-xs text-gray-400">
                    Vazio
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
