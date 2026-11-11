import { useState } from 'react';
import type { Measurements, NumericMeasureDraft, PdpFormData, VehicleVersion } from '../model/types';
import { cleanText, createBlankVersion, createId } from '../lib/ids';
import { isCatalogFeatureName, SHARED_FEATURE_CATALOG, VERSION_FEATURE_CATALOG } from '../lib/feature-catalog';
import { Field, FieldRow, FeatureList, SectionCard, Subheading, TagList } from './FormControls';
import { FeatureCatalogEditor } from './FeatureCatalogEditor';

const measurementFields: [keyof Measurements, string, string][] = [
  ['length', 'Comprimento', 'mm'], ['width', 'Largura', 'mm'], ['height', 'Altura', 'mm'],
  ['wheelbase', 'Entre-eixos', 'mm'], ['cargoVolume', 'Volume do porta-malas', 'L'], ['fuelCapacity', 'Capacidade do tanque', 'L'],
];

const consumptionFields: [keyof VehicleVersion['consumption'], string][] = [
  ['urbanGasoline', 'Urbano · gasolina'], ['highwayGasoline', 'Rodoviário · gasolina'],
  ['urbanEthanol', 'Urbano · etanol'], ['highwayEthanol', 'Rodoviário · etanol'],
];

function versionSubtitle(version: VehicleVersion, shared: PdpFormData['sharedVehicleProperties']): string {
  const textValues = [
    cleanText(version.transmission) || cleanText(shared.vehicleTransmission),
    cleanText(version.fuelType) || cleanText(shared.fuelType),
    cleanText(version.driveWheelConfiguration) || cleanText(shared.driveWheelConfiguration),
  ].filter(Boolean);
  if (textValues.length) return textValues.slice(0, 2).join(' · ');
  const numericValues: [string, string, string][] = [
    [cleanText(version.numberOfDoors) || cleanText(shared.numberOfDoors), 'porta', 'portas'],
    [cleanText(version.seatingCapacity) || cleanText(shared.seatingCapacity), 'lugar', 'lugares'],
    [cleanText(version.numberOfAirbags) || cleanText(shared.numberOfAirbags), 'airbag', 'airbags'],
  ];
  const populatedNumericValues = numericValues.filter(([value]) => Boolean(value));
  return populatedNumericValues.slice(0, 2).map(([value, singular, plural]) => `${value} ${value === '1' ? singular : plural}`).join(' · ') || 'Dados independentes';
}

function NumericMeasureFields({ label, unit, value, onChange }: {
  label: string; unit: string; value: NumericMeasureDraft; onChange(value: NumericMeasureDraft): void;
}) {
  const patch = (key: keyof NumericMeasureDraft, nextValue: string) => {
    const next = { ...value, [key]: nextValue };
    if (nextValue && key === 'value') { next.minValue = ''; next.maxValue = ''; }
    if (nextValue && key !== 'value') next.value = '';
    onChange(next);
  };
  return <div className="numeric-measure">
    <span className="numeric-measure__title">{label} <span>{unit}</span></span>
    <FieldRow className="numeric-measure__fields">
      <Field label="Valor exato" value={value.value} onChange={(next) => patch('value', next)} inputMode="decimal" placeholder="Ex.: 11.5" />
      <Field label="Mínimo" value={value.minValue} onChange={(next) => patch('minValue', next)} inputMode="decimal" placeholder="Ex.: 10.0" />
      <Field label="Máximo" value={value.maxValue} onChange={(next) => patch('maxValue', next)} inputMode="decimal" placeholder="Ex.: 12.5" />
    </FieldRow>
  </div>;
}

