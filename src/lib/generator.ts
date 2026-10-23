import type { GenerationResult, ImageDraft, JsonLdDocument, OfferDraft, PdpFormData, SchemaEntity, ValidationIssue, VehicleVersion, VideoDraft } from '../model/types';
import { canonicalPageUrl, cleanText, isHttpUrl, parseLocalizedNumber, reference, slugify } from './ids';
import { featureNameKey } from './feature-catalog';
import { validateGraph, validateProject } from './validation';

const SCHEMA = 'https://schema.org/';
const baseId = (base: string, fragment: string) => `${base}#${fragment}`;
const trim = cleanText;

function compact<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => compact(item)).filter((item) => item !== undefined && item !== null && !(Array.isArray(item) && item.length === 0)) as T;
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      if (entry === undefined || entry === null || entry === '') return;
      const cleaned = compact(entry);
      if (Array.isArray(cleaned) && cleaned.length === 0) return;
      if (typeof cleaned === 'object' && !Array.isArray(cleaned) && Object.keys(cleaned as object).length === 0) return;
      result[key] = cleaned;
    });
    return result as T;
  }
  return value;
}

function quantitative(value: string, unit: { unitCode?: string; unitText?: string }): Record<string, unknown> | undefined {
  const number = parseLocalizedNumber(value);
  if (number === undefined) return undefined;
  return compact({ '@type': 'QuantitativeValue', value: number, ...unit });
}

function propertyValue(name: string, value: string): Record<string, unknown> | undefined {
  const n = trim(name); const v = trim(value);
  return n && v ? { '@type': 'PropertyValue', name: n, value: v } : undefined;
}

