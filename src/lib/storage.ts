import type { FeatureEntry, ProjectRecord, SharedMigrationConflict } from '../model/types';
import { cleanText, createBlankMeasurements, createBlankSharedVehicleProperties, createId, ensureFeatureCatalog, normalizeNumericMeasure, parseLocalizedNumber } from './ids';
import { featureNameKey, VERSION_FEATURES_MOVED_TO_SHARED } from './feature-catalog';

const STORAGE_KEY = 'pdp-schema-projects-v1';
const PROJECT_FILE_VERSION = 3;
const SUPPORTED_ARCHIVE_VERSIONS = new Set([1, 2, PROJECT_FILE_VERSION]);

export interface ProjectArchive { format: 'pdp-schema-projects'; version: 1 | 2 | 3; projects: ProjectRecord[] }

type UnknownRecord = Record<string, unknown>;
function isRecord(value: unknown): value is UnknownRecord { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function hasStringFields(value: unknown, keys: string[]): value is UnknownRecord { return isRecord(value) && keys.every((key) => typeof value[key] === 'string'); }
function isStringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every((entry) => typeof entry === 'string'); }
function isFeature(value: unknown): boolean { return hasStringFields(value, ['id', 'name', 'value']); }
function isNumericMeasure(value: unknown): boolean { return hasStringFields(value, ['value', 'minValue', 'maxValue']); }
function isConsumption(value: unknown): boolean {
  return isRecord(value) && ['urbanGasoline', 'highwayGasoline', 'urbanEthanol', 'highwayEthanol'].every((key) => isNumericMeasure(value[key]));
}
function isMeasurements(value: unknown): boolean { return hasStringFields(value, ['length', 'width', 'height', 'wheelbase', 'cargoVolume', 'fuelCapacity']); }
function isVersionMeasurements(value: unknown): boolean { return hasStringFields(value, ['length', 'width', 'height', 'cargoVolume', 'fuelCapacity']); }
function isSharedVehicleProperties(value: unknown): boolean {
  return hasStringFields(value, ['fuelType', 'driveWheelConfiguration', 'vehicleTransmission', 'numberOfDoors', 'seatingCapacity', 'numberOfAirbags']);
}
function isMigrationConflict(value: unknown): value is SharedMigrationConflict {
  return isRecord(value) && typeof value.id === 'string' && typeof value.key === 'string' && typeof value.label === 'string'
    && ['vehicleProperty', 'measurement', 'feature'].includes(String(value.target))
    && Array.isArray(value.candidates) && value.candidates.every((candidate) => hasStringFields(candidate, ['versionId', 'versionName', 'value']));
}
function isOrganization(value: unknown): boolean {
  return hasStringFields(value, ['name', 'url', 'email', 'telephone', 'logoUrl']) && isStringArray(value.sameAs);
}
function isBrand(value: unknown): boolean { return hasStringFields(value, ['name', 'url']) && isStringArray(value.sameAs); }
function isVersion(value: unknown): boolean {
  if (!hasStringFields(value, ['id', 'name', 'configuration', 'modelDate', 'bodyType', 'engineType', 'numberOfCylinders', 'engineDisplacement', 'powerOutput', 'powerGasoline', 'powerEthanol', 'torque', 'torqueGasoline', 'torqueEthanol'])) return false;
  return isNumericMeasure(value.emissionsCO2) && isStringArray(value.exteriorColors) && isStringArray(value.interiorColors)
    && isVersionMeasurements(value.measurements) && isConsumption(value.consumption)
    && Array.isArray(value.features) && value.features.every(isFeature);
}
function isOffer(value: unknown): boolean { return hasStringFields(value, ['id', 'scope', 'name', 'price', 'priceCurrency', 'url', 'availability', 'itemCondition', 'priceValidUntil', 'sellerName']); }
function isBreadcrumb(value: unknown): boolean { return hasStringFields(value, ['id', 'name', 'url']); }
function isFaq(value: unknown): boolean { return hasStringFields(value, ['id', 'question', 'answer']); }
function isImage(value: unknown): boolean {
  return hasStringFields(value, ['id', 'scope', 'contentUrl', 'thumbnailUrl', 'name', 'alt', 'caption', 'description', 'encodingFormat', 'contentSize', 'width', 'height', 'uploadDate', 'datePublished', 'creditText', 'copyrightNotice', 'license', 'acquireLicensePage', 'inLanguage'])
    && typeof value.representativeOfPage === 'boolean';
}
function isVideo(value: unknown): boolean {
  return hasStringFields(value, ['id', 'scope', 'name', 'description', 'thumbnailUrl', 'contentUrl', 'embedUrl', 'uploadDate', 'duration', 'expires', 'transcript'])
    && (value.isFamilyFriendly === null || typeof value.isFamilyFriendly === 'boolean');
}
function isData(value: unknown): boolean {
  if (!hasStringFields(value, ['pageUrl', 'siteUrl', 'siteName', 'language', 'pageTitle', 'pageDescription', 'modelName', 'modelYear', 'category', 'bodyType', 'modelDescription'])) return false;
  return isOrganization(value.organization) && isOrganization(value.manufacturer) && isBrand(value.brand)
    && isStringArray(value.commonExteriorColors) && isStringArray(value.commonInteriorColors)
    && isMeasurements(value.sharedMeasurements) && isSharedVehicleProperties(value.sharedVehicleProperties)
    && Array.isArray(value.sharedFeatures) && value.sharedFeatures.every(isFeature)
    && Array.isArray(value.migrationConflicts) && value.migrationConflicts.every(isMigrationConflict)
    && Array.isArray(value.versions) && value.versions.every(isVersion)
    && Array.isArray(value.offers) && value.offers.every(isOffer)
    && Array.isArray(value.breadcrumbs) && value.breadcrumbs.every(isBreadcrumb)
    && Array.isArray(value.faqs) && value.faqs.every(isFaq)
    && Array.isArray(value.images) && value.images.every(isImage)
    && Array.isArray(value.videos) && value.videos.every(isVideo);
}
function isProject(value: unknown): value is ProjectRecord {
  if (!hasStringFields(value, ['id', 'name', 'createdAt', 'updatedAt'])) return false;
  return typeof value.id === 'string' && Boolean(value.id.trim()) && isData(value.data);
}

