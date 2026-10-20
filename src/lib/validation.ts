import type { JsonLdDocument, PdpFormData, ProjectRecord, SchemaEntity, ValidationIssue } from '../model/types';
import { cleanText, createId, isHttpUrl, isPlaceholder, parseLocalizedNumber } from './ids';

function issue(severity: ValidationIssue['severity'], code: string, message: string, section: string, field?: string, entityId?: string): ValidationIssue {
  return { id: `${code}-${entityId ?? field ?? section}-${createId().slice(0, 6)}`, severity, code, message, target: { section, field, entityId } };
}

function hasText(value: string): boolean { return Boolean(cleanText(value)); }
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
function numericField(issues: ValidationIssue[], value: string, label: string, section: string, field: string, mode: 'positive' | 'nonnegative' | 'integer' | 'integer-nonnegative' = 'positive', entityId?: string) {
  if (!hasText(value)) return;
  const number = parseLocalizedNumber(value);
  if (number === undefined) {
    issues.push(issue('error', 'invalid-number', `${label}: informe um número válido.`, section, field, entityId));
    return;
  }
  if ((mode === 'positive' && number <= 0) || (mode === 'nonnegative' && number < 0) || (mode === 'integer' && (!Number.isInteger(number) || number <= 0)) || (mode === 'integer-nonnegative' && (!Number.isInteger(number) || number < 0))) {
    issues.push(issue('error', 'invalid-number-range', `${label}: valor fora do intervalo permitido.`, section, field, entityId));
  }
}
function urlField(issues: ValidationIssue[], value: string, label: string, section: string, field: string, entityId?: string) {
  if (!hasText(value)) return;
  if (!isHttpUrl(value)) issues.push(issue('error', 'invalid-url', `${label}: use uma URL HTTP ou HTTPS válida, sem credenciais.`, section, field, entityId));
}
function incompletePair(issues: ValidationIssue[], first: string, second: string, label: string, section: string, id: string, firstName: string, secondName: string) {
  const a = hasText(first); const b = hasText(second);
  if (a !== b) issues.push(issue('warning', 'incomplete-property', `${label}: informe ${a ? secondName : firstName}; o campo incompleto não será gerado.`, section, a ? secondName : firstName, id));
}
function checkPlaceholders(value: unknown, path: string, issues: ValidationIssue[], seen: Set<string>) {
  if (typeof value === 'string' && isPlaceholder(value)) {
    const key = `${path}:${value}`;
    if (!seen.has(key)) {
      seen.add(key);
      const [section, ...rest] = path.split('.');
      issues.push(issue('pending', 'placeholder', `Placeholder “${value}” pendente; ele não será incluído no JSON-LD.`, section || 'page', rest.join('.')));
    }
  } else if (Array.isArray(value)) value.forEach((entry, index) => checkPlaceholders(entry, `${path}.${index}`, issues, seen));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, entry]) => checkPlaceholders(entry, path ? `${path}.${key}` : key, issues, seen));
}

