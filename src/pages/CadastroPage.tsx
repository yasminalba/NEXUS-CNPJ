import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  MailCheck,
} from 'lucide-react';
import { formatPhone } from '../utils/cnpj.ts';

export const CadastroPage: React.FC = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estado pós-cadastro: Confirmação de E-mail (Seção 16 / CONFIRMAÇÃO DE E-MAIL)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [emailConfirmedDone, setEmailConfirmedDone] = useState(false);

  // Validações em tempo real (O botão "Criar conta" só fica disponível quando tudo for válido)
  const validations = useMemo(() => {
    const isNameValid = fullName.trim().length >= 3 && fullName.trim().includes(' ');
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const phoneDigits = phone.replace(/\D/g, '');
    const isPhoneValid = phoneDigits.length >= 10 && phoneDigits.length <= 11;
    const isPasswordValid =
      password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
    const isConfirmValid = confirmPassword.length > 0 && password === confirmPassword;

    return {
      isNameValid,
      isEmailValid,
      isPhoneValid,
      isPasswordValid,
      isConfirmValid,
      allValid:
        isNameValid &&
        isEmailValid &&
        isPhoneValid &&
        isPasswordValid &&
        isConfirmValid &&
        acceptedTerms,
    };
  }, [fullName, email, phone, password, confirmPassword, acceptedTerms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validations.allValid) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          confirm_password: confirmPassword,
          accepted_terms: acceptedTerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível concluir o cadastro.');
        return;
      }

      setRegisteredEmail(email.trim().toLowerCase());
    } catch {
      setError('Não foi possível conectar ao serviço. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!registeredEmail) return;
    setResendMessage(null);
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail }),
      });
      const data = await res.json();
      setResendMessage(data.message || 'Enviamos um link de confirmação para seu e-mail.');
    } catch {
      setResendMessage('Erro ao reenviar e-mail.');
    }
  };

  const handleConfirmEmailLink = async () => {
    if (!registeredEmail) return;
    try {
      const res = await fetch('/api/auth/confirm-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail }),
      });
      if (res.ok) {
        setEmailConfirmedDone(true);
      }
    } catch {
      // ignore
    }
  };

  if (registeredEmail) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto">
            <MailCheck className="w-6 h-6 text-blue-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">Confirmação de E-mail</h1>
            <p className="text-sm font-medium text-slate-800">
              Enviamos um link de confirmação para seu e-mail.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              O endereço <strong className="font-mono text-slate-900">{registeredEmail}</strong>{' '}
              deve ser confirmado antes de liberar o acesso completo às funcionalidades autenticadas.
            </p>
          </div>

          {resendMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {resendMessage}
            </div>
          )}

          {emailConfirmedDone ? (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
                E-mail confirmado com sucesso! Sua conta de Funcionário está ativa.
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Ir para a tela de Login
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmEmailLink}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Simular clique no link de confirmação recebido por e-mail
              </button>

              <button
                type="button"
                onClick={handleResendEmail}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Reenviar e-mail de confirmação
              </button>

              <Link
                to="/login"
                className="block text-xs font-semibold text-slate-500 hover:text-slate-800 pt-2"
              >
                Voltar para o Login
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 sm:py-14">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900">Crie sua conta</h1>
          <p className="text-xs text-slate-600">
            Preencha todos os campos obrigatórios abaixo. Novos cadastros recebem inicialmente o
            perfil seguro de <strong>Funcionário</strong>.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome completo *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Digite seu nome e sobrenome"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            {fullName.length > 0 && !validations.isNameValid && (
              <p className="text-[11px] text-amber-700 mt-1">Informe nome e sobrenome completos.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">E-mail *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com.br"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            {email.length > 0 && !validations.isEmailValid && (
              <p className="text-[11px] text-amber-700 mt-1">Informe um e-mail válido.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Telefone *</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="w-full pl-10 pr-4 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            {phone.length > 0 && !validations.isPhoneValid && (
              <p className="text-[11px] text-amber-700 mt-1">
                Informe um telefone válido com DDD (10 ou 11 dígitos).
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Senha *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full pl-10 pr-9 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirmar senha *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Checklist de Requisitos de Segurança da Senha */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  validations.isPasswordValid ? 'text-emerald-600' : 'text-slate-300'
                }`}
              />
              <span>Mínimo de 8 caracteres contendo letras e números</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  validations.isConfirmValid ? 'text-emerald-600' : 'text-slate-300'
                }`}
              />
              <span>Confirmação de senha igual à senha informada</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <input
              id="accept-terms-checkbox"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            <label htmlFor="accept-terms-checkbox" className="text-xs text-slate-600 cursor-pointer leading-relaxed">
              Li e concordo com os termos de uso e política de privacidade.
            </label>
          </div>

          <button
            type="submit"
            disabled={!validations.allValid || loading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
          Já possui uma conta?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:underline">
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
};
