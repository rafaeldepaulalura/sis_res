import { useMetrics } from '../../hooks/useSuperAdmin';
import { brl } from '../../lib/format';

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export function MetricsPage() {
  const { data, isLoading } = useMetrics();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Métricas do SaaS</h1>
      {isLoading || !data ? (
        <p className="text-gray-500">Carregando…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card label="Revendedores ativos" value={String(data.activeResellers)} />
          <Card
            label="Estabelecimentos"
            value={String(data.totalEstablishments)}
          />
          <Card label="MRR" value={brl(data.mrr)} />
          <Card label="Notas no mês" value={String(data.notesThisMonth)} />
        </div>
      )}
    </div>
  );
}
