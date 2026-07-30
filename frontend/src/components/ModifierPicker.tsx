import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { brl } from '../lib/format';
import type { ModifierGroup } from '../types/api';

// Regra do grupo em texto, para o cliente saber o que fazer.
function ruleLabel(g: ModifierGroup): string {
  const min = g.required ? Math.max(1, g.minSelect) : g.minSelect;
  if (g.maxSelect === 1 && min === 1) return 'Escolha 1';
  if (min > 0 && g.maxSelect > 0) return `Escolha de ${min} a ${g.maxSelect}`;
  if (min > 0) return `Escolha ao menos ${min}`;
  if (g.maxSelect > 0) return `Até ${g.maxSelect}`;
  return 'Opcional';
}

// Modal de montagem do item: adicionais, ponto da carne, borda etc.
// As mesmas regras rodam no servidor — aqui é só para guiar quem pede.
export function ModifierPicker({
  productName,
  basePrice,
  groups,
  onCancel,
  onConfirm,
}: {
  productName: string;
  basePrice: number;
  groups: ModifierGroup[];
  onCancel: () => void;
  onConfirm: (optionIds: string[]) => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);

  const toggle = (group: ModifierGroup, optionId: string) => {
    setChosen((prev) => {
      const ids = group.options.map((o) => o.id);
      const isOn = prev.includes(optionId);
      if (isOn) return prev.filter((id) => id !== optionId);
      // Grupo de escolha única troca a opção em vez de somar.
      if (group.maxSelect === 1) {
        return [...prev.filter((id) => !ids.includes(id)), optionId];
      }
      // Já no limite: ignora o clique em vez de deixar o servidor recusar.
      const inGroup = prev.filter((id) => ids.includes(id)).length;
      if (group.maxSelect > 0 && inGroup >= group.maxSelect) return prev;
      return [...prev, optionId];
    });
  };

  const { total, faltando } = useMemo(() => {
    let sum = basePrice;
    const pendentes: string[] = [];
    for (const g of groups) {
      const ids = g.options.filter((o) => chosen.includes(o.id));
      ids.forEach((o) => (sum += Number(o.priceDelta)));
      const min = g.required ? Math.max(1, g.minSelect) : g.minSelect;
      if (ids.length < min) pendentes.push(g.name);
    }
    return { total: sum, faltando: pendentes };
  }, [chosen, groups, basePrice]);

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
            <h2 className="font-semibold text-gray-900">{productName}</h2>
            <p className="text-xs text-gray-500">Monte do seu jeito</p>
          </div>
          <button
            onClick={onCancel}
            className="text-xl leading-none text-gray-400 hover:text-gray-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {groups.map((g) => {
            const inGroup = g.options.filter((o) =>
              chosen.includes(o.id),
            ).length;
            const cheio = g.maxSelect > 0 && inGroup >= g.maxSelect;
            return (
              <div key={g.id} className="mb-5 last:mb-0">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-800">
                    {g.name}
                  </span>
                  <span
                    className={clsx(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      g.required
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-500',
                    )}
                  >
                    {g.required ? `Obrigatório · ${ruleLabel(g)}` : ruleLabel(g)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {g.options.map((o) => {
                    const on = chosen.includes(o.id);
                    const bloqueado = !on && cheio && g.maxSelect !== 1;
                    return (
                      <label
                        key={o.id}
                        className={clsx(
                          'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5',
                          on
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:bg-gray-50',
                          bloqueado && 'cursor-not-allowed opacity-40',
                        )}
                      >
                        <input
                          type={g.maxSelect === 1 ? 'radio' : 'checkbox'}
                          name={g.id}
                          checked={on}
                          disabled={bloqueado}
                          onChange={() => toggle(g, o.id)}
                        />
                        <span className="flex-1 text-sm text-gray-700">
                          {o.name}
                        </span>
                        {Number(o.priceDelta) !== 0 && (
                          <span className="text-sm font-medium text-gray-800">
                            {Number(o.priceDelta) > 0 ? '+' : '−'}{' '}
                            {brl(Math.abs(Number(o.priceDelta)))}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-100 p-4">
          {faltando.length > 0 && (
            <p className="mb-2 text-xs text-amber-600">
              Falta escolher: {faltando.join(', ')}
            </p>
          )}
          <button
            onClick={() => onConfirm(chosen)}
            disabled={faltando.length > 0}
            className="flex w-full items-center justify-between rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-fg hover:opacity-90 disabled:opacity-50"
          >
            <span>Adicionar</span>
            <span>{brl(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
