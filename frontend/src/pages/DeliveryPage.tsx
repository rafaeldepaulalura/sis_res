import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  useAssignCourier,
  useCouriers,
  useCreateCourier,
  useCreateDelivery,
  useDeliveries,
  useEligibleOrders,
  useTabDeliveries,
  useUpdateCourier,
  useUpdateDeliveryStatus,
  type TabDeliveryRow,
} from '../hooks/useDelivery';
import { apiErrorMessage } from '../lib/api';
import { brl } from '../lib/format';
import type { DeliveryOrder, DeliveryStatus } from '../types/api';

const STATUS: Record<DeliveryStatus, { label: string; cls: string }> = {
  RECEIVED: { label: 'Recebido', cls: 'bg-gray-100 text-gray-600' },
  PREPARING: { label: 'Preparando', cls: 'bg-indigo-100 text-indigo-700' },
  OUT_FOR_DELIVERY: { label: 'Saiu p/ entrega', cls: 'bg-amber-100 text-amber-700' },
  DELIVERED: { label: 'Entregue', cls: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-red-100 text-red-600' },
};

function CouriersPanel() {
  const { data: couriers } = useCouriers();
  const create = useCreateCourier();
  const update = useUpdateCourier();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 font-medium text-gray-800">Entregadores</h2>
      <ul className="mb-3 space-y-1">
        {couriers?.map((c) => (
          <li key={c.id} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className={clsx('h-2 w-2 rounded-full', c.available ? 'bg-emerald-500' : 'bg-gray-300')} />
              {c.name}
            </span>
            <button
              onClick={() => update.mutate({ id: c.id, dto: { available: !c.available } })}
              className="text-xs text-gray-500 hover:underline"
            >
              {c.available ? 'ocupar' : 'liberar'}
            </button>
          </li>
        ))}
        {couriers?.length === 0 && <li className="text-sm text-gray-400">Nenhum entregador.</li>}
      </ul>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" className="w-32 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary" />
        <button
          onClick={() =>
            create.mutate(
              { name, phone },
              { onSuccess: () => { setName(''); setPhone(''); }, onError: (e) => alert(apiErrorMessage(e)) },
            )
          }
          disabled={!name || !phone}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-fg disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  );
}

