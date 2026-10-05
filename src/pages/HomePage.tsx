import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  History,
  FileEdit,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Building2,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { formatCnpj, validateCnpj } from '../utils/cnpj.ts';

const OFFICIAL_REAL_CNPJS = [
  { label: 'Banco do Brasil S.A.', cnpj: '00000000000191', formatted: '00.000.000/0001-91' },
  { label: 'Petróleo Brasileiro S.A. (Petrobras)', cnpj: '33000167000101', formatted: '33.000.167/0001-01' },
  { label: 'Magazine Luiza S/A', cnpj: '47960950000121', formatted: '47.960.950/0001-21' },
  { label: 'Hospital Israelita Albert Einstein', cnpj: '60765823000130', formatted: '60.765.823/0001-30' },
];

export const HomePage: React.FC = () => {
  const { user, logout, openSwitchModal } = useAuth();
  const navigate = useNavigate();

  const [cnpjInput, setCnpjInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = validateCnpj(cnpjInput);
    if (!result.valid) {
      setError(result.error || 'CNPJ inválido.');
      return;
    }
    navigate(`/empresa/${result.cleaned}`);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 space-y-14">
      {/* Hero Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 lg:p-12">
        <div className="max-w-3xl space-y-6">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
            <span>Base Cadastral Receita Federal</span>
            <span aria-hidden="true">·</span>
            <span>Google Maps Platform</span>
            <span aria-hidden="true">·</span>
            <span>Controle de Acesso Auditado</span>
          </div>

          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 leading-tight"
            style={{ textWrap: 'balance' }}
          >
            Consulte empresas de forma rápida e segura
          </h1>

          <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
            Plataforma corporativa integrada para consulta oficial de informações cadastrais de
            empresas (CNPJ), localização de estabelecimentos próximos no mapa e gestão auditada de
            solicitações de atualização cadastral.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="pt-2 space-y-2.5 max-w-2xl">
            <label htmlFor="home-cnpj-input" className="block text-xs font-semibold text-slate-700">
              Digite o CNPJ (com ou sem pontuação)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="home-cnpj-input"
                  type="text"
                  value={cnpjInput}
                  onChange={(e) => {
                    setCnpjInput(formatCnpj(e.target.value));
                    if (error) setError(null);
                  }}
                  placeholder="Ex: 00.000.000/0001-91 ou 00000000000191"
                  maxLength={18}
                  className="w-full pl-10 pr-4 py-3 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
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

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick real CNPJs for instant verification */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Consultas reais rápidas:</span>
              {OFFICIAL_REAL_CNPJS.map((item) => (
                <button
                  key={item.cnpj}
                  type="button"
                  onClick={() => navigate(`/empresa/${item.cnpj}`)}
                  className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-mono transition-colors whitespace-nowrap"
                >
                  {item.label} ({item.formatted})
                </button>
              ))}
            </div>
          </form>

          {/* Session Status Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            {!user ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-600">
                  Acesse sua conta para salvar histórico de consultas e solicitar atualização de dados:
                </span>
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  Entrar
                </Link>
                <Link
                  to="/cadastro"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  Criar conta
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 w-full justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Olá, <strong className="text-slate-900">{user.full_name}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs font-mono text-slate-500">
                    Perfil: {user.role === 'admin' ? 'ADMINISTRADOR' : 'FUNCIONÁRIO'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={user.role === 'admin' ? '/admin' : '/funcionario'}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Acessar sistema ({user.role === 'admin' ? 'Painel Admin' : 'Área do Funcionário'})
                  </Link>
                  <button
                    type="button"
                    onClick={() => openSwitchModal(user.role === 'admin' ? 'funcionario' : 'admin')}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Trocar de Conta
                  </button>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Shortcuts Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Atalhos da Plataforma</h2>
          <span className="text-xs text-slate-500">Acesso direto aos módulos operacionais</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/consultar-cnpj"
            className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-600 transition-colors flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Consultar CNPJ</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consulte razão social, situação cadastral, CNAEs, quadro societário, capital social e
                endereço completo em tempo real.
              </p>
            </div>
            <div className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1">
              <span>Acessar consulta</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/mapa"
            className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-600 transition-colors flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Explorar no mapa</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Localize hospitais, clínicas, farmácias, bancos e empresas próximas via Google Maps
                Platform com filtros de distância.
              </p>
            </div>
            <div className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1">
              <span>Abrir mapa interativo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/minhas-consultas"
            className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-600 transition-colors flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Minhas consultas</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Visualize e pesquise em seu histórico individual de empresas consultadas, protegido por
                Row Level Security (RLS).
              </p>
            </div>
            <div className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1">
              <span>Ver meu histórico</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/minhas-solicitacoes"
            className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-600 transition-colors flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileEdit className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Minhas solicitações</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Acompanhe o status de solicitações de atualização cadastral (Pendente, Em análise,
                Aprovada ou Recusada).
              </p>
            </div>
            <div className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1">
              <span>Acompanhar solicitações</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </section>

      {/* Architecture & Security Overview Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Segurança por Perfil (RBAC & RLS)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Separação rigorosa entre <strong>Funcionário</strong> e <strong>Administrador</strong>.
              A troca de conta exige nova autenticação com e-mail e senha, e ações administrativas
              críticas exigem confirmação de identidade.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Dados Oficiais Auditados</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Usuários não alteram dados oficiais diretamente. Toda solicitação de atualização passa
              por verificação OTP (com expiração e limite de tentativas) e análise administrativa.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Geolocalização Transparente</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Integração real com Google Maps Platform para busca de estabelecimentos próximos,
              cálculo de distância e rotas, respeitando a privacidade da sua localização.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
