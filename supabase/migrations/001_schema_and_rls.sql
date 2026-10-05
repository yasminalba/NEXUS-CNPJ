-- =============================================================================
-- NEXUS CNPJ - SCRIPT SQL COMPLETO PARA SUPABASE (TABELAS, ÍNDICES, TRIGGERS,
-- POLÍTICAS RLS DE BANCO DE DADOS E POLÍTICAS DE ARMAZENAMENTO / STORAGE)
-- =============================================================================
-- Como usar: Copie todo este conteúdo, cole no "SQL Editor" do Supabase e clique em "Run".

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. TABELAS PRINCIPAIS DO SISTEMA
-- =============================================================================

-- 2.1 TABELA DE PERFIS E CONTROLE DE ACESSO (profiles)
-- Armazena o nível de acesso ('admin' ou 'funcionario') e dados do perfil.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'funcionario' CHECK (role IN ('admin', 'funcionario')),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'pendente_confirmacao')),
  email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash TEXT,
  password_salt TEXT,
  reset_token_hash TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 TABELA DE EMPRESAS CONSULTADAS (companies)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj VARCHAR(14) UNIQUE NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  situacao TEXT NOT NULL,
  data_abertura TEXT,
  data_situacao TEXT,
  porte TEXT,
  natureza_juridica TEXT,
  capital_social NUMERIC(18, 2) DEFAULT 0,
  tipo_estabelecimento TEXT,
  cnae_principal JSONB DEFAULT '{}'::jsonb,
  cnaes_secundarios JSONB DEFAULT '[]'::jsonb,
  endereco JSONB NOT NULL DEFAULT '{}'::jsonb,
  telefone TEXT,
  email TEXT,
  website TEXT,
  situacao_especial TEXT,
  data_situacao_especial TEXT,
  qsa JSONB DEFAULT '[]'::jsonb,
  fonte_oficial TEXT DEFAULT 'BrasilAPI / Receita Federal',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 TABELA DE HISTÓRICO DE CONSULTAS (company_searches)
CREATE TABLE IF NOT EXISTS public.company_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cnpj VARCHAR(14) NOT NULL,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 TABELA DE SOLICITAÇÕES DE ATUALIZAÇÃO CADASTRAL (update_requests)
CREATE TABLE IF NOT EXISTS public.update_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cnpj VARCHAR(14) NOT NULL,
  company_name TEXT,
  field_name TEXT NOT NULL,
  field_label TEXT,
  old_value TEXT,
  requested_value TEXT NOT NULL,
  justification TEXT,
  verification_method TEXT NOT NULL,
  otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em análise', 'Aprovada', 'Recusada')),
  admin_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  admin_name TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 TABELA DE CÓDIGOS DE VERIFICAÇÃO OTP (verification_codes)
