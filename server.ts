import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { fetchOfficialCnpjData } from './src/server/cnpjService.ts';
import {
  hashCode,
  hashPassword,
  HOMOLOGATION_PASSWORDS,
  store,
  StoredUser,
  verifyPassword,
} from './src/server/store.ts';
import { cleanCnpj, validateCnpj } from './src/utils/cnpj.ts';
import type { RequestStatus, ServicePriority, ServiceStatus, UserRole } from './src/types/index.ts';

dotenv.config();

const app = express();
app.use(express.json({ limit: '1mb' }));

interface AuthenticatedRequest extends Request {
  currentUser?: StoredUser;
  sessionToken?: string;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function extractSessionUser(req: Request): { user: StoredUser | null; token?: string } {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null };
  }
  const token = authHeader.slice(7).trim();
  if (!token) return { user: null };
  const user = store.getSessionUser(token);
  return { user, token };
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { user, token } = extractSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Autenticação necessária para acessar este recurso.' });
    return;
  }
  req.currentUser = user;
  req.sessionToken = token;
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { user, token } = extractSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }
  if (user.role !== 'admin') {
    store.logAudit({
      user,
      action: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
      target_type: 'route',
      target_id: req.originalUrl,
      description: `Bloqueada tentativa de acesso administrativo por usuário com perfil "${user.role}".`,
      metadata: { ip: getClientIp(req), path: req.originalUrl, method: req.method },
    });
    res.status(403).json({ error: 'Acesso não autorizado.' });
    return;
  }
  req.currentUser = user;
  req.sessionToken = token;
  next();
}

// =============================================================================
// 1. AUTENTICAÇÃO, CADASTRO, CONFIRMAÇÃO DE E-MAIL, RECUPERAÇÃO E TROCA DE CONTA
// =============================================================================

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { full_name, email, phone, password, confirm_password, accepted_terms } = req.body || {};

  if (!full_name || String(full_name).trim().length < 3) {
    res.status(400).json({ error: 'Informe seu nome completo.' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(String(email).trim())) {
    res.status(400).json({ error: 'Informe um endereço de e-mail válido.' });
    return;
  }

  const phoneDigits = String(phone || '').replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    res.status(400).json({ error: 'Informe um telefone válido com DDD (10 ou 11 dígitos).' });
    return;
  }

  if (!password || String(password).length < 8) {
    res.status(400).json({ error: 'A senha deve possuir no mínimo 8 caracteres.' });
    return;
  }

  if (password !== confirm_password) {
    res.status(400).json({ error: 'A confirmação de senha não coincide com a senha digitada.' });
    return;
  }

  if (!accepted_terms) {
    res.status(400).json({
      error: 'É necessário ler e concordar com os Termos de Uso e Política de Privacidade.',
    });
    return;
  }

  const existing = store.findUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'Já existe uma conta cadastrada com este endereço de e-mail.' });
    return;
  }

  // No cadastro público, NUNCA permite criar como administrador. Sempre 'funcionario'.
  const profile = store.createUser({
    full_name: String(full_name),
    email: String(email),
    phone: String(phone),
    password: String(password),
    role: 'funcionario',
    email_confirmed: false,
  });

  store.logAudit({
    user: profile,
    action: 'USER_REGISTERED',
    target_type: 'profile',
    target_id: profile.user_id,
    description: `Novo cadastro público realizado como FUNCIONÁRIO (${profile.email}). Aguardando confirmação de e-mail.`,
    metadata: { ip: getClientIp(req), role: 'funcionario' },
  });

  res.status(201).json({
    message: 'Enviamos um link de confirmação para seu e-mail.',
    profile,
  });
});

app.post('/api/auth/confirm-email', (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) {
    res.status(400).json({ error: 'E-mail obrigatório.' });
    return;
  }

  const confirmed = store.confirmUserEmail(String(email));
  if (!confirmed) {
    res.status(404).json({ error: 'Conta não localizada para confirmação.' });
    return;
  }

  store.logAudit({
    user: confirmed,
    action: 'EMAIL_CONFIRMED',
    target_type: 'profile',
    target_id: confirmed.user_id,
    description: `E-mail confirmado com sucesso para a conta ${confirmed.email}.`,
    metadata: { ip: getClientIp(req) },
  });

  res.json({
    message: 'E-mail confirmado com sucesso! Sua conta está ativa para login.',
    profile: confirmed,
  });
});