export function validateProject(data: PdpFormData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  checkPlaceholders(data, '', issues, new Set());

  if (!hasText(data.pageUrl)) issues.push(issue('error', 'missing-page-url', 'Informe a URL canônica da PDP para gerar IDs e relações estáveis.', 'page', 'pageUrl'));
  else urlField(issues, data.pageUrl, 'URL canônica da PDP', 'page', 'pageUrl');
  if (!hasText(data.modelName)) issues.push(issue('error', 'missing-model', 'Informe o nome do modelo para gerar Product e Vehicle.', 'model', 'modelName'));
  if (!data.versions.length) issues.push(issue('error', 'missing-version', 'Adicione ao menos uma versão para descrever o veículo.', 'versions'));

  urlField(issues, data.siteUrl, 'URL do site', 'page', 'siteUrl');
  urlField(issues, data.organization.url, 'URL da organização', 'organization', 'url');
  urlField(issues, data.organization.logoUrl, 'Logotipo da organização', 'organization', 'logoUrl');
  urlField(issues, data.manufacturer.url, 'URL do fabricante', 'organization', 'manufacturer.url');
  urlField(issues, data.manufacturer.logoUrl, 'Logotipo do fabricante', 'organization', 'manufacturer.logoUrl');
  urlField(issues, data.brand.url, 'URL da marca', 'organization', 'brand.url');
  for (const [profile, section] of [[data.organization, 'organization'], [data.manufacturer, 'organization'], [data.brand, 'organization']] as const) {
    profile.sameAs.forEach((url, index) => urlField(issues, url, 'Link de perfil', section, `sameAs.${index}`));
  }
  const organizationEmail = cleanText(data.organization.email);
  const manufacturerEmail = cleanText(data.manufacturer.email);
  if (organizationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizationEmail)) issues.push(issue('error', 'invalid-email', 'E-mail da organização inválido.', 'organization', 'email'));
  if (manufacturerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manufacturerEmail)) issues.push(issue('error', 'invalid-email', 'E-mail do fabricante inválido.', 'organization', 'manufacturer.email'));
  numericField(issues, data.modelYear, 'Ano do modelo', 'model', 'modelYear', 'integer');
  for (const [key, label] of [['length', 'Comprimento comum'], ['width', 'Largura comum'], ['height', 'Altura comum'], ['wheelbase', 'Entre-eixos comum'], ['cargoVolume', 'Volume comum do porta-malas'], ['fuelCapacity', 'Capacidade comum do tanque']] as const) {
    numericField(issues, data.sharedMeasurements[key], label, 'model', `sharedMeasurements.${key}`, 'positive');
  }

  const seenInputIds = new Set<string>();
  const checkInputId = (entry: { id: string }, section: string) => {
    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    if (!id) issues.push(issue('error', 'missing-id', 'A entrada repetível precisa de um identificador interno.', section, 'id'));
    else if (seenInputIds.has(id)) issues.push(issue('error', 'duplicate-input-id', 'Identificador interno repetido entre entradas do projeto.', section, 'id', id));
    else seenInputIds.add(id);
  };
  data.versions.forEach((version) => { checkInputId(version, 'versions'); version.features.forEach((feature) => checkInputId(feature, 'versions')); });
  data.sharedFeatures.forEach((feature) => checkInputId(feature, 'model'));
  data.images.forEach((image) => checkInputId(image, 'media'));
  data.videos.forEach((video) => checkInputId(video, 'media'));
  data.offers.forEach((offer) => checkInputId(offer, 'offers'));
  data.breadcrumbs.forEach((crumb) => checkInputId(crumb, 'navigation'));
  data.faqs.forEach((faq) => checkInputId(faq, 'faq'));

  const versionNames = new Map<string, string>();
  for (const [index, version] of data.versions.entries()) {
    const section = 'versions';
    if (!hasText(version.name)) issues.push(issue('error', 'missing-version-name', `Informe o nome da versão ${index + 1} ou remova essa linha.`, section, 'name', version.id));
    const normalizedName = cleanText(version.name).toLocaleLowerCase('pt-BR');
    if (normalizedName && versionNames.has(normalizedName)) issues.push(issue('warning', 'duplicate-version-name', `Nome de versão repetido: “${version.name}”.`, section, 'name', version.id));
    if (normalizedName) versionNames.set(normalizedName, version.id);
    numericField(issues, version.modelDate, 'Ano da versão', section, 'modelDate', 'integer', version.id);
    numericField(issues, version.numberOfDoors, 'Número de portas', section, 'numberOfDoors', 'integer', version.id);
    numericField(issues, version.seatingCapacity, 'Capacidade de assentos', section, 'seatingCapacity', 'integer', version.id);
    numericField(issues, version.numberOfAirbags, 'Número de airbags', section, 'numberOfAirbags', 'integer-nonnegative', version.id);
    numericField(issues, version.numberOfCylinders, 'Número de cilindros', section, 'numberOfCylinders', 'integer', version.id);
    numericField(issues, version.engineDisplacement, 'Cilindrada', section, 'engineDisplacement', 'positive', version.id);
    numericField(issues, version.powerOutput, 'Potência', section, 'powerOutput', 'positive', version.id);
    numericField(issues, version.powerGasoline, 'Potência com gasolina', section, 'powerGasoline', 'positive', version.id);
    numericField(issues, version.powerEthanol, 'Potência com etanol', section, 'powerEthanol', 'positive', version.id);
    numericField(issues, version.torque, 'Torque', section, 'torque', 'positive', version.id);
    numericField(issues, version.torqueGasoline, 'Torque com gasolina', section, 'torqueGasoline', 'positive', version.id);
    numericField(issues, version.torqueEthanol, 'Torque com etanol', section, 'torqueEthanol', 'positive', version.id);
    numericField(issues, version.emissionsCO2, 'Emissões de CO₂', section, 'emissionsCO2', 'nonnegative', version.id);
    for (const [key, label] of [['length', 'Comprimento'], ['width', 'Largura'], ['height', 'Altura'], ['wheelbase', 'Entre-eixos'], ['cargoVolume', 'Volume do porta-malas'], ['fuelCapacity', 'Capacidade do tanque']] as const) {
      numericField(issues, version.measurements[key], label, section, `measurements.${key}`, 'positive', version.id);
    }
    for (const [key, label] of [['urbanGasoline', 'Consumo urbano (gasolina)'], ['highwayGasoline', 'Consumo rodoviário (gasolina)'], ['urbanEthanol', 'Consumo urbano (etanol)'], ['highwayEthanol', 'Consumo rodoviário (etanol)']] as const) {
      numericField(issues, version.consumption[key], label, section, `consumption.${key}`, 'positive', version.id);
    }
    const seenColors = new Set<string>();
    [...data.commonExteriorColors, ...data.commonInteriorColors, ...version.exteriorColors, ...version.interiorColors].filter(hasText).forEach((color) => {
      const key = cleanText(color).toLocaleLowerCase('pt-BR');
      if (seenColors.has(key)) issues.push(issue('warning', 'duplicate-color', `Cor repetida na versão: “${color}”.`, section, 'exteriorColors', version.id));
      seenColors.add(key);
    });
    version.features.forEach((feature) => incompletePair(issues, feature.name, feature.value, 'Equipamento', section, feature.id, 'name', 'value'));
  }

  for (const feature of data.sharedFeatures) incompletePair(issues, feature.name, feature.value, 'Equipamento comum', 'model', feature.id, 'name', 'value');
  const versionIdSet = new Set(data.versions.map((version) => version.id));
  for (const [section, entries] of [['images', data.images], ['videos', data.videos], ['offers', data.offers]] as const) {
    entries.forEach((entry) => {
      if (entry.scope !== 'page' && !versionIdSet.has(entry.scope)) issues.push(issue('error', 'broken-scope', 'O item está associado a uma versão que não existe mais.', section, 'scope', entry.id));
    });
  }

  data.breadcrumbs.forEach((crumb) => {
    incompletePair(issues, crumb.name, crumb.url, 'Breadcrumb', 'navigation', crumb.id, 'name', 'url');
    urlField(issues, crumb.url, 'URL do breadcrumb', 'navigation', 'url', crumb.id);
  });
  data.faqs.forEach((faq) => incompletePair(issues, faq.question, faq.answer, 'FAQ', 'faq', faq.id, 'question', 'answer'));

  data.images.forEach((image) => {
    const hasMetadata = Object.entries(image).some(([key, value]) => key !== 'id' && key !== 'scope' && key !== 'representativeOfPage' && typeof value === 'string' && hasText(value));
    if (hasMetadata && !hasText(image.contentUrl)) issues.push(issue('warning', 'image-missing-url', 'Imagem sem URL de conteúdo: não será gerada.', 'media', 'contentUrl', image.id));
    urlField(issues, image.contentUrl, 'URL da imagem', 'media', 'contentUrl', image.id);
    urlField(issues, image.thumbnailUrl, 'Miniatura da imagem', 'media', 'thumbnailUrl', image.id);
    urlField(issues, image.acquireLicensePage, 'Página da licença da imagem', 'media', 'acquireLicensePage', image.id);
    numericField(issues, image.width, 'Largura da imagem', 'media', 'width', 'positive', image.id);
    numericField(issues, image.height, 'Altura da imagem', 'media', 'height', 'positive', image.id);
    for (const [key, label] of [['uploadDate', 'Data de envio da imagem'], ['datePublished', 'Data de publicação da imagem']] as const) {
      const value = image[key];
      if (hasText(value) && !validDate(value)) issues.push(issue('error', 'invalid-date', `${label}: use uma data válida no formato AAAA-MM-DD.`, 'media', key, image.id));
    }
  });
  const imageUrls = new Map<string, string>();
  data.images.filter((image) => isHttpUrl(image.contentUrl)).forEach((image) => {
    const normalized = new URL(image.contentUrl).toString();
    if (imageUrls.has(normalized)) issues.push(issue('warning', 'duplicate-image', 'URL de imagem duplicada; as entidades serão consolidadas em um único ImageObject.', 'media', 'contentUrl', image.id));
    imageUrls.set(normalized, image.id);
  });

  data.videos.forEach((video) => {
    const hasAny = [video.name, video.description, video.thumbnailUrl, video.contentUrl, video.embedUrl, video.uploadDate, video.duration, video.expires, video.transcript].some(hasText) || video.isFamilyFriendly !== null;
    if (!hasAny) return;
    urlField(issues, video.thumbnailUrl, 'Miniatura do vídeo', 'media', 'thumbnailUrl', video.id);
    urlField(issues, video.contentUrl, 'URL do arquivo de vídeo', 'media', 'contentUrl', video.id);
    urlField(issues, video.embedUrl, 'URL de incorporação do vídeo', 'media', 'embedUrl', video.id);
    const missing: string[] = [];
    if (!hasText(video.name)) missing.push('nome');
    if (!hasText(video.thumbnailUrl)) missing.push('miniatura');
    if (!hasText(video.uploadDate)) missing.push('data de envio');
    if (!hasText(video.contentUrl) && !hasText(video.embedUrl)) missing.push('URL do vídeo ou URL de incorporação');
    if (missing.length) issues.push(issue('warning', 'video-incomplete', `VideoObject pendente: preencha ${missing.join(', ')}; o vídeo incompleto não será incluído.`, 'media', 'videos', video.id));
    if (hasText(video.uploadDate) && !validDate(video.uploadDate)) issues.push(issue('error', 'invalid-date', 'Data de envio do vídeo: use AAAA-MM-DD.', 'media', 'uploadDate', video.id));
    if (hasText(video.expires) && !validDate(video.expires)) issues.push(issue('error', 'invalid-date', 'Data de expiração do vídeo: use AAAA-MM-DD.', 'media', 'expires', video.id));
    if (hasText(video.duration) && !/^P(?=\d|T\d)(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/.test(video.duration)) issues.push(issue('error', 'invalid-duration', 'Duração de vídeo deve usar ISO 8601 (por exemplo, PT2M30S).', 'media', 'duration', video.id));
  });

  data.offers.forEach((offer) => {
    const hasAny = [offer.name, offer.price, offer.priceCurrency, offer.url, offer.availability, offer.itemCondition, offer.priceValidUntil, offer.sellerName].some(hasText);
    if (!hasAny) return;
    const price = parseLocalizedNumber(offer.price);
    if (hasText(offer.price) && (price === undefined || price < 0)) issues.push(issue('error', 'invalid-price', 'Preço deve ser um número igual ou maior que zero.', 'offers', 'price', offer.id));
    if (hasText(offer.priceCurrency) && !/^[A-Z]{3}$/.test(offer.priceCurrency.trim())) issues.push(issue('error', 'invalid-currency', 'Moeda deve usar o código ISO 4217 de três letras (por exemplo, BRL).', 'offers', 'priceCurrency', offer.id));
    const allowedAvailability = new Set(['InStock', 'OutOfStock', 'PreOrder', 'BackOrder', 'LimitedAvailability', 'OnlineOnly', 'Discontinued']);
    const allowedConditions = new Set(['NewCondition', 'UsedCondition', 'RefurbishedCondition', 'DamagedCondition']);
    if (hasText(offer.availability) && !allowedAvailability.has(offer.availability) && !/^https:\/\/schema\.org\/(?:InStock|OutOfStock|PreOrder|BackOrder|LimitedAvailability|OnlineOnly|Discontinued)$/.test(offer.availability)) issues.push(issue('error', 'invalid-availability', 'Disponibilidade deve ser um valor Offer válido de Schema.org.', 'offers', 'availability', offer.id));
    if (hasText(offer.itemCondition) && !allowedConditions.has(offer.itemCondition) && !/^https:\/\/schema\.org\/(?:NewCondition|UsedCondition|RefurbishedCondition|DamagedCondition)$/.test(offer.itemCondition)) issues.push(issue('error', 'invalid-condition', 'Condição deve ser um valor OfferItemCondition válido de Schema.org.', 'offers', 'itemCondition', offer.id));
    urlField(issues, offer.url, 'URL da oferta', 'offers', 'url', offer.id);
    if (hasText(offer.priceValidUntil) && !validDate(offer.priceValidUntil)) issues.push(issue('error', 'invalid-date', 'Validade da oferta: use AAAA-MM-DD.', 'offers', 'priceValidUntil', offer.id));
    if (!hasText(offer.price) || !hasText(offer.priceCurrency)) issues.push(issue('warning', 'offer-incomplete', 'Oferta pendente: preço e moeda são necessários; esta oferta não será gerada.', 'offers', !hasText(offer.price) ? 'price' : 'priceCurrency', offer.id));
  });

  return issues;
}