function quantifiedProperty(name: string, value: string, unitText: string): Record<string, unknown> | undefined {
  const n = trim(name); const number = parseLocalizedNumber(value);
  return n && number !== undefined ? { '@type': 'PropertyValue', name: n, value: number, unitText } : undefined;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.map(trim).filter(Boolean).filter((value) => {
    const key = value.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hash(value: string): string {
  let left = 2166136261;
  let right = 2246822519;
  for (let i = 0; i < value.length; i += 1) {
    left = Math.imul(left ^ value.charCodeAt(i), 16777619);
    right = Math.imul(right ^ value.charCodeAt(i), 3266489917);
  }
  return `${(left >>> 0).toString(36)}${(right >>> 0).toString(36)}`;
}

function organizationNode(profile: PdpFormData['organization'] | PdpFormData['manufacturer'], id: string): SchemaEntity | undefined {
  const node = compact({
    '@type': 'Organization', '@id': id, name: trim(profile.name), url: isHttpUrl(profile.url) ? trim(profile.url) : undefined,
    email: trim(profile.email), telephone: trim(profile.telephone), logo: isHttpUrl(profile.logoUrl) ? trim(profile.logoUrl) : undefined,
    sameAs: uniqueStrings(profile.sameAs).filter(isHttpUrl),
  }) as SchemaEntity;
  return Object.keys(node).length > 2 ? node : undefined;
}

function propertyList(features: PdpFormData['sharedFeatures'], version?: VehicleVersion): Record<string, unknown>[] | undefined {
  const byName = new Map<string, Record<string, unknown>>();
  for (const feature of [...features, ...(version?.features ?? [])]) {
    const property = propertyValue(feature.name, feature.value);
    if (property) byName.set(featureNameKey(trim(feature.name)), property);
  }
  const result = [...byName.values()];
  return result.length ? result : undefined;
}

function deduplicatePropertyValues(properties: Array<Record<string, unknown> | undefined>): Record<string, unknown>[] {
  const byName = new Map<string, Record<string, unknown>>();
  for (const property of properties) {
    if (!property || typeof property.name !== 'string') continue;
    const key = featureNameKey(property.name);
    if (key) byName.set(key, property);
  }
  return [...byName.values()];
}

function measurement(data: PdpFormData, version: VehicleVersion, key: keyof PdpFormData['sharedMeasurements'], unit: { unitCode: string }): Record<string, unknown> | undefined {
  return quantitative(version.measurements[key] || data.sharedMeasurements[key], unit);
}

function validImages(images: ImageDraft[], base: string): { items: ImageDraft[]; idsByUrl: Map<string, string>; scopesByUrl: Map<string, Set<string>> } {
  const byUrl = new Map<string, ImageDraft>();
  const scopesByUrl = new Map<string, Set<string>>();
  for (const image of images) {
    if (!isHttpUrl(image.contentUrl)) continue;
    const url = new URL(trim(image.contentUrl)).toString();
    const scopes = scopesByUrl.get(url) ?? new Set<string>();
    scopes.add(image.scope);
    scopesByUrl.set(url, scopes);
    const existing = byUrl.get(url);
    if (!existing) byUrl.set(url, { ...image, contentUrl: url });
    else {
      // Uma URL única representa uma entidade só; metadados preenchidos adicionais são preservados.
      for (const key of Object.keys(image) as (keyof ImageDraft)[]) {
        const value = image[key];
        if (key !== 'id' && key !== 'scope' && key !== 'contentUrl' && typeof value === 'string' && !trim(existing[key] as string) && trim(value)) {
          (existing as unknown as Record<string, unknown>)[key] = value;
        }
      }
      existing.representativeOfPage ||= image.representativeOfPage;
    }
  }
  const idsByUrl = new Map<string, string>();
  byUrl.forEach((_image, url) => idsByUrl.set(url, baseId(base, `image-${hash(url)}`)));
  return { items: [...byUrl.values()], idsByUrl, scopesByUrl };
}

function imageUrlId(url: string, ids: Map<string, string>): string | undefined {
  if (!isHttpUrl(url)) return undefined;
  return ids.get(new URL(trim(url)).toString());
}

function validVideo(video: VideoDraft): boolean {
  const date = new Date(`${trim(video.uploadDate)}T00:00:00Z`);
  const validUploadDate = /^\d{4}-\d{2}-\d{2}$/.test(video.uploadDate) && !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === video.uploadDate;
  return Boolean(trim(video.name) && trim(video.thumbnailUrl) && isHttpUrl(video.thumbnailUrl)
    && (isHttpUrl(video.contentUrl) || isHttpUrl(video.embedUrl)) && validUploadDate);
}

function makeVideoId(base: string, video: VideoDraft): string {
  return baseId(base, `video-${hash(trim(video.contentUrl) || trim(video.embedUrl))}`);
}

function versionId(base: string, version: VehicleVersion): string {
  return baseId(base, `version-${slugify(version.name || version.configuration)}-${version.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'item'}`);
}

function calculateVariesBy(versions: VehicleVersion[]): string[] {
  const candidates: [keyof VehicleVersion, string][] = [
    ['configuration', 'vehicleConfiguration'], ['fuelType', 'fuelType'], ['transmission', 'vehicleTransmission'], ['engineType', 'engineType'],
  ];
  const result = candidates.filter(([key]) => new Set(versions.map((version) => trim(String(version[key]))).filter(Boolean)).size > 1).map(([, property]) => property);
  const colors = versions.map((version) => uniqueStrings(version.exteriorColors).join('|'));
  if (new Set(colors).size > 1) result.push('color');
  return result.length ? result : ['vehicleConfiguration'];
}

function makeOfferNodes(offers: OfferDraft[], base: string, knownOrganizationIds: Map<string, string>, productGroupId: string | undefined, versionIds: Map<string, string>, entity: SchemaEntity[], issues: ValidationIssue[]) {
  const sellerIds = new Map<string, string>();
  const offerRefsByScope = new Map<string, { '@id': string }[]>();
  for (const offer of offers) {
    const price = parseLocalizedNumber(offer.price);
    const currency = trim(offer.priceCurrency).toUpperCase();
    if (price === undefined || price < 0 || !/^[A-Z]{3}$/.test(currency)) continue;
    const productId = offer.scope === 'page' ? productGroupId ?? versionIds.values().next().value : versionIds.get(offer.scope);
    if (!productId) {
      issues.push({ id: `offer-target-${offer.id}`, severity: 'warning', code: 'offer-target-missing', message: 'A oferta não possui versão ou grupo válido para ser associada; foi omitida.', target: { section: 'offers', entityId: offer.id } });
      continue;
    }
    const id = baseId(base, `offer-${hash(offer.id)}`);
    const sellerName = trim(offer.sellerName);
    let sellerId: string | undefined = knownOrganizationIds.values().next().value;
    if (sellerName) {
      const sellerKey = sellerName.toLocaleLowerCase('pt-BR');
      sellerId = sellerIds.get(sellerKey) ?? knownOrganizationIds.get(sellerKey) ?? baseId(base, `seller-${slugify(sellerName)}-${hash(sellerKey)}`);
      sellerIds.set(sellerKey, sellerId);
      if (!knownOrganizationIds.has(sellerKey) && !entity.some((item) => item['@id'] === sellerId)) entity.push({ '@type': 'Organization', '@id': sellerId, name: sellerName });
    }
    const node = compact({
      '@type': 'Offer', '@id': id, name: trim(offer.name), price, priceCurrency: currency,
      url: isHttpUrl(offer.url) ? trim(offer.url) : undefined,
      availability: trim(offer.availability) ? (isHttpUrl(offer.availability) ? trim(offer.availability) : `${SCHEMA}${trim(offer.availability)}`) : undefined,
      itemCondition: trim(offer.itemCondition) ? (isHttpUrl(offer.itemCondition) ? trim(offer.itemCondition) : `${SCHEMA}${trim(offer.itemCondition)}`) : undefined,
      priceValidUntil: trim(offer.priceValidUntil) || undefined, seller: sellerId ? reference(sellerId) : undefined,
      itemOffered: reference(productId),
    }) as SchemaEntity;
    entity.push(node);
    const refs = offerRefsByScope.get(offer.scope) ?? [];
    refs.push(reference(id)); offerRefsByScope.set(offer.scope, refs);
  }
  return offerRefsByScope;
}

export function generateSchema(data: PdpFormData): GenerationResult {
  const issues = validateProject(data);
  const base = canonicalPageUrl(data.pageUrl);
  const document: JsonLdDocument = { '@context': 'https://schema.org', '@graph': [] };
  const graph = document['@graph'];
  if (!base) return { document, json: JSON.stringify(document, null, 2), issues, entityCounts: {}, canExport: !issues.some((item) => item.severity === 'error') };

  const organizationBase = canonicalPageUrl(data.organization.url) ?? canonicalPageUrl(data.siteUrl) ?? base;
  const organizationId = baseId(organizationBase, 'organization');
  const organization = organizationNode(data.organization, organizationId);
  if (organization) graph.push(organization);
  const organizationName = trim(data.organization.name).toLocaleLowerCase('pt-BR');
  const manufacturerName = trim(data.manufacturer.name).toLocaleLowerCase('pt-BR');
  const organizationUrl = canonicalPageUrl(data.organization.url);
  const manufacturerUrl = canonicalPageUrl(data.manufacturer.url);
  const manufacturerSharesOrganization = Boolean(organization && ((organizationName && organizationName === manufacturerName) || (organizationUrl && organizationUrl === manufacturerUrl)));
  const manufacturerId = manufacturerSharesOrganization ? organizationId : baseId(manufacturerUrl ?? base, manufacturerUrl ? 'organization' : 'manufacturer');
  const manufacturer = manufacturerSharesOrganization ? organization : organizationNode(data.manufacturer, manufacturerId);
  if (manufacturer && manufacturer !== organization) graph.push(manufacturer);

  const brandId = baseId(canonicalPageUrl(data.brand.url) ?? base, 'brand');
  const brandName = trim(data.brand.name);
  const brand = brandName ? compact({ '@type': 'Brand', '@id': brandId, name: brandName, url: isHttpUrl(data.brand.url) ? trim(data.brand.url) : undefined, sameAs: uniqueStrings(data.brand.sameAs).filter(isHttpUrl) }) as SchemaEntity : undefined;
  if (brand) graph.push(brand);

  const websiteUrl = canonicalPageUrl(data.siteUrl);
  const websiteId = baseId(websiteUrl ?? base, 'website');
  if (websiteUrl) graph.push(compact({ '@type': 'WebSite', '@id': websiteId, url: websiteUrl, name: trim(data.siteName), inLanguage: trim(data.language), publisher: organization ? reference(organizationId) : undefined }) as SchemaEntity);

  const validVersions = data.versions.filter((version) => trim(version.name));
  const versionIds = new Map(validVersions.map((version) => [version.id, versionId(base, version)]));
  const groupId = validVersions.length > 1 ? baseId(base, 'productgroup') : undefined;
  const itemListId = validVersions.length > 1 ? baseId(base, 'versions') : undefined;
  const pageId = baseId(base, 'webpage');
  const faqItems = data.faqs.filter((faq) => trim(faq.question) && trim(faq.answer));
  const breadcrumbItems = data.breadcrumbs.filter((crumb) => trim(crumb.name) && isHttpUrl(crumb.url));
  const faqId = faqItems.length ? baseId(base, 'faq') : undefined;
  const breadcrumbId = breadcrumbItems.length ? baseId(base, 'breadcrumb') : undefined;

  const validImageResult = validImages(data.images, base);
  const imageNodes = validImageResult.items;
  const imageIdByUrl = validImageResult.idsByUrl;
  const imageScopesByUrl = validImageResult.scopesByUrl;
  const validVideos = data.videos.filter(validVideo);
  const videosById = new Map<string, VideoDraft>();
  const videoScopesById = new Map<string, Set<string>>();
  for (const video of validVideos) {
    const id = makeVideoId(base, video);
    const scopes = videoScopesById.get(id) ?? new Set<string>(); scopes.add(video.scope); videoScopesById.set(id, scopes);
    const existing = videosById.get(id);
    if (!existing) videosById.set(id, { ...video });
    else {
      for (const key of Object.keys(video) as (keyof VideoDraft)[]) {
        const value = video[key];
        if (key !== 'id' && key !== 'scope' && typeof value === 'string' && !trim(existing[key] as string) && trim(value)) (existing as unknown as Record<string, unknown>)[key] = value;
        if (key === 'isFamilyFriendly' && existing.isFamilyFriendly === null && typeof value === 'boolean') existing.isFamilyFriendly = value;
      }
    }
  }
  const uniqueVideos = [...videosById.values()];
  const productRefs = validVersions.map((version) => reference(versionIds.get(version.id)!));
  const allMediaRefs = [
    ...imageNodes.map((image) => imageUrlId(image.contentUrl, imageIdByUrl)).filter(Boolean),
    ...uniqueVideos.map((video) => makeVideoId(base, video)),
  ].map((id) => reference(id!));

  const pageEntity = compact({
    '@type': 'WebPage', '@id': pageId, url: base, name: trim(data.pageTitle), description: trim(data.pageDescription),
    inLanguage: trim(data.language), isPartOf: isHttpUrl(data.siteUrl) ? reference(websiteId) : undefined,
    breadcrumb: breadcrumbId ? reference(breadcrumbId) : undefined,
    mainEntity: groupId ? reference(groupId) : validVersions[0] ? reference(versionIds.get(validVersions[0].id)!) : undefined,
    primaryImageOfPage: imageNodes.find((image) => image.representativeOfPage) ? reference(imageUrlId(imageNodes.find((image) => image.representativeOfPage)!.contentUrl, imageIdByUrl)!) : undefined,
    associatedMedia: allMediaRefs.length ? allMediaRefs : undefined,
    hasPart: [itemListId ? reference(itemListId) : undefined, faqId ? reference(faqId) : undefined].filter(Boolean),
  }) as SchemaEntity;
  graph.push(pageEntity);

  const sharedProperties = propertyList(data.sharedFeatures) ?? [];
  const allImageRefs = imageNodes.map((image) => reference(imageUrlId(image.contentUrl, imageIdByUrl)!));
  const groupName = trim(data.modelName);
  if (groupId && groupName) {
    graph.push(compact({
      '@type': 'ProductGroup', '@id': groupId, name: groupName, brand: brand ? reference(brandId) : undefined,
      manufacturer: manufacturer ? reference(manufacturerId) : undefined, url: base,
      category: trim(data.category), description: trim(data.modelDescription), image: allImageRefs.length ? allImageRefs : undefined,
      variesBy: calculateVariesBy(validVersions), additionalProperty: sharedProperties.length ? sharedProperties : undefined,
      hasVariant: productRefs,
    }) as SchemaEntity);
  }

  const knownOrganizationIds = new Map<string, string>();
  if (organization && trim(data.organization.name)) knownOrganizationIds.set(trim(data.organization.name).toLocaleLowerCase('pt-BR'), organizationId);
  if (manufacturer && trim(data.manufacturer.name)) knownOrganizationIds.set(trim(data.manufacturer.name).toLocaleLowerCase('pt-BR'), manufacturerId);
  const offerRefsByScope = makeOfferNodes(data.offers, base, knownOrganizationIds, groupId, versionIds, graph, issues);
  const groupNode = groupId ? graph.find((entity) => entity['@id'] === groupId) : undefined;
  const generalOfferRefs = offerRefsByScope.get('page') ?? [];
  if (groupNode && generalOfferRefs.length) groupNode.offers = generalOfferRefs;
  for (const version of validVersions) {
    const id = versionIds.get(version.id)!;
    const modelYear = trim(version.modelDate) || trim(data.modelYear);
    const productName = [groupName, trim(version.name), modelYear].filter(Boolean).join(' ');
    const colors = uniqueStrings([...data.commonExteriorColors, ...version.exteriorColors]);
    const interiorColors = uniqueStrings([...data.commonInteriorColors, ...version.interiorColors]);
    const versionImages = imageNodes.filter((image) => {
      const scopes = imageScopesByUrl.get(new URL(image.contentUrl).toString());
      return scopes?.has('page') || scopes?.has(version.id);
    }).map((image) => reference(imageUrlId(image.contentUrl, imageIdByUrl)!));
    const versionVideos = uniqueVideos.filter((video) => {
      const scopes = videoScopesById.get(makeVideoId(base, video));
      return scopes?.has('page') || scopes?.has(version.id);
    }).map((video) => reference(makeVideoId(base, video)));
    const consumption = [
      ['Consumo urbano - Gasolina', version.consumption.urbanGasoline], ['Consumo rodoviário - Gasolina', version.consumption.highwayGasoline],
      ['Consumo urbano - Etanol', version.consumption.urbanEthanol], ['Consumo rodoviário - Etanol', version.consumption.highwayEthanol],
    ].map(([name, value]) => {
      const quantified = quantitative(value!, { unitText: 'km/L' });
      return quantified ? { ...quantified, name } : undefined;
    }).filter(Boolean);
    const engine = compact({
      '@type': 'EngineSpecification', engineType: trim(version.engineType),
      numberOfCylinders: parseLocalizedNumber(version.numberOfCylinders),
      engineDisplacement: quantitative(version.engineDisplacement, { unitCode: 'CMQ' }),
      powerOutput: quantitative(version.powerOutput, { unitText: 'cv' }),
    });
    const addProperties = deduplicatePropertyValues([
      ...(propertyList(groupId ? [] : data.sharedFeatures, version) ?? []),
      quantifiedProperty('Potência Máxima Gasolina', version.powerGasoline, 'cv'),
      quantifiedProperty('Potência Máxima Etanol', version.powerEthanol, 'cv'),
      quantifiedProperty('Torque Máximo Gasolina', version.torqueGasoline, 'kgfm'),
      quantifiedProperty('Torque Máximo Etanol', version.torqueEthanol, 'kgfm'),
    ]);
    const pageOfferRefs = groupId ? [] : offerRefsByScope.get('page') ?? [];
    const specificOfferRefs = offerRefsByScope.get(version.id) ?? [];
    const offers = [...pageOfferRefs, ...specificOfferRefs];
    const node = compact({
      '@type': ['Product', 'Vehicle'], '@id': id, name: productName, model: groupName,
      vehicleModelDate: modelYear, brand: brand ? reference(brandId) : undefined,
      manufacturer: manufacturer ? reference(manufacturerId) : undefined,
      isVariantOf: groupId ? reference(groupId) : undefined, mainEntityOfPage: reference(pageId),
      image: versionImages.length ? versionImages : undefined, associatedMedia: versionVideos.length ? versionVideos : undefined,
      color: colors.length ? colors : undefined, vehicleInteriorColor: interiorColors.length ? interiorColors : undefined,
      bodyType: trim(version.bodyType) || trim(data.bodyType), vehicleConfiguration: trim(version.configuration) || trim(version.name),
      category: trim(data.category), description: trim(data.modelDescription),
      fuelType: trim(version.fuelType), driveWheelConfiguration: trim(version.driveWheelConfiguration),
      vehicleTransmission: trim(version.transmission), numberOfDoors: parseLocalizedNumber(version.numberOfDoors),
      seatingCapacity: parseLocalizedNumber(version.seatingCapacity), numberOfAirbags: parseLocalizedNumber(version.numberOfAirbags),
      cargoVolume: measurement(data, version, 'cargoVolume', { unitCode: 'LTR' }),
      fuelCapacity: measurement(data, version, 'fuelCapacity', { unitCode: 'LTR' }),
      fuelConsumption: consumption.length ? consumption : undefined,
      emissionsCO2: parseLocalizedNumber(version.emissionsCO2),
      length: measurement(data, version, 'length', { unitCode: 'MMT' }),
      width: measurement(data, version, 'width', { unitCode: 'MMT' }),
      height: measurement(data, version, 'height', { unitCode: 'MMT' }),
      wheelbase: measurement(data, version, 'wheelbase', { unitCode: 'MMT' }),
      torque: quantitative(version.torque, { unitText: 'kgfm' }),
      vehicleEngine: Object.keys(engine).length > 1 ? engine : undefined,
      additionalProperty: addProperties.length ? addProperties : undefined,
      offers: offers.length ? offers : undefined,
    }) as SchemaEntity;
    graph.push(node);
  }

  if (itemListId) graph.push(compact({
    '@type': 'ItemList', '@id': itemListId, name: `Versões de ${groupName}`, numberOfItems: productRefs.length,
    itemListElement: productRefs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, item })),
  }) as SchemaEntity);
  if (breadcrumbId) graph.push({
    '@type': 'BreadcrumbList', '@id': breadcrumbId,
    itemListElement: breadcrumbItems.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: trim(crumb.name), item: trim(crumb.url) })),
  } as SchemaEntity);
  if (faqId) {
    const questions = faqItems.map((faq) => {
      const suffix = hash(faq.id);
      const questionId = baseId(base, `faq-question-${suffix}`);
      const answerId = baseId(base, `faq-answer-${suffix}`);
      graph.push({ '@type': 'Answer', '@id': answerId, text: trim(faq.answer) } as SchemaEntity);
      graph.push({ '@type': 'Question', '@id': questionId, name: trim(faq.question), acceptedAnswer: reference(answerId) } as SchemaEntity);
      return reference(questionId);
    });
    graph.push(compact({
      '@type': 'FAQPage', '@id': faqId, about: groupId ? reference(groupId) : validVersions[0] ? reference(versionIds.get(validVersions[0].id)!) : undefined,
      isPartOf: reference(pageId), mainEntity: questions,
    }) as SchemaEntity);
  }

  const mediaAboutId = (scopes: Set<string>) => {
    if (scopes.has('page') || (scopes.size > 1 && groupId)) return groupId ?? (validVersions[0] ? versionIds.get(validVersions[0].id) : undefined);
    return versionIds.get([...scopes][0] ?? '');
  };
  for (const image of imageNodes) {
    const id = imageUrlId(image.contentUrl, imageIdByUrl)!;
    const scopes = imageScopesByUrl.get(new URL(image.contentUrl).toString()) ?? new Set<string>();
    const inScope = mediaAboutId(scopes);
    const imageNode = compact({
      '@type': 'ImageObject', '@id': id, contentUrl: image.contentUrl, url: image.contentUrl,
      thumbnailUrl: isHttpUrl(image.thumbnailUrl) ? trim(image.thumbnailUrl) : undefined,
      name: trim(image.name), caption: trim(image.caption), description: trim(image.description),
      encodingFormat: trim(image.encodingFormat), contentSize: trim(image.contentSize),
      width: quantitative(image.width, { unitCode: 'E37' }), height: quantitative(image.height, { unitCode: 'E37' }),
      uploadDate: trim(image.uploadDate) || undefined, datePublished: trim(image.datePublished) || undefined,
      creditText: trim(image.creditText), copyrightNotice: trim(image.copyrightNotice),
      license: trim(image.license), acquireLicensePage: isHttpUrl(image.acquireLicensePage) ? trim(image.acquireLicensePage) : undefined,
      creator: organization ? reference(organizationId) : undefined, copyrightHolder: organization ? reference(organizationId) : undefined,
      inLanguage: trim(image.inLanguage) || trim(data.language),
      additionalProperty: propertyValue('Texto alternativo (alt)', image.alt) ? [propertyValue('Texto alternativo (alt)', image.alt)] : undefined,
      isPartOf: reference(pageId), about: inScope ? reference(inScope) : undefined,
      representativeOfPage: image.representativeOfPage || undefined,
    }) as SchemaEntity;
    graph.push(imageNode);
  }
  for (const video of uniqueVideos) {
    const id = makeVideoId(base, video);
    const targetId = mediaAboutId(videoScopesById.get(id) ?? new Set<string>());
    graph.push(compact({
      '@type': 'VideoObject', '@id': id, name: trim(video.name), description: trim(video.description),
      thumbnailUrl: trim(video.thumbnailUrl), contentUrl: isHttpUrl(video.contentUrl) ? trim(video.contentUrl) : undefined,
      embedUrl: isHttpUrl(video.embedUrl) ? trim(video.embedUrl) : undefined, uploadDate: trim(video.uploadDate),
      duration: trim(video.duration), expires: trim(video.expires), isFamilyFriendly: video.isFamilyFriendly ?? undefined,
      transcript: trim(video.transcript), publisher: organization ? reference(organizationId) : undefined,
      isPartOf: reference(pageId), about: targetId ? reference(targetId) : undefined,
    }) as SchemaEntity);
  }

  const graphIssues = validateGraph(document);
  issues.push(...graphIssues);
  const counts: Record<string, number> = {};
  for (const entity of graph) {
    const types = Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type']];
    for (const type of types) counts[type] = (counts[type] ?? 0) + 1;
  }
  const json = JSON.stringify(document, null, 2);
  return { document, json, issues, entityCounts: counts, canExport: !issues.some((item) => item.severity === 'error') };
}