app.post('/api/auth/resend-confirmation', (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) {
    res.status(400).json({ error: 'Informe o e-mail para reenvio.' });
    return;
  }
  const user = store.findUserByEmail(String(email));
  if (user) {
    store.logAudit({
      user,
      action: 'RESEND_EMAIL_CONFIRMATION',
      target_type: 'profile',
      target_id: user.user_id,
      description: `Reenvio de link de confirmação solicitado para ${user.email}.`,
      metadata: { ip: getClientIp(req) },
    });
  }
  res.json({
    message: 'Enviamos um link de confirmação para seu e-mail.',
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    return;
  }

  const user = store.findUserByEmail(String(email));
  // Mensagem genérica de segurança: nunca informa qual campo está incorreto
  if (!user || !store.verifyUserCredentials(user, String(password))) {
    store.logAudit({
      user: user || null,
      action: 'LOGIN_FAILED',
      target_type: 'auth',
      target_id: String(email).toLowerCase(),
      description: `Tentativa de login mal-sucedida para o identificador ${String(email).toLowerCase()}.`,
      metadata: { ip: getClientIp(req) },
    });
    res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    return;
  }

  if (user.status === 'inativo') {
    store.logAudit({
      user,
      action: 'LOGIN_BLOCKED_INACTIVE',
      target_type: 'auth',
      target_id: user.user_id,
      description: `Tentativa de login bloqueada para usuário desativado (${user.email}).`,
      metadata: { ip: getClientIp(req) },
    });
    res.status(403).json({
      error: 'Esta conta encontra-se desativada pelo administrador do sistema.',
    });
    return;
  }

  if (!user.email_confirmed) {
    res.status(403).json({
      error: 'Confirme seu endereço de e-mail antes de acessar o sistema.',
      requires_email_confirmation: true,
      email: user.email,
    });
    return;
  }

  const token = store.createSession(user);
  const sanitized = store.sanitizeUser(user);

  store.logAudit({
    user,
    action: 'USER_LOGIN',
    target_type: 'session',
    target_id: user.user_id,
    description: `Sessão autenticada iniciada por ${user.full_name} [Perfil: ${user.role.toUpperCase()}].`,
    metadata: { ip: getClientIp(req), role: user.role },
  });

  res.json({
    token,
    user: sanitized,
  });
});

app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.sessionToken) {
    store.revokeSession(req.sessionToken);
  }
  if (req.currentUser) {
    store.logAudit({
      user: req.currentUser,
      action: 'USER_LOGOUT',
      target_type: 'session',
      target_id: req.currentUser.user_id,
      description: `Logout realizado por ${req.currentUser.full_name}.`,
      metadata: { ip: getClientIp(req) },
    });
  }
  res.json({ message: 'Sessão encerrada com sucesso.' });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: store.sanitizeUser(req.currentUser!) });
});

// DIRETÓRIO DE CONTAS E ACESSOS INDIVIDUAIS DE FUNCIONÁRIOS
app.get('/api/auth/accounts-directory', (_req: Request, res: Response) => {
  const users = store.getAllUsers().filter((u) => u.status === 'ativo');
  const assignments = store.getAllServiceAssignments();

  const accounts = users.map((u) => {
    const myServices = assignments.filter((a) => a.assigned_to_id === u.user_id);
    return {
      user_id: u.user_id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      portfolio_count: myServices.length,
      pending_count: myServices.filter((a) => a.status !== 'Concluído').length,
      access_password_hint: HOMOLOGATION_PASSWORDS[u.email.toLowerCase()] || null,
    };
  });

  res.json({ accounts });
});

// TROCA DE CONTA / PERFIL (Exige obrigatoriamente E-mail e Senha para nova autenticação)
app.post('/api/auth/switch-account', (req: AuthenticatedRequest, res: Response) => {
  const { user: previousUser, token: previousToken } = extractSessionUser(req);
  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    return;
  }

  const targetUser = store.findUserByEmail(String(email));
  if (
    !targetUser ||
    !store.verifyUserCredentials(targetUser, String(password))
  ) {
    store.logAudit({
      user: previousUser,
      action: 'ACCOUNT_SWITCH_FAILED',
      target_type: 'auth',
      target_id: String(email).toLowerCase(),
      description: `Falha de autenticação ao tentar alternar sessão para ${String(email).toLowerCase()}.`,
      metadata: {
        ip: getClientIp(req),
        previous_user: previousUser?.email || 'não autenticado',
      },
    });
    res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    return;
  }

  if (targetUser.status === 'inativo') {
    res.status(403).json({ error: 'A conta informada encontra-se desativada.' });
    return;
  }

  if (!targetUser.email_confirmed) {
    res.status(403).json({
      error: 'A conta informada ainda aguarda confirmação de e-mail.',
    });
    return;
  }

  // Encerra sessão anterior e cria nova sessão verificada pelo banco
  if (previousToken) {
    store.revokeSession(previousToken);
  }

  const newToken = store.createSession(targetUser);
  const sanitized = store.sanitizeUser(targetUser);

  store.logAudit({
    user: targetUser,
    action: 'ACCOUNT_SWITCH_SUCCESS',
    target_type: 'session',
    target_id: targetUser.user_id,
    description: `Troca de conta autenticada: de "${previousUser?.email || 'sessão anterior'}" (${previousUser?.role || '—'}) para "${targetUser.email}" (${targetUser.role.toUpperCase()}).`,
    metadata: {
      ip: getClientIp(req),
      from_user: previousUser?.email || null,
      from_role: previousUser?.role || null,
      to_user: targetUser.email,
      to_role: targetUser.role,
    },
  });

  res.json({
    token: newToken,
    user: sanitized,
    redirect_to: targetUser.role === 'admin' ? '/admin' : '/funcionario',
  });
});

