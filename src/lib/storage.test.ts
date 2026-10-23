import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProject } from './ids';
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
    const migrated = parseProjectArchive(JSON.stringify(makeProjectArchive([legacy])))[0];

    expect(migrated.data.sharedFeatures).toHaveLength(SHARED_FEATURE_CATALOG.length + 1);
    expect(migrated.data.versions[0].features).toHaveLength(VERSION_FEATURE_CATALOG.length + 1);
    expect(migrated.data.sharedFeatures.find((entry) => entry.name === 'Acabamento especial')?.value).toBe('Pintura fosca');
    expect(migrated.data.versions[0].features.find((entry) => entry.name === 'Som premium')?.value).toBe('10 alto-falantes');
    expect(migrated.data.versions[0].features.find((entry) => entry.name === 'Entrada USB')?.value).toBe('');
  });

  it('adiciona os campos do catálogo ao abrir dados legados do armazenamento local', () => {
    vi.stubGlobal('localStorage', localStorageStub);
    const legacy = createProject('Legado local');
    legacy.data.sharedFeatures = [];
    legacy.data.versions[0].features = [];
    memory.set('pdp-schema-projects-v1', JSON.stringify([legacy]));

    const loaded = loadProjects()[0];
    expect(loaded.data.sharedFeatures).toHaveLength(SHARED_FEATURE_CATALOG.length);
    expect(loaded.data.versions[0].features).toHaveLength(VERSION_FEATURE_CATALOG.length);
    expect(new Set(loaded.data.versions[0].features.map((entry) => entry.id)).size).toBe(VERSION_FEATURE_CATALOG.length);
  });
});