function legacyText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function legacyCandidates(versions: unknown[], property: string, nestedKey?: string): SharedMigrationConflict['candidates'] {
  return versions.flatMap((entry, index) => {
    if (!isRecord(entry)) return [];
    const source = nestedKey ? (isRecord(entry[nestedKey]) ? entry[nestedKey] as UnknownRecord : {}) : entry;
    const value = legacyText(source[property]);
    return [{ versionId: typeof entry.id === 'string' ? entry.id : `legacy-${index + 1}`, versionName: legacyText(entry.name) || `Versão ${index + 1}`, value }];
  });
}

function canonicalMigrationValue(target: SharedMigrationConflict['target'], key: string, value: string): string {
  const numeric = target === 'measurement' && key === 'wheelbase'
    || target === 'vehicleProperty' && ['numberOfDoors', 'seatingCapacity', 'numberOfAirbags'].includes(key);
  if (numeric) {
    const number = parseLocalizedNumber(value);
    if (number !== undefined) return `number:${number}`;
  }
  return cleanText(value).toLocaleLowerCase('pt-BR');
}

function addConflict(conflicts: SharedMigrationConflict[], target: SharedMigrationConflict['target'], key: string, label: string, candidates: SharedMigrationConflict['candidates']): void {
  const existing = conflicts.find((conflict) => conflict.target === target && conflict.key === key);
  const combined = [...(existing?.candidates ?? []), ...candidates];
  const unique = new Map(combined.map((candidate) => [`${candidate.versionId}:${candidate.value}`, candidate]));
  const conflict: SharedMigrationConflict = {
    id: existing?.id ?? createId(), target, key, label, candidates: [...unique.values()],
  };
  if (existing) Object.assign(existing, conflict); else conflicts.push(conflict);
}

