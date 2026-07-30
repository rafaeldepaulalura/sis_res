import { useEffect, useRef, useState } from 'react';
import {
  useDeliverySettings,
  useRemoveZone,
  useUpdateDeliverySettings,
  useUpsertZone,
} from '../hooks/useDelivery';
import { apiErrorMessage } from '../lib/api';
import { brl } from '../lib/format';

// Taxa de entrega: valor padrão, mínimo do pedido, frete grátis e a lista de
// bairros com valor próprio.
export function DeliverySettingsPanel() {
  const { data } = useDeliverySettings();
  const update = useUpdateDeliverySettings();
  const upsertZone = useUpsertZone();
  const removeZone = useRemoveZone();

  const [f, setF] = useState({ fee: '', min: '', free: '' });
  const loaded = useRef(false);
  useEffect(() => {
    if (data && !loaded.current) {
      loaded.current = true;
      setF({
        fee: data.deliveryFee,
        min: data.deliveryMinOrder,
        free: data.deliveryFreeAbove ?? '',
      });
    }
  }, [data]);

  const [zona, setZona] = useState({ neighborhood: '', fee: '' });
  const num = (v: string) => Number(v.replace(',', '.')) || 0;

  if (!data) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-1 font-medium text-gray-800">Entrega</h2>
      <p className="mb-4 text-xs text-gray-500">
        A taxa padrão vale para qualquer endereço. Bairros na lista abaixo têm
        valor próprio e mandam na taxa padrão.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Taxa padrão
          </label>
          <input
            value={f.fee}
            onChange={(e) => setF((s) => ({ ...s, fee: e.target.value }))}
            inputMode="decimal"
            placeholder="0,00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Pedido mínimo
          </label>
          <input
            value={f.min}
            onChange={(e) => setF((s) => ({ ...s, min: e.target.value }))}
            inputMode="decimal"
            placeholder="0,00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-[11px] text-gray-400">0 = sem mínimo</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Frete grátis acima de
          </label>
          <input
            value={f.free}
            onChange={(e) => setF((s) => ({ ...s, free: e.target.value }))}
            inputMode="decimal"
            placeholder="deixe vazio"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-[11px] text-gray-400">vazio = nunca grátis</p>
        </div>
      </div>

      <button
        onClick={() =>
          update.mutate(
            {
              deliveryFee: num(f.fee),
              deliveryMinOrder: num(f.min),
              deliveryFreeAbove: f.free.trim() === '' ? null : num(f.free),
            },
            { onError: (e) => alert(apiErrorMessage(e)) },
          )
        }
        disabled={update.isPending}
        className="mt-3 w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
      >
        Salvar entrega
      </button>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <div className="mb-1 text-sm font-medium text-gray-700">
          Taxa por bairro
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Desative um bairro para recusar entrega ali — o cliente é avisado no
          cardápio antes de fechar o pedido.
        </p>

        <div className="mb-3 space-y-1">
          {data.zones.map((z) => (
            <div
              key={z.id}
              className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm"
            >
              <span className="flex-1 text-gray-700">{z.neighborhood}</span>
              <span className="font-medium text-gray-800">{brl(z.fee)}</span>
              <button
                onClick={() =>
                  upsertZone.mutate({
                    neighborhood: z.neighborhood,
                    fee: Number(z.fee),
                    active: !z.active,
                  })
                }
                className={
                  z.active
                    ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700'
                    : 'rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600'
                }
              >
                {z.active ? 'entrega' : 'não entrega'}
              </button>
              <button
                onClick={() =>
                  removeZone.mutate(z.id, {
                    onError: (e) => alert(apiErrorMessage(e)),
                  })
                }
                className="text-gray-300 hover:text-red-500"
                title="Remover bairro"
              >
                ✕
              </button>
            </div>
          ))}
          {data.zones.length === 0 && (
            <p className="text-xs text-gray-400">
              Nenhum bairro com taxa própria — todos pagam a taxa padrão.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={zona.neighborhood}
            onChange={(e) =>
              setZona((z) => ({ ...z, neighborhood: e.target.value }))
            }
            placeholder="Bairro"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={zona.fee}
            onChange={(e) => setZona((z) => ({ ...z, fee: e.target.value }))}
            placeholder="R$"
            inputMode="decimal"
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() =>
              upsertZone.mutate(
                {
                  neighborhood: zona.neighborhood.trim(),
                  fee: num(zona.fee),
                },
                {
                  onSuccess: () => setZona({ neighborhood: '', fee: '' }),
                  onError: (e) => alert(apiErrorMessage(e)),
                },
              )
            }
            disabled={!zona.neighborhood.trim()}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
          >
            + Bairro
          </button>
        </div>
      </div>
    </div>
  );
}
