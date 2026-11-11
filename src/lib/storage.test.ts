import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBlankVersion, createProject } from './ids';
import { loadProjects, makeHtmlDocument, makeProjectArchive, parseProjectArchive, saveProjects } from './storage';
import { SHARED_FEATURE_CATALOG, VERSION_FEATURE_CATALOG } from './feature-catalog';

const memory = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
};

afterEach(() => { memory.clear(); vi.unstubAllGlobals(); });

describe('persistência e exportação', () => {
  it('salva e carrega projetos de forma independente no armazenamento local', () => {
    vi.stubGlobal('localStorage', localStorageStub);
    const one = createProject('Projeto Um');
    const two = createProject('Projeto Dois');
    two.data.modelName = 'Modelo Dois';
    expect(saveProjects([one, two]).ok).toBe(true);
    const loaded = loadProjects();
    expect(loaded.map((project) => project.name)).toEqual(['Projeto Um', 'Projeto Dois']);
    expect(loaded[1].data.modelName).toBe('Modelo Dois');
  });

  it('exporta e importa arquivo de backup versionado com vários projetos', () => {
    const projects = [createProject('Um'), createProject('Dois')];
    const archive = makeProjectArchive(projects);
    expect(archive.version).toBe(3);
    expect(parseProjectArchive(JSON.stringify(archive))).toHaveLength(2);
    expect(() => parseProjectArchive('{"projects":[]}')).toThrow(/Formato/);
  });

  it('gera HTML com exatamente um script e escapa texto capaz de encerrar a tag', () => {
    const html = makeHtmlDocument('{"@context":"https://schema.org","text":"</script><script>alert(1)</script>"}');
    expect(html.match(/<script\b/g)).toHaveLength(1);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).toContain('\\u003c/script>');
  });
});


