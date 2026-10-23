import type { ProjectRecord } from '../model/types';
import { ensureFeatureCatalog } from './ids';

const STORAGE_KEY = 'pdp-schema-projects-v1';
const PROJECT_FILE_VERSION = 1;

export interface ProjectArchive { format: 'pdp-schema-projects'; version: 1; projects: ProjectRecord[] }

type UnknownRecord = Record<string, unknown>;
function isRecord(value: unknown): value is UnknownRecord { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function hasStringFields(value: unknown, keys: string[]): value is UnknownRecord { return isRecord(value) && keys.every((key) => typeof value[key] === 'string'); }
function isStringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every((entry) => typeof entry === 'string'); }
function isFeature(value: unknown): boolean { return hasStringFields(value, ['id', 'name', 'value']); }
function isMeasurements(value: unknown): boolean { return hasStringFields(value, ['length', 'width', 'height', 'wheelbase', 'cargoVolume', 'fuelCapacity']); }
function isOrganization(value: unknown): boolean {
  return hasStringFields(value, ['name', 'url', 'email', 'telephone', 'logoUrl']) && isStringArray(value.sameAs);
}
function isBrand(value: unknown): boolean { return hasStringFields(value, ['name', 'url']) && isStringArray(value.sameAs); }
function isVersion(value: unknown): boolean {
  if (!hasStringFields(value, ['id', 'name', 'configuration', 'modelDate', 'bodyType', 'fuelType', 'driveWheelConfiguration', 'transmission', 'numberOfDoors', 'seatingCapacity', 'numberOfAirbags', 'emissionsCO2', 'engineType', 'numberOfCylinders', 'engineDisplacement', 'powerOutput', 'powerGasoline', 'powerEthanol', 'torque', 'torqueGasoline', 'torqueEthanol'])) return false;
  return isStringArray(value.exteriorColors) && isStringArray(value.interiorColors) && isMeasurements(value.measurements)
    && hasStringFields(value.consumption, ['urbanGasoline', 'highwayGasoline', 'urbanEthanol', 'highwayEthanol'])
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
    && isMeasurements(value.sharedMeasurements) && Array.isArray(value.sharedFeatures) && value.sharedFeatures.every(isFeature)
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

export function loadProjects(): ProjectRecord[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const projects = parsed.filter((entry): entry is ProjectRecord => {
      if (!isProject(entry) || seen.has(entry.id)) return false;
      seen.add(entry.id); return true;
    });
    return projects.map((project) => ({ ...project, data: ensureFeatureCatalog(project.data) }));
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
  if (!parsed || typeof parsed !== 'object') throw new Error('Arquivo de projeto inválido.');
  const archive = parsed as Partial<ProjectArchive>;
  if (archive.format !== 'pdp-schema-projects' || archive.version !== PROJECT_FILE_VERSION || !Array.isArray(archive.projects)) {
    throw new Error('Formato/versão de backup não reconhecido.');
  }
  if (!archive.projects.length) throw new Error('O arquivo de backup não contém projetos.');
  const projects = archive.projects.filter(isProject);
  if (projects.length !== archive.projects.length) throw new Error('O backup contém projeto(s) com estrutura de dados inválida.');
  const ids = new Set<string>();
  for (const project of projects) {
    if (ids.has(project.id)) throw new Error('O backup contém IDs de projeto repetidos.');
    ids.add(project.id);
  }
  return projects.map((project) => ({ ...project, data: ensureFeatureCatalog(project.data) }));
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
