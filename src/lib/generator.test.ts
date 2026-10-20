import { describe, expect, it } from 'vitest';
import { createBlankData, createBlankImage, createBlankOffer, createBlankVersion, createBlankVideo } from './test-fixtures';
import { generateSchema } from './generator';
import { parseLocalizedNumber } from './ids';
import { validateGraph } from './validation';
import type { JsonLdDocument } from '../model/types';

function baseData() {
  const data = createBlankData();
  data.pageUrl = 'https://example.test/cars/crossover';
  data.siteUrl = 'https://example.test/';
  data.siteName = 'Example Motors';
  data.pageTitle = 'Crossover — versões e ficha técnica';
  data.modelName = 'Crossover';
  data.modelYear = '2027';
  data.brand.name = 'Example';
  data.organization.name = 'Example Motors Ltda.';
  data.organization.url = 'https://example.test/';
  data.versions = [createBlankVersion('Comfort AT')];
  return data;
}

function graphTypes(document: JsonLdDocument): string[] {
  return document['@graph'].flatMap((node) => Array.isArray(node['@type']) ? node['@type'] : [node['@type']]);
}

function refs(document: JsonLdDocument): string[] {
  const found: string[] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (Object.keys(record).length === 1 && typeof record['@id'] === 'string') found.push(record['@id']);
      else Object.values(record).forEach(walk);
    }
  };
  document['@graph'].forEach(walk);
  return found;
}