describe('validação de backups', () => {
  it('rejeita projeto com estruturas obrigatórias ausentes em vez de importá-lo parcialmente', () => {
    const project = createProject('Incompleto');
    const broken = { ...project, data: { ...project.data, organization: undefined } };
    const archive = makeProjectArchive([broken as unknown as ReturnType<typeof createProject>]);
    expect(() => parseProjectArchive(JSON.stringify(archive))).toThrow(/estrutura de dados inválida/);
  });

  it('rejeita IDs de projeto repetidos no mesmo arquivo de backup', () => {
    const project = createProject('Original');
    const collision = { ...project, name: 'Colisão' };
    expect(() => parseProjectArchive(JSON.stringify(makeProjectArchive([project, collision])))).toThrow(/IDs de projeto repetidos/);
  });

  it('migra backup v1 adicionando propriedades ausentes e preservando as personalizadas', () => {
    const legacy = createProject('Legado v1');
    legacy.data.sharedFeatures = [{ id: 'custom-shared', name: 'Acabamento especial', value: 'Pintura fosca' }];
    legacy.data.versions[0].features = [{ id: 'custom-version', name: 'Som premium', value: '10 alto-falantes' }];
    delete (legacy.data as unknown as Record<string, unknown>).sharedVehicleProperties;
    const legacyVersion = legacy.data.versions[0] as unknown as Record<string, unknown>;
    const legacyConsumption = legacyVersion.consumption as Record<string, unknown>;
    legacyConsumption.urbanGasoline = '11,5';
    legacyConsumption.highwayGasoline = '11,2 a 11,5';
    legacyVersion.emissionsCO2 = '120,5';
    const v1Archive = { ...makeProjectArchive([legacy]), version: 1 as const };
    const migrated = parseProjectArchive(JSON.stringify(v1Archive))[0];

    expect(migrated.data.sharedFeatures).toHaveLength(SHARED_FEATURE_CATALOG.length + 1);
    expect(migrated.data.versions[0].features).toHaveLength(VERSION_FEATURE_CATALOG.length + 1);
    expect(migrated.data.sharedFeatures.find((entry) => entry.name === 'Acabamento especial')?.value).toBe('Pintura fosca');
    expect(migrated.data.versions[0].features.find((entry) => entry.name === 'Som premium')?.value).toBe('10 alto-falantes');
    expect(migrated.data.sharedFeatures.find((entry) => entry.name === 'Android Auto')?.value).toBe('');
    expect(migrated.data.sharedVehicleProperties.fuelType).toBe('');
    expect(migrated.data.versions[0].consumption.urbanGasoline.value).toBe('11.5');
    expect(migrated.data.versions[0].consumption.highwayGasoline).toEqual({ value: '', minValue: '11.2', maxValue: '11.5' });
    expect(migrated.data.versions[0].emissionsCO2.value).toBe('120.5');
  });

  it('adiciona os campos do catálogo ao abrir dados legados do armazenamento local', () => {
    vi.stubGlobal('localStorage', localStorageStub);
    const legacy = createProject('Legado local');
    delete (legacy.data as unknown as Record<string, unknown>).sharedVehicleProperties;
    legacy.data.sharedFeatures = [];
    legacy.data.versions[0].features = [];
    (legacy.data.versions[0] as unknown as Record<string, unknown>).emissionsCO2 = '99,4';
    memory.set('pdp-schema-projects-v1', JSON.stringify([legacy]));

    const loaded = loadProjects()[0];
    expect(loaded.data.sharedFeatures).toHaveLength(SHARED_FEATURE_CATALOG.length);
    expect(loaded.data.versions[0].features).toHaveLength(VERSION_FEATURE_CATALOG.length);
    expect(new Set(loaded.data.versions[0].features.map((entry) => entry.id)).size).toBe(VERSION_FEATURE_CATALOG.length);
    expect(loaded.data.versions[0].emissionsCO2.value).toBe('99.4');
  });

  it('migra propriedades comuns antigas, remove-as das versões e sinaliza apenas divergências', () => {
    const project = createProject('Legado v2');
    const first = project.data.versions[0] as unknown as Record<string, unknown>;
    const firstMeasurements = first.measurements as Record<string, unknown>;
    first.fuelType = 'Flex'; first.driveWheelConfiguration = 'Dianteira'; first.transmission = 'Automática';
    first.numberOfDoors = '4'; first.seatingCapacity = '5'; first.numberOfAirbags = '6';
    firstMeasurements.wheelbase = '2.700';
    first.features = [
      { id: 'legacy-steering-1', name: 'Direção', value: 'Elétrica' },
      { id: 'legacy-android-1', name: 'Android Auto', value: 'Sim' },
    ];
    const second = createBlankVersion('Versão B') as unknown as Record<string, unknown>;
    const secondMeasurements = second.measurements as Record<string, unknown>;
    second.fuelType = 'Flex'; second.driveWheelConfiguration = 'Dianteira'; second.transmission = 'Automática';
    second.numberOfDoors = '5'; second.seatingCapacity = '5'; second.numberOfAirbags = '6';
    secondMeasurements.wheelbase = '2.700';
    second.features = [
      { id: 'legacy-steering-2', name: 'Direção', value: 'Elétrica' },
      { id: 'legacy-android-2', name: 'Android Auto', value: 'Não' },
    ];
    project.data.versions.push(second as unknown as typeof project.data.versions[number]);
    const archive = { format: 'pdp-schema-projects' as const, version: 2 as const, projects: [project] };
    const migrated = parseProjectArchive(JSON.stringify(archive))[0];

    expect(migrated.data.sharedVehicleProperties.fuelType).toBe('Flex');
    expect(migrated.data.sharedVehicleProperties.driveWheelConfiguration).toBe('Dianteira');
    expect(migrated.data.sharedVehicleProperties.vehicleTransmission).toBe('Automática');
    expect(migrated.data.sharedVehicleProperties.numberOfDoors).toBe('');
    expect(migrated.data.sharedVehicleProperties.seatingCapacity).toBe('5');
    expect(migrated.data.sharedVehicleProperties.numberOfAirbags).toBe('6');
    expect(migrated.data.sharedMeasurements.wheelbase).toBe('2.700');
    expect(migrated.data.sharedFeatures.find((entry) => entry.name === 'Direção')?.value).toBe('Elétrica');
    expect(migrated.data.sharedFeatures.find((entry) => entry.name === 'Android Auto')?.value).toBe('');
    expect(migrated.data.versions.every((version) => version.features.every((feature) => !['Direção', 'Android Auto'].includes(feature.name)))).toBe(true);
    expect(migrated.data.versions[0].measurements).not.toHaveProperty('wheelbase');
    expect(migrated.data.versions[0]).not.toHaveProperty('fuelType');
    expect(migrated.data.versions[0]).not.toHaveProperty('numberOfDoors');
    expect(migrated.data.migrationConflicts.map((conflict) => `${conflict.target}:${conflict.key}`).sort()).toEqual(['feature:android auto', 'vehicleProperty:numberOfDoors']);
    vi.stubGlobal('localStorage', localStorageStub);
    memory.set('pdp-schema-projects-v1', JSON.stringify([project]));
    const openedOnce = loadProjects()[0];
    expect(openedOnce.data.migrationConflicts).toHaveLength(2);
    expect(saveProjects([openedOnce]).ok).toBe(true);
    const openedTwice = loadProjects()[0];
    expect(openedTwice.data).toEqual(openedOnce.data);
  });

  it('não promove automaticamente valores legados parciais e trata números equivalentes como consenso', () => {
    const project = createProject('Legado com campos parciais');
    const first = project.data.versions[0] as unknown as Record<string, unknown>;
    const firstMeasurements = first.measurements as Record<string, unknown>;
    first.fuelType = 'Flex'; first.numberOfDoors = '4'; firstMeasurements.wheelbase = '2.700';
    first.features = [{ id: 'legacy-direction', name: 'Direção', value: 'Elétrica' }];
    const second = createBlankVersion('Versão B') as unknown as Record<string, unknown>;
    const secondMeasurements = second.measurements as Record<string, unknown>;
    second.fuelType = ''; second.numberOfDoors = '4.0'; secondMeasurements.wheelbase = '2700';
    project.data.versions.push(second as unknown as typeof project.data.versions[number]);
    const archive = { format: 'pdp-schema-projects' as const, version: 2 as const, projects: [project] };
    const migrated = parseProjectArchive(JSON.stringify(archive))[0];

    expect(migrated.data.sharedVehicleProperties.fuelType).toBe('');
    expect(migrated.data.sharedVehicleProperties.numberOfDoors).toBe('4');
    expect(migrated.data.sharedMeasurements.wheelbase).toBe('2.700');
    expect(migrated.data.sharedFeatures.find((entry) => entry.name === 'Direção')?.value).toBe('');
    expect(migrated.data.migrationConflicts.map((conflict) => `${conflict.target}:${conflict.key}`).sort()).toEqual([
      'feature:direcao', 'vehicleProperty:fuelType',
    ]);
    expect(migrated.data.migrationConflicts.find((conflict) => conflict.key === 'fuelType')?.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ versionName: 'Versão B', value: '' }),
    ]));
    const importedAgain = parseProjectArchive(JSON.stringify(makeProjectArchive([migrated])))[0];
    expect(importedAgain.data).toEqual(migrated.data);
    expect(importedAgain.data.migrationConflicts).toEqual(migrated.data.migrationConflicts);
    expect(importedAgain.data.sharedFeatures.filter((entry) => entry.name === 'Direção')).toHaveLength(1);
    expect(importedAgain.data.versions.every((version) => !version.features.some((feature) => feature.name === 'Direção'))).toBe(true);
  });
});