function NewDeliveryPanel() {
  const { data: orders } = useEligibleOrders();
  const create = useCreateDelivery();
  const [orderId, setOrderId] = useState('');
  const [addressId, setAddressId] = useState('');
  const [fee, setFee] = useState('');

  const selected = orders?.find((o) => o.id === orderId);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 font-medium text-gray-800">Nova entrega</h2>
      {orders?.length === 0 ? (
        <p className="text-sm text-gray-400">
          Nenhum pedido fechado com cliente disponível.
        </p>
      ) : (
        <div className="space-y-2">
          <select value={orderId} onChange={(e) => { setOrderId(e.target.value); setAddressId(''); }} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:border-primary">
            <option value="">Selecione um pedido…</option>
            {orders?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.customer.name} · {brl(o.total)} · {new Date(o.createdAt).toLocaleTimeString('pt-BR')}
              </option>
            ))}
          </select>
          {selected && (
            <select value={addressId} onChange={(e) => setAddressId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:border-primary">
              <option value="">Endereço de entrega…</option>
              {selected.customer.addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}: {a.street}, {a.number} - {a.neighborhood}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <input value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Taxa R$" inputMode="decimal" className="w-28 rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:border-primary" />
            <button
              onClick={() =>
                create.mutate(
                  { orderId, customerAddressId: addressId, deliveryFee: fee ? Number(fee.replace(',', '.')) : undefined },
                  { onSuccess: () => { setOrderId(''); setAddressId(''); setFee(''); }, onError: (e) => alert(apiErrorMessage(e)) },
                )
              }
              disabled={!orderId || !addressId || create.isPending}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
            >
              Criar entrega
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryCard({ d }: { d: DeliveryOrder }) {
  const { data: couriers } = useCouriers();
  const assign = useAssignCourier();
  const setStatus = useUpdateDeliveryStatus();
  const a = d.customerAddress;
  const terminal = d.status === 'DELIVERED' || d.status === 'CANCELLED';

  const NEXT: Partial<Record<DeliveryStatus, { s: DeliveryStatus; label: string }>> = {
    RECEIVED: { s: 'PREPARING', label: 'Preparar' },
    PREPARING: { s: 'OUT_FOR_DELIVERY', label: 'Saiu' },
    OUT_FOR_DELIVERY: { s: 'DELIVERED', label: 'Entregue' },
  };
  const next = NEXT[d.status];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-800">{a.customer.name}</div>
          <div className="text-xs text-gray-500">{a.customer.phone}</div>
        </div>
        <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', STATUS[d.status].cls)}>
          {STATUS[d.status].label}
        </span>
      </div>
      <div className="mt-2 text-sm text-gray-600">
        {a.street}, {a.number}
        {a.complement && ` - ${a.complement}`} · {a.neighborhood} · {a.city}/{a.state}
      </div>
      <div className="mt-1 text-xs text-gray-500">
        Pedido {brl(d.order.total)} + taxa {brl(d.deliveryFee)}
        {d.estimatedTime && ` · ~${d.estimatedTime}min`}
      </div>

      {!terminal && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={d.courier?.id ?? ''}
            onChange={(e) => assign.mutate({ id: d.id, courierId: e.target.value })}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-primary"
          >
            <option value="">Atribuir motoboy…</option>
            {couriers?.filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {next && (
            <button onClick={() => setStatus.mutate({ id: d.id, status: next.s })} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700">
              {next.label}
            </button>
          )}
          <button onClick={() => setStatus.mutate({ id: d.id, status: 'CANCELLED' })} className="text-xs text-red-500 hover:underline">
            cancelar
          </button>
        </div>
      )}
      {d.courier && terminal && (
        <div className="mt-2 text-xs text-gray-400">Motoboy: {d.courier.name}</div>
      )}
    </div>
  );
}

// Comanda do PDV (balcão/mesa) marcada como delivery — ainda não virou
// Order/DeliveryOrder formal (isso só acontece ao fechar a comanda no caixa).
function TabDeliveryCard({ t }: { t: TabDeliveryRow }) {
  const a = t.address;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-800">
            {t.customer?.name ?? t.label ?? 'Comanda'}
          </div>
          {t.customer?.phone && (
            <div className="text-xs text-gray-500">{t.customer.phone}</div>
          )}
        </div>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          Comanda aberta
        </span>
      </div>
      {a ? (
        <div className="mt-2 text-sm text-gray-600">
          {a.street}, {a.number}
          {a.complement && ` - ${a.complement}`} · {a.neighborhood} ·{' '}
          {a.city}/{a.state}
        </div>
      ) : (
        <div className="mt-2 text-sm italic text-gray-400">
          Sem endereço de entrega vinculado
        </div>
      )}
      <div className="mt-1 text-xs text-gray-500">
        {t.itemCount} item(ns) · {brl(t.total)}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Motoboy: {t.courier?.name ?? '— não atribuído'}
        </span>
        <Link
          to={`/comanda/${t.id}`}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Ver comanda
        </Link>
      </div>
    </div>
  );
}

export function DeliveryPage() {
  const { data: deliveries, isLoading } = useDeliveries();
  const { data: tabDeliveries } = useTabDeliveries();
  const active = (deliveries ?? []).filter((d) => d.status !== 'DELIVERED' && d.status !== 'CANCELLED');
  const done = (deliveries ?? []).filter((d) => d.status === 'DELIVERED' || d.status === 'CANCELLED');
  const noActive = active.length === 0 && (tabDeliveries ?? []).length === 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Delivery</h1>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <CouriersPanel />
          <NewDeliveryPanel />
        </div>
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-gray-400">Carregando…</p>}
          {tabDeliveries?.map((t) => <TabDeliveryCard key={t.id} t={t} />)}
          {active.map((d) => <DeliveryCard key={d.id} d={d} />)}
          {noActive && !isLoading && (
            <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
              Nenhuma entrega em andamento.
            </p>
          )}
          {done.length > 0 && (
            <details className="pt-2">
              <summary className="cursor-pointer text-sm text-gray-500">
                Concluídas ({done.length})
              </summary>
              <div className="mt-2 space-y-2 opacity-70">
                {done.map((d) => <DeliveryCard key={d.id} d={d} />)}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
