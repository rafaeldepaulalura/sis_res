import { useState } from 'react';
import {
  useCreateEstablishment,
  useDeleteEstablishment,
  useMyEstablishments,
  useUpdateEstablishment,
  type ResellerEstablishment,
  type UpdateEstablishmentDto,
} from '../../hooks/useResellerPanel';
import { apiErrorMessage } from '../../lib/api';

function EditForm({
  est,
  onClose,
}: {
  est: ResellerEstablishment;
  onClose: () => void;
}) {
  const update = useUpdateEstablishment();
  const [f, setF] = useState<UpdateEstablishmentDto>({
    name: est.name,
    cnpj: est.cnpj,
    address: est.address ?? '',
    phone: est.phone ?? '',
    fiscalDocumentQuota: est.fiscalDocumentQuota,
  });
  const set =
    (k: keyof UpdateEstablishmentDto) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }));

  const save = () => {
    update.mutate(
      {
        id: est.id,
        dto: {
          name: f.name,
          cnpj: f.cnpj,
          address: f.address || undefined,
          phone: f.phone || undefined,
          fiscalDocumentQuota:
            f.fiscalDocumentQuota === null || f.fiscalDocumentQuota === undefined
              ? null
              : Number(f.fiscalDocumentQuota),
        },
      },
      {
        onSuccess: onClose,
        onError: (e) => alert(apiErrorMessage(e)),
      },
    );
  };

  return (
    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      <input
        value={f.name}
        onChange={set('name')}
        placeholder="Nome"
        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
      <input
        value={f.cnpj}
        onChange={set('cnpj')}
        placeholder="CNPJ"
        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
      <input
        value={f.address}
        onChange={set('address')}
        placeholder="Endereço"
        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
      <input
        value={f.phone}
        onChange={set('phone')}
        placeholder="Telefone"
        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Cota de notas fiscais/mês (vazio = sem limite individual)
        </label>
        <input
          value={f.fiscalDocumentQuota ?? ''}
          onChange={(e) =>
            setF((s) => ({
              ...s,
              fiscalDocumentQuota:
                e.target.value === '' ? null : Number(e.target.value),
            }))
          }
          inputMode="numeric"
          placeholder="Ex: 200"
          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={update.isPending}
          className="flex-1 rounded-lg bg-primary py-1.5 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function EstablishmentsPage() {
  const { data: list } = useMyEstablishments();
  const create = useCreateEstablishment();
  const update = useUpdateEstablishment();
  const del = useDeleteEstablishment();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [f, setF] = useState({
    name: '',
    cnpj: '',
    adminEmail: '',
    adminPassword: '',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const remove = (est: ResellerEstablishment) => {
    if (
      !confirm(
        `Excluir definitivamente "${est.name}"? Todo o histórico (comandas, pedidos, clientes) será perdido. Esta ação não pode ser desfeita.`,
      )
    )
      return;
    del.mutate(est.id, { onError: (e) => alert(apiErrorMessage(e)) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Estabelecimentos</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
        >
          {showForm ? 'Fechar' : '+ Novo'}
        </button>
      </div>

      {showForm && (
        <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-2">
            <input value={f.name} onChange={set('name')} placeholder="Nome do estabelecimento *" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
            <input value={f.cnpj} onChange={set('cnpj')} placeholder="CNPJ *" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
            <input value={f.adminEmail} onChange={set('adminEmail')} placeholder="E-mail do admin (login PDV) *" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
            <input value={f.adminPassword} onChange={set('adminPassword')} type="password" placeholder="Senha do admin *" className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <button
            onClick={() =>
              create.mutate(f, {
                onSuccess: () => {
                  setShowForm(false);
                  setF({ name: '', cnpj: '', adminEmail: '', adminPassword: '' });
                },
                onError: (e) => alert(apiErrorMessage(e)),
              })
            }
            disabled={!f.name || !f.cnpj || !f.adminEmail || f.adminPassword.length < 6}
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
          >
            Criar estabelecimento + admin
          </button>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
        {list?.map((e) => (
          <div key={e.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="font-medium text-gray-800">{e.name}</div>
              <span className={e.active ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700' : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500'}>
                {e.active ? 'ativo' : 'inativo'}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-400">CNPJ {e.cnpj}</div>
            {e.address && (
              <div className="mt-1 text-xs text-gray-400">{e.address}</div>
            )}
            {e.phone && (
              <div className="mt-1 text-xs text-gray-400">{e.phone}</div>
            )}
            <div className="mt-1 text-xs text-gray-500">
              Cota de notas/mês:{' '}
              {e.fiscalDocumentQuota === null ? 'sem limite' : e.fiscalDocumentQuota}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Última venda:{' '}
              {e.lastSale ? new Date(e.lastSale).toLocaleString('pt-BR') : '—'}
            </div>

            {editingId === e.id ? (
              <EditForm est={e} onClose={() => setEditingId(null)} />
            ) : (
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <button
                  onClick={() => setEditingId(e.id)}
                  className="text-gray-500 hover:underline"
                >
                  editar
                </button>
                <button
                  onClick={() => update.mutate({ id: e.id, dto: { active: !e.active } })}
                  className="text-gray-500 hover:underline"
                >
                  {e.active ? 'suspender' : 'reativar'}
                </button>
                <button
                  onClick={() => remove(e)}
                  disabled={del.isPending}
                  className="text-red-500 hover:underline disabled:opacity-50"
                >
                  excluir
                </button>
              </div>
            )}
          </div>
        ))}
        {list?.length === 0 && (
          <p className="text-sm text-gray-400">Nenhum estabelecimento ainda.</p>
        )}
      </div>
    </div>
  );
}
