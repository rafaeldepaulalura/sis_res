import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  fetchAddressByCep,
  fetchCustomerByPhone,
  fetchDeliveryQuote,
  usePlaceOrder,
  usePublicMenu,
  type DeliveryQuote,
  type Fulfillment,
  type OrderResult,
  type PaymentMethod,
  type PublicProduct,
} from '../hooks/usePublicMenu';
import { HalfPizzaPicker } from '../components/HalfPizzaPicker';
import { ModifierPicker } from '../components/ModifierPicker';
import { applyPrimaryColor, resetPrimaryColor } from '../lib/theme';
import { apiErrorMessage } from '../lib/api';
import { brl } from '../lib/format';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'CREDIT', label: 'Cartão de crédito' },
  { value: 'DEBIT', label: 'Cartão de débito' },
];

// Linha do carrinho. Pizza meia a meia vira uma linha própria (key combina os
// dois sabores) e já carrega o preço do sabor mais caro.
interface CartLine {
  key: string;
  productId: string;
  halfProductId?: string;
  // Complementos escolhidos; já somados no price da linha.
  modifierOptionIds?: string[];
  name: string;
  // Descrição das escolhas, mostrada no resumo do pedido.
  extras?: string;
  price: number;
  qty: number;
}

const EMPTY_ADDRESS = {
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
};

