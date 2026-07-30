import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useLogin } from '../hooks/useAuth';
import { apiErrorMessage } from '../lib/api';
import { homeForRole } from '../lib/roleHome';
import { useAuthStore } from '../stores/authStore';

export function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const login = useLogin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@restaurante.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    login.mutate(
      { email, password },
      {
        onSuccess: (data) =>
          navigate(homeForRole(data.user.role), { replace: true }),
        onError: (err) =>
          setError(apiErrorMessage(err, 'Não foi possível entrar')),
      },
    );
  };

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl text-primary-fg">
            🍽️
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            Restaurante SaaS
          </h1>
          <p className="text-sm text-gray-500">Acesse sua conta</p>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          required
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Senha
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          required
        />

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-fg transition hover:opacity-90 disabled:opacity-60"
        >
          {login.isPending ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="mt-4 text-center text-xs text-gray-400">
          Dados de teste (seed): admin@restaurante.local / admin123
        </p>
      </form>
    </div>
  );
}
