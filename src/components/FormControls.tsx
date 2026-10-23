import { useId, useState, type FormEvent, type ReactNode } from 'react';
import type { FeatureEntry } from '../model/types';
import { createBlankFeature } from '../lib/ids';

interface FieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
  placeholder?: string;
  hint?: string;
  unit?: string;
  type?: string;
  inputMode?: 'text' | 'decimal' | 'numeric' | 'email' | 'url' | 'tel';
  required?: boolean;
  wide?: boolean;
  rows?: number;
}

export function Field({ label, value, onChange, placeholder, hint, unit, type = 'text', inputMode, required, wide, rows }: FieldProps) {
  const controlId = `field-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <label className={`field${wide ? ' field--wide' : ''}`} htmlFor={controlId}>
      <span className="field__label">{label}{required && <span className="field__required"> obrigatório</span>}</span>
      <span className="field__control-wrap">
        {rows ? <textarea id={controlId} value={value} rows={rows} placeholder={placeholder} inputMode={inputMode} required={required} aria-required={required || undefined} onChange={(event) => onChange(event.target.value)} />
          : <input id={controlId} type={type} value={value} placeholder={placeholder} inputMode={inputMode} required={required} aria-required={required || undefined} onChange={(event) => onChange(event.target.value)} />}
        {unit && <span className="field__unit">{unit}</span>}
      </span>
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function SelectField({ label, value, onChange, options, hint, wide }: { label: string; value: string; onChange(value: string): void; options: [string, string][]; hint?: string; wide?: boolean }) {
  const controlId = `field-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <label className={`field${wide ? ' field--wide' : ''}`} htmlFor={controlId}>
      <span className="field__label">{label}</span>
      <select id={controlId} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Não especificado</option>
        {options.map(([optionValue, name]) => <option key={optionValue} value={optionValue}>{name}</option>)}
      </select>
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function FieldRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`field-row ${className}`}>{children}</div>;
}

export function SectionCard({ id, number, title, description, children, aside }: { id: string; number: string; title: string; description?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="section-card" id={id} data-section={id}>
      <header className="section-card__header">
        <span className="section-card__number">{number}</span>
        <div className="section-card__heading"><h2>{title}</h2>{description && <p>{description}</p>}</div>
        {aside && <div className="section-card__aside">{aside}</div>}
      </header>
      <div className="section-card__body">{children}</div>
    </section>
  );
}

export function Subheading({ title, description }: { title: string; description?: string }) {
  return <div className="subheading"><h3>{title}</h3>{description && <p>{description}</p>}</div>;
}

export function TagList({ label, items, onChange, placeholder = 'Adicionar item…', hint, wide }: { label: string; items: string[]; onChange(items: string[]): void; placeholder?: string; hint?: string; wide?: boolean }) {
  const [draft, setDraft] = useState('');
  const add = (event?: FormEvent) => {
    event?.preventDefault();
    const value = draft.trim();
    if (!value || items.some((item) => item.toLocaleLowerCase('pt-BR') === value.toLocaleLowerCase('pt-BR'))) return;
    onChange([...items, value]); setDraft('');
  };
  return (
    <div className={`tag-editor${wide ? ' field--wide' : ''}`}>
      <span className="field__label">{label}</span>
      {!!items.length && <div className="tag-list">{items.map((item, index) => <span className="tag" key={`${item}-${index}`}>
        {item}<button type="button" aria-label={`Remover ${item}`} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>×</button>
      </span>)}</div>}
      <form className="tag-entry" onSubmit={add}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} aria-label={label} />
        <button type="submit" className="button button--small button--secondary">Adicionar</button>
      </form>
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export function FeatureList({ title, entries, onChange, hint }: { title: string; entries: FeatureEntry[]; onChange(entries: FeatureEntry[]): void; hint?: string }) {
  const patch = (id: string, values: Partial<FeatureEntry>) => onChange(entries.map((entry) => entry.id === id ? { ...entry, ...values } : entry));
  return (
    <div className="feature-list">
      <div className="feature-list__heading"><div><span className="field__label">{title}</span>{hint && <span className="field__hint">{hint}</span>}</div>
        <button type="button" className="button button--small button--secondary" onClick={() => onChange([...entries, createBlankFeature()])}>＋ Adicionar</button>
      </div>
      {entries.length === 0 && <p className="empty-inline">Nenhuma característica adicionada.</p>}
      {entries.map((entry) => <div className="feature-row" key={entry.id}>
        <input aria-label="Propriedade" value={entry.name} onChange={(event) => patch(entry.id, { name: event.target.value })} placeholder="Propriedade" />
        <input aria-label="Valor da característica" value={entry.value} onChange={(event) => patch(entry.id, { value: event.target.value })} placeholder="Valor" />
        <button type="button" className="icon-button icon-button--danger" aria-label="Remover característica" onClick={() => onChange(entries.filter((item) => item.id !== entry.id))}>×</button>
      </div>)}
    </div>
  );
}
