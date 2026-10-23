export interface FeatureDefinition {
  name: string;
  category: string;
}

export const SHARED_FEATURE_CATALOG: readonly FeatureDefinition[] = [
  { name: 'Assistente de permanência em faixa', category: 'Segurança e assistência ao motorista' },
  { name: 'Detecção de pedestres', category: 'Segurança e assistência ao motorista' },
  { name: 'Detecção de ciclistas', category: 'Segurança e assistência ao motorista' },
  { name: 'Controle eletrônico de estabilidade', category: 'Segurança e assistência ao motorista' },
];

export const VERSION_FEATURE_CATALOG: readonly FeatureDefinition[] = [
  { name: 'Direção', category: 'Direção, rodas e acabamento' },
  { name: 'Rodas', category: 'Direção, rodas e acabamento' },
  { name: 'Lanternas em LED', category: 'Direção, rodas e acabamento' },
  { name: 'Rack de Teto', category: 'Direção, rodas e acabamento' },
  { name: 'Acabamento Externo', category: 'Direção, rodas e acabamento' },
  { name: 'Design das Rodas', category: 'Direção, rodas e acabamento' },
  { name: 'Grade Frontal', category: 'Direção, rodas e acabamento' },
  { name: 'Logomarca Chevrolet (Bow Tie)', category: 'Direção, rodas e acabamento' },
  { name: 'Parachoques', category: 'Direção, rodas e acabamento' },

  { name: 'Assistente de Partida em Aclive', category: 'Conforto e conveniência' },
  { name: 'Ar-condicionado', category: 'Conforto e conveniência' },
  { name: 'Ar-condicionado Digital Automático', category: 'Conforto e conveniência' },
  { name: 'Câmera de Ré', category: 'Conforto e conveniência' },
  { name: 'Câmera de Ré Digital', category: 'Conforto e conveniência' },
  { name: 'Chave com Sensor de Aproximação', category: 'Conforto e conveniência' },
  { name: 'Controlador de Limite de Velocidade', category: 'Conforto e conveniência' },
  { name: 'Easy Entry', category: 'Conforto e conveniência' },
  { name: 'Easy Park', category: 'Conforto e conveniência' },
  { name: 'Easy Start', category: 'Conforto e conveniência' },
  { name: 'Sistema de Luz Siga-me', category: 'Conforto e conveniência' },
  { name: 'Sistema de Luz Leve-me', category: 'Conforto e conveniência' },
  { name: 'Travas Elétricas', category: 'Conforto e conveniência' },
  { name: 'Vidros Elétricos', category: 'Conforto e conveniência' },
  { name: 'Carregador sem Fio', category: 'Conforto e conveniência' },

  { name: 'Painel Digital', category: 'Multimídia e conectividade' },
  { name: 'Central Multimídia', category: 'Multimídia e conectividade' },
  { name: 'Rádio AM/FM', category: 'Multimídia e conectividade' },
  { name: 'Entrada USB', category: 'Multimídia e conectividade' },
  { name: 'Android Auto', category: 'Multimídia e conectividade' },
  { name: 'Apple CarPlay', category: 'Multimídia e conectividade' },
  { name: 'Wi-Fi embarcado', category: 'Multimídia e conectividade' },
  { name: 'OnStar', category: 'Multimídia e conectividade' },

  { name: 'Alerta de Frenagem de Emergência', category: 'Segurança e assistência ao motorista' },
  { name: 'Alerta de Colisão Frontal', category: 'Segurança e assistência ao motorista' },
  { name: 'Alerta de Ponto Cego', category: 'Segurança e assistência ao motorista' },
  { name: 'Frenagem Automática de Emergência em Baixa Velocidade', category: 'Segurança e assistência ao motorista' },
  { name: 'Indicador de Distância do Veículo da Frente', category: 'Segurança e assistência ao motorista' },
  { name: 'Monitoramento da Pressão dos Pneus', category: 'Segurança e assistência ao motorista' },
  { name: 'ISOFIX', category: 'Segurança e assistência ao motorista' },
  { name: 'TOP TETHER', category: 'Segurança e assistência ao motorista' },
  { name: 'ABS', category: 'Segurança e assistência ao motorista' },
  { name: 'EBD', category: 'Segurança e assistência ao motorista' },
  { name: 'Assistência de Frenagem de Urgência', category: 'Segurança e assistência ao motorista' },
];

/**
 * Nomes encontrados no TXT que já possuem campos tipados na versão 1.
 * Eles continuam nos formulários técnicos existentes e não são duplicados no catálogo.
 */
export const CORE_TYPED_SOURCE_PROPERTIES = [
  { name: 'Motorização', field: 'Tipo de motor' },
  { name: 'Potência Máxima Gasolina', field: 'Potência gasolina' },
  { name: 'Potência Máxima Etanol', field: 'Potência etanol' },
  { name: 'Torque Máximo Gasolina', field: 'Torque gasolina' },
  { name: 'Torque Máximo Etanol', field: 'Torque etanol' },
  { name: 'Transmissão', field: 'Transmissão' },
  { name: 'Tração', field: 'Tração' },
  { name: 'Airbags', field: 'Airbags' },
] as const;

export function featureNameKey(value: string): string {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function isCatalogFeatureName(value: string, scope: 'shared' | 'version'): boolean {
  const catalog = scope === 'shared' ? SHARED_FEATURE_CATALOG : VERSION_FEATURE_CATALOG;
  const key = featureNameKey(value);
  return catalog.some((entry) => featureNameKey(entry.name) === key);
}