function reconcileCommonValue(
  currentValue: string,
  candidates: SharedMigrationConflict['candidates'],
  conflicts: SharedMigrationConflict[],
  target: SharedMigrationConflict['target'],
  key: string,
  label: string,
): string {
  const current = canonicalMigrationValue(target, key, currentValue);
  const available = candidates.filter((candidate) => cleanText(candidate.value));
  const distinct = new Set(available.map((candidate) => canonicalMigrationValue(target, key, candidate.value)));
  if (current) {
    if (available.some((candidate) => canonicalMigrationValue(target, key, candidate.value) !== current)) addConflict(conflicts, target, key, label, [
      { versionId: 'shared', versionName: 'Valor compartilhado já informado', value: currentValue.trim() }, ...available,
    ]);
    return currentValue;
  }
  if (distinct.size === 1 && candidates.length > 0 && candidates.every((candidate) => Boolean(cleanText(candidate.value)))) return available[0]?.value ?? '';
  if (distinct.size > 1 || (distinct.size === 1 && candidates.some((candidate) => !cleanText(candidate.value)))) addConflict(conflicts, target, key, label, candidates);
  return '';
}

function migrateProject(value: unknown): ProjectRecord | undefined {
  if (!hasStringFields(value, ['id', 'name', 'createdAt', 'updatedAt']) || typeof value.id !== 'string' || !value.id.trim() || !isRecord(value.data)) return undefined;
  const rawData = value.data;
  const rawVersions = rawData.versions;
  if (!Array.isArray(rawVersions)) return undefined;
  if (rawData.migrationConflicts !== undefined && (!Array.isArray(rawData.migrationConflicts) || !rawData.migrationConflicts.every(isMigrationConflict))) return undefined;

  const sharedDefaults = createBlankSharedVehicleProperties();
  const rawShared = isRecord(rawData.sharedVehicleProperties) ? rawData.sharedVehicleProperties : {};
  const sharedVehicleProperties = { ...sharedDefaults };
  const conflicts: SharedMigrationConflict[] = [...(rawData.migrationConflicts as SharedMigrationConflict[] | undefined ?? [])];
  const sharedMappings = [
    ['fuelType', 'fuelType', 'Tipo de combustível'],
    ['driveWheelConfiguration', 'driveWheelConfiguration', 'Configuração das rodas motrizes'],
    ['vehicleTransmission', 'transmission', 'Transmissão do veículo'],
    ['numberOfDoors', 'numberOfDoors', 'Número de portas'],
    ['seatingCapacity', 'seatingCapacity', 'Número de lugares'],
    ['numberOfAirbags', 'numberOfAirbags', 'Número de airbags'],
  ] as const;
  for (const [sharedKey, legacyKey, label] of sharedMappings) {
    const existing = typeof rawShared[sharedKey] === 'string' ? rawShared[sharedKey] as string : '';
    sharedVehicleProperties[sharedKey] = reconcileCommonValue(existing,
      legacyCandidates(rawVersions, legacyKey), conflicts, 'vehicleProperty', sharedKey, label);
  }

  const rawMeasurements = isRecord(rawData.sharedMeasurements) ? rawData.sharedMeasurements : {};
  const sharedMeasurements = { ...createBlankMeasurements() };
  for (const key of Object.keys(sharedMeasurements) as (keyof typeof sharedMeasurements)[]) {
    sharedMeasurements[key] = typeof rawMeasurements[key] === 'string' ? rawMeasurements[key] as string : '';
  }
  sharedMeasurements.wheelbase = reconcileCommonValue(sharedMeasurements.wheelbase,
    legacyCandidates(rawVersions, 'wheelbase', 'measurements'), conflicts, 'measurement', 'wheelbase', 'Entre-eixos (wheelbase)');

  const rawSharedFeatures = Array.isArray(rawData.sharedFeatures) ? rawData.sharedFeatures as FeatureEntry[] : [];
  const sharedFeatures = [...rawSharedFeatures];
  const movedFeatureKeys = new Set(VERSION_FEATURES_MOVED_TO_SHARED.map(featureNameKey));
  for (const name of VERSION_FEATURES_MOVED_TO_SHARED) {
    const key = featureNameKey(name);
    const candidates = rawVersions.flatMap((entry, index) => {
      if (!isRecord(entry)) return [];
      const feature = Array.isArray(entry.features)
        ? entry.features.find((item) => isFeature(item) && featureNameKey(item.name) === key)
        : undefined;
      return [{ versionId: typeof entry.id === 'string' ? entry.id : `legacy-${index + 1}`, versionName: legacyText(entry.name) || `Versão ${index + 1}`, value: isFeature(feature) ? feature.value.trim() : '' }];
    });
    const existing = sharedFeatures.find((feature) => isFeature(feature) && featureNameKey(feature.name) === key);
    const value = reconcileCommonValue(existing?.value ?? '', candidates, conflicts, 'feature', key, name);
    if (existing && isFeature(existing)) existing.value = value;
    else if (value || candidates.length) sharedFeatures.push({ id: createId(), name, value });
  }

  const versions = rawVersions.map((entry: unknown) => {
    if (!isRecord(entry)) return entry;
    const consumption = isRecord(entry.consumption) ? entry.consumption : {};
    const measurements = isRecord(entry.measurements) ? { ...entry.measurements } : {};
    delete measurements.wheelbase;
    const normalized: UnknownRecord = {
      ...entry,
      measurements,
      features: Array.isArray(entry.features)
        ? entry.features.filter((feature) => !isFeature(feature) || !movedFeatureKeys.has(featureNameKey(feature.name)))
        : entry.features,
      emissionsCO2: normalizeNumericMeasure(entry.emissionsCO2),
      consumption: {
        urbanGasoline: normalizeNumericMeasure(consumption.urbanGasoline),
        highwayGasoline: normalizeNumericMeasure(consumption.highwayGasoline),
        urbanEthanol: normalizeNumericMeasure(consumption.urbanEthanol),
        highwayEthanol: normalizeNumericMeasure(consumption.highwayEthanol),
      },
    };
    for (const key of ['fuelType', 'driveWheelConfiguration', 'transmission', 'numberOfDoors', 'seatingCapacity', 'numberOfAirbags']) delete normalized[key];
    return normalized;
  });
  const candidate: unknown = {
    ...value,
    data: { ...rawData, sharedMeasurements, sharedVehicleProperties, sharedFeatures, migrationConflicts: conflicts, versions },
  };
  if (!isProject(candidate)) return undefined;
  return { ...candidate, data: ensureFeatureCatalog(candidate.data) };
}

