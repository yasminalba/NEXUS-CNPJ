import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FileEdit,
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { formatCnpj, formatDateTimeBR } from '../utils/cnpj.ts';
import type { UpdateRequestRecord, RequestStatus } from '../types/index.ts';

function renderStatusIndicator(status: RequestStatus) {
  switch (status) {
    case 'Pendente':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Pendente</span>
        </span>
      );
    case 'Em análise':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
          <Search className="w-3.5 h-3.5 text-blue-600" />
          <span>Em análise</span>
        </span>
      );
    case 'Aprovada':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Aprovada</span>
        </span>
      );
    case 'Recusada':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
          <XCircle className="w-3.5 h-3.5 text-red-600" />
          <span>Recusada</span>
        </span>
      );
  }
}

export const MinhasSolicitacoesPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { apiFetch } = useAuth();

  const [requests, setRequests] = useState<UpdateRequestRecord[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<UpdateRequestRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (id) {
        const res = await apiFetch(`/api/my-requests/${id}`);
        if (!res.ok) {
          setError('Não foi possível carregar os detalhes desta solicitação.');
          return;
        }
        const data = await res.json();
        setSelectedDetail(data.request);
      } else {
        const res = await apiFetch('/api/my-requests');
        if (!res.ok) {
          setError('Não foi possível carregar suas solicitações.');
          return;
        }
        const data = await res.json();
        setRequests(data.requests || []);
        setSelectedDetail(null);
      }
    } catch {
      setError('Não foi possível conectar ao serviço. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [id, apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Visão de Detalhes de uma Solicitação (/minhas-solicitacoes/:id)
  if (id) {
    if (loading) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-12 text-center text-xs text-slate-500">
          Carregando...
        </div>
      );
    }

    if (error || !selectedDetail) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
          <Link
            to="/minhas-solicitacoes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Minhas Solicitações
          </Link>
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-red-600">
            {error || 'Solicitação não encontrada.'}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/minhas-solicitacoes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Minhas Solicitações</span>
          </Link>

          <Link
            to={`/empresa/${selectedDetail.cnpj}`}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Abrir página da empresa
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <p className="text-xs font-mono text-slate-500">
                Protocolo #{selectedDetail.id.slice(0, 8)} · CNPJ {formatCnpj(selectedDetail.cnpj)}
              </p>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                {selectedDetail.company_name}
              </h1>
            </div>
            <div>{renderStatusIndicator(selectedDetail.status)}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500">Dado atual (antes da solicitação)</p>
              <p className="text-sm font-mono font-semibold text-slate-800 mt-1">
                {selectedDetail.old_value}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200">
              <p className="text-xs text-blue-700 font-medium">
                Novo dado solicitado ({selectedDetail.field_label})
              </p>
              <p className="text-sm font-mono font-semibold text-blue-950 mt-1">
                {selectedDetail.requested_value}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
            <div>
              <p className="text-slate-500">Tipo de Alteração</p>
              <p className="font-semibold text-slate-900 mt-0.5">{selectedDetail.field_label}</p>
            </div>
            <div>
              <p className="text-slate-500">Método de Verificação</p>
              <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                {selectedDetail.verification_method}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Data de Abertura</p>
              <p className="font-mono font-semibold text-slate-900 mt-0.5">
                {formatDateTimeBR(selectedDetail.created_at)}
              </p>
            </div>
          </div>

          {selectedDetail.justification && (
            <div className="pt-2">
              <p className="text-xs text-slate-500">Justificativa informada</p>
              <p className="text-xs text-slate-800 mt-1 p-3 rounded-lg bg-slate-50 border border-slate-200">
                {selectedDetail.justification}
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Histórico e Análise Administrativa</p>
            <div className="text-xs text-slate-600 space-y-1">
              <p>
                Última atualização:{' '}
                <span className="font-mono text-slate-800">
                  {formatDateTimeBR(selectedDetail.updated_at)}
                </span>
              </p>
              {selectedDetail.reviewed_at && (
                <p>
                  Analisada em:{' '}
                  <span className="font-mono text-slate-800">
                    {formatDateTimeBR(selectedDetail.reviewed_at)}
                  </span>{' '}
                  por <strong>{selectedDetail.admin_name || 'Administração'}</strong>
                </p>
              )}
              {selectedDetail.admin_notes && (
                <div className="mt-2 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="font-semibold text-slate-800">Observação do Administrador:</p>
                  <p className="text-slate-700 mt-1">{selectedDetail.admin_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredRequests = requests.filter((r) =>
    statusFilter === 'TODOS' ? true : r.status === statusFilter
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Minhas solicitações</h1>
          <p className="text-xs text-slate-600 mt-1">
            Acompanhe todas as solicitações de atualização cadastral realizadas pela sua conta.
          </p>
        </div>

        {/* Filtro de Status */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg overflow-x-auto">
          {['TODOS', 'Pendente', 'Em análise', 'Aprovada', 'Recusada'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'TODOS' ? 'Todas' : st}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Carregando...</div>
        ) : error ? (
          <div className="p-10 text-center text-xs text-red-600">{error}</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileEdit className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Nenhum resultado encontrado.</p>
            <p className="text-xs text-slate-500">
              Para solicitar uma atualização, consulte um CNPJ e clique em &quot;Solicitar atualização
              de dados&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">CNPJ</th>
                  <th className="py-3 px-4">Tipo de Alteração</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Última Atualização</th>
                  <th className="py-3 px-4 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {req.company_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {formatCnpj(req.cnpj)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <span>{req.field_label}</span>
                      <span className="block text-[11px] font-mono text-slate-500 truncate max-w-xs">
                        {req.old_value} → {req.requested_value}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTimeBR(req.created_at)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusIndicator(req.status)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTimeBR(req.updated_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/minhas-solicitacoes/${req.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <span>Ver detalhes</span>
                        <ArrowRight className="w-3.5 h-3.5" />
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
