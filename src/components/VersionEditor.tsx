import { useState } from 'react';
import type { Measurements, NumericMeasureDraft, PdpFormData, VehicleVersion, VersionMeasurements } from '../model/types';
import { cleanText, createBlankVersion, createId } from '../lib/ids';
import { featureNameKey, isCatalogFeatureName, SHARED_FEATURE_CATALOG, VERSION_FEATURE_CATALOG } from '../lib/feature-catalog';
import { Field, FieldRow, FeatureList, SectionCard, Subheading, TagList } from './FormControls';
import { FeatureCatalogEditor } from './FeatureCatalogEditor';

const sharedMeasurementFields: [keyof Measurements, string, string, string][] = [
  ['length', 'Comprimento', 'mm', 'length'], ['width', 'Largura', 'mm', 'width'], ['height', 'Altura', 'mm', 'height'],
  ['wheelbase', 'Entre-eixos', 'mm', 'wheelbase'], ['cargoVolume', 'Volume do porta-malas', 'L', 'cargoVolume'], ['fuelCapacity', 'Capacidade do tanque', 'L', 'fuelCapacity'],
];
const versionMeasurementFields: [keyof VersionMeasurements, string, string, string][] = [
  ['length', 'Comprimento', 'mm', 'length'], ['width', 'Largura', 'mm', 'width'], ['height', 'Altura', 'mm', 'height'],
  ['cargoVolume', 'Volume do porta-malas', 'L', 'cargoVolume'], ['fuelCapacity', 'Capacidade do tanque', 'L', 'fuelCapacity'],
];
const consumptionFields: [keyof VehicleVersion['consumption'], string][] = [
  ['urbanGasoline', 'Consumo urbano · gasolina'], ['highwayGasoline', 'Consumo rodoviário · gasolina'],
  ['urbanEthanol', 'Consumo urbano · etanol'], ['highwayEthanol', 'Consumo rodoviário · etanol'],
];

function versionSubtitle(version: VehicleVersion): string {
  return [cleanText(version.configuration), cleanText(version.modelDate), cleanText(version.engineType)].filter(Boolean).slice(0, 2).join(' · ') || 'Dados independentes';
}

function NumericMeasureFields({ label, property, unit, value, onChange }: {
  label: string; property: string; unit: string; value: NumericMeasureDraft; onChange(value: NumericMeasureDraft): void;
}) {
  const patch = (key: keyof NumericMeasureDraft, nextValue: string) => {
    const next = { ...value, [key]: nextValue };
    if (nextValue && key === 'value') { next.minValue = ''; next.maxValue = ''; }
    if (nextValue && key !== 'value') next.value = '';
    onChange(next);
  };
  return <div className="numeric-measure">
    <span className="numeric-measure__title">{label} <span>{unit}</span><code className="field__schema-property">{property}</code></span>
    <FieldRow className="numeric-measure__fields">
      <Field label="Valor exato" schemaProperty="value" value={value.value} onChange={(next) => patch('value', next)} inputMode="decimal" placeholder="Ex.: 11.5" />
      <Field label="Mínimo" schemaProperty="minValue" value={value.minValue} onChange={(next) => patch('minValue', next)} inputMode="decimal" placeholder="Ex.: 10.0" />
      <Field label="Máximo" schemaProperty="maxValue" value={value.maxValue} onChange={(next) => patch('maxValue', next)} inputMode="decimal" placeholder="Ex.: 12.5" />
    </FieldRow>
  </div>;
}