// RECUPERAÇÃO DE SENHA
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) {
    res.status(400).json({ error: 'Informe seu endereço de e-mail.' });
    return;
  }

  const user = store.findUserByEmail(String(email));
  let recoveryToken: string | undefined;

  if (user) {
    recoveryToken = crypto.randomBytes(16).toString('hex');
    user.reset_token_hash = hashCode(recoveryToken);
    user.reset_token_expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    store.save();

    store.logAudit({
      user,
      action: 'PASSWORD_RECOVERY_REQUESTED',
      target_type: 'profile',
      target_id: user.user_id,
      description: `Solicitado link de recuperação de senha para ${user.email}.`,
      metadata: { ip: getClientIp(req) },
    });
  }

  res.json({
    message: 'Enviamos um link seguro de recuperação para o e-mail informado.',
    recovery_token: recoveryToken,
  });
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email, token, new_password, confirm_password } = req.body || {};

  if (!email || !token || !new_password) {
    res.status(400).json({ error: 'Preencha todos os campos para redefinir sua senha.' });
    return;
  }

  if (String(new_password).length < 8) {
    res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
    return;
  }

  if (new_password !== confirm_password) {
    res.status(400).json({ error: 'A confirmação da nova senha não confere.' });
    return;
  }

  const user = store.findUserByEmail(String(email));
  if (
    !user ||
    !user.reset_token_hash ||
    user.reset_token_hash !== hashCode(String(token)) ||
    !user.reset_token_expires_at ||
    new Date(user.reset_token_expires_at).getTime() < Date.now()
  ) {
    res.status(400).json({
      error: 'Link de recuperação inválido ou expirado. Solicite um novo link.',
    });
    return;
  }

  const { hash, salt } = hashPassword(String(new_password));
  user.password_hash = hash;
  user.password_salt = salt;
  user.reset_token_hash = null;
  user.reset_token_expires_at = null;
  user.updated_at = new Date().toISOString();
  store.save();

  store.logAudit({
    user,
    action: 'PASSWORD_RESET_COMPLETED',
    target_type: 'profile',
    target_id: user.user_id,
    description: `Senha redefinida com sucesso através de link de recuperação para ${user.email}.`,
    metadata: { ip: getClientIp(req) },
  });

  res.json({ message: 'Senha alterada com sucesso.' });
});

// =============================================================================
// 2. PERFIL DO USUÁRIO LOGADO (Protegido - Proibido alterar role)
// =============================================================================

app.put('/api/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const { full_name, phone, current_password, new_password } = req.body || {};

  if (!current_password || !store.verifyUserCredentials(user, String(current_password))) {
    res.status(401).json({
      error: 'Confirme sua senha atual corretamente para alterar seus dados pessoais.',
    });
    return;
  }

  if (full_name && String(full_name).trim().length >= 3) {
    user.full_name = String(full_name).trim();
  }

  if (phone && String(phone).replace(/\D/g, '').length >= 10) {
    user.phone = String(phone).trim();
  }

  if (new_password) {
    if (String(new_password).length < 8) {
      res.status(400).json({ error: 'A nova senha deve possuir no mínimo 8 caracteres.' });
      return;
    }
    store.resetUserPassword(user.user_id, String(new_password));
  }

  user.updated_at = new Date().toISOString();
  store.save();

  store.logAudit({
    user,
    action: 'PROFILE_UPDATED',
    target_type: 'profile',
    target_id: user.user_id,
    description: `Dados cadastrais do perfil atualizados pelo próprio titular (${user.email}).`,
    metadata: { ip: getClientIp(req), password_changed: Boolean(new_password) },
  });

  res.json({
    message: 'Informações pessoais atualizadas com sucesso.',
    user: store.sanitizeUser(user),
  });
});

// Registro de tentativa de acesso não autorizado vinda do guard de rota frontend
app.post('/api/security/unauthorized-attempt', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { attempted_path } = req.body || {};
  store.logAudit({
    user: req.currentUser!,
    action: 'ROUTE_GUARD_BLOCKED_ADMIN_URL',
    target_type: 'route',
    target_id: String(attempted_path || '/admin'),
    description: `Acesso bloqueado à rota restrita "${attempted_path}" para usuário com role "${req.currentUser!.role}".`,
    metadata: { ip: getClientIp(req), attempted_path },
  });
  res.json({ logged: true });
});

// =============================================================================
// 3. CONSULTA OFICIAL DE CNPJ E HISTÓRICO (RLS)
// =============================================================================

app.get('/api/cnpj/:cnpj', async (req: Request, res: Response) => {
  const rawCnpj = req.params.cnpj || '';
  const validation = validateCnpj(rawCnpj);

  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  try {
    const officialData = await fetchOfficialCnpjData(validation.cleaned);
    const savedCompany = store.upsertCompany(officialData);

    // Se o usuário estiver autenticado, registra no histórico individual (company_searches)
    const { user } = extractSessionUser(req);
    if (user) {
      store.recordSearch(user.user_id, savedCompany);
      store.logAudit({
        user,
        action: 'CNPJ_SEARCHED',
        target_type: 'company',
        target_id: savedCompany.cnpj,
        description: `Consulta de CNPJ ${savedCompany.cnpj} (${savedCompany.razao_social}) realizada por ${user.full_name}.`,
        metadata: { ip: getClientIp(req), cnpj: savedCompany.cnpj },
      });
    }

    res.json({ company: savedCompany });
  } catch (error: any) {
    res.status(404).json({
      error: error?.message || 'Não foi possível carregar os dados deste CNPJ.',
    });
  }
});

// Tenta identificar CNPJ real no banco de empresas já consultadas quando selecionado no mapa
app.get('/api/companies/match', (req: Request, res: Response) => {
  const name = String(req.query.name || '').trim().toLowerCase();
  const cnpjParam = cleanCnpj(String(req.query.cnpj || ''));

  if (cnpjParam.length === 14) {
    const byCnpj = store.getCompanyByCnpj(cnpjParam);
    if (byCnpj) {
      res.json({ found: true, company: byCnpj });
      return;
    }
  }

  if (name.length >= 4) {
    const companies = store.getAllCompanies();
    const matched = companies.find(
      (c) =>
        c.razao_social.toLowerCase().includes(name) ||
        (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(name)) ||
        name.includes(c.nome_fantasia?.toLowerCase() || '____')
    );
    if (matched) {
      res.json({ found: true, company: matched });
      return;
    }
  }

  // Nunca inventa CNPJ se não estiver disponível em fonte confiável
  res.json({ found: false, message: 'CNPJ não disponível para este estabelecimento.' });
});

