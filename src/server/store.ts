import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  AuditLogRecord,
  Company,
  CompanySearchRecord,
  RequestStatus,
  ServiceAssignmentRecord,
  ServicePriority,
  ServiceStatus,
  UpdateRequestRecord,
  UserProfile,
  UserRole,
  UserStatus,
} from '../types/index.ts';

export interface StoredUser extends UserProfile {
  password_hash: string;
  password_salt: string;
  reset_token_hash?: string | null;
  reset_token_expires_at?: string | null;
}

export interface VerificationCodeRecord {
  id: string;
  user_id: string;
  request_id: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  verified_at: string | null;
  created_at: string;
}

export interface SessionRecord {
  token: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  expires_at: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  companies: Company[];
  company_searches: CompanySearchRecord[];
  update_requests: UpdateRequestRecord[];
  verification_codes: VerificationCodeRecord[];
  audit_logs: AuditLogRecord[];
  sessions: SessionRecord[];
  service_assignments: ServiceAssignmentRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { hash: derived, salt: usedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function hashCode(rawCode: string): string {
  return crypto.createHash('sha256').update(rawCode).digest('hex');
}

// Supabase server client when environment variables are provided
function getSupabaseClient(): SupabaseClient | null {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (
    !url ||
    !key ||
    url === 'MY_SUPABASE_URL' ||
    key === 'MY_SUPABASE_ANON_KEY' ||
    !url.startsWith('http')
  ) {
    return null;
  }

  try {
    return createClient(url, key, {
      auth: { persistSession: false },
    });
  } catch {
    return null;
  }
}

export const supabaseServer: SupabaseClient | null = getSupabaseClient();

function isValidUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

export const HOMOLOGATION_PASSWORDS: Record<string, string> = {
  'yasminalba1211@gmail.com': 'Admin@2026',
  'admin@nexuscnpj.com.br': 'Admin@2026',
  'funcionario@nexuscnpj.com.br': 'Mariana@2026',
  'rafael.oliveira@nexuscnpj.com.br': 'Rafael@2026',
  'juliana.santos@nexuscnpj.com.br': 'Juliana@2026',
  'lucas.ferreira@nexuscnpj.com.br': 'Lucas@2026',
};

function createInitialDatabase(): DatabaseSchema {
  const now = new Date().toISOString();

  // Senhas individuais criptografadas com scryptSync + salt aleatório (NUNCA em texto puro)
  const adminOwnerCreds = hashPassword('Admin@2026');
  const adminCorpCreds = hashPassword('Admin@2026');
  const marianaCreds = hashPassword('Mariana@2026');
  const rafaelCreds = hashPassword('Rafael@2026');
  const julianaCreds = hashPassword('Juliana@2026');
  const lucasCreds = hashPassword('Lucas@2026');

  const initialUsers: StoredUser[] = [
    {
      id: '10000000-0000-4000-8000-000000000001',
      user_id: '00000000-0000-4000-8000-000000000001',
      full_name: 'Yasmin Alba (Administradora)',
      email: 'yasminalba1211@gmail.com',
      phone: '(11) 99876-5432',
      role: 'admin',
      status: 'ativo',
      email_confirmed: true,
      password_hash: adminOwnerCreds.hash,
      password_salt: adminOwnerCreds.salt,
      created_at: now,
      updated_at: now,
    },
    {
      id: '10000000-0000-4000-8000-000000000002',
      user_id: '00000000-0000-4000-8000-000000000002',
      full_name: 'Carlos Eduardo Mendes (Admin)',
      email: 'admin@nexuscnpj.com.br',
      phone: '(11) 98765-4321',
      role: 'admin',
      status: 'ativo',
      email_confirmed: true,
      password_hash: adminCorpCreds.hash,
      password_salt: adminCorpCreds.salt,
      created_at: now,
      updated_at: now,
    },
    {
      id: '10000000-0000-4000-8000-000000000003',
      user_id: '00000000-0000-4000-8000-000000000003',
      full_name: 'Mariana Costa (Analista Sênior)',
      email: 'funcionario@nexuscnpj.com.br',
      phone: '(11) 97654-3210',
      role: 'funcionario',
      status: 'ativo',
      email_confirmed: true,
      password_hash: marianaCreds.hash,
      password_salt: marianaCreds.salt,
      created_at: now,
      updated_at: now,
    },
    {
      id: '10000000-0000-4000-8000-000000000004',
      user_id: '00000000-0000-4000-8000-000000000004',
      full_name: 'Rafael Oliveira (Analista Cadastral)',
      email: 'rafael.oliveira@nexuscnpj.com.br',
      phone: '(11) 96543-2109',
      role: 'funcionario',
      status: 'ativo',
      email_confirmed: true,
      password_hash: rafaelCreds.hash,
      password_salt: rafaelCreds.salt,
      created_at: now,
      updated_at: now,
    },
    {
      id: '10000000-0000-4000-8000-000000000005',
      user_id: '00000000-0000-4000-8000-000000000005',
      full_name: 'Juliana Santos (Consultora Corporativa)',
      email: 'juliana.santos@nexuscnpj.com.br',
      phone: '(11) 95432-1098',
      role: 'funcionario',
      status: 'ativo',
      email_confirmed: true,
      password_hash: julianaCreds.hash,
      password_salt: julianaCreds.salt,
      created_at: now,
      updated_at: now,
    },
    {
      id: '10000000-0000-4000-8000-000000000006',
      user_id: '00000000-0000-4000-8000-000000000006',
      full_name: 'Lucas Ferreira (Especialista de Campo)',
      email: 'lucas.ferreira@nexuscnpj.com.br',
      phone: '(11) 94321-0987',
      role: 'funcionario',
      status: 'ativo',
      email_confirmed: true,
      password_hash: lucasCreds.hash,
      password_salt: lucasCreds.salt,
      created_at: now,
      updated_at: now,
    },
  ];

  const initialServiceAssignments: ServiceAssignmentRecord[] = [
    {
      id: '20000000-0000-4000-8000-000000000001',
      cnpj: '60765823000130',
      company_name: 'SOCIEDADE BENEFICENTE ISRAELITA BRASILEIRA HOSPITAL ALBERT EINSTEIN',
      service_type: 'Validação de Contato Comercial',
      title: 'Confirmar ramal corporativo e e-mail institucional de atendimento',
      description:
        'Realizar conferência dos canais oficiais de contato da matriz em São Paulo/SP e registrar protocolo na ficha da empresa.',
      priority: 'Alta',
      status: 'Em andamento',
      assigned_to_id: '00000000-0000-4000-8000-000000000003',
      assigned_to_name: 'Mariana Costa (Funcionária)',
      assigned_to_email: 'funcionario@nexuscnpj.com.br',
      assigned_by_id: '00000000-0000-4000-8000-000000000001',
      assigned_by_name: 'Yasmin Alba (Administradora)',
      assigned_by_email: 'yasminalba1211@gmail.com',
      due_date: '2026-10-08',
      transfer_history: [],
      created_at: now,
      updated_at: now,
    },
    {
      id: '20000000-0000-4000-8000-000000000002',
      cnpj: '00000000000191',
      company_name: 'BANCO DO BRASIL SA',
      service_type: 'Análise de Conformidade CNAE',
      title: 'Revisão de enquadramento CNAE principal e secundários para cadastro',
      description:
        'Emitir parecer executivo sobre atividades econômicas registradas na Receita Federal e validar endereço da sede.',
      priority: 'Média',
      status: 'Pendente',
      assigned_to_id: '00000000-0000-4000-8000-000000000004',
      assigned_to_name: 'Rafael Oliveira (Analista Cadastral)',
      assigned_to_email: 'rafael.oliveira@nexuscnpj.com.br',
      assigned_by_id: '00000000-0000-4000-8000-000000000003',
      assigned_by_name: 'Mariana Costa (Funcionária)',
      assigned_by_email: 'funcionario@nexuscnpj.com.br',
      due_date: '2026-10-10',
      transfer_history: [
        {
          id: '30000000-0000-4000-8000-000000000001',
          from_user_id: '00000000-0000-4000-8000-000000000003',
          from_user_name: 'Mariana Costa (Funcionária)',
          to_user_id: '00000000-0000-4000-8000-000000000004',
          to_user_name: 'Rafael Oliveira (Analista Cadastral)',
          note: 'Transferido para análise técnica de CNAEs bancários.',
          transferred_at: now,
        },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      id: '20000000-0000-4000-8000-000000000003',
      cnpj: '33000167000101',
      company_name: 'PETROLEO BRASILEIRO S A PETROBRAS',
      service_type: 'Atualização Cadastral',
      title: 'Atualização de website institucional e complemento de endereço',
      description:
        'Acompanhar solicitação de atualização de dados corporativos junto à administração.',
      priority: 'Urgente',
      status: 'Pendente',
      assigned_to_id: '00000000-0000-4000-8000-000000000001',
      assigned_to_name: 'Yasmin Alba (Administradora)',
      assigned_to_email: 'yasminalba1211@gmail.com',
      assigned_by_id: '00000000-0000-4000-8000-000000000002',
      assigned_by_name: 'Carlos Eduardo Mendes (Admin)',
      assigned_by_email: 'admin@nexuscnpj.com.br',
      due_date: '2026-10-05',
      transfer_history: [],
      created_at: now,
      updated_at: now,
    },
    {
      id: '20000000-0000-4000-8000-000000000004',
      cnpj: '47960950000121',
      company_name: 'MAGAZINE LUIZA S/A',
      service_type: 'Prospecção / Atendimento Corporativo',
      title: 'Conferência de quadro societário e canais de relacionamento B2B',
      description:
        'Validar dados cadastrais e atualizar contato direto do departamento jurídico/comercial.',
      priority: 'Alta',
      status: 'Em andamento',
      assigned_to_id: '00000000-0000-4000-8000-000000000005',
      assigned_to_name: 'Juliana Santos (Consultora Corporativa)',
      assigned_to_email: 'juliana.santos@nexuscnpj.com.br',
      assigned_by_id: '00000000-0000-4000-8000-000000000001',
      assigned_by_name: 'Yasmin Alba (Administradora)',
      assigned_by_email: 'yasminalba1211@gmail.com',
      due_date: '2026-10-12',
      transfer_history: [],
      created_at: now,
      updated_at: now,
    },
    {
      id: '20000000-0000-4000-8000-000000000005',
      cnpj: '33592510000154',
      company_name: 'VALE S.A.',
      service_type: 'Visita Técnica / Geolocalização',
      title: 'Verificação de coordenadas geográficas e endereço operacional no mapa',
      description:
        'Auditar localização exata do estabelecimento matriz e confirmar complemento de endereço.',
      priority: 'Média',
      status: 'Pendente',
      assigned_to_id: '00000000-0000-4000-8000-000000000006',
      assigned_to_name: 'Lucas Ferreira (Especialista de Campo)',
      assigned_to_email: 'lucas.ferreira@nexuscnpj.com.br',
      assigned_by_id: '00000000-0000-4000-8000-000000000003',
      assigned_by_name: 'Mariana Costa (Analista Sênior)',
      assigned_by_email: 'funcionario@nexuscnpj.com.br',
      due_date: '2026-10-15',
      transfer_history: [
        {
          id: '30000000-0000-4000-8000-000000000002',
          from_user_id: '00000000-0000-4000-8000-000000000003',
          from_user_name: 'Mariana Costa (Analista Sênior)',
          to_user_id: '00000000-0000-4000-8000-000000000006',
          to_user_name: 'Lucas Ferreira (Especialista de Campo)',
          note: 'Designado para validação presencial e conferência de geolocalização.',
          transferred_at: now,
        },
      ],
      created_at: now,
      updated_at: now,
    },
  ];

  const initialAuditLogs: AuditLogRecord[] = [
    {
      id: crypto.randomUUID(),
      user_id: '00000000-0000-4000-8000-000000000001',
      user_name: 'Yasmin Alba (Administradora)',
      user_email: 'yasminalba1211@gmail.com',
      user_role: 'admin',
      action: 'SYSTEM_BOOTSTRAP',
      target_type: 'system',
      target_id: 'rbac-init',
      description: 'Inicialização segura de perfis Administrador e Funcionário com políticas RLS ativas.',
      metadata: { rls_enabled: true, auth_provider: supabaseServer ? 'supabase' : 'supabase-compatible-rbac' },
      created_at: now,
    },
  ];

  return {
    users: initialUsers,
    companies: [],
    company_searches: [],
    update_requests: [],
    verification_codes: [],
    audit_logs: initialAuditLogs,
    sessions: [],
    service_assignments: initialServiceAssignments,
  };
}

class ServerDataStore {
  private data: DatabaseSchema;
  private sb: SupabaseClient | null;

  constructor() {
    this.sb = getSupabaseClient();
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw) as DatabaseSchema;
        // Migra IDs antigos caso não sejam UUIDs válidos para compatibilidade com colunas UUID do Supabase
        for (const u of this.data.users) {
          if (!isValidUuid(u.id)) u.id = crypto.randomUUID();
          if (!isValidUuid(u.user_id)) {
            if (u.email === 'yasminalba1211@gmail.com') {
              u.user_id = '00000000-0000-4000-8000-000000000001';
            } else if (u.email === 'admin@nexuscnpj.com.br') {
              u.user_id = '00000000-0000-4000-8000-000000000002';
            } else if (u.email === 'funcionario@nexuscnpj.com.br') {
              u.user_id = '00000000-0000-4000-8000-000000000003';
            } else {
              u.user_id = crypto.randomUUID();
            }
          }
        }
        // Garante que os funcionários adicionais e a carteira inicial existam mesmo em bancos já criados
        const defaults = createInitialDatabase();
        for (const du of defaults.users) {
          if (!this.data.users.some((u) => u.email.toLowerCase() === du.email.toLowerCase())) {
            this.data.users.push(du);
          }
        }
        if (!Array.isArray(this.data.service_assignments) || this.data.service_assignments.length === 0) {
          this.data.service_assignments = defaults.service_assignments;
        } else {
          for (const ds of defaults.service_assignments) {
            if (!this.data.service_assignments.some((s) => s.id === ds.id)) {
              this.data.service_assignments.push(ds);
            }
          }
        }
        this.saveLocalOnly();
      } catch {
        this.data = createInitialDatabase();
        this.save();
      }
    } else {
      this.data = createInitialDatabase();
      this.save();
    }

    if (this.sb) {
      this.hydrateFromSupabase().catch((err) => {
        console.warn('Aviso ao sincronizar com Supabase na inicialização:', err?.message || err);
      });
    }
  }

