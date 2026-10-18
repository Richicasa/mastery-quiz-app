import { describe, it, expect } from 'vitest';
import {
  extractJsonSubstring,
  extractAllJsonEntities,
  extractQuestionsArray,
  normalizeQuestion,
} from '../services/geminiService.js';

describe('Gemini JSON & Question Extraction Robustness', () => {
  it('extrae JSON limpio envuelto en bloques de código markdown', () => {
    const raw = `
    Aquí tienes las preguntas extraídas:
    \`\`\`json
    [
      {
        "type": "multiple_choice",
        "questionText": "¿Cuál es el músculo flexor principal del codo?",
        "options": ["Braquial", "Tríceps", "Deltoides", "Trapecio"],
        "correctAnswer": "Braquial",
        "explanation": "El músculo braquial es el principal flexor."
      }
    ]
    \`\`\`
    Espero que te sea de gran utilidad académica.
    `;

    const cleaned = extractJsonSubstring(raw);
    expect(cleaned).toContain('"questionText"');
    const parsed = JSON.parse(cleaned);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });

  it('elimina comas finales inválidas (trailing commas)', () => {
    const raw = `[{"type": "true_false", "questionText": "¿Es bíceps flexor?", "correctAnswer": "Verdadero",}]`;
    const cleaned = extractJsonSubstring(raw);
    const parsed = JSON.parse(cleaned);
    expect(parsed).toHaveLength(1);
  });

  it('extrae preguntas cuando Gemini responde con formato en español (preguntas, banco_preguntas, cuestionario)', () => {
    const spanishPayload = {
      preguntas: [
        {
          tipo: 'opcion_multiple',
          pregunta: '¿Cuál es la función del músculo coracobraquial?',
          opciones: ['Flexión y aducción', 'Extensión del codo', 'Pronación del pie', 'Abducción del fémur'],
          respuesta: 'Flexión y aducción',
          explicacion: 'Ayuda a flexionar y aducir el brazo a nivel del hombro.',
        },
        {
          tipo: 'verdadero_falso',
          pregunta: 'El tríceps braquial es el extensor principal del antebrazo.',
          respuestaCorrecta: 'Verdadero',
        },
      ],
    };

    const questionsList = extractQuestionsArray(spanishPayload);
    expect(questionsList).toHaveLength(2);

    const q1 = normalizeQuestion(
      questionsList[0],
      'El coracobraquial flexiona y aduce el brazo.',
      0,
      0
    );
    expect(q1).not.toBeNull();
    expect(q1?.type).toBe('multiple_choice');
    expect(q1?.questionText).toBe('¿Cuál es la función del músculo coracobraquial?');
    expect(q1?.correctAnswer).toBe('Flexión y aducción');
    expect(q1?.options).toContain('Flexión y aducción');

    const q2 = normalizeQuestion(
      questionsList[1],
      'El tríceps braquial es el extensor.',
      0,
      1
    );
    expect(q2).not.toBeNull();
    expect(q2?.type).toBe('true_false');
    expect(q2?.correctAnswer).toBe('Verdadero');
    expect(q2?.options).toEqual(['Verdadero', 'Falso']);
  });

  it('normaliza preguntas de completar (fill_blank) y abiertas (open_ended)', () => {
    const rawFillBlank = {
      tipo: 'completar',
      pregunta: 'El músculo braquial se origina en la mitad distal del ____ anterior del húmero.',
      respuesta: 'cuerpo',
    };

    const q = normalizeQuestion(rawFillBlank, 'Snippet de texto...', 0, 0);
    expect(q).not.toBeNull();
    expect(q?.type).toBe('fill_blank');
    expect(q?.correctAnswer).toBe('cuerpo');

    const rawOpen = {
      tipo: 'abierta',
      pregunta: 'Describe la inervación del compartimento anterior del brazo.',
      respuesta: 'Inervado por el nervio musculocutáneo.',
      rubrica: 'Debe mencionar el nervio musculocutáneo.',
    };

    const qOpen = normalizeQuestion(rawOpen, 'Snippet...', 0, 1);
    expect(qOpen).not.toBeNull();
    expect(qOpen?.type).toBe('open_ended');
    expect(qOpen?.rubric).toBe('Debe mencionar el nervio musculocutáneo.');
  });

  it('descarta objetos inválidos sin pregunta o sin respuesta', () => {
    const invalid = { tipo: 'multiple_choice' };
    const q = normalizeQuestion(invalid, 'Snippet...', 0, 0);
    expect(q).toBeNull();
  });

  it('extrae múltiples objetos JSON consecutivos sin corchetes de array (resuelve error de posición 239)', () => {
    // Simulates the exact payload that previously crashed JSON.parse with "Unexpected non-whitespace character after JSON at position 239"
    const consecutiveJson = `
    {
      "type": "multiple_choice",
      "questionText": "¿Cuál es la función principal del bíceps braquial?",
      "options": ["Flexión y supinación", "Extensión", "Abducción", "Pronación"],
      "correctAnswer": "Flexión y supinación"
    }
    {
      "type": "true_false",
      "questionText": "El tríceps braquial se ubica en el compartimiento posterior.",
      "correctAnswer": "Verdadero"
    }
    {
      "type": "open_ended",
      "questionText": "Explica la inserción del músculo braquial anterior.",
      "correctAnswer": "Se inserta en la tuberosidad del cúbito y la apófisis coronoides."
    }
    `;

    const entities = extractAllJsonEntities(consecutiveJson);
    expect(entities).toHaveLength(3);
    expect(entities[0].questionText).toContain('bíceps');
    expect(entities[1].questionText).toContain('tríceps');
    expect(entities[2].questionText).toContain('braquial');

    const allQuestions: any[] = [];
    for (const entity of entities) {
      allQuestions.push(...extractQuestionsArray(entity));
    }
    expect(allQuestions).toHaveLength(3);
  });

  it('extrae un array JSON aunque venga acompañado de texto o notas al pie', () => {
    const rawWithCommentary = `
    [
      {
        "type": "multiple_choice",
        "questionText": "¿Qué nervio inerva al braquial?",
        "options": ["Musculocutáneo", "Radial", "Axilar", "Mediano"],
        "correctAnswer": "Musculocutáneo"
      }
    ]
    Nota: Estas fueron todas las preguntas posibles generadas para el párrafo 1.
    `;

    const entities = extractAllJsonEntities(rawWithCommentary);
    expect(entities).toHaveLength(1);
    const questions = extractQuestionsArray(entities[0]);
    expect(questions).toHaveLength(1);
    expect(questions[0].correctAnswer).toBe('Musculocutáneo');
  });
});
