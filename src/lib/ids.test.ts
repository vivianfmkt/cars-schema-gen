import { describe, expect, it } from 'vitest';
import { normalizeNumericMeasure, parseDecimalNumber, parseLocalizedNumber } from './ids';

describe('parsers numéricos de medidas', () => {
  it('prioriza ponto decimal em campos de consumo/emissões e preserva o parser localizado geral', () => {
    expect(parseDecimalNumber('11.500')).toBe(11.5);
    expect(parseDecimalNumber('11,500')).toBe(11.5);
    expect(parseDecimalNumber('1.234,56')).toBe(1234.56);
    expect(parseDecimalNumber('1,234.56')).toBe(1234.56);
    expect(parseLocalizedNumber('4.304')).toBe(4304);
  });

  it('migra faixas antigas com hífen sem espaços e preserva entradas não numéricas', () => {
    expect(normalizeNumericMeasure('11,2-11,5')).toEqual({ value: '', minValue: '11.2', maxValue: '11.5' });
    expect(normalizeNumericMeasure('11.2 – 11.5 km/L')).toEqual({ value: '', minValue: '11.2', maxValue: '11.5' });
    expect(normalizeNumericMeasure('11.500')).toEqual({ value: '11.5', minValue: '', maxValue: '' });
    expect(normalizeNumericMeasure('aproximadamente 11.5')).toEqual({ value: 'aproximadamente 11.5', minValue: '', maxValue: '' });
  });
});