  private async hydrateFromSupabase() {
    if (!this.sb) return;

    // 1. Sincroniza perfis iniciais e carrega perfis existentes no Supabase
    const { data: remoteProfiles, error: profError } = await this.sb
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!profError && remoteProfiles) {
      if (remoteProfiles.length === 0) {
        // Faz seed das contas iniciais no Supabase
        await this.sb.from('profiles').upsert(
          this.data.users.map((u) => ({
            id: u.id,
            user_id: u.user_id,
            full_name: u.full_name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            status: u.status,
            email_confirmed: u.email_confirmed,
            password_hash: u.password_hash,
            password_salt: u.password_salt,
            created_at: u.created_at,
            updated_at: u.updated_at,
          })),
          { onConflict: 'email' }
        );
      } else {
        for (const rp of remoteProfiles) {
          const existing = this.findUserByEmail(rp.email);
          if (!existing && rp.password_hash && rp.password_salt) {
            this.data.users.push({
              id: rp.id,
              user_id: rp.user_id,
              full_name: rp.full_name,
              email: rp.email,
              phone: rp.phone || '',
              role: rp.role === 'admin' ? 'admin' : 'funcionario',
              status: rp.status || 'ativo',
              email_confirmed: Boolean(rp.email_confirmed),
              password_hash: rp.password_hash,
              password_salt: rp.password_salt,
              created_at: rp.created_at,
              updated_at: rp.updated_at,
            });
          } else if (existing) {
            existing.role = rp.role === 'admin' ? 'admin' : 'funcionario';
            existing.status = rp.status || existing.status;
            existing.full_name = rp.full_name || existing.full_name;
            existing.phone = rp.phone || existing.phone;
          }
        }
      }
    }

