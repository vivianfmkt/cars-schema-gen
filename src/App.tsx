import { useEffect, useMemo, useRef, useState } from 'react';
import type { BrandProfile, OrganizationProfile, PdpFormData, ProjectRecord } from './model/types';
import { cloneProject, createId, createProject } from './lib/ids';
import { generateSchema } from './lib/generator';
import { downloadText, loadProjects, makeProjectArchive, parseProjectArchive, saveProjects } from './lib/storage';
import { Field, FieldRow, SectionCard, Subheading, TagList } from './components/FormControls';
import { VersionEditor } from './components/VersionEditor';
import { MediaEditor } from './components/MediaEditor';
import { BreadcrumbEditor, FaqEditor, OffersEditor } from './components/StructuredExtras';
import { SchemaPanel } from './components/SchemaPanel';

const sections = [
  ['page', '01', 'Página e URLs'], ['organization', '02', 'Marca e organização'], ['model', '03', 'Modelo'],
  ['versions', '04', 'Versões'], ['media', '05', 'Imagens e vídeos'], ['offers', '06', 'Ofertas'],
  ['navigation', '07', 'Breadcrumbs'], ['faq', '08', 'Perguntas frequentes'],
] as const;

function initialState(): { projects: ProjectRecord[]; activeId: string } {
  const stored = loadProjects();
  if (stored.length) return { projects: stored, activeId: stored[0].id };
  const project = createProject();
  return { projects: [project], activeId: project.id };
}

function BrandMark() {
  return <svg className="brand-mark" viewBox="0 0 42 42" role="img" aria-label="Símbolo PDP de velocidade">
    <path d="M7 11h25" fill="none" stroke="#f7b512" strokeWidth="4" strokeLinecap="square" />
    <path d="m32 11-6 8H17" fill="none" stroke="#f47b20" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter" />
    <path d="m17 19-7 11h25" fill="none" stroke="#ed2d24" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>;
}

const CREATOR_CREDIT = 'Desenvolvido por Vívian Ferreira - Marketing Estratégico 360';

function CreatorCredit({ className }: { className: string }) {
  return <a className={className} href="https://www.linkedin.com/in/vivianfmkt" target="_blank" rel="noopener noreferrer">{CREATOR_CREDIT}</a>;
}

function ProfileFields({ title, profile, onChange, kind }: {
  title: string; profile: OrganizationProfile | BrandProfile;
  onChange(patch: Partial<OrganizationProfile & BrandProfile>): void; kind: 'organization' | 'brand';
}) {
  const isOrganization = kind === 'organization';
  return <div className="profile-block">
    <div className="profile-block__heading"><h3>{title}</h3><span className="micro-label">{isOrganization ? 'ORGANIZATION' : 'BRAND'}</span></div>
    <FieldRow>
      <Field label="Nome" value={profile.name} onChange={(name) => onChange({ name })} placeholder="Nome oficial" />
      <Field label="URL" value={profile.url} onChange={(url) => onChange({ url })} type="url" placeholder="https://…" />
      {isOrganization && <>
        <Field label="E-mail" value={(profile as OrganizationProfile).email} onChange={(email) => onChange({ email })} type="email" />
        <Field label="Telefone" value={(profile as OrganizationProfile).telephone} onChange={(telephone) => onChange({ telephone })} type="tel" />
        <Field label="URL do logotipo" value={(profile as OrganizationProfile).logoUrl} onChange={(logoUrl) => onChange({ logoUrl })} type="url" placeholder="https://…" />
      </>}
      <TagList label="Links oficiais (sameAs)" items={profile.sameAs} onChange={(sameAs) => onChange({ sameAs })} placeholder="URL de perfil oficial" wide />
    </FieldRow>
  </div>;
}