function MigrationConflictResolver({ data, onChange }: { data: PdpFormData; onChange(data: PdpFormData): void }) {
  if (!data.migrationConflicts.length) return null;
  const resolve = (conflictId: string, value: string) => {
    const conflict = data.migrationConflicts.find((item) => item.id === conflictId);
    if (!conflict) return;
    const next = { ...data, migrationConflicts: data.migrationConflicts.filter((item) => item.id !== conflictId) };
    if (conflict.target === 'vehicleProperty' && Object.hasOwn(data.sharedVehicleProperties, conflict.key)) {
      next.sharedVehicleProperties = { ...data.sharedVehicleProperties, [conflict.key]: value };
    } else if (conflict.target === 'measurement' && Object.hasOwn(data.sharedMeasurements, conflict.key)) {
      next.sharedMeasurements = { ...data.sharedMeasurements, [conflict.key]: value };
    } else if (conflict.target === 'feature') {
      const match = data.sharedFeatures.find((feature) => featureNameKey(feature.name) === conflict.key);
      next.sharedFeatures = match
        ? data.sharedFeatures.map((feature) => feature.id === match.id ? { ...feature, value } : feature)
        : [...data.sharedFeatures, { id: createId(), name: conflict.label, value }];
    } else return;
    onChange(next);
  };
  return <div className="migration-conflicts" role="group" aria-label="Resolver conflitos de migração">
    <div className="migration-conflicts__heading"><strong>Escolha os dados comuns para este modelo</strong>
      <span>O backup antigo continha valores diferentes entre versões. Escolha um valor; os dados antigos não serão atribuídos silenciosamente a cada veículo.</span></div>
    {data.migrationConflicts.map((conflict) => <div className="migration-conflict" key={conflict.id}>
      <div className="migration-conflict__title">{conflict.label}</div>
      <div className="migration-conflict__options">
        {conflict.candidates.map((candidate, index) => <button type="button" className="migration-conflict__option" key={`${candidate.versionId}-${index}`} onClick={() => resolve(conflict.id, candidate.value)}>
          <span>{candidate.versionName}</span><strong>{candidate.value || 'Sem valor preenchido'}</strong>
        </button>)}
        <button type="button" className="migration-conflict__option migration-conflict__option--empty" onClick={() => resolve(conflict.id, '')}>
          <span>Não usar valor compartilhado</span><strong>Manter vazio</strong>
        </button>
      </div>
    </div>)}
  </div>;
}

