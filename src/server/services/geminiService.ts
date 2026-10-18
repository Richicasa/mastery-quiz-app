import { Question, EvaluationResult } from '../../shared/types.js';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
    status?: string;
  };
}

let cachedWorkingModel: string | null = null;
const cachedModelsPerKey = new Map<string, { models: string[]; timestamp: number }>();

/**
 * Extracts all top-level JSON objects and arrays from text by scanning for balanced
 * braces '{...}' and brackets '[...]'.
 *
 * This completely prevents "Unexpected non-whitespace character after JSON at position X"
 * errors when LLMs output multiple consecutive JSON objects (JSON Lines, ndjson, or multiple
 * blocks) instead of a single root array.
 */
export function extractAllJsonEntities(text: string): any[] {
  if (!text || !text.trim()) return [];
  const results: any[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let startIdx = -1;
  let openChar: '{' | '[' | null = null;
  let closeChar: '}' | ']' | null = null;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (depth === 0) {
      if (ch === '{') {
        openChar = '{';
        closeChar = '}';
        depth = 1;
        startIdx = i;
      } else if (ch === '[') {
        openChar = '[';
        closeChar = ']';
        depth = 1;
        startIdx = i;
      }
    } else {
      if (ch === openChar) {
        depth++;
      } else if (ch === closeChar) {
        depth--;
        if (depth === 0) {
          const jsonSubstring = text.substring(startIdx, i + 1);
          try {
            // Remove trailing commas before parse
            const sanitized = jsonSubstring.replace(/,\s*([\]}])/g, '$1');
            const parsed = JSON.parse(sanitized);
            results.push(parsed);
          } catch {
            try {
              const cleaned = extractJsonSubstring(jsonSubstring);
              results.push(JSON.parse(cleaned));
            } catch {
              // Discard unparseable fragment
            }
          }
          startIdx = -1;
          openChar = null;
          closeChar = null;
        }
      }
    }
  }

  return results;
}

/**
 * Extracts and cleans a JSON substring from raw text,
 * discarding conversational prefixes, markdown code blocks, or trailing commentary.
 */
export function extractJsonSubstring(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();

  // 1. If wrapped in markdown code fence anywhere in the string
  const fenceMatch = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1].trim()) {
    str = fenceMatch[1].trim();
  } else {
    // 2. Strip conversational preamble before first '[' or '{'
    const firstBracket = str.indexOf('[');
    const firstBrace = str.indexOf('{');
    let startIdx = -1;
    if (firstBracket !== -1 && firstBrace !== -1) {
      startIdx = Math.min(firstBracket, firstBrace);
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
    } else if (firstBrace !== -1) {
      startIdx = firstBrace;
    }

    if (startIdx > 0) {
      str = str.substring(startIdx);
    }

    // Strip trailing conversational remarks after last ']' or '}'
    const lastBracket = str.lastIndexOf(']');
    const lastBrace = str.lastIndexOf('}');
    const endIdx = Math.max(lastBracket, lastBrace);
    if (endIdx !== -1 && endIdx < str.length - 1) {
      str = str.substring(0, endIdx + 1);
    }
  }

  // Remove trailing commas before closing braces/brackets (common LLM flaw)
  str = str.replace(/,\s*([\]}])/g, '$1');

  return str.trim();
}

/**
 * Discovers questions array from any JSON structure
 * (direct array, English 'questions', Spanish 'preguntas', 'items', 'banco_preguntas', etc.)
 */
