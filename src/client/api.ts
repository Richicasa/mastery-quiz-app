import {
  Quiz,
  ExtractionResult,
  EvaluationResult,
  QuizStats,
  UserProfile,
} from '../shared/types.js';

const API_BASE = '/api';
const USERS_STORAGE_KEY = 'mastery_registered_users';
const SESSION_STORAGE_KEY = 'mastery_active_session';

export function getRegisteredUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function findRegisteredUser(username: string): UserProfile | null {
  const users = getRegisteredUsers();
  const clean = username.trim().toLowerCase();
  return users.find((u) => u.username.trim().toLowerCase() === clean) || null;
}

export function saveRegisteredUser(profile: UserProfile): void {
  const users = getRegisteredUsers();
  const clean = profile.username.trim().toLowerCase();
  const index = users.findIndex((u) => u.username.trim().toLowerCase() === clean);
  if (index >= 0) {
    users[index] = profile;
  } else {
    users.unshift(profile);
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function getActiveSession(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function setActiveSession(profile: UserProfile | null): void {
  if (profile) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
  } else {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

// Backward compatibility alias
export function getUserProfile(): UserProfile | null {
  return getActiveSession();
}

export function setUserProfile(profile: UserProfile): void {
  saveRegisteredUser(profile);
  setActiveSession(profile);
}

export function clearUserProfile(): void {
  setActiveSession(null);
}

export function getStoredApiKey(): string {
  const profile = getActiveSession();
  return profile?.apiKey || '';
}

export async function validateApiKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/validate-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  return res.json();
}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  const profile = getUserProfile();
  if (profile?.apiKey) {
    headers['x-gemini-key'] = profile.apiKey;
  }
  if (profile?.id) {
    headers['x-user-id'] = profile.id;
  }
  if (profile?.username) {
    headers['x-author-name'] = encodeURIComponent(profile.username);
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
  const profile = getUserProfile();
  const res = await fetch(`${API_BASE}/generate-questions`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      paragraphs,
      title,
      sourceType,
      sourceName,
      userId: profile?.id,
      authorName: profile?.username,
    }),
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
  const res = await fetch(`${API_BASE}/quizzes`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al cargar las pruebas');
  return res.json();
}

export async function fetchQuizById(id: string): Promise<Quiz> {
  const res = await fetch(`${API_BASE}/quizzes/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Prueba no encontrada');
  return res.json();
}

export async function deleteQuizById(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/quizzes/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al eliminar la prueba');
}

export async function updateQuizStats(
  id: string,
  stats: Partial<QuizStats>
): Promise<Quiz> {
  const res = await fetch(`${API_BASE}/quizzes/${id}/stats`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(stats),
  });
  if (!res.ok) throw new Error('Error al actualizar estadísticas');
  return res.json();
}