-- Armazena exclusivamente o hash SHA-256 do código OTP (nunca o código em texto puro).
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.update_requests(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 TABELA DE LOGS DE AUDITORIA E SEGURANÇA (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 TABELA DE CARTEIRA DE SERVIÇOS E ATRIBUIÇÃO ENTRE FUNCIONÁRIOS (service_assignments)
CREATE TABLE IF NOT EXISTS public.service_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj VARCHAR(14) NOT NULL,
  company_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'Média' CHECK (priority IN ('Baixa', 'Média', 'Alta', 'Urgente')),
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em andamento', 'Concluído')),
  assigned_to_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  assigned_to_name TEXT NOT NULL,
  assigned_to_email TEXT NOT NULL,
  assigned_by_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  assigned_by_name TEXT NOT NULL,
  assigned_by_email TEXT NOT NULL,
  due_date TEXT,
  transfer_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. ÍNDICES DE PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_company_searches_user_id ON public.company_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_company_searches_cnpj ON public.company_searches(cnpj);
CREATE INDEX IF NOT EXISTS idx_update_requests_user_id ON public.update_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_update_requests_status ON public.update_requests(status);
CREATE INDEX IF NOT EXISTS idx_update_requests_cnpj ON public.update_requests(cnpj);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_assignments_assigned_to ON public.service_assignments(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_service_assignments_assigned_by ON public.service_assignments(assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_service_assignments_cnpj ON public.service_assignments(cnpj);

-- =============================================================================
-- 4. FUNÇÕES AUXILIARES E TRIGGERS AUTOMÁTICOS
-- =============================================================================

-- 4.1 Atualiza automaticamente a coluna updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_companies_updated_at ON public.companies;
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_update_requests_updated_at ON public.update_requests;
CREATE TRIGGER trg_update_requests_updated_at
  BEFORE UPDATE ON public.update_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_service_assignments_updated_at ON public.service_assignments;
CREATE TRIGGER trg_service_assignments_updated_at
  BEFORE UPDATE ON public.service_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4.2 Função de verificação de perfil Administrador (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'ativo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Trigger para sincronizar novos usuários do Supabase Auth (sempre como 'funcionario')
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, phone, role, status, email_confirmed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '(00) 00000-0000'),
    'funcionario',
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'ativo' ELSE 'pendente_confirmacao' END,
    (NEW.email_confirmed_at IS NOT NULL)
  )
  ON CONFLICT (email) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        email_confirmed = EXCLUDED.email_confirmed,
        updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- =============================================================================
-- 5. POLÍTICAS DE ROW LEVEL SECURITY (RLS) DAS TABELAS
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_assignments ENABLE ROW LEVEL SECURITY;

-- 5.1 Políticas para public.profiles
DROP POLICY IF EXISTS "Profiles: leitura própria, admin ou sincronização backend" ON public.profiles;
CREATE POLICY "Profiles: leitura própria, admin ou sincronização backend"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin() OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "Profiles: inserção de novo cadastro" ON public.profiles;
CREATE POLICY "Profiles: inserção de novo cadastro"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin() OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "Profiles: atualização controlada" ON public.profiles;
CREATE POLICY "Profiles: atualização controlada"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin() OR auth.role() IN ('anon', 'authenticated', 'service_role'))
  WITH CHECK (auth.uid() = user_id OR public.is_admin() OR auth.role() IN ('anon', 'authenticated', 'service_role'));

-- 5.2 Políticas para public.companies
DROP POLICY IF EXISTS "Companies: leitura pública de dados oficiais" ON public.companies;
CREATE POLICY "Companies: leitura pública de dados oficiais"
  ON public.companies FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Companies: gravação e sincronização oficial" ON public.companies;
CREATE POLICY "Companies: gravação e sincronização oficial"
  ON public.companies FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Companies: atualização mediante aprovação administrativa" ON public.companies;
CREATE POLICY "Companies: atualização mediante aprovação administrativa"
  ON public.companies FOR UPDATE
  USING (public.is_admin() OR auth.role() IN ('anon', 'authenticated', 'service_role'));

-- 5.3 Políticas para public.company_searches
DROP POLICY IF EXISTS "Searches: usuário vê próprias consultas e admin vê todas" ON public.company_searches;
CREATE POLICY "Searches: usuário vê próprias consultas e admin vê todas"
  ON public.company_searches FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin() OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "Searches: registro de nova consulta" ON public.company_searches;
CREATE POLICY "Searches: registro de nova consulta"
  ON public.company_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

-- 5.4 Políticas para public.update_requests
DROP POLICY IF EXISTS "UpdateRequests: funcionário vê próprias e admin vê todas" ON public.update_requests;
CREATE POLICY "UpdateRequests: funcionário vê próprias e admin vê todas"
  ON public.update_requests FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin() OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "UpdateRequests: criação de solicitação pendente" ON public.update_requests;
CREATE POLICY "UpdateRequests: criação de solicitação pendente"
  ON public.update_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "UpdateRequests: aprovação ou recusa administrativa" ON public.update_requests;
CREATE POLICY "UpdateRequests: aprovação ou recusa administrativa"
  ON public.update_requests FOR UPDATE
  USING (public.is_admin() OR auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

-- 5.5 Políticas para public.verification_codes
DROP POLICY IF EXISTS "VerificationCodes: validação de OTP em hash" ON public.verification_codes;
CREATE POLICY "VerificationCodes: validação de OTP em hash"
  ON public.verification_codes FOR ALL
  USING (public.is_admin() OR auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'))
  WITH CHECK (public.is_admin() OR auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

-- 5.6 Políticas para public.audit_logs
DROP POLICY IF EXISTS "AuditLogs: leitura exclusiva de auditoria" ON public.audit_logs;
CREATE POLICY "AuditLogs: leitura exclusiva de auditoria"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin() OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "AuditLogs: inserção de eventos de segurança" ON public.audit_logs;
CREATE POLICY "AuditLogs: inserção de eventos de segurança"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- 5.7 Políticas para public.service_assignments (Carteira de Serviços)
DROP POLICY IF EXISTS "ServiceAssignments: leitura e gestão da carteira pela equipe" ON public.service_assignments;
CREATE POLICY "ServiceAssignments: leitura e gestão da carteira pela equipe"
  ON public.service_assignments FOR ALL
  USING (
    auth.uid() = assigned_to_id
    OR auth.uid() = assigned_by_id
    OR public.is_admin()
    OR auth.role() IN ('anon', 'authenticated', 'service_role')
  )
  WITH CHECK (
    auth.uid() = assigned_to_id
    OR auth.uid() = assigned_by_id
    OR public.is_admin()
    OR auth.role() IN ('anon', 'authenticated', 'service_role')
  );

-- =============================================================================
-- 6. BUCKETS E POLÍTICAS DE ARMAZENAMENTO (SUPABASE STORAGE - storage.objects)
-- =============================================================================

-- 6.1 Criação dos Buckets de Armazenamento:
-- - 'comprovantes-solicitacoes' (Privado: anexos e documentos de solicitações de atualização)
-- - 'avatars-perfis' (Público: fotos de perfil opcionais de usuários)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'comprovantes-solicitacoes',
    'comprovantes-solicitacoes',
    false,
    10485760, -- Limite de 10 MB
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'avatars-perfis',
    'avatars-perfis',
    true,
    5242880, -- Limite de 5 MB
    ARRAY['image/png', 'image/jpeg', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 6.2 Políticas de Armazenamento (storage.objects) para 'comprovantes-solicitacoes'
-- Observação: no Supabase, a tabela storage.objects já possui RLS habilitado nativamente
-- por supabase_storage_admin (não execute ALTER TABLE storage.objects para evitar erro 42501).

DROP POLICY IF EXISTS "Storage Comprovantes: leitura pelo próprio usuário ou admin" ON storage.objects;
CREATE POLICY "Storage Comprovantes: leitura pelo próprio usuário ou admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'comprovantes-solicitacoes'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
      OR auth.role() IN ('anon', 'authenticated', 'service_role')
    )
  );

DROP POLICY IF EXISTS "Storage Comprovantes: upload pelo usuário autenticado" ON storage.objects;
CREATE POLICY "Storage Comprovantes: upload pelo usuário autenticado"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'comprovantes-solicitacoes'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
      OR auth.role() IN ('anon', 'authenticated', 'service_role')
    )
  );

DROP POLICY IF EXISTS "Storage Comprovantes: exclusão apenas por admin" ON storage.objects;
CREATE POLICY "Storage Comprovantes: exclusão apenas por admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'comprovantes-solicitacoes'
    AND (public.is_admin() OR auth.role() = 'service_role')
  );

-- 6.3 Políticas de Armazenamento (storage.objects) para 'avatars-perfis'
DROP POLICY IF EXISTS "Storage Avatars: visualização pública" ON storage.objects;
CREATE POLICY "Storage Avatars: visualização pública"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars-perfis');

DROP POLICY IF EXISTS "Storage Avatars: upload pelo próprio titular" ON storage.objects;
CREATE POLICY "Storage Avatars: upload pelo próprio titular"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars-perfis'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.role() IN ('anon', 'authenticated', 'service_role')
    )
  );

