import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface DashboardPoint {
  hour: string;
  total: string;
  orders: number;
}

export interface DashboardDay {
  date: string;
  weekday: string;
  total: string;
  orders: number;
}

export interface Dashboard {
  now: string;
  // false para quem não tem permissão de relatórios: some todo o dinheiro.
  showsRevenue: boolean;
  summary: {
    salesToday: string;
    salesTodayChange: number | null;
    salesWeek: string;
    salesWeekChange: number | null;
    ordersToday: number;
    ordersTodayChange: number | null;
    averageTicket: string;
    averageTicketChange: number | null;
  } | null;
  salesByHour: DashboardPoint[];
  salesByDay: DashboardDay[];
  operational: {
    tablesTotal: number;
    tablesOccupied: number;
    tablesFree: number;
    kitchenTabs: number;
    kitchenItems: number;
    activeDeliveries: number;
  };
  paymentMethods: { method: string; total: string; percent: number }[];
  recentOrders: {
    id: string;
    tabId: string;
    label: string;
    kind: string;
    customerName: string | null;
    total: string | null;
    at: string;
  }[];
  alerts: { lateKitchenTabs: number; lateMinutes: number };
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<Dashboard>('/dashboard')).data,
    // A tela fica aberta o dia todo no balcão; atualiza sozinha.
    refetchInterval: 60_000,
  });
}
