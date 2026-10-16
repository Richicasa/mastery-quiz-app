import { Question, EvaluationResult } from '../../shared/types.js';

interface GeminiContent {
  parts: Array<{ text: string }>;
}

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

// Dynamically discovers the best model available for the user's API key
async function getCandidateModels(apiKey: string): Promise<string[]> {
  const fallbackList = [
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (res.ok) {
      const data: any = await res.json();
      const models: any[] = data.models || [];
      const generateModels = models
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace(/^models\//, ''));

      if (generateModels.length > 0) {
        // Sort according to our preference
        const sorted = fallbackList.filter((m) => generateModels.includes(m));
        for (const m of generateModels) {
          if (!sorted.includes(m)) {
            sorted.push(m);
          }
        }
        return sorted;
      }
    }
  } catch {
    // ignore and use fallback
  }

  return fallbackList;
}

async function callGemini(
  prompt: string,
  apiKey: string,
  systemInstruction?: string
): Promise<string> {
  const candidateModels = await getCandidateModels(apiKey);
  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload: any = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = (await res.json()) as GeminiResponse;
        const msg = errorData.error?.message || `HTTP ${res.status} ${res.statusText}`;
        throw new Error(`Error de Gemini API (${model}): ${msg}`);
      }

      const data = (await res.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error(`Respuesta vacía de Gemini (${model})`);
      }
      return text;
    } catch (err: any) {
      lastError = err;
      // If it fails on this model, continue to next candidate
      continue;
    }
  }

  throw lastError || new Error('No se pudo comunicar con ningún modelo disponible de la API de Gemini.');
}

export async function generateQuestionsForParagraph(
  paragraph: string,
  paragraphIndex: number,
  apiKey: string
): Promise<Question[]> {
  const systemInstruction = `Eres un examinador académico implacable y meticuloso. Tu objetivo es aplicar el método de estudio de interrogación exhaustiva: dado un párrafo, debes extraer y formular ABSOLUTAMENTE TODAS las preguntas posibles que se puedan hacer a partir de su contenido. No dejes escapar ningún detalle, definición, causa, consecuencia, relación o término.

Genera una variedad amplia de tipologías de preguntas:
1. "multiple_choice": 4 opciones (1 correcta, 3 distractores plausibles tomados del mismo contexto).
2. "true_false": Afirmación con opciones ["Verdadero", "Falso"].
3. "fill_blank": Una oración con espacio "____" y la palabra clave faltante exacta en correctAnswer.
4. "open_ended": Pregunta reflexiva o explicativa; debes incluir en "rubric" los conceptos clave indispensables que debe contener la respuesta para ser considerada válida.

Cada elemento devuelto en el array JSON debe cumplir esta estructura exacta:
{
  "type": "multiple_choice" | "true_false" | "fill_blank" | "open_ended",
  "questionText": "Pregunta clara y directa",
  "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"], // Solo si type es multiple_choice o true_false
  "correctAnswer": "Texto de la respuesta correcta o exacta",
  "rubric": "Conceptos clave requeridos (solo para open_ended)",
  "explanation": "Breve justificación del porqué es correcto según el párrafo"
}`;

  const userPrompt = `Párrafo a interrogar de manera exhaustiva (Párrafo #${paragraphIndex + 1}):
"""
${paragraph}
"""

Extrae todas las preguntas posibles de este párrafo en un array JSON.`;

  const rawJson = await callGemini(userPrompt, apiKey, systemInstruction);

  try {
    const parsed = JSON.parse(rawJson);
    const questionsArray = Array.isArray(parsed) ? parsed : (parsed.questions || []);

    const result: Question[] = questionsArray.map((q: any, i: number) => ({
      id: `p${paragraphIndex}_q${i}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      paragraphIndex,
      paragraphSnippet: paragraph.length > 120 ? paragraph.substring(0, 117) + '...' : paragraph,
      type: q.type || 'multiple_choice',
      questionText: q.questionText || '',
      options: q.options || (q.type === 'true_false' ? ['Verdadero', 'Falso'] : undefined),
      correctAnswer: q.correctAnswer || '',
      rubric: q.rubric || '',
      explanation: q.explanation || '',
    }));

    return result;
  } catch (err: any) {
    console.error('Error parseando JSON de Gemini:', rawJson);
    throw new Error('La respuesta de Gemini no tuvo el formato JSON esperado.');
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
    const parsed = JSON.parse(rawJson);
    return {
      isCorrect: Boolean(parsed.isCorrect),
      feedback: parsed.feedback || (parsed.isCorrect ? '¡Excelente respuesta!' : 'Respuesta incompleta o inexacta.'),
    };
  } catch (err) {
    // Fallback if parsing fails
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

  try {
    // Direct official call to ModelService.ListModels
    // This immediately tests credentials and permissions without guessing a model name
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
    const res = await fetch(url);

    if (res.ok) {
      const data: any = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        return { valid: true };
      }
      return { valid: true };
    }

    const errData: any = await res.json().catch(() => ({}));
    const message =
      errData?.error?.message ||
      `Error HTTP ${res.status}: Clave API inválida o sin permisos en Google Gemini.`;
    return { valid: false, error: message };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message || 'Error de conexión intentando contactar a Google Gemini.',
    };
  }
}
