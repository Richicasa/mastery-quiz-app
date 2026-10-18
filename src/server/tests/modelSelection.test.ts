import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isTextGenerationModel,
  buildCandidateModelList,
  isUsableJsonResponse,
} from '../services/geminiService.js';

/**
 * Regression suite for the real production bug (2026-10-18):
 *
 * Con una clave válida, la app fallaba SIEMPRE porque la lista de modelos estaba
 * obsoleta y `callGemini` aceptaba como válido el primer 200 que devolviese texto:
 *
 *   gemini-2.5-flash        -> 404 "no longer available to new users"
 *   gemini-2.5-flash-lite   -> 404
 *   gemini-2.5-pro          -> 404
 *   gemini-2.5-flash-preview-tts -> 400 (modalidad TEXT no soportada)
 *   gemini-2.5-pro-preview-tts   -> 429 (cuota)
 *   gemma-4-26b-a4b-it      -> 200 pero devuelve PROSA (su razonamiento), no JSON
 *                             => se aceptaba, se cacheaba y se usaba para todo
 */

const jsonResponse = (payload: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'ERR',
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  }) as unknown as Response;

/** Respuesta de generateContent tal como la devuelve Google (el texto va dentro de candidates). */
const geminiResponse = (text: string, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'ERR',
    json: async () => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }),
    text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
  }) as unknown as Response;

/** Respuesta de generateContent sin texto (p. ej. candidates vacío). */
const emptyGeminiResponse = (status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'ERR',
    json: async () => ({ candidates: [] }),
    text: async () => '{"candidates":[]}',
  }) as unknown as Response;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Selección de modelos de Gemini', () => {
  it('descarta modelos que no son de generación de texto', () => {
    const noTexto = [
      'gemini-2.5-flash-preview-tts',
      'gemini-2.5-pro-preview-tts',
      'gemini-3.8-flash-tts',
      'gemini-3.1-flash-image-preview',
      'gemini-2.5-flash-image',
      'nano-banana-pro-preview',
      'gemini-embedding-001',
      'gemini-3.5-transcribe',
      'lyria-3.5',
      'gemini-2.5-computer-use-preview-10-2025',
      'gemini-robotics-er-2-preview',
      'aqa',
      'deep-research-pro-preview-12-2025',
      'antigravity-preview-09-2026',
      'gemini-omni-flash-preview',
    ];
    for (const m of noTexto) {
      expect(isTextGenerationModel(m), `${m} debería descartarse`).toBe(false);
    }
  });

  it('descarta gemma, que ignora el contrato JSON y devuelve prosa', () => {
    expect(isTextGenerationModel('gemma-4-26b-a4b-it')).toBe(false);
    expect(isTextGenerationModel('gemma-4-31b-it')).toBe(false);
  });

  it('acepta los modelos de chat vigentes', () => {
    for (const m of [
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-pro-latest',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
    ]) {
      expect(isTextGenerationModel(m), `${m} debería aceptarse`).toBe(true);
    }
  });

  it('prioriza los alias estables por delante del resto y excluye la basura', () => {
    const list = buildCandidateModelList([
      'gemini-2.5-flash-preview-tts',
      'gemma-4-26b-a4b-it',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-pro-latest',
      'gemini-embedding-001',
    ]);

    expect(list).not.toContain('gemini-2.5-flash-preview-tts');
    expect(list).not.toContain('gemma-4-26b-a4b-it');
    expect(list).not.toContain('gemini-embedding-001');
    // El alias estable SIEMPRE se intenta primero
    expect(list[0]).toBe('gemini-flash-latest');
    expect(list).toContain('gemini-pro-latest');
    expect(list).toContain('gemini-3.8-flash');
  });

  it('nunca deja la lista vacía si hay al menos un modelo de texto disponible', () => {
    const list = buildCandidateModelList(['gemini-3.8-flash']);
    expect(list).toEqual(['gemini-3.8-flash']);
  });
});