function referencesIn(value: unknown, output: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item) => referencesIn(item, output));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record['@id'] === 'string' && Object.keys(record).length === 1) output.push(record['@id']);
    else Object.values(record).forEach((item) => referencesIn(item, output));
  }
  return output;
}

export function validateGraph(document: JsonLdDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  try { JSON.parse(JSON.stringify(document)); } catch { issues.push(issue('error', 'invalid-json', 'O objeto não pode ser serializado como JSON.', 'output')); return issues; }
  if (document['@context'] !== 'https://schema.org' || !Array.isArray(document['@graph'])) {
    issues.push(issue('error', 'invalid-jsonld-root', 'O JSON-LD precisa conter @context schema.org e um único array @graph.', 'output'));
    return issues;
  }
  const idSet = new Set<string>();
  document['@graph'].forEach((node, index) => {
    const entity = node as SchemaEntity;
    if (!entity['@id'] || !entity['@type']) issues.push(issue('error', 'invalid-entity', `Entidade ${index + 1} sem @id ou @type.`, 'output'));
    if (idSet.has(entity['@id'])) issues.push(issue('error', 'duplicate-entity-id', `@id duplicado: ${entity['@id']}`, 'output'));
    idSet.add(entity['@id']);
    if (Object.keys(entity).length <= 2) issues.push(issue('error', 'empty-entity', `Entidade vazia: ${entity['@id']}`, 'output'));
    const types = Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type']];
    if (types.includes('VideoObject') && (!entity.name || !entity.thumbnailUrl || (!entity.contentUrl && !entity.embedUrl) || !entity.uploadDate)) {
      issues.push(issue('error', 'invalid-video-entity', `VideoObject incompleto: ${entity['@id']}`, 'output'));
    }
    if (types.includes('Offer') && (typeof entity.price !== 'number' || typeof entity.priceCurrency !== 'string')) {
      issues.push(issue('error', 'invalid-offer-entity', `Offer sem preço/moeda tipados: ${entity['@id']}`, 'output'));
    }
  });
  document['@graph'].forEach((entity) => referencesIn(entity).forEach((id) => {
    if (!idSet.has(id)) issues.push(issue('error', 'broken-reference', `Referência @id inexistente: ${id}`, 'output'));
  }));
  const noPlaceholder = (value: unknown): void => {
    if (typeof value === 'string' && isPlaceholder(value)) issues.push(issue('error', 'placeholder-in-output', `Placeholder não permitido no JSON-LD: ${value}`, 'output'));
    else if (Array.isArray(value)) value.forEach(noPlaceholder);
    else if (value && typeof value === 'object') Object.values(value).forEach(noPlaceholder);
  };
  noPlaceholder(document);
  return issues;
}

export function validateProjectRecord(project: ProjectRecord): ValidationIssue[] { return validateProject(project.data); }
