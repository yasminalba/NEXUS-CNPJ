export type UserRole = 'admin' | 'funcionario';
export type UserStatus = 'ativo' | 'inativo' | 'pendente_confirmacao';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  email_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CnaeItem {
  codigo: string;
  descricao: string;
}

export interface CompanyAddress {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
}

export interface QsaPartner {
  nome_socio: string;
  qualificacao_socio: string;
  faixa_etaria?: string;
  data_entrada_sociedade?: string;
}

export interface Company {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao: string; // ATIVA | INAPTA | BAIXADA | SUSPENSA | NULA
  data_abertura: string;
  data_situacao: string;
  porte: string;
  natureza_juridica: string;
  capital_social: number;
  tipo_estabelecimento: string; // MATRIZ | FILIAL
  cnae_principal: CnaeItem;
  cnaes_secundarios: CnaeItem[];
  endereco: CompanyAddress;
  telefone: string;
  email: string;
  website: string;
  situacao_especial: string;
  data_situacao_especial: string;
  qsa: QsaPartner[];
  latitude: number | null;
  longitude: number | null;
  fonte_oficial?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanySearchRecord {
  id: string;
  user_id: string;
  company_id: string;
  cnpj: string;
  searched_at: string;
  company?: {
    razao_social: string;
    nome_fantasia: string;
    situacao: string;
    municipio?: string;
    uf?: string;
  };
  user_name?: string;
  user_email?: string;
}

export type RequestStatus = 'Pendente' | 'Em análise' | 'Aprovada' | 'Recusada';

export interface UpdateRequestRecord {
  id: string;
  user_id: string;
  company_id: string;
  cnpj: string;
  company_name: string;
  field_name: string;
  field_label: string;
  old_value: string;
  requested_value: string;
  justification: string;
  verification_method: string;
  otp_verified: boolean;
  status: RequestStatus;
  admin_id: string | null;
  admin_name: string | null;
  admin_notes: string;
  created_at: string;
  reviewed_at: string | null;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

export interface AuditLogRecord {
  id: string;
  user_id: string | null;
  user_name: string;
  user_email: string;
  user_role: string;
  action: string;
  target_type: string;
  target_id: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ServicePriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';
export type ServiceStatus = 'Pendente' | 'Em andamento' | 'Concluído';

export interface ServiceTransferItem {
  id: string;
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  note: string;
  transferred_at: string;
}

export interface ServiceAssignmentRecord {
  id: string;
  cnpj: string;
  company_name: string;
  service_type: string;
  title: string;
  description: string;
  priority: ServicePriority;
  status: ServiceStatus;
  assigned_to_id: string;
  assigned_to_name: string;
  assigned_to_email: string;
  assigned_by_id: string;
  assigned_by_name: string;
  assigned_by_email: string;
  due_date: string | null;
  transfer_history: ServiceTransferItem[];
  created_at: string;
  updated_at: string;
}
