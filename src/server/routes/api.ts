import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseDocumentBuffer, cleanAndSegmentParagraphs } from '../services/documentParser.js';
import {
  generateQuestionsForParagraph,
  evaluateOpenAnswer,
  validateGeminiApiKey,
} from '../services/geminiService.js';
import {
  getAllQuizzes,
  getQuizById,
  saveQuiz,
  deleteQuiz,
  updateQuizStats,
  getAllUsers,
  findUserByUsername,
  saveUser,
} from '../services/storageService.js';
import { Question, Quiz, UserProfile } from '../../shared/types.js';

export const apiRouter = Router();

// In-memory upload storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

// Helper to get API key
function getGeminiApiKey(req: Request): string {
  const headerKey = req.headers['x-gemini-key'] as string | undefined;
  const envKey = process.env.GEMINI_API_KEY;
  const key = headerKey?.trim() || envKey?.trim();
  if (!key) {
    throw new Error(
      'Falta la clave API de Gemini. Por favor configúrala en tu perfil.'
    );
  }
  return key;
}

// 0. Validar clave de API de Gemini en tiempo real
apiRouter.post('/validate-key', async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = req.body.apiKey || req.headers['x-gemini-key'];
    if (!apiKey) {
      res.status(400).json({ valid: false, error: 'No se proporcionó ninguna clave API.' });
      return;
    }
    const result = await validateGeminiApiKey(String(apiKey));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message || 'Error al validar la clave API.' });
  }
});

// 1. Extraer texto y segmentar párrafos
apiRouter.post(
  '/extract-text',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      let rawText = '';
      let detectedTitle = 'Nueva Prueba';

      if (req.file) {
        detectedTitle = req.file.originalname.replace(/\.[^/.]+$/, '');
        rawText = await parseDocumentBuffer(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname
        );
      } else if (req.body.text) {
        rawText = String(req.body.text);
        if (req.body.title) {
          detectedTitle = String(req.body.title);
        }
      } else {
        res.status(400).json({ error: 'Debes proporcionar un archivo o texto para procesar.' });
        return;
      }

      const paragraphs = cleanAndSegmentParagraphs(rawText);

      res.json({
        paragraphs,
        totalParagraphs: paragraphs.length,
        detectedTitle,
      });
    } catch (err: any) {
      console.error('Error extrayendo texto:', err);
      res.status(500).json({ error: err.message || 'Error al procesar el documento' });
    }
  }
);

// 2. Generar banco exhaustivo de preguntas
apiRouter.post('/generate-questions', async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = getGeminiApiKey(req);
    const { paragraphs, title, sourceType, sourceName } = req.body;

    if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
      res.status(400).json({ error: 'La lista de párrafos no puede estar vacía.' });
      return;
    }

    const allQuestions: Question[] = [];
    const errorReasons: string[] = [];

    // Process paragraphs with concurrency control (batch of 2 with spacing to protect Free Tier quota)
    const BATCH_SIZE = 2;
    for (let i = 0; i < paragraphs.length; i += BATCH_SIZE) {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 350));
      }

      const slice = paragraphs.slice(i, i + BATCH_SIZE);
      const batchPromises = slice.map((paragraph, indexOffset) => {
        const paragraphIndex = i + indexOffset;
        return generateQuestionsForParagraph(paragraph, paragraphIndex, apiKey);
      });

      const batchResults = await Promise.allSettled(batchPromises);
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allQuestions.push(...result.value);
        } else {
          const reasonMsg = result.reason?.message || String(result.reason);
          errorReasons.push(reasonMsg);
          console.warn('Advertencia en generación de párrafo:', result.reason);
        }
      }
    }

    if (allQuestions.length === 0) {
      const primaryError = errorReasons.length > 0
        ? errorReasons[0]
        : 'No se pudieron extraer preguntas válidas del texto provisto.';
      res.status(422).json({
        error: primaryError,
        details: errorReasons,
      });
      return;
    }

    const userId = req.body.userId || (req.headers['x-user-id'] as string) || undefined;
    const authorName = req.body.authorName || (req.headers['x-author-name'] as string) || undefined;

    const newQuiz: Quiz = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      authorName,
      title: title || 'Prueba sin título',
      createdAt: new Date().toISOString(),
      sourceType: sourceType || 'text',
      sourceName: sourceName || 'Texto ingresado',
      totalParagraphs: paragraphs.length,
      questions: allQuestions,
      stats: {
        bestStreak: 0,
        completedRounds: 0,
        timesMastered: 0,
      },
    };

    const saved = await saveQuiz(newQuiz);
    res.json(saved);
  } catch (err: any) {
    console.error('Error generando preguntas:', err);
    res.status(500).json({ error: err.message || 'Error generando preguntas con IA' });
  }
});