function VersionCard({ version, index, count, onPatch, onDuplicate, onDelete, onMove }: {
  version: VehicleVersion; index: number; count: number; onPatch(patch: Partial<VehicleVersion>): void;
  onDuplicate(): void; onDelete(): void; onMove(direction: -1 | 1): void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const patchMeasurement = (key: keyof VersionMeasurements, value: string) => onPatch({ measurements: { ...version.measurements, [key]: value } });
  const patchConsumption = (key: keyof VehicleVersion['consumption'], value: NumericMeasureDraft) => onPatch({ consumption: { ...version.consumption, [key]: value } });
  return (
    <details className="version-card" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary className="version-card__summary">
        <span className="version-card__index">{String(index + 1).padStart(2, '0')}</span>
        <span className="version-card__title">{version.name.trim() || `Versão ${index + 1}`}</span>
        <span className="version-card__subtitle">{versionSubtitle(version)}</span>
        <span className="version-card__chevron">⌄</span>
      </summary>
      <div className="version-card__toolbar">
        <span className="micro-label">AÇÕES DA VERSÃO</span>
        <button type="button" className="icon-button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Mover versão para cima">↑</button>
        <button type="button" className="icon-button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Mover versão para baixo">↓</button>
        <button type="button" className="button button--small button--secondary" onClick={onDuplicate}>Duplicar</button>
        <button type="button" className="button button--small button--danger" onClick={onDelete}>Excluir</button>
      </div>
      <div className="version-card__content">
        <Subheading title="Identificação e configuração" />
        <FieldRow>
          <Field label="Nome da versão" schemaProperty="name" value={version.name} onChange={(value) => onPatch({ name: value })} placeholder="Ex.: versão / pacote comercial" required />
          <Field label="Configuração do veículo" schemaProperty="vehicleConfiguration" value={version.configuration} onChange={(value) => onPatch({ configuration: value })} placeholder="Designação de catálogo" />
          <Field label="Ano-modelo da versão" schemaProperty="vehicleModelDate" value={version.modelDate} onChange={(value) => onPatch({ modelDate: value })} inputMode="numeric" placeholder="AAAA" />
          <Field label="Carroceria" schemaProperty="bodyType" value={version.bodyType} onChange={(value) => onPatch({ bodyType: value })} placeholder="Tipo de carroceria" />
        </FieldRow>

        <Subheading title="Dimensões e capacidades" description="Somente os valores preenchidos nesta versão serão emitidos; os campos em branco são omitidos." />
        <FieldRow>
          {versionMeasurementFields.map(([key, label, unit, property]) => <Field key={key} label={label} schemaProperty={property} value={version.measurements[key] || ''}
            onChange={(value) => patchMeasurement(key, value)} unit={unit} inputMode="decimal" />)}
        </FieldRow>

        <Subheading title="Motor, potência e torque" />
        <FieldRow>
          <Field label="Tipo de motor" schemaProperty="engineType" value={version.engineType} onChange={(value) => onPatch({ engineType: value })} placeholder="Descrição técnica" />
          <Field label="Cilindros" schemaProperty="numberOfCylinders" value={version.numberOfCylinders} onChange={(value) => onPatch({ numberOfCylinders: value })} inputMode="numeric" />
          <Field label="Cilindrada" schemaProperty="engineDisplacement" value={version.engineDisplacement} onChange={(value) => onPatch({ engineDisplacement: value })} unit="cm³" inputMode="decimal" />
          <Field label="Potência máxima" schemaProperty="powerOutput" value={version.powerOutput} onChange={(value) => onPatch({ powerOutput: value })} unit="cv" inputMode="decimal" />
          <Field label="Potência gasolina" schemaProperty="additionalProperty.name / value" value={version.powerGasoline} onChange={(value) => onPatch({ powerGasoline: value })} unit="cv" inputMode="decimal" />
          <Field label="Potência etanol" schemaProperty="additionalProperty.name / value" value={version.powerEthanol} onChange={(value) => onPatch({ powerEthanol: value })} unit="cv" inputMode="decimal" />
          <Field label="Torque máximo" schemaProperty="torque" value={version.torque} onChange={(value) => onPatch({ torque: value })} unit="kgfm" inputMode="decimal" />
          <Field label="Torque gasolina" schemaProperty="additionalProperty.name / value" value={version.torqueGasoline} onChange={(value) => onPatch({ torqueGasoline: value })} unit="kgfm" inputMode="decimal" />
          <Field label="Torque etanol" schemaProperty="additionalProperty.name / value" value={version.torqueEthanol} onChange={(value) => onPatch({ torqueEthanol: value })} unit="kgfm" inputMode="decimal" />
        </FieldRow>

        <Subheading title="Consumo e emissões" description="Informe um valor exato OU um intervalo completo; use ponto como separador decimal. Os limites serão números JSON." />
        <div className="numeric-measure-list">
          {consumptionFields.map(([key, label]) => <NumericMeasureFields key={key} label={label} property="fuelConsumption" unit="km/L" value={version.consumption[key]} onChange={(value) => patchConsumption(key, value)} />)}
          <NumericMeasureFields label="Emissões de CO₂" property="emissionsCO2" unit="g/km" value={version.emissionsCO2} onChange={(emissionsCO2) => onPatch({ emissionsCO2 })} />
        </div>

        <Subheading title="Cores e equipamentos" description="Cores e propriedades próprias desta versão. Dados comuns ao modelo ficam na seção acima." />
        <FieldRow>
          <TagList label="Cores externas desta versão" schemaProperty="color" items={version.exteriorColors} onChange={(items) => onPatch({ exteriorColors: items })} />
          <TagList label="Cores internas desta versão" schemaProperty="vehicleInteriorColor" items={version.interiorColors} onChange={(items) => onPatch({ interiorColors: items })} />
        </FieldRow>
        <FeatureCatalogEditor title="Propriedades pré-carregadas desta versão" catalog={VERSION_FEATURE_CATALOG} entries={version.features}
          onChange={(features) => onPatch({ features })} />
        <FeatureList title="Outras propriedades personalizadas da versão" entries={version.features.filter((entry) => !isCatalogFeatureName(entry.name, 'version'))}
          onChange={(custom) => onPatch({ features: [...version.features.filter((entry) => isCatalogFeatureName(entry.name, 'version')), ...custom] })}
          hint="Adicione qualquer característica que não esteja no catálogo; os pares serão serializados como PropertyValue." />
      </div>
    </details>
  );
}

export function VersionEditor({ data, onChange }: { data: PdpFormData; onChange(data: PdpFormData): void }) {
  const updateVersion = (id: string, patch: Partial<VehicleVersion>) => onChange({ ...data, versions: data.versions.map((version) => version.id === id ? { ...version, ...patch } : version) });
  const reorder = (index: number, direction: -1 | 1) => {
    const next = [...data.versions]; const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...data, versions: next });
  };
  const duplicate = (index: number) => {
    const original = data.versions[index];
    const copy = structuredClone(original); copy.id = createId(); copy.name = `${original.name || `Versão ${index + 1}`} — cópia`;
    copy.features = original.features.map((feature) => ({ ...feature, id: createId() }));
    const next = [...data.versions]; next.splice(index + 1, 0, copy); onChange({ ...data, versions: next });
  };
  const remove = (version: VehicleVersion) => {
    if (!window.confirm(`Excluir a versão “${version.name || 'sem nome'}”? Imagens, vídeos e ofertas vinculados continuarão pendentes até serem movidos ou removidos.`)) return;
    onChange({ ...data, versions: data.versions.filter((item) => item.id !== version.id) });
  };
  const sharedMeasurement = (key: keyof Measurements, value: string) => onChange({ ...data, sharedMeasurements: { ...data.sharedMeasurements, [key]: value } });
  const patchSharedVehicleProperty = (key: keyof PdpFormData['sharedVehicleProperties'], value: string) => onChange({ ...data, sharedVehicleProperties: { ...data.sharedVehicleProperties, [key]: value } });

  return (
    <>
      <SectionCard id="model" number="03" title="Modelo e dados compartilhados" description="Informações comuns ao modelo são emitidas no ProductGroup, sem cópia automática nos nós Vehicle das versões.">
        <MigrationConflictResolver data={data} onChange={onChange} />
        <Subheading title="Identidade do veículo" />
        <FieldRow>
          <Field label="Nome do modelo" schemaProperty="ProductGroup.name" value={data.modelName} onChange={(value) => onChange({ ...data, modelName: value })} placeholder="Nome comercial do modelo" required />
          <Field label="Ano-modelo comum" schemaProperty="additionalProperty.name: vehicleModelDate" value={data.modelYear} onChange={(value) => onChange({ ...data, modelYear: value })} placeholder="AAAA" inputMode="numeric" />
          <Field label="Categoria" schemaProperty="ProductGroup.category" value={data.category} onChange={(value) => onChange({ ...data, category: value })} placeholder="Ex.: SUV, sedã, picape" />
          <Field label="Carroceria comum" schemaProperty="additionalProperty.name: bodyType" value={data.bodyType} onChange={(value) => onChange({ ...data, bodyType: value })} placeholder="Se igual em todas as versões" />
          <Field label="Descrição do modelo" schemaProperty="ProductGroup.description" value={data.modelDescription} onChange={(value) => onChange({ ...data, modelDescription: value })} rows={3} wide hint="Usada somente quando informada; nenhum texto é criado automaticamente." />
        </FieldRow>
        <Subheading title="Propriedades técnicas comuns do modelo" description="Os seis dados técnicos são representados como additionalProperty no ProductGroup; não são repetidos em cada Vehicle." />
        <FieldRow>
          <Field label="Tipo de combustível" schemaProperty="additionalProperty.name: fuelType" value={data.sharedVehicleProperties.fuelType} onChange={(value) => patchSharedVehicleProperty('fuelType', value)} placeholder="Ex.: flex, gasolina, elétrico" />
          <Field label="Rodas motrizes" schemaProperty="additionalProperty.name: driveWheelConfiguration" value={data.sharedVehicleProperties.driveWheelConfiguration} onChange={(value) => patchSharedVehicleProperty('driveWheelConfiguration', value)} placeholder="Ex.: dianteira, integral" />
          <Field label="Transmissão do veículo" schemaProperty="additionalProperty.name: vehicleTransmission" value={data.sharedVehicleProperties.vehicleTransmission} onChange={(value) => patchSharedVehicleProperty('vehicleTransmission', value)} placeholder="Ex.: automática de 6 marchas" />
          <Field label="Número de portas" schemaProperty="additionalProperty.name: numberOfDoors" value={data.sharedVehicleProperties.numberOfDoors} onChange={(value) => patchSharedVehicleProperty('numberOfDoors', value)} inputMode="numeric" placeholder="Ex.: 4" />
          <Field label="Número de lugares" schemaProperty="additionalProperty.name: seatingCapacity" value={data.sharedVehicleProperties.seatingCapacity} onChange={(value) => patchSharedVehicleProperty('seatingCapacity', value)} inputMode="numeric" placeholder="Ex.: 5" />
          <Field label="Número de airbags" schemaProperty="additionalProperty.name: numberOfAirbags" value={data.sharedVehicleProperties.numberOfAirbags} onChange={(value) => patchSharedVehicleProperty('numberOfAirbags', value)} inputMode="numeric" placeholder="Ex.: 6" />
        </FieldRow>
        <div className="form-note"><span className="status-dot status-dot--info" />Quando os valores forem compatíveis entre versões antigas, são migrados ao modelo; divergências ficam pendentes para escolha explícita.</div>
        <Subheading title="Cores compartilhadas" />
        <FieldRow>
          <TagList label="Cores externas comuns" schemaProperty="ProductGroup.color" items={data.commonExteriorColors} onChange={(items) => onChange({ ...data, commonExteriorColors: items })} />
          <TagList label="Cores internas comuns" schemaProperty="additionalProperty.name: vehicleInteriorColor" items={data.commonInteriorColors} onChange={(items) => onChange({ ...data, commonInteriorColors: items })} />
        </FieldRow>
        <Subheading title="Dimensões e capacidades comuns" description="Valores comuns são serializados no ProductGroup; dimensões ou capacidades específicas continuam somente na versão." />
        <FieldRow>
          {sharedMeasurementFields.map(([key, label, unit, property]) => <Field key={key} label={label} schemaProperty={property === 'wheelbase' || property === 'cargoVolume' || property === 'fuelCapacity' ? `additionalProperty.name: ${property}` : `ProductGroup.${property}`} value={data.sharedMeasurements[key]}
            onChange={(value) => sharedMeasurement(key, value)} unit={unit} inputMode="decimal" />)}
        </FieldRow>
        <FeatureCatalogEditor title="Propriedades pré-carregadas comuns do modelo" catalog={SHARED_FEATURE_CATALOG} entries={data.sharedFeatures}
          onChange={(sharedFeatures) => onChange({ ...data, sharedFeatures })} />
        <FeatureList title="Outras propriedades personalizadas do modelo" entries={data.sharedFeatures.filter((entry) => !isCatalogFeatureName(entry.name, 'shared'))}
          onChange={(custom) => onChange({ ...data, sharedFeatures: [...data.sharedFeatures.filter((entry) => isCatalogFeatureName(entry.name, 'shared')), ...custom] })}
          hint="Adicione características comuns não previstas no catálogo." />
      </SectionCard>

      <SectionCard id="versions" number="04" title="Versões" description="Cada versão mantém os próprios dados específicos de motor, consumo, emissões, cores e equipamentos."
        aside={<button type="button" className="button button--primary button--small" onClick={() => onChange({ ...data, versions: [...data.versions, createBlankVersion()] })}>＋ Adicionar versão</button>}>
        <div className="version-list">
          {data.versions.map((version, index) => <VersionCard key={version.id} version={version} index={index} count={data.versions.length}
            onPatch={(patch) => updateVersion(version.id, patch)} onDuplicate={() => duplicate(index)} onDelete={() => remove(version)} onMove={(direction) => reorder(index, direction)} />)}
        </div>
        <div className="form-note"><span className="status-dot status-dot--info" />{data.versions.length} {data.versions.length === 1 ? 'versão cadastrada' : 'versões cadastradas'} · IDs e dados independentes.</div>
      </SectionCard>
    </>
  );
}
