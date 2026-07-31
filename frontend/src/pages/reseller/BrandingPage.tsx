import { useEffect, useState } from 'react';
import { ImageUpload } from '../../components/ImageUpload';
import { useBranding, useUpdateBranding } from '../../hooks/useResellerPanel';
import { apiErrorMessage } from '../../lib/api';
import { applyPrimaryColor } from '../../lib/theme';

export function BrandingPage() {
  const { data } = useBranding();
  const update = useUpdateBranding();
  const [form, setForm] = useState({
    name: '',
    tradeName: '',
    primaryColor: '#dc2626',
    logoUrl: '',
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? '',
        tradeName: data.tradeName ?? '',
        primaryColor: data.primaryColor ?? '#dc2626',
        logoUrl: data.logoUrl ?? '',
      });
    }
  }, [data]);

  const save = () => {
    update.mutate(
      {
        name: form.name,
        tradeName: form.tradeName || undefined,
        primaryColor: form.primaryColor,
        // Vai sempre, inclusive vazio: é assim que "Remover" apaga a logo
        // (com `|| undefined` o campo sumia e nada mudava).
        logoUrl: form.logoUrl ?? '',
      },
      {
        onSuccess: (b) => applyPrimaryColor(b.primaryColor),
        onError: (e) => alert(apiErrorMessage(e)),
      },
    );
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Branding (white-label)</h1>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nome fantasia</label>
          <input
            value={form.tradeName}
            onChange={(e) => setForm((f) => ({ ...f, tradeName: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Cor primária</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => {
                setForm((f) => ({ ...f, primaryColor: e.target.value }));
                applyPrimaryColor(e.target.value);
              }}
              className="h-10 w-16 rounded border border-gray-300"
            />
            <span className="text-sm text-gray-500">{form.primaryColor}</span>
          </div>
        </div>
        <ImageUpload
          label="Logo"
          hint="Aparece no painel dos seus clientes."
          value={form.logoUrl || null}
          onChange={(url) => setForm((f) => ({ ...f, logoUrl: url ?? '' }))}
        />

        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Prévia</div>
          <button className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg">
            Botão com a cor primária
          </button>
        </div>

        <button
          onClick={save}
          disabled={update.isPending}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
        >
          Salvar branding
        </button>
      </div>
    </div>
  );
}