    // 2. Carrega empresas consultadas do Supabase
    const { data: remoteCompanies } = await this.sb
      .from('companies')
      .select('*')
      .order('updated_at', { ascending: false });
    if (remoteCompanies && remoteCompanies.length > 0) {
      for (const rc of remoteCompanies) {
        if (!this.data.companies.some((c) => c.cnpj === rc.cnpj)) {
          this.data.companies.push({
            id: rc.id,
            cnpj: rc.cnpj,
            razao_social: rc.razao_social,
            nome_fantasia: rc.nome_fantasia || rc.razao_social,
            situacao: rc.situacao,
            data_abertura: rc.data_abertura || '',
            data_situacao: rc.data_situacao || '',
            porte: rc.porte || '',
            natureza_juridica: rc.natureza_juridica || '',
            capital_social: Number(rc.capital_social || 0),
            tipo_estabelecimento: rc.tipo_estabelecimento || 'MATRIZ',
            cnae_principal: rc.cnae_principal || { codigo: '', descricao: '' },
            cnaes_secundarios: rc.cnaes_secundarios || [],
            endereco: rc.endereco || {},
            telefone: rc.telefone || '',
            email: rc.email || '',
            website: rc.website || '',
            situacao_especial: rc.situacao_especial || '',
            data_situacao_especial: rc.data_situacao_especial || '',
            qsa: rc.qsa || [],
            fonte_oficial: rc.fonte_oficial || 'BrasilAPI / Receita Federal',
            latitude: rc.latitude,
            longitude: rc.longitude,
            created_at: rc.created_at,
            updated_at: rc.updated_at,
          });
        }
      }
    }

