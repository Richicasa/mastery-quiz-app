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
 * Checks whether an object represents an examination question across English and Spanish schemas.
 */
export function isQuestionObject(obj: any): boolean {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Boolean(
    obj.questionText ??
    obj.pregunta ??
    obj.question ??
    obj.enunciado ??
    obj.texto ??
    obj.prompt ??
    obj.statement ??
    obj.afirmacion ??
    obj.oracion ??
    obj.item ??
    obj.query ??
    obj.title ??
    obj.titulo
  );
}

/**
 * Alias estables de Google. Apuntan siempre al modelo vigente del momento, de modo
 * que no caducan cuando Google retira una versión concreta (gemini-2.0-flash y
 * gemini-2.5-flash ya responden 404 "no longer available to new users").
 */
export const PREFERRED_MODELS = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-pro-latest',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
];

/**
 * Modelos que declaran `generateContent` pero NO sirven para producir cuestionarios
 * de texto: audio (tts), imagen, embeddings, transcripción, investigación, etc.
 */
const NON_TEXT_MODEL_PATTERNS = [
  /tts/,
  /image/,
  /embedding/,
  /transcribe/,
  /lyria/,
  /robotics/,
  /computer-use/,
  /nano-banana/,
  /deep-research/,
  /antigravity/,
  /omni/,
  /audio/,
  /imagen/,
  /veo/,
  /^aqa$/,
];

/**
 * `models.list` incluye modelos que responden 200 pero no siguen el contrato JSON
 * (por ejemplo `gemma-4-26b-a4b-it` devuelve su razonamiento en prosa), lo que
 * envenenaba la cadena de respaldo. Se filtran antes de intentarlos.
 */
export function isTextGenerationModel(modelName: string): boolean {
  const name = String(modelName || '')
    .replace(/^models\//, '')
    .toLowerCase();
  if (!name) return false;
  // Gemma ignora `systemInstruction` y `responseMimeType` y responde con prosa.
  if (name.startsWith('gemma')) return false;
  return !NON_TEXT_MODEL_PATTERNS.some((re) => re.test(name));
}

/**
 * Ordena los modelos disponibles: primero los alias estables, después el resto de
 * modelos de texto. Es una función pura para poder verificarla sin red.
 */
export function buildCandidateModelList(availableModels: string[]): string[] {
  const usable = (availableModels || [])
    .map((m) => String(m || '').replace(/^models\//, '').trim())
    .filter((m) => Boolean(m) && isTextGenerationModel(m));

  const unique = Array.from(new Set(usable));
  const preferred = PREFERRED_MODELS.filter((m) => unique.includes(m));
  const rest = unique.filter((m) => !preferred.includes(m)).sort();
  return [...preferred, ...rest];
}

/**
 * Comprueba que el texto devuelto por el modelo contenga al menos un JSON parseable.
 * Sin esto, un 200 con prosa se aceptaba, se memorizaba como "modelo que funciona"
 * y todas las llamadas siguientes devolvían cero preguntas.
 */
export function isUsableJsonResponse(text: string): boolean {
  if (!text || !text.trim()) return false;
  if (extractAllJsonEntities(text).length > 0) return true;
  try {
    const cleaned = extractJsonSubstring(text);
    if (!cleaned) return false;
    JSON.parse(cleaned);
    return true;
  } catch {
    return false;
  }
}

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
 * (direct array, categorized object by type, nested object, or single question object).
 */
export function extractQuestionsArray(parsed: any): any[] {
  if (!parsed) return [];

  // Direct array
  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => extractQuestionsArray(item));
  }

  if (typeof parsed !== 'object') {
    return [];
  }

  // Single question object
  if (isQuestionObject(parsed)) {
    return [parsed];
  }

  const collected: any[] = [];

  // Known candidate list keys
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
    if (Array.isArray(parsed[key])) {
      for (const item of parsed[key]) {
        if (typeof item === 'object' && item !== null) {
          collected.push(item);
        }
      }
    }
  }

  if (collected.length > 0) {
    return collected;
  }

  // Search all properties (handles categorized objects e.g. { opcion_multiple: [...], verdadero_falso: [...] })
  for (const key of Object.keys(parsed)) {
    const val = parsed[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'object' && item !== null) {
          if (isQuestionObject(item)) {
            collected.push(item);
          } else {
            collected.push(...extractQuestionsArray(item));
          }
        }
      }
    } else if (typeof val === 'object' && val !== null) {
      collected.push(...extractQuestionsArray(val));
    }
  }

  return collected;
}

