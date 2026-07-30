import { Fragment, useState } from 'react';
import {
  useChangePlan,
  useCreateReseller,
  useDeleteReseller,
  usePlans,
  useResellers,
  useSetResellerAdmin,
  useUpdateReseller,
  type ResellerRow,
} from '../../hooks/useSuperAdmin';
import { apiErrorMessage } from '../../lib/api';
import { brl } from '../../lib/format';

const STATUS_CLS: Record<string, string> = {
  TRIAL: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PAST_DUE: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

function NewResellerForm({ onDone }: { onDone: () => void }) {
  const { data: plans } = usePlans();
  const create = useCreateReseller();
  const [f, setF] = useState({
    name: '',
    cnpj: '',
    email: '',
    planId: '',
    adminEmail: '',
    adminPassword: '',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="font-medium text-gray-800">Novo revendedor</h2>
      <div className="grid grid-cols-2 gap-2">
        <input value={f.name} onChange={set('name')} placeholder="Nome *" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
        <input value={f.cnpj} onChange={set('cnpj')} placeholder="CNPJ *" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
        <input value={f.email} onChange={set('email')} placeholder="E-mail *" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
        <select value={f.planId} onChange={set('planId')} className="rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:border-primary">
          <option value="">Plano *</option>
          {plans?.map((p) => (
            <option key={p.id} value={p.id}>{p.name} · {brl(p.monthlyPrice)}</option>
          ))}
        </select>
        <input value={f.adminEmail} onChange={set('adminEmail')} placeholder="E-mail do admin (login)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
        <input value={f.adminPassword} onChange={set('adminPassword')} type="password" placeholder="Senha do admin" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
      </div>
      <button
        onClick={() =>
          create.mutate(
            {
              name: f.name,
              cnpj: f.cnpj,
              email: f.email,
              planId: f.planId,
              adminEmail: f.adminEmail || undefined,
              adminPassword: f.adminPassword || undefined,
            },
            { onSuccess: onDone, onError: (e) => alert(apiErrorMessage(e)) },
          )
        }
        disabled={!f.name || !f.cnpj || !f.email || !f.planId || create.isPending}
        className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
      >
        Criar revendedor + assinatura
      </button>
    </div>
  );
}

// Cria o acesso (1º login) ou troca a senha do revendedor.
function AccessForm({
  reseller,
  onDone,
}: {
  reseller: ResellerRow;
  onDone: () => void;
}) {
  const setAdmin = useSetResellerAdmin();
  const isNew = !reseller.adminEmail;
  const [email, setEmail] = useState(reseller.adminEmail ?? '');
  const [password, setPassword] = useState('');

  return (
    <tr className="bg-gray-50">
      <td colSpan={7} className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {isNew ? 'Criar acesso' : 'Trocar senha'} · {reseller.name}
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail de login"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Nova senha (mín. 6)"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() =>
              setAdmin.mutate(
                {
                  id: reseller.id,
                  email: email || undefined,
                  password,
                },
                {
                  onSuccess: (r) => {
                    alert(
                      r.created
                        ? `Acesso criado para ${r.email}`
                        : `Senha atualizada para ${r.email}`,
                    );
                    onDone();
                  },
                  onError: (e) => alert(apiErrorMessage(e)),
                },
              )
            }
            disabled={password.length < 6 || (isNew && !email) || setAdmin.isPending}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg disabled:opacity-50"
          >
            Salvar
          </button>
          <button
            onClick={onDone}
            className="text-sm text-gray-500 hover:underline"
          >
            cancelar
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ResellersPage() {
  const { data: resellers } = useResellers();
  const { data: plans } = usePlans();
  const update = useUpdateReseller();
  const changePlan = useChangePlan();
  const del = useDeleteReseller();
  const [showForm, setShowForm] = useState(false);
  const [accessFor, setAccessFor] = useState<string | null>(null);

  const remove = (r: ResellerRow) => {
    if (
      !confirm(
        `Excluir definitivamente o revendedor "${r.name}"? O acesso e a assinatura dele serão apagados. Os ${r.establishments} estabelecimento(s) NÃO serão excluídos — apenas desvinculados (viram estabelecimentos diretos). Esta ação não pode ser desfeita.`,
      )
    )
      return;
    del.mutate(r.id, { onError: (e) => alert(apiErrorMessage(e)) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Revendedores</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
        >
          {showForm ? 'Fechar' : '+ Novo'}
        </button>
      </div>

      {showForm && <NewResellerForm onDone={() => setShowForm(false)} />}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="p-3">Revendedor</th>
              <th className="p-3">Acesso</th>
              <th className="p-3">Assinatura</th>
              <th className="p-3 text-center">Lojas</th>
              <th className="p-3 text-center">Notas/mês</th>
              <th className="p-3">Plano</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {resellers?.map((r) => (
              <Fragment key={r.id}>
              <tr className="border-b border-gray-50">
                <td className="p-3">
                  <div className="font-medium text-gray-800">{r.name}</div>
                  <div className="text-xs text-gray-400">{r.email}</div>
                </td>
                <td className="p-3">
                  {r.adminEmail ? (
                    <div className="text-xs text-gray-600">{r.adminEmail}</div>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      sem acesso
                    </span>
                  )}
                  <button
                    onClick={() =>
                      setAccessFor(accessFor === r.id ? null : r.id)
                    }
                    className="text-xs text-primary hover:underline"
                  >
                    {r.adminEmail ? 'trocar senha' : 'criar senha'}
                  </button>
                </td>
                <td className="p-3">
                  {r.subscription ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLS[r.subscription.status] ?? ''}`}>
                      {r.subscription.status} · {r.subscription.plan}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="p-3 text-center">{r.establishments}</td>
                <td className="p-3 text-center">{r.notesThisMonth}</td>
                <td className="p-3">
                  <select
                    value=""
                    onChange={(e) =>
                      e.target.value &&
                      changePlan.mutate({ id: r.id, planId: e.target.value })
                    }
                    className="rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-primary"
                  >
                    <option value="">trocar…</option>
                    {plans?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() =>
                        update.mutate({ id: r.id, dto: { active: !r.active } })
                      }
                      className={
                        r.active
                          ? 'text-xs text-amber-600 hover:underline'
                          : 'text-xs text-emerald-600 hover:underline'
                      }
                    >
                      {r.active ? 'suspender' : 'reativar'}
                    </button>
                    <button
                      onClick={() => remove(r)}
                      disabled={del.isPending}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      excluir
                    </button>
                  </div>
                </td>
              </tr>
              {accessFor === r.id && (
                <AccessForm reseller={r} onDone={() => setAccessFor(null)} />
              )}
              </Fragment>
            ))}
            {resellers?.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  Nenhum revendedor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