describe('Validación del contenido devuelto por Gemini', () => {
  it('reconoce JSON utilizable (array y objeto)', () => {
    expect(isUsableJsonResponse('[{"questionText":"a","correctAnswer":"b"}]')).toBe(true);
    expect(isUsableJsonResponse('{"isCorrect":true,"feedback":"ok"}')).toBe(true);
  });

  it('rechaza prosa, texto vacío y razonamiento del modelo', () => {
    expect(isUsableJsonResponse('')).toBe(false);
    expect(isUsableJsonResponse('   ')).toBe(false);
    expect(isUsableJsonResponse('*   Role: Relentless university professor.\n*   Method: ...')).toBe(false);
  });
});

describe('callGemini: cadena de respaldo ante modelos rotos', () => {
  // `geminiService` memoriza el modelo que funciona a nivel de módulo, así que cada
  // caso necesita una instancia limpia para no heredar el estado del caso anterior.
  const loadService = async () => {
    vi.resetModules();
    return await import('../services/geminiService.js');
  };

  it('descarta un 200 con texto no-JSON y pasa al siguiente modelo (bug gemma-4)', async () => {
    const llamadas: string[] = [];
    vi.stubGlobal('fetch', async (url: unknown) => {
      const u = String(url);
      if (u.includes('/models?')) {
        return jsonResponse({
          models: [
            { name: 'models/aaa-junk-model', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/zzz-good-model', supportedGenerationMethods: ['generateContent'] },
          ],
        });
      }
      llamadas.push(u);
      if (u.includes('aaa-junk-model')) {
        return geminiResponse('*   Role: Relentless university professor. This is prose, not JSON.');
      }
      return geminiResponse(
        '[{"type":"multiple_choice","questionText":"¿Cuántos músculos?","options":["Tres","Cuatro","Cinco","Seis"],"correctAnswer":"Cinco"}]'
      );
    });

    const { callGemini: freshCallGemini } = await loadService();
    const texto = await freshCallGemini('prompt de prueba', 'clave-test-junk-1');

    expect(llamadas.some((u) => u.includes('aaa-junk-model'))).toBe(true);
    expect(llamadas.some((u) => u.includes('zzz-good-model'))).toBe(true);
    expect(texto).toContain('multiple_choice');
  });

  it('descarta respuestas vacías y continúa con el siguiente modelo', async () => {
    const llamadas: string[] = [];
    vi.stubGlobal('fetch', async (url: unknown) => {
      const u = String(url);
      if (u.includes('/models?')) {
        return jsonResponse({
          models: [
            { name: 'models/bbb-empty-model', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/zzz-good-model', supportedGenerationMethods: ['generateContent'] },
          ],
        });
      }
      llamadas.push(u);
      if (u.includes('bbb-empty-model')) return emptyGeminiResponse();
      return geminiResponse('[{"questionText":"¿Q?","correctAnswer":"A"}]');
    });

    const { callGemini: freshCallGemini } = await loadService();
    const texto = await freshCallGemini('prompt de prueba', 'clave-test-empty-1');
    expect(texto).toContain('questionText');
    expect(llamadas.some((u) => u.includes('bbb-empty-model'))).toBe(true);
    expect(llamadas.some((u) => u.includes('zzz-good-model'))).toBe(true);
  });

  it('lanza un error explicativo cuando ningún modelo devuelve JSON', async () => {
    vi.stubGlobal('fetch', async (url: unknown) => {
      const u = String(url);
      if (u.includes('/models?')) {
        return jsonResponse({
          models: [{ name: 'models/ccc-broken-model', supportedGenerationMethods: ['generateContent'] }],
        });
      }
      return geminiResponse('Solamente prosa sin JSON.');
    });

    const { callGemini: freshCallGemini } = await loadService();
    await expect(freshCallGemini('prompt', 'clave-test-broken-1')).rejects.toThrow(/JSON|utilizable/i);
  });
});
