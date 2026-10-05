import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  X,
  AlertCircle,
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

export const SwitchAccountModal: React.FC = () => {
  const {
    isSwitchModalOpen,
    switchModalTargetRole,
    switchModalPrefillEmail,
    closeSwitchModal,
    setSession,
    apiFetch,
    user,
  } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [directory, setDirectory] = useState<DirectoryAccount[]>([]);

  useEffect(() => {
    if (!isSwitchModalOpen) return;
    setError(null);
    fetch('/api/auth/accounts-directory')
      .then((res) => res.json())
      .then((data) => {
        const list: DirectoryAccount[] = data.accounts || [];
        setDirectory(list);
        if (switchModalPrefillEmail) {
          setEmail(switchModalPrefillEmail);
          const matched = list.find(
            (a) => a.email.toLowerCase() === switchModalPrefillEmail.toLowerCase()
          );
          setPassword(matched?.access_password_hint || '');
        }
      })
      .catch(() => {});
  }, [isSwitchModalOpen, switchModalPrefillEmail]);

  if (!isSwitchModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Informe o e-mail e a senha individual da conta para autenticar.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/auth/switch-account', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'E-mail ou senha incorretos.');
        return;
      }

      setSession(data.token, data.user);
      setEmail('');
      setPassword('');
      closeSwitchModal();

      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/funcionario');
      }
    } catch {
      setError('Não foi possível conectar ao serviço. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAccount = (acc: DirectoryAccount) => {
    setEmail(acc.email);
    setPassword(acc.access_password_hint || '');
    setError(null);
  };

  const employeesList = directory.filter((a) => a.role === 'funcionario');
  const adminsList = directory.filter((a) => a.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <h2 className="text-base font-semibold text-slate-900">
              Alternar Acesso Individual de Funcionário / Conta
            </h2>
          </div>
          <button
            type="button"
            onClick={closeSwitchModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Cada funcionário possui seu próprio login, senha individual e carteira exclusiva.
            Selecione um funcionário abaixo ou digite as credenciais da conta desejada{' '}
            {switchModalTargetRole && (
              <span className="font-semibold text-slate-900">
                (Perfil sugerido:{' '}
                {switchModalTargetRole === 'admin' ? 'Administrador' : 'Funcionário'})
              </span>
            )}
            .
          </p>

          {user && (
            <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
              <span>
                Acesso atual: <strong className="text-slate-900">{user.full_name}</strong> (
                <span className="font-mono">{user.email}</span>)
              </span>
              <span className="font-mono text-slate-700 uppercase font-semibold">{user.role}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                E-mail de Login do Funcionário
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="funcionario@nexuscnpj.com.br"
                  className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Senha Individual
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha individual"
                  className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Acessos Individuais de cada Funcionário e Administradores */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3 max-h-64 overflow-y-auto">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  Acessos Individuais dos Funcionários ({employeesList.length})
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  Clique para preencher credenciais
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                {employeesList.map((emp) => {
                  const isCurrent = user?.user_id === emp.user_id;
                  const isSelected = email.toLowerCase() === emp.email.toLowerCase();
                  return (
                    <button
                      key={emp.user_id}
                      type="button"
                      onClick={() => handleSelectAccount(emp)}
                      className={`text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60'
                          : 'border-slate-200 bg-white hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate">
                            {emp.full_name}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-100 text-emerald-800 rounded">
                              Logado
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-slate-500 truncate">{emp.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700">
                          <Briefcase className="w-3 h-3" />
                          {emp.portfolio_count} na carteira
                        </span>
                        <p className="font-mono text-[11px] text-slate-500">
                          {emp.access_password_hint
                            ? `Senha: ${emp.access_password_hint}`
                            : 'Senha individual ativa'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                <span>Contas de Administração ({adminsList.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                {adminsList.map((adm) => {
                  const isCurrent = user?.user_id === adm.user_id;
                  const isSelected = email.toLowerCase() === adm.email.toLowerCase();
                  return (
                    <button
                      key={adm.user_id}
                      type="button"
                      onClick={() => handleSelectAccount(adm)}
                      className={`text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60'
                          : 'border-slate-200 bg-white hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate">
                            {adm.full_name}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-100 text-emerald-800 rounded">
                              Logado
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-slate-500 truncate">{adm.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-semibold text-slate-700">ADMIN</span>
                        <p className="font-mono text-[11px] text-slate-500">
                          {adm.access_password_hint
                            ? `Senha: ${adm.access_password_hint}`
                            : 'Senha individual ativa'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeSwitchModal}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              {submitting ? 'Autenticando acesso...' : 'Entrar no Acesso Selecionado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
