import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Printer {
  id: string;
  name: string;
  host: string;
  port: number;
  columns: number;
  copies: number;
  active: boolean;
}

export interface PrintJob {
  id: string;
  title: string;
  kind: 'KITCHEN' | 'TEST';
  status: 'PENDING' | 'PRINTING' | 'DONE' | 'FAILED';
  attempts: number;
  lastError: string | null;
  createdAt: string;
  printer: { name: string };
}

const printersKey = ['printers'];
const jobsKey = ['print-jobs'];

export function usePrinters() {
  return useQuery({
    queryKey: printersKey,
    queryFn: async () => (await api.get<Printer[]>('/printers')).data,
  });
}

export function usePrintJobs() {
  return useQuery({
    queryKey: jobsKey,
    queryFn: async () =>
      (await api.get<PrintJob[]>('/printers/jobs/list')).data,
    // A fila anda sozinha; atualiza para o operador ver o que travou.
    refetchInterval: 15_000,
  });
}

function usePrinterMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: printersKey });
      qc.invalidateQueries({ queryKey: jobsKey });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export interface PrinterInput {
  name: string;
  host: string;
  port?: number;
  columns?: number;
  copies?: number;
}

export function useCreatePrinter() {
  return usePrinterMutation((dto: PrinterInput) =>
    api.post('/printers', dto).then((r) => r.data),
  );
}

export function useUpdatePrinter() {
  return usePrinterMutation(
    (vars: { id: string; dto: Partial<PrinterInput> & { active?: boolean } }) =>
      api.patch(`/printers/${vars.id}`, vars.dto).then((r) => r.data),
  );
}

export function useDeletePrinter() {
  return usePrinterMutation((id: string) =>
    api.delete(`/printers/${id}`).then((r) => r.data),
  );
}

export function useTestPrinter() {
  return usePrinterMutation((id: string) =>
    api.post(`/printers/${id}/test`).then((r) => r.data),
  );
}

export function useRetryJob() {
  return usePrinterMutation((id: string) =>
    api.post(`/printers/jobs/${id}/retry`).then((r) => r.data),
  );
}
