import type { BreadcrumbEntry, FaqEntry, FeatureEntry, ImageDraft, OfferDraft, PdpFormData, ProjectRecord, VehicleVersion, VideoDraft } from '../model/types';
import { featureNameKey, SHARED_FEATURE_CATALOG, VERSION_FEATURE_CATALOG, type FeatureDefinition } from './feature-catalog';

export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

export function isPlaceholder(value: string): boolean {
  return /\b(?:PREENCHER(?:_[A-Z0-9]+)*|PLACEHOLDER|TODO|TBD|REPLACE_ME|INSERT_[A-Z0-9_]+)\b/i.test(value)
    || /^\s*\{\{[^}]+\}\}\s*$/.test(value)
    || /^\s*\[[A-Z][A-Z0-9 _-]{2,}\]\s*$/.test(value);
}

export function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return isPlaceholder(trimmed) ? '' : trimmed;
}

export function parseLocalizedNumber(value: string): number | undefined {
  const input = cleanText(value).replace(/\s/g, '');
  if (!input) return undefined;
  let normalized = input;
  const comma = normalized.lastIndexOf(',');
  const dot = normalized.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot ? normalized.replace(/\./g, '').replace(',', '.') : normalized.replace(/,/g, '');
  } else if (comma >= 0) normalized = normalized.replace(',', '.');
  else if (dot >= 0 && /^-?\d{1,3}(?:\.\d{3})+$/.test(normalized)) normalized = normalized.replace(/\./g, '');
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return undefined;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

export function canonicalPageUrl(value: string): string | undefined {
  const clean = cleanText(value);
  if (!clean) return undefined;
  try {
    const url = new URL(clean);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
    url.hash = '';
    return url.toString();
  } catch { return undefined; }
}

export function isHttpUrl(value: string): boolean {
  const clean = cleanText(value);
  if (!clean) return false;
  try {
    const url = new URL(clean);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

export function reference(id: string): { '@id': string } { return { '@id': id }; }

export function createBlankMeasurements() {
  return { length: '', width: '', height: '', wheelbase: '', cargoVolume: '', fuelCapacity: '' };
}

export function createBlankFeature(): FeatureEntry { return { id: createId(), name: '', value: '' }; }

function createFeatureEntries(catalog: readonly FeatureDefinition[]): FeatureEntry[] {
  return catalog.map(({ name }) => ({ id: createId(), name, value: '' }));
}

function addMissingFeatureEntries(entries: FeatureEntry[], catalog: readonly FeatureDefinition[]): FeatureEntry[] {
  const existingNames = new Set(entries.map((entry) => featureNameKey(entry.name)).filter(Boolean));
  const missing = catalog.filter((definition) => !existingNames.has(featureNameKey(definition.name)))
    .map(({ name }) => ({ id: createId(), name, value: '' }));
  return [...entries, ...missing];
}

/** Adds new catalog fields without replacing values or custom properties from a saved v1 project. */
export function ensureFeatureCatalog(data: PdpFormData): PdpFormData {
  return {
    ...data,
    sharedFeatures: addMissingFeatureEntries(data.sharedFeatures, SHARED_FEATURE_CATALOG),
    versions: data.versions.map((version) => ({
      ...version,
      features: addMissingFeatureEntries(version.features, VERSION_FEATURE_CATALOG),
    })),
  };
}

export function createBlankVersion(name = ''): VehicleVersion {
  return {
    id: createId(), name, configuration: '', modelDate: '', bodyType: '', fuelType: '', driveWheelConfiguration: '',
    transmission: '', numberOfDoors: '', seatingCapacity: '', numberOfAirbags: '', exteriorColors: [], interiorColors: [],
    measurements: createBlankMeasurements(), consumption: { urbanGasoline: '', highwayGasoline: '', urbanEthanol: '', highwayEthanol: '' },
    emissionsCO2: '', engineType: '', numberOfCylinders: '', engineDisplacement: '', powerOutput: '',
    powerGasoline: '', powerEthanol: '', torque: '', torqueGasoline: '', torqueEthanol: '', features: createFeatureEntries(VERSION_FEATURE_CATALOG),
  };
}

export function createBlankOffer(scope: string | 'page' = 'page'): OfferDraft {
  return { id: createId(), scope, name: '', price: '', priceCurrency: '', url: '', availability: '', itemCondition: '', priceValidUntil: '', sellerName: '' };
}

export function createBlankImage(scope: string | 'page' = 'page'): ImageDraft {
  return { id: createId(), scope, contentUrl: '', thumbnailUrl: '', name: '', alt: '', caption: '', description: '',
    encodingFormat: '', contentSize: '', width: '', height: '', uploadDate: '', datePublished: '', creditText: '',
    copyrightNotice: '', license: '', acquireLicensePage: '', inLanguage: '', representativeOfPage: false };
}

export function createBlankVideo(scope: string | 'page' = 'page'): VideoDraft {
  return { id: createId(), scope, name: '', description: '', thumbnailUrl: '', contentUrl: '', embedUrl: '',
    uploadDate: '', duration: '', expires: '', isFamilyFriendly: null, transcript: '' };
}

export function createBlankBreadcrumb(): BreadcrumbEntry { return { id: createId(), name: '', url: '' }; }
export function createBlankFaq(): FaqEntry { return { id: createId(), question: '', answer: '' }; }

export function createBlankData(): PdpFormData {
  return {
    pageUrl: '', siteUrl: '', siteName: '', language: 'pt-BR', pageTitle: '', pageDescription: '',
    organization: { name: '', url: '', email: '', telephone: '', logoUrl: '', sameAs: [] },
    manufacturer: { name: '', url: '', email: '', telephone: '', logoUrl: '', sameAs: [] },
    brand: { name: '', url: '', sameAs: [] },
    modelName: '', modelYear: '', category: '', bodyType: '', modelDescription: '',
    commonExteriorColors: [], commonInteriorColors: [], sharedMeasurements: createBlankMeasurements(), sharedFeatures: createFeatureEntries(SHARED_FEATURE_CATALOG),
    versions: [createBlankVersion()], offers: [], breadcrumbs: [], faqs: [], images: [], videos: [],
  };
}

export function createProject(name = 'Novo projeto'): ProjectRecord {
  const now = new Date().toISOString();
  return { id: createId(), name, createdAt: now, updatedAt: now, data: createBlankData() };
}

export function cloneProject(project: ProjectRecord): ProjectRecord {
  const copy = structuredClone(project);
  const now = new Date().toISOString();
  copy.id = createId(); copy.name = `${project.name} — cópia`; copy.createdAt = now; copy.updatedAt = now;
  return copy;
}
