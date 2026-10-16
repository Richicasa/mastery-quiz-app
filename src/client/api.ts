import { Quiz, ExtractionResult, EvaluationResult, QuizStats } from '../shared/types.js';

const API_BASE = '/api';
const STORAGE_KEY = 'mastery_gemini_api_key';

export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setStoredApiKey(key: string): void {
  if (key) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  const key = getStoredApiKey();
  if (key) {
    headers['x-gemini-key'] = key;
  }
  return headers;
}

export async function extractText(
  file?: File,
  text?: string,
  title?: string
): Promise<ExtractionResult> {
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    const res = await fetch(`${API_BASE}/extract-text`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al procesar el archivo');
    }
    return res.json();
  }

  const res = await fetch(`${API_BASE}/extract-text`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text, title }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error al procesar el texto');
  }
  return res.json();
}

export async function generateQuiz(
  paragraphs: string[],
  title: string,
  sourceType: 'document' | 'text',
  sourceName: string
): Promise<Quiz> {
  const res = await fetch(`${API_BASE}/generate-questions`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ paragraphs, title, sourceType, sourceName }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error generando las preguntas con IA');
  }
  return res.json();
}

export async function evaluateOpenQuestion(
  questionText: string,
  rubric: string,
  userAnswer: string
): Promise<EvaluationResult> {
  const res = await fetch(`${API_BASE}/evaluate-open-answer`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ questionText, rubric, userAnswer }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error evaluando la respuesta');
  }
  return res.json();
}

export async function fetchAllQuizzes(): Promise<Quiz[]> {
  const res = await fetch(`${API_BASE}/quizzes`);
  if (!res.ok) throw new Error('Error al cargar las pruebas');
  return res.json();
}

export async function fetchQuizById(id: string): Promise<Quiz> {
  const res = await fetch(`${API_BASE}/quizzes/${id}`);
  if (!res.ok) throw new Error('Prueba no encontrada');
  return res.json();
}

export async function deleteQuizById(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/quizzes/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al eliminar la prueba');
}

export async function updateQuizStats(
  id: string,
  stats: Partial<QuizStats>
): Promise<Quiz> {
  const res = await fetch(`${API_BASE}/quizzes/${id}/stats`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stats),
  });
  if (!res.ok) throw new Error('Error al actualizar estadísticas');
  return res.json();
}
