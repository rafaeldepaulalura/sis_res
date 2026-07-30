import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  useAddItem,
  useAddPayment,
  useCloseTab,
  useSendToKitchen,
  useSetFulfillment,
  useTab,
  useUpdateItem,
} from '../hooks/useTabs';
import { useCategories, useProducts } from '../hooks/useCatalog';
import { useCouriers } from '../hooks/useDelivery';
import { DeliveryAddressPicker } from '../components/DeliveryAddressPicker';
import { HalfPizzaPicker } from '../components/HalfPizzaPicker';
import { ModifierPicker } from '../components/ModifierPicker';
import { PinPrompt } from '../components/PinPrompt';
import { useEstablishmentBranding } from '../hooks/useEstablishmentBranding';
import { useCan } from '../lib/permissions';
import { brl, itemLabel } from '../lib/format';
import { apiErrorMessage } from '../lib/api';
import type { PaymentMethod, Product, TabItemStatus } from '../types/api';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'DEBIT', label: 'Débito' },
  { value: 'PIX', label: 'PIX' },
  { value: 'OTHER', label: 'Outro' },
];

const ITEM_STATUS: Record<TabItemStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Pendente', cls: 'bg-gray-100 text-gray-600' },
  SENT_TO_KITCHEN: { label: 'Na cozinha', cls: 'bg-blue-100 text-blue-700' },
  PREPARING: { label: 'Preparando', cls: 'bg-indigo-100 text-indigo-700' },
  READY: { label: 'Pronto', cls: 'bg-emerald-100 text-emerald-700' },
  DELIVERED: { label: 'Entregue', cls: 'bg-gray-100 text-gray-500' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-red-100 text-red-600' },
};

