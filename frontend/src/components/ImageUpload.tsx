import { useRef, useState } from 'react';
import clsx from 'clsx';
import { api, apiErrorMessage } from '../lib/api';
import { imagemSrc, reduzirImagem } from '../lib/imagem';

interface Props {
  // Caminho salvo hoje ("/uploads/<id>") ou URL antiga colada à mão.
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  hint?: string;
  // Logo fica redonda/quadrada pequena; foto de produto, retangular.
  shape?: 'square' | 'wide';
}

export function ImageUpload({
  value,
  onChange,
  label,
  hint,
  shape = 'square',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const enviar = async (file: File) => {
    setErro('');
    setEnviando(true);
    try {
      const blob = await reduzirImagem(file);
      const form = new FormData();
      form.append('file', blob, file.name);
      const { data } = await api.post<{ url: string }>('/uploads', form);
      onChange(data.url);
    } catch (e) {
      setErro(apiErrorMessage(e, 'Não foi possível enviar a imagem'));
    } finally {
      setEnviando(false);
      // Permite escolher o mesmo arquivo de novo depois de remover.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const src = imagemSrc(value);

  return (
    <div>
      <div className="mb-1 text-sm font-medium text-gray-700">{label}</div>

      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50',
            shape === 'wide' ? 'h-20 w-28' : 'h-20 w-20',
          )}
        >
          {src ? (
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl text-gray-300">🖼️</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {enviando
              ? 'Enviando…'
              : src
                ? 'Trocar imagem'
                : 'Escolher imagem'}
          </button>
          {src && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setErro('');
              }}
              disabled={enviando}
              className="text-left text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void enviar(file);
        }}
      />

      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
      {!erro && hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
