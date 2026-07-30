import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface SalesReport {
  range: { from: string; to: string };
  summary: {
    orders: number;
    total: string;
    discount: string;
    averageTicket: string;
  };
  byDay: { date: string; total: string; orders: number }[];
  byPaymentMethod: { method: string; total: string; count: number }[];
  byProduct: { name: string; quantity: number; total: string }[];
}

export function useSalesReport(from: string, to: string) {
  return useQuery({
    queryKey: ['sales-report', from, to],
    queryFn: async () =>
      (
        await api.get<SalesReport>('/reports/sales', {
          params: { from, to },
        })
      ).data,
  });
}

export interface WaitersReport {
  waiters: { name: string; orders: number; total: string }[];
}

export function useWaitersReport(from: string, to: string) {
  return useQuery({
    queryKey: ['waiters-report', from, to],
    queryFn: async () =>
      (
        await api.get<WaitersReport>('/reports/waiters', {
          params: { from, to },
        })
      ).data,
  });
}

export interface TabsReportRow {
  id: string;
  label: string;
  status: 'OPEN' | 'AWAITING_PAYMENT' | 'CLOSED' | 'CANCELLED';
  // Quando preenchido, a conta foi juntada nesta — não é venda separada.
  mergedInto: string | null;
  isDelivery: boolean;
  waiterName: string | null;
  courierName: string | null;
  itemCount: number;
  total: string;
  openedAt: string;
  closedAt: string | null;
}

export function useTabsReport(date: string) {
  return useQuery({
    queryKey: ['tabs-report', date],
    queryFn: async () =>
      (
        await api.get<TabsReportRow[]>('/reports/tabs', { params: { date } })
      ).data,
  });
}
