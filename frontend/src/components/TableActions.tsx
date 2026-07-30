import { useState } from 'react';
import { useMergeTab, useTransferTab } from '../hooks/useTables';
import { apiErrorMessage } from '../lib/api';
import type { TableMap } from '../types/api';

type Modo = 'transferir' | 'juntar';

// Mover a comanda para outra mesa, ou juntar duas mesas numa conta só.
export function TableActions({
  origem,
  tables,
  onClose,
}: {
  origem: TableMap;
  tables: TableMap[];
  onClose: () => void;
}) {
  const [modo, setModo] = useState<Modo>('transferir');
  const transfer = useTransferTab();
  const merge = useMergeTab();

  // Transferir vai para mesa livre; juntar vai para mesa que já tem conta.
  const destinos = tables.filter((t) =>
    t.id === origem.id
      ? false
      : modo === 'transferir'
        ? t.status === 'FREE'
        : !!t.openTab,
  );

  const executar = (destino: TableMap) => {
    const vars = { fromTableId: origem.id, toTableId: destino.id };
    const opts = {
      onSuccess: onClose,
      onError: (e: unknown) => alert(apiErrorMessage(e)),
    };
    if (modo === 'transferir') transfer.mutate(vars, opts);
    else merge.mutate(vars, opts);
  };

  const pending = transfer.isPending || merge.isPending;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-t-2xl bg-white sm:rounded-2xl"
      >
        <div className="flex items-start justify-between border-b border-gray-100 p-4">
          <div>
            <h2 className="font-semibold text-gray-900">
              Mesa {origem.number}
            </h2>
            <p className="text-xs text-gray-500">
              {origem.openTab
                ? `Conta aberta desde ${new Date(origem.openTab.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Sem conta aberta'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none text-gray-400 hover:text-gray-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 border-b border-gray-100 p-3">
          {(['transferir', 'juntar'] as Modo[]).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={
                modo === m
                  ? 'flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg'
                  : 'flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600'
              }
            >
              {m === 'transferir' ? 'Mudar de mesa' : 'Juntar mesas'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-4">
          <p className="mb-3 text-xs text-gray-500">
            {modo === 'transferir'
              ? 'Escolha a mesa livre para onde a conta vai. A mesa atual fica livre.'
              : 'Escolha a mesa que vai ficar com a conta. Os itens desta mesa passam para lá e esta fica livre.'}
          </p>

          <div className="space-y-1.5">
            {destinos.map((t) => (
              <button
                key={t.id}
                onClick={() => executar(t)}
                disabled={pending}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:border-primary hover:bg-primary/5 disabled:opacity-50"
              >
                <span className="text-sm font-medium text-gray-800">
                  Mesa {t.number}
                </span>
                <span className="text-xs text-gray-500">
                  {t.openTab ? 'conta aberta' : 'livre'}
                </span>
              </button>
            ))}
            {destinos.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">
                {modo === 'transferir'
                  ? 'Nenhuma mesa livre no momento.'
                  : 'Nenhuma outra mesa com conta aberta.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
