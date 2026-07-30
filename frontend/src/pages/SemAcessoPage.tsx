import { useAuthStore } from '../stores/authStore';

// Usuário ativo mas sem nenhuma permissão liberada — evita tela em branco.
export function SemAcessoPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <div className="mb-4 text-5xl">🔒</div>
      <h1 className="text-lg font-semibold text-gray-900">
        Nenhum acesso liberado
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Olá, {user?.name}. Seu usuário ainda não tem nenhuma tela liberada.
        Peça ao responsável pelo restaurante para liberar seus acessos em
        Configurações → Equipe.
      </p>
      <button
        onClick={logout}
        className="mt-6 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        Sair
      </button>
    </div>
  );
}
