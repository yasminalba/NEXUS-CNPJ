import type { Company } from '../types/index.ts';

/**
 * Serviço real de consulta de CNPJ integrado às bases públicas da Receita Federal
 * (BrasilAPI, CNPJ.ws e ReceitaWS em cascata de alta disponibilidade).
 * NUNCA inventa dados empresariais.
 */

function normalizeSituacao(raw: string | number | undefined): string {
  if (raw === undefined || raw === null) return 'NÃO INFORMADA';
  const str = String(raw).toUpperCase().trim();
  if (str === '2' || str.includes('ATIVA')) return 'ATIVA';
  if (str === '3' || str.includes('SUSPENSA')) return 'SUSPENSA';
  if (str === '4' || str.includes('INAPTA')) return 'INAPTA';
  if (str === '8' || str.includes('BAIXADA')) return 'BAIXADA';
  if (str === '1' || str.includes('NULA')) return 'NULA';
  return str;
}

function formatCnaeCode(code: string | number | undefined): string {
  if (!code) return '—';
  const digits = String(code).replace(/\D/g, '');
  if (digits.length === 7) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5, 7)}`;
  }
  return String(code);
}

export async function fetchOfficialCnpjData(
  cnpj: string
): Promise<Omit<Company, 'id' | 'created_at' | 'updated_at'>> {
  const clean = cnpj.replace(/\D/g, '');

  // 1. Tenta BrasilAPI (https://brasilapi.com.br/api/cnpj/v1/{cnpj})
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NexusCNPJ-Corporate-SaaS/1.0',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (res.ok) {
      const data: any = await res.json();
      const tel1 = data.ddd_telefone_1 ? String(data.ddd_telefone_1).trim() : '';
      const tel2 = data.ddd_telefone_2 ? String(data.ddd_telefone_2).trim() : '';
      const telefone = [tel1, tel2].filter(Boolean).join(' / ') || 'Não informado';

      return {
        cnpj: clean,
        razao_social: data.razao_social || 'Razão Social não informada',
        nome_fantasia: data.nome_fantasia || data.razao_social || 'Não informado',
        situacao: normalizeSituacao(
          data.descricao_situacao_cadastral || data.situacao_cadastral
        ),
        data_abertura: data.data_inicio_atividade || 'Não informada',
        data_situacao: data.data_situacao_cadastral || 'Não informada',
        porte: data.porte || data.descricao_porte || 'Não informado',
        natureza_juridica: data.natureza_juridica || 'Não informada',
        capital_social: Number(data.capital_social) || 0,
        tipo_estabelecimento:
          data.identificador_matriz_filial === 1 ||
          String(data.descricao_identificador_matriz_filial).toUpperCase().includes('MATRIZ')
            ? 'MATRIZ'
            : 'FILIAL',
        cnae_principal: {
          codigo: formatCnaeCode(data.cnae_fiscal),
          descricao: data.cnae_fiscal_descricao || 'Não informada',
        },
        cnaes_secundarios: Array.isArray(data.cnaes_secundarios)
          ? data.cnaes_secundarios
              .filter((c: any) => c && (c.codigo || c.descricao))
              .map((c: any) => ({
                codigo: formatCnaeCode(c.codigo),
                descricao: c.descricao || '—',
              }))
          : [],
        endereco: {
          cep: data.cep ? String(data.cep).replace(/\D/g, '') : 'Não informado',
          logradouro:
            [data.descricao_tipo_de_logradouro, data.logradouro]
              .filter(Boolean)
              .join(' ')
              .trim() || 'Não informado',
          numero: data.numero || 'S/N',
          complemento: data.complemento || '',
          bairro: data.bairro || 'Não informado',
          municipio: data.municipio || 'Não informado',
          uf: data.uf || '—',
        },
        telefone,
        email: data.email ? String(data.email).toLowerCase() : 'Não informado',
        website: '',
        situacao_especial: data.situacao_especial || 'Não consta',
        data_situacao_especial: data.data_situacao_especial || '—',
        qsa: Array.isArray(data.qsa)
          ? data.qsa.map((s: any) => ({
              nome_socio: s.nome_socio || '—',
              qualificacao_socio: s.qualificacao_socio || 'Sócio/Administrador',
              faixa_etaria: s.faixa_etaria || undefined,
              data_entrada_sociedade: s.data_entrada_sociedade || undefined,
            }))
          : [],
        latitude: null,
        longitude: null,
        fonte_oficial: 'Receita Federal do Brasil (via BrasilAPI)',
      };
    }

    if (res.status === 404) {
      throw new Error('CNPJ_NOT_FOUND');
    }
  } catch (err: any) {
    if (err?.message === 'CNPJ_NOT_FOUND') {
      throw new Error('CNPJ não encontrado na base de dados da Receita Federal.');
    }
    // Prossegue para o segundo provedor oficial
  }

  // 2. Tenta Publica CNPJ.ws (https://publica.cnpj.ws/cnpj/{cnpj})
  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${clean}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NexusCNPJ-Corporate-SaaS/1.0',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (res.ok) {
      const data: any = await res.json();
      const est = data.estabelecimento || {};
      const ddd1 = est.ddd1 || '';
      const tel1 = est.telefone1 || '';
      const telefone = ddd1 && tel1 ? `(${ddd1}) ${tel1}` : 'Não informado';

      return {
        cnpj: clean,
        razao_social: data.razao_social || 'Não informada',
        nome_fantasia: est.nome_fantasia || data.razao_social || 'Não informado',
        situacao: normalizeSituacao(est.situacao_cadastral),
        data_abertura: est.data_inicio_atividade || 'Não informada',
        data_situacao: est.data_situacao_cadastral || 'Não informada',
        porte: data.porte?.descricao || 'Não informado',
        natureza_juridica: data.natureza_juridica?.descricao || 'Não informada',
        capital_social: Number(data.capital_social) || 0,
        tipo_estabelecimento: String(est.tipo || 'MATRIZ').toUpperCase(),
        cnae_principal: {
          codigo: formatCnaeCode(est.atividade_principal?.id),
          descricao: est.atividade_principal?.descricao || 'Não informada',
        },
        cnaes_secundarios: Array.isArray(est.atividades_secundarias)
          ? est.atividades_secundarias.map((c: any) => ({
              codigo: formatCnaeCode(c.id),
              descricao: c.descricao || '—',
            }))
          : [],
        endereco: {
          cep: est.cep || 'Não informado',
          logradouro: [est.tipo_logradouro, est.logradouro].filter(Boolean).join(' ').trim(),
          numero: est.numero || 'S/N',
          complemento: est.complemento || '',
          bairro: est.bairro || 'Não informado',
          municipio: est.cidade?.nome || 'Não informado',
          uf: est.estado?.sigla || '—',
        },
        telefone,
        email: est.email ? String(est.email).toLowerCase() : 'Não informado',
        website: '',
        situacao_especial: est.situacao_especial || 'Não consta',
        data_situacao_especial: est.data_situacao_especial || '—',
        qsa: Array.isArray(data.socios)
          ? data.socios.map((s: any) => ({
              nome_socio: s.nome || '—',
              qualificacao_socio: s.qualificacao_socio?.descricao || 'Sócio',
              faixa_etaria: s.faixa_etaria || undefined,
              data_entrada_sociedade: s.data_entrada || undefined,
            }))
          : [],
        latitude: null,
        longitude: null,
        fonte_oficial: 'Receita Federal do Brasil (via CNPJ.ws)',
      };
    }

    if (res.status === 404) {
      throw new Error('CNPJ_NOT_FOUND');
    }
  } catch (err: any) {
    if (err?.message === 'CNPJ_NOT_FOUND') {
      throw new Error('CNPJ não encontrado na base de dados da Receita Federal.');
    }
  }

  // 3. Tenta ReceitaWS (https://receitaws.com.br/v1/cnpj/{cnpj})
  const res = await fetch(`https://receitaws.com.br/v1/cnpj/${clean}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'NexusCNPJ-Corporate-SaaS/1.0',
    },
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) {
    throw new Error('Não foi possível conectar ao serviço de consulta de CNPJ no momento. Tente novamente em instantes.');
  }

  const data: any = await res.json();
  if (data.status === 'ERROR') {
    throw new Error(data.message || 'CNPJ não encontrado na base de dados oficial.');
  }

  return {
    cnpj: clean,
    razao_social: data.nome || 'Não informada',
    nome_fantasia: data.fantasia || data.nome || 'Não informado',
    situacao: normalizeSituacao(data.situacao),
    data_abertura: data.abertura || 'Não informada',
    data_situacao: data.data_situacao || 'Não informada',
    porte: data.porte || 'Não informado',
    natureza_juridica: data.natureza_juridica || 'Não informada',
    capital_social: Number(data.capital_social) || 0,
    tipo_estabelecimento: data.tipo || 'MATRIZ',
    cnae_principal: {
      codigo: data.atividade_principal?.[0]?.code || '—',
      descricao: data.atividade_principal?.[0]?.text || 'Não informada',
    },
    cnaes_secundarios: Array.isArray(data.atividades_secundarias)
      ? data.atividades_secundarias
          .filter((c: any) => c && c.code && c.code !== '00.00-0-00')
          .map((c: any) => ({
            codigo: c.code,
            descricao: c.text || '—',
          }))
      : [],
    endereco: {
      cep: data.cep ? String(data.cep).replace(/\D/g, '') : 'Não informado',
      logradouro: data.logradouro || 'Não informado',
      numero: data.numero || 'S/N',
      complemento: data.complemento || '',
      bairro: data.bairro || 'Não informado',
      municipio: data.municipio || 'Não informado',
      uf: data.uf || '—',
    },
    telefone: data.telefone || 'Não informado',
    email: data.email ? String(data.email).toLowerCase() : 'Não informado',
    website: '',
    situacao_especial: data.situacao_especial || 'Não consta',
    data_situacao_especial: data.data_situacao_especial || '—',
    qsa: Array.isArray(data.qsa)
      ? data.qsa.map((s: any) => ({
          nome_socio: s.nome || '—',
          qualificacao_socio: s.qual || 'Sócio/Administrador',
        }))
      : [],
    latitude: null,
    longitude: null,
    fonte_oficial: 'Receita Federal do Brasil (via ReceitaWS)',
  };
}
