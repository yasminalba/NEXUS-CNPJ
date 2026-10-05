/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AuthProvider } from './context/AuthContext.tsx';
import { Layout } from './components/Layout.tsx';
import { ProtectedRoute, AdminRoute } from './components/RouteGuards.tsx';

// Páginas Públicas
import { HomePage } from './pages/HomePage.tsx';
import { ConsultarCnpjPage } from './pages/ConsultarCnpjPage.tsx';
import { EmpresaDetailsPage } from './pages/EmpresaDetailsPage.tsx';
import { MapaPage } from './pages/MapaPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { CadastroPage } from './pages/CadastroPage.tsx';
import { RecuperarSenhaPage } from './pages/RecuperarSenhaPage.tsx';

// Páginas Protegidas (Funcionário / Autenticado)
import { FuncionarioDashboardPage } from './pages/FuncionarioDashboardPage.tsx';
import { CarteiraPage } from './pages/CarteiraPage.tsx';
import { MinhasConsultasPage } from './pages/MinhasConsultasPage.tsx';
import { MinhasSolicitacoesPage } from './pages/MinhasSolicitacoesPage.tsx';
import { PerfilPage } from './pages/PerfilPage.tsx';

// Páginas Exclusivas do Administrador
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx';
import { AdminUsuariosPage } from './pages/admin/AdminUsuariosPage.tsx';
import { AdminSolicitacoesPage } from './pages/admin/AdminSolicitacoesPage.tsx';
import { AdminEmpresasPage } from './pages/admin/AdminEmpresasPage.tsx';
import { AdminLogsPage } from './pages/admin/AdminLogsPage.tsx';

const INITIAL_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_API_KEY || '';

export default function App() {
  const [mapsApiKey, setMapsApiKey] = useState<string>(INITIAL_API_KEY);

  useEffect(() => {
    if (!mapsApiKey || mapsApiKey === 'YOUR_API_KEY') {
      fetch('/api/public-config')
        .then((res) => res.json())
        .then((data) => {
          if (data?.googleMapsApiKey) {
            setMapsApiKey(data.googleMapsApiKey);
          }
        })
        .catch(() => {});
    }
  }, [mapsApiKey]);

  const hasValidKey = Boolean(mapsApiKey) && mapsApiKey !== 'YOUR_API_KEY';

  const appRoutes = (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/" element={<HomePage />} />
            <Route path="/consultar-cnpj" element={<ConsultarCnpjPage />} />
            <Route path="/empresa/:cnpj" element={<EmpresaDetailsPage />} />
            <Route path="/mapa" element={<MapaPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<CadastroPage />} />
            <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />

            {/* Rotas Protegidas (Funcionário / Usuário Autenticado) */}
            <Route
              path="/funcionario"
              element={
                <ProtectedRoute>
                  <FuncionarioDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/carteira"
              element={
                <ProtectedRoute>
                  <CarteiraPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/minhas-consultas"
              element={
                <ProtectedRoute>
                  <MinhasConsultasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/minhas-solicitacoes"
              element={
                <ProtectedRoute>
                  <MinhasSolicitacoesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <PerfilPage />
                </ProtectedRoute>
              }
            />

            {/* Rotas Exclusivas do Administrador */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <AdminRoute>
                  <AdminUsuariosPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/solicitacoes"
              element={
                <AdminRoute>
                  <AdminSolicitacoesPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/empresas"
              element={
                <AdminRoute>
                  <AdminEmpresasPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <AdminRoute>
                  <AdminLogsPage />
                </AdminRoute>
              }
            />

            {/* Redirecionamento padrão */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );

  if (!hasValidKey) {
    return appRoutes;
  }

  return (
    <APIProvider apiKey={mapsApiKey} version="weekly">
      {appRoutes}
    </APIProvider>
  );
}
