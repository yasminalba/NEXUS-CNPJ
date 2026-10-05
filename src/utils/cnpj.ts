/**
 * Utilitários de validação, limpeza e formatação oficial de CNPJ (14 dígitos + módulo 11)
 */

export function cleanCnpj(value: string): string {
  return (value || '').replace(/\D/g, '');
}

export function formatCnpj(value: string): string {
  const digits = cleanCnpj(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function validateCnpj(raw: string): { valid: boolean; error?: string; cleaned: string } {
  const cleaned = cleanCnpj(raw);

  if (!cleaned) {
    return { valid: false, error: 'Informe um CNPJ para realizar a consulta.', cleaned };
  }

  if (cleaned.length !== 14) {
    return {
      valid: false,
      error: `O CNPJ deve conter exatamente 14 dígitos (informado: ${cleaned.length}).`,
      cleaned,
    };
  }

  if (/^(\d)\1{13}$/.test(cleaned)) {
    return {
      valid: false,
      error: 'O CNPJ informado possui sequência inválida de dígitos repetidos.',
      cleaned,
    };
  }

  // Cálculo oficial dos dígitos verificadores (Módulo 11 - Receita Federal)
  const calcDigit = (base: string, weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(base[i], 10) * weights[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calcDigit(cleaned.slice(0, 12), weights1);
  const d2 = calcDigit(cleaned.slice(0, 12) + d1.toString(), weights2);

  if (cleaned.slice(12) !== `${d1}${d2}`) {
    return {
      valid: false,
      error: 'Dígitos verificadores do CNPJ inválidos. Verifique a numeração digitada.',
      cleaned,
    };
  }

  return { valid: true, cleaned };
}

export function formatPhone(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDateTimeBR(isoString?: string | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateBR(dateString?: string | null): string {
  if (!dateString) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
