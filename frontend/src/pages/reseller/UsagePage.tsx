import { useUsage } from '../../hooks/useResellerPanel';
import clsx from 'clsx';

export function UsagePage() {
  const { data } = useUsage();
  if (!data) return <p className="text-gray-500">Carregando…</p>;

  const total = data.includedQuota + data.extraPurchased;
  const pct = total ? Math.min(100, Math.round((data.consumed / total) * 100)) : 0;
  const warn = pct >= 80;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Uso de notas fiscais</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-1 flex items-end justify-between">
          <span className="text-sm text-gray-500">
            Plano {data.plan ?? '—'} · cota {total} nota(s)/mês
          </span>
          <span className={clsx('text-sm font-medium', warn ? 'text-amber-600' : 'text-gray-700')}>
            {data.consumed} / {total} ({pct}%)
          </span>
        </div>
        <div className="h-3 rounded-full bg-gray-100">
          <div
            className={clsx('h-3 rounded-full', warn ? 'bg-amber-500' : 'bg-primary')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Restante: <b>{data.remaining}</b>
          {data.extraPurchased > 0 && ` · extra: ${data.extraPurchased}`}
        </div>
        {warn && (
          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            ⚠️ Você já usou {pct}% da cota deste mês.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-medium text-gray-800">Consumo por estabelecimento</h2>
        <table className="w-full text-sm">
          <tbody>
            {data.byEstablishment.map((e) => (
              <tr key={e.id} className="border-b border-gray-50">
                <td className="py-2 text-gray-700">{e.name}</td>
                <td className="py-2 text-right font-medium text-gray-800">
                  {e.consumed} nota(s)
                </td>
              </tr>
            ))}
            {data.byEstablishment.length === 0 && (
              <tr>
                <td className="py-2 text-gray-400">Nenhum estabelecimento.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
