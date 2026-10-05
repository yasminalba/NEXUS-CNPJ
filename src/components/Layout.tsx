import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  ArrowLeftRight,
  User,
  Shield,
  LayoutDashboard,
  Users,
  Building2,
  FileCheck2,
  ScrollText,
  Search,
  MapPin,
  History,
  FileEdit,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { SwitchAccountModal } from './SwitchAccountModal.tsx';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, openSwitchModal } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminSection = location.pathname.startsWith('/admin');

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 Zones (Brand | Navigation | Primary Actions) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            NexusCNPJ
          </Link>

          {/* Zone 2: Clean text navigation links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link
              to="/"
              className={`py-1 transition-colors whitespace-nowrap ${
                isActive('/')
                  ? 'text-slate-900 font-semibold border-b-2 border-blue-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Início
            </Link>
            <Link
              to="/consultar-cnpj"
              className={`py-1 transition-colors whitespace-nowrap ${
                isActive('/consultar-cnpj') || isActive('/empresa')
                  ? 'text-slate-900 font-semibold border-b-2 border-blue-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Consultar CNPJ
            </Link>
            <Link
              to="/mapa"
              className={`py-1 transition-colors whitespace-nowrap ${
                isActive('/mapa')
                  ? 'text-slate-900 font-semibold border-b-2 border-blue-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Mapa
            </Link>

            {user && (
              <>
                <Link
                  to="/carteira"
                  className={`py-1 transition-colors whitespace-nowrap ${
                    isActive('/carteira')
                      ? 'text-slate-900 font-semibold border-b-2 border-blue-600'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Carteira de Serviços
                </Link>
                <Link
                  to="/minhas-consultas"
                  className={`py-1 transition-colors whitespace-nowrap ${
                    isActive('/minhas-consultas')
                      ? 'text-slate-900 font-semibold border-b-2 border-blue-600'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Minhas Consultas
                </Link>
                <Link
                  to="/minhas-solicitacoes"
                  className={`py-1 transition-colors whitespace-nowrap ${
                    isActive('/minhas-solicitacoes')
                      ? 'text-slate-900 font-semibold border-b-2 border-blue-600'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Minhas Solicitações
                </Link>
              </>
            )}

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`py-1 transition-colors whitespace-nowrap ${
                  isActive('/admin')
                    ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                    : 'text-slate-700 hover:text-blue-600'
                }`}
              >
                Administração
              </Link>
            )}
          </nav>

          {/* Zone 3: 1-2 Primary Actions / User Controls */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap"
                >
                  Entrar
                </Link>
                <Link
                  to="/cadastro"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  Criar conta
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to={user.role === 'admin' ? '/admin' : '/funcionario'}
                  className="text-xs text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
                >
                  Olá, <strong className="font-semibold text-slate-900">{user.full_name.split(' ')[0]}</strong>
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="font-mono text-slate-500">
                    {user.role === 'admin' ? 'Admin' : 'Funcionário'}
                  </span>
                </Link>

                <Link
                  to="/perfil"
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    isActive('/perfil')
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Meu Perfil
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    openSwitchModal(user.role === 'admin' ? 'funcionario' : 'admin')
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  title="Trocar de conta mediante nova autenticação com login e senha"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  Trocar Conta
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
            {user && (
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Olá, {user.full_name}</p>
                  <p className="text-xs text-slate-500 font-mono">
                    {user.email} · {user.role === 'admin' ? 'Administrador' : 'Funcionário'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-1 text-sm font-medium text-slate-700">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                Início
              </Link>
              <Link
                to="/consultar-cnpj"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                Consultar CNPJ
              </Link>
              <Link
                to="/mapa"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                Mapa
              </Link>

              {user && (
                <>
                  <Link
                    to={user.role === 'admin' ? '/admin' : '/funcionario'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    {user.role === 'admin' ? 'Painel Administrativo' : 'Área do Funcionário'}
                  </Link>
                  <Link
                    to="/carteira"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    Carteira de Serviços
                  </Link>
                  <Link
                    to="/minhas-consultas"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    Minhas Consultas
                  </Link>
                  <Link
                    to="/minhas-solicitacoes"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    Minhas Solicitações
                  </Link>
                  <Link
                    to="/perfil"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    Meu Perfil
                  </Link>
                </>
              )}

              {user?.role === 'admin' && (
                <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
                  <p className="px-3 text-xs text-slate-400 font-semibold">Administração</p>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    Dashboard Admin
                  </Link>
                  <Link
                    to="/admin/usuarios"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    Usuários
                  </Link>
                  <Link
                    to="/admin/empresas"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    Empresas
                  </Link>
                  <Link
                    to="/admin/solicitacoes"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    Solicitações
                  </Link>
                  <Link
                    to="/admin/logs"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    Logs de Segurança
                  </Link>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
              {!user ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
                  >
                    Entrar
                  </Link>
                  <Link
                    to="/cadastro"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
                  >
                    Criar conta
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openSwitchModal(user.role === 'admin' ? 'funcionario' : 'admin');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Trocar Conta
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 rounded-lg"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area (with dedicated Admin / Employee workspace sub-navigation when applicable) */}
      {user?.role === 'admin' && isAdminSection ? (
        <div className="flex-1 max-w-[1440px] w-full mx-auto flex flex-col lg:flex-row">
          <aside className="w-full lg:w-64 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-4 lg:p-5">
            <div className="mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Área do Administrador</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{user.full_name}</p>
            </div>

            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
              <Link
                to="/admin"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  location.pathname === '/admin'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                Dashboard
              </Link>
              <Link
                to="/admin/usuarios"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  location.pathname.startsWith('/admin/usuarios')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                Usuários
              </Link>
              <Link
                to="/admin/empresas"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  location.pathname.startsWith('/admin/empresas')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                Empresas
              </Link>
              <Link
                to="/admin/solicitacoes"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  location.pathname.startsWith('/admin/solicitacoes')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                Solicitações
              </Link>
              <Link
                to="/admin/logs"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  location.pathname.startsWith('/admin/logs')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <ScrollText className="w-4 h-4 shrink-0" />
                Logs
              </Link>
            </nav>

            <div className="hidden lg:block mt-8 pt-4 border-t border-slate-100 space-y-1">
              <p className="px-3 text-xs text-slate-400 font-medium mb-1">Acesso Operacional</p>
              <Link
                to="/consultar-cnpj"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <Search className="w-4 h-4" />
                Consultar CNPJ
              </Link>
              <Link
                to="/mapa"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <MapPin className="w-4 h-4" />
                Mapa de Estabelecimentos
              </Link>
              <Link
                to="/carteira"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <Briefcase className="w-4 h-4" />
                Carteira de Serviços
              </Link>
              <Link
                to="/minhas-consultas"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <History className="w-4 h-4" />
                Minhas Consultas
              </Link>
              <Link
                to="/minhas-solicitacoes"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <FileEdit className="w-4 h-4" />
                Minhas Solicitações
              </Link>
              <Link
                to="/perfil"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <User className="w-4 h-4" />
                Meu Perfil
              </Link>
            </div>
          </aside>

          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      ) : (
        <main className="flex-1 w-full">{children}</main>
      )}

      {/* Clean Corporate Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-800">NexusCNPJ</span> · Plataforma Corporativa
            de Consulta Cadastral e Inteligência Geográfica
          </div>
          <div className="flex items-center gap-4">
            <Link to="/consultar-cnpj" className="hover:text-slate-800">
              Consultar CNPJ
            </Link>
            <span>·</span>
            <Link to="/mapa" className="hover:text-slate-800">
              Mapa
            </Link>
            <span>·</span>
            <a
              href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-800"
            >
              Termos Google Maps
            </a>
          </div>
        </div>
      </footer>

      <SwitchAccountModal />
    </div>
  );
};