app.get('/api/my-searches', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const searches = store.getSearchesForUser(req.currentUser!.user_id);
  res.json({ searches });
});

// =============================================================================
// 4. SOLICITAÇÕES DE ATUALIZAÇÃO DE DADOS E VERIFICAÇÃO OTP
// =============================================================================

const ALLOWED_UPDATE_FIELDS: Record<string, string> = {
  telefone: 'Telefone Comercial',
  email: 'E-mail Corporativo',
  website: 'Website Oficial',
  complemento: 'Complemento de Endereço',
};

app.post('/api/requests', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const { cnpj, field_name, requested_value, justification, verification_method } = req.body || {};

  const cleanedCnpj = cleanCnpj(String(cnpj || ''));
  const company = store.getCompanyByCnpj(cleanedCnpj);
  if (!company) {
    res.status(404).json({
      error: 'Consulte a empresa primeiramente antes de registrar uma solicitação de atualização.',
    });
    return;
  }

  if (!field_name || !ALLOWED_UPDATE_FIELDS[field_name]) {
    res.status(400).json({
      error: 'Campo não permitido para solicitação de atualização.',
    });
    return;
  }

  if (!requested_value || String(requested_value).trim().length < 3) {
    res.status(400).json({
      error: 'Informe o novo dado solicitado de forma válida.',
    });
    return;
  }

  let oldValue = '';
  if (field_name === 'telefone') oldValue = company.telefone;
  else if (field_name === 'email') oldValue = company.email;
  else if (field_name === 'website') oldValue = company.website || 'Não informado';
  else if (field_name === 'complemento') oldValue = company.endereco.complemento || 'Não informado';

  if (String(oldValue).trim().toLowerCase() === String(requested_value).trim().toLowerCase()) {
    res.status(400).json({
      error: 'O novo dado informado é idêntico ao dado atual registrado.',
    });
    return;
  }

  const { request, otpCode } = store.createUpdateRequest({
    user,
    company,
    field_name,
    field_label: ALLOWED_UPDATE_FIELDS[field_name],
    old_value: oldValue,
    requested_value: String(requested_value),
    justification: String(justification || 'Atualização cadastral de contato empresarial.'),
    verification_method: String(verification_method || 'OTP por E-mail'),
  });

  store.logAudit({
    user,
    action: 'UPDATE_REQUEST_CREATED',
    target_type: 'update_request',
    target_id: request.id,
    description: `Solicitação de atualização criada para ${company.razao_social} (${company.cnpj}) — Campo: ${ALLOWED_UPDATE_FIELDS[field_name]}.`,
    metadata: {
      ip: getClientIp(req),
      cnpj: company.cnpj,
      field_name,
      verification_method: request.verification_method,
    },
  });

  res.status(201).json({
    message: otpCode
      ? 'Solicitação registrada. Confirme o código OTP enviado para concluir a verificação.'
      : 'Solicitação registrada e encaminhada para análise manual da administração.',
    request,
    requires_otp: Boolean(otpCode),
    // Entregue apenas no envelope de transporte da resposta de criação para simulação de recebimento de e-mail/SMS em ambiente sem SMTP externo
    simulated_dispatch_notice: otpCode
      ? `Código OTP enviado para confirmação (válido por 10 min, máx. 3 tentativas): ${otpCode}`
      : undefined,
  });
});

app.post('/api/requests/:id/verify-otp', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const requestId = req.params.id;
  const { code } = req.body || {};

  if (!code || String(code).trim().length !== 6) {
    res.status(400).json({ error: 'Informe o código OTP de 6 dígitos.' });
    return;
  }

  const result = store.verifyOtpForRequest({
    userId: user.user_id,
    requestId,
    code: String(code),
  });

  store.logAudit({
    user,
    action: result.success ? 'OTP_VERIFICATION_SUCCESS' : 'OTP_VERIFICATION_FAILED',
    target_type: 'update_request',
    target_id: requestId,
    description: result.message,
    metadata: { ip: getClientIp(req) },
  });

  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  res.json({
    message: result.message,
    request: result.request,
  });
});

app.post('/api/requests/:id/resend-otp', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const requestId = req.params.id;
  const regen = store.regenerateOtpForRequest(user.user_id, requestId);

  if (!regen) {
    res.status(404).json({ error: 'Solicitação não encontrada.' });
    return;
  }

  store.logAudit({
    user,
    action: 'OTP_RESENT',
    target_type: 'update_request',
    target_id: requestId,
    description: `Novo código OTP gerado para a solicitação ${requestId}.`,
    metadata: { ip: getClientIp(req) },
  });

  res.json({
    message: 'Novo código OTP enviado com sucesso.',
    simulated_dispatch_notice: `Novo código OTP enviado (válido por 10 min): ${regen.otpCode}`,
  });
});

app.get('/api/my-requests', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const requests = store.getRequestsForUser(req.currentUser!.user_id);
  res.json({ requests });
});

app.get('/api/my-requests/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.currentUser!;
  const all = user.role === 'admin' ? store.getAllRequestsAdmin() : store.getRequestsForUser(user.user_id);
  const found = all.find((r) => r.id === req.params.id);

  if (!found) {
    res.status(404).json({ error: 'Solicitação não encontrada ou acesso não autorizado.' });
    return;
  }

  const company = store.getCompanyByCnpj(found.cnpj);
  res.json({ request: found, company });
});

