import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search, ArrowRight, History, FileCheck2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCnpj, formatCurrencyBRL, formatDateTimeBR } from '../../utils/cnpj.ts';
import type { Company, UpdateRequestRecord } from '../../types/index.ts';

interface EnrichedCompany extends Company {
  total_searches: number;
  related_requests: UpdateRequestRecord[];
}

export const AdminEmpresasPage: React.FC = () => {
  const { apiFetch } = useAuth();
  const [companies, setCompanies] = useState<EnrichedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<EnrichedCompany | null>(null);

  useEffect(() => {
    const loadCompanies = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/admin/companies');
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.companies || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    loadCompanies();
  }, [apiFetch]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.cnpj.includes(q.replace(/\D/g, '')) ||
        c.razao_social.toLowerCase().includes(q) ||
        (c.nome_fantasia || '').toLowerCase().includes(q) ||
        c.endereco.municipio.toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Empresas Consultadas e Histórico de Atualizações
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Visualize empresas registradas via API oficial, volume de consultas e solicitações de
            atualização vinculadas.
          </p>
        </div>

        <Link
          to="/consultar-cnpj"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg whitespace-nowrap shrink-0"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Consultar Novo CNPJ</span>
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar empresa por CNPJ, Razão Social, Nome Fantasia ou Cidade..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Nenhum resultado encontrado.</p>
            <p className="text-xs text-slate-500">
              As empresas consultadas pelos usuários são catalogadas automaticamente aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="py-3 px-4">CNPJ</th>
                  <th className="py-3 px-4">Razão Social / Nome Fantasia</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4">Município / UF</th>
                  <th className="py-3 px-4">Consultas</th>
                  <th className="py-3 px-4">Solicitações</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatCnpj(comp.cnpj)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">{comp.razao_social}</span>
                      <span className="text-slate-500">{comp.nome_fantasia}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {comp.situacao}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {comp.endereco.municipio} / {comp.endereco.uf}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {comp.total_searches}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {comp.related_requests.length}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCompany(comp)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                      >
                        Histórico / Solicitações
                      </button>
                      <Link
                        to={`/empresa/${comp.cnpj}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <span>Ficha Completa</span>
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

      {/* Painel de Detalhes Administrativos e Histórico da Empresa Selecionada */}
      {selectedCompany && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-mono text-slate-500">
                CNPJ {formatCnpj(selectedCompany.cnpj)} · Capital Social:{' '}
                {formatCurrencyBRL(selectedCompany.capital_social)}
              </p>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                {selectedCompany.razao_social}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCompany(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Fechar painel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-slate-500">Telefone Atual</p>
              <p className="font-mono font-semibold text-slate-900 mt-1">
                {selectedCompany.telefone}
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-slate-500">E-mail Atual</p>
              <p className="font-mono font-semibold text-slate-900 mt-1">
                {selectedCompany.email}
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-slate-500">Última Sincronização</p>
              <p className="font-mono font-semibold text-slate-900 mt-1">
                {formatDateTimeBR(selectedCompany.updated_at)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              <span>
                Solicitações e Atualizações Relacionadas ({selectedCompany.related_requests.length})
              </span>
            </div>

            {selectedCompany.related_requests.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhuma solicitação de atualização registrada para esta empresa.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {selectedCompany.related_requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {req.field_label}:{' '}
                        <span className="font-mono font-normal">
                          {req.old_value} → {req.requested_value}
                        </span>
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        Solicitante: {req.user_name || 'Usuário'} ·{' '}
                        {formatDateTimeBR(req.created_at)}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-slate-800">{req.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