export function loadProjects(): ProjectRecord[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const projects: ProjectRecord[] = [];
    for (const entry of parsed) {
      const project = migrateProject(entry);
      if (!project || seen.has(project.id)) continue;
      seen.add(project.id); projects.push(project);
    }
    return projects;
  } catch { return []; }
}

export function saveProjects(projects: ProjectRecord[]): { ok: boolean; message?: string } {
  try {
    if (!globalThis.localStorage) return { ok: false, message: 'O armazenamento local não está disponível neste navegador.' };
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível gravar no armazenamento local.';
    return { ok: false, message: `Falha ao salvar neste navegador: ${message}` };
  }
}

export function makeProjectArchive(projects: ProjectRecord[]): ProjectArchive {
  return { format: 'pdp-schema-projects', version: PROJECT_FILE_VERSION, projects };
}

export function parseProjectArchive(text: string): ProjectRecord[] {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || parsed.format !== 'pdp-schema-projects' || typeof parsed.version !== 'number'
    || !SUPPORTED_ARCHIVE_VERSIONS.has(parsed.version) || !Array.isArray(parsed.projects)) {
    throw new Error('Formato/versão de backup não reconhecido.');
  }
  if (!parsed.projects.length) throw new Error('O arquivo de backup não contém projetos.');
  const projects = parsed.projects.map(migrateProject);
  if (projects.some((project) => !project)) throw new Error('O backup contém projeto(s) com estrutura de dados inválida.');
  const migrated = projects as ProjectRecord[];
  const ids = new Set<string>();
  for (const project of migrated) {
    if (ids.has(project.id)) throw new Error('O backup contém IDs de projeto repetidos.');
    ids.add(project.id);
  }
  return migrated;
}

export function downloadText(filename: string, text: string, mime = 'application/json;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function makeHtmlDocument(json: string): string {
  const safeJson = json.replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<title>Dados estruturados</title>\n</head>\n<body>\n<script type="application/ld+json">\n${safeJson}\n</script>\n</body>\n</html>\n`;
}