// 3. Evaluar respuesta a pregunta abierta
apiRouter.post('/evaluate-open-answer', async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = getGeminiApiKey(req);
    const { questionText, rubric, userAnswer } = req.body;

    if (!questionText || !userAnswer) {
      res.status(400).json({ error: 'Faltan campos requeridos para evaluar.' });
      return;
    }

    const evaluation = await evaluateOpenAnswer(
      String(questionText),
      String(rubric || ''),
      String(userAnswer),
      apiKey
    );

    res.json(evaluation);
  } catch (err: any) {
    console.error('Error evaluando respuesta abierta:', err);
    res.status(500).json({ error: err.message || 'Error evaluando respuesta con IA' });
  }
});

// 4. Listar todas las pruebas (filtradas por usuario si se provee x-user-id)
apiRouter.get('/quizzes', async (req: Request, res: Response): Promise<void> => {
  try {
    const quizzes = await getAllQuizzes();
    const userId = (req.headers['x-user-id'] as string)?.trim();
    if (userId) {
      // Filtrar por ID de usuario
      const userQuizzes = quizzes.filter(
        (q) => !q.userId || q.userId === userId
      );
      res.json(userQuizzes);
      return;
    }
    res.json(quizzes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Obtener una prueba por ID
apiRouter.get('/quizzes/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const quiz = await getQuizById(id);
    if (!quiz) {
      res.status(404).json({ error: 'Prueba no encontrada' });
      return;
    }
    res.json(quiz);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Eliminar una prueba
apiRouter.delete('/quizzes/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const deleted = await deleteQuiz(id);
    if (!deleted) {
      res.status(404).json({ error: 'Prueba no encontrada' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Actualizar estadísticas de maestría
apiRouter.put('/quizzes/:id/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const updated = await updateQuizStats(id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Prueba no encontrada' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Sincronizar o registrar perfil de usuario en el servidor
apiRouter.post('/users/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, username, apiKey, password } = req.body;
    if (!username || !username.trim()) {
      res.status(400).json({ error: 'El nombre o apodo es requerido.' });
      return;
    }

    const cleanUsername = username.trim();
    const existing = await findUserByUsername(cleanUsername);

    const userProfile: UserProfile = {
      id: id || existing?.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUsername,
      apiKey: apiKey || existing?.apiKey || '',
      password: password !== undefined ? password : existing?.password,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    const saved = await saveUser(userProfile);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Buscar perfil de usuario por apodo
apiRouter.get('/users/find/:username', async (req: Request, res: Response): Promise<void> => {
  try {
    const username = String(req.params.username);
    const found = await findUserByUsername(username);
    if (!found) {
      res.status(404).json({ found: false });
      return;
    }
    res.json({ found: true, user: found });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Listar usuarios registrados
apiRouter.get('/users', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await getAllUsers();
    // Return sanitized profiles
    const sanitized = users.map((u) => ({
      id: u.id,
      username: u.username,
      hasKey: Boolean(u.apiKey),
      createdAt: u.createdAt,
    }));
    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
