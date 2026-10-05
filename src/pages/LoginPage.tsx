import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface DirectoryAccount {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'funcionario';
  status: string;
  portfolio_count: number;
  pending_count: number;
  access_password_hint: string | null;
}

export const LoginPage: React.FC = () => {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [directory, setDirectory] = useState<DirectoryAccount[]>([]);

  // Estado caso a conta ainda aguarde confirmação de e-mail
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [confirmationFeedback, setConfirmationFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/accounts-directory')
      .then((res) => res.json())
      .then((data) => {
        if (data?.accounts) {
          setDirectory(data.accounts);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmationFeedback(null);

    if (!email.trim() || !password) {
      setError('E-mail ou senha incorretos.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requires_email_confirmation) {
          setUnconfirmedEmail(data.email || email.trim());
        }
        setError(data.error || 'E-mail ou senha incorretos.');
        return;
      }

      setSession(data.token, data.user);

      const fromPath = (location.state as any)?.from;
      if (fromPath) {
        navigate(fromPath, { replace: true });
      } else if (data.user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/funcionario', { replace: true });
      }
    } catch {
      setError('Não foi possível conectar ao serviço. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return;
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unconfirmedEmail }),
      });
      const data = await res.json();
      setConfirmationFeedback(data.message || 'Enviamos um link de confirmação para seu e-mail.');
    } catch {
      setError('Não foi possível reenviar o e-mail de confirmação.');
    }
  };

  const handleSimulateEmailConfirmation = async () => {
    if (!unconfirmedEmail) return;
    try {
      const res = await fetch('/api/auth/confirm-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unconfirmedEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setUnconfirmedEmail(null);
        setError(null);
        setConfirmationFeedback(data.message);
      }
    } catch {
      // ignore
    }
  };

  const employeesList = directory.filter((a) => a.role === 'funcionario');
  const adminsList = directory.filter((a) => a.role === 'admin');

  return (
    <div className="max-w-xl mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900">Acesso Individual da Plataforma</h1>
          <p className="text-xs text-slate-600">
            Cada funcionário e administrador possui seu próprio login, senha individual e carteira
            exclusiva de serviços.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <span>{error}</span>
              {unconfirmedEmail && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    className="underline font-semibold text-red-900 hover:text-red-700"
                  >
                    Reenviar e-mail de confirmação
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={handleSimulateEmailConfirmation}
                    className="underline font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Confirmar e-mail agora
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {confirmationFeedback && (
          <div className="flex items-center gap-2 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{confirmationFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
              E-mail de Acesso Individual
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome.sobrenome@nexuscnpj.com.br"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                Senha Individual
              </label>
              <Link
                to="/recuperar-senha"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha individual"
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="toggle-show-password"
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            <label htmlFor="toggle-show-password" className="text-xs text-slate-600 cursor-pointer">
              Mostrar senha
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {loading ? 'Autenticando acesso individual...' : 'Entrar na Minha Conta'}
          </button>
        </form>

        {/* Diretório de Acessos Individuais de Cada Funcionário */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Acessos Individuais dos Funcionários ({employeesList.length})</span>
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                Clique em um funcionário para preencher
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5 text-xs">
              {employeesList.map((emp) => (
                <button
                  key={emp.user_id}
                  type="button"
                  onClick={() => {
                    setEmail(emp.email);
                    setPassword(emp.access_password_hint || '');
                    setError(null);
                  }}
                  className={`text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                    email.toLowerCase() === emp.email.toLowerCase()
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-100'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{emp.full_name}</p>
                    <p className="font-mono text-[11px] text-slate-500 truncate">{emp.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700">
                      <Briefcase className="w-3 h-3" />
                      {emp.portfolio_count} serviço(s)
                    </span>
                    <p className="font-mono text-[11px] text-slate-600">
                      {emp.access_password_hint || 'Senha individual'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <KeyRound className="w-3.5 h-3.5 text-slate-600" />
              <span>Acessos de Administração ({adminsList.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              {adminsList.map((adm) => (
                <button
                  key={adm.user_id}
                  type="button"
                  onClick={() => {
                    setEmail(adm.email);
                    setPassword(adm.access_password_hint || '');
                    setError(null);
                  }}
                  className={`text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                    email.toLowerCase() === adm.email.toLowerCase()
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-100'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{adm.full_name}</p>
                    <p className="font-mono text-[11px] text-slate-500 truncate">{adm.email}</p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-600 shrink-0">
                    {adm.access_password_hint || 'Senha Admin'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 text-center space-y-2">
          <p className="text-xs text-slate-600">Novo funcionário na equipe?</p>
          <Link
            to="/cadastro"
            className="inline-block w-full py-2.5 px-4 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Criar novo acesso de funcionário
          </Link>
        </div>
      </div>
    </div>
  );
};
