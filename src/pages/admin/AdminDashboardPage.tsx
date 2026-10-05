import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  FileCheck2,
  Building2,
  ScrollText,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCnpj, formatDateTimeBR } from '../../utils/cnpj.ts';
import type {
  Company,
  CompanySearchRecord,
  UpdateRequestRecord,
  UserProfile,
} from '../../types/index.ts';

interface AdminStats {
  total_users: number;
  total_funcionarios: number;
  total_admins: number;
  total_searches: number;
  total_companies: number;
  pending_requests: number;
  in_analysis_requests: number;
  approved_requests: number;
  rejected_requests: number;
}

export const AdminDashboardPage: React.FC = () => {
  const { apiFetch } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searches, setSearches] = useState<CompanySearchRecord[]>([]);
  const [requests, setRequests] = useState<UpdateRequestRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros do Dashboard Administrativo (Seção 20 e 40)
  const [periodFilter, setPeriodFilter] = useState<'all' | '7d' | '30d'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [fieldTypeFilter, setFieldTypeFilter] = useState<string>('TODOS');
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/api/admin/overview');
        if (!res.ok) {
          setError('Não foi possível carregar os dados administrativos.');
          return;
        }
        const data = await res.json();
        setStats(data.stats);
        setUsers(data.users || []);
        setSearches(data.searches || []);
        setRequests(data.requests || []);
        setCompanies(data.companies || []);
      } catch {
        setError('Não foi possível conectar ao serviço. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    loadOverview();
  }, [apiFetch]);

  const filteredRequests = useMemo(() => {
    const now = Date.now();
    const q = searchFilter.trim().toLowerCase();

    return requests.filter((req) => {
      if (periodFilter === '7d') {
        if (now - new Date(req.created_at).getTime() > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (periodFilter === '30d') {
        if (now - new Date(req.created_at).getTime() > 30 * 24 * 60 * 60 * 1000) return false;
      }
      if (statusFilter !== 'TODOS' && req.status !== statusFilter) return false;
      if (fieldTypeFilter !== 'TODOS' && req.field_name !== fieldTypeFilter) return false;
      if (q) {
        const matchCnpj = req.cnpj.includes(q.replace(/\D/g, ''));
        const matchName = req.company_name.toLowerCase().includes(q);
        if (!matchCnpj && !matchName) return false;
      }
      return true;
    });
  }, [requests, periodFilter, statusFilter, fieldTypeFilter, searchFilter]);

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-slate-500">Carregando...</div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 bg-white border border-red-200 rounded-xl text-xs text-red-700">
        {error || 'Não foi possível carregar os dados.'}
      </div>
    );
  }

  const totalReqs = Math.max(1, requests.length);
  const pctPending = Math.round((stats.pending_requests / totalReqs) * 100);
  const pctAnalysis = Math.round((stats.in_analysis_requests / totalReqs) * 100);
  const pctApproved = Math.round((stats.approved_requests / totalReqs) * 100);
  const pctRejected = Math.round((stats.rejected_requests / totalReqs) * 100);

  return (
    <div className="space-y-6">
      {/* Header do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Dashboard Administrativo
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Visão consolidada de usuários, consultas de CNPJ, empresas e solicitações de
            atualização.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/usuarios"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Gerenciar Usuários</span>
          </Link>
          <Link
            to="/admin/solicitacoes"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Analisar Solicitações</span>
          </Link>
        </div>
      </div>

      {/* 8 Cards Principais de Indicadores (Seção 20 e 40) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Total de Usuários Cadastrados</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {stats.total_users}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-mono">
            {stats.total_funcionarios} Funcionários · {stats.total_admins} Admins
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Total de Consultas Realizadas</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {stats.total_searches}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-mono">
            {stats.total_companies} empresas distintas na base
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Solicitações Pendentes / Em Análise</p>
          <p className="text-2xl font-bold font-mono text-amber-600 mt-1 tabular-nums">
            {stats.pending_requests + stats.in_analysis_requests}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-mono">
            {stats.pending_requests} pendentes · {stats.in_analysis_requests} em análise
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Atualizações Aprovadas / Recusadas</p>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-1 tabular-nums">
            {stats.approved_requests}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-mono">
            {stats.approved_requests} aprovadas · {stats.rejected_requests} recusadas
          </p>
        </div>
      </div>

      {/* Gráficos Profissionais de Distribuição (Seção 40) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Solicitações por Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Distribuição de Solicitações por Status
            </h2>
            <span className="text-xs font-mono text-slate-500">Total: {requests.length}</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between font-medium">
                <span className="text-slate-700">Pendentes</span>
                <span className="font-mono text-slate-900">
                  {stats.pending_requests} ({pctPending}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${pctPending}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-medium">
                <span className="text-slate-700">Em análise</span>
                <span className="font-mono text-slate-900">
                  {stats.in_analysis_requests} ({pctAnalysis}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${pctAnalysis}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-medium">
                <span className="text-slate-700">Aprovadas (Atualizações Realizadas)</span>
                <span className="font-mono text-slate-900">
                  {stats.approved_requests} ({pctApproved}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${pctApproved}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-medium">
                <span className="text-slate-700">Recusadas</span>
                <span className="font-mono text-slate-900">
                  {stats.rejected_requests} ({pctRejected}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full"
                  style={{ width: `${pctRejected}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico 2: Usuários Cadastrados e Volume Operacional */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Composição de Perfis e Volume de Consultas
            </h2>
            <span className="text-xs font-mono text-slate-500">RBAC Ativo</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Funcionários</p>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                {stats.total_funcionarios}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Acesso operacional padrão</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Administradores</p>
              <p className="text-xl font-bold font-mono text-blue-600 mt-1 tabular-nums">
                {stats.total_admins}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Gestão total e auditoria</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Empresas Consultadas</p>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                {companies.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Registros oficiais em cache</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Consultas no Período</p>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                {searches.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Histórico auditado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros por Período, Status, CNPJ, Empresa e Tipo de Solicitação (Seção 20) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>Monitoramento Filtrado de Solicitações e Empresas</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar por CNPJ ou Empresa..."
              className="px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />

            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">Todo o período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="TODOS">Todos os status</option>
              <option value="Pendente">Pendente</option>
              <option value="Em análise">Em análise</option>
              <option value="Aprovada">Aprovada</option>
              <option value="Recusada">Recusada</option>
            </select>

            <select
              value={fieldTypeFilter}
              onChange={(e) => setFieldTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="TODOS">Todos os tipos</option>
              <option value="telefone">Telefone</option>
              <option value="email">E-mail</option>
              <option value="website">Website</option>
              <option value="complemento">Complemento</option>
            </select>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Nenhuma solicitação encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Empresa / CNPJ</th>
                  <th className="py-2.5 px-3">Solicitante</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.slice(0, 8).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 block">{r.company_name}</span>
                      <span className="font-mono text-slate-500">{formatCnpj(r.cnpj)}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{r.user_name || '—'}</td>
                    <td className="py-3 px-3 text-slate-700">{r.field_label}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                      {r.status}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {formatDateTimeBR(r.created_at)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to="/admin/solicitacoes"
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                      >
                        <span>Analisar</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
