import React, { useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-slate-600 font-medium">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, apiFetch, openSwitchModal } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') {
      apiFetch('/api/security/unauthorized-attempt', {
        method: 'POST',
        body: JSON.stringify({ attempted_path: location.pathname }),
      }).catch(() => {});
    }
  }, [loading, user, location.pathname, apiFetch]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-slate-600 font-medium">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto my-16 px-6">
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">Acesso não autorizado.</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sua conta atual (<span className="font-mono text-slate-800">{user.email}</span>) possui
              nível de acesso <strong>Funcionário</strong> e não possui permissão para acessar rotas
              administrativas (<span className="font-mono">{location.pathname}</span>).
            </p>
            <p className="text-xs text-slate-500">
              Esta tentativa de acesso foi registrada nos logs de segurança do sistema.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/funcionario"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Área do Funcionário
            </Link>
            <button
              type="button"
              onClick={() => openSwitchModal('admin')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <KeyRound className="w-4 h-4" />
              Entrar com conta de Administrador
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
