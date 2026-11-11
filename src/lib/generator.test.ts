import { describe, expect, it } from 'vitest';
import { createBlankData, createBlankImage, createBlankOffer, createBlankVersion, createBlankVideo } from './test-fixtures';
import { generateSchema } from './generator';
import { parseLocalizedNumber } from './ids';
import { validateGraph } from './validation';
import { SHARED_FEATURE_CATALOG, VERSION_FEATURE_CATALOG } from './feature-catalog';
import type { JsonLdDocument } from '../model/types';

function baseData() {
  const data = createBlankData();
  data.pageUrl = 'https://example.test/cars/crossover';
  data.siteUrl = 'https://example.test/';
  data.siteName = 'Example Motors';
  data.pageTitle = 'Crossover — versões e ficha técnica';
  data.modelName = 'Crossover';
  data.modelYear = '';
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
    version.consumption.urbanGasoline.value = '11,5';
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

  it('deduplica imagens e mantém as cores comuns no ProductGroup, sem duplicá-las em Vehicle', () => {
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
    const imageNode = result.document['@graph'].find((node) => node['@type'] === 'ImageObject')!;
    expect(imageNode.inLanguage).toBeUndefined();
    const product = result.document['@graph'].find((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'))!;
    expect(product.color).toEqual(['Vermelho']);
    expect(result.document['@graph'].find((node) => node['@type'] === 'ProductGroup')?.color).toEqual(['Azul', 'Vermelho']);
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
    data.versions[0].emissionsCO2.value = 'PREENCHER_COM_VALORES';
    data.versions[0].consumption.urbanGasoline.value = 'PREENCHER';
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

describe('propriedades pré-carregadas do modelo e das versões', () => {
  it('mantém os catálogos vazios sem avisos e emite campos comuns e por versão na entidade correspondente', () => {
    const data = baseData();
    const empty = generateSchema(data);
    const vehicle = empty.document['@graph'].find((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'))!;
    expect(data.sharedFeatures).toHaveLength(SHARED_FEATURE_CATALOG.length);
    expect(data.versions[0].features).toHaveLength(VERSION_FEATURE_CATALOG.length);
    expect(vehicle.additionalProperty).toBeUndefined();
    expect(empty.issues.filter((entry) => entry.code === 'incomplete-property')).toHaveLength(0);

    data.sharedFeatures.find((entry) => entry.name === 'Controle eletrônico de estabilidade')!.value = 'Sim';
    data.versions[0].features.find((entry) => entry.name === 'Entrada USB')!.value = 'Duas portas USB-C';
    data.sharedFeatures.find((entry) => entry.name === 'Vidros Elétricos')!.value = 'Sim';
    const filled = generateSchema(data);
    const filledVehicle = filled.document['@graph'].find((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'))!;
    const group = filled.document['@graph'].find((node) => node['@type'] === 'ProductGroup')!;
    const versionProperties = filledVehicle.additionalProperty as { name: string; value: string }[];
    const modelProperties = group.additionalProperty as { name: string; value: string }[];
    expect(modelProperties).toEqual(expect.arrayContaining([
      { '@type': 'PropertyValue', name: 'Controle eletrônico de estabilidade', value: 'Sim' },
      { '@type': 'PropertyValue', name: 'Vidros Elétricos', value: 'Sim' },
    ]));
    expect(versionProperties).toEqual([{ '@type': 'PropertyValue', name: 'Entrada USB', value: 'Duas portas USB-C' }]);
  });

  it('relaciona propriedades comuns ao ProductGroup e mantém propriedades próprias distintas por versão', () => {
    const data = baseData();
    const second = createBlankVersion('Touring');
    data.versions = [data.versions[0], second];
    data.sharedFeatures.find((entry) => entry.name === 'Detecção de pedestres')!.value = 'Sim';
    data.sharedFeatures.find((entry) => entry.name === 'Vidros Elétricos')!.value = 'Dianteiros e traseiros';
    data.versions[0].features.find((entry) => entry.name === 'Entrada USB')!.value = 'Duas portas USB-C';
    data.versions[1].features.find((entry) => entry.name === 'Entrada USB')!.value = 'Uma porta USB-A';

    const result = generateSchema(data);
    const group = result.document['@graph'].find((node) => node['@type'] === 'ProductGroup')!;
    const vehicles = result.document['@graph'].filter((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'));
    expect(group.additionalProperty).toEqual(expect.arrayContaining([
      { '@type': 'PropertyValue', name: 'Detecção de pedestres', value: 'Sim' },
      { '@type': 'PropertyValue', name: 'Vidros Elétricos', value: 'Dianteiros e traseiros' },
    ]));
    expect((vehicles[0].additionalProperty as { name: string; value: string }[]).find((entry) => entry.name === 'Entrada USB')?.value).toBe('Duas portas USB-C');
    expect((vehicles[1].additionalProperty as { name: string; value: string }[]).find((entry) => entry.name === 'Entrada USB')?.value).toBe('Uma porta USB-A');
    expect(validateGraph(result.document).filter((entry) => entry.severity === 'error')).toHaveLength(0);
  });
});


describe('deduplicação de propriedades adicionais', () => {
  it('prioriza potência técnica sobre propriedade livre homônima e mantém só a última personalizada', () => {
    const data = baseData();
    const version = data.versions[0];
    version.powerGasoline = '150';
    version.features.push(
      { id: 'custom-power', name: 'Potência Máxima Gasolina', value: '999' },
      { id: 'custom-equipment-1', name: 'Som premium', value: '8 alto-falantes' },
      { id: 'custom-equipment-2', name: 'Som premium', value: '10 alto-falantes' },
    );

    const result = generateSchema(data);
    const vehicle = result.document['@graph'].find((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'))!;
    const properties = vehicle.additionalProperty as { name: string; value: unknown; unitText?: string }[];
    const power = properties.filter((property) => property.name === 'Potência Máxima Gasolina');
    const sound = properties.filter((property) => property.name === 'Som premium');

    expect(result.canExport).toBe(true);
    expect(power).toHaveLength(1);
    expect(power[0]).toMatchObject({ value: 150, unitText: 'cv' });
    expect(sound).toEqual([{ '@type': 'PropertyValue', name: 'Som premium', value: '10 alto-falantes' }]);
    expect(result.issues.some((entry) => entry.code === 'typed-property-override' && entry.severity === 'warning')).toBe(true);
    expect(result.issues.some((entry) => entry.code === 'duplicate-feature-name' && entry.severity === 'warning')).toBe(true);
  });
});

describe('medidas numéricas de consumo e emissões', () => {
  it('serializa valores pontuais como números e faixas com minValue/maxValue numéricos', () => {
    const data = baseData();
    const first = data.versions[0];
    const second = createBlankVersion('Touring');
    first.consumption.urbanGasoline = { value: '', minValue: '11,2', maxValue: '11.5' };
    first.emissionsCO2.value = '120,5';
    second.consumption.highwayGasoline.value = '12,4';
    second.emissionsCO2 = { value: '', minValue: '118', maxValue: '123' };
    data.versions = [first, second];

    const result = generateSchema(data);
    const vehicles = result.document['@graph'].filter((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'));
    const urban = (vehicles[0].fuelConsumption as { name: string; value?: number; minValue?: number; maxValue?: number }[])[0];
    expect(result.canExport).toBe(true);
    expect(urban).toMatchObject({ minValue: 11.2, maxValue: 11.5, unitText: 'km/L' });
    expect(urban.value).toBeUndefined();
    expect(vehicles[0].emissionsCO2).toBe(120.5);
    const secondConsumption = vehicles[1].fuelConsumption as { value?: number; minValue?: number; maxValue?: number }[];
    expect(secondConsumption[0].value).toBe(12.4);
    expect(vehicles[1].emissionsCO2).toEqual({ '@type': 'QuantitativeValue', minValue: 118, maxValue: 123, unitText: 'g/km' });
    expect(validateGraph(result.document).filter((entry) => entry.severity === 'error')).toHaveLength(0);
  });

  it('trata um único ponto como separador decimal em consumo e CO₂', () => {
    const data = baseData();
    data.versions[0].consumption.urbanGasoline.value = '11.500';
    data.versions[0].emissionsCO2.value = '120.500';
    const result = generateSchema(data);
    const vehicle = result.document['@graph'].find((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'))!;

    expect(result.canExport).toBe(true);
    expect((vehicle.fuelConsumption as { value: number }[])[0].value).toBe(11.5);
    expect(vehicle.emissionsCO2).toBe(120.5);
  });

  it('bloqueia faixa incompleta, mínimo maior que máximo e modo exato combinado com faixa', () => {
    const data = baseData();
    data.versions[0].consumption.urbanGasoline.minValue = '12';
    expect(generateSchema(data).issues.some((entry) => entry.code === 'incomplete-numeric-range')).toBe(true);
    data.versions[0].consumption.urbanGasoline.maxValue = '10';
    expect(generateSchema(data).issues.some((entry) => entry.code === 'invalid-numeric-range')).toBe(true);
    data.versions[0].consumption.urbanGasoline.value = '11';
    expect(generateSchema(data).issues.some((entry) => entry.code === 'ambiguous-numeric-measure')).toBe(true);
    expect(generateSchema(data).canExport).toBe(false);
  });
});

describe('propriedades técnicas compartilhadas do modelo', () => {
  it('serializa os seis campos no ProductGroup via additionalProperty e não os duplica nos Vehicle', () => {
    const data = baseData();
    const first = data.versions[0];
    const second = createBlankVersion('Touring');
    first.configuration = 'Comfort'; second.configuration = 'Touring';
    data.versions = [first, second];
    data.sharedVehicleProperties = {
      fuelType: 'Flex', driveWheelConfiguration: 'Dianteira', vehicleTransmission: 'Automática',
      numberOfDoors: '4', seatingCapacity: '5', numberOfAirbags: '6',
    };
    const result = generateSchema(data);
    const vehicles = result.document['@graph'].filter((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'));
    const group = result.document['@graph'].find((node) => node['@type'] === 'ProductGroup')!;
    const properties = group.additionalProperty as { name: string; value: string | number }[];
    const byName = Object.fromEntries(properties.map((property) => [property.name, property.value]));
    expect(byName).toMatchObject({
      fuelType: 'Flex', driveWheelConfiguration: 'Dianteira', vehicleTransmission: 'Automática',
      numberOfDoors: 4, seatingCapacity: 5, numberOfAirbags: 6,
    });
    for (const vehicle of vehicles) {
      for (const field of ['fuelType', 'driveWheelConfiguration', 'vehicleTransmission', 'numberOfDoors', 'seatingCapacity', 'numberOfAirbags']) {
        expect(vehicle).not.toHaveProperty(field);
      }
    }
    expect(group.variesBy).not.toContain('fuelType');
    expect(validateGraph(result.document).filter((entry) => entry.severity === 'error')).toHaveLength(0);
  });

  it('mantém wheelbase e características compartilhadas no ProductGroup mesmo com uma única versão', () => {
    const data = baseData();
    data.modelYear = '2027';
    data.sharedMeasurements.wheelbase = '2.700';
    data.sharedVehicleProperties.numberOfDoors = '4';
    const steering = data.sharedFeatures.find((feature) => feature.name === 'Direção')!;
    steering.value = 'Elétrica';
    const result = generateSchema(data);
    const group = result.document['@graph'].find((node) => node['@type'] === 'ProductGroup')!;
    const vehicle = result.document['@graph'].find((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'))!;
    const properties = group.additionalProperty as { name: string; value: string | number; unitText?: string }[];
    expect(properties.find((property) => property.name === 'wheelbase')).toMatchObject({ value: 2700, unitCode: 'MMT' });
    expect(properties.find((property) => property.name === 'Direção')?.value).toBe('Elétrica');
    expect(properties.find((property) => property.name === 'numberOfDoors')?.value).toBe(4);
    expect(group.hasVariant).toHaveLength(1);
    expect(vehicle).not.toHaveProperty('wheelbase');
    expect(vehicle).not.toHaveProperty('numberOfDoors');
    expect(vehicle).not.toHaveProperty('vehicleModelDate');
  });

  it('cria ProductGroup para dimensões comuns de um modelo com uma versão sem duplicá-las no Vehicle', () => {
    const data = baseData();
    data.sharedMeasurements.length = '4.300';
    const result = generateSchema(data);
    const group = result.document['@graph'].find((node) => node['@type'] === 'ProductGroup')!;
    const vehicle = result.document['@graph'].find((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'))!;
    expect((group.length as { value: number; unitCode: string })).toMatchObject({ value: 4300, unitCode: 'MMT' });
    expect(vehicle).not.toHaveProperty('length');
  });

  it('omite propriedades opcionais vazias em vez de herdar ou criar campos derivados', () => {
    const data = baseData();
    const version = data.versions[0];
    version.configuration = '';
    version.modelDate = '';
    version.bodyType = '';
    version.measurements.length = '';
    const result = generateSchema(data);
    const vehicle = result.document['@graph'].find((node) => Array.isArray(node['@type']) && node['@type'].includes('Vehicle'))!;
    for (const field of ['vehicleConfiguration', 'vehicleModelDate', 'bodyType', 'length', 'width', 'height', 'wheelbase', 'fuelConsumption', 'emissionsCO2', 'fuelType', 'numberOfDoors']) {
      expect(vehicle).not.toHaveProperty(field);
    }
  });

  it('bloqueia exportação enquanto existir conflito de migração sem decisão do usuário', () => {
    const data = baseData();
    data.migrationConflicts = [{
      id: 'conflict-1', target: 'vehicleProperty', key: 'numberOfDoors', label: 'Número de portas',
      candidates: [{ versionId: data.versions[0].id, versionName: data.versions[0].name, value: '4' }],
    }];
    const result = generateSchema(data);
    expect(result.canExport).toBe(false);
    expect(result.issues.some((entry) => entry.code === 'migration-conflict')).toBe(true);
  });
});
