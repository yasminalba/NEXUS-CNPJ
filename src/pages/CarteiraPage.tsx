import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  UserPlus,
  ArrowLeftRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  UserCheck,
  X,
  Plus,
  ExternalLink,
  History,
  KeyRound,
  LogIn,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { formatCnpj, formatDateTimeBR, formatPhone, validateCnpj } from '../utils/cnpj.ts';
import type {
  ServiceAssignmentRecord,
  ServicePriority,
  ServiceStatus,
  UserProfile,
} from '../types/index.ts';

const SERVICE_TYPES = [
  'Atualização Cadastral',
  'Validação de Contato Comercial',
  'Análise de Conformidade CNAE',
  'Visita Técnica / Geolocalização',
  'Prospecção / Atendimento Corporativo',
  'Revisão Documental',
];

export const CarteiraPage: React.FC = () => {
  const { user, apiFetch, openSwitchModal } = useAuth();

  const [assignments, setAssignments] = useState<ServiceAssignmentRecord[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros da Carteira
  const [viewTab, setViewTab] = useState<'mine' | 'delegated' | 'team' | 'employees'>('mine');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [employeeFilter, setEmployeeFilter] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  // Feedback global
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Modal de Atribuir / Transferir Serviço para outro Funcionário
  const [transferTargetItem, setTransferTargetItem] = useState<ServiceAssignmentRecord | null>(
    null
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [transferPriority, setTransferPriority] = useState<ServicePriority>('Média');
  const [transferNote, setTransferNote] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // Modal de Novo Serviço na Carteira
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newCnpj, setNewCnpj] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newServiceType, setNewServiceType] = useState(SERVICE_TYPES[0]);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<ServicePriority>('Média');
  const [newAssignedToId, setNewAssignedToId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newModalError, setNewModalError] = useState<string | null>(null);
  const [newSubmitting, setNewSubmitting] = useState(false);

  // Modal de Criar Acesso Individual para Novo Funcionário
  const [isNewEmpModalOpen, setIsNewEmpModalOpen] = useState(false);
  const [empFullName, setEmpFullName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [showEmpPassword, setShowEmpPassword] = useState(false);
  const [empModalError, setEmpModalError] = useState<string | null>(null);
  const [empSubmitting, setEmpSubmitting] = useState(false);

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/portfolio');
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
        setEmployees(data.employees || []);
      }
    } catch {
      // ignora erro de rede inicial
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  // Métricas rápidas da carteira do funcionário logado
  const metrics = useMemo(() => {
    const myId = user?.user_id || '';
    const mine = assignments.filter((a) => a.assigned_to_id === myId);
    const delegatedByMe = assignments.filter(
      (a) => a.assigned_by_id === myId && a.assigned_to_id !== myId
    );
    const inProgress = mine.filter((a) => a.status !== 'Concluído');
    const completed = mine.filter((a) => a.status === 'Concluído');
    return {
      mineCount: mine.length,
      inProgressCount: inProgress.length,
      delegatedCount: delegatedByMe.length,
      completedCount: completed.length,
    };
  }, [assignments, user]);

  const filteredAssignments = useMemo(() => {
    const myId = user?.user_id || '';
    const q = searchQuery.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');

    return assignments.filter((item) => {
      if (viewTab === 'mine' && item.assigned_to_id !== myId) return false;
      if (
        viewTab === 'delegated' &&
        !(item.assigned_by_id === myId && item.assigned_to_id !== myId)
      ) {
        return false;
      }

      if (statusFilter !== 'TODOS' && item.status !== statusFilter) return false;
      if (employeeFilter !== 'TODOS' && item.assigned_to_id !== employeeFilter) return false;

      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.company_name.toLowerCase().includes(q) ||
        item.service_type.toLowerCase().includes(q) ||
        item.assigned_to_name.toLowerCase().includes(q) ||
        item.cnpj.includes(q) ||
        (qDigits.length > 0 && item.cnpj.includes(qDigits))
      );
    });
  }, [assignments, user, viewTab, statusFilter, employeeFilter, searchQuery]);

  const handleOpenTransferModal = (item: ServiceAssignmentRecord) => {
    setFeedback(null);
    setTransferTargetItem(item);
    const otherEmp = employees.find((e) => e.user_id !== item.assigned_to_id);
    setSelectedEmployeeId(otherEmp ? otherEmp.user_id : item.assigned_to_id);
    setTransferPriority(item.priority);
    setTransferNote('');
  };

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetItem || !selectedEmployeeId) return;

    setTransferSubmitting(true);
    setFeedback(null);
    try {
      const res = await apiFetch(`/api/portfolio/${transferTargetItem.id}/assign`, {
        method: 'PUT',
        body: JSON.stringify({
          target_user_id: selectedEmployeeId,
          priority: transferPriority,
          note: transferNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Erro ao atribuir serviço.' });
      } else {
        setFeedback({
          type: 'success',
          message: data.message || 'Serviço atribuído para o funcionário com sucesso.',
        });
        setTransferTargetItem(null);
        await loadPortfolio();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Falha de conexão ao atribuir o serviço.' });
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleStatusChange = async (item: ServiceAssignmentRecord, newStatus: ServiceStatus) => {
    setFeedback(null);
    try {
      const res = await apiFetch(`/api/portfolio/${item.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message });
        await loadPortfolio();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao atualizar status.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao atualizar status do serviço.' });
    }
  };

  const handleOpenNewModal = (preselectedEmployeeId?: string) => {
    setNewModalError(null);
    setNewCnpj('');
    setNewCompanyName('');
    setNewServiceType(SERVICE_TYPES[0]);
    setNewTitle('');
    setNewDescription('');
    setNewPriority('Média');
    setNewAssignedToId(preselectedEmployeeId || user?.user_id || employees[0]?.user_id || '');
    setNewDueDate('');
    setIsNewModalOpen(true);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewModalError(null);

    const check = validateCnpj(newCnpj);
    if (!check.valid) {
      setNewModalError(check.error || 'Informe um CNPJ válido de 14 dígitos.');
      return;
    }

    if (!newTitle.trim() || newTitle.trim().length < 3) {
      setNewModalError('Informe um título descritivo para o serviço.');
      return;
    }

    setNewSubmitting(true);
    try {
      const res = await apiFetch('/api/portfolio', {
        method: 'POST',
        body: JSON.stringify({
          cnpj: check.cleaned,
          company_name: newCompanyName.trim(),
          service_type: newServiceType,
          title: newTitle.trim(),
          description: newDescription.trim(),
          priority: newPriority,
          assigned_to_id: newAssignedToId || user?.user_id,
          due_date: newDueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewModalError(data.error || 'Não foi possível criar o serviço.');
        return;
      }

      setIsNewModalOpen(false);
      setFeedback({
        type: 'success',
        message: data.message || 'Serviço adicionado e atribuído na carteira!',
      });
      await loadPortfolio();
    } catch {
      setNewModalError('Erro de conexão ao salvar serviço na carteira.');
    } finally {
      setNewSubmitting(false);
    }
  };

  const handleCreateEmployeeAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpModalError(null);

    if (!empFullName.trim() || empFullName.trim().length < 3) {
      setEmpModalError('Informe o nome completo do funcionário.');
      return;
    }
    if (!empEmail.trim() || !empEmail.includes('@')) {
      setEmpModalError('Informe um e-mail válido para o login individual do funcionário.');
      return;
    }
    if (empPassword.length < 8) {
      setEmpModalError('A senha individual de acesso deve ter pelo menos 8 caracteres.');
      return;
    }

    setEmpSubmitting(true);
    try {
      const res = await apiFetch('/api/portfolio/employees', {
        method: 'POST',
        body: JSON.stringify({
          full_name: empFullName.trim(),
          email: empEmail.trim(),
          phone: empPhone.trim(),
          password: empPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmpModalError(data.error || 'Não foi possível criar o acesso do funcionário.');
        return;
      }

      setIsNewEmpModalOpen(false);
      setEmpFullName('');
      setEmpEmail('');
      setEmpPhone('');
      setEmpPassword('');
      setFeedback({
        type: 'success',
        message: data.message || 'Acesso individual criado para o funcionário com sucesso!',
      });
      await loadPortfolio();
      setViewTab('employees');
    } catch {
      setEmpModalError('Erro de conexão ao cadastrar acesso do funcionário.');
    } finally {
      setEmpSubmitting(false);
    }
  };

  const getPriorityStyle = (priority: ServicePriority) => {
    if (priority === 'Urgente') return 'text-red-700 bg-red-50 border-red-200';
    if (priority === 'Alta') return 'text-amber-700 bg-amber-50 border-amber-200';
    if (priority === 'Média') return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-slate-600 bg-slate-100 border-slate-200';
  };

  const getStatusDot = (status: ServiceStatus) => {
    if (status === 'Concluído') return 'bg-emerald-600 text-emerald-700';
    if (status === 'Em andamento') return 'bg-blue-600 text-blue-700';
    return 'bg-amber-500 text-amber-700';
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Banner de Identificação do Acesso Individual Ativo */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
              <KeyRound className="w-3.5 h-3.5" />
              Acesso Individual Conectado
            </span>
            <span>·</span>
            <span className="font-mono text-slate-700">{user?.email}</span>
            <span>·</span>
            <span className="font-mono uppercase text-slate-600">
              Perfil: {user?.role === 'admin' ? 'Administrador' : 'Funcionário'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Carteira de Serviços — {user?.full_name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Visualize os serviços da sua carteira exclusiva, atribua demandas para outros
            funcionários ou alterne entre os acessos individuais da equipe.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => openSwitchModal('funcionario')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Trocar Acesso de Funcionário</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEmpModalError(null);
              setIsNewEmpModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>Criar Acesso de Funcionário</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenNewModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Serviço / Atribuir</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo da Carteira Individual do Funcionário Logado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Na Minha Carteira Individual</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{metrics.mineCount}</p>
          <p className="text-xs text-slate-500 mt-1">Atribuídos ao seu acesso ({user?.email})</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Pendentes / Em Andamento</p>
          <p className="text-2xl font-bold font-mono text-blue-600 mt-1">
            {metrics.inProgressCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Aguardando sua execução direta</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Atribuídos a Outros Funcionários</p>
          <p className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {metrics.delegatedCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Serviços que você encaminhou na equipe</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Concluídos no Meu Acesso</p>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {metrics.completedCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Atendimentos finalizados por você</p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline ml-4"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Barra de Abas e Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setViewTab('mine');
                setEmployeeFilter('TODOS');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                viewTab === 'mine'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Minha Carteira ({metrics.mineCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewTab('delegated');
                setEmployeeFilter('TODOS');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                viewTab === 'delegated'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Atribuídos por Mim ({metrics.delegatedCount})
            </button>
            <button
              type="button"
              onClick={() => setViewTab('team')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                viewTab === 'team'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Carteira Geral da Equipe ({assignments.length})
            </button>
            <button
              type="button"
              onClick={() => setViewTab('employees')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                viewTab === 'employees'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Acessos Individuais dos Funcionários ({employees.length})</span>
            </button>
          </div>

          {viewTab !== 'employees' && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-700"
              >
                <option value="TODOS">Status: Todos</option>
                <option value="Pendente">Pendente</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Concluído">Concluído</option>
              </select>

              {viewTab === 'team' && (
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-700"
                >
                  <option value="TODOS">Funcionário: Todos</option>
                  {employees.map((emp) => (
                    <option key={emp.user_id} value={emp.user_id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {viewTab !== 'employees' && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar serviço por empresa, CNPJ, tipo de serviço ou funcionário..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        )}
      </div>

      {/* ABA ESPECIAL: Painel de Acessos Individuais de Cada Funcionário */}
      {viewTab === 'employees' ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Diretório de Funcionários e Acessos Individuais
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Cada funcionário listado possui credenciais próprias (e-mail e senha individual) e
                carteira isolada de atendimento. Você pode atribuir serviços para qualquer membro ou
                entrar diretamente no acesso dele.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmpModalError(null);
                setIsNewEmpModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Cadastrar Novo Funcionário</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => {
              const empServices = assignments.filter((a) => a.assigned_to_id === emp.user_id);
              const empPending = empServices.filter((a) => a.status !== 'Concluído').length;
              const empCompleted = empServices.filter((a) => a.status === 'Concluído').length;
              const isCurrentUser = user?.user_id === emp.user_id;

              return (
                <div
                  key={emp.user_id}
                  className={`bg-white border rounded-xl p-5 flex flex-col justify-between space-y-4 transition-colors ${
                    isCurrentUser ? 'border-blue-600 ring-1 ring-blue-600/20' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{emp.full_name}</h3>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800 rounded">
                              Acesso Atual
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate-600 mt-0.5">{emp.email}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{emp.phone}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-semibold uppercase rounded border ${
                          emp.role === 'admin'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {emp.role === 'admin' ? 'Admin' : 'Funcionário'}
                      </span>
                    </div>

                    {/* Resumo de serviços na carteira deste funcionário */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                      <div>
                        <p className="text-base font-bold font-mono text-slate-900">
                          {empServices.length}
                        </p>
                        <p className="text-[10px] text-slate-500">Na Carteira</p>
                      </div>
                      <div>
                        <p className="text-base font-bold font-mono text-blue-600">{empPending}</p>
                        <p className="text-[10px] text-slate-500">Em Aberto</p>
                      </div>
                      <div>
                        <p className="text-base font-bold font-mono text-emerald-600">
                          {empCompleted}
                        </p>
                        <p className="text-[10px] text-slate-500">Concluídos</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmployeeFilter(emp.user_id);
                          setViewTab('team');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Ver Carteira ({empServices.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenNewModal(emp.user_id)}
                        className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        + Atribuir Serviço
                      </button>
                    </div>

                    {!isCurrentUser && (
                      <button
                        type="button"
                        onClick={() => openSwitchModal(emp.role, emp.email)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Entrar no Acesso deste Funcionário</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-600">
          Carregando serviços da carteira...
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <Briefcase className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-900">
            Nenhum serviço encontrado nesta visualização da carteira.
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Você pode cadastrar um novo serviço, atribuir uma demanda para outro funcionário ou
            alternar para o acesso individual de outro membro da equipe.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((item) => {
            const statusColor = getStatusDot(item.status);
            const dotClass = statusColor.split(' ')[0];
            const textClass = statusColor.split(' ')[1];
            const isMine = item.assigned_to_id === user?.user_id;
            const canChangeStatus = isMine || user?.role === 'admin';

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-blue-700">
                        {formatCnpj(item.cnpj)}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-medium text-slate-700">{item.service_type}</span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold border rounded ${getPriorityStyle(
                          item.priority
                        )}`}
                      >
                        Prioridade {item.priority}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded ${
                          isMine
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {isMine ? 'Na Minha Carteira' : `Carteira de: ${item.assigned_to_name}`}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
                    <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.company_name}</span>
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Ações rápidas: Status (restrito ao titular da carteira ou admin) + Atribuir para outro funcionário */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {canChangeStatus ? (
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleStatusChange(item, e.target.value as ServiceStatus)
                          }
                          aria-label="Alterar status do serviço"
                          className={`text-xs font-semibold bg-transparent focus:outline-none cursor-pointer ${textClass}`}
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Em andamento">Em andamento</option>
                          <option value="Concluído">Concluído</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                        <span className={`text-xs font-semibold ${textClass}`}>{item.status}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenTransferModal(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Atribuir a outro funcionário</span>
                    </button>

                    {!isMine && (
                      <button
                        type="button"
                        onClick={() => openSwitchModal('funcionario', item.assigned_to_email)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
                        title={`Entrar com o acesso individual de ${item.assigned_to_name}`}
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Acessar como {item.assigned_to_name.split(' ')[0]}</span>
                      </button>
                    )}

                    <Link
                      to={`/empresa/${item.cnpj}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <span>Ver Empresa</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Rodapé de Responsabilidade e Prazo */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="text-slate-500">Funcionário responsável: </span>
                      <strong className="text-slate-900">{item.assigned_to_name}</strong>
                      <span className="block font-mono text-[11px] text-slate-500">
                        Login: {item.assigned_to_email}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500">Atribuído por: </span>
                    <strong className="text-slate-800">{item.assigned_by_name}</strong>
                    <span className="block font-mono text-[11px] text-slate-500">
                      Atualizado em {formatDateTimeBR(item.updated_at)}
                    </span>
                  </div>

                  <div className="flex items-center sm:justify-end gap-2">
                    {item.due_date && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Prazo: {item.due_date}
                      </span>
                    )}
                  </div>
                </div>

                {/* Histórico de Transferências / Atribuições entre Funcionários */}
                {item.transfer_history && item.transfer_history.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>Histórico de Atribuições na Carteira</span>
                    </p>
                    <div className="space-y-1.5">
                      {item.transfer_history.slice(0, 3).map((th) => (
                        <div
                          key={th.id}
                          className="text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-l-2 border-blue-500 pl-2.5"
                        >
                          <div>
                            <strong className="text-slate-800">{th.from_user_name}</strong>
                            <span> atribuiu para </span>
                            <strong className="text-blue-700">{th.to_user_name}</strong>
                            {th.note && (
                              <span className="text-slate-600"> — &ldquo;{th.note}&rdquo;</span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-slate-400 shrink-0">
                            {formatDateTimeBR(th.transferred_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Atribuir / Transferir Serviço para Outro Funcionário */}
      {transferTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Atribuir Serviço para Outro Funcionário
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTransferTargetItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="p-6 space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs">
                <p className="font-mono font-semibold text-blue-700">
                  {formatCnpj(transferTargetItem.cnpj)} · {transferTargetItem.service_type}
                </p>
                <p className="font-bold text-slate-900 text-sm">{transferTargetItem.title}</p>
                <p className="text-slate-600">{transferTargetItem.company_name}</p>
                <p className="text-slate-500 pt-1">
                  Responsável atual:{' '}
                  <strong className="text-slate-800">{transferTargetItem.assigned_to_name}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Selecionar Funcionário de Destino (Receberá na Carteira Individual)
                </label>
                <select
                  required
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {employees.map((emp) => (
                    <option key={emp.user_id} value={emp.user_id}>
                      {emp.full_name} ({emp.email}){' '}
                      {emp.user_id === transferTargetItem.assigned_to_id ? '— [Atual]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Prioridade do Serviço
                </label>
                <select
                  value={transferPriority}
                  onChange={(e) => setTransferPriority(e.target.value as ServicePriority)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Observação / Instruções para o Funcionário
                </label>
                <textarea
                  rows={3}
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Descreva o motivo do encaminhamento ou orientações para execução..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferTargetItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
                >
                  {transferSubmitting ? 'Atribuindo...' : 'Confirmar Atribuição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Novo Serviço na Carteira */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Adicionar Serviço na Carteira
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="p-6 space-y-4">
              {newModalError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{newModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CNPJ da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCnpj}
                    onChange={(e) => setNewCnpj(formatCnpj(e.target.value))}
                    placeholder="00.000.000/0001-00"
                    maxLength={18}
                    className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome da Empresa (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Busca automática via BrasilAPI"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Serviço *
                  </label>
                  <select
                    value={newServiceType}
                    onChange={(e) => setNewServiceType(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {SERVICE_TYPES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prioridade *
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as ServicePriority)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Atribuir Serviço para o Funcionário *
                </label>
                <select
                  required
                  value={newAssignedToId}
                  onChange={(e) => setNewAssignedToId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {employees.map((emp) => (
                    <option key={emp.user_id} value={emp.user_id}>
                      {emp.full_name} ({emp.email}){' '}
                      {emp.user_id === user?.user_id ? '— [Minha Carteira]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título / Objetivo do Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex.: Validar telefone comercial e atualizar e-mail corporativo"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Instruções Detalhadas
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Observações para o funcionário responsável..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prazo Sugerido
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={newSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
                >
                  {newSubmitting ? 'Salvando...' : 'Criar e Atribuir Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Criar Acesso Individual para Novo Funcionário */}
      {isNewEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Criar Acesso Individual de Funcionário
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsNewEmpModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployeeAccess} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Cadastre um novo funcionário com seu próprio login e senha individual. Ele terá sua
                própria carteira de serviços e poderá acessar o sistema de forma independente.
              </p>

              {empModalError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{empModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo do Funcionário *
                </label>
                <input
                  type="text"
                  required
                  value={empFullName}
                  onChange={(e) => setEmpFullName(e.target.value)}
                  placeholder="Ex.: Bruno Almeida (Analista)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail de Login Individual *
                </label>
                <input
                  type="email"
                  required
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  placeholder="bruno.almeida@nexuscnpj.com.br"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone Corporativo *
                </label>
                <input
                  type="tel"
                  required
                  value={empPhone}
                  onChange={(e) => setEmpPhone(formatPhone(e.target.value))}
                  placeholder="(11) 98888-7777"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha Individual de Acesso (Mín. 8 caracteres) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showEmpPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    placeholder="Defina a senha exclusiva do funcionário"
                    className="w-full pl-10 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmpPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showEmpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewEmpModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={empSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
                >
                  {empSubmitting ? 'Criando acesso...' : 'Criar Acesso Individual'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
