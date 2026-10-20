import { useState } from 'react';
import type { GenerationResult, ValidationIssue } from '../model/types';
import { downloadText, makeHtmlDocument } from '../lib/storage';

const severityNames = { error: 'Erro', warning: 'Aviso', pending: 'Pendente' };

export function SchemaPanel({ result, projectName }: { result: GenerationResult; projectName: string }) {
  const [copyStatus, setCopyStatus] = useState('');
  const errors = result.issues.filter((entry) => entry.severity === 'error');
  const warnings = result.issues.filter((entry) => entry.severity === 'warning');
  const pending = result.issues.filter((entry) => entry.severity === 'pending');
  const entityTypes = Object.keys(result.entityCounts).sort();
  const filename = (projectName || 'pdp').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pdp';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.json);
      setCopyStatus('JSON-LD copiado');
    } catch {
      setCopyStatus('Cópia indisponível neste contexto; selecione o código manualmente.');
    }
    window.setTimeout(() => setCopyStatus(''), 2600);
  };
  const downloadJson = () => downloadText(`${filename}-schema.json`, result.json);
  const downloadHtml = () => downloadText(`${filename}-schema.html`, makeHtmlDocument(result.json), 'text/html;charset=utf-8');
  const jumpTo = (issue: ValidationIssue) => {
    if (!issue.target?.section) return;
    document.getElementById(issue.target.section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return <aside className="schema-panel" aria-label="Prévia e validação do JSON-LD">
    <div className="schema-panel__topline"><span className="eyebrow">SAÍDA E VALIDAÇÃO</span><span className="graph-badge"><span className="status-dot status-dot--ok" />1 JSON-LD · @graph</span></div>
    <div className={`readiness ${result.canExport ? 'readiness--ok' : 'readiness--blocked'}`}>
      <span className="readiness__icon">{result.canExport ? '✓' : '!'}</span>
      <div><strong>{result.canExport ? 'Grafo pronto para exportar' : 'Corrija os erros para exportar'}</strong>
        <span>{result.entityCounts.Product ? `${result.entityCounts.Product} versão(ões) · ` : ''}{result.document['@graph'].length} entidade(s) · {result.issues.length} apontamento(s)</span></div>
    </div>

    <div className="issue-summary" aria-label="Contagem de validações">
      <span className={errors.length ? 'issue-count issue-count--error' : 'issue-count'}><b>{errors.length}</b> erros</span>
      <span className="issue-count issue-count--warning"><b>{warnings.length}</b> avisos</span>
      <span className="issue-count issue-count--pending"><b>{pending.length}</b> pendências</span>
    </div>

    {entityTypes.length > 0 && <div className="entity-type-list" aria-label="Tipos de entidade no grafo">
      {entityTypes.map((type) => <span className="entity-chip" key={type}><code>{type}</code><b>{result.entityCounts[type]}</b></span>)}
    </div>}

    {result.issues.length > 0 && <div className="validation-list" role="region" aria-label="Erros, avisos e pendências">
      <div className="validation-list__heading"><span className="eyebrow">VERIFICAÇÃO</span><span>{result.issues.length} apontamento(s)</span></div>
      {result.issues.slice(0, 80).map((issue) => <button type="button" className={`validation-item validation-item--${issue.severity}`} key={issue.id} onClick={() => jumpTo(issue)}>
        <span className="validation-item__tag">{severityNames[issue.severity]}</span><span>{issue.message}</span><span className="validation-item__arrow">↗</span>
      </button>)}
      {result.issues.length > 80 && <div className="validation-list__more">Mais {result.issues.length - 80} apontamentos no formulário.</div>}
    </div>}

    {result.issues.length === 0 && <div className="validation-empty"><span className="status-dot status-dot--ok" />Sem erros, avisos ou placeholders.</div>}

    <div className="code-heading">
      <div><span className="eyebrow">BLOCO COMPLETO</span><h3>JSON-LD</h3><span className="code-heading__meta">{new Blob([result.json]).size.toLocaleString('pt-BR')} bytes · identação 2 espaços</span></div>
      <button type="button" className="button button--secondary button--small" onClick={copy} disabled={!result.canExport} aria-label="Copiar todo o JSON-LD">{copyStatus === 'JSON-LD copiado' ? 'Copiado ✓' : '⧉ Copiar tudo'}</button>
    </div>
    {copyStatus && <div className="copy-feedback" role="status">{copyStatus}</div>}

    <pre className="schema-code" tabIndex={0} aria-label="Código JSON-LD completo"><code>{result.json}</code></pre>

    <div className="export-actions">
      <button type="button" className="button button--primary" onClick={downloadJson} disabled={!result.canExport}>Baixar JSON</button>
      <button type="button" className="button button--secondary" onClick={downloadHtml} disabled={!result.canExport}>Baixar HTML</button>
    </div>
    <p className="export-footnote">O HTML contém um único <code>&lt;script type="application/ld+json"&gt;</code> com o grafo inteiro. Pendências opcionais são exibidas e omitidas; erros bloqueiam copiar e baixar.</p>
  </aside>;
}