function VersionCard({ version, sharedVehicleProperties, index, count, onPatch, onDuplicate, onDelete, onMove }: {
  version: VehicleVersion; sharedVehicleProperties: PdpFormData['sharedVehicleProperties']; index: number; count: number; onPatch(patch: Partial<VehicleVersion>): void;
  onDuplicate(): void; onDelete(): void; onMove(direction: -1 | 1): void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const patchMeasurement = (key: keyof Measurements, value: string) => onPatch({ measurements: { ...version.measurements, [key]: value } });
  const patchConsumption = (key: keyof VehicleVersion['consumption'], value: NumericMeasureDraft) => onPatch({ consumption: { ...version.consumption, [key]: value } });
  return (
    <details className="version-card" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary className="version-card__summary">
        <span className="version-card__index">{String(index + 1).padStart(2, '0')}</span>
        <span className="version-card__title">{version.name.trim() || `Versão ${index + 1}`}</span>
        <span className="version-card__subtitle">{versionSubtitle(version, sharedVehicleProperties)}</span>
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
          <Field label="Nome da versão" value={version.name} onChange={(value) => onPatch({ name: value })} placeholder="Ex.: versão / pacote comercial" required />
          <Field label="Configuração do veículo" value={version.configuration} onChange={(value) => onPatch({ configuration: value })} placeholder="Designação de catálogo" />
          <Field label="Ano-modelo" value={version.modelDate} onChange={(value) => onPatch({ modelDate: value })} inputMode="numeric" placeholder="AAAA" />
          <Field label="Carroceria" value={version.bodyType} onChange={(value) => onPatch({ bodyType: value })} placeholder="Tipo de carroceria" />
          <Field label="Combustível desta versão" value={version.fuelType} onChange={(value) => onPatch({ fuelType: value })} placeholder="Sobrescreve o valor comum" hint="Em branco, herda o combustível comum." />
          <Field label="Tração desta versão" value={version.driveWheelConfiguration} onChange={(value) => onPatch({ driveWheelConfiguration: value })} placeholder="Sobrescreve o valor comum" hint="Em branco, herda a configuração comum." />
          <Field label="Transmissão desta versão" value={version.transmission} onChange={(value) => onPatch({ transmission: value })} placeholder="Sobrescreve o valor comum" hint="Em branco, herda a transmissão comum." />
          <Field label="Portas desta versão" value={version.numberOfDoors} onChange={(value) => onPatch({ numberOfDoors: value })} inputMode="numeric" placeholder="Sobrescreve o comum" />
          <Field label="Assentos desta versão" value={version.seatingCapacity} onChange={(value) => onPatch({ seatingCapacity: value })} inputMode="numeric" placeholder="Sobrescreve o comum" />
          <Field label="Airbags desta versão" value={version.numberOfAirbags} onChange={(value) => onPatch({ numberOfAirbags: value })} inputMode="numeric" placeholder="Sobrescreve o comum" />
        </FieldRow>

        <Subheading title="Dimensões e capacidades" description="Valores numéricos; a unidade fixa aparece ao lado do campo." />
        <FieldRow>
          {measurementFields.map(([key, label, unit]) => <Field key={key} label={label} value={version.measurements[key] || ''}
            onChange={(value) => patchMeasurement(key, value)} unit={unit} inputMode="decimal" />)}
        </FieldRow>

        <Subheading title="Motor, potência e torque" />
        <FieldRow>
          <Field label="Tipo de motor" value={version.engineType} onChange={(value) => onPatch({ engineType: value })} placeholder="Descrição técnica" />
          <Field label="Cilindros" value={version.numberOfCylinders} onChange={(value) => onPatch({ numberOfCylinders: value })} inputMode="numeric" />
          <Field label="Cilindrada" value={version.engineDisplacement} onChange={(value) => onPatch({ engineDisplacement: value })} unit="cm³" inputMode="decimal" />
          <Field label="Potência máxima" value={version.powerOutput} onChange={(value) => onPatch({ powerOutput: value })} unit="cv" inputMode="decimal" />
          <Field label="Potência gasolina" value={version.powerGasoline} onChange={(value) => onPatch({ powerGasoline: value })} unit="cv" inputMode="decimal" />
          <Field label="Potência etanol" value={version.powerEthanol} onChange={(value) => onPatch({ powerEthanol: value })} unit="cv" inputMode="decimal" />
          <Field label="Torque máximo" value={version.torque} onChange={(value) => onPatch({ torque: value })} unit="kgfm" inputMode="decimal" />
          <Field label="Torque gasolina" value={version.torqueGasoline} onChange={(value) => onPatch({ torqueGasoline: value })} unit="kgfm" inputMode="decimal" />
          <Field label="Torque etanol" value={version.torqueEthanol} onChange={(value) => onPatch({ torqueEthanol: value })} unit="kgfm" inputMode="decimal" />
        </FieldRow>

        <Subheading title="Consumo e emissões" description="Informe um valor exato OU um intervalo completo; use ponto como separador decimal. Os limites serão números JSON." />
        <div className="numeric-measure-list">
          {consumptionFields.map(([key, label]) => <NumericMeasureFields key={key} label={label} unit="km/L" value={version.consumption[key]} onChange={(value) => patchConsumption(key, value)} />)}
          <NumericMeasureFields label="Emissões de CO₂" unit="g/km" value={version.emissionsCO2} onChange={(emissionsCO2) => onPatch({ emissionsCO2 })} />
        </div>

        <Subheading title="Cores e equipamentos" description="Cores compartilhadas também podem ser definidas na seção Modelo." />
        <FieldRow>
          <TagList label="Cores externas desta versão" items={version.exteriorColors} onChange={(items) => onPatch({ exteriorColors: items })} />
          <TagList label="Cores internas desta versão" items={version.interiorColors} onChange={(items) => onPatch({ interiorColors: items })} />
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
      <SectionCard id="model" number="03" title="Modelo e dados compartilhados" description="Informações comuns ao modelo; versões podem substituir medidas e especificações individualmente.">
        <Subheading title="Identidade do veículo" />
        <FieldRow>
          <Field label="Nome do modelo" value={data.modelName} onChange={(value) => onChange({ ...data, modelName: value })} placeholder="Nome comercial do modelo" required />
          <Field label="Ano-modelo" value={data.modelYear} onChange={(value) => onChange({ ...data, modelYear: value })} placeholder="AAAA" inputMode="numeric" />
          <Field label="Categoria" value={data.category} onChange={(value) => onChange({ ...data, category: value })} placeholder="Ex.: SUV, sedã, picape" />
          <Field label="Carroceria comum" value={data.bodyType} onChange={(value) => onChange({ ...data, bodyType: value })} placeholder="Se igual em todas as versões" />
          <Field label="Descrição do modelo" value={data.modelDescription} onChange={(value) => onChange({ ...data, modelDescription: value })} rows={3} wide hint="Usada somente quando informada; nenhum texto é criado automaticamente." />
        </FieldRow>
        <Subheading title="Propriedades técnicas comuns do modelo" description="Campos Schema.org pré-carregados; valores comuns são aplicados a todas as versões, salvo substituição específica." />
        <FieldRow>
          <Field label="Tipo de combustível · fuelType" value={data.sharedVehicleProperties.fuelType} onChange={(value) => patchSharedVehicleProperty('fuelType', value)} placeholder="Ex.: flex, gasolina, elétrico" />
          <Field label="Rodas motrizes · driveWheelConfiguration" value={data.sharedVehicleProperties.driveWheelConfiguration} onChange={(value) => patchSharedVehicleProperty('driveWheelConfiguration', value)} placeholder="Ex.: dianteira, integral" />
          <Field label="Transmissão · vehicleTransmission" value={data.sharedVehicleProperties.vehicleTransmission} onChange={(value) => patchSharedVehicleProperty('vehicleTransmission', value)} placeholder="Ex.: automática de 6 marchas" />
          <Field label="Número de portas · numberOfDoors" value={data.sharedVehicleProperties.numberOfDoors} onChange={(value) => patchSharedVehicleProperty('numberOfDoors', value)} inputMode="numeric" placeholder="Ex.: 4" />
          <Field label="Número de lugares · seatingCapacity" value={data.sharedVehicleProperties.seatingCapacity} onChange={(value) => patchSharedVehicleProperty('seatingCapacity', value)} inputMode="numeric" placeholder="Ex.: 5" />
          <Field label="Número de airbags · numberOfAirbags" value={data.sharedVehicleProperties.numberOfAirbags} onChange={(value) => patchSharedVehicleProperty('numberOfAirbags', value)} inputMode="numeric" placeholder="Ex.: 6" />
        </FieldRow>
        <div className="form-note"><span className="status-dot status-dot--info" />As versões herdam estes dados quando seus campos específicos ficam vazios; números são gerados como números JSON.</div>
        <Subheading title="Cores compartilhadas" />
        <FieldRow>
          <TagList label="Cores externas comuns" items={data.commonExteriorColors} onChange={(items) => onChange({ ...data, commonExteriorColors: items })} />
          <TagList label="Cores internas comuns" items={data.commonInteriorColors} onChange={(items) => onChange({ ...data, commonInteriorColors: items })} />
        </FieldRow>
        <Subheading title="Dimensões e capacidades comuns" description="Unidades adotadas: mm para dimensões lineares e L para capacidades." />
        <FieldRow>
          {measurementFields.map(([key, label, unit]) => <Field key={key} label={label} value={data.sharedMeasurements[key]}
            onChange={(value) => sharedMeasurement(key, value)} unit={unit} inputMode="decimal" />)}
        </FieldRow>
        <FeatureCatalogEditor title="Propriedades pré-carregadas comuns do modelo" catalog={SHARED_FEATURE_CATALOG} entries={data.sharedFeatures}
          onChange={(sharedFeatures) => onChange({ ...data, sharedFeatures })} />
        <FeatureList title="Outras propriedades personalizadas do modelo" entries={data.sharedFeatures.filter((entry) => !isCatalogFeatureName(entry.name, 'shared'))}
          onChange={(custom) => onChange({ ...data, sharedFeatures: [...data.sharedFeatures.filter((entry) => isCatalogFeatureName(entry.name, 'shared')), ...custom] })}
          hint="Adicione características comuns não previstas no catálogo." />
      </SectionCard>

      <SectionCard id="versions" number="04" title="Versões" description="Cada versão possui seu próprio motor, transmissão, consumo, cores, dimensões e equipamentos."
        aside={<button type="button" className="button button--primary button--small" onClick={() => onChange({ ...data, versions: [...data.versions, createBlankVersion()] })}>＋ Adicionar versão</button>}>
        <div className="version-list">
          {data.versions.map((version, index) => <VersionCard key={version.id} version={version} sharedVehicleProperties={data.sharedVehicleProperties} index={index} count={data.versions.length}
            onPatch={(patch) => updateVersion(version.id, patch)} onDuplicate={() => duplicate(index)} onDelete={() => remove(version)} onMove={(direction) => reorder(index, direction)} />)}
        </div>
        <div className="form-note"><span className="status-dot status-dot--info" />{data.versions.length} {data.versions.length === 1 ? 'versão cadastrada' : 'versões cadastradas'} · IDs e dados independentes.</div>
      </SectionCard>
    </>
  );
}