function OrganizationSection({ data, onChange }: { data: PdpFormData; onChange(data: PdpFormData): void }) {
  return <SectionCard id="organization" number="02" title="Marca, fabricante e organização" description="Cada entidade só é incluída quando há dados reais para identificá-la.">
    <Subheading title="Organização publicadora" description="Vinculada ao WebSite como publisher e usada como entidade quando há nome ou URL." />
    <ProfileFields title="Organização" kind="organization" profile={data.organization} onChange={(patch) => onChange({ ...data, organization: { ...data.organization, ...patch } })} />
    <div className="divider" />
    <Subheading title="Fabricante do veículo" description="Se fabricante e organização tiverem o mesmo nome, uma entidade é reutilizada." />
    <ProfileFields title="Fabricante" kind="organization" profile={data.manufacturer} onChange={(patch) => onChange({ ...data, manufacturer: { ...data.manufacturer, ...patch } })} />
    <div className="divider" />
    <Subheading title="Marca" description="A marca é uma entidade Brand relacionada ao veículo por @id." />
    <ProfileFields title="Marca do veículo" kind="brand" profile={data.brand} onChange={(patch) => onChange({ ...data, brand: { ...data.brand, ...patch } })} />
  </SectionCard>;
}

function PageSection({ data, onChange }: { data: PdpFormData; onChange(data: PdpFormData): void }) {
  const patch = (field: keyof PdpFormData, value: string) => onChange({ ...data, [field]: value });
  return <SectionCard id="page" number="01" title="Página e URLs" description="A URL canônica ancora os IDs estáveis das entidades e é necessária para o grafo.">
    <FieldRow>
      <Field label="URL canônica da PDP" value={data.pageUrl} onChange={(value) => patch('pageUrl', value)} type="url" placeholder="https://site.com/carros/modelo" required wide hint="Somente HTTP(S). Sem esta URL, a exportação é bloqueada." />
      <Field label="URL raiz do site" value={data.siteUrl} onChange={(value) => patch('siteUrl', value)} type="url" placeholder="https://site.com/" />
      <Field label="Nome do site" value={data.siteName} onChange={(value) => patch('siteName', value)} placeholder="Nome público do site" />
      <Field label="Título da página" value={data.pageTitle} onChange={(value) => patch('pageTitle', value)} placeholder="Título publicado" />
      <Field label="Idioma" value={data.language} onChange={(value) => patch('language', value)} placeholder="pt-BR" />
      <Field label="Descrição da página" value={data.pageDescription} onChange={(value) => patch('pageDescription', value)} rows={3} wide />
    </FieldRow>
    <div className="form-note"><span className="status-dot status-dot--info" />WebPage é gerada a partir da URL canônica. WebSite só é incluído quando a URL raiz é válida.</div>
  </SectionCard>;
}

function ProjectsSidebar({ projects, activeId, onSelect, onCreate, onDuplicate, onDelete, onExport, onImport, saveState, storageMessage }: {
  projects: ProjectRecord[]; activeId: string; onSelect(id: string): void; onCreate(): void; onDuplicate(): void;
  onDelete(): void; onExport(): void; onImport(): void; saveState: 'saving' | 'saved' | 'error'; storageMessage: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <aside className="workspace-sidebar">
    <div className="sidebar-brand"><BrandMark /><div><span className="sidebar-brand__name">PDP / Schema</span><span className="micro-label">WORKSPACE LOCAL</span></div></div>
    <div className="sidebar-section-heading"><span className="eyebrow">PROJETOS</span><span className="project-count">{String(projects.length).padStart(2, '0')}</span></div>
    <button type="button" className="button button--primary sidebar-new" onClick={onCreate}>＋ Novo projeto</button>
    <div className="project-list" role="group" aria-label="Projetos salvos">
      {projects.map((project) => <button type="button" className={`project-item${project.id === activeId ? ' project-item--active' : ''}`} key={project.id} onClick={() => onSelect(project.id)}>
        <span className="project-item__dot" /><span className="project-item__name">{project.name}</span><span className="project-item__date">{new Date(project.updatedAt).toLocaleDateString('pt-BR')}</span>
      </button>)}
    </div>
    <div className="sidebar-tools"><span className="eyebrow">ARQUIVO DE PROJETO</span>
      <button type="button" className="sidebar-tool" onClick={onDuplicate}>⧉ <span>Duplicar projeto</span></button>
      <button type="button" className="sidebar-tool" onClick={onExport}>↓ <span>Exportar backup</span></button>
      <button type="button" className="sidebar-tool" onClick={onImport}>↑ <span>Importar backup</span></button>
      <input ref={inputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => onImportFile(event, inputRef)} />
      <button type="button" className="sidebar-tool sidebar-tool--danger" onClick={onDelete} disabled={projects.length < 2}>× <span>Excluir projeto atual</span></button>
    </div>
    <div className={`save-indicator save-indicator--${saveState}`}><span className="status-dot" />
      <span>{saveState === 'saving' ? 'Salvando neste navegador…' : saveState === 'error' ? 'Falha ao salvar' : 'Salvo neste navegador'}</span></div>
    {storageMessage && <p className="storage-message">{storageMessage}</p>}
    <div className="sidebar-footer"><span>Armazenamento local</span><span>v1.0</span></div>
  </aside>;
}

function onImportFile(event: React.ChangeEvent<HTMLInputElement>, inputRef: React.RefObject<HTMLInputElement | null>) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => window.dispatchEvent(new CustomEvent('pdp-import-file', { detail: String(reader.result ?? '') }));
  reader.readAsText(file); inputRef.current && (inputRef.current.value = '');
}

