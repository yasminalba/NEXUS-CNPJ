import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  Edit3,
  Power,
  CheckCircle2,
  AlertCircle,
  X,
  LogIn,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { ConfirmPasswordModal } from '../../components/ConfirmPasswordModal.tsx';
import { formatDateTimeBR, formatPhone } from '../../utils/cnpj.ts';
import type { UserProfile, UserRole, UserStatus } from '../../types/index.ts';

export const AdminUsuariosPage: React.FC = () => {
  const { apiFetch, openSwitchModal, user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Modal de Cadastro de Novo Funcionário / Usuário
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('funcionario');

  // Modal de Edição de Usuário
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('funcionario');
  const [editStatus, setEditStatus] = useState<UserStatus>('ativo');
  const [editNewPassword, setEditNewPassword] = useState('');

  // Confirmação extra de senha para ações administrativas sensíveis (Seção 32)
  const [pendingAction, setPendingAction] = useState<{
    description: string;
    execute: (adminPassword: string) => Promise<void>;
  } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Preparar criação de usuário (pede senha do admin)
  const handlePrepareCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setPendingAction({
      description: `Confirmar cadastro do usuário "${newFullName}" (${newEmail}) com perfil ${newRole.toUpperCase()}.`,
      execute: async (adminPassword: string) => {
        const res = await apiFetch('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            full_name: newFullName.trim(),
            email: newEmail.trim(),
            phone: newPhone.trim(),
            password: newPassword,
            role: newRole,
            admin_password: adminPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Falha ao cadastrar usuário.');
        }
        setIsCreateOpen(false);
        setNewFullName('');
        setNewEmail('');
        setNewPhone('');
        setNewPassword('');
        setNewRole('funcionario');
        setFeedback({ type: 'success', message: 'Operação realizada com sucesso. Usuário cadastrado.' });
        await loadUsers();
      },
    });
  };

  // Preparar edição de usuário / alteração de permissões / redefinição de senha individual (pede senha do admin)
  const handlePrepareEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFeedback(null);
    setPendingAction({
      description: `Confirmar atualização cadastral, credenciais e permissões para "${editingUser.full_name}" (Perfil: ${editRole.toUpperCase()}, Status: ${editStatus}${editNewPassword.trim() ? ', Nova Senha Individual definida' : ''}).`,
      execute: async (adminPassword: string) => {
        const res = await apiFetch(`/api/admin/users/${editingUser.user_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            full_name: editFullName.trim(),
            phone: editPhone.trim(),
            role: editRole,
            status: editStatus,
            new_password: editNewPassword.trim() || undefined,
            admin_password: adminPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Falha ao atualizar usuário.');
        }
        setEditingUser(null);
        setEditNewPassword('');
        setFeedback({
          type: 'success',
          message: 'Operação realizada com sucesso. Credenciais e permissões atualizadas.',
        });
        await loadUsers();
      },
    });
  };

  // Atalho rápido para promover/remover admin ou ativar/desativar com confirmação de senha
  const handleQuickRoleToggle = (target: UserProfile) => {
    const nextRole: UserRole = target.role === 'admin' ? 'funcionario' : 'admin';
    setFeedback(null);
    setPendingAction({
      description:
        nextRole === 'admin'
          ? `Promover o funcionário "${target.full_name}" (${target.email}) para ADMINISTRADOR.`
          : `Remover privilégios de Administrador de "${target.full_name}" (${target.email}), alterando para FUNCIONÁRIO.`,
      execute: async (adminPassword: string) => {
        const res = await apiFetch(`/api/admin/users/${target.user_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            role: nextRole,
            admin_password: adminPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Não foi possível alterar a permissão.');
        }
        setFeedback({
          type: 'success',
          message: `Função de ${target.full_name} alterada para ${nextRole.toUpperCase()} e registrada no log de auditoria.`,
        });
        await loadUsers();
      },
    });
  };

  const handleQuickStatusToggle = (target: UserProfile) => {
    const nextStatus: UserStatus = target.status === 'ativo' ? 'inativo' : 'ativo';
    setFeedback(null);
    setPendingAction({
      description: `${
        nextStatus === 'inativo' ? 'Desativar' : 'Ativar'
      } o acesso do usuário "${target.full_name}" (${target.email}).`,
      execute: async (adminPassword: string) => {
        const res = await apiFetch(`/api/admin/users/${target.user_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            status: nextStatus,
            admin_password: adminPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Não foi possível alterar o status do usuário.');
        }
        setFeedback({
          type: 'success',
          message: `Status de ${target.full_name} atualizado para ${nextStatus.toUpperCase()}.`,
        });
        await loadUsers();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Gerenciamento de Usuários e Permissões
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Cadastre funcionários, gerencie permissões de acesso e promova administradores com
            confirmação de identidade auditada.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Funcionário</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-lg border text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Barra de Pesquisa de Usuários */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome, e-mail, telefone ou perfil..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Carregando...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Nenhum resultado encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="py-3 px-4">Nome Completo</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">Perfil (Role)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Cadastro</th>
                  <th className="py-3 px-4 text-right">Ações Administrativas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{u.full_name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{u.email}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{u.phone}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold whitespace-nowrap">
                      <span
                        className={
                          u.role === 'admin' ? 'text-blue-700' : 'text-slate-700'
                        }
                      >
                        {u.role === 'admin' ? 'ADMINISTRADOR' : 'FUNCIONÁRIO'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                      <span
                        className={
                          u.status === 'ativo'
                            ? 'text-emerald-700 font-semibold'
                            : u.status === 'inativo'
                            ? 'text-red-700 font-semibold'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTimeBR(u.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                      {currentUser?.user_id !== u.user_id && u.status === 'ativo' && (
                        <button
                          type="button"
                          onClick={() => openSwitchModal(u.role, u.email)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg"
                          title={`Entrar com o acesso individual de ${u.full_name}`}
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Acessar Conta</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingUser(u);
                          setEditFullName(u.full_name);
                          setEditPhone(u.phone);
                          setEditRole(u.role);
                          setEditStatus(u.status);
                          setEditNewPassword('');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar / Senha</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickRoleToggle(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                      >
                        <Shield className="w-3 h-3" />
                        <span>
                          {u.role === 'admin' ? 'Remover Admin' : 'Promover a Admin'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickStatusToggle(u)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg ${
                          u.status === 'ativo'
                            ? 'text-red-700 bg-red-50 hover:bg-red-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{u.status === 'ativo' ? 'Desativar' : 'Ativar'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro de Funcionário */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Cadastrar Novo Usuário</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePrepareCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Nome do funcionário"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="funcionario@empresa.com.br"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha Inicial (Mín. 8 caracteres) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Defina a senha inicial"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Perfil de Acesso (Role)
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="funcionario">Funcionário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Continuar e Confirmar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Usuário */}
      {editingUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Editar Usuário: {editingUser.full_name}
              </h2>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePrepareEditUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Função / Perfil (Role)
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="funcionario">Funcionário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status da Conta
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo (Bloqueado)</option>
                  <option value="pendente_confirmacao">Pendente de Confirmação</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  <span>Redefinir Senha Individual de Acesso (Opcional)</span>
                </label>
                <input
                  type="password"
                  minLength={8}
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  placeholder="Deixe em branco para manter a senha atual"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Caso preenchida (mínimo 8 caracteres), atualizará a senha exclusiva de login deste
                  funcionário.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Salvar com Confirmação de Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Obrigatório de Confirmação de Senha para Ações Sensíveis */}
      <ConfirmPasswordModal
        isOpen={Boolean(pendingAction)}
        description={pendingAction?.description || ''}
        onClose={() => setPendingAction(null)}
        onConfirm={async (pwd) => {
          if (pendingAction) {
            await pendingAction.execute(pwd);
          }
        }}
      />
    </div>
  );
};