export function TabPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: tab, isLoading } = useTab(id);
  const { data: categories } = useCategories();
  const { data: products } = useProducts();

  const addItem = useAddItem(id);
  const updateItem = useUpdateItem(id);
  const sendToKitchen = useSendToKitchen(id);
  const addPayment = useAddPayment(id);
  const closeTab = useCloseTab(id);
  const setFulfillment = useSetFulfillment(id);
  const { data: couriers } = useCouriers();
  const can = useCan();

  const [activeCat, setActiveCat] = useState<string | null>(null);
  // Produto de pizza aguardando escolha de inteira x meia a meia.
  const [pizzaFor, setPizzaFor] = useState<Product | null>(null);
  // Produto aguardando escolha de complementos (adicionais, ponto...).
  const [modsFor, setModsFor] = useState<{
    product: Product;
    halfProductId?: string;
  } | null>(null);
  const [discount, setDiscount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [payAmount, setPayAmount] = useState('');
  // Ação sensível aguardando o PIN do gerente.
  const [pinFor, setPinFor] = useState<
    { tipo: 'cancelar'; itemId: string } | { tipo: 'desconto' } | null
  >(null);
  const { data: branding } = useEstablishmentBranding();

  if (isLoading || !tab)
    return <p className="text-gray-500">Carregando comanda…</p>;

  const isOpen = tab.status === 'OPEN';
  const activeItems = tab.items.filter((i) => i.status !== 'CANCELLED');
  const pendingCount = tab.items.filter((i) => i.status === 'PENDING').length;

  const catId = activeCat ?? categories?.[0]?.id ?? null;
  const catalog = (products ?? []).filter((p) => p.categoryId === catId);
  const isPizzaCat = !!categories?.find((c) => c.id === catId)?.allowsHalf;

  // Lança o item: se o produto tem complementos, abre a escolha antes.
  const lancarItem = (product: Product, halfProductId?: string) => {
    if (product.modifierGroups?.length) {
      setModsFor({ product, halfProductId });
      return;
    }
    addItem.mutate(
      { productId: product.id, halfProductId },
      { onError: (e) => alert(apiErrorMessage(e)) },
    );
  };

  const title = tab.table
    ? `Mesa ${tab.table.number}`
    : tab.label ?? `Comanda ${tab.type}`;

  const num = (v: string) => Number(v.replace(',', '.'));
  const remaining = Number(tab.totals.remaining);

  const handleAddPayment = () => {
    const amount = payAmount ? num(payAmount) : remaining;
    if (!amount || amount <= 0) return;
    addPayment.mutate(
      { method: payMethod, amount },
      {
        onSuccess: () => setPayAmount(''),
        onError: (err) => alert(apiErrorMessage(err, 'Erro ao registrar pagamento')),
      },
    );
  };

  const handleClose = (authPin?: string) => {
    const value = discount ? num(discount) : undefined;
    // Desconto com trava ligada só passa com o PIN de quem pode autorizar.
    if (value && value > 0 && branding?.requirePinForDiscount && !authPin) {
      setPinFor({ tipo: 'desconto' });
      return;
    }
    closeTab.mutate(
      { discount: value, authPin },
      {
        onSuccess: (r) => {
          setPinFor(null);
          if (Number(r.change) > 0) alert(`Troco: ${brl(r.change)}`);
          navigate('/mesas');
        },
        onError: (err) => alert(apiErrorMessage(err, 'Erro ao fechar comanda')),
      },
    );
  };

  const handleCancelItem = (itemId: string, authPin?: string) => {
    if (branding?.requirePinForCancelItem && !authPin) {
      setPinFor({ tipo: 'cancelar', itemId });
      return;
    }
    updateItem.mutate(
      { itemId, cancel: true, authPin },
      {
        onSuccess: () => setPinFor(null),
        onError: (err) => alert(apiErrorMessage(err, 'Erro ao cancelar item')),
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/mesas')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Mesas
        </button>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
          {tab.status}
        </span>
        {tab.waiter && (
          <span className="ml-auto text-sm text-gray-500">
            Garçom: {tab.waiter.name}
          </span>
        )}
      </div>

      {/* Local x Delivery */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <span className="text-sm font-medium text-gray-700">Atendimento:</span>
        <div className="flex overflow-hidden rounded-lg border border-gray-300">
          <button
            onClick={() => setFulfillment.mutate({ isDelivery: false })}
            disabled={!isOpen || setFulfillment.isPending}
            className={clsx(
              'px-3 py-1.5 text-sm transition disabled:opacity-50',
              !tab.isDelivery
                ? 'bg-primary text-primary-fg'
                : 'bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            🏠 Local
          </button>
          <button
            onClick={() =>
              setFulfillment.mutate({
                isDelivery: true,
                courierId: tab.courier?.id,
              })
            }
            disabled={!isOpen || setFulfillment.isPending}
            className={clsx(
              'border-l border-gray-300 px-3 py-1.5 text-sm transition disabled:opacity-50',
              tab.isDelivery
                ? 'bg-primary text-primary-fg'
                : 'bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            🛵 Delivery
          </button>
        </div>

        {tab.isDelivery && (
          <select
            value={tab.courier?.id ?? ''}
            onChange={(e) =>
              setFulfillment.mutate({
                isDelivery: true,
                courierId: e.target.value || undefined,
              })
            }
            disabled={!isOpen || setFulfillment.isPending}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">Atribuir motoboy…</option>
            {couriers
              ?.filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        )}
      </div>

      {tab.isDelivery && <DeliveryAddressPicker tab={tab} />}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Coluna esquerda: itens + ações */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3 font-medium text-gray-800">
            Itens ({activeItems.length})
          </div>

          <ul className="divide-y divide-gray-100">
            {activeItems.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-400">
                Nenhum item. Adicione pelo catálogo ao lado.
              </li>
            )}
            {tab.items.map((item) => {
              const st = ITEM_STATUS[item.status];
              const cancelled = item.status === 'CANCELLED';
              return (
                <li
                  key={item.id}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3',
                    cancelled && 'opacity-50',
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'font-medium text-gray-800',
                          cancelled && 'line-through',
                        )}
                      >
                        {itemLabel(item)}
                      </span>
                      <span
                        className={clsx(
                          'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
                          st.cls,
                        )}
                      >
                        {st.label}
                      </span>
                    </div>
                    {/* Complementos escolhidos, já somados no preço. */}
                    {item.modifiers?.length > 0 && (
                      <div className="text-xs text-gray-600">
                        {item.modifiers.map((m) => m.name).join(', ')}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {brl(item.unitPrice)} un
                      {item.notes && ` · ${item.notes}`}
                    </div>
                  </div>

                  {!cancelled && isOpen && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateItem.mutate({
                            itemId: item.id,
                            quantity: Math.max(1, item.quantity - 1),
                          })
                        }
                        className="h-7 w-7 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateItem.mutate({
                            itemId: item.id,
                            quantity: item.quantity + 1,
                          })
                        }
                        className="h-7 w-7 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  )}
                  {cancelled && (
                    <span className="w-6 text-center text-sm">
                      {item.quantity}
                    </span>
                  )}

                  <div className="w-20 text-right text-sm font-medium text-gray-800">
                    {brl(Number(item.unitPrice) * item.quantity)}
                  </div>

                  {/* Cancelar item é ação restrita (comanda.cancelar_item). */}
                  {!cancelled && isOpen && can('comanda.cancelar_item') && (
                    <button
                      onClick={() => handleCancelItem(item.id)}
                      className="text-gray-300 hover:text-red-500"
                      title="Cancelar item"
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Totais + pagamento + ações */}
          <div className="space-y-3 border-t border-gray-100 p-4">
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{brl(tab.totals.subtotal)}</span>
              </div>
              {Number(tab.totals.deliveryFee) > 0 && (
                <div className="flex justify-between">
                  <span>Taxa de entrega</span>
                  <span>{brl(tab.totals.deliveryFee)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-lg font-semibold text-gray-900">
                <span>Total</span>
                <span>{brl(tab.totals.total)}</span>
              </div>
              {Number(tab.totals.paid) > 0 && (
                <>
                  <div className="flex justify-between text-emerald-600">
                    <span>Pago</span>
                    <span>{brl(tab.totals.paid)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Restante</span>
                    <span>{brl(tab.totals.remaining)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Pagamentos registrados */}
            {tab.payments.length > 0 && (
              <ul className="space-y-1 text-xs text-gray-500">
                {tab.payments.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>
                      {METHODS.find((m) => m.value === p.method)?.label}
                    </span>
                    <span>{brl(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}

            {isOpen && (
              <>
                <button
                  onClick={() =>
                    sendToKitchen.mutate(undefined, {
                      onError: (err) =>
                        alert(apiErrorMessage(err, 'Nada para enviar')),
                    })
                  }
                  disabled={pendingCount === 0 || sendToKitchen.isPending}
                  className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  👨‍🍳 Enviar para cozinha
                  {pendingCount > 0 && ` (${pendingCount})`}
                </button>

                {/* Registrar pagamento (split) */}
                <div className="flex gap-2">
                  <select
                    value={payMethod}
                    onChange={(e) =>
                      setPayMethod(e.target.value as PaymentMethod)
                    }
                    className="rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:border-primary"
                  >
                    {METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder={`Restante ${brl(remaining)}`}
                    inputMode="decimal"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleAddPayment}
                    disabled={addPayment.isPending}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    + Pagar
                  </button>
                </div>

                <div className="flex gap-2">
                  {/* Desconto é ação restrita (comanda.desconto). */}
                  {can('comanda.desconto') && (
                    <input
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="Desconto R$"
                      inputMode="decimal"
                      className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  )}
                  <button
                    onClick={() => handleClose()}
                    disabled={closeTab.isPending}
                    className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-fg transition hover:opacity-90 disabled:opacity-50"
                  >
                    💰 Fechar comanda
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Coluna direita: catálogo */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3 font-medium text-gray-800">
            Adicionar itens
          </div>

          <div className="flex flex-wrap gap-2 border-b border-gray-100 p-3">
            {categories?.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={clsx(
                  'rounded-full px-3 py-1 text-sm transition',
                  catId === c.id
                    ? 'bg-primary text-primary-fg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
            {catalog.map((p) => (
              <button
                key={p.id}
                disabled={!isOpen || addItem.isPending}
                onClick={() => (isPizzaCat ? setPizzaFor(p) : lancarItem(p))}
                className="flex flex-col rounded-lg border border-gray-200 p-3 text-left transition hover:border-primary hover:bg-primary/5 disabled:opacity-50"
              >
                <span className="text-sm font-medium text-gray-800">
                  {p.name}
                </span>
                <span className="mt-1 text-sm text-primary">
                  {brl(p.price)}
                </span>
                {isPizzaCat && (
                  <span className="mt-0.5 text-[11px] text-gray-400">
                    inteira ou meia a meia
                  </span>
                )}
              </button>
            ))}
            {catalog.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-gray-400">
                Sem produtos nesta categoria.
              </p>
            )}
          </div>
        </div>
      </div>

      {pizzaFor && (
        <HalfPizzaPicker
          first={pizzaFor}
          flavors={catalog}
          onCancel={() => setPizzaFor(null)}
          onConfirm={(halfProductId) => {
            const p = pizzaFor;
            setPizzaFor(null);
            // Pizza com complementos (borda, por exemplo) segue para a
            // escolha; sem complementos, entra direto na comanda.
            lancarItem(p, halfProductId);
          }}
        />
      )}

      {pinFor && (
        <PinPrompt
          title={
            pinFor.tipo === 'cancelar'
              ? 'Cancelar item'
              : 'Aplicar desconto'
          }
          description="Esta ação precisa da autorização de um responsável. Peça para ele digitar o PIN."
          pending={updateItem.isPending || closeTab.isPending}
          onCancel={() => setPinFor(null)}
          onConfirm={(pin) =>
            pinFor.tipo === 'cancelar'
              ? handleCancelItem(pinFor.itemId, pin)
              : handleClose(pin)
          }
        />
      )}

      {modsFor && (
        <ModifierPicker
          productName={modsFor.product.name}
          basePrice={Number(modsFor.product.price)}
          groups={modsFor.product.modifierGroups ?? []}
          onCancel={() => setModsFor(null)}
          onConfirm={(optionIds) => {
            addItem.mutate(
              {
                productId: modsFor.product.id,
                halfProductId: modsFor.halfProductId,
                modifierOptionIds: optionIds,
              },
              { onError: (e) => alert(apiErrorMessage(e)) },
            );
            setModsFor(null);
          }}
        />
      )}
    </div>
  );
}