function SectionNav({ active, onSelect }: { active: string; onSelect(id: string): void }) {
  return <nav className="section-nav" aria-label="Seções do formulário">
    <span className="eyebrow">DADOS DA PDP</span>
    {sections.map(([id, number, title]) => <button type="button" key={id} className={`section-nav__item${active === id ? ' section-nav__item--active' : ''}`} onClick={() => onSelect(id)}>
      <span className="section-nav__number">{number}</span><span>{title}</span>
    </button>)}
    <div className="sidebar-hint"><span className="status-dot status-dot--info" /><span>Campos opcionais permanecem vazios até você preenchê-los.</span></div>
  </nav>;
}

export default function App() {
  const [boot] = useState(initialState);
  const [projects, setProjects] = useState(boot.projects);
  const [activeId, setActiveId] = useState(boot.activeId);
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saved');
  const [storageMessage, setStorageMessage] = useState('');
  const [activeSection, setActiveSection] = useState('page');
  const [toast, setToast] = useState('');
  const [importError, setImportError] = useState('');
  const activeProject = projects.find((project) => project.id === activeId) ?? projects[0];
  const result = useMemo(() => generateSchema(activeProject.data), [activeProject.data]);

  useEffect(() => {
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      const saved = saveProjects(projects);
      setSaveState(saved.ok ? 'saved' : 'error');
      setStorageMessage(saved.message ?? '');
    }, 350);
    return () => window.clearTimeout(timer);
  }, [projects]);

  useEffect(() => {
    const handleImport = (event: Event) => {
      const text = (event as CustomEvent<string>).detail;
      try {
        const imported = parseProjectArchive(text);
        const usedIds = new Set(projects.map((project) => project.id));
        const normalized = imported.map((project) => {
          if (!usedIds.has(project.id)) { usedIds.add(project.id); return project; }
          const copy = cloneProject(project);
          while (usedIds.has(copy.id)) copy.id = createId();
          usedIds.add(copy.id); return copy;
        });
        setProjects((current) => [...current, ...normalized]);
        setActiveId(normalized[0]?.id ?? activeId);
        setImportError(''); showToast(`Importados ${normalized.length} projeto(s).`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Arquivo inválido.';
        setImportError(message); showToast(message);
      }
    };
    window.addEventListener('pdp-import-file', handleImport);
    return () => window.removeEventListener('pdp-import-file', handleImport);
  }, [projects, activeId]);

  function showToast(message: string) {
    setToast(message); window.setTimeout(() => setToast(''), 3200);
  }
  function patchActiveData(data: PdpFormData) {
    setProjects((current) => current.map((project) => project.id === activeProject.id
      ? { ...project, data, updatedAt: new Date().toISOString() } : project));
  }
  function renameProject(name: string) {
    setProjects((current) => current.map((project) => project.id === activeProject.id
      ? { ...project, name, updatedAt: new Date().toISOString() } : project));
  }
  function createNewProject() {
    const project = createProject(); setProjects((current) => [...current, project]); setActiveId(project.id); setActiveSection('page');
  }
  function duplicateActive() {
    const copy = cloneProject(activeProject); setProjects((current) => [...current, copy]); setActiveId(copy.id); showToast('Projeto duplicado.');
  }
  function deleteActive() {
    if (projects.length < 2 || !window.confirm(`Excluir o projeto “${activeProject.name}” deste navegador?`)) return;
    const next = projects.filter((project) => project.id !== activeProject.id);
    setProjects(next); setActiveId(next[0].id); showToast('Projeto removido do armazenamento local.');
  }
  function exportBackup() {
    downloadText('backup-projetos-pdp.json', JSON.stringify(makeProjectArchive(projects), null, 2));
  }
  function openImport() {
    const input = document.querySelector<HTMLInputElement>('.workspace-sidebar input[type="file"]');
    input?.click();
  }
  function navigate(id: string) {
    setActiveSection(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return <div className="app-shell">
    <ProjectsSidebar projects={projects} activeId={activeProject.id} onSelect={setActiveId} onCreate={createNewProject}
      onDuplicate={duplicateActive} onDelete={deleteActive} onExport={exportBackup} onImport={openImport}
      saveState={saveState} storageMessage={storageMessage} />
    <main className="app-main">
      <header className="topbar">
        <div className="topbar__brand"><BrandMark /><div><h1>Gerador de Schema <span>para PDP de carros</span></h1><span className="eyebrow">DADOS ESTRUTURADOS · JSON-LD</span><CreatorCredit className="topbar__credit" /></div></div>
        <label className="project-name-field"><span className="micro-label">PROJETO ATUAL</span><input aria-label="Nome do projeto atual" value={activeProject.name} onChange={(event) => renameProject(event.target.value)} /></label>
      </header>
      <div className="app-toolbar"><div className="app-toolbar__breadcrumb"><span>WORKSPACE</span><b>/</b><span className="app-toolbar__active">{activeProject.name || 'Novo projeto'}</span></div>
        <div className="app-toolbar__status"><span className={`status-dot ${result.canExport ? 'status-dot--ok' : 'status-dot--warn'}`} />{result.canExport ? 'Schema exportável' : 'Validação necessária'}</div>
      </div>
      <div className="workspace">
        <aside className="form-rail"><SectionNav active={activeSection} onSelect={navigate} />
          <div className="privacy-note"><span className="privacy-note__mark">LOCAL</span><p>Projetos e dados ficam neste navegador. Use o backup para transferir ou preservar seus dados.</p></div>
        </aside>
        <div className="form-column">
          <div className="form-intro"><span className="eyebrow">EDITOR DE DADOS</span><h2>Defina a página. <em>Monte o grafo.</em></h2><p>Insira os dados publicados da PDP. O JSON-LD é atualizado em tempo real; placeholders são detectados e nunca exportados.</p></div>
          {importError && <div className="notice notice--error" role="alert">{importError}<button type="button" onClick={() => setImportError('')}>×</button></div>}
          <PageSection data={activeProject.data} onChange={patchActiveData} />
          <OrganizationSection data={activeProject.data} onChange={patchActiveData} />
          <VersionEditor data={activeProject.data} onChange={patchActiveData} />
          <MediaEditor data={activeProject.data} onChange={patchActiveData} />
          <OffersEditor data={activeProject.data} onChange={patchActiveData} />
          <BreadcrumbEditor data={activeProject.data} onChange={patchActiveData} />
          <FaqEditor data={activeProject.data} onChange={patchActiveData} />
          <footer className="form-footer"><BrandMark /><span>Um grafo, relações explícitas, nenhum dado inventado.</span><CreatorCredit className="form-footer__credit" /><span className="micro-label">PDP / SCHEMA</span></footer>
        </div>
        <SchemaPanel result={result} projectName={activeProject.name} />
      </div>
    </main>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}
