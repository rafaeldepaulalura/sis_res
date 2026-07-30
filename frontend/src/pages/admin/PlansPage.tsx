import { useState } from 'react';
import { useCreatePlan, usePlans } from '../../hooks/useSuperAdmin';
import { apiErrorMessage } from '../../lib/api';
import { brl } from '../../lib/format';

export function PlansPage() {
  const { data: plans } = usePlans();
  const create = useCreatePlan();
  const [form, setForm] = useState({ name: '', monthlyPrice: '', quota: '' });

  const submit = () => {
    create.mutate(
      {
        name: form.name,
        monthlyPrice: Number(form.monthlyPrice.replace(',', '.')),
        includedFiscalDocuments: Number(form.quota),
      },
      {
        onSuccess: () => setForm({ name: '', monthlyPrice: '', quota: '' }),
        onError: (e) => alert(apiErrorMessage(e)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Planos</h1>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="p-3">Plano</th>
                <th className="p-3 text-right">Mensal</th>
                <th className="p-3 text-right">Cota notas</th>
                <th className="p-3 text-center">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {plans?.map((p) => (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="p-3 font-medium text-gray-800">{p.name}</td>
                  <td className="p-3 text-right">{brl(p.monthlyPrice)}</td>
                  <td className="p-3 text-right">{p.includedFiscalDocuments}</td>
                  <td className="p-3 text-center">{p.active ? '✅' : '—'}</td>
                </tr>
              ))}
              {plans?.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-400">
                    Nenhum plano.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="font-medium text-gray-800">Novo plano</h2>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={form.monthlyPrice}
            onChange={(e) =>
              setForm((f) => ({ ...f, monthlyPrice: e.target.value }))
            }
            placeholder="Preço mensal R$"
            inputMode="decimal"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={form.quota}
            onChange={(e) => setForm((f) => ({ ...f, quota: e.target.value }))}
            placeholder="Cota de notas/mês"
            inputMode="numeric"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={submit}
            disabled={!form.name || !form.monthlyPrice || create.isPending}
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
          >
            Criar plano
          </button>
        </div>
      </div>
    </div>
  );
}