// =============================================================================
// 4.5 CARTEIRA DE SERVIÇOS E ATRIBUIÇÃO ENTRE FUNCIONÁRIOS
// =============================================================================

app.get('/api/portfolio', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  const assignments = store.getAllServiceAssignments();
  const employees = store.getActiveEmployees();
  res.json({ assignments, employees });
});

app.post('/api/portfolio', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const creator = req.currentUser!;
  const {
    cnpj,
    company_name,
    service_type,
    title,
    description,
    priority,
    assigned_to_id,
    due_date,
  } = req.body || {};

  const validation = validateCnpj(String(cnpj || ''));
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  if (!title || String(title).trim().length < 3) {
    res.status(400).json({ error: 'Informe um título para o serviço na carteira.' });
    return;
  }

  const targetUser = assigned_to_id ? store.findUserById(String(assigned_to_id)) : creator;
  if (!targetUser || targetUser.status !== 'ativo') {
    res.status(404).json({ error: 'Funcionário selecionado não encontrado ou inativo.' });
    return;
  }

  let resolvedCompanyName = String(company_name || '').trim();
  if (!resolvedCompanyName) {
    const existingComp = store.getCompanyByCnpj(validation.cleaned);
    if (existingComp) {
      resolvedCompanyName = existingComp.razao_social;
    } else {
      try {
        const official = await fetchOfficialCnpjData(validation.cleaned);
        const saved = store.upsertCompany(official);
        resolvedCompanyName = saved.razao_social;
      } catch {
        resolvedCompanyName = `Empresa CNPJ ${validation.cleaned}`;
      }
    }
  }

  const validPriorities: ServicePriority[] = ['Baixa', 'Média', 'Alta', 'Urgente'];
  const chosenPriority: ServicePriority = validPriorities.includes(priority) ? priority : 'Média';

  const created = store.createServiceAssignment({
    creator,
    assignedTo: targetUser,
    cnpj: validation.cleaned,
    company_name: resolvedCompanyName,
    service_type: String(service_type || 'Atualização Cadastral'),
    title: String(title),
    description: String(description || ''),
    priority: chosenPriority,
    due_date: due_date ? String(due_date) : null,
  });

  store.logAudit({
    user: creator,
    action: 'SERVICE_ASSIGNED_IN_PORTFOLIO',
    target_type: 'service_assignment',
    target_id: created.id,
    description: `Serviço "${created.title}" (${created.company_name}) atribuído para ${targetUser.full_name} por ${creator.full_name}.`,
    metadata: {
      ip: getClientIp(req),
      cnpj: created.cnpj,
      assigned_to: targetUser.email,
      priority: created.priority,
    },
  });

  res.status(201).json({
    message: `Serviço atribuído com sucesso para ${targetUser.full_name}.`,
    assignment: created,
  });
});

app.put('/api/portfolio/:id/assign', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.currentUser!;
  const { id } = req.params;
  const { target_user_id, note, priority } = req.body || {};

  if (!target_user_id) {
    res.status(400).json({ error: 'Selecione o funcionário que receberá o serviço.' });
    return;
  }

  const targetEmployee = store.findUserById(String(target_user_id));
  if (!targetEmployee || targetEmployee.status !== 'ativo') {
    res.status(404).json({ error: 'Funcionário de destino não encontrado ou inativo.' });
    return;
  }

  const validPriorities: ServicePriority[] = ['Baixa', 'Média', 'Alta', 'Urgente'];
  const updated = store.transferServiceAssignment({
    id,
    actor,
    targetEmployee,
    note: String(note || ''),
    priority: validPriorities.includes(priority) ? priority : undefined,
  });

  if (!updated) {
    res.status(404).json({ error: 'Serviço não encontrado na carteira.' });
    return;
  }

  store.logAudit({
    user: actor,
    action: 'SERVICE_TRANSFERRED_TO_EMPLOYEE',
    target_type: 'service_assignment',
    target_id: updated.id,
    description: `Serviço "${updated.title}" (${updated.company_name}) atribuído/transferido por ${actor.full_name} para ${targetEmployee.full_name}.`,
    metadata: {
      ip: getClientIp(req),
      cnpj: updated.cnpj,
      to_employee: targetEmployee.email,
      note: String(note || ''),
    },
  });

  res.json({
    message: `Serviço atribuído para ${targetEmployee.full_name} com sucesso.`,
    assignment: updated,
  });
});

app.put('/api/portfolio/:id/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.currentUser!;
  const { id } = req.params;
  const { status } = req.body || {};

  const validStatuses: ServiceStatus[] = ['Pendente', 'Em andamento', 'Concluído'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Status inválido.' });
    return;
  }

  const existingItem = store.getAllServiceAssignments().find((s) => s.id === id);
  if (!existingItem) {
    res.status(404).json({ error: 'Serviço não encontrado na carteira.' });
    return;
  }

  if (existingItem.assigned_to_id !== actor.user_id && actor.role !== 'admin') {
    res.status(403).json({
      error: `Este serviço pertence à carteira individual de ${existingItem.assigned_to_name}. Entre no acesso deste funcionário ou como Administrador para alterar o status.`,
    });
    return;
  }

  const updated = store.updateServiceAssignmentStatus({ id, status });
  if (!updated) {
    res.status(404).json({ error: 'Serviço não encontrado na carteira.' });
    return;
  }

  store.logAudit({
    user: actor,
    action: 'SERVICE_STATUS_UPDATED',
    target_type: 'service_assignment',
    target_id: updated.id,
    description: `Status do serviço "${updated.title}" atualizado para "${status}" por ${actor.full_name}.`,
    metadata: { ip: getClientIp(req), status },
  });

  res.json({
    message: `Status do serviço atualizado para "${status}".`,
    assignment: updated,
  });
});

