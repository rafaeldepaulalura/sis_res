import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ResellerLayout } from './components/ResellerLayout';
import { PermissionRoute, RoleHome, RoleRoute } from './components/RoleRoute';
import { BalcaoPage } from './pages/BalcaoPage';
import { CashRegisterPage } from './pages/CashRegisterPage';
import { ClientesPage } from './pages/ClientesPage';
import { ComandasPage } from './pages/ComandasPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { KitchenPage } from './pages/KitchenPage';
import { LoginPage } from './pages/LoginPage';
import { MotoboyPage } from './pages/MotoboyPage';
import { ProdutosPage } from './pages/ProdutosPage';
import { PublicMenuPage } from './pages/PublicMenuPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { SemAcessoPage } from './pages/SemAcessoPage';
import { TabPage } from './pages/TabPage';
import { TablesPage } from './pages/TablesPage';
import { MetricsPage } from './pages/admin/MetricsPage';
import { PlansPage } from './pages/admin/PlansPage';
import { ResellersPage } from './pages/admin/ResellersPage';
import { BrandingPage } from './pages/reseller/BrandingPage';
import { EstablishmentsPage } from './pages/reseller/EstablishmentsPage';
import { UsagePage } from './pages/reseller/UsagePage';

const OPERATIONAL = [
  'ADMIN',
  'MANAGER',
  'CASHIER',
  'WAITER',
  'KITCHEN',
  'COURIER',
] as const;

function App() {
  return (
    <Routes>
      {/* Públicos — sem auth nem layout */}
      <Route path="/menu/:slug" element={<PublicMenuPage />} />
      <Route path="/motoboy/:courierId" element={<MotoboyPage />} />

      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        {/* Raiz redireciona para a home do papel */}
        <Route path="/" element={<RoleHome />} />

        {/* Painel Super Admin */}
        <Route element={<RoleRoute roles={['SUPER_ADMIN']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<ResellersPage />} />
            <Route path="/admin/planos" element={<PlansPage />} />
            <Route path="/admin/metricas" element={<MetricsPage />} />
          </Route>
        </Route>

        {/* Painel do Revendedor (white-label) */}
        <Route element={<RoleRoute roles={['RESELLER_ADMIN']} />}>
          <Route element={<ResellerLayout />}>
            <Route path="/revendedor" element={<EstablishmentsPage />} />
            <Route path="/revendedor/uso" element={<UsagePage />} />
            <Route path="/revendedor/branding" element={<BrandingPage />} />
          </Route>
        </Route>

        {/* Aplicação operacional (PDV) — cada página exige a permissão
            correspondente do sub-usuário (o backend valida de novo). */}
        <Route element={<RoleRoute roles={[...OPERATIONAL]} />}>
          <Route element={<AppLayout />}>
            <Route path="/sem-acesso" element={<SemAcessoPage />} />
            <Route element={<PermissionRoute permission="dashboard" />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
            <Route element={<PermissionRoute permission="mesas" />}>
              <Route path="/mesas" element={<TablesPage />} />
            </Route>
            <Route element={<PermissionRoute permission="balcao" />}>
              <Route path="/balcao" element={<BalcaoPage />} />
            </Route>
            {/* A comanda é aberta a partir de Mesas, Balcão ou Comandas. */}
            <Route path="/comanda/:id" element={<TabPage />} />
            <Route element={<PermissionRoute permission="comandas" />}>
              <Route path="/comandas" element={<ComandasPage />} />
            </Route>
            <Route element={<PermissionRoute permission="cozinha" />}>
              <Route path="/cozinha" element={<KitchenPage />} />
            </Route>
            <Route element={<PermissionRoute permission="delivery" />}>
              <Route path="/delivery" element={<DeliveryPage />} />
            </Route>
            <Route element={<PermissionRoute permission="produtos" />}>
              <Route path="/produtos" element={<ProdutosPage />} />
            </Route>
            <Route element={<PermissionRoute permission="clientes" />}>
              <Route path="/clientes" element={<ClientesPage />} />
            </Route>
            <Route element={<PermissionRoute permission="financeiro" />}>
              <Route path="/financeiro" element={<CashRegisterPage />} />
            </Route>
            <Route element={<PermissionRoute permission="relatorios" />}>
              <Route path="/relatorios" element={<RelatoriosPage />} />
            </Route>
            <Route element={<PermissionRoute permission="configuracoes" />}>
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<RoleHome />} />
    </Routes>
  );
}

export default App;