export function PublicMenuPage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const tableNumber = params.get('mesa')
    ? Number(params.get('mesa'))
    : undefined;

  const { data: menu, isLoading, isError } = usePublicMenu(slug);
  const placeOrder = usePlaceOrder(slug);

  // Marca do estabelecimento (cor, logo) — aplicada como theme até sair da página.
  // `establishment?` (e não só `menu?`): uma resposta fora do formato esperado
  // não pode derrubar o cardápio inteiro no ErrorBoundary.
  useEffect(() => {
    applyPrimaryColor(menu?.establishment?.primaryColor);
    return () => resetPrimaryColor();
  }, [menu?.establishment?.primaryColor]);

  // Carrinho por linha: uma pizza meia a meia é uma linha própria, distinta
  // da pizza inteira do mesmo sabor. A chave combina os dois sabores.
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  // Pizza aguardando escolha de inteira x meia a meia.
  const [pizzaFor, setPizzaFor] = useState<PublicProduct | null>(null);
  // Produto aguardando escolha de complementos.
  const [modsFor, setModsFor] = useState<{
    product: PublicProduct;
    halfId?: string;
  } | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);

  // Checkout
  const [fulfillment, setFulfillment] = useState<Fulfillment>('DELIVERY');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('PIX');
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const setAddr = (k: keyof typeof EMPTY_ADDRESS) => (v: string) =>
    setAddress((a) => ({ ...a, [k]: v }));

  // Reconhecimento do cliente pelo telefone e preenchimento por CEP.
  const [lookup, setLookup] = useState<'idle' | 'searching' | 'found' | 'new'>('idle');
  const [cepStatus, setCepStatus] = useState<'idle' | 'searching' | 'notfound'>('idle');
  const numberRef = useRef<HTMLInputElement>(null);
  // Guarda o último CEP já resolvido para não reconsultar a cada tecla.
  const lastCep = useRef('');
  // Taxa de entrega do bairro informado.
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);

  // Telefone completo → busca o cadastro e preenche nome e endereço.
  useEffect(() => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setLookup('idle');
      return;
    }
    setLookup('searching');
    const t = setTimeout(async () => {
      const found = await fetchCustomerByPhone(slug, digits);
      if (!found) {
        setLookup('new');
        return;
      }
      setLookup('found');
      setName(found.name);
      if (found.address) {
        const a = found.address;
        lastCep.current = a.zipCode.replace(/\D/g, '');
        setAddress({
          street: a.street,
          number: a.number,
          complement: a.complement ?? '',
          neighborhood: a.neighborhood,
          city: a.city,
          state: a.state,
          zipCode: a.zipCode,
        });
      }
    }, 600);
    return () => clearTimeout(t);
  }, [phone, slug]);

  // CEP completo → traz rua, bairro, cidade e UF; o cliente só põe o número.
  useEffect(() => {
    const digits = address.zipCode.replace(/\D/g, '');
    if (digits.length !== 8 || digits === lastCep.current) {
      if (digits.length !== 8) setCepStatus('idle');
      return;
    }
    setCepStatus('searching');
    const t = setTimeout(async () => {
      lastCep.current = digits;
      const found = await fetchAddressByCep(digits);
      if (!found) {
        setCepStatus('notfound');
        return;
      }
      setCepStatus('idle');
      setAddress((a) => ({
        ...a,
        street: found.street || a.street,
        neighborhood: found.neighborhood || a.neighborhood,
        city: found.city || a.city,
        state: found.state || a.state,
      }));
      // O que falta é o número — leva o cursor direto para lá.
      numberRef.current?.focus();
    }, 400);
    return () => clearTimeout(t);
  }, [address.zipCode]);

  const lines = Object.values(cart);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  // A taxa só entra em entrega — retirada e mesa não pagam frete.
  const frete =
    fulfillment === 'DELIVERY' && !tableNumber ? Number(quote?.fee ?? 0) : 0;
  const total = subtotal + frete;

  // Consulta a taxa quando o bairro muda ou o carrinho muda de valor
  // (pode cruzar o limite de frete grátis).
  useEffect(() => {
    if (!checkout || fulfillment !== 'DELIVERY' || !address.neighborhood) {
      setQuote(null);
      return;
    }
    const t = setTimeout(async () => {
      setQuote(await fetchDeliveryQuote(slug, address.neighborhood, subtotal));
    }, 400);
    return () => clearTimeout(t);
  }, [checkout, fulfillment, address.neighborhood, subtotal, slug]);

  const add = (line: Omit<CartLine, 'qty'>) =>
    setCart((c) => ({
      ...c,
      [line.key]: { ...line, qty: (c[line.key]?.qty ?? 0) + 1 },
    }));
  const remove = (key: string) =>
    setCart((c) => {
      const next = { ...c };
      const line = next[key];
      if (!line) return c;
      if (line.qty <= 1) delete next[key];
      else next[key] = { ...line, qty: line.qty - 1 };
      return next;
    });

  // Monta a linha do carrinho. Pizza meia a meia cobra pelo sabor mais caro
  // e os complementos somam por cima (mesma regra que roda no servidor).
  const addPizza = (
    first: PublicProduct,
    halfId?: string,
    optionIds?: string[],
  ) => {
    const second = halfId
      ? menu?.categories.flatMap((c) => c.products).find((p) => p.id === halfId)
      : undefined;
    const base = second
      ? Math.max(Number(first.price), Number(second.price))
      : Number(first.price);

    const escolhidas = (first.modifierGroups ?? [])
      .flatMap((g) => g.options)
      .filter((o) => (optionIds ?? []).includes(o.id));
    const extraValor = escolhidas.reduce(
      (s, o) => s + Number(o.priceDelta),
      0,
    );
    // Complementos diferentes = linha diferente no carrinho.
    const sufixo = optionIds?.length ? `#${[...optionIds].sort().join('.')}` : '';

    add({
      key: (second ? `${first.id}|${second.id}` : first.id) + sufixo,
      productId: first.id,
      halfProductId: second?.id,
      modifierOptionIds: optionIds,
      name: second ? `½ ${first.name} + ½ ${second.name}` : first.name,
      extras: escolhidas.map((o) => o.name).join(', ') || undefined,
      price: base + extraValor,
    });
  };

  // Clique no produto: pizza abre a escolha de sabores; produto com
  // complementos abre a montagem; o resto entra direto no carrinho.
  const escolherProduto = (p: PublicProduct, halfId?: string) => {
    if (p.modifierGroups?.length) {
      setModsFor({ product: p, halfId });
      return;
    }
    addPizza(p, halfId);
  };

  const submit = () => {
    const items = lines.map((l) => ({
      productId: l.productId,
      halfProductId: l.halfProductId,
      modifierOptionIds: l.modifierOptionIds,
      quantity: l.qty,
    }));

    // Consumo na mesa (QR) — não precisa de checkout.
    if (tableNumber) {
      finalize({ items, customerName: name || undefined, tableNumber });
      return;
    }
    if (fulfillment === 'DELIVERY') {
      finalize({
        items,
        fulfillment: 'DELIVERY',
        customerName: name,
        customerPhone: phone,
        paymentMethod: payment,
        address: { ...address, complement: address.complement || undefined },
      });
    } else {
      finalize({ items, fulfillment: 'PICKUP', customerName: name });
    }
  };

  const finalize = (body: Parameters<typeof placeOrder.mutate>[0]) =>
    placeOrder.mutate(body, {
      onSuccess: (r) => setResult(r),
      onError: (e) => alert(apiErrorMessage(e, 'Erro ao enviar pedido')),
    });

  if (isLoading)
    return (
      <div className="p-6 text-center text-gray-500">Carregando cardápio…</div>
    );
  // Checa `establishment` e não só `menu`: se a resposta vier fora do formato
  // (ex.: a chamada caindo no servidor de arquivos em vez da API), é melhor
  // mostrar esta mensagem do que quebrar a página inteira.
  if (isError || !menu?.establishment)
    return (
      <div className="p-6 text-center text-red-600">
        Cardápio não encontrado.
      </div>
    );

  // ---- Confirmação ----
  if (result) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h1 className="text-xl font-semibold text-gray-900">{result.message}</h1>
        <p className="mt-2 text-gray-500">
          {result.itemCount} {result.itemCount === 1 ? 'item' : 'itens'} ·{' '}
          {brl(result.total)}
        </p>
        {Number(result.deliveryFee) > 0 && (
          <p className="mt-1 text-xs text-gray-400">
            {brl(result.subtotal)} + {brl(result.deliveryFee)} de entrega
          </p>
        )}
        <button
          onClick={() => {
            setCart({});
            setResult(null);
            setCheckout(false);
          }}
          className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-fg hover:opacity-90"
        >
          Fazer novo pedido
        </button>
      </div>
    );
  }

  // ---- Checkout ----
  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary';
  const canSubmit =
    tableNumber ||
    (fulfillment === 'PICKUP' && name.trim()) ||
    (fulfillment === 'DELIVERY' &&
      name.trim() &&
      phone.trim() &&
      address.street &&
      address.number &&
      address.neighborhood &&
      address.city &&
      address.state.length === 2 &&
      address.zipCode &&
      // Bairro sem entrega ou pedido abaixo do mínimo travam o envio.
      quote?.atende !== false &&
      !quote?.abaixoDoMinimo);

  if (checkout && !tableNumber) {
    return (
      <div className="mx-auto max-w-md p-4 pb-8">
        <button
          onClick={() => setCheckout(false)}
          className="mb-3 text-sm text-gray-500"
        >
          ← Voltar ao cardápio
        </button>
        <h1 className="mb-4 text-lg font-semibold text-gray-900">
          Finalizar pedido · {brl(total)}
        </h1>

        {/* Entrega x Retirada */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          {(['DELIVERY', 'PICKUP'] as Fulfillment[]).map((f) => (
            <button
              key={f}
              onClick={() => setFulfillment(f)}
              className={
                fulfillment === f
                  ? 'rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-fg'
                  : 'rounded-lg border border-gray-300 py-2.5 text-sm text-gray-600'
              }
            >
              {f === 'DELIVERY' ? '🛵 Entrega' : '🏃 Retirada'}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {/* Telefone primeiro: é ele que reconhece quem já comprou antes. */}
          {fulfillment === 'DELIVERY' && (
            <div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Telefone (WhatsApp) *"
                inputMode="tel"
                autoFocus
                className={inputCls}
              />
              {lookup === 'searching' && (
                <p className="mt-1 text-xs text-gray-400">Procurando seu cadastro…</p>
              )}
              {lookup === 'found' && (
                <p className="mt-1 text-xs font-medium text-emerald-600">
                  Já conhecemos você! Confira os dados abaixo.
                </p>
              )}
              {lookup === 'new' && (
                <p className="mt-1 text-xs text-gray-400">
                  Primeiro pedido? É só preencher — na próxima vez já vem pronto.
                </p>
              )}
            </div>
          )}

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome *"
            className={inputCls}
          />
          {fulfillment === 'DELIVERY' && (
            <>
              <div>
                <input
                  value={address.zipCode}
                  onChange={(e) => setAddr('zipCode')(e.target.value)}
                  placeholder="CEP *"
                  inputMode="numeric"
                  maxLength={9}
                  className={inputCls}
                />
                {cepStatus === 'searching' && (
                  <p className="mt-1 text-xs text-gray-400">Buscando endereço…</p>
                )}
                {cepStatus === 'notfound' && (
                  <p className="mt-1 text-xs text-amber-600">
                    CEP não encontrado — preencha o endereço abaixo.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={address.street}
                  onChange={(e) => setAddr('street')(e.target.value)}
                  placeholder="Rua *"
                  className={`col-span-2 ${inputCls}`}
                />
                <input
                  ref={numberRef}
                  value={address.number}
                  onChange={(e) => setAddr('number')(e.target.value)}
                  placeholder="Nº *"
                  inputMode="numeric"
                  className={inputCls}
                />
              </div>
              <input
                value={address.complement}
                onChange={(e) => setAddr('complement')(e.target.value)}
                placeholder="Complemento (apto, bloco, referência)"
                className={inputCls}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={address.neighborhood}
                  onChange={(e) => setAddr('neighborhood')(e.target.value)}
                  placeholder="Bairro *"
                  className={inputCls}
                />
                <input
                  value={address.city}
                  onChange={(e) => setAddr('city')(e.target.value)}
                  placeholder="Cidade *"
                  className={inputCls}
                />
              </div>
              <input
                value={address.state}
                onChange={(e) => setAddr('state')(e.target.value.toUpperCase())}
                placeholder="UF *"
                maxLength={2}
                className={inputCls}
              />
              <div>
                <div className="mb-1 mt-2 text-sm font-medium text-gray-700">
                  Forma de pagamento
                </div>
                <select
                  value={payment}
                  onChange={(e) => setPayment(e.target.value as PaymentMethod)}
                  className={inputCls}
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Resumo de valores: o cliente vê a taxa antes de confirmar. */}
        {fulfillment === 'DELIVERY' && (
          <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{brl(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Taxa de entrega</span>
              <span>
                {!address.neighborhood
                  ? '—'
                  : quote?.atende === false
                    ? 'não atendemos'
                    : quote?.motivo === 'free_above'
                      ? 'grátis'
                      : brl(frete)}
              </span>
            </div>
            <div className="flex justify-between text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>{brl(total)}</span>
            </div>

            {quote?.atende === false && (
              <p className="pt-1 text-xs text-red-600">
                Ainda não entregamos em {address.neighborhood}.
              </p>
            )}
            {quote?.abaixoDoMinimo && (
              <p className="pt-1 text-xs text-amber-600">
                Pedido mínimo para entrega: {brl(quote.minOrder)} — faltam{' '}
                {brl(Number(quote.minOrder) - subtotal)}.
              </p>
            )}
            {/* Só faz sentido incentivar o frete grátis se entregamos ali. */}
            {quote?.atende && quote.freeAbove && quote.motivo !== 'free_above' && (
              <p className="pt-1 text-xs text-emerald-600">
                Frete grátis acima de {brl(quote.freeAbove)} — faltam{' '}
                {brl(Number(quote.freeAbove) - subtotal)}.
              </p>
            )}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit || placeOrder.isPending}
          className="mt-5 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-fg hover:opacity-90 disabled:opacity-50"
        >
          {placeOrder.isPending ? 'Enviando…' : `Confirmar pedido · ${brl(total)}`}
        </button>
      </div>
    );
  }

  // ---- Cardápio ----
  return (
    <div className="mx-auto max-w-md pb-32">
      <header className="bg-primary px-5 py-6 text-primary-fg">
        {menu.establishment.logoUrl && (
          <img
            src={menu.establishment.logoUrl}
            alt=""
            className="mb-2 h-10 w-10 rounded-lg object-cover"
          />
        )}
        <h1 className="mt-1 text-xl font-bold">{menu.establishment.name}</h1>
        <p className="text-sm opacity-80">
          {tableNumber ? `Mesa ${tableNumber}` : 'Cardápio digital'}
        </p>
      </header>

      <div className="space-y-6 p-4">
        {menu.categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {cat.name}
              {cat.allowsHalf && (
                <span className="ml-2 font-normal normal-case tracking-normal text-amber-600">
                  🍕 meia a meia disponível
                </span>
              )}
            </h2>
            <div className="space-y-2">
              {cat.products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-gray-500">
                        {p.description}
                      </div>
                    )}
                    <div className="mt-1 text-sm font-semibold text-primary">
                      {brl(p.price)}
                    </div>
                  </div>
                  {/* Pizza sempre abre o seletor (inteira x meia a meia);
                      as linhas montadas ficam no resumo abaixo. */}
                  {cat.allowsHalf ? (
                    <button
                      onClick={() => setPizzaFor(p)}
                      className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg"
                    >
                      Escolher
                    </button>
                  ) : p.modifierGroups?.length ? (
                    // Com complementos: sempre abre a montagem.
                    <button
                      onClick={() => escolherProduto(p)}
                      className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg"
                    >
                      Escolher
                    </button>
                  ) : cart[p.id] ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => remove(p.id)}
                        className="h-8 w-8 rounded-full border border-gray-300 text-gray-600"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm">
                        {cart[p.id].qty}
                      </span>
                      <button
                        onClick={() => addPizza(p)}
                        className="h-8 w-8 rounded-full bg-primary text-primary-fg"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addPizza(p)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg"
                    >
                      + Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Resumo do carrinho — é aqui que as pizzas montadas são geridas. */}
        {lines.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Seu pedido
            </h2>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {lines.map((l) => (
                <div key={l.key} className="flex items-center gap-3 p-3">
                  <div className="flex-1">
                    <div className="text-sm text-gray-800">{l.name}</div>
                    {l.extras && (
                      <div className="text-xs text-gray-500">{l.extras}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => remove(l.key)}
                      className="h-7 w-7 rounded-full border border-gray-300 text-gray-600"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm">{l.qty}</span>
                    <button
                      onClick={() => add(l)}
                      className="h-7 w-7 rounded-full bg-primary text-primary-fg"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-800">
                    {brl(l.price * l.qty)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {pizzaFor && (
        <HalfPizzaPicker
          first={pizzaFor}
          flavors={
            menu.categories.find((c) =>
              c.products.some((p) => p.id === pizzaFor.id),
            )?.products ?? []
          }
          onCancel={() => setPizzaFor(null)}
          onConfirm={(halfProductId) => {
            const p = pizzaFor;
            setPizzaFor(null);
            // Pizza com complementos (borda) segue para a montagem.
            escolherProduto(p, halfProductId);
          }}
        />
      )}

      {modsFor && (
        <ModifierPicker
          productName={modsFor.product.name}
          basePrice={Number(modsFor.product.price)}
          groups={modsFor.product.modifierGroups ?? []}
          onCancel={() => setModsFor(null)}
          onConfirm={(optionIds) => {
            addPizza(modsFor.product, modsFor.halfId, optionIds);
            setModsFor(null);
          }}
        />
      )}

      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-gray-200 bg-white p-4 shadow-lg">
          <button
            onClick={() => (tableNumber ? submit() : setCheckout(true))}
            disabled={placeOrder.isPending}
            className="flex w-full items-center justify-between rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-fg hover:opacity-90 disabled:opacity-50"
          >
            <span>
              {tableNumber
                ? `Enviar pedido · ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`
                : `Continuar · ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}
            </span>
            <span>{brl(total)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
