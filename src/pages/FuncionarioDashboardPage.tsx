import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  History,
  FileEdit,
  ArrowRight,
  ArrowLeftRight,
  Briefcase,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { formatCnpj, formatDateTimeBR } from '../utils/cnpj.ts';
import type {
  CompanySearchRecord,
  ServiceAssignmentRecord,
  ServiceStatus,
  UpdateRequestRecord,
} from '../types/index.ts';

export const FuncionarioDashboardPage: React.FC = () => {
  const { user, apiFetch, openSwitchModal } = useAuth();
  const [searches, setSearches] = useState<CompanySearchRecord[]>([]);
  const [requests, setRequests] = useState<UpdateRequestRecord[]>([]);
  const [myServices, setMyServices] = useState<ServiceAssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, rRes, pRes] = await Promise.all([
        apiFetch('/api/my-searches'),
        apiFetch('/api/my-requests'),
        apiFetch('/api/portfolio'),
      ]);
      if (sRes.ok) {
        const sData = await sRes.json();
        setSearches(sData.searches || []);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setRequests(rData.requests || []);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        const allAssignments: ServiceAssignmentRecord[] = pData.assignments || [];
        setMyServices(allAssignments.filter((a) => a.assigned_to_id === user?.user_id));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [apiFetch, user?.user_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickStatusUpdate = async (serviceId: string, newStatus: ServiceStatus) => {
    setStatusFeedback(null);
    try {
      const res = await apiFetch(`/api/portfolio/${serviceId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatusFeedback(`Status atualizado para "${newStatus}" na sua carteira.`);
        await loadData();
      }
    } catch {
      // ignore
    }
  };

  const pendingCount = requests.filter(
    (r) => r.status === 'Pendente' || r.status === 'Em análise'
  ).length;
  const openServicesCount = myServices.filter((s) => s.status !== 'Concluído').length;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header do Acesso Individual do Funcionário */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
              <KeyRound className="w-3.5 h-3.5" />
              Acesso Individual do Funcionário
            </span>
            <span>·</span>
            <span className="font-mono text-slate-700">{user?.email}</span>
            <span>·</span>
            <span className="font-mono text-slate-500 uppercase">
              Perfil: {user?.role === 'admin' ? 'Administrador' : 'Funcionário'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Olá, {user?.full_name}
          </h1>
          <p className="text-xs text-slate-600">
            Este é o seu painel individual exclusivo. Gerencie os serviços atribuídos à sua
            carteira, consulte CNPJs e acompanhe suas solicitações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/carteira"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Minha Carteira ({myServices.length})</span>
          </Link>
          <Link
            to="/consultar-cnpj"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Consultar CNPJ</span>
          </Link>
          <Link
            to="/mapa"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Abrir Mapa</span>
          </Link>
          <button
            type="button"
            onClick={() => openSwitchModal('funcionario')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Trocar Funcionário / Conta</span>
          </button>
        </div>
      </div>

      {/* Resumo de Indicadores Individuais do Funcionário */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Serviços na Minha Carteira</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {myServices.length}
          </p>
          <Link
            to="/carteira"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mt-3 hover:underline"
          >
            <span>{openServicesCount} em aberto · Abrir carteira</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Minhas Consultas Realizadas</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {searches.length}
          </p>
          <Link
            to="/minhas-consultas"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mt-3 hover:underline"
          >
            <span>Ver histórico individual</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Minhas Solicitações Enviadas</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {requests.length}
          </p>
          <Link
            to="/minhas-solicitacoes"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mt-3 hover:underline"
          >
            <span>Acompanhar solicitações</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Solicitações Pendentes / Em Análise</p>
          <p className="text-2xl font-bold font-mono text-amber-600 mt-1 tabular-nums">
            {pendingCount}
          </p>
          <p className="text-xs text-slate-500 mt-3">Aguardando revisão administrativa</p>
        </div>
      </div>

      {/* Seção Principal: Serviços Atribuídos ao Acesso deste Funcionário */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Meus Serviços Atribuídos na Carteira ({myServices.length})
            </h2>
          </div>
          <Link
            to="/carteira"
            className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <span>Gerenciar carteira completa ou atribuir a outro funcionário</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {statusFeedback && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusFeedback}</span>
          </div>
        )}

        {loading ? (
          <div className="p-6 text-xs text-slate-500">Carregando sua carteira individual...</div>
        ) : myServices.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-xs text-slate-500">
              Nenhum serviço atribuído ao seu acesso ({user?.email}) no momento.
            </p>
            <Link
              to="/carteira"
              className="inline-block px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
            >
              Abrir Carteira de Serviços
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myServices.map((srv) => (
              <div
                key={srv.id}
                className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-blue-700">
                      {formatCnpj(srv.cnpj)}
                    </span>
                    <span>·</span>
                    <span className="text-slate-600 font-medium">{srv.service_type}</span>
                    <span>·</span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Prioridade {srv.priority}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{srv.title}</p>
                  <p className="text-xs text-slate-600">
                    {srv.company_name} · Atribuído por <strong>{srv.assigned_by_name}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <select
                    value={srv.status}
                    onChange={(e) =>
                      handleQuickStatusUpdate(srv.id, e.target.value as ServiceStatus)
                    }
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                  </select>

                  <Link
                    to="/carteira"
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap"
                  >
                    Transferir / Detalhes
                  </Link>

                  <Link
                    to={`/empresa/${srv.cnpj}`}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
                  >
                    Ficha CNPJ
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Últimas Consultas e Últimas Solicitações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-semibold text-slate-900">Últimas Consultas de CNPJ</h2>
            </div>
            <Link
              to="/minhas-consultas"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Ver todas
            </Link>
          </div>

          {loading ? (
            <div className="p-6 text-xs text-slate-500">Carregando...</div>
          ) : searches.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs text-slate-500">
                Nenhuma consulta registrada em seu histórico individual.
              </p>
              <Link
                to="/consultar-cnpj"
                className="inline-block px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
              >
                Realizar primeira consulta
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {searches.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {item.company?.razao_social || formatCnpj(item.cnpj)}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {formatCnpj(item.cnpj)} · {formatDateTimeBR(item.searched_at)}
                    </p>
                  </div>
                  <Link
                    to={`/empresa/${item.cnpj}`}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
                  >
                    Ver detalhes
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-semibold text-slate-900">Últimas Solicitações</h2>
            </div>
            <Link
              to="/minhas-solicitacoes"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Ver todas
            </Link>
          </div>

          {loading ? (
            <div className="p-6 text-xs text-slate-500">Carregando...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs text-slate-500">
                Você ainda não enviou solicitações de atualização cadastral neste acesso.
              </p>
              <p className="text-xs text-slate-400">
                Consulte uma empresa e clique em &quot;Solicitar atualização de dados&quot;.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.slice(0, 5).map((req) => (
                <div
                  key={req.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {req.company_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {req.field_label} · <span className="font-mono">{req.status}</span>
                    </p>
                  </div>
                  <Link
                    to="/minhas-solicitacoes"
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
                  >
                    Detalhes
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