/**
 * Normalizes question attributes across language variants, boolean answers,
 * option indexes, and sets proper defaults.
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
    rawQ.questionText ??
    rawQ.pregunta ??
    rawQ.question ??
    rawQ.enunciado ??
    rawQ.texto ??
    rawQ.prompt ??
    rawQ.statement ??
    rawQ.afirmacion ??
    rawQ.oracion ??
    rawQ.query ??
    rawQ.title ??
    rawQ.titulo ??
    ''
  ).trim();

  if (!questionText) {
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
    rawType === 'boolean' ||
    typeof rawQ.es_correcta === 'boolean' ||
    typeof rawQ.esVerdadera === 'boolean' ||
    typeof rawQ.is_correct === 'boolean'
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

  // Answer resolution across all Spanish and English schemas
  const rawAnswer =
    rawQ.correctAnswer ??
    rawQ.respuestaCorrecta ??
    rawQ.respuesta_correcta ??
    rawQ.correcta ??
    rawQ.correct ??
    rawQ.respuesta ??
    rawQ.answer ??
    rawQ.correct_answer ??
    rawQ.solucion ??
    rawQ.opcionCorrecta ??
    rawQ.opcion_correcta ??
    rawQ.clave ??
    rawQ.resultado ??
    rawQ.valor ??
    rawQ.esVerdadera ??
    rawQ.es_verdadera ??
    rawQ.esCorrecta ??
    rawQ.es_correcta ??
    '';

  let correctAnswer = '';

  if (typeof rawAnswer === 'boolean') {
    correctAnswer = rawAnswer ? 'Verdadero' : 'Falso';
    type = 'true_false';
  } else if (typeof rawAnswer === 'number') {
    if (Array.isArray(rawOptions) && rawAnswer >= 0 && rawAnswer < rawOptions.length) {
      correctAnswer = String(rawOptions[rawAnswer]).trim();
    } else {
      correctAnswer = String(rawAnswer);
    }
  } else {
    correctAnswer = String(rawAnswer).trim();
  }

  // If answer is "A", "B", "C", "D" and options has 4 items
  if (Array.isArray(rawOptions) && rawOptions.length > 0 && /^[A-D]$/i.test(correctAnswer)) {
    const letterIdx = correctAnswer.toUpperCase().charCodeAt(0) - 65;
    if (letterIdx >= 0 && letterIdx < rawOptions.length) {
      correctAnswer = String(rawOptions[letterIdx]).trim();
    }
  }

  // Options normalization
  let options: string[] | undefined = undefined;
  if (type === 'true_false') {
    options = ['Verdadero', 'Falso'];
    if (!correctAnswer || !['verdadero', 'falso'].includes(correctAnswer.toLowerCase())) {
      correctAnswer = 'Verdadero';
    } else {
      correctAnswer = correctAnswer.toLowerCase() === 'falso' ? 'Falso' : 'Verdadero';
    }
  } else if (type === 'multiple_choice') {
    if (Array.isArray(rawOptions) && rawOptions.length > 0) {
      options = rawOptions.map((o: any) => String(o).trim()).filter(Boolean);
    }
    if (options && options.length > 0) {
      if (!correctAnswer) {
        correctAnswer = options[0];
      } else {
        const match = options.find((o) => o.toLowerCase() === correctAnswer.toLowerCase());
        if (!match) {
          options.push(correctAnswer);
        }
      }
    } else {
      type = questionText.includes('____') ? 'fill_blank' : 'open_ended';
      options = undefined;
    }
  }

  if (!correctAnswer && type === 'open_ended') {
    correctAnswer = paragraph.length > 100 ? paragraph.substring(0, 100) + '...' : paragraph;
  }

  if (!correctAnswer) {
    return null;
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

/**
 * Sintetizador determinista de preguntas de repuesto.
 *
 * NO se usa en el flujo normal: fabricar preguntas de relleno falsearía la racha
 * de maestría del usuario y ocultaría errores reales de la API. Se conserva
 * exportado por si en el futuro se ofrece como opción explícita al usuario.
 */
export function synthesizeFallbackQuestions(
  paragraph: string,
  paragraphIndex: number
): Question[] {
  const clean = paragraph.trim();
  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)/g) || [clean];
  const firstSentence = sentences[0] ? sentences[0].trim() : clean;
  const questions: Question[] = [];

  // 1. True / False factual validation question
  questions.push({
    id: `p${paragraphIndex}_fb_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    paragraphIndex,
    paragraphSnippet: clean.length > 120 ? clean.substring(0, 117) + '...' : clean,
    type: 'true_false',
    questionText: `De acuerdo con el texto: "${firstSentence.replace(/\.$/, '')}". ¿Es esta afirmación verdadera o falsa?`,
    options: ['Verdadero', 'Falso'],
    correctAnswer: 'Verdadero',
    rubric: '',
    explanation: 'Afirmación extraída textualmente del capítulo de estudio.',
  });

  // 2. Open-ended comprehension question
  questions.push({
    id: `p${paragraphIndex}_fb_oe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    paragraphIndex,
    paragraphSnippet: clean.length > 120 ? clean.substring(0, 117) + '...' : clean,
    type: 'open_ended',
    questionText: `Explica en tus propias palabras la idea principal del párrafo: "${clean.length > 140 ? clean.substring(0, 137) + '...' : clean}"`,
    correctAnswer: clean,
    rubric: clean.substring(0, 100),
    explanation: 'Comprensión global del concepto expuesto en el párrafo.',
  });

  return questions;
}

