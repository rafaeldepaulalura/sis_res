import { brl } from '../lib/format';

export interface Flavor {
  id: string;
  name: string;
  price: string;
}

// Modal de montagem da pizza: inteira ou meia a meia. O preço da meia a meia
// é sempre o do sabor mais caro (praxe das pizzarias no Brasil) — o mesmo
// cálculo roda no backend (halfPrice em backend/src/tabs/pizza-half.ts).
export function HalfPizzaPicker({
  first,
  flavors,
  onCancel,
  onConfirm,
}: {
  first: Flavor;
  flavors: Flavor[];
  onCancel: () => void;
  onConfirm: (halfProductId?: string) => void;
}) {
  const others = flavors.filter((f) => f.id !== first.id);

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-white sm:rounded-2xl"
      >
        <div className="flex items-start justify-between border-b border-gray-100 p-4">
          <div>
            <h2 className="font-semibold text-gray-900">{first.name}</h2>
            <p className="text-xs text-gray-500">
              Escolha inteira ou monte meia a meia
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-xl leading-none text-gray-400 hover:text-gray-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <button
            onClick={() => onConfirm(undefined)}
            className="mb-4 flex w-full items-center justify-between rounded-xl border-2 border-primary bg-primary/5 px-4 py-3 text-left hover:bg-primary/10"
          >
            <span className="font-medium text-gray-800">
              🍕 Inteira de {first.name}
            </span>
            <span className="font-semibold text-primary">
              {brl(first.price)}
            </span>
          </button>

          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Meia a meia — a outra metade:
          </div>
          <div className="space-y-1.5">
            {others.map((f) => {
              // Cobra sempre pelo sabor mais caro.
              const price = Math.max(Number(first.price), Number(f.price));
              return (
                <button
                  key={f.id}
                  onClick={() => onConfirm(f.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:border-primary hover:bg-primary/5"
                >
                  <span className="text-sm text-gray-700">
                    ½ {first.name} + ½ {f.name}
                  </span>
                  <span className="shrink-0 pl-2 text-sm font-medium text-gray-800">
                    {brl(price)}
                  </span>
                </button>
              );
            })}
            {others.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">
                Não há outro sabor cadastrado nesta categoria.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
