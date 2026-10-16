import { describe, it, expect } from 'vitest';
import { cleanAndSegmentParagraphs } from '../services/documentParser.js';

describe('cleanAndSegmentParagraphs', () => {
  it('separa adecuadamente múltiples párrafos con saltos de línea', () => {
    const input = `
    El primer párrafo introduce el concepto del ciclo celular y la mitosis en eucariotas.

    El segundo párrafo explica detalladamente la fase S de replicación del ADN y su regulación por ciclinas.

    El tercer párrafo describe la citocinesis y la separación final de las dos células hijas resultantes.
    `;

    const result = cleanAndSegmentParagraphs(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toContain('ciclo celular y la mitosis');
    expect(result[1]).toContain('fase S de replicación');
    expect(result[2]).toContain('citocinesis y la separación');
  });

  it('ignora artefactos diminutos o números de página aislados', () => {
    const input = `
    12

    Página 34

    Este es un párrafo de contenido real que contiene información conceptual de gran relevancia médica y biológica.

    ---
    `;

    const result = cleanAndSegmentParagraphs(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('contenido real');
  });

  it('maneja textos vacíos o solo con espacios sin lanzar excepciones', () => {
    expect(cleanAndSegmentParagraphs('')).toEqual([]);
    expect(cleanAndSegmentParagraphs('    \n\n   \t  ')).toEqual([]);
  });

  it('normaliza espacios internos y saltos de línea dentro de un mismo párrafo', () => {
    const input = `
    Este párrafo tiene saltos de línea
    intermedios que deben unificarse
    en una sola línea continua con espacios normales.
    `;

    const result = cleanAndSegmentParagraphs(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Este párrafo tiene saltos de línea intermedios que deben unificarse en una sola línea continua con espacios normales.');
  });
});
