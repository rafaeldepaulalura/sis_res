import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ModifierGroupsPanel } from '../components/ModifierGroupsPanel';
import { useCategories } from '../hooks/useCatalog';
import {
  useModifierGroups,
  useProductGroups,
  useSetProductGroups,
} from '../hooks/useModifiers';
import {
  useAllProducts,
  useCreateCategory,
  useCreateProduct,
  useDeleteCategory,
  useDeleteProduct,
  useUpdateCategory,
  useUpdateProduct,
  type ProductInput,
} from '../hooks/useCatalogAdmin';
import { apiErrorMessage } from '../lib/api';
import { brl } from '../lib/format';
import type { Product } from '../types/api';

const EMPTY: ProductInput = {
  categoryId: '',
  name: '',
  description: '',
  price: 0,
  active: true,
  imageUrl: '',
};

function CategoriesPanel({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { data: categories } = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const del = useDeleteCategory();
  const [name, setName] = useState('');

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 font-medium text-gray-800">Categorias</h2>
      <div className="space-y-1">
        <button
          onClick={() => onSelect(null)}
          className={clsx(
            'w-full rounded-lg px-3 py-2 text-left text-sm',
            selected === null ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50',
          )}
        >
          Todas
        </button>
        {categories?.map((c) => (
          <div
            key={c.id}
            className={clsx(
              'flex items-center gap-1 rounded-lg px-2 py-1',
              selected === c.id ? 'bg-primary/10' : 'hover:bg-gray-50',
            )}
          >
            <button
              onClick={() => onSelect(c.id)}
              className={clsx(
                'flex-1 py-1 text-left text-sm',
                selected === c.id ? 'text-primary' : 'text-gray-700',
              )}
            >
              {c.name}
              {c.allowsHalf && (
                <span className="ml-1 text-xs text-amber-600">🍕</span>
              )}
            </button>
            <button
              onClick={() =>
                update.mutate({ id: c.id, dto: { allowsHalf: !c.allowsHalf } })
              }
              title={
                c.allowsHalf
                  ? 'Meia a meia ativada — clique para desativar'
                  : 'Ativar pizza meia a meia nesta categoria'
              }
              className={clsx(
                'px-1 text-xs',
                c.allowsHalf
                  ? 'text-amber-600 hover:text-amber-700'
                  : 'text-gray-300 hover:text-gray-500',
              )}
            >
              🍕
            </button>
            <button
              onClick={() => {
                const novo = prompt('Renomear categoria', c.name);
                if (novo && novo !== c.name)
                  update.mutate({ id: c.id, dto: { name: novo } });
              }}
              className="px-1 text-xs text-gray-400 hover:text-gray-600"
            >
              ✎
            </button>
            <button
              onClick={() => {
                if (confirm(`Excluir "${c.name}"?`))
                  del.mutate(c.id, { onError: (e) => alert(apiErrorMessage(e)) });
              }}
              className="px-1 text-xs text-gray-400 hover:text-red-500"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        🍕 marca a categoria como pizza — libera meia a meia (2 sabores),
        cobrada pelo sabor mais caro.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova categoria"
          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() =>
            create.mutate(
              { name },
              { onSuccess: () => setName(''), onError: (e) => alert(apiErrorMessage(e)) },
            )
          }
          disabled={!name}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-fg disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ProductForm({
  editing,
  onDone,
}: {
  editing: Product | null;
  onDone: () => void;
}) {
  const { data: categories } = useCategories();
  const { data: groups } = useModifierGroups();
  const { data: productGroups } = useProductGroups(editing?.id ?? null);
  const setGroups = useSetProductGroups();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  // Grupos ligados ao produto; carrega quando a query resolve.
  const [linked, setLinked] = useState<string[]>([]);
  const loadedGroups = useRef(false);
  useEffect(() => {
    if (productGroups && !loadedGroups.current) {
      loadedGroups.current = true;
      setLinked(productGroups.groupIds);
    }
  }, [productGroups]);

  const [form, setForm] = useState<ProductInput>(
    editing
      ? {
          categoryId: editing.categoryId,
          name: editing.name,
          description: editing.description ?? '',
          price: Number(editing.price),
          active: editing.active,
          imageUrl: editing.imageUrl ?? '',
        }
      : EMPTY,
  );

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const dto: ProductInput = {
      ...form,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
    };
    const opts = {
      // Ao editar, salva também quais complementos o produto usa.
      onSuccess: () => {
        if (editing) {
          setGroups.mutate(
            { productId: editing.id, groupIds: linked },
            { onSuccess: onDone, onError: (e) => alert(apiErrorMessage(e)) },
          );
        } else {
          onDone();
        }
      },
      onError: (e: unknown) => alert(apiErrorMessage(e)),
    };
    if (editing) update.mutate({ id: editing.id, dto }, opts);
    else create.mutate(dto, opts);
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-gray-800">
          {editing ? 'Editar produto' : 'Novo produto'}
        </h2>
        <button onClick={onDone} className="text-sm text-gray-400 hover:underline">
          fechar
        </button>
      </div>
      <input
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        placeholder="Nome *"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <div className="flex gap-2">
        <select
          value={form.categoryId}
          onChange={(e) => set('categoryId', e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Categoria *</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          value={form.price || ''}
          onChange={(e) => set('price', Number(e.target.value.replace(',', '.')) || 0)}
          placeholder="Preço R$"
          inputMode="decimal"
          className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <input
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        placeholder="Descrição (opcional)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <input
        value={form.imageUrl}
        onChange={(e) => set('imageUrl', e.target.value)}
        placeholder="URL da imagem (opcional)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set('active', e.target.checked)}
        />
        Produto ativo (aparece no cardápio)
      </label>

      {/* Complementos: só depois de salvo, porque precisa do id do produto. */}
      {editing ? (
        <div className="border-t border-gray-100 pt-3">
          <div className="mb-1 text-sm font-medium text-gray-700">
            Complementos deste produto
          </div>
          {groups?.length ? (
            <div className="space-y-1">
              {groups.map((g) => (
                <label
                  key={g.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={linked.includes(g.id)}
                    onChange={() =>
                      setLinked((l) =>
                        l.includes(g.id)
                          ? l.filter((x) => x !== g.id)
                          : [...l, g.id],
                      )
                    }
                  />
                  <span className="text-gray-700">{g.name}</span>
                  <span className="text-xs text-gray-400">
                    {g.options.length} opç.
                    {g.required && ' · obrigatório'}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              Nenhum grupo cadastrado ainda — crie no painel Complementos.
            </p>
          )}
        </div>
      ) : (
        <p className="border-t border-gray-100 pt-3 text-xs text-gray-400">
          Salve o produto para poder vincular complementos a ele.
        </p>
      )}
      <button
        onClick={submit}
        disabled={!form.name || !form.categoryId || create.isPending || update.isPending}
        className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
      >
        {editing ? 'Salvar alterações' : 'Criar produto'}
      </button>
    </div>
  );
}

export function ProdutosPage() {
  const { data: products, isLoading } = useAllProducts();
  const { data: categories } = useCategories();
  const update = useUpdateProduct();
  const del = useDeleteProduct();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const catName = useMemo(() => {
    const m = new Map(categories?.map((c) => [c.id, c.name]));
    return (id: string) => m.get(id) ?? '—';
  }, [categories]);

  const list = (products ?? []).filter(
    (p) => selectedCat === null || p.categoryId === selectedCat,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Produtos</h1>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
        >
          + Novo produto
        </button>
      </div>

      {/* Coluna da esquerda mais larga: comporta o cadastro de complementos
          sem espremer os nomes das opções. */}
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <CategoriesPanel selected={selectedCat} onSelect={setSelectedCat} />
          {showForm && (
            <ProductForm
              // Recria o formulário ao trocar de produto, para os
              // complementos carregarem os do produto certo.
              key={editing?.id ?? 'novo'}
              editing={editing}
              onDone={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          )}
          <ModifierGroupsPanel />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          {isLoading ? (
            <p className="p-6 text-sm text-gray-400">Carregando…</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="p-3">Produto</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-right">Preço</th>
                  <th className="p-3 text-center">Ativo</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="p-3 font-medium text-gray-800">{p.name}</td>
                    <td className="p-3 text-gray-500">{catName(p.categoryId)}</td>
                    <td className="p-3 text-right text-gray-700">{brl(p.price)}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() =>
                          update.mutate({ id: p.id, dto: { active: !p.active } })
                        }
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-xs',
                          p.active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {p.active ? 'Sim' : 'Não'}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setEditing(p);
                          setShowForm(true);
                        }}
                        className="mr-2 text-xs text-gray-500 hover:underline"
                      >
                        editar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir "${p.name}"?`))
                            del.mutate(p.id, {
                              onError: (e) => alert(apiErrorMessage(e)),
                            });
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        excluir
                      </button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-400">
                      Nenhum produto nesta categoria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