// Cadastrar novo funcionário com acesso individual diretamente pela Carteira de Serviços
app.post('/api/portfolio/employees', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.currentUser!;
  const { full_name, email, phone, password } = req.body || {};

  if (!full_name || String(full_name).trim().length < 3) {
    res.status(400).json({ error: 'Informe o nome completo do funcionário (mínimo 3 caracteres).' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(String(email).trim())) {
    res.status(400).json({ error: 'Informe um endereço de e-mail válido para o login do funcionário.' });
    return;
  }

  if (!phone || String(phone).replace(/\D/g, '').length < 10) {
    res.status(400).json({ error: 'Informe um telefone válido com DDD.' });
    return;
  }

  if (!password || String(password).length < 8) {
    res.status(400).json({ error: 'A senha de acesso individual deve ter no mínimo 8 caracteres.' });
    return;
  }

  if (store.findUserByEmail(String(email))) {
    res.status(409).json({ error: 'Já existe um funcionário ou usuário cadastrado com este e-mail.' });
    return;
  }

  const created = store.createUser({
    full_name: String(full_name).trim(),
    email: String(email).trim(),
    phone: String(phone).trim(),
    password: String(password),
    role: 'funcionario',
    email_confirmed: true,
  });

  store.logAudit({
    user: actor,
    action: 'EMPLOYEE_ACCESS_CREATED',
    target_type: 'profile',
    target_id: created.user_id,
    description: `Acesso individual de funcionário criado para ${created.full_name} (${created.email}) por ${actor.full_name}.`,
    metadata: {
      ip: getClientIp(req),
      employee_email: created.email,
      created_by: actor.email,
    },
  });

  res.status(201).json({
    message: `Acesso individual criado para ${created.full_name}. Ele já pode entrar com ${created.email}.`,
    employee: created,
  });
});

// =============================================================================
// 5. ÁREA ADMINISTRATIVA (Exclusiva para role === 'admin' + Confirmação de Senha)
// =============================================================================

function verifyAdminPasswordOrFail(admin: StoredUser, passwordProvided: unknown, res: Response, req: Request, actionName: string): boolean {
  if (!passwordProvided || !store.verifyUserCredentials(admin, String(passwordProvided))) {
    store.logAudit({
      user: admin,
      action: 'ADMIN_STEP_UP_AUTH_FAILED',
      target_type: 'security',
      target_id: actionName,
      description: `Falha na confirmação de senha administrativa por ${admin.full_name} ao tentar executar "${actionName}".`,
      metadata: { ip: getClientIp(req), action: actionName },
    });
    res.status(401).json({
      error: 'Senha administrativa incorreta. Confirme sua identidade para continuar.',
    });
    return false;
  }
  return true;
}

app.get('/api/admin/overview', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const users = store.getAllUsers();
  const searches = store.getAllSearchesAdmin();
  const requests = store.getAllRequestsAdmin();
  const companies = store.getAllCompanies();
  const logs = store.getAuditLogs();

  res.json({
    stats: {
      total_users: users.length,
      total_funcionarios: users.filter((u) => u.role === 'funcionario').length,
      total_admins: users.filter((u) => u.role === 'admin').length,
      total_searches: searches.length,
      total_companies: companies.length,
      pending_requests: requests.filter((r) => r.status === 'Pendente').length,
      in_analysis_requests: requests.filter((r) => r.status === 'Em análise').length,
      approved_requests: requests.filter((r) => r.status === 'Aprovada').length,
      rejected_requests: requests.filter((r) => r.status === 'Recusada').length,
    },
    users,
    searches,
    requests,
    companies,
    logs: logs.slice(0, 100),
  });
});

app.get('/api/admin/users', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ users: store.getAllUsers() });
});

// Cadastrar novo funcionário pelo painel administrativo (Exige confirmação de senha do Admin)
app.post('/api/admin/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser!;
  const { full_name, email, phone, password, role, admin_password } = req.body || {};

  if (!verifyAdminPasswordOrFail(admin, admin_password, res, req, 'CREATE_USER')) {
    return;
  }

  if (!full_name || !email || !phone || !password || String(password).length < 8) {
    res.status(400).json({
      error: 'Preencha nome, e-mail, telefone e senha (mínimo 8 caracteres).',
    });
    return;
  }

  if (store.findUserByEmail(String(email))) {
    res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });
    return;
  }

  const assignedRole: UserRole = role === 'admin' ? 'admin' : 'funcionario';
  const created = store.createUser({
    full_name: String(full_name),
    email: String(email),
    phone: String(phone),
    password: String(password),
    role: assignedRole,
    email_confirmed: true,
  });

  store.logAudit({
    user: admin,
    action: 'ADMIN_CREATED_USER',
    target_type: 'profile',
    target_id: created.user_id,
    description: `Administrador ${admin.full_name} cadastrou ${created.full_name} (${created.email}) com perfil ${assignedRole.toUpperCase()}.`,
    metadata: {
      ip: getClientIp(req),
      affected_user_id: created.user_id,
      affected_email: created.email,
      assigned_role: assignedRole,
      result: 'SUCCESS',
    },
  });

  res.status(201).json({
    message: 'Usuário cadastrado com sucesso.',
    user: created,
  });
});

