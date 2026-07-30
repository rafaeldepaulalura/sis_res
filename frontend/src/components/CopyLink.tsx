import { useState } from 'react';
import clsx from 'clsx';

interface Props {
  url: string;
  compact?: boolean;
}

export function CopyLink({ url, compact = false }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard indisponível (contexto não seguro) — ignora silenciosamente
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (compact) {
    return (
      <button
        onClick={copy}
        title={copied ? 'Copiado!' : 'Copiar link'}
        className={clsx(
          'shrink-0 rounded-full p-0.5 text-xs',
          copied ? 'text-emerald-600' : 'text-gray-300 hover:text-primary',
        )}
      >
        {copied ? '✓' : '🔗'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="w-full truncate rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-500 outline-none"
      />
      <button
        onClick={copy}
        className={clsx(
          'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium',
          copied
            ? 'bg-emerald-100 text-emerald-700'
            : 'border border-gray-300 text-gray-600 hover:border-primary hover:text-primary',
        )}
      >
        {copied ? '✓ copiado' : '🔗 copiar'}
      </button>
    </div>
  );
}
