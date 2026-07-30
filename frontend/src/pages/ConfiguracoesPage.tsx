import { useEffect, useRef, useState } from 'react';
import {
  useCreateArea,
  useCreateTable,
  useCreateUser,
  useDeleteArea,
  useDeleteTable,
  useRoomAreasFull,
  useUpdateUser,
  useUsers,
  type StaffUser,
} from '../hooks/useAdmin';
import { DeliverySettingsPanel } from '../components/DeliverySettingsPanel';
import { PrintersPanel } from '../components/PrintersPanel';
import { PermissionPicker } from '../components/PermissionPicker';
import { DEFAULT_PERMISSIONS } from '../lib/permissions';
import { useCouriers, useCreateCourier } from '../hooks/useDelivery';
import { useEstablishment } from '../hooks/useEstablishment';
import { useEstablishmentBranding, useUpdateEstablishmentBranding } from '../hooks/useEstablishmentBranding';
import { applyPrimaryColor } from '../lib/theme';
import { CopyLink } from '../components/CopyLink';
import { apiErrorMessage } from '../lib/api';
import type { Role } from '../types/api';

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  RESELLER_ADMIN: 'Revendedor',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  CASHIER: 'Caixa',
  WAITER: 'Garçom',
  KITCHEN: 'Cozinha',
  COURIER: 'Motoboy',
};

function BrandingCard() {
  const { data: est } = useEstablishmentBranding();
  const update = useUpdateEstablishmentBranding();
  const [f, setF] = useState({ name: '', logoUrl: '', primaryColor: '#dc2626' });
  const loaded = useRef(false);

  // Sincroniza o form com os dados salvos assim que a query resolve
  // (o useState acima roda antes de `est` existir, então precisa desse efeito).
  // Só na primeira carga — não sobrescreve edições em andamento em refetches.
  useEffect(() => {
    if (est && !loaded.current) {
      loaded.current = true;
      setF({
        name: est.name,
        logoUrl: est.logoUrl ?? '',
        primaryColor: est.primaryColor ?? '#dc2626',
      });
    }
  }, [est]);

  if (!est) return null;

  const save = () => {
    update.mutate(f, {
      onSuccess: (updated) => {
        applyPrimaryColor(updated.primaryColor);
      },
      onError: (e) => alert(apiErrorMessage(e)),
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 font-medium text-gray-800">Marca do restaurante</h2>
      <div className="space-y-3">
        <input
          value={f.name}
          onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))}
          placeholder="Nome do restaurante"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          value={f.logoUrl}
          onChange={(e) => setF((s) => ({ ...s, logoUrl: e.target.value }))}
          placeholder="URL da logo (https://...)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex gap-2">
          <input
            type="color"
            value={f.primaryColor}
            onChange={(e) => setF((s) => ({ ...s, primaryColor: e.target.value }))}
            className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300"
          />
          <input
            value={f.primaryColor}
            onChange={(e) => setF((s) => ({ ...s, primaryColor: e.target.value }))}
            placeholder="#dc2626"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={save}
          disabled={update.isPending}
          className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
        >
          Salvar marca
        </button>
      </div>
    </div>
  );
}

// Travas que exigem PIN de um responsável para liberar a ação.
function PinRulesCard() {
  const { data: est } = useEstablishmentBranding();
  const update = useUpdateEstablishmentBranding();
  if (!est) return null;

  const Toggle = ({
    on,
    label,
    hint,
    onChange,
  }: {
    on: boolean;
    label: string;
    hint: string;
    onChange: (v: boolean) => void;
  }) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="block text-sm font-medium text-gray-800">{label}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </label>
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-1 font-medium text-gray-800">Autorização do gerente</h2>
      <p className="mb-3 text-xs text-gray-500">
        Com a trava ligada, o garçom não conclui sozinho: alguém com permissão
        digita o PIN na hora e o sistema guarda quem autorizou. O PIN é
        cadastrado em cada usuário, na Equipe.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle
          on={est.requirePinForCancelItem}
          label="Cancelar item lançado"
          hint="Item já enviado sumir da conta é a queixa nº 1 de furo de caixa."
          onChange={(v) =>
            update.mutate(
              { requirePinForCancelItem: v },
              { onError: (e) => alert(apiErrorMessage(e)) },
            )
          }
        />
        <Toggle
          on={est.requirePinForDiscount}
          label="Aplicar desconto"
          hint="Só pede PIN quando há desconto de fato no fechamento."
          onChange={(v) =>
            update.mutate(
              { requirePinForDiscount: v },
              { onError: (e) => alert(apiErrorMessage(e)) },
            )
          }
        />
      </div>
    </div>
  );
}

