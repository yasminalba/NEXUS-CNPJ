import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Lock,
  Calendar,
  Shield,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { formatDateTimeBR, formatPhone } from '../utils/cnpj.ts';

export const PerfilPage: React.FC = () => {
  const { user, token, setSession, apiFetch, openSwitchModal } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError('Informe sua senha atual para autenticar a alteração de dados pessoais.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          current_password: currentPassword,
          new_password: newPassword ? newPassword : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao atualizar perfil.');
        return;
      }

      if (token && data.user) {
        setSession(token, data.user);
      }
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('Operação realizada com sucesso. Suas informações pessoais foram atualizadas.');
    } catch {
      setError('Não foi possível conectar ao serviço. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Meu perfil</h1>
          <p className="text-xs text-slate-600 mt-1">
            Visualize os dados da sua conta e atualize suas informações pessoais mediante
            autenticação.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openSwitchModal(user.role === 'admin' ? 'funcionario' : 'admin')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Trocar de Conta / Perfil (Requer Login e Senha)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card de Informações Oficiais da Conta (Somente Leitura para E-mail, Role e Data) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Titular da Conta</p>
            <p className="text-base font-bold text-slate-900">{user.full_name}</p>
            <p className="text-xs font-mono text-slate-600">{user.email}</p>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" /> Tipo de Conta (Role)
              </span>
              <span className="font-mono font-semibold text-slate-900 uppercase">
                {user.role === 'admin' ? 'ADMINISTRADOR' : 'FUNCIONÁRIO'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Data de Cadastro
              </span>
              <span className="font-mono text-slate-800">
                {formatDateTimeBR(user.created_at)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status da Conta</span>
              <span className="font-mono font-semibold text-emerald-700 uppercase">
                {user.status}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            Por segurança, o tipo de perfil (<strong>{user.role}</strong>) é controlado
            exclusivamente pelo banco de dados e não pode ser alterado manualmente pelo próprio
            usuário. Dados oficiais de empresas também não podem ser editados diretamente por esta
            área.
          </div>
        </div>

        {/* Formulário de Edição de Dados Pessoais e Senha */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-900">
            Alterar Informações Pessoais e Senha
          </h2>

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                E-mail (Identificador da Conta)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono bg-slate-100 text-slate-500 border border-slate-200 rounded-lg cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nova Senha (Opcional)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Deixe em branco para manter"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Senha Atual (Obrigatória para salvar) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Confirme sua senha atual"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {loading ? 'Salvando alterações...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
