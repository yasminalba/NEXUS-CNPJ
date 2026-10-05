import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, AlertCircle, ArrowRight, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { formatCnpj, validateCnpj, formatDateTimeBR } from '../utils/cnpj.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { CompanySearchRecord } from '../types/index.ts';

const SUGGESTED_CNPJS = [
  { name: 'Banco do Brasil S.A.', cnpj: '00000000000191', formatted: '00.000.000/0001-91' },
  { name: 'Petróleo Brasileiro S.A. - Petrobras', cnpj: '33000167000101', formatted: '33.000.167/0001-01' },
  { name: 'Vale S.A.', cnpj: '33592510000154', formatted: '33.592.510/0001-54' },
  { name: 'Magazine Luiza S/A', cnpj: '47960950000121', formatted: '47.960.950/0001-21' },
  { name: 'Sociedade Beneficente Israelita Brasileira Hospital Albert Einstein', cnpj: '60765823000130', formatted: '60.765.823/0001-30' },
  { name: 'Nu Pagamentos S.A. - Instituição de Pagamento', cnpj: '18236120000158', formatted: '18.236.120/0001-58' },
];

export const ConsultarCnpjPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, apiFetch } = useAuth();

  const [cnpjInput, setCnpjInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<CompanySearchRecord[]>([]);

  useEffect(() => {
    if (user) {
      apiFetch('/api/my-searches')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.searches) {
            setRecentSearches(data.searches.slice(0, 5));
          }
        })
        .catch(() => {});
    }
  }, [user, apiFetch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateCnpj(cnpjInput);
    if (!validation.valid) {
      setError(validation.error || 'CNPJ inválido.');
      return;
    }

    navigate(`/empresa/${validation.cleaned}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Consulta Oficial de CNPJ</h1>
          <p className="text-sm text-slate-600">
            Informe os 14 dígitos do CNPJ com ou sem pontuação. O sistema valida os dígitos
            verificadores antes de consultar em tempo real a base oficial.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cnpj-search-field" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Número do CNPJ
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="cnpj-search-field"
                  type="text"
                  autoFocus
                  value={cnpjInput}
                  onChange={(e) => {
                    setCnpjInput(formatCnpj(e.target.value));
                    if (error) setError(null);
                  }}
                  placeholder="12.345.678/0001-90 ou 12345678000190"
                  maxLength={18}
                  className="w-full pl-10 pr-4 py-3 text-base font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap inline-flex items-center justify-center gap-2"
              >
                <span>Consultar CNPJ</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Remoção automática de caracteres especiais
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Validação de 14 dígitos e Módulo 11
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Fonte oficial Receita Federal
            </span>
          </div>
        </form>
      </div>

      {/* Consultas Rápidas de Demonstração Real */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              CNPJs Reais para Consulta Imediata
            </h2>
          </div>
          <span className="text-xs text-slate-500">Dados reais retornados via API</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTED_CNPJS.map((item) => (
            <button
              key={item.cnpj}
              type="button"
              onClick={() => navigate(`/empresa/${item.cnpj}`)}
              className="text-left p-3.5 rounded-lg border border-slate-200 hover:border-blue-600 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{item.name}</p>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{item.formatted}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Últimas Consultas do Usuário Autenticado */}
      {user && recentSearches.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-semibold text-slate-900">Suas Últimas Consultas</h2>
            </div>
            <Link to="/minhas-consultas" className="text-xs font-semibold text-blue-600 hover:underline">
              Ver histórico completo
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentSearches.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {s.company?.razao_social || formatCnpj(s.cnpj)}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    {formatCnpj(s.cnpj)} · {formatDateTimeBR(s.searched_at)}
                  </p>
                </div>
                <Link
                  to={`/empresa/${s.cnpj}`}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
                >
                  Ver detalhes
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