function CardapioLinkCard({ slug }: { slug?: string }) {
  if (!slug) return null;
  const url = `${window.location.origin}/menu/${slug}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-1 font-medium text-gray-800">Cardápio digital</h2>
      <p className="mb-3 text-xs text-gray-500">
        Link público do cardápio — compartilhe no WhatsApp, redes sociais ou em
        um QR code na entrada do restaurante.
      </p>
      <CopyLink url={url} />
    </div>
  );
}

function TablesConfig({ slug }: { slug?: string }) {
  const { data: areas } = useRoomAreasFull();
  const createArea = useCreateArea();
  const delArea = useDeleteArea();
  const createTable = useCreateTable();
  const delTable = useDeleteTable();
  const [areaName, setAreaName] = useState('');
  const [tableNum, setTableNum] = useState<Record<string, string>>({});

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 font-medium text-gray-800">Áreas e Mesas</h2>

      <div className="mb-4 flex gap-2">
        <input
          value={areaName}
          onChange={(e) => setAreaName(e.target.value)}
          placeholder="Nova área (ex: Varanda)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() =>
            createArea.mutate(areaName, {
              onSuccess: () => setAreaName(''),
              onError: (e) => alert(apiErrorMessage(e)),
            })
          }
          disabled={!areaName}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-fg disabled:opacity-50"
        >
          + Área
        </button>
      </div>

      <div className="space-y-4">
        {areas?.map((area) => (
          <div key={area.id} className="rounded-lg border border-gray-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-700">{area.name}</span>
              <button
                onClick={() => {
                  if (confirm(`Excluir área "${area.name}"?`))
                    delArea.mutate(area.id, {
                      onError: (e) => alert(apiErrorMessage(e)),
                    });
                }}
                className="text-xs text-red-500 hover:underline"
              >
                excluir área
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {area.tables.map((t) => (
                <span
                  key={t.id}
                  className="group flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                >
                  Mesa {t.number}
                  {slug && (
                    <CopyLink
                      url={`${window.location.origin}/menu/${slug}?mesa=${t.number}`}
                      compact
                    />
                  )}
                  <button
                    onClick={() =>
                      delTable.mutate(t.id, {
                        onError: (e) => alert(apiErrorMessage(e)),
                      })
                    }
                    className="text-gray-300 hover:text-red-500"
                    title="Excluir mesa"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <span className="flex items-center gap-1">
                <input
                  value={tableNum[area.id] ?? ''}
                  onChange={(e) =>
                    setTableNum((m) => ({ ...m, [area.id]: e.target.value }))
                  }
                  placeholder="nº"
                  inputMode="numeric"
                  className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={() => {
                    const n = Number(tableNum[area.id]);
                    if (!n) return;
                    createTable.mutate(
                      { roomAreaId: area.id, number: n },
                      {
                        onSuccess: () =>
                          setTableNum((m) => ({ ...m, [area.id]: '' })),
                        onError: (e) => alert(apiErrorMessage(e)),
                      },
                    );
                  }}
                  className="rounded-lg border border-primary px-2 py-1 text-sm text-primary"
                >
                  + mesa
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Edição de acessos de um membro já cadastrado.
function EditPermissions({
  user,
  onClose,
}: {
  user: StaffUser;
  onClose: () => void;
}) {
  const update = useUpdateUser();
  const [permissions, setPermissions] = useState<string[]>(user.permissions);

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 text-sm font-medium text-gray-700">
        Acessos de {user.name}
      </div>
      {user.role === 'ADMIN' ? (
        <p className="text-xs text-gray-500">
          Administrador é o dono do sistema: tem acesso total e não pode ser
          restringido.
        </p>
      ) : (
        <>
          <PermissionPicker value={permissions} onChange={setPermissions} />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() =>
                update.mutate(
                  { id: user.id, dto: { permissions } },
                  { onSuccess: onClose, onError: (e) => alert(apiErrorMessage(e)) },
                )
              }
              disabled={update.isPending}
              className="flex-1 rounded-lg bg-primary py-1.5 text-sm font-medium text-primary-fg disabled:opacity-50"
            >
              Salvar acessos
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-white"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TeamConfig() {
  const { data: users } = useUsers();
  const create = useCreateUser();
  const update = useUpdateUser();
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'WAITER' as Role,
    // PIN de autorização (opcional) — só quem vai liberar ações precisa.
    pinCode: '',
  });
  // Começa com o padrão do papel e o dono ajusta o que quiser.
  const [permissions, setPermissions] = useState<string[]>(
    DEFAULT_PERMISSIONS.WAITER,
  );

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Trocar o papel repõe o padrão daquele papel como ponto de partida.
  const setRole = (role: Role) => {
    setForm((f) => ({ ...f, role }));
    setPermissions(DEFAULT_PERMISSIONS[role] ?? []);
  };

  const reset = () => {
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'WAITER',
      pinCode: '',
    });
    setPermissions(DEFAULT_PERMISSIONS.WAITER);
    setShowForm(false);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-medium text-gray-800">Equipe</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-fg hover:opacity-90"
        >
          {showForm ? 'Fechar' : '+ Novo usuário'}
        </button>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        Cada funcionário tem login próprio. Você escolhe quais páginas e ações
        ele pode usar — por exemplo, deixar Relatórios (faturamento) só para
        você.
      </p>

      <div className="mb-4 space-y-1">
        {users?.map((u) => (
          <div key={u.id} className="border-b border-gray-50 pb-2">
            <div className="flex flex-wrap items-center gap-2 py-2">
              <span className="font-medium text-gray-800">{u.name}</span>
              <span className="text-xs text-gray-500">
                {ROLE_LABEL[u.role]}
              </span>
              <span className="text-xs text-gray-400">{u.email}</span>
              <span className="ml-auto flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {u.role === 'ADMIN'
                    ? 'acesso total'
                    : `${u.permissions.length} acesso(s)`}
                </span>
                <button
                  onClick={() =>
                    setEditing(editing === u.id ? null : u.id)
                  }
                  className="text-xs text-primary hover:underline"
                >
                  acessos
                </button>
                <button
                  onClick={() =>
                    update.mutate({ id: u.id, dto: { active: !u.active } })
                  }
                  className={
                    u.active
                      ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700'
                      : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500'
                  }
                >
                  {u.active ? 'ativo' : 'inativo'}
                </button>
              </span>
            </div>
            {editing === u.id && (
              <EditPermissions user={u} onClose={() => setEditing(null)} />
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="space-y-3 border-t border-gray-100 pt-3">
          <div className="text-sm font-medium text-gray-700">Novo usuário</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              placeholder="Nome"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <select
              value={form.role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:border-primary"
            >
              {(
                ['WAITER', 'CASHIER', 'MANAGER', 'KITCHEN', 'ADMIN'] as Role[]
              ).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <input
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
              placeholder="E-mail (login)"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              value={form.password}
              onChange={(e) => set('password')(e.target.value)}
              placeholder="Senha (mín. 6)"
              type="password"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <input
              value={form.pinCode}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  pinCode: e.target.value.replace(/\D/g, '').slice(0, 8),
                }))
              }
              placeholder="PIN de autorização (4 a 8 números, opcional)"
              inputMode="numeric"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-xs text-gray-400">
              Use para quem vai autorizar cancelamento e desconto no salão.
            </p>
          </div>

          {form.role === 'ADMIN' ? (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              Administrador tem acesso total ao sistema, inclusive ao
              faturamento e à criação de outros usuários.
            </p>
          ) : (
            <div className="rounded-lg border border-gray-200 p-3">
              <PermissionPicker
                value={permissions}
                onChange={setPermissions}
              />
            </div>
          )}

          <button
            onClick={() =>
              create.mutate(
                {
                  ...form,
                  // PIN em branco não vai — o campo é opcional.
                  pinCode: form.pinCode || undefined,
                  permissions,
                },
                {
                  onSuccess: reset,
                  onError: (e) => alert(apiErrorMessage(e)),
                },
              )
            }
            disabled={!form.name || !form.email || form.password.length < 6}
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
          >
            Cadastrar usuário
          </button>
        </div>
      )}
    </div>
  );
}

function CouriersConfig() {
  const { data: couriers } = useCouriers();
  const create = useCreateCourier();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-1 font-medium text-gray-800">Entregadores (motoboy)</h2>
      <p className="mb-4 text-xs text-gray-500">
        Cada entregador tem um link individual e fixo — envie por WhatsApp,
        ele abre as entregas dele sem precisar de login.
      </p>

      <div className="mb-4 space-y-3">
        {couriers?.map((c) => (
          <div key={c.id} className="rounded-lg border border-gray-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-700">{c.name}</span>
              <span className="text-xs text-gray-400">{c.phone}</span>
            </div>
            <CopyLink url={`${window.location.origin}/motoboy/${c.id}`} />
          </div>
        ))}
        {couriers?.length === 0 && (
          <p className="text-sm text-gray-400">Nenhum entregador cadastrado.</p>
        )}
      </div>

      <div className="flex gap-2 border-t border-gray-100 pt-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefone"
          className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() =>
            create.mutate(
              { name, phone },
              {
                onSuccess: () => {
                  setName('');
                  setPhone('');
                },
                onError: (e) => alert(apiErrorMessage(e)),
              },
            )
          }
          disabled={!name || !phone}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
        >
          + Motoboy
        </button>
      </div>
    </div>
  );
}

export function ConfiguracoesPage() {
  const { data: establishment } = useEstablishment();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Configurações</h1>
      <BrandingCard />
      <PinRulesCard />
      <CardapioLinkCard slug={establishment?.slug} />
      <div className="grid gap-4 lg:grid-cols-2">
        <TablesConfig slug={establishment?.slug} />
        <TeamConfig />
      </div>
      <PrintersPanel />
      <DeliverySettingsPanel />
      <CouriersConfig />
    </div>
  );
}
