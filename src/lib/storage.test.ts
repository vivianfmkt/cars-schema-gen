import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProject } from './ids';
import { loadProjects, makeHtmlDocument, makeProjectArchive, parseProjectArchive, saveProjects } from './storage';

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
});