// Editar usuário / Alterar role / Ativar ou Desativar / Redefinir senha individual (Exige confirmação de senha do Admin)
app.put('/api/admin/users/:userId', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser!;
  const { userId } = req.params;
  const { full_name, phone, role, status, new_password, admin_password } = req.body || {};

  if (!verifyAdminPasswordOrFail(admin, admin_password, res, req, 'UPDATE_USER_OR_ROLE')) {
    return;
  }

  const targetUser = store.findUserById(userId);
  if (!targetUser) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  if (new_password && String(new_password).trim().length > 0 && String(new_password).trim().length < 8) {
    res.status(400).json({ error: 'A nova senha de acesso do funcionário deve ter pelo menos 8 caracteres.' });
    return;
  }

  const oldRole = targetUser.role;
  const oldStatus = targetUser.status;

  // Impede que o último administrador ativo remova seu próprio acesso ou se desative
  const activeAdmins = store
    .getAllUsers()
    .filter((u) => u.role === 'admin' && u.status === 'ativo');
  if (
    targetUser.role === 'admin' &&
    activeAdmins.length <= 1 &&
    (role === 'funcionario' || status === 'inativo')
  ) {
    res.status(400).json({
      error: 'Operação bloqueada: o sistema deve manter pelo menos um Administrador ativo.',
    });
    return;
  }

  if (full_name && String(full_name).trim().length >= 3) {
    targetUser.full_name = String(full_name).trim();
  }
  if (phone && String(phone).trim().length >= 8) {
    targetUser.phone = String(phone).trim();
  }
  if (role === 'admin' || role === 'funcionario') {
    targetUser.role = role;
  }
  if (status === 'ativo' || status === 'inativo' || status === 'pendente_confirmacao') {
    targetUser.status = status;
    if (status === 'ativo') {
      targetUser.email_confirmed = true;
    }
  }

  let passwordReset = false;
  if (new_password && String(new_password).trim().length >= 8) {
    store.resetUserPassword(targetUser.user_id, String(new_password).trim());
    passwordReset = true;
  }

  targetUser.updated_at = new Date().toISOString();
  store.save();

  const changes: string[] = [];
  if (oldRole !== targetUser.role) {
    changes.push(`Role alterada de ${oldRole.toUpperCase()} para ${targetUser.role.toUpperCase()}`);
  }
  if (oldStatus !== targetUser.status) {
    changes.push(`Status alterado de ${oldStatus} para ${targetUser.status}`);
  }
  if (passwordReset) {
    changes.push('Senha individual de acesso redefinida');
  }
  if (changes.length === 0) {
    changes.push('Dados cadastrais atualizados');
  }

  store.logAudit({
    user: admin,
    action:
      oldRole !== targetUser.role
        ? targetUser.role === 'admin'
          ? 'PROMOTE_TO_ADMIN'
          : 'REMOVE_ADMIN_ROLE'
        : oldStatus !== targetUser.status
        ? 'USER_STATUS_CHANGED'
        : 'USER_UPDATED_BY_ADMIN',
    target_type: 'profile',
    target_id: targetUser.user_id,
    description: `${changes.join('; ')} para o usuário ${targetUser.full_name} (${targetUser.email}).`,
    metadata: {
      ip: getClientIp(req),
      affected_user: targetUser.email,
      old_role: oldRole,
      new_role: targetUser.role,
      old_status: oldStatus,
      new_status: targetUser.status,
      result: 'SUCCESS',
    },
  });

  res.json({
    message: 'Permissões e dados do usuário atualizados com sucesso.',
    user: store.sanitizeUser(targetUser),
  });
});

// Aprovar, colocar em análise ou recusar solicitação de atualização (Exige confirmação de senha do Admin)
app.put('/api/admin/requests/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.currentUser!;
  const requestId = req.params.id;
  const { status, admin_notes, admin_password } = req.body || {};

  if (!verifyAdminPasswordOrFail(admin, admin_password, res, req, `REVIEW_REQUEST_${status}`)) {
    return;
  }

  const allowedStatuses: RequestStatus[] = ['Pendente', 'Em análise', 'Aprovada', 'Recusada'];
  if (!allowedStatuses.includes(status)) {
    res.status(400).json({ error: 'Status de avaliação inválido.' });
    return;
  }

  const updated = store.reviewUpdateRequest({
    admin,
    requestId,
    status,
    admin_notes: String(admin_notes || ''),
  });

  if (!updated) {
    res.status(404).json({ error: 'Solicitação não encontrada.' });
    return;
  }

  store.logAudit({
    user: admin,
    action: `REQUEST_${status.toUpperCase().replace(/\s+/g, '_')}`,
    target_type: 'update_request',
    target_id: updated.id,
    description: `Solicitação da empresa ${updated.company_name} (${updated.cnpj}) marcada como "${status}" por ${admin.full_name}.`,
    metadata: {
      ip: getClientIp(req),
      cnpj: updated.cnpj,
      field: updated.field_name,
      old_value: updated.old_value,
      requested_value: updated.requested_value,
      status,
      admin_notes: updated.admin_notes,
      result: 'SUCCESS',
    },
  });

  res.json({
    message: `Solicitação atualizada para "${status}" com sucesso.`,
    request: updated,
  });
});

app.get('/api/admin/companies', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const companies = store.getAllCompanies();
  const requests = store.getAllRequestsAdmin();
  const searches = store.getAllSearchesAdmin();

  const enriched = companies.map((comp) => ({
    ...comp,
    total_searches: searches.filter((s) => s.cnpj === comp.cnpj).length,
    related_requests: requests.filter((r) => r.cnpj === comp.cnpj),
  }));

  res.json({ companies: enriched });
});