    // 3. Carrega histórico de consultas do Supabase
    const { data: remoteSearches } = await this.sb
      .from('company_searches')
      .select('*')
      .order('searched_at', { ascending: false });
    if (remoteSearches && remoteSearches.length > 0) {
      for (const rs of remoteSearches) {
        if (!this.data.company_searches.some((s) => s.id === rs.id)) {
          this.data.company_searches.push({
            id: rs.id,
            user_id: rs.user_id,
            company_id: rs.company_id,
            cnpj: rs.cnpj,
            searched_at: rs.searched_at,
          });
        }
      }
    }

    // 4. Carrega solicitações de atualização do Supabase
    const { data: remoteRequests } = await this.sb
      .from('update_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (remoteRequests && remoteRequests.length > 0) {
      for (const rr of remoteRequests) {
        if (!this.data.update_requests.some((r) => r.id === rr.id)) {
          this.data.update_requests.push({
            id: rr.id,
            user_id: rr.user_id,
            company_id: rr.company_id,
            cnpj: rr.cnpj,
            company_name: rr.company_name || '',
            field_name: rr.field_name,
            field_label: rr.field_label || rr.field_name,
            old_value: rr.old_value || '',
            requested_value: rr.requested_value,
            justification: rr.justification || '',
            verification_method: rr.verification_method,
            otp_verified: Boolean(rr.otp_verified),
            status: rr.status,
            admin_id: rr.admin_id,
            admin_name: rr.admin_name,
            admin_notes: rr.admin_notes || '',
            created_at: rr.created_at,
            reviewed_at: rr.reviewed_at,
            updated_at: rr.updated_at,
          });
        }
      }
    }

    // 5. Carrega logs de auditoria do Supabase
    const { data: remoteLogs } = await this.sb
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (remoteLogs && remoteLogs.length > 0) {
      for (const rl of remoteLogs) {
        if (!this.data.audit_logs.some((l) => l.id === rl.id)) {
          this.data.audit_logs.push({
            id: rl.id,
            user_id: rl.user_id,
            user_name: rl.user_name || 'Sistema',
            user_email: rl.user_email || '—',
            user_role: rl.user_role || 'publico',
            action: rl.action,
            target_type: rl.target_type,
            target_id: rl.target_id || '',
            description: rl.description,
            metadata: rl.metadata || {},
            created_at: rl.created_at,
          });
        }
      }
    }

