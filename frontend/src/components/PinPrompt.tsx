import { useState } from 'react';

// Pede o PIN de quem autoriza. O garçom continua logado — o gerente só
// digita e libera, sem trocar de usuário.
export function PinPrompt({
  title,
  description,
  onCancel,
  onConfirm,
  pending,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: (pin: string) => void;
  pending?: boolean;
}) {
  const [pin, setPin] = useState('');
  const valido = pin.trim().length >= 4;

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-2xl bg-white p-5"
      >
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-xs text-gray-500">{description}</p>

        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valido) onConfirm(pin);
          }}
          type="password"
          inputMode="numeric"
          maxLength={8}
          autoFocus
          placeholder="PIN do gerente"
          className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.4em] outline-none focus:border-primary"
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(pin)}
            disabled={!valido || pending}
            className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
          >
            {pending ? 'Conferindo…' : 'Autorizar'}
          </button>
        </div>
      </div>
    </div>
  );
}
