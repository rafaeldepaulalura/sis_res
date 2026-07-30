import { useState } from 'react';
import {
  useCreateAddress,
  useCreateCustomer,
  useCustomer,
  useCustomers,
} from '../hooks/useCustomers';
import { useSetFulfillment } from '../hooks/useTabs';
import { apiErrorMessage } from '../lib/api';
import type { Tab } from '../types/api';

const EMPTY_ADDRESS = {
  label: 'Entrega',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
};

// Busca/cadastra cliente + endereço direto na comanda, e vincula à comanda
// como endereço de entrega — é o que o motoboy vê no PWA dele.
export function DeliveryAddressPicker({ tab }: { tab: Tab }) {
  const setFulfillment = useSetFulfillment(tab.id);
  const [mode, setMode] = useState<'view' | 'search' | 'newCustomer' | 'newAddress'>(
    'view',
  );
  const [search, setSearch] = useState('');
  const { data: results } = useCustomers(search);
  const [pendingCustomerId, setPendingCustomerId] = useState<string | null>(null);
  const { data: pendingCustomer } = useCustomer(pendingCustomerId);
  const createCustomer = useCreateCustomer();
  const createAddress = useCreateAddress();
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);

  const linkAddress = (customerId: string, addressId: string) => {
    setFulfillment.mutate(
      {
        isDelivery: true,
        courierId: tab.courier?.id,
        customerId,
        deliveryAddressId: addressId,
      },
      {
        onSuccess: () => {
          setMode('view');
          setPendingCustomerId(null);
          setSearch('');
          setNewAddress(EMPTY_ADDRESS);
        },
        onError: (e) => alert(apiErrorMessage(e)),
      },
    );
  };

  const saveNewAddress = () => {
    if (!pendingCustomerId) return;
    createAddress.mutate(
      { customerId: pendingCustomerId, dto: newAddress },
      {
        onSuccess: (address) => linkAddress(pendingCustomerId, address.id),
        onError: (e) => alert(apiErrorMessage(e)),
      },
    );
  };

  const saveNewCustomerThenAddress = () => {
    createCustomer.mutate(newCustomer, {
      onSuccess: (customer) => {
        setPendingCustomerId(customer.id);
        setMode('newAddress');
      },
      onError: (e) => alert(apiErrorMessage(e)),
    });
  };

  // ---- Resumo (cliente + endereço já vinculados) ----
  if (mode === 'view') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
        {tab.customer ? (
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium text-gray-800">
                {tab.customer.name} · {tab.customer.phone}
              </div>
              {tab.deliveryAddress ? (
                <div className="mt-0.5 text-xs text-gray-500">
                  {tab.deliveryAddress.street}, {tab.deliveryAddress.number}
                  {tab.deliveryAddress.complement &&
                    ` - ${tab.deliveryAddress.complement}`}{' '}
                  · {tab.deliveryAddress.neighborhood} ·{' '}
                  {tab.deliveryAddress.city}/{tab.deliveryAddress.state}
                </div>
              ) : (
                <div className="mt-0.5 text-xs text-amber-600">
                  Sem endereço de entrega definido
                </div>
              )}
            </div>
            <button
              onClick={() => setMode('search')}
              className="shrink-0 text-xs text-primary hover:underline"
            >
              trocar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setMode('search')}
            className="text-sm font-medium text-primary hover:underline"
          >
            + Vincular cliente e endereço de entrega
          </button>
        )}
      </div>
    );
  }

  // ---- Busca por telefone/nome ----
  if (mode === 'search') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium text-gray-700">Buscar cliente</span>
          <button
            onClick={() => setMode('view')}
            className="text-xs text-gray-500 hover:underline"
          >
            cancelar
          </button>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nome ou telefone…"
          autoFocus
          className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {results?.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setPendingCustomerId(c.id);
                setMode('newAddress');
              }}
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-left hover:bg-gray-50"
            >
              <span className="font-medium text-gray-800">{c.name}</span>{' '}
              <span className="text-xs text-gray-400">{c.phone}</span>
            </button>
          ))}
          {search && results?.length === 0 && (
            <p className="py-1 text-xs text-gray-400">Nenhum cliente encontrado.</p>
          )}
        </div>
        <button
          onClick={() => setMode('newCustomer')}
          className="mt-2 text-xs text-primary hover:underline"
        >
          + cadastrar cliente novo
        </button>
      </div>
    );
  }

  // ---- Cadastro rápido de cliente ----
  if (mode === 'newCustomer') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium text-gray-700">Novo cliente</span>
          <button
            onClick={() => setMode('search')}
            className="text-xs text-gray-500 hover:underline"
          >
            voltar
          </button>
        </div>
        <div className="space-y-2">
          <input
            value={newCustomer.name}
            onChange={(e) =>
              setNewCustomer((s) => ({ ...s, name: e.target.value }))
            }
            placeholder="Nome"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          <input
            value={newCustomer.phone}
            onChange={(e) =>
              setNewCustomer((s) => ({ ...s, phone: e.target.value }))
            }
            placeholder="Telefone"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={saveNewCustomerThenAddress}
            disabled={!newCustomer.name || !newCustomer.phone || createCustomer.isPending}
            className="w-full rounded-lg bg-primary py-1.5 text-sm font-medium text-primary-fg disabled:opacity-50"
          >
            Continuar para o endereço
          </button>
        </div>
      </div>
    );
  }

  // ---- Escolher/cadastrar endereço do cliente selecionado ----
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-gray-700">
          Endereço de {pendingCustomer?.name ?? '…'}
        </span>
        <button
          onClick={() => setMode('search')}
          className="text-xs text-gray-500 hover:underline"
        >
          voltar
        </button>
      </div>

      {pendingCustomer?.addresses && pendingCustomer.addresses.length > 0 && (
        <div className="mb-2 space-y-1">
          {pendingCustomer.addresses.map((a) => (
            <button
              key={a.id}
              onClick={() => linkAddress(pendingCustomer.id, a.id)}
              disabled={setFulfillment.isPending}
              className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-left text-xs hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="font-medium text-gray-700">{a.label}</span> ·{' '}
              {a.street}, {a.number} · {a.neighborhood} · {a.city}/{a.state}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2 border-t border-gray-200 pt-2">
        <div className="text-xs font-medium text-gray-600">+ Novo endereço</div>
        <div className="grid grid-cols-3 gap-1.5">
          <input
            value={newAddress.street}
            onChange={(e) => setNewAddress((s) => ({ ...s, street: e.target.value }))}
            placeholder="Rua"
            className="col-span-2 rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-primary"
          />
          <input
            value={newAddress.number}
            onChange={(e) => setNewAddress((s) => ({ ...s, number: e.target.value }))}
            placeholder="Nº"
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-primary"
          />
        </div>
        <input
          value={newAddress.complement}
          onChange={(e) => setNewAddress((s) => ({ ...s, complement: e.target.value }))}
          placeholder="Complemento"
          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
        <div className="grid grid-cols-3 gap-1.5">
          <input
            value={newAddress.neighborhood}
            onChange={(e) =>
              setNewAddress((s) => ({ ...s, neighborhood: e.target.value }))
            }
            placeholder="Bairro"
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-primary"
          />
          <input
            value={newAddress.city}
            onChange={(e) => setNewAddress((s) => ({ ...s, city: e.target.value }))}
            placeholder="Cidade"
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-primary"
          />
          <input
            value={newAddress.state}
            onChange={(e) =>
              setNewAddress((s) => ({ ...s, state: e.target.value.toUpperCase().slice(0, 2) }))
            }
            placeholder="UF"
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={saveNewAddress}
          disabled={
            !newAddress.street ||
            !newAddress.number ||
            !newAddress.neighborhood ||
            !newAddress.city ||
            newAddress.state.length !== 2 ||
            createAddress.isPending ||
            setFulfillment.isPending
          }
          className="w-full rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-fg disabled:opacity-50"
        >
          Salvar e vincular à comanda
        </button>
      </div>
    </div>
  );
}
