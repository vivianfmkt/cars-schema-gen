import type { ProjectRecord } from '../model/types';
import { createBlankSharedVehicleProperties, ensureFeatureCatalog, normalizeNumericMeasure } from './ids';

const STORAGE_KEY = 'pdp-schema-projects-v1';
const PROJECT_FILE_VERSION = 2;
const SUPPORTED_ARCHIVE_VERSIONS = new Set([1, PROJECT_FILE_VERSION]);

export interface ProjectArchive { format: 'pdp-schema-projects'; version: 1 | 2; projects: ProjectRecord[] }

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
function isSharedVehicleProperties(value: unknown): boolean {
  return hasStringFields(value, ['fuelType', 'driveWheelConfiguration', 'vehicleTransmission', 'numberOfDoors', 'seatingCapacity', 'numberOfAirbags']);
}
function isOrganization(value: unknown): boolean {
  return hasStringFields(value, ['name', 'url', 'email', 'telephone', 'logoUrl']) && isStringArray(value.sameAs);
}
function isBrand(value: unknown): boolean { return hasStringFields(value, ['name', 'url']) && isStringArray(value.sameAs); }
function isVersion(value: unknown): boolean {
  if (!hasStringFields(value, ['id', 'name', 'configuration', 'modelDate', 'bodyType', 'fuelType', 'driveWheelConfiguration', 'transmission', 'numberOfDoors', 'seatingCapacity', 'numberOfAirbags', 'engineType', 'numberOfCylinders', 'engineDisplacement', 'powerOutput', 'powerGasoline', 'powerEthanol', 'torque', 'torqueGasoline', 'torqueEthanol'])) return false;
  return isNumericMeasure(value.emissionsCO2) && isStringArray(value.exteriorColors) && isStringArray(value.interiorColors)
    && isMeasurements(value.measurements) && isConsumption(value.consumption)
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

function migrateProject(value: unknown): ProjectRecord | undefined {
  if (!hasStringFields(value, ['id', 'name', 'createdAt', 'updatedAt']) || typeof value.id !== 'string' || !value.id.trim() || !isRecord(value.data)) return undefined;
  const rawData = value.data;
  const rawVersions = rawData.versions;
  if (!Array.isArray(rawVersions)) return undefined;
  const rawShared = isRecord(rawData.sharedVehicleProperties) ? rawData.sharedVehicleProperties : {};
  const sharedDefaults = createBlankSharedVehicleProperties();
  const sharedVehicleProperties = Object.fromEntries(Object.keys(sharedDefaults).map((key) => [key, typeof rawShared[key] === 'string' ? rawShared[key] : sharedDefaults[key as keyof typeof sharedDefaults]]));
  const versions = rawVersions.map((entry: unknown) => {
    if (!isRecord(entry)) return entry;
    const consumption = isRecord(entry.consumption) ? entry.consumption : {};
    return {
      ...entry,
      emissionsCO2: normalizeNumericMeasure(entry.emissionsCO2),
      consumption: {
        urbanGasoline: normalizeNumericMeasure(consumption.urbanGasoline),
        highwayGasoline: normalizeNumericMeasure(consumption.highwayGasoline),
        urbanEthanol: normalizeNumericMeasure(consumption.urbanEthanol),
        highwayEthanol: normalizeNumericMeasure(consumption.highwayEthanol),
      },
    };
  });
  const candidate: unknown = { ...value, data: { ...rawData, sharedVehicleProperties, versions } };
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
