import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  useCourierDeliveries,
  useCourierStatus,
} from '../hooks/useCourierPWA';
import { applyPrimaryColor, resetPrimaryColor } from '../lib/theme';
import { apiErrorMessage } from '../lib/api';
import { brl } from '../lib/format';

export function MotoboyPage() {
  const { courierId = '' } = useParams();
  const { data, isLoading, isError } = useCourierDeliveries(courierId);
  const setStatus = useCourierStatus(courierId);

  useEffect(() => {
    applyPrimaryColor(data?.courier.establishment?.primaryColor);
    return () => resetPrimaryColor();
  }, [data?.courier.establishment?.primaryColor]);

  if (isLoading)
    return <div className="p-6 text-center text-gray-500">Carregando…</div>;
  if (isError || !data)
    return (
      <div className="p-6 text-center text-red-600">
        Entregador não encontrado.
      </div>
    );

  return (
    <div className="mx-auto max-w-md pb-8">
      <header className="bg-primary px-5 py-6 text-primary-fg">
        {data.courier.establishment?.logoUrl && (
          <img
            src={data.courier.establishment.logoUrl}
            alt=""
            className="mb-2 h-10 w-10 rounded-lg object-cover"
          />
        )}
        <h1 className="mt-1 text-xl font-bold">Olá, {data.courier.name}</h1>
        {data.courier.establishment?.name && (
          <p className="text-sm opacity-80">{data.courier.establishment.name}</p>
        )}
        <p className="text-sm opacity-80">
          {data.deliveries.length + data.tabDeliveries.length} entrega(s) ativa(s)
        </p>
      </header>

      <div className="space-y-3 p-4">
        {data.deliveries.length === 0 && data.tabDeliveries.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400">
            Nenhuma entrega no momento. 🎉
          </p>
        )}
        {data.tabDeliveries.map((t) => {
          const a = t.address;
          return (
            <div
              key={t.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-800">
                  {t.customer?.name ?? t.label ?? 'Cliente'}
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  comanda
                </span>
              </div>
              {t.customer?.phone && (
                <a
                  href={`tel:${t.customer.phone}`}
                  className="text-sm text-primary underline"
                >
                  {t.customer.phone}
                </a>
              )}
              {a ? (
                <div className="mt-2 text-sm text-gray-700">
                  {a.street}, {a.number}
                  {a.complement && ` - ${a.complement}`}
                  <br />
                  {a.neighborhood} · {a.city}/{a.state} · {a.zipCode}
                </div>
              ) : (
                <div className="mt-2 text-sm italic text-gray-400">
                  Endereço não informado — confirme com o restaurante
                </div>
              )}
              <div className="mt-1 text-xs text-gray-500">
                Total {brl(t.total)}
              </div>
            </div>
          );
        })}
        {data.deliveries.map((d) => {
          const a = d.customerAddress;
          return (
            <div
              key={d.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="font-semibold text-gray-800">
                {a.customer.name}
              </div>
              <a
                href={`tel:${a.customer.phone}`}
                className="text-sm text-primary underline"
              >
                {a.customer.phone}
              </a>
              <div className="mt-2 text-sm text-gray-700">
                {a.street}, {a.number}
                {a.complement && ` - ${a.complement}`}
                <br />
                {a.neighborhood} · {a.city}/{a.state} · {a.zipCode}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Total {brl(d.order.total)} + taxa {brl(d.deliveryFee)}
              </div>

              <div className="mt-3">
                {d.status === 'OUT_FOR_DELIVERY' ? (
                  <button
                    onClick={() =>
                      setStatus.mutate(
                        { id: d.id, status: 'DELIVERED' },
                        { onError: (e) => alert(apiErrorMessage(e)) },
                      )
                    }
                    className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white"
                  >
                    ✓ Marcar como entregue
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setStatus.mutate(
                        { id: d.id, status: 'OUT_FOR_DELIVERY' },
                        { onError: (e) => alert(apiErrorMessage(e)) },
                      )
                    }
                    className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-fg"
                  >
                    🛵 Saí para entrega
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