export function extractQuestionsArray(parsed: any): any[] {
  if (!parsed) return [];

  // Direct array
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (typeof parsed !== 'object') {
    return [];
  }

  // Known candidate keys (English and Spanish)
  const candidateKeys = [
    'questions',
    'preguntas',
    'banco_preguntas',
    'bancoPreguntas',
    'cuestionario',
    'items',
    'quiz',
    'data',
    'results',
    'preguntas_posibles',
    'preguntasGeneradas',
    'preguntas_generadas',
  ];

  for (const key of candidateKeys) {
    if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
      return parsed[key];
    }
  }

  // Search any property that is an array of objects
  for (const key of Object.keys(parsed)) {
    if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
      const first = parsed[key][0];
      if (first && typeof first === 'object') {
        return parsed[key];
      }
    }
  }

  // Recursively inspect nested objects
  for (const key of Object.keys(parsed)) {
    if (parsed[key] && typeof parsed[key] === 'object' && !Array.isArray(parsed[key])) {
      const nested = extractQuestionsArray(parsed[key]);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  // Single question object fallback
  if (
    parsed.questionText ||
    parsed.pregunta ||
    parsed.enunciado ||
    parsed.question ||
    parsed.texto
  ) {
    return [parsed];
  }

  return [];
}

/**
 * Normalizes question attributes across language variants and sets proper defaults.
 */
export function normalizeQuestion(
  rawQ: any,
  paragraph: string,
  paragraphIndex: number,
  index: number
): Question | null {
  if (!rawQ || typeof rawQ !== 'object') return null;

  // Question text
  const questionText = String(
    rawQ.questionText ||
    rawQ.pregunta ||
    rawQ.question ||
    rawQ.enunciado ||
    rawQ.texto ||
    rawQ.prompt ||
    ''
  ).trim();

  // Correct answer
  const correctAnswer = String(
    rawQ.correctAnswer ||
    rawQ.respuestaCorrecta ||
    rawQ.respuesta_correcta ||
    rawQ.respuesta ||
    rawQ.answer ||
    rawQ.correct_answer ||
    rawQ.solucion ||
    ''
  ).trim();

  // If questionText or correctAnswer is missing, discard invalid item
  if (!questionText || !correctAnswer) {
    return null;
  }

  // Raw type identification
  const rawType = String(rawQ.type || rawQ.tipo || '').toLowerCase().trim();
  let rawOptions = rawQ.options || rawQ.opciones || rawQ.choices || rawQ.alternativas;

  let type: Question['type'] = 'multiple_choice';

  if (
    rawType.includes('true') ||
    rawType.includes('verdader') ||
    rawType === 'vf' ||
    rawType === 'boolean'
  ) {
    type = 'true_false';
  } else if (
    rawType.includes('blank') ||
    rawType.includes('complet') ||
    rawType.includes('llenar')
  ) {
    type = 'fill_blank';
  } else if (
    rawType.includes('open') ||
    rawType.includes('abiert') ||
    rawType.includes('desarrollo') ||
    rawType.includes('justifi')
  ) {
    type = 'open_ended';
  } else if (
    rawType.includes('multiple') ||
    rawType.includes('opcion') ||
    rawType.includes('seleccion')
  ) {
    type = 'multiple_choice';
  } else {
    // Infer type from structure
    if (questionText.includes('____') || questionText.includes('___')) {
      type = 'fill_blank';
    } else if (Array.isArray(rawOptions) && rawOptions.length === 2) {
      const optStr = rawOptions.map((o: any) => String(o).toLowerCase()).join(' ');
      if (optStr.includes('verdader') || optStr.includes('fals')) {
        type = 'true_false';
      } else {
        type = 'multiple_choice';
      }
    } else if (Array.isArray(rawOptions) && rawOptions.length > 2) {
      type = 'multiple_choice';
    } else {
      type = 'open_ended';
    }
  }

  // Options normalization
  let options: string[] | undefined = undefined;
  if (type === 'true_false') {
    options = ['Verdadero', 'Falso'];
  } else if (type === 'multiple_choice') {
    if (Array.isArray(rawOptions) && rawOptions.length > 0) {
      options = rawOptions.map((o: any) => String(o).trim()).filter(Boolean);
    }
    // Ensure correctAnswer is in options
    if (options && options.length > 0) {
      const match = options.find((o) => o.toLowerCase() === correctAnswer.toLowerCase());
      if (!match) {
        options.push(correctAnswer);
      }
    } else {
      // If no options provided, convert to fill_blank or open_ended
      type = questionText.includes('____') ? 'fill_blank' : 'open_ended';
      options = undefined;
    }
  }

  const explanation = String(
    rawQ.explanation ||
    rawQ.explicacion ||
    rawQ.justificacion ||
    rawQ.razon ||
    ''
  ).trim();

  const rubric = String(
    rawQ.rubric ||
    rawQ.rubrica ||
    rawQ.criterio ||
    rawQ.conceptos_clave ||
    (type === 'open_ended' ? correctAnswer : '')
  ).trim();

  return {
    id: `p${paragraphIndex}_q${index}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    paragraphIndex,
    paragraphSnippet: paragraph.length > 120 ? paragraph.substring(0, 117) + '...' : paragraph,
    type,
    questionText,
    options,
    correctAnswer,
    rubric,
    explanation,
  };
}

// Discovers and caches candidate models per API key
async function getCandidateModels(apiKey: string): Promise<string[]> {
  const cached = cachedModelsPerKey.get(apiKey);
  // Cache for 10 minutes
  if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
    return cached.models;
  }

  const standardOrder = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-1.5-pro',
  ];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        headers: { 'x-goog-api-key': apiKey },
      }
    );

    if (res.ok) {
      const data: any = await res.json();
      const models: any[] = data.models || [];
      const generateModels = models
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''));

      if (generateModels.length > 0) {
        const sorted = standardOrder.filter((m) => generateModels.includes(m));
        for (const m of generateModels) {
          if (!sorted.includes(m)) {
            sorted.push(m);
          }
        }
        cachedModelsPerKey.set(apiKey, { models: sorted, timestamp: Date.now() });
        return sorted;
      }
    }
  } catch {
    // Ignore and fallback to standard list
  }

  cachedModelsPerKey.set(apiKey, { models: standardOrder, timestamp: Date.now() });
  return standardOrder;
}

// Low-level caller for Gemini with automatic fallback, model caching, and retry on 429
export async function callGemini(
  prompt: string,
  apiKey: string,
  systemInstruction?: string
): Promise<string> {
  const candidateModels = await getCandidateModels(apiKey);

  // If a known working model succeeded previously, prioritize it first
  const modelsToTry = cachedWorkingModel && candidateModels.includes(cachedWorkingModel)
    ? [cachedWorkingModel, ...candidateModels.filter((m) => m !== cachedWorkingModel)]
    : candidateModels;

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    // Attempt with both standard payload and inline system instruction fallback
    for (const inlineInstruction of [false, true]) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const fullPrompt = inlineInstruction && systemInstruction
          ? `${systemInstruction}\n\n---\n\n${prompt}`
          : prompt;

        const payload: any = {
          contents: [
            {
              role: 'user',
              parts: [{ text: fullPrompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.25,
          },
        };

        if (systemInstruction && !inlineInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        let res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(payload),
        });

        // If rate limited (429), pause briefly and retry once
        if (res.status === 429) {
          await new Promise((r) => setTimeout(r, 2000));
          res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(payload),
          });
        }

        if (!res.ok) {
          const errorData = (await res.json().catch(() => ({}))) as GeminiResponse;
          const msg = errorData.error?.message || `HTTP ${res.status} ${res.statusText}`;

          // If 400 Bad Request on systemInstruction, retry with inlineInstruction = true
          if (res.status === 400 && !inlineInstruction) {
            continue;
          }

          throw new Error(`Error de Gemini (${model}): ${msg}`);
        }

        const data = (await res.json()) as GeminiResponse;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text || !text.trim()) {
          throw new Error(`Respuesta vacía recibida de Gemini (${model})`);
        }

        // Cache working model for subsequent fast requests
        cachedWorkingModel = model;
        return text;
      } catch (err: any) {
        lastError = err;
        // If inline attempt also failed on this model, proceed to next candidate model
        if (inlineInstruction) {
          break;
        }
      }
    }
  }

  throw lastError || new Error('No se pudo comunicar con ningún modelo disponible de la API de Gemini.');
}

export async function generateQuestionsForParagraph(
  paragraph: string,
  paragraphIndex: number,
  apiKey: string
): Promise<Question[]> {
  const systemInstruction = `Eres un docente universitario implacable. Tu meta es aplicar el método de estudio de interrogación exhaustiva: a partir del párrafo proporcionado, debes extraer absolutamente todas las preguntas posibles de examen sin dejar escapar ningún detalle, definición, causa, función o relación anatómica/conceptual.

Debes generar una variedad de tipos:
1. "multiple_choice": 4 opciones (1 correcta y 3 distractores plausibles).
2. "true_false": Afirmación con opciones ["Verdadero", "Falso"].
3. "fill_blank": Oración con "____" y la palabra faltante exacta en correctAnswer.
4. "open_ended": Pregunta conceptual o justificativa con rúbrica detallada.

REGLA DE FORMATO OBLIGATORIA:
Debes responder con un único array JSON que comience con '[' y termine con ']'.
Cada elemento del array debe ser un objeto con los campos: "type", "questionText", "options" (para multiple_choice o true_false), "correctAnswer", "rubric" (para open_ended) y "explanation".`;

  const userPrompt = `Párrafo a interrogar de manera exhaustiva (Párrafo #${paragraphIndex + 1}):
"""
${paragraph}
"""

Responde únicamente con el array JSON de preguntas:
[
  {
    "type": "multiple_choice",
    "questionText": "...",
    "options": ["...", "...", "...", "..."],
    "correctAnswer": "...",
    "explanation": "..."
  }
]`;

  const rawJson = await callGemini(userPrompt, apiKey, systemInstruction);

  try {
    // 1. Scan for all valid JSON entities (handles single array, consecutive objects, JSON Lines, ndjson)
    const entities = extractAllJsonEntities(rawJson);
    const rawQuestions: any[] = [];

    if (entities.length > 0) {
      for (const entity of entities) {
        const questionsFromEntity = extractQuestionsArray(entity);
        rawQuestions.push(...questionsFromEntity);
      }
    } else {
      // Lenient fallback
      const cleaned = extractJsonSubstring(rawJson);
      const parsed = JSON.parse(cleaned);
      rawQuestions.push(...extractQuestionsArray(parsed));
    }

    const questions: Question[] = [];
    for (let i = 0; i < rawQuestions.length; i++) {
      const normalized = normalizeQuestion(rawQuestions[i], paragraph, paragraphIndex, i);
      if (normalized) {
        questions.push(normalized);
      }
    }

    if (questions.length === 0) {
      console.warn(`Párrafo ${paragraphIndex + 1}: el modelo respondió pero no contenía preguntas válidas:`, rawJson);
    }

    return questions;
  } catch (err: any) {
    console.error('Error parseando JSON de Gemini:', err.message, 'Raw:', rawJson);
    throw new Error(`La respuesta de Gemini no tuvo el formato JSON esperado: ${err.message}`);
  }
}

export async function evaluateOpenAnswer(
  questionText: string,
  rubric: string,
  userAnswer: string,
  apiKey: string
): Promise<EvaluationResult> {
  const systemInstruction = `Eres un docente evaluador pedagógico. Tu función es calificar respuestas de preguntas abiertas escritas por estudiantes.
Evalúa si el estudiante comprende el concepto fundamental, permitiendo variaciones en redacción, sinopsis o respuestas cortas.
- Si el estudiante capturó la idea correcta o el concepto clave: isCorrect = true.
- Si el estudiante erró, confundió los conceptos o le faltó la parte medular: isCorrect = false.

IMPORTANTE: Si isCorrect es false, en "feedback" debes dar una explicación reflexiva o pista formativa explicando POR QUÉ está incorrecta su respuesta o qué idea confunde, PERO SIN DARLE DIRECTAMENTE LA RESPUESTA LITERAL o la frase exacta, para obligarlo a pensar y consolidar el conocimiento.

Devuelve estrictamente un objeto JSON con este formato:
{
  "isCorrect": boolean,
  "feedback": "Justificación formativa del error o felicitación concisa si acertó"
}`;

  const prompt = `Pregunta: "${questionText}"
Rúbrica / Conceptos esenciales esperados: "${rubric}"
Respuesta del alumno: "${userAnswer}"

Evalúa la respuesta del alumno según las instrucciones.`;

  const rawJson = await callGemini(prompt, apiKey, systemInstruction);

  try {
    const entities = extractAllJsonEntities(rawJson);
    let parsed: any = null;
    for (const e of entities) {
      if (typeof e === 'object' && ('isCorrect' in e || 'feedback' in e || 'correcto' in e)) {
        parsed = e;
        break;
      }
    }
    if (!parsed) {
      const cleaned = extractJsonSubstring(rawJson);
      parsed = JSON.parse(cleaned);
    }
    const isCorrect = Boolean(parsed.isCorrect ?? parsed.correcto ?? parsed.acierto);
    const feedback = parsed.feedback || parsed.retroalimentacion || parsed.explicacion || (isCorrect ? '¡Excelente respuesta!' : 'Respuesta incompleta o inexacta.');
    return { isCorrect, feedback };
  } catch {
    return {
      isCorrect: false,
      feedback: 'No se pudo validar con precisión semántica; revisa los conceptos fundamentales del párrafo.',
    };
  }
}

export async function validateGeminiApiKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, error: 'La clave de API no puede estar vacía.' };
  }

  const cleanKey = apiKey.trim();

  // 1. Direct ModelService.ListModels call
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
    const res = await fetch(url, {
      headers: {
        'x-goog-api-key': cleanKey,
      },
    });

    if (res.ok) {
      return { valid: true };
    }

    const errData: any = await res.json().catch(() => ({}));
    const message = errData?.error?.message || '';

    if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
      return {
        valid: false,
        error: 'Tu clave API de Google Gemini no es válida. Por favor cópiala de nuevo desde Google AI Studio.',
      };
    }
  } catch {
    // Continue to fallback check
  }

  // 2. Fallback generateContent ping
  const pingModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];
  for (const model of pingModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
        }),
      });

      if (res.ok) {
        return { valid: true };
      }

      const errData: any = await res.json().catch(() => ({}));
      const message = errData?.error?.message || '';
      if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
        return {
          valid: false,
          error: 'Tu clave API de Google Gemini no es válida. Por favor cópiala de nuevo desde Google AI Studio.',
        };
      }
    } catch {
      // Continue to next ping candidate
    }
  }

  return {
    valid: false,
    error: 'La clave API no pudo ser validada con Google Gemini. Asegúrate de tener conexión y que tu clave esté activa en Google AI Studio.',
  };
}
