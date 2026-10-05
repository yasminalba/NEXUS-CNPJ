import React, { useEffect, useState, useCallback } from 'react';
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { ConfirmPasswordModal } from '../../components/ConfirmPasswordModal.tsx';
import { formatCnpj, formatDateTimeBR } from '../../utils/cnpj.ts';
import type { UpdateRequestRecord, RequestStatus } from '../../types/index.ts';

export const AdminSolicitacoesPage: React.FC = () => {
  const { apiFetch } = useAuth();

  const [requests, setRequests] = useState<UpdateRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [selectedReq, setSelectedReq] = useState<UpdateRequestRecord | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Confirmação extra de senha para aprovar, colocar em análise ou recusar
  const [pendingDecision, setPendingDecision] = useState<{
    status: RequestStatus;
    req: UpdateRequestRecord;
  } | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filtered = requests.filter((r) =>
    statusFilter === 'TODOS' ? true : r.status === statusFilter
  );

  const handleConfirmReview = async (adminPassword: string) => {
    if (!pendingDecision) return;
    setFeedback(null);

    const res = await apiFetch(`/api/admin/requests/${pendingDecision.req.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: pendingDecision.status,
        admin_notes: adminNotes.trim(),
        admin_password: adminPassword,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao processar análise da solicitação.');
    }

    setFeedback({
      type: 'success',
      message: `Solicitação marcada como "${pendingDecision.status}" com sucesso e registrada no log de auditoria.`,
    });
    setSelectedReq(null);
    setPendingDecision(null);
    setAdminNotes('');
    await loadRequests();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Análise Administrativa de Solicitações
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Analise, aprove ou recuse solicitações de atualização enviadas pelos usuários.
          </p>
        </div>

        {/* Filtros de Status (Seção 23) */}
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

      {/* Lista de Solicitações */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Nenhum resultado encontrado.</p>
            <p className="text-xs text-slate-500">
              Não há solicitações com o filtro selecionado no momento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="py-3 px-4">Usuário Solicitante</th>
                  <th className="py-3 px-4">Empresa / CNPJ</th>
                  <th className="py-3 px-4">Informação Atual</th>
                  <th className="py-3 px-4">Informação Solicitada</th>
                  <th className="py-3 px-4">Verificação</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">
                        {req.user_name || 'Usuário'}
                      </span>
                      <span className="font-mono text-slate-500">{req.user_email || '—'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">
                        {req.company_name}
                      </span>
                      <span className="font-mono text-slate-500">{formatCnpj(req.cnpj)}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      <span className="text-[11px] font-sans text-slate-400 block">
                        {req.field_label}
                      </span>
                      {req.old_value}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                      {req.requested_value}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        {req.verification_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTimeBR(req.created_at)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold whitespace-nowrap">
                      {req.status === 'Pendente' && (
                        <span className="text-amber-700 inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Pendente
                        </span>
                      )}
                      {req.status === 'Em análise' && (
                        <span className="text-blue-700 inline-flex items-center gap-1">
                          <Search className="w-3.5 h-3.5" /> Em análise
                        </span>
                      )}
                      {req.status === 'Aprovada' && (
                        <span className="text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aprovada
                        </span>
                      )}
                      {req.status === 'Recusada' && (
                        <span className="text-red-700 inline-flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Recusada
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReq(req);
                          setAdminNotes(req.admin_notes || '');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                      >
                        Abrir / Analisar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Painel / Modal de Análise Detalhada da Solicitação */}
      {selectedReq && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-mono text-slate-500">
                Solicitação #{selectedReq.id.slice(0, 8)} · Enviada por {selectedReq.user_name} (
                {selectedReq.user_email})
              </p>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                {selectedReq.company_name} ({formatCnpj(selectedReq.cnpj)})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedReq(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500">
                Informação atual ({selectedReq.field_label}):
              </p>
              <p className="text-sm font-mono font-semibold text-slate-900 mt-1">
                {selectedReq.old_value}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200">
              <p className="text-xs font-semibold text-blue-700">
                Informação solicitada ({selectedReq.field_label}):
              </p>
              <p className="text-sm font-mono font-semibold text-blue-950 mt-1">
                {selectedReq.requested_value}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <p>
              <strong>Método de Verificação:</strong> {selectedReq.verification_method}
            </p>
            <p>
              <strong>Justificativa do Usuário:</strong>{' '}
              {selectedReq.justification || 'Não informada'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Observações Administrativas (Visível no histórico da solicitação)
            </label>
            <textarea
              rows={2}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Registre o parecer técnico da análise, documentos conferidos ou motivo de aprovação/recusa..."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() =>
                setPendingDecision({ status: 'Em análise', req: selectedReq })
              }
              className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
            >
              Marcar como Em análise
            </button>
            <button
              type="button"
              onClick={() =>
                setPendingDecision({ status: 'Recusada', req: selectedReq })
              }
              className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
            >
              Recusar solicitação
            </button>
            <button
              type="button"
              onClick={() =>
                setPendingDecision({ status: 'Aprovada', req: selectedReq })
              }
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
            >
              Aprovar e Aplicar Atualização
            </button>
          </div>
        </div>
      )}

      {/* Confirmação de Identidade por Senha para Aprovação/Recusa */}
      <ConfirmPasswordModal
        isOpen={Boolean(pendingDecision)}
        description={
          pendingDecision
            ? `Confirmar decisão administrativa "${pendingDecision.status.toUpperCase()}" para a solicitação da empresa ${pendingDecision.req.company_name} (${formatCnpj(pendingDecision.req.cnpj)}).`
            : ''
        }
        onClose={() => setPendingDecision(null)}
        onConfirm={handleConfirmReview}
      />
    </div>
  );
};