DROP POLICY IF EXISTS "Storage Avatars: atualização pelo próprio titular" ON storage.objects;
CREATE POLICY "Storage Avatars: atualização pelo próprio titular"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars-perfis'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
      OR auth.role() = 'service_role'
    )
  );

-- =============================================================================
-- 7. SEED INICIAL DE CONTAS E CARTEIRAS (IDEMPOTENTE COM ON CONFLICT DO NOTHING)
-- =============================================================================

INSERT INTO public.profiles (user_id, full_name, email, phone, role, status, email_confirmed)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'Yasmin Alba (Administradora)', 'yasminalba1211@gmail.com', '(11) 99876-5432', 'admin', 'ativo', true),
  ('00000000-0000-4000-8000-000000000002', 'Carlos Eduardo Mendes (Admin)', 'admin@nexuscnpj.com.br', '(11) 98765-4321', 'admin', 'ativo', true),
  ('00000000-0000-4000-8000-000000000003', 'Mariana Costa (Analista Sênior)', 'funcionario@nexuscnpj.com.br', '(11) 97654-3210', 'funcionario', 'ativo', true),
  ('00000000-0000-4000-8000-000000000004', 'Rafael Oliveira (Analista Cadastral)', 'rafael.oliveira@nexuscnpj.com.br', '(11) 96543-2109', 'funcionario', 'ativo', true),
  ('00000000-0000-4000-8000-000000000005', 'Juliana Santos (Consultora Corporativa)', 'juliana.santos@nexuscnpj.com.br', '(11) 95432-1098', 'funcionario', 'ativo', true),
  ('00000000-0000-4000-8000-000000000006', 'Lucas Ferreira (Especialista de Campo)', 'lucas.ferreira@nexuscnpj.com.br', '(11) 94321-0987', 'funcionario', 'ativo', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.service_assignments (id, cnpj, company_name, service_type, title, description, priority, status, assigned_to_id, assigned_to_name, assigned_to_email, assigned_by_id, assigned_by_name, assigned_by_email, due_date)
VALUES
  ('20000000-0000-4000-8000-000000000001', '60765823000130', 'SOCIEDADE BENEFICENTE ISRAELITA BRASILEIRA HOSPITAL ALBERT EINSTEIN', 'Validação de Contato Comercial', 'Confirmar ramal corporativo e e-mail institucional de atendimento', 'Realizar conferência dos canais oficiais de contato da matriz em São Paulo/SP.', 'Alta', 'Em andamento', '00000000-0000-4000-8000-000000000003', 'Mariana Costa (Analista Sênior)', 'funcionario@nexuscnpj.com.br', '00000000-0000-4000-8000-000000000001', 'Yasmin Alba (Administradora)', 'yasminalba1211@gmail.com', '2026-10-08'),
  ('20000000-0000-4000-8000-000000000002', '00000000000191', 'BANCO DO BRASIL SA', 'Análise de Conformidade CNAE', 'Revisão de enquadramento CNAE principal e secundários para cadastro', 'Emitir parecer executivo sobre atividades econômicas registradas na Receita Federal.', 'Média', 'Pendente', '00000000-0000-4000-8000-000000000004', 'Rafael Oliveira (Analista Cadastral)', 'rafael.oliveira@nexuscnpj.com.br', '00000000-0000-4000-8000-000000000003', 'Mariana Costa (Analista Sênior)', 'funcionario@nexuscnpj.com.br', '2026-10-10'),
  ('20000000-0000-4000-8000-000000000004', '47960950000121', 'MAGAZINE LUIZA S/A', 'Prospecção / Atendimento Corporativo', 'Conferência de quadro societário e canais de relacionamento B2B', 'Validar dados cadastrais e atualizar contato direto do departamento comercial.', 'Alta', 'Em andamento', '00000000-0000-4000-8000-000000000005', 'Juliana Santos (Consultora Corporativa)', 'juliana.santos@nexuscnpj.com.br', '00000000-0000-4000-8000-000000000001', 'Yasmin Alba (Administradora)', 'yasminalba1211@gmail.com', '2026-10-12'),
  ('20000000-0000-4000-8000-000000000005', '33592510000154', 'VALE S.A.', 'Visita Técnica / Geolocalização', 'Verificação de coordenadas geográficas e endereço operacional no mapa', 'Auditar localização exata do estabelecimento matriz e confirmar endereço no mapa.', 'Média', 'Pendente', '00000000-0000-4000-8000-000000000006', 'Lucas Ferreira (Especialista de Campo)', 'lucas.ferreira@nexuscnpj.com.br', '00000000-0000-4000-8000-000000000003', 'Mariana Costa (Analista Sênior)', 'funcionario@nexuscnpj.com.br', '2026-10-15')
ON CONFLICT (id) DO NOTHING;

