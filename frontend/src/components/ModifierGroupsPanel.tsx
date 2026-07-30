import { useState } from 'react';
import {
  useAddOption,
  useCreateGroup,
  useDeleteGroup,
  useDeleteOption,
  useModifierGroups,
  useUpdateGroup,
} from '../hooks/useModifiers';
import { apiErrorMessage } from '../lib/api';
import { brl } from '../lib/format';
import type { ModifierGroup } from '../types/api';

function GroupCard({ group }: { group: ModifierGroup }) {
  const update = useUpdateGroup();
  const del = useDeleteGroup();
  const addOption = useAddOption();
  const delOption = useDeleteOption();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const usados = group._count?.products ?? 0;

  const submitOption = () => {
    if (!name.trim()) return;
    addOption.mutate(
      {
        groupId: group.id,
        name: name.trim(),
        priceDelta: Number(price.replace(',', '.')) || 0,
      },
      {
        onSuccess: () => {
          setName('');
          setPrice('');
        },
        onError: (e) => alert(apiErrorMessage(e)),
      },
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-gray-800">{group.name}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
          {group.required ? 'obrigatório' : 'opcional'} · até{' '}
          {group.maxSelect === 0 ? '∞' : group.maxSelect}
        </span>
        <span className="text-xs text-gray-400">
          {usados === 0
            ? 'nenhum produto usa'
            : `usado em ${usados} produto(s)`}
        </span>
        <span className="ml-auto flex gap-3 text-xs">
          <button
            onClick={() =>
              update.mutate({
                id: group.id,
                dto: { required: !group.required },
              })
            }
            className="text-gray-500 hover:underline"
          >
            {group.required ? 'tornar opcional' : 'tornar obrigatório'}
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  `Excluir "${group.name}"? Ele sai dos ${usados} produto(s) que o usam. Pedidos já feitos não mudam.`,
                )
              )
                del.mutate(group.id, {
                  onError: (e) => alert(apiErrorMessage(e)),
                });
            }}
            className="text-red-500 hover:underline"
          >
            excluir
          </button>
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {group.options.map((o) => (
          <span
            key={o.id}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1 text-xs"
          >
            {o.name}
            {Number(o.priceDelta) !== 0 && (
              <span className="font-medium text-primary">
                {Number(o.priceDelta) > 0 ? '+' : '−'}
                {brl(Math.abs(Number(o.priceDelta)))}
              </span>
            )}
            <button
              onClick={() =>
                delOption.mutate({ groupId: group.id, optionId: o.id })
              }
              className="text-gray-300 hover:text-red-500"
              title="Remover opção"
            >
              ✕
            </button>
          </span>
        ))}
        {group.options.length === 0 && (
          <span className="text-xs text-gray-400">
            Sem opções ainda — adicione abaixo.
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitOption()}
          placeholder="Opção (ex: Bacon)"
          className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitOption()}
          placeholder="+R$"
          inputMode="decimal"
          className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
        <button
          onClick={submitOption}
          disabled={!name.trim()}
          className="rounded-lg border border-primary px-2 py-1.5 text-xs text-primary disabled:opacity-40"
        >
          + opção
        </button>
      </div>
    </div>
  );
}

// Cadastro dos complementos do cardápio. São do restaurante, não do produto:
// cadastra "Adicionais" uma vez e liga em quantos lanches quiser.
export function ModifierGroupsPanel() {
  const { data: groups } = useModifierGroups();
  const create = useCreateGroup();
  const [form, setForm] = useState({ name: '', required: false, maxSelect: 1 });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-1 font-medium text-gray-800">Complementos</h2>
      <p className="mb-3 text-xs text-gray-500">
        Adicionais, ponto da carne, borda, "sem cebola". Cadastre uma vez e use
        em vários produtos — a ligação é feita ao editar o produto.
      </p>

      <div className="mb-3 space-y-2">
        {groups?.map((g) => <GroupCard key={g.id} group={g} />)}
        {groups?.length === 0 && (
          <p className="text-sm text-gray-400">Nenhum grupo cadastrado.</p>
        )}
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-3">
        <div className="text-sm font-medium text-gray-700">Novo grupo</div>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Nome (ex: Adicionais, Ponto da carne)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) =>
                setForm((f) => ({ ...f, required: e.target.checked }))
              }
            />
            Obrigatório
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Máximo de escolhas
            <input
              value={form.maxSelect}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxSelect: Number(e.target.value) || 0 }))
              }
              inputMode="numeric"
              className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-primary"
            />
          </label>
          <span className="text-xs text-gray-400">0 = sem limite</span>
        </div>
        <button
          onClick={() =>
            create.mutate(
              {
                name: form.name,
                required: form.required,
                minSelect: form.required ? 1 : 0,
                maxSelect: form.maxSelect,
              },
              {
                onSuccess: () =>
                  setForm({ name: '', required: false, maxSelect: 1 }),
                onError: (e) => alert(apiErrorMessage(e)),
              },
            )
          }
          disabled={!form.name.trim()}
          className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
        >
          Criar grupo
        </button>
      </div>
    </div>
  );
}
