export interface OrganizationProfile {
  name: string;
  url: string;
  email: string;
  telephone: string;
  logoUrl: string;
  sameAs: string[];
}

export interface BrandProfile {
  name: string;
  url: string;
  sameAs: string[];
}

export interface FeatureEntry {
  id: string;
  name: string;
  value: string;
}

export interface Measurements {
  length: string;
  width: string;
  height: string;
  wheelbase: string;
  cargoVolume: string;
  fuelCapacity: string;
}

export interface ConsumptionValues {
  urbanGasoline: string;
  highwayGasoline: string;
  urbanEthanol: string;
  highwayEthanol: string;
}

export interface OfferDraft {
  id: string;
  scope: 'page' | string;
  name: string;
  price: string;
  priceCurrency: string;
  url: string;
  availability: string;
  itemCondition: string;
  priceValidUntil: string;
  sellerName: string;
}

export interface VehicleVersion {
  id: string;
  name: string;
  configuration: string;
  modelDate: string;
  bodyType: string;
  fuelType: string;
  driveWheelConfiguration: string;
  transmission: string;
  numberOfDoors: string;
  seatingCapacity: string;
  numberOfAirbags: string;
  exteriorColors: string[];
  interiorColors: string[];
  measurements: Measurements;
  consumption: ConsumptionValues;
  emissionsCO2: string;
  engineType: string;
  numberOfCylinders: string;
  engineDisplacement: string;
  powerOutput: string;
  powerGasoline: string;
  powerEthanol: string;
  torque: string;
  torqueGasoline: string;
  torqueEthanol: string;
  features: FeatureEntry[];
}

export interface BreadcrumbEntry {
  id: string;
  name: string;
  url: string;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

export interface ImageDraft {
  id: string;
  scope: 'page' | string;
  contentUrl: string;
  thumbnailUrl: string;
  name: string;
  alt: string;
  caption: string;
  description: string;
  encodingFormat: string;
  contentSize: string;
  width: string;
  height: string;
  uploadDate: string;
  datePublished: string;
  creditText: string;
  copyrightNotice: string;
  license: string;
  acquireLicensePage: string;
  inLanguage: string;
  representativeOfPage: boolean;
}

export interface VideoDraft {
  id: string;
  scope: 'page' | string;
  name: string;
  description: string;
  thumbnailUrl: string;
  contentUrl: string;
  embedUrl: string;
  uploadDate: string;
  duration: string;
  expires: string;
  isFamilyFriendly: boolean | null;
  transcript: string;
}

export interface PdpFormData {
  pageUrl: string;
  siteUrl: string;
  siteName: string;
  language: string;
  pageTitle: string;
  pageDescription: string;
  organization: OrganizationProfile;
  manufacturer: OrganizationProfile;
  brand: BrandProfile;
  modelName: string;
  modelYear: string;
  category: string;
  bodyType: string;
  modelDescription: string;
  commonExteriorColors: string[];
  commonInteriorColors: string[];
  sharedMeasurements: Measurements;
  sharedFeatures: FeatureEntry[];
  versions: VehicleVersion[];
  offers: OfferDraft[];
  breadcrumbs: BreadcrumbEntry[];
  faqs: FaqEntry[];
  images: ImageDraft[];
  videos: VideoDraft[];
}

export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: PdpFormData;
}

export type IssueSeverity = 'error' | 'warning' | 'pending';
export interface IssueTarget { section: string; field?: string; entityId?: string }

export interface ValidationIssue {
  id: string;
  severity: IssueSeverity;
  code: string;
  message: string;
  target?: IssueTarget;
}

export interface SchemaEntity {
  '@type': string | string[];
  '@id': string;
  [key: string]: unknown;
}

export interface JsonLdDocument {
  '@context': 'https://schema.org';
  '@graph': SchemaEntity[];
}

export interface GenerationResult {
  document: JsonLdDocument;
  json: string;
  issues: ValidationIssue[];
  entityCounts: Record<string, number>;
  canExport: boolean;
}
