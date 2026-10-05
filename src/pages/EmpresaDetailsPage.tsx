import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Map,
  AdvancedMarker,
  Pin,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileEdit,
  ExternalLink,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Navigation,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  formatCnpj,
  formatCurrencyBRL,
  formatDateBR,
  validateCnpj,
} from '../utils/cnpj.ts';
import type { Company, UpdateRequestRecord } from '../types/index.ts';

function getSituacaoStyle(situacao: string): {
  textColor: string;
  dotColor: string;
  icon: React.ReactNode;
} {
  const normalized = (situacao || '').toUpperCase();
  if (normalized.includes('ATIVA')) {
    return {
      textColor: 'text-emerald-700',
      dotColor: 'bg-emerald-600',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    };
  }
  if (normalized.includes('SUSPENSA')) {
    return {
      textColor: 'text-amber-700',
      dotColor: 'bg-amber-500',
      icon: <Clock className="w-4 h-4 text-amber-600" />,
    };
  }
  if (normalized.includes('INAPTA') || normalized.includes('BAIXADA') || normalized.includes('NULA')) {
    return {
      textColor: 'text-red-700',
      dotColor: 'bg-red-600',
      icon: <XCircle className="w-4 h-4 text-red-600" />,
    };
  }
  return {
    textColor: 'text-slate-700',
    dotColor: 'bg-slate-400',
    icon: <AlertCircle className="w-4 h-4 text-slate-500" />,
  };
}