// Discovers and caches candidate models per API key
async function getCandidateModels(apiKey: string): Promise<string[]> {
  const cached = cachedModelsPerKey.get(apiKey);
  if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
    return cached.models;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        headers: { 'x-goog-api-key': apiKey },
      }
    );

    if (res.ok) {
      const data: any = await res.json();
      const discovered: string[] = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name);

      const ordered = buildCandidateModelList(discovered);
      if (ordered.length > 0) {
        cachedModelsPerKey.set(apiKey, { models: ordered, timestamp: Date.now() });
        return ordered;
      }
    }
  } catch {
    // Ignore and fallback to the stable alias list
  }

  const fallback = buildCandidateModelList(PREFERRED_MODELS);
  cachedModelsPerKey.set(apiKey, { models: fallback, timestamp: Date.now() });
  return fallback;
}

/** Opciones de `callGemini`. */
export interface CallGeminiOptions {
  /**
   * Valida el texto devuelto por el modelo. Si devuelve `false`, ese modelo se
   * descarta (no se memoriza) y se prueba el siguiente de la cadena.
   * Por defecto exige que la respuesta contenga JSON parseable.
   */
  accept?: (text: string) => boolean;
}

// Low-level caller for Gemini with automatic fallback, model caching, and retry on 429
export async function callGemini(
  prompt: string,
  apiKey: string,
  systemInstruction?: string,
  options: CallGeminiOptions = {}
): Promise<string> {
  const accept = options.accept || isUsableJsonResponse;
  const candidateModels = await getCandidateModels(apiKey);

  const modelsToTry = cachedWorkingModel && candidateModels.includes(cachedWorkingModel)
    ? [cachedWorkingModel, ...candidateModels.filter((m) => m !== cachedWorkingModel)]
    : candidateModels;

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    // `inlineInstruction` reintenta el mismo modelo incrustando la instrucción de
    // sistema en el prompt: algunos modelos no admiten `systemInstruction`.
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

        // If rate limited (429), pause and retry once
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

        // Un 200 no basta: el contenido debe ser utilizable para la tarea pedida.
        // Si no lo es, el modelo NO se memoriza y se prueba el siguiente.
        if (!accept(text)) {
          throw new Error(
            `El modelo ${model} respondió con texto no utilizable (se esperaba JSON).`
          );
        }

        cachedWorkingModel = model;
        return text;
      } catch (err: any) {
        lastError = err;
        // Fallo a nivel de modelo: no insistir con el mismo, pasar al siguiente.
        break;
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

  let rawJson = '';
  try {
    // El modelo solo se acepta si de su respuesta se pueden extraer preguntas reales.
    // Si devuelve prosa (p. ej. gemma-4) se descarta y se prueba el siguiente modelo.
    rawJson = await callGemini(userPrompt, apiKey, systemInstruction, {
      accept: (text) =>
        extractAllJsonEntities(text).some(
          (entity) => extractQuestionsArray(entity).length > 0
        ),
    });
  } catch (apiErr: any) {
    // Se propaga el motivo real: nunca se inventan preguntas de relleno que
    // falsearían la racha de maestría del usuario.
    throw new Error(
      `Párrafo #${paragraphIndex + 1}: ${apiErr?.message || 'no se pudo obtener respuesta de Gemini.'}`
    );
  }

  const entities = extractAllJsonEntities(rawJson);
  const rawQuestions: any[] = [];

  if (entities.length > 0) {
    for (const entity of entities) {
      const questionsFromEntity = extractQuestionsArray(entity);
      rawQuestions.push(...questionsFromEntity);
    }
  } else {
    const cleaned = extractJsonSubstring(rawJson);
    rawQuestions.push(...extractQuestionsArray(JSON.parse(cleaned)));
  }

  const questions: Question[] = [];
  for (let i = 0; i < rawQuestions.length; i++) {
    const normalized = normalizeQuestion(rawQuestions[i], paragraph, paragraphIndex, i);
    if (normalized) {
      questions.push(normalized);
    }
  }

  if (questions.length === 0) {
    throw new Error(
      `Párrafo #${paragraphIndex + 1}: Gemini respondió pero ninguna pregunta pudo normalizarse.`
    );
  }

  return questions;
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

  const rawJson = await callGemini(prompt, apiKey, systemInstruction, {
    accept: (text) =>
      extractAllJsonEntities(text).some(
        (e) =>
          e !== null &&
          typeof e === 'object' &&
          !Array.isArray(e) &&
          ('isCorrect' in e || 'feedback' in e || 'correcto' in e || 'acierto' in e)
      ),
  });

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
  const pingModels = PREFERRED_MODELS.slice(0, 3);
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
