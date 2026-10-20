import { useState } from 'react';
import type { Measurements, PdpFormData, VehicleVersion } from '../model/types';
import { createBlankVersion, createId } from '../lib/ids';
import { Field, FieldRow, FeatureList, SectionCard, Subheading, TagList } from './FormControls';

const measurementFields: [keyof Measurements, string, string][] = [
  ['length', 'Comprimento', 'mm'], ['width', 'Largura', 'mm'], ['height', 'Altura', 'mm'],
  ['wheelbase', 'Entre-eixos', 'mm'], ['cargoVolume', 'Volume do porta-malas', 'L'], ['fuelCapacity', 'Capacidade do tanque', 'L'],
];

function VersionCard({ version, index, count, onPatch, onDuplicate, onDelete, onMove }: {
  version: VehicleVersion; index: number; count: number; onPatch(patch: Partial<VehicleVersion>): void;
  onDuplicate(): void; onDelete(): void; onMove(direction: -1 | 1): void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const patchMeasurement = (key: keyof Measurements, value: string) => onPatch({ measurements: { ...version.measurements, [key]: value } });
  const patchConsumption = (key: keyof VehicleVersion['consumption'], value: string) => onPatch({ consumption: { ...version.consumption, [key]: value } });
  return (
    <details className="version-card" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary className="version-card__summary">
        <span className="version-card__index">{String(index + 1).padStart(2, '0')}</span>
        <span className="version-card__title">{version.name.trim() || `Versão ${index + 1}`}</span>
        <span className="version-card__subtitle">{version.transmission || version.fuelType || 'Dados independentes'}</span>
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
          <Field label="Combustível" value={version.fuelType} onChange={(value) => onPatch({ fuelType: value })} placeholder="Ex.: flex, diesel, elétrico" />
          <Field label="Tração" value={version.driveWheelConfiguration} onChange={(value) => onPatch({ driveWheelConfiguration: value })} placeholder="Ex.: dianteira / integral" />
          <Field label="Transmissão" value={version.transmission} onChange={(value) => onPatch({ transmission: value })} placeholder="Tipo de transmissão" />
          <Field label="Portas" value={version.numberOfDoors} onChange={(value) => onPatch({ numberOfDoors: value })} inputMode="numeric" />
          <Field label="Assentos" value={version.seatingCapacity} onChange={(value) => onPatch({ seatingCapacity: value })} inputMode="numeric" />
          <Field label="Airbags" value={version.numberOfAirbags} onChange={(value) => onPatch({ numberOfAirbags: value })} inputMode="numeric" />
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

        <Subheading title="Consumo e emissões" description="Consumo em km/L; os quatro campos podem ser informados independentemente." />
        <FieldRow>
          <Field label="Urbano · gasolina" value={version.consumption.urbanGasoline} onChange={(value) => patchConsumption('urbanGasoline', value)} unit="km/L" inputMode="decimal" />
          <Field label="Rodoviário · gasolina" value={version.consumption.highwayGasoline} onChange={(value) => patchConsumption('highwayGasoline', value)} unit="km/L" inputMode="decimal" />
          <Field label="Urbano · etanol" value={version.consumption.urbanEthanol} onChange={(value) => patchConsumption('urbanEthanol', value)} unit="km/L" inputMode="decimal" />
          <Field label="Rodoviário · etanol" value={version.consumption.highwayEthanol} onChange={(value) => patchConsumption('highwayEthanol', value)} unit="km/L" inputMode="decimal" />
          <Field label="CO₂" value={version.emissionsCO2} onChange={(value) => onPatch({ emissionsCO2: value })} unit="g/km" inputMode="decimal" />
        </FieldRow>

        <Subheading title="Cores e equipamentos" description="Cores compartilhadas também podem ser definidas na seção Modelo." />
        <FieldRow>
          <TagList label="Cores externas desta versão" items={version.exteriorColors} onChange={(items) => onPatch({ exteriorColors: items })} />
          <TagList label="Cores internas desta versão" items={version.interiorColors} onChange={(items) => onPatch({ interiorColors: items })} />
        </FieldRow>
        <FeatureList title="Equipamentos desta versão" entries={version.features} onChange={(features) => onPatch({ features })} hint="Cada par propriedade/valor será um PropertyValue." />
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
        <FeatureList title="Características comuns do modelo" entries={data.sharedFeatures} onChange={(sharedFeatures) => onChange({ ...data, sharedFeatures })} />
      </SectionCard>

      <SectionCard id="versions" number="04" title="Versões" description="Cada versão possui seu próprio motor, transmissão, consumo, cores, dimensões e equipamentos."
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
