import React, { useEffect, useState, useMemo } from 'react';
import { ScrollText, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatDateTimeBR } from '../../utils/cnpj.ts';
import type { AuditLogRecord } from '../../types/index.ts';

export const AdminLogsPage: React.FC = () => {
  const { apiFetch } = useAuth();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/admin/logs');
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [apiFetch]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.user_name.toLowerCase().includes(q) ||
        l.user_email.toLowerCase().includes(q) ||
        l.target_id.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Logs de Auditoria e Segurança (audit_logs)
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Registro imutável de login, logout, troca de conta, tentativas de acesso administrativo,
            alterações de permissão e aprovações.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{logs.length} eventos registrados</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar logs por usuário, ação, CNPJ ou descrição..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Carregando...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ScrollText className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Nenhum resultado encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4">Usuário / Perfil</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Objeto Afetado</th>
                  <th className="py-3 px-4">Descrição e Metadados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTimeBR(log.created_at)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 block">{log.user_name}</span>
                      <span className="font-mono text-slate-500">
                        {log.user_email} · {log.user_role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {log.target_type}: {log.target_id.slice(0, 18)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <p>{log.description}</p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-xl">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
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