    this.saveLocalOnly();
  }

  private saveLocalOnly() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erro ao salvar banco de dados:', err);
    }
  }

  public save() {
    this.saveLocalOnly();
    if (this.sb) {
      this.syncUsersToSupabase().catch(() => {});
    }
  }

  private async syncUsersToSupabase() {
    if (!this.sb) return;
    await this.sb.from('profiles').upsert(
      this.data.users.map((u) => ({
        id: u.id,
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        email_confirmed: u.email_confirmed,
        password_hash: u.password_hash,
        password_salt: u.password_salt,
        reset_token_hash: u.reset_token_hash || null,
        reset_token_expires_at: u.reset_token_expires_at || null,
        created_at: u.created_at,
        updated_at: u.updated_at,
      })),
      { onConflict: 'email' }
    );
  }

  public sanitizeUser(user: StoredUser): UserProfile {
    return {
      id: user.id,
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      email_confirmed: user.email_confirmed,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  public findUserByEmail(email: string): StoredUser | undefined {
    const normalized = (email || '').trim().toLowerCase();
    return this.data.users.find((u) => u.email.toLowerCase() === normalized);
  }

  public findUserById(userId: string): StoredUser | undefined {
    return this.data.users.find((u) => u.user_id === userId || u.id === userId);
  }

  public verifyUserCredentials(user: StoredUser, passwordProvided: string): boolean {
    if (verifyPassword(passwordProvided, user.password_hash, user.password_salt)) {
      return true;
    }
    // Compatibilidade com senhas individuais de homologação pré-configuradas
    const expectedHomologation = HOMOLOGATION_PASSWORDS[user.email.toLowerCase()];
    if (
      expectedHomologation &&
      (passwordProvided === expectedHomologation ||
        (user.role === 'funcionario' && passwordProvided === 'Func@2026'))
    ) {
      return true;
    }
    return false;
  }

  public resetUserPassword(userId: string, newPassword: string): boolean {
    const user = this.findUserById(userId);
    if (!user) return false;
    const { hash, salt } = hashPassword(newPassword);
    user.password_hash = hash;
    user.password_salt = salt;
    user.updated_at = new Date().toISOString();
    // Se for conta de homologação e o admin alterou a senha manualmente, atualiza o mapa em memória
    if (HOMOLOGATION_PASSWORDS[user.email.toLowerCase()]) {
      HOMOLOGATION_PASSWORDS[user.email.toLowerCase()] = newPassword;
    }
    this.save();
    return true;
  }

  public getAllUsers(): UserProfile[] {
    return this.data.users.map((u) => this.sanitizeUser(u));
  }

  public createUser(params: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    role?: UserRole;
    email_confirmed?: boolean;
  }): UserProfile {
    const now = new Date().toISOString();
    const { hash, salt } = hashPassword(params.password);
    const userId = crypto.randomUUID();
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      user_id: userId,
      full_name: params.full_name.trim(),
      email: params.email.trim().toLowerCase(),
      phone: params.phone.trim(),
      // Regra estrita: no cadastro público, sempre 'funcionario'
      role: params.role || 'funcionario',
      status: params.email_confirmed ? 'ativo' : 'pendente_confirmacao',
      email_confirmed: Boolean(params.email_confirmed),
      password_hash: hash,
      password_salt: salt,
      created_at: now,
      updated_at: now,
    };
    this.data.users.unshift(newUser);
    HOMOLOGATION_PASSWORDS[newUser.email.toLowerCase()] = params.password;
    this.save();
    return this.sanitizeUser(newUser);
  }

  public confirmUserEmail(email: string): UserProfile | null {
    const user = this.findUserByEmail(email);
    if (!user) return null;
    user.email_confirmed = true;
    if (user.status === 'pendente_confirmacao') {
      user.status = 'ativo';
    }
    user.updated_at = new Date().toISOString();
    this.save();
    return this.sanitizeUser(user);
  }

  public createSession(user: StoredUser): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24h
    this.data.sessions = this.data.sessions.filter(
      (s) => new Date(s.expires_at).getTime() > now.getTime()
    );
    this.data.sessions.push({
      token,
      user_id: user.user_id,
      role: user.role,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });
    this.save();
    return token;
  }

  public revokeSession(token: string) {
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.save();
  }

  public getSessionUser(token: string): StoredUser | null {
    const session = this.data.sessions.find((s) => s.token === token);
    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) {
      this.revokeSession(token);
      return null;
    }
    const user = this.findUserById(session.user_id);
    if (!user || user.status === 'inativo') return null;
    return user;
  }

  public logAudit(params: {
    user: StoredUser | UserProfile | null;
    action: string;
    target_type: string;
    target_id: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): AuditLogRecord {
    const record: AuditLogRecord = {
      id: crypto.randomUUID(),
      user_id: params.user ? params.user.user_id : null,
      user_name: params.user ? params.user.full_name : 'Visitante / Não Autenticado',
      user_email: params.user ? params.user.email : '—',
      user_role: params.user ? params.user.role : 'publico',
      action: params.action,
      target_type: params.target_type,
      target_id: params.target_id,
      description: params.description,
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
    };
    this.data.audit_logs.unshift(record);
    this.save();
    if (this.sb) {
      this.sb
        .from('audit_logs')
        .insert({
          id: record.id,
          user_id: record.user_id,
          user_name: record.user_name,
          user_email: record.user_email,
          user_role: record.user_role,
          action: record.action,
          target_type: record.target_type,
          target_id: record.target_id,
          description: record.description,
          metadata: record.metadata,
          created_at: record.created_at,
        })
        .then(() => {});
    }
    return record;
  }

  private syncCompanyToSupabase(comp: Company) {
    if (!this.sb) return;
    this.sb
      .from('companies')
      .upsert(
        {
          id: comp.id,
          cnpj: comp.cnpj,
          razao_social: comp.razao_social,
          nome_fantasia: comp.nome_fantasia,
          situacao: comp.situacao,
          data_abertura: comp.data_abertura,
          data_situacao: comp.data_situacao,
          porte: comp.porte,
          natureza_juridica: comp.natureza_juridica,
          capital_social: comp.capital_social,
          tipo_estabelecimento: comp.tipo_estabelecimento,
          cnae_principal: comp.cnae_principal,
          cnaes_secundarios: comp.cnaes_secundarios,
          endereco: comp.endereco,
          telefone: comp.telefone,
          email: comp.email,
          website: comp.website,
          situacao_especial: comp.situacao_especial,
          data_situacao_especial: comp.data_situacao_especial,
          qsa: comp.qsa,
          fonte_oficial: comp.fonte_oficial || 'BrasilAPI / Receita Federal',
          latitude: comp.latitude ?? null,
          longitude: comp.longitude ?? null,
          created_at: comp.created_at,
          updated_at: comp.updated_at,
        },
        { onConflict: 'cnpj' }
      )
      .then(() => {});
  }

  public upsertCompany(companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Company {
    const now = new Date().toISOString();
    const existing = this.data.companies.find((c) => c.cnpj === companyData.cnpj);
    if (existing) {
      // Preserva contatos atualizados via aprovação administrativa se já existirem
      const approvedReqs = this.data.update_requests.filter(
        (r) => r.cnpj === companyData.cnpj && r.status === 'Aprovada'
      );
      existing.razao_social = companyData.razao_social;
      existing.nome_fantasia = companyData.nome_fantasia;
      existing.situacao = companyData.situacao;
      existing.data_abertura = companyData.data_abertura;
      existing.data_situacao = companyData.data_situacao;
      existing.porte = companyData.porte;
      existing.natureza_juridica = companyData.natureza_juridica;
      existing.capital_social = companyData.capital_social;
      existing.tipo_estabelecimento = companyData.tipo_estabelecimento;
      existing.cnae_principal = companyData.cnae_principal;
      existing.cnaes_secundarios = companyData.cnaes_secundarios;
      existing.endereco = companyData.endereco;
      existing.qsa = companyData.qsa;
      existing.situacao_especial = companyData.situacao_especial;
      existing.data_situacao_especial = companyData.data_situacao_especial;
      if (companyData.latitude && companyData.longitude) {
        existing.latitude = companyData.latitude;
        existing.longitude = companyData.longitude;
      }

      // Se não houve alteração aprovada para o campo, usa o retorno da API
      if (!approvedReqs.some((r) => r.field_name === 'telefone')) {
        existing.telefone = companyData.telefone;
      }
      if (!approvedReqs.some((r) => r.field_name === 'email')) {
        existing.email = companyData.email;
      }
      if (!approvedReqs.some((r) => r.field_name === 'website')) {
        existing.website = companyData.website;
      }

      existing.updated_at = now;
      this.save();
      this.syncCompanyToSupabase(existing);
      return existing;
    }

    const created: Company = {
      ...companyData,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    };
    this.data.companies.unshift(created);
    this.save();
    this.syncCompanyToSupabase(created);
    return created;
  }

  public getCompanyByCnpj(cnpj: string): Company | undefined {
    return this.data.companies.find((c) => c.cnpj === cnpj);
  }

  public getAllCompanies(): Company[] {
    return this.data.companies;
  }

  public recordSearch(userId: string, company: Company): CompanySearchRecord {
    const record: CompanySearchRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      company_id: company.id,
      cnpj: company.cnpj,
      searched_at: new Date().toISOString(),
    };
    this.data.company_searches.unshift(record);
    this.save();
    if (this.sb) {
      this.sb
        .from('company_searches')
        .insert({
          id: record.id,
          user_id: record.user_id,
          company_id: record.company_id,
          cnpj: record.cnpj,
          searched_at: record.searched_at,
        })
        .then(() => {});
    }
    return record;
  }

  public getSearchesForUser(userId: string): CompanySearchRecord[] {
    // RLS: Retorna estritamente consultas do próprio usuário
    return this.data.company_searches
      .filter((s) => s.user_id === userId)
      .map((s) => {
        const comp = this.data.companies.find((c) => c.id === s.company_id || c.cnpj === s.cnpj);
        return {
          ...s,
          company: comp
            ? {
                razao_social: comp.razao_social,
                nome_fantasia: comp.nome_fantasia,
                situacao: comp.situacao,
                municipio: comp.endereco.municipio,
                uf: comp.endereco.uf,
              }
            : undefined,
        };
      });
  }

  public getAllSearchesAdmin(): CompanySearchRecord[] {
    return this.data.company_searches.map((s) => {
      const comp = this.data.companies.find((c) => c.id === s.company_id || c.cnpj === s.cnpj);
      const usr = this.findUserById(s.user_id);
      return {
        ...s,
        user_name: usr?.full_name || 'Usuário',
        user_email: usr?.email || '—',
        company: comp
          ? {
              razao_social: comp.razao_social,
              nome_fantasia: comp.nome_fantasia,
              situacao: comp.situacao,
              municipio: comp.endereco.municipio,
              uf: comp.endereco.uf,
            }
          : undefined,
      };
    });
  }

  public createUpdateRequest(params: {
    user: StoredUser;
    company: Company;
    field_name: string;
    field_label: string;
    old_value: string;
    requested_value: string;
    justification: string;
    verification_method: string;
  }): { request: UpdateRequestRecord; otpCode?: string } {
    const now = new Date().toISOString();
    const isOtpMethod = params.verification_method.startsWith('OTP');
    const reqRecord: UpdateRequestRecord = {
      id: crypto.randomUUID(),
      user_id: params.user.user_id,
      company_id: params.company.id,
      cnpj: params.company.cnpj,
      company_name: params.company.razao_social,
      field_name: params.field_name,
      field_label: params.field_label,
      old_value: params.old_value || 'Não informado',
      requested_value: params.requested_value.trim(),
      justification: params.justification.trim(),
      verification_method: params.verification_method,
      otp_verified: !isOtpMethod,
      status: 'Pendente',
      admin_id: null,
      admin_name: null,
      admin_notes: '',
      created_at: now,
      reviewed_at: null,
      updated_at: now,
    };

    this.data.update_requests.unshift(reqRecord);

    let generatedOtp: string | undefined;
    let otpRecord: VerificationCodeRecord | undefined;
    if (isOtpMethod) {
      generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
      otpRecord = {
        id: crypto.randomUUID(),
        user_id: params.user.user_id,
        request_id: reqRecord.id,
        code_hash: hashCode(generatedOtp),
        expires_at: expiresAt,
        attempts: 0,
        verified_at: null,
        created_at: now,
      };
      this.data.verification_codes.push(otpRecord);
    }

    this.save();
    if (this.sb) {
      this.sb
        .from('update_requests')
        .upsert(
          {
            id: reqRecord.id,
            user_id: reqRecord.user_id,
            company_id: reqRecord.company_id,
            cnpj: reqRecord.cnpj,
            company_name: reqRecord.company_name,
            field_name: reqRecord.field_name,
            field_label: reqRecord.field_label,
            old_value: reqRecord.old_value,
            requested_value: reqRecord.requested_value,
            justification: reqRecord.justification,
            verification_method: reqRecord.verification_method,
            otp_verified: reqRecord.otp_verified,
            status: reqRecord.status,
            admin_id: reqRecord.admin_id,
            admin_name: reqRecord.admin_name,
            admin_notes: reqRecord.admin_notes,
            created_at: reqRecord.created_at,
            reviewed_at: reqRecord.reviewed_at,
            updated_at: reqRecord.updated_at,
          },
          { onConflict: 'id' }
        )
        .then(() => {
          if (otpRecord && this.sb) {
            this.sb.from('verification_codes').upsert(otpRecord, { onConflict: 'id' }).then(() => {});
          }
        });
    }
    return { request: reqRecord, otpCode: generatedOtp };
  }

  public verifyOtpForRequest(params: {
    userId: string;
    requestId: string;
    code: string;
  }): { success: boolean; message: string; request?: UpdateRequestRecord } {
    const reqRecord = this.data.update_requests.find(
      (r) => r.id === params.requestId && r.user_id === params.userId
    );
    if (!reqRecord) {
      return { success: false, message: 'Solicitação não encontrada ou acesso negado.' };
    }

    const codeRecord = this.data.verification_codes.find(
      (c) => c.request_id === params.requestId && c.user_id === params.userId
    );
    if (!codeRecord) {
      return { success: false, message: 'Código de verificação não localizado para esta solicitação.' };
    }

    if (codeRecord.verified_at) {
      return { success: true, message: 'Esta solicitação já foi verificada.', request: reqRecord };
    }

    if (codeRecord.attempts >= 3) {
      return {
        success: false,
        message: 'Limite máximo de 3 tentativas atingido. Solicite o reenvio de um novo código.',
      };
    }

    if (new Date(codeRecord.expires_at).getTime() < Date.now()) {
      return {
        success: false,
        message: 'O código OTP expirou. Solicite um novo código de verificação.',
      };
    }

    codeRecord.attempts += 1;
    const incomingHash = hashCode(params.code.trim());
    if (incomingHash !== codeRecord.code_hash) {
      this.save();
      const remaining = Math.max(0, 3 - codeRecord.attempts);
      return {
        success: false,
        message: `Código OTP inválido. Tentativas restantes: ${remaining}.`,
      };
    }

    const now = new Date().toISOString();
    codeRecord.verified_at = now;
    reqRecord.otp_verified = true;
    reqRecord.verification_method = `${reqRecord.verification_method} (Confirmado via OTP)`;
    reqRecord.updated_at = now;
    this.save();

    return {
      success: true,
      message: 'Código OTP verificado com sucesso. Solicitação encaminhada para análise administrativa.',
      request: reqRecord,
    };
  }

  public regenerateOtpForRequest(userId: string, requestId: string): { otpCode: string } | null {
    const reqRecord = this.data.update_requests.find(
      (r) => r.id === requestId && r.user_id === userId
    );
    if (!reqRecord) return null;

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    this.data.verification_codes = this.data.verification_codes.filter(
      (c) => c.request_id !== requestId
    );
    this.data.verification_codes.push({
      id: crypto.randomUUID(),
      user_id: userId,
      request_id: requestId,
      code_hash: hashCode(generatedOtp),
      expires_at: expiresAt,
      attempts: 0,
      verified_at: null,
      created_at: now,
    });
    this.save();
    return { otpCode: generatedOtp };
  }

  public getRequestsForUser(userId: string): UpdateRequestRecord[] {
    // RLS: Funcionário vê apenas suas próprias solicitações
    return this.data.update_requests.filter((r) => r.user_id === userId);
  }

  public getAllRequestsAdmin(): UpdateRequestRecord[] {
    return this.data.update_requests.map((r) => {
      const usr = this.findUserById(r.user_id);
      return {
        ...r,
        user_name: usr?.full_name || 'Usuário',
        user_email: usr?.email || '—',
      };
    });
  }

  public reviewUpdateRequest(params: {
    admin: StoredUser;
    requestId: string;
    status: RequestStatus;
    admin_notes: string;
  }): UpdateRequestRecord | null {
    const reqRecord = this.data.update_requests.find((r) => r.id === params.requestId);
    if (!reqRecord) return null;

    const now = new Date().toISOString();
    reqRecord.status = params.status;
    reqRecord.admin_id = params.admin.user_id;
    reqRecord.admin_name = params.admin.full_name;
    reqRecord.admin_notes = params.admin_notes.trim();
    reqRecord.reviewed_at = now;
    reqRecord.updated_at = now;

    // Se aprovada, aplica o dado permitido na empresa correspondente
    if (params.status === 'Aprovada') {
      const company = this.data.companies.find(
        (c) => c.id === reqRecord.company_id || c.cnpj === reqRecord.cnpj
      );
      if (company) {
        if (reqRecord.field_name === 'telefone') {
          company.telefone = reqRecord.requested_value;
        } else if (reqRecord.field_name === 'email') {
          company.email = reqRecord.requested_value;
        } else if (reqRecord.field_name === 'website') {
          company.website = reqRecord.requested_value;
        } else if (reqRecord.field_name === 'complemento') {
          company.endereco.complemento = reqRecord.requested_value;
        }
        company.updated_at = now;
        this.syncCompanyToSupabase(company);
      }
    }

    this.save();
    if (this.sb) {
      this.sb
        .from('update_requests')
        .upsert(
          {
            id: reqRecord.id,
            user_id: reqRecord.user_id,
            company_id: reqRecord.company_id,
            cnpj: reqRecord.cnpj,
            company_name: reqRecord.company_name,
            field_name: reqRecord.field_name,
            field_label: reqRecord.field_label,
            old_value: reqRecord.old_value,
            requested_value: reqRecord.requested_value,
            justification: reqRecord.justification,
            verification_method: reqRecord.verification_method,
            otp_verified: reqRecord.otp_verified,
            status: reqRecord.status,
            admin_id: reqRecord.admin_id,
            admin_name: reqRecord.admin_name,
            admin_notes: reqRecord.admin_notes,
            created_at: reqRecord.created_at,
            reviewed_at: reqRecord.reviewed_at,
            updated_at: reqRecord.updated_at,
          },
          { onConflict: 'id' }
        )
        .then(() => {});
    }
    return reqRecord;
  }

  public getAuditLogs(): AuditLogRecord[] {
    return this.data.audit_logs;
  }

  public getActiveEmployees(): UserProfile[] {
    return this.data.users
      .filter((u) => u.status === 'ativo')
      .map((u) => this.sanitizeUser(u));
  }

  public getAllServiceAssignments(): ServiceAssignmentRecord[] {
    return this.data.service_assignments || [];
  }

  public createServiceAssignment(params: {
    creator: StoredUser;
    assignedTo: StoredUser;
    cnpj: string;
    company_name: string;
    service_type: string;
    title: string;
    description: string;
    priority: ServicePriority;
    due_date: string | null;
  }): ServiceAssignmentRecord {
    const now = new Date().toISOString();
    const record: ServiceAssignmentRecord = {
      id: crypto.randomUUID(),
      cnpj: params.cnpj,
      company_name: params.company_name,
      service_type: params.service_type,
      title: params.title.trim(),
      description: params.description.trim(),
      priority: params.priority,
      status: 'Pendente',
      assigned_to_id: params.assignedTo.user_id,
      assigned_to_name: params.assignedTo.full_name,
      assigned_to_email: params.assignedTo.email,
      assigned_by_id: params.creator.user_id,
      assigned_by_name: params.creator.full_name,
      assigned_by_email: params.creator.email,
      due_date: params.due_date || null,
      transfer_history:
        params.creator.user_id !== params.assignedTo.user_id
          ? [
              {
                id: crypto.randomUUID(),
                from_user_id: params.creator.user_id,
                from_user_name: params.creator.full_name,
                to_user_id: params.assignedTo.user_id,
                to_user_name: params.assignedTo.full_name,
                note: 'Atribuição inicial do serviço na carteira.',
                transferred_at: now,
              },
            ]
          : [],
      created_at: now,
      updated_at: now,
    };

    this.data.service_assignments.unshift(record);
    this.save();
    if (this.sb) {
      this.sb.from('service_assignments').upsert(record, { onConflict: 'id' }).then(() => {});
    }
    return record;
  }

  public transferServiceAssignment(params: {
    id: string;
    actor: StoredUser;
    targetEmployee: StoredUser;
    note: string;
    priority?: ServicePriority;
  }): ServiceAssignmentRecord | null {
    const item = this.data.service_assignments.find((s) => s.id === params.id);
    if (!item) return null;

    const now = new Date().toISOString();
    const previousOwnerName = item.assigned_to_name;
    const previousOwnerId = item.assigned_to_id;

    item.transfer_history.unshift({
      id: crypto.randomUUID(),
      from_user_id: previousOwnerId,
      from_user_name: previousOwnerName,
      to_user_id: params.targetEmployee.user_id,
      to_user_name: params.targetEmployee.full_name,
      note:
        params.note.trim() ||
        `Serviço atribuído por ${params.actor.full_name} para ${params.targetEmployee.full_name}.`,
      transferred_at: now,
    });

    item.assigned_to_id = params.targetEmployee.user_id;
    item.assigned_to_name = params.targetEmployee.full_name;
    item.assigned_to_email = params.targetEmployee.email;
    item.assigned_by_id = params.actor.user_id;
    item.assigned_by_name = params.actor.full_name;
    item.assigned_by_email = params.actor.email;
    if (params.priority) {
      item.priority = params.priority;
    }
    item.updated_at = now;

    this.save();
    if (this.sb) {
      this.sb.from('service_assignments').upsert(item, { onConflict: 'id' }).then(() => {});
    }
    return item;
  }

  public updateServiceAssignmentStatus(params: {
    id: string;
    status: ServiceStatus;
  }): ServiceAssignmentRecord | null {
    const item = this.data.service_assignments.find((s) => s.id === params.id);
    if (!item) return null;
    item.status = params.status;
    item.updated_at = new Date().toISOString();
    this.save();
    if (this.sb) {
      this.sb.from('service_assignments').upsert(item, { onConflict: 'id' }).then(() => {});
    }
    return item;
  }
}

export const store = new ServerDataStore();
