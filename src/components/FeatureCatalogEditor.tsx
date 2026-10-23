import { useId, useMemo, useState } from 'react';
import type { FeatureEntry } from '../model/types';
import type { FeatureDefinition } from '../lib/feature-catalog';
import { featureNameKey } from '../lib/feature-catalog';
import { createBlankFeature } from '../lib/ids';

export function FeatureCatalogEditor({
  title,
  catalog,
  entries,
  onChange,
}: {
  title: string;
  catalog: readonly FeatureDefinition[];
  entries: FeatureEntry[];
  onChange(entries: FeatureEntry[]): void;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const listId = `feature-values-${id}`;
  const [query, setQuery] = useState('');
  const groups = useMemo(() => [...new Set(catalog.map((entry) => entry.category))], [catalog]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(groups.slice(0, 1)));
  const normalizedQuery = featureNameKey(query);
  const valuesByName = new Map(entries.map((entry) => [featureNameKey(entry.name), entry]));
  const filledCount = catalog.filter((definition) => Boolean(valuesByName.get(featureNameKey(definition.name))?.value.trim())).length;

  const setValue = (name: string, value: string) => {
    const key = featureNameKey(name);
    const existing = valuesByName.get(key);
    if (existing) {
      onChange(entries.map((entry) => entry.id === existing.id ? { ...entry, value } : entry));
    } else {
      onChange([...entries, { ...createBlankFeature(), name, value }]);
    }
  };

  return (
    <div className="feature-catalog">
      <div className="feature-catalog__heading">
        <div>
          <span className="field__label">{title}</span>
          <span className="field__hint">{filledCount} de {catalog.length} propriedades preenchidas. Deixe em branco se o dado não for informado.</span>
        </div>
        <label className="feature-catalog__search-label">
          <span className="visually-hidden">Filtrar propriedades</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar propriedade…" aria-label="Buscar propriedade" />
        </label>
      </div>
      <datalist id={listId}><option value="Sim" /><option value="Não" /></datalist>
      <div className="feature-catalog__groups">
        {groups.map((group) => {
          const items = catalog.filter((entry) => entry.category === group
            && (!normalizedQuery || featureNameKey(entry.name).includes(normalizedQuery)));
          if (items.length === 0) return null;
          const filledInGroup = items.filter((entry) => Boolean(valuesByName.get(featureNameKey(entry.name))?.value.trim())).length;
          const open = normalizedQuery ? true : openGroups.has(group);
          return (
            <details
              className="feature-catalog__group"
              key={group}
              open={open}
              onToggle={(event) => {
                if (normalizedQuery) return;
                const isOpen = event.currentTarget.open;
                setOpenGroups((current) => {
                  const next = new Set(current);
                  if (isOpen) next.add(group); else next.delete(group);
                  return next;
                });
              }}
            >
              <summary><span>{group}</span><span className="feature-catalog__count">{filledInGroup}/{items.length}</span></summary>
              <div className="feature-catalog__fields">
                {items.map((definition) => {
                  const value = valuesByName.get(featureNameKey(definition.name))?.value ?? '';
                  return (
                    <label className="feature-catalog__field" key={definition.name}>
                      <span>{definition.name}</span>
                      <input
                        list={listId}
                        value={value}
                        onChange={(event) => setValue(definition.name, event.target.value)}
                        placeholder="Sim, Não ou descrição/especificação"
                        aria-label={`${definition.name}: Sim, Não ou descrição`}
                      />
                    </label>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