const CompanyAddressMap: React.FC<{ company: Company }> = ({ company }) => {
  const placesLib = useMapsLibrary('places');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    company.latitude && company.longitude
      ? { lat: company.latitude, lng: company.longitude }
      : null
  );
  const [geocodingStatus, setGeocodingStatus] = useState<'loading' | 'ready' | 'not_found'>('loading');

  const fullAddress = [
    company.endereco.logradouro,
    company.endereco.numero,
    company.endereco.bairro,
    company.endereco.municipio,
    company.endereco.uf,
    company.endereco.cep,
    'Brasil',
  ]
    .filter((p) => p && p !== 'Não informado')
    .join(', ');

  useEffect(() => {
    if (company.latitude && company.longitude) {
      setCoords({ lat: company.latitude, lng: company.longitude });
      setGeocodingStatus('ready');
      return;
    }

    if (!placesLib || !fullAddress) return;

    let cancelled = false;
    const locateAddress = async () => {
      setGeocodingStatus('loading');
      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: fullAddress,
          fields: ['id', 'displayName', 'location', 'formattedAddress'],
          maxResultCount: 1,
        });

        if (cancelled) return;
        const first = places?.[0];
        if (first?.location) {
          const lat =
            typeof first.location.lat === 'function'
              ? first.location.lat()
              : (first.location as any).lat;
          const lng =
            typeof first.location.lng === 'function'
              ? first.location.lng()
              : (first.location as any).lng;
          setCoords({ lat, lng });
          setGeocodingStatus('ready');
        } else {
          setGeocodingStatus('not_found');
        }
      } catch (err: any) {
        if (cancelled) return;
        const msg = String(err?.message || err || '');
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT') || msg.includes('429')) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setGeocodingStatus('not_found');
      }
    };

    locateAddress();
    return () => {
      cancelled = true;
    };
  }, [placesLib, fullAddress, company.latitude, company.longitude]);

  const googleMapsRouteUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    fullAddress
  )}`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Localização do Estabelecimento
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">{fullAddress}</p>
        </div>

        <a
          href={googleMapsRouteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Ver rota</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="w-full h-72 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative">
        {geocodingStatus === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
            Carregando mapa do endereço empresarial...
          </div>
        )}

        {geocodingStatus === 'not_found' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2">
            <MapPin className="w-6 h-6 text-slate-400" />
            <p className="text-xs text-slate-600">
              Coordenadas exatas não localizadas automaticamente para este logradouro. Utilize o botão
              &quot;Ver rota&quot; acima para abrir no Google Maps.
            </p>
          </div>
        )}

        {geocodingStatus === 'ready' && coords && (
          <Map
            center={coords}
            zoom={16}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <AdvancedMarker position={coords} title={company.razao_social}>
              <Pin background="#2563eb" borderColor="#1e40af" glyphColor="#ffffff" />
            </AdvancedMarker>
          </Map>
        )}
      </div>
    </div>
  );
};

export const EmpresaDetailsPage: React.FC = () => {
  const { cnpj } = useParams<{ cnpj: string }>();
  const navigate = useNavigate();
  const { user, apiFetch } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado da Análise Executiva (Groq API + BrasilAPI)
  const [groqAnalysis, setGroqAnalysis] = useState<string | null>(null);
  const [groqProvider, setGroqProvider] = useState<string | null>(null);
  const [groqLoading, setGroqLoading] = useState(false);

  // Estado do Modal de Solicitação de Atualização de Dados
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<'telefone' | 'email' | 'website' | 'complemento'>('telefone');
  const [requestedValue, setRequestedValue] = useState('');
  const [justification, setJustification] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<
    'OTP por E-mail' | 'OTP por Telefone/SMS' | 'Análise Manual (Sem acesso ao contato antigo)'
  >('OTP por E-mail');
  const [step, setStep] = useState<'form' | 'compare' | 'otp' | 'done'>('form');
  const [createdRequest, setCreatedRequest] = useState<UpdateRequestRecord | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpDispatchNotice, setOtpDispatchNotice] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const loadCompany = useCallback(async () => {
    if (!cnpj) return;
    const check = validateCnpj(cnpj);
    if (!check.valid) {
      setError(check.error || 'CNPJ inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/cnpj/${check.cleaned}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível carregar os dados.');
      } else {
        setCompany(data.company);
      }
    } catch {
      setError('Não foi possível conectar ao serviço. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [cnpj, apiFetch]);

  useEffect(() => {
    setGroqAnalysis(null);
    setGroqProvider(null);
    loadCompany();
  }, [loadCompany]);

  const handleGenerateGroqAnalysis = async () => {
    if (!company || groqLoading) return;
    setGroqLoading(true);
    try {
      const res = await apiFetch('/api/ai/company-analysis', {
        method: 'POST',
        body: JSON.stringify({ cnpj: company.cnpj }),
      });
      const data = await res.json();
      if (res.ok && data.analysis) {
        setGroqAnalysis(data.analysis);
        setGroqProvider(data.provider || 'Groq API + BrasilAPI');
      }
    } catch {
      // ignora erro silenciosamente
    } finally {
      setGroqLoading(false);
    }
  };

  const getCurrentFieldValue = () => {
    if (!company) return 'Não informado';
    if (selectedField === 'telefone') return company.telefone || 'Não informado';
    if (selectedField === 'email') return company.email || 'Não informado';
    if (selectedField === 'website') return company.website || 'Não informado';
    if (selectedField === 'complemento') return company.endereco.complemento || 'Não informado';
    return 'Não informado';
  };

  const handleOpenUpdateModal = () => {
    if (!user) {
      navigate('/login', { state: { from: `/empresa/${cnpj}` } });
      return;
    }
    setSelectedField('telefone');
    setRequestedValue('');
    setJustification('');
    setVerificationMethod('OTP por E-mail');
    setStep('form');
    setModalError(null);
    setOtpDispatchNotice(null);
    setIsUpdateModalOpen(true);
  };

  const handleProceedToCompare = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!requestedValue.trim() || requestedValue.trim().length < 3) {
      setModalError('Informe o novo dado solicitado.');
      return;
    }
    if (requestedValue.trim().toLowerCase() === getCurrentFieldValue().trim().toLowerCase()) {
      setModalError('O novo dado solicitado deve ser diferente do dado atual.');
      return;
    }
    setStep('compare');
  };

  const handleConfirmSubmitRequest = async () => {
    if (!company) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          cnpj: company.cnpj,
          field_name: selectedField,
          requested_value: requestedValue.trim(),
          justification: justification.trim() || 'Solicitação de atualização cadastral de contato.',
          verification_method: verificationMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Erro ao criar solicitação.');
        return;
      }

      setCreatedRequest(data.request);
      if (data.requires_otp) {
        setOtpDispatchNotice(data.simulated_dispatch_notice || null);
        setStep('otp');
      } else {
        setStep('done');
      }
    } catch {
      setModalError('Não foi possível conectar ao serviço. Tente novamente.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdRequest) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await apiFetch(`/api/requests/${createdRequest.id}/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ code: otpInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Código OTP inválido.');
        return;
      }
      setCreatedRequest(data.request);
      setStep('done');
    } catch {
      setModalError('Não foi possível conectar ao serviço.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!createdRequest) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await apiFetch(`/api/requests/${createdRequest.id}/resend-otp`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setOtpDispatchNotice(data.simulated_dispatch_notice || null);
      } else {
        setModalError(data.error || 'Falha ao reenviar OTP.');
      }
    } catch {
      setModalError('Não foi possível conectar ao serviço.');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-3">
        <div className="text-sm font-medium text-slate-600">Carregando...</div>
        <p className="text-xs text-slate-500">
          Consultando base oficial de dados cadastrais para o CNPJ {formatCnpj(cnpj || '')}
        </p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Não foi possível carregar os dados.</h1>
          <p className="text-sm text-slate-600">{error || 'Nenhum resultado encontrado.'}</p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              to="/consultar-cnpj"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Nova Consulta de CNPJ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const situacaoInfo = getSituacaoStyle(company.situacao);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/consultar-cnpj"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Consulta de CNPJ</span>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/carteira"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <span>Atribuir na Carteira de Serviços</span>
          </Link>
          <button
            type="button"
            onClick={handleOpenUpdateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <FileEdit className="w-4 h-4" />
            <span>Solicitar atualização de dados</span>
          </button>
        </div>
      </div>

      {/* Header Card da Empresa */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-800 text-sm">
                {formatCnpj(company.cnpj)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{company.tipo_estabelecimento}</span>
              {company.fonte_oficial && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{company.fonte_oficial}</span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{company.razao_social}</h1>
            <p className="text-sm text-slate-600">
              Nome Fantasia: <strong className="text-slate-800">{company.nome_fantasia}</strong>
            </p>
          </div>

          {/* Status Cadastral Oficial */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 shrink-0">
            {situacaoInfo.icon}
            <div>
              <p className="text-[11px] text-slate-500 leading-none">Situação Cadastral</p>
              <p className={`text-sm font-bold font-mono mt-1 ${situacaoInfo.textColor}`}>
                {company.situacao}
              </p>
            </div>
          </div>
        </div>

        {/* Grid de Informações Cadastrais Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-500">Data de Abertura</p>
            <p className="text-sm font-semibold font-mono text-slate-900 mt-1">
              {formatDateBR(company.data_abertura)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Data da Situação Cadastral</p>
            <p className="text-sm font-semibold font-mono text-slate-900 mt-1">
              {formatDateBR(company.data_situacao)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Porte da Empresa</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{company.porte}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Capital Social</p>
            <p className="text-sm font-semibold font-mono text-slate-900 mt-1">
              {formatCurrencyBRL(company.capital_social)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-500">Natureza Jurídica</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{company.natureza_juridica}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Situação Especial</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {company.situacao_especial || 'Não consta'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Data da Situação Especial</p>
            <p className="text-sm font-semibold font-mono text-slate-900 mt-1">
              {formatDateBR(company.data_situacao_especial)}
            </p>
          </div>
        </div>
      </section>

      {/* Atividades Econômicas (CNAE Principal e Secundários) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Atividades Econômicas (CNAE Principal e Secundários)
            </h2>
          </div>

          <button
            type="button"
            onClick={handleGenerateGroqAnalysis}
            disabled={groqLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>
              {groqLoading
                ? 'Processando via Groq API...'
                : groqAnalysis
                ? 'Atualizar Análise Executiva (Groq API)'
                : 'Gerar Análise Executiva (Groq API)'}
            </span>
          </button>
        </div>

        {groqAnalysis && (
          <div className="p-4 sm:p-5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-900">
                Síntese Executiva Cadastral e Enquadramento CNAE
              </p>
              {groqProvider && (
                <span className="text-[11px] font-mono text-blue-700">{groqProvider}</span>
              )}
            </div>
            <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {groqAnalysis}
            </div>
          </div>
        )}

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
          <p className="text-xs font-semibold text-slate-500">CNAE Principal</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="font-mono text-sm font-semibold text-blue-700 shrink-0">
              {company.cnae_principal.codigo}
            </span>
            <span className="hidden sm:inline text-slate-300">—</span>
            <span className="text-sm font-medium text-slate-900">
              {company.cnae_principal.descricao}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-600">
            CNAEs Secundários ({company.cnaes_secundarios.length})
          </p>
          {company.cnaes_secundarios.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhuma atividade secundária registrada.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {company.cnaes_secundarios.map((cnae, idx) => (
                <div
                  key={`${cnae.codigo}-${idx}`}
                  className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 text-xs hover:bg-slate-50"
                >
                  <span className="font-mono font-semibold text-slate-700 w-28 shrink-0">
                    {cnae.codigo}
                  </span>
                  <span className="text-slate-700">{cnae.descricao}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Endereço e Contatos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Endereço Cadastral</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Logradouro e Número</p>
              <p className="font-medium text-slate-900 mt-0.5">
                {company.endereco.logradouro}, {company.endereco.numero}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Complemento</p>
              <p className="font-medium text-slate-900 mt-0.5">
                {company.endereco.complemento || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Bairro</p>
              <p className="font-medium text-slate-900 mt-0.5">{company.endereco.bairro}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Município / UF</p>
              <p className="font-medium text-slate-900 mt-0.5">
                {company.endereco.municipio} / {company.endereco.uf}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">CEP</p>
              <p className="font-mono font-medium text-slate-900 mt-0.5">{company.endereco.cep}</p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <h2 className="text-base font-semibold text-slate-900">Dados de Contato</h2>
              </div>
              <button
                type="button"
                onClick={handleOpenUpdateModal}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Solicitar atualização
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Telefone
                </span>
                <span className="font-mono font-medium text-slate-900">{company.telefone}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> E-mail
                </span>
                <span className="font-mono font-medium text-slate-900">{company.email}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Website
                </span>
                <span className="font-mono font-medium text-slate-900">
                  {company.website || 'Não informado'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            As informações oficiais não são alteradas diretamente por usuários. Qualquer solicitação
            de atualização passa por verificação e aprovação administrativa.
          </div>
        </section>
      </div>

      {/* Quadro Societário (QSA) quando disponível */}
      {company.qsa && company.qsa.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Quadro de Sócios e Administradores ({company.qsa.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {company.qsa.map((socio, i) => (
              <div key={i} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-900">{socio.nome_socio}</p>
                <p className="text-xs text-slate-600 mt-0.5">{socio.qualificacao_socio}</p>
                {socio.data_entrada_sociedade && (
                  <p className="text-[11px] font-mono text-slate-500 mt-1">
                    Entrada: {formatDateBR(socio.data_entrada_sociedade)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mapa Google Maps com a Localização da Empresa e botão "Ver rota" */}
      <CompanyAddressMap company={company} />

      {/* Modal de Solicitação de Atualização de Dados (Seções 28 e 29) */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-blue-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  Solicitar atualização de dados
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {modalError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {step === 'form' && (
                <form onSubmit={handleProceedToCompare} className="space-y-4">
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    Empresa: <strong className="text-slate-900">{company.razao_social}</strong> (
                    <span className="font-mono">{formatCnpj(company.cnpj)}</span>)
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Campo para atualização permitida
                    </label>
                    <select
                      value={selectedField}
                      onChange={(e) => setSelectedField(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="telefone">Telefone Comercial</option>
                      <option value="email">E-mail Corporativo</option>
                      <option value="website">Website Oficial</option>
                      <option value="complemento">Complemento de Endereço</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dado atual registrado
                    </label>
                    <div className="px-3.5 py-2.5 text-sm font-mono bg-slate-100 border border-slate-200 rounded-lg text-slate-700">
                      {getCurrentFieldValue()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Novo dado solicitado
                    </label>
                    <input
                      type="text"
                      required
                      value={requestedValue}
                      onChange={(e) => setRequestedValue(e.target.value)}
                      placeholder="Informe o novo valor atualizado"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Método de Verificação de Segurança
                    </label>
                    <select
                      value={verificationMethod}
                      onChange={(e) => setVerificationMethod(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="OTP por E-mail">Código OTP por E-mail</option>
                      <option value="OTP por Telefone/SMS">Código OTP por Telefone/SMS</option>
                      <option value="Análise Manual (Sem acesso ao contato antigo)">
                        Não possuo mais acesso ao telefone/e-mail antigo (Análise Manual)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Justificativa / Comprovação de Autorização
                    </label>
                    <textarea
                      rows={2}
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Descreva o motivo da atualização ou referência do representante legal"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsUpdateModalOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      Revisar comparação
                    </button>
                  </div>
                </form>
              )}

              {step === 'compare' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-700 font-medium">
                    Confira a comparação abaixo antes de confirmar o envio da solicitação:
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500">Dado atual:</p>
                      <p className="text-sm font-mono font-semibold text-slate-800 mt-1">
                        {getCurrentFieldValue()}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200">
                      <p className="text-xs font-semibold text-blue-700">Novo dado solicitado:</p>
                      <p className="text-sm font-mono font-semibold text-blue-950 mt-1">
                        {requestedValue}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ao confirmar, sua solicitação ficará com status <strong>PENDENTE</strong> até ser
                    analisada por um Administrador.
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep('form')}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={modalLoading}
                      onClick={handleConfirmSubmitRequest}
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
                    >
                      {modalLoading ? 'Enviando...' : 'Confirmar solicitação'}
                    </button>
                  </div>
                </div>
              )}

              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Verificação por Código OTP</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Digite o código de 6 dígitos enviado. O código possui expiração de 10 minutos,
                    limite de 3 tentativas e é armazenado apenas como hash criptográfico.
                  </p>

                  {otpDispatchNotice && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono">
                      {otpDispatchNotice}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Código OTP (6 dígitos)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full px-4 py-2.5 text-center text-lg font-mono tracking-widest border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={modalLoading}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Reenviar código OTP
                    </button>
                    <button
                      type="submit"
                      disabled={modalLoading || otpInput.length !== 6}
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
                    >
                      {modalLoading ? 'Validando...' : 'Verificar OTP'}
                    </button>
                  </div>
                </form>
              )}

              {step === 'done' && (
                <div className="text-center space-y-4 py-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Operação realizada com sucesso.
                    </h3>
                    <p className="text-xs text-slate-600">
                      Sua solicitação foi registrada como <strong>PENDENTE</strong> e encaminhada para
                      análise administrativa.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsUpdateModalOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Fechar
                    </button>
                    <Link
                      to="/minhas-solicitacoes"
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      Acompanhar em Minhas Solicitações
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
