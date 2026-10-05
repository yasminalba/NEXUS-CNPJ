import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, History, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { formatCnpj, formatDateTimeBR } from '../utils/cnpj.ts';
import type { CompanySearchRecord } from '../types/index.ts';

export const MinhasConsultasPage: React.FC = () => {
  const { apiFetch } = useAuth();
  const [searches, setSearches] = useState<CompanySearchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    const loadSearches = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/api/my-searches');
        if (!res.ok) {
          setError('Não foi possível carregar os dados.');
          return;
        }
        const data = await res.json();
        setSearches(data.searches || []);
      } catch {
        setError('Não foi possível conectar ao serviço. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    loadSearches();
  }, [apiFetch]);

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return searches;
    return searches.filter(
      (item) =>
        item.cnpj.includes(q.replace(/\D/g, '')) ||
        formatCnpj(item.cnpj).includes(q) ||
        (item.company?.razao_social || '').toLowerCase().includes(q) ||
        (item.company?.nome_fantasia || '').toLowerCase().includes(q)
    );
  }, [searches, filterText]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Minhas consultas</h1>
          <p className="text-xs text-slate-600 mt-1">
            Histórico individual de consultas de CNPJ realizadas pela sua conta (protegido por RLS).
          </p>
        </div>

        <Link
          to="/consultar-cnpj"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Nova Consulta de CNPJ</span>
        </Link>
      </div>

      {/* Barra de Pesquisa no Histórico */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Pesquisar no histórico por CNPJ, Razão Social ou Nome Fantasia..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Tabela de Histórico */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Carregando...</div>
        ) : error ? (
          <div className="p-10 text-center text-xs text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Nenhum resultado encontrado.</p>
            <p className="text-xs text-slate-500">
              Suas consultas de CNPJ aparecerão listadas automaticamente aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">CNPJ</th>
                  <th className="py-3 px-4">Razão Social</th>
                  <th className="py-3 px-4">Nome Fantasia</th>
                  <th className="py-3 px-4">Situação da Empresa</th>
                  <th className="py-3 px-4">Data e Hora da Consulta</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatCnpj(item.cnpj)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {item.company?.razao_social || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {item.company?.nome_fantasia || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {item.company?.situacao || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTimeBR(item.searched_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/empresa/${item.cnpj}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