describe('generateSchema', () => {
  it('gera um único grafo válido para uma versão, sem grupo ou vídeo inexistente', () => {
    const data = baseData();
    const result = generateSchema(data);
    expect(result.canExport).toBe(true);
    expect(result.document['@context']).toBe('https://schema.org');
    expect(graphTypes(result.document)).toEqual(expect.arrayContaining(['WebSite', 'Organization', 'Brand', 'WebPage', 'Product', 'Vehicle']));
    expect(graphTypes(result.document)).not.toContain('ProductGroup');
    expect(graphTypes(result.document)).not.toContain('ItemList');
    expect(graphTypes(result.document)).not.toContain('VideoObject');
    expect(result.document['@graph'].filter((node) => node['@id'])).toHaveLength(result.document['@graph'].length);
    expect(validateGraph(result.document).filter((entry) => entry.severity === 'error')).toHaveLength(0);
    expect(JSON.parse(result.json)['@graph']).toHaveLength(result.document['@graph'].length);
  });

  it('escala para seis versões e relaciona ProductGroup, ItemList e variants sem IDs quebrados', () => {
    const data = baseData();
    data.versions = Array.from({ length: 6 }, (_, index) => {
      const version = createBlankVersion(`Trim ${index + 1}`);
      version.configuration = `Trim ${index + 1}`;
      version.fuelType = index < 3 ? 'Flex' : 'Elétrico';
      version.exteriorColors = index === 0 ? ['Azul'] : ['Prata'];
      return version;
    });
    const result = generateSchema(data);
    expect(result.canExport).toBe(true);
    expect(result.entityCounts.ProductGroup).toBe(1);
    expect(result.entityCounts.ItemList).toBe(1);
    expect(result.entityCounts.Product).toBe(6);
    expect(result.entityCounts.Vehicle).toBe(6);
    const group = result.document['@graph'].find((node) => node['@type'] === 'ProductGroup')!;
    expect(group.hasVariant).toHaveLength(6);
    expect(new Set(refs(result.document).filter((id) => id.startsWith('https://example.test/cars/crossover#'))).size).toBeGreaterThan(6);
    expect(validateGraph(result.document).filter((entry) => entry.severity === 'error')).toHaveLength(0);
  });

  it('converte números brasileiros em números JSON e omite quantidades opcionais vazias', () => {
    const data = baseData();
    const version = data.versions[0];
    version.measurements.length = '4.304';
    version.measurements.cargoVolume = '393';
    version.engineDisplacement = '999';
    version.powerOutput = '115,5';
    version.consumption.urbanGasoline = '11,5';
    version.torque = '18,9';
    const result = generateSchema(data);
    const product = result.document['@graph'].find((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'))!;
    expect((product.length as { value: number }).value).toBe(4304);
    expect((product.cargoVolume as { value: number }).value).toBe(393);
    expect((product.fuelConsumption as { value: number }[])[0].value).toBe(11.5);
    expect((product.torque as { value: number }).value).toBe(18.9);
    expect((product.vehicleEngine as { powerOutput: { value: number } }).powerOutput.value).toBe(115.5);
    expect(product.width).toBeUndefined();
    expect(parseLocalizedNumber('1.234,56')).toBe(1234.56);
    expect(parseLocalizedNumber('1,234.56')).toBe(1234.56);
  });

  it('deduplica URLs de imagem e compartilha cores gerais com cada versão', () => {
    const data = baseData();
    data.versions[0].exteriorColors = ['Vermelho'];
    data.commonExteriorColors = ['Azul', 'Vermelho'];
    const image = createBlankImage('page');
    image.contentUrl = 'https://cdn.example.test/photo.jpg';
    image.name = 'Foto principal';
    image.representativeOfPage = true;
    const duplicate = createBlankImage(data.versions[0].id);
    duplicate.contentUrl = image.contentUrl;
    duplicate.alt = 'Alt complementar';
    const secondImage = createBlankImage(data.versions[0].id);
    secondImage.contentUrl = 'https://cdn.example.test/photo-detail.jpg';
    secondImage.name = 'Foto de detalhe';
    data.images = [image, duplicate, secondImage];
    const result = generateSchema(data);
    expect(result.entityCounts.ImageObject).toBe(2);
    const product = result.document['@graph'].find((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'))!;
    expect(product.color).toEqual(['Azul', 'Vermelho']);
    expect(product.image).toHaveLength(2);
    expect(result.document['@graph'].find((node) => node['@type'] === 'WebPage')?.primaryImageOfPage).toBeDefined();
    expect(result.issues.some((entry) => entry.code === 'duplicate-image')).toBe(true);
  });

  it('só inclui VideoObject com os campos mínimos válidos; omite e sinaliza vídeo incompleto', () => {
    const data = baseData();
    const valid = createBlankVideo('page');
    valid.name = 'Apresentação do carro';
    valid.thumbnailUrl = 'https://cdn.example.test/video-poster.jpg';
    valid.embedUrl = 'https://video.example.test/embed/123';
    valid.uploadDate = '2026-05-14';
    const incomplete = createBlankVideo(data.versions[0].id);
    incomplete.name = 'Vídeo sem miniatura';
    incomplete.embedUrl = 'https://video.example.test/embed/456';
    data.videos = [valid, incomplete];
    const result = generateSchema(data);
    expect(result.entityCounts.VideoObject).toBe(1);
    expect(result.issues.some((entry) => entry.code === 'video-incomplete')).toBe(true);
  });

  it('gera Offer apenas com preço e moeda e liga a oferta ao produto correspondente', () => {
    const data = baseData();
    const offer = createBlankOffer(data.versions[0].id);
    offer.price = '129.990,50';
    offer.priceCurrency = 'BRL';
    offer.availability = 'InStock';
    offer.sellerName = 'Concessionária Exemplo';
    data.offers = [offer];
    const result = generateSchema(data);
    expect(result.entityCounts.Offer).toBe(1);
    const node = result.document['@graph'].find((entity) => entity['@type'] === 'Offer')!;
    expect(node.price).toBe(129990.5);
    expect(node.priceCurrency).toBe('BRL');
    expect(node.itemOffered).toBeDefined();
    expect(validateGraph(result.document).filter((entry) => entry.severity === 'error')).toHaveLength(0);
  });

  it('não publica placeholders, mostra pendências e bloqueia URL inválida', () => {
    const data = baseData();
    data.versions[0].emissionsCO2 = 'PREENCHER_COM_VALORES';
    data.versions[0].consumption.urbanGasoline = 'PREENCHER';
    const result = generateSchema(data);
    expect(result.json).not.toContain('PREENCHER');
    expect(result.issues.some((entry) => entry.severity === 'pending')).toBe(true);
    data.pageUrl = 'javascript:alert(1)';
    const invalid = generateSchema(data);
    expect(invalid.canExport).toBe(false);
    expect(invalid.issues.some((entry) => entry.code === 'invalid-url')).toBe(true);
  });

  it('cria breadcrumb e FAQ somente quando há entradas completas', () => {
    const data = baseData();
    data.breadcrumbs = [{ id: 'b1', name: 'Veículos', url: 'https://example.test/cars' }];
    data.faqs = [{ id: 'f1', question: 'Qual a autonomia?', answer: 'Consulte a versão.' }];
    const result = generateSchema(data);
    expect(result.entityCounts.BreadcrumbList).toBe(1);
    expect(result.entityCounts.FAQPage).toBe(1);
    expect(result.entityCounts.Question).toBe(1);
  });
});



describe('relações de grupos e ofertas gerais', () => {
  it('gera duas versões, reutiliza IDs ao reordenar e liga Offer ao ProductGroup', () => {
    const data = baseData();
    const first = data.versions[0];
    const second = createBlankVersion('Sport AT');
    second.configuration = 'Sport AT';
    data.versions = [first, second];
    const offer = createBlankOffer('page');
    offer.price = '145.990'; offer.priceCurrency = 'BRL';
    data.offers = [offer];

    const forward = generateSchema(data);
    expect(forward.canExport).toBe(true);
    expect(forward.entityCounts.ProductGroup).toBe(1);
    expect(forward.entityCounts.Product).toBe(2);
    const group = forward.document['@graph'].find((node) => node['@type'] === 'ProductGroup')!;
    const productGroupOffer = forward.document['@graph'].find((node) => node['@type'] === 'Offer')!;
    expect(productGroupOffer.itemOffered).toEqual({ '@id': group['@id'] });
    expect(group.offers).toEqual([{ '@id': productGroupOffer['@id'] }]);
    const firstId = forward.document['@graph'].find((node) => node.model === 'Crossover' && String(node.name).includes('Comfort AT'))?.['@id'];

    const reversed = generateSchema({ ...data, versions: [second, first] });
    const reorderedFirstId = reversed.document['@graph'].find((node) => node.model === 'Crossover' && String(node.name).includes('Comfort AT'))?.['@id'];
    expect(reorderedFirstId).toBe(firstId);
    expect(validateGraph(forward.document).filter((entry) => entry.severity === 'error')).toHaveLength(0);
  });
});

describe('validações opcionais e entidades condicionais', () => {
  it('mantém exportável placeholder em e-mail opcional sem produzir erro de formato', () => {
    const data = baseData();
    data.organization.email = 'PREENCHER';
    data.manufacturer.email = 'PREENCHER';
    const result = generateSchema(data);
    expect(result.canExport).toBe(true);
    expect(result.issues.some((entry) => entry.code === 'invalid-email')).toBe(false);
    expect(result.issues.some((entry) => entry.severity === 'pending')).toBe(true);
    expect(result.json).not.toContain('PREENCHER');
  });

  it('omite vendedor desconhecido quando preço/moeda tornam a oferta não gerável', () => {
    const data = baseData();
    const offer = createBlankOffer('page');
    offer.sellerName = 'Concessionária sem oferta';
    offer.priceCurrency = 'BRL';
    data.offers = [offer];
    const result = generateSchema(data);
    expect(result.canExport).toBe(true);
    expect(result.entityCounts.Offer).toBeUndefined();
    expect(result.document['@graph'].some((node) => node['@type'] === 'Organization' && node.name === offer.sellerName)).toBe(false);
  });

  it('bloqueia IDs internos repetidos entre entradas do projeto', () => {
    const data = baseData();
    data.images = [createBlankImage(), createBlankImage()];
    data.images[1].id = data.images[0].id;
    const result = generateSchema(data);
    expect(result.canExport).toBe(false);
    expect(result.issues.some((entry) => entry.code === 'duplicate-input-id')).toBe(true);
  });
});


describe('escopos de mídia por versão', () => {
  it('mantém imagens específicas e associa vídeo compartilhado a ambas as versões sem duplicá-lo', () => {
    const data = baseData();
    const first = data.versions[0];
    const second = createBlankVersion('Touring');
    data.versions = [first, second];
    const firstImage = createBlankImage(first.id); firstImage.contentUrl = 'https://cdn.example.test/comfort.jpg';
    const secondImage = createBlankImage(second.id); secondImage.contentUrl = 'https://cdn.example.test/touring.jpg';
    data.images = [firstImage, secondImage];
    const firstVideo = createBlankVideo(first.id);
    firstVideo.name = 'Vídeo comum'; firstVideo.thumbnailUrl = 'https://cdn.example.test/poster.jpg';
    firstVideo.contentUrl = 'https://cdn.example.test/video.mp4'; firstVideo.uploadDate = '2026-08-01';
    const secondVideo = { ...firstVideo, id: 'video-copy', scope: second.id };
    data.videos = [firstVideo, secondVideo];

    const result = generateSchema(data);
    expect(result.canExport).toBe(true);
    expect(result.entityCounts.ImageObject).toBe(2);
    expect(result.entityCounts.VideoObject).toBe(1);
    const products = result.document['@graph'].filter((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'));
    expect(products[0].image).toHaveLength(1);
    expect(products[1].image).toHaveLength(1);
    expect(products[0].associatedMedia).toHaveLength(1);
    expect(products[1].associatedMedia).toHaveLength(1);
    const group = result.document['@graph'].find((node) => node['@type'] === 'ProductGroup')!;
    const video = result.document['@graph'].find((node) => node['@type'] === 'VideoObject')!;
    expect(video.about).toEqual({ '@id': group['@id'] });
    expect(validateGraph(result.document).filter((entry) => entry.severity === 'error')).toHaveLength(0);
  });
});