app.get('/api/admin/logs', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ logs: store.getAuditLogs() });
});

app.get('/api/public-config', (_req: Request, res: Response) => {
  res.json({
    googleMapsApiKey:
      process.env.GOOGLE_MAPS_PLATFORM_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '',
  });
});

// =============================================================================
// INTEGRAÇÃO GROQ API + BRASIL API (ANÁLISE EXECUTIVA DE DADOS CADASTRAIS)
// =============================================================================

app.post('/api/ai/company-analysis', async (req: Request, res: Response) => {
  const { cnpj } = req.body || {};
  const cleaned = cleanCnpj(String(cnpj || ''));
  if (!cleaned || cleaned.length !== 14) {
    res.status(400).json({ error: 'CNPJ inválido para análise executiva.' });
    return;
  }

  let company = store.getCompanyByCnpj(cleaned);
  if (!company) {
    try {
      const officialData = await fetchOfficialCnpjData(cleaned);
      company = store.upsertCompany(officialData);
    } catch (err: any) {
      res.status(404).json({ error: err?.message || 'Empresa não localizada na BrasilAPI.' });
      return;
    }
  }

  const groqApiKey = process.env.GROQ_API_KEY?.trim();

  const systemPrompt =
    'Você é um analista corporativo e tributário brasileiro especialista em dados cadastrais da Receita Federal (BrasilAPI). ' +
    'Gere uma análise executiva concisa, estritamente fiel aos dados fornecidos, sem inventar fatos externos. ' +
    'Estruture em 3 tópicos objetivos: 1) Perfil Operacional e Porte; 2) Enquadramento de Atividades Econômicas (CNAE Principal e Secundários); 3) Situação Cadastral e Governança.';

  const userPrompt = `Analise os dados oficiais retornados pela BrasilAPI para a empresa abaixo:
- CNPJ: ${company.cnpj}
- Razão Social: ${company.razao_social}
- Nome Fantasia: ${company.nome_fantasia}
- Situação Cadastral: ${company.situacao}
- Data de Abertura: ${company.data_abertura}
- Natureza Jurídica: ${company.natureza_juridica}
- Porte: ${company.porte}
- Capital Social: R$ ${Number(company.capital_social || 0).toLocaleString('pt-BR')}
- CNAE Principal: ${company.cnae_principal.codigo} - ${company.cnae_principal.descricao}
- CNAEs Secundários (${company.cnaes_secundarios.length}): ${company.cnaes_secundarios
    .slice(0, 6)
    .map((c: { codigo: string; descricao: string }) => `${c.codigo} (${c.descricao})`)
    .join('; ')}
- Localização: ${company.endereco.municipio} / ${company.endereco.uf}
- Quadro Societário: ${company.qsa.length} sócio(s)/administrador(es) registrado(s).`;

  if (groqApiKey && groqApiKey !== 'MY_GROQ_API_KEY') {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          max_tokens: 700,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (groqRes.ok) {
        const groqData: any = await groqRes.json();
        const analysisText = groqData?.choices?.[0]?.message?.content?.trim();
        if (analysisText) {
          res.json({
            provider: 'Groq API (llama-3.3-70b-versatile) + BrasilAPI',
            analysis: analysisText,
            generated_at: new Date().toISOString(),
          });
          return;
        }
      }
    } catch {
      // Continua para motor automático
    }
  }

  // Caso o usuário não tenha chave da Groq configurada, utiliza automaticamente a IA nativa injetada no ambiente (sem necessidade de chave externa)
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const geminiRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${systemPrompt}\n\n${userPrompt}`,
      });
      const text = geminiRes.text?.trim();
      if (text) {
        res.json({
          provider: 'IA Integrada Automática + BrasilAPI',
          analysis: text,
          generated_at: new Date().toISOString(),
        });
        return;
      }
    } catch {
      // Continua para síntese estruturada determinística
    }
  }

  // Síntese executiva determinística baseada nos dados oficiais da BrasilAPI
  const fallbackAnalysis = [
    `1. Perfil Operacional e Porte: A entidade "${company.razao_social}" (${company.tipo_estabelecimento}), inscrita sob o CNPJ ${company.cnpj}, opera sob a natureza jurídica "${company.natureza_juridica}" com porte classificado como "${company.porte}" e capital social declarado de R$ ${Number(company.capital_social || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
    `2. Enquadramento de Atividades Econômicas (CNAE): Sua atividade preponderante registrada na BrasilAPI / Receita Federal é "${company.cnae_principal.descricao}" (CNAE ${company.cnae_principal.codigo}), contando adicionalmente com ${company.cnaes_secundarios.length} atividade(s) econômica(s) secundária(s) habilitada(s).`,
    `3. Situação Cadastral e Governança: Encontra-se com situação cadastral "${company.situacao}" na base oficial, sediada em ${company.endereco.municipio}/${company.endereco.uf} desde ${company.data_abertura}, apresentando ${company.qsa.length} integrante(s) no Quadro de Sócios e Administradores (QSA).`,
  ].join('\n\n');

  res.json({
    provider: 'Síntese Executiva Oficial BrasilAPI (Sem chave adicional necessária)',
    analysis: fallbackAnalysis,
    generated_at: new Date().toISOString(),
  });
});

// =============================================================================
// INICIALIZAÇÃO DO SERVIDOR EXPRESS + VITE (PORTA 3000)
// =============================================================================

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexusCNPJ Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
