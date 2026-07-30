import { useState } from 'react';
import {
  useCashMovement,
  useCashStatus,
  useCloseCash,
  useOpenCash,
  type CloseCashResult,
} from '../hooks/useCashRegister';
import { apiErrorMessage } from '../lib/api';
import { brl } from '../lib/format';
import { useCan } from '../lib/permissions';

export function CashRegisterPage() {
  const { data: cash, isLoading } = useCashStatus();
  const openCash = useOpenCash();
  const closeCash = useCloseCash();
  const movement = useCashMovement();
  const can = useCan();

  const [opening, setOpening] = useState('');
  const [counted, setCounted] = useState('');
  const [movAmount, setMovAmount] = useState('');
  const [result, setResult] = useState<CloseCashResult | null>(null);

  const num = (v: string) => Number(v.replace(',', '.'));

  if (isLoading) return <p className="text-gray-500">Carregando caixa…</p>;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Financeiro · Caixa</h1>

      {!cash?.open ? (
        /* ---- Caixa fechado: abrir ---- */
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Nenhum caixa aberto. Informe o valor de abertura (fundo de troco).
          </p>
          {result && (
            <div className="rounded-lg bg-gray-50 p-4 text-sm">
              <div className="mb-1 font-medium text-gray-700">
                Resultado do último fechamento
              </div>
              <div className="flex justify-between">
                <span>Esperado</span>
                <span>{brl(result.expected)}</span>
              </div>
              <div className="flex justify-between">
                <span>Contado</span>
                <span>{brl(result.counted)}</span>
              </div>
              <div
                className={
                  Number(result.difference) === 0
                    ? 'flex justify-between font-semibold text-emerald-600'
                    : 'flex justify-between font-semibold text-red-600'
                }
              >
                <span>Diferença</span>
                <span>{brl(result.difference)}</span>
              </div>
            </div>
          )}
          {/* Abrir caixa é ação restrita (caixa.abrir_fechar). */}
          {!can('caixa.abrir_fechar') ? (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
              Seu usuário não tem permissão para abrir o caixa.
            </p>
          ) : (
          <div className="flex gap-2">
            <input
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder="R$ 0,00"
              inputMode="decimal"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() =>
                openCash.mutate(
                  { openingAmount: num(opening || '0') },
                  {
                    onSuccess: () => {
                      setOpening('');
                      setResult(null);
                    },
                    onError: (e) => alert(apiErrorMessage(e)),
                  },
                )
              }
              disabled={openCash.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
            >
              Abrir caixa
            </button>
          </div>
          )}
        </div>
      ) : (
        /* ---- Caixa aberto ---- */
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-emerald-700">Caixa aberto</div>
                <div className="text-xs text-emerald-600">
                  Operador: {cash.operator?.name} ·{' '}
                  {cash.openedAt &&
                    new Date(cash.openedAt).toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-emerald-600">Abertura</div>
                <div className="text-lg font-semibold text-emerald-800">
                  {brl(cash.openingAmount ?? '0')}
                </div>
              </div>
            </div>
          </div>

          {/* Sangria / Suprimento — ação restrita (caixa.movimentacao). */}
          {can('caixa.movimentacao') && (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-6">
            <div className="font-medium text-gray-800">
              Movimentações (sangria / suprimento)
            </div>
            <input
              value={movAmount}
              onChange={(e) => setMovAmount(e.target.value)}
              placeholder="R$ 0,00"
              inputMode="decimal"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  movement.mutate(
                    { type: 'WITHDRAWAL', amount: num(movAmount || '0') },
                    {
                      onSuccess: () => setMovAmount(''),
                      onError: (e) => alert(apiErrorMessage(e)),
                    },
                  )
                }
                className="rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                − Sangria (retirada)
              </button>
              <button
                onClick={() =>
                  movement.mutate(
                    { type: 'DEPOSIT', amount: num(movAmount || '0') },
                    {
                      onSuccess: () => setMovAmount(''),
                      onError: (e) => alert(apiErrorMessage(e)),
                    },
                  )
                }
                className="rounded-lg border border-emerald-200 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
              >
                + Suprimento (reforço)
              </button>
            </div>
          </div>
          )}

          {/* Fechamento cego — ação restrita (caixa.abrir_fechar). */}
          {can('caixa.abrir_fechar') && (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-6">
            <div className="font-medium text-gray-800">Fechar caixa</div>
            <p className="text-xs text-gray-500">
              Contagem cega: informe o valor contado na gaveta. O sistema
              compara com o esperado só depois.
            </p>
            <div className="flex gap-2">
              <input
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
                placeholder="Valor contado R$"
                inputMode="decimal"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() =>
                  closeCash.mutate(
                    { countedAmount: num(counted || '0') },
                    {
                      onSuccess: (r) => {
                        setResult(r);
                        setCounted('');
                      },
                      onError: (e) => alert(apiErrorMessage(e)),
                    },
                  )
                }
                disabled={closeCash.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
              >
                Fechar caixa
              </button>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
