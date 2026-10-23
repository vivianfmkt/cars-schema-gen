import { describe, expect, it } from 'vitest';
import { createBlankData } from './ids';
import {
  CORE_TYPED_SOURCE_PROPERTIES,
  SHARED_FEATURE_CATALOG,
  VERSION_FEATURE_CATALOG,
} from './feature-catalog';

describe('catálogo de propriedades extraído do TXT', () => {
  it('contém todos os nomes comuns e de versão não cobertos pelos campos tipados da v1', () => {
    expect(SHARED_FEATURE_CATALOG.map((entry) => entry.name)).toEqual([
      'Assistente de permanência em faixa',
      'Detecção de pedestres',
      'Detecção de ciclistas',
      'Controle eletrônico de estabilidade',
    ]);

    expect(VERSION_FEATURE_CATALOG.map((entry) => entry.name)).toEqual([
      'Direção',
      'Rodas',
      'Lanternas em LED',
      'Rack de Teto',
      'Acabamento Externo',
      'Design das Rodas',
      'Grade Frontal',
      'Logomarca Chevrolet (Bow Tie)',
      'Parachoques',
      'Assistente de Partida em Aclive',
      'Ar-condicionado',
      'Ar-condicionado Digital Automático',
      'Câmera de Ré',
      'Câmera de Ré Digital',
      'Chave com Sensor de Aproximação',
      'Controlador de Limite de Velocidade',
      'Easy Entry',
      'Easy Park',
      'Easy Start',
      'Sistema de Luz Siga-me',
      'Sistema de Luz Leve-me',
      'Travas Elétricas',
      'Vidros Elétricos',
      'Carregador sem Fio',
      'Painel Digital',
      'Central Multimídia',
      'Rádio AM/FM',
      'Entrada USB',
      'Android Auto',
      'Apple CarPlay',
      'Wi-Fi embarcado',
      'OnStar',
      'Alerta de Frenagem de Emergência',
      'Alerta de Colisão Frontal',
      'Alerta de Ponto Cego',
      'Frenagem Automática de Emergência em Baixa Velocidade',
      'Indicador de Distância do Veículo da Frente',
      'Monitoramento da Pressão dos Pneus',
      'ISOFIX',
      'TOP TETHER',
      'ABS',
      'EBD',
      'Assistência de Frenagem de Urgência',
    ]);

    expect(VERSION_FEATURE_CATALOG).toHaveLength(43);
    expect(SHARED_FEATURE_CATALOG).toHaveLength(4);
    expect(CORE_TYPED_SOURCE_PROPERTIES.map((entry) => entry.name)).toEqual([
      'Motorização',
      'Potência Máxima Gasolina',
      'Potência Máxima Etanol',
      'Torque Máximo Gasolina',
      'Torque Máximo Etanol',
      'Transmissão',
      'Tração',
      'Airbags',
    ]);

    const allSourcePropertyNames = [
      ...SHARED_FEATURE_CATALOG.map((entry) => entry.name),
      ...VERSION_FEATURE_CATALOG.map((entry) => entry.name),
      ...CORE_TYPED_SOURCE_PROPERTIES.map((entry) => entry.name),
    ];
    expect(new Set(allSourcePropertyNames).size).toBe(55);
  });

  it('pré-carrega IDs independentes e valores vazios em projetos e versões novos', () => {
    const data = createBlankData();
    expect(data.sharedFeatures.map((entry) => entry.name)).toEqual(SHARED_FEATURE_CATALOG.map((entry) => entry.name));
    expect(data.versions[0].features.map((entry) => entry.name)).toEqual(VERSION_FEATURE_CATALOG.map((entry) => entry.name));
    expect([...data.sharedFeatures, ...data.versions[0].features].every((entry) => entry.value === '')).toBe(true);
    const ids = [...data.sharedFeatures, ...data.versions[0].features].map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
