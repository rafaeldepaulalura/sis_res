import { useState } from 'react';
import {
  useCreateAddress,
  useCreateCustomer,
  useCustomer,
  useCustomers,
  useDeleteAddress,
  useDeleteCustomer,
  useSetDefaultAddress,
  type AddressInput,
} from '../hooks/useCustomers';
import { apiErrorMessage } from '../lib/api';

function NewCustomerForm({ onCreated }: { onCreated: (id: string) => void }) {
  const create = useCreateCustomer();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    document: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    create.mutate(
      {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        document: form.document || undefined,
      },
      {
        onSuccess: (c) => onCreated(c.id),
        onError: (e) => alert(apiErrorMessage(e)),
      },
    );
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-medium text-gray-800">Novo cliente</h2>
      <input placeholder="Nome *" value={form.name} onChange={set('name')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
      <input placeholder="Telefone *" value={form.phone} onChange={set('phone')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
      <input placeholder="E-mail" value={form.email} onChange={set('email')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
      <input placeholder="CPF/CNPJ" value={form.document} onChange={set('document')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
      <button onClick={submit} disabled={create.isPending || !form.name || !form.phone} className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50">
        Salvar cliente
      </button>
    </div>
  );
}

const EMPTY_ADDRESS: AddressInput = {
  label: '',
  street: '',
  number: '',
  complement: null,
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  isDefault: false,
  lat: null,
  lng: null,
};

function CustomerDetail({ id }: { id: string }) {
  const { data: customer } = useCustomer(id);
  const del = useDeleteCustomer();
  const createAddr = useCreateAddress();
  const delAddr = useDeleteAddress();
  const setDefault = useSetDefaultAddress();
  const [addr, setAddr] = useState<AddressInput>(EMPTY_ADDRESS);
  const [showForm, setShowForm] = useState(false);

  if (!customer) return <p className="text-gray-400">Carregando…</p>;

  const setF = (k: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddr((a) => ({ ...a, [k]: e.target.value }));

  const saveAddr = () => {
    createAddr.mutate(
      { customerId: id, dto: { ...addr, complement: addr.complement || undefined } },
      {
        onSuccess: () => {
          setAddr(EMPTY_ADDRESS);
          setShowForm(false);
        },
        onError: (e) => alert(apiErrorMessage(e)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{customer.name}</h2>
            <p className="text-sm text-gray-500">{customer.phone}</p>
            {customer.email && <p className="text-sm text-gray-500">{customer.email}</p>}
            {customer.document && <p className="text-xs text-gray-400">Doc: {customer.document}</p>}
          </div>
          <button
            onClick={() => {
              if (confirm('Excluir este cliente?'))
                del.mutate(id, { onError: (e) => alert(apiErrorMessage(e)) });
            }}
            className="text-xs text-red-500 hover:underline"
          >
            Excluir
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-gray-800">Endereços</h3>
          <button onClick={() => setShowForm((s) => !s)} className="text-sm text-primary hover:underline">
            {showForm ? 'Cancelar' : '+ Adicionar'}
          </button>
        </div>

        <ul className="space-y-2">
          {customer.addresses?.map((a) => (
            <li key={a.id} className="flex items-start justify-between rounded-lg border border-gray-100 p-3 text-sm">
              <div>
                <span className="font-medium text-gray-800">{a.label}</span>
                {a.isDefault && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">padrão</span>}
                <div className="text-gray-500">
                  {a.street}, {a.number}
                  {a.complement && ` - ${a.complement}`} · {a.neighborhood} · {a.city}/{a.state} · {a.zipCode}
                </div>
              </div>
              <div className="flex shrink-0 gap-2 text-xs">
                {!a.isDefault && (
                  <button onClick={() => setDefault.mutate({ customerId: id, addressId: a.id })} className="text-gray-500 hover:underline">
                    tornar padrão
                  </button>
                )}
                <button onClick={() => delAddr.mutate({ customerId: id, addressId: a.id })} className="text-red-500 hover:underline">
                  remover
                </button>
              </div>
            </li>
          ))}
          {customer.addresses?.length === 0 && <li className="text-sm text-gray-400">Nenhum endereço.</li>}
        </ul>

        {showForm && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
            <input placeholder="Rótulo (Casa)" value={addr.label} onChange={setF('label')} className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
            <input placeholder="Rua" value={addr.street} onChange={setF('street')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
            <input placeholder="Número" value={addr.number} onChange={setF('number')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
            <input placeholder="Bairro" value={addr.neighborhood} onChange={setF('neighborhood')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
            <input placeholder="Complemento" value={addr.complement ?? ''} onChange={setF('complement')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
            <input placeholder="Cidade" value={addr.city} onChange={setF('city')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
            <input placeholder="UF" maxLength={2} value={addr.state} onChange={setF('state')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
            <input placeholder="CEP" value={addr.zipCode} onChange={setF('zipCode')} className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary" />
            <label className="col-span-2 flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={addr.isDefault} onChange={(e) => setAddr((a) => ({ ...a, isDefault: e.target.checked }))} />
              Endereço padrão
            </label>
            <button onClick={saveAddr} disabled={createAddr.isPending} className="col-span-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50">
              Salvar endereço
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ClientesPage() {
  const [search, setSearch] = useState('');
  const { data: customers, isLoading } = useCustomers(search);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Lista */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
          <button
            onClick={() => {
              setCreating(true);
              setSelected(null);
            }}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
          >
            + Novo
          </button>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="space-y-1">
          {isLoading && <p className="text-sm text-gray-400">Carregando…</p>}
          {customers?.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelected(c.id);
                setCreating(false);
              }}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                selected === c.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-800">{c.name}</div>
              <div className="text-xs text-gray-500">
                {c.phone} · {c._count?.addresses ?? 0} endereço(s)
              </div>
            </button>
          ))}
          {customers?.length === 0 && (
            <p className="text-sm text-gray-400">Nenhum cliente.</p>
          )}
        </div>
      </div>

      {/* Detalhe */}
      <div>
        {creating ? (
          <NewCustomerForm
            onCreated={(id) => {
              setCreating(false);
              setSelected(id);
            }}
          />
        ) : selected ? (
          <CustomerDetail id={selected} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 p-10 text-sm text-gray-400">
            Selecione um cliente ou crie um novo.
          </div>
        )}
      </div>
    </div>
  );
}
