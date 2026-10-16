# MasteryQuiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir y desplegar una aplicación web completa lista para Render conectada a GitHub, que convierte capítulos de libros en bancos de preguntas exhaustivos por párrafo con interfaz NotebookLM/Quizizz y un bucle de maestría infinito (5 rondas consecutivas al 100% de racha estricta).

**Architecture:** Monorepo con backend Express (TypeScript) sirviendo la API de procesamiento documental, extracción de preguntas con Gemini y evaluación semántica, junto con la SPA de frontend React (Vite + Tailwind CSS + Framer Motion) compilada como estáticos para Render.

**Tech Stack:** Node.js 20+, Express, TypeScript, `@google/genai` / REST Gemini, `pdf-parse`, `mammoth`, `multer`, React 18, Vite, Tailwind CSS, Lucide React, Canvas Confetti.

**Spec:** `docs/superpowers/specs/2026-10-16-mastery-quiz-app-design.md`

## Global Constraints
- Node 20+ compatible, sin dependencias nativas pesadas para garantizar ejecución en los 512MB de Render.
- No depender de variables de entorno obligatorias en el servidor para Gemini: soportar cabecera `x-gemini-key` ingresada por el usuario desde la UI.
- Feedback visual instantáneo estilo Quizizz: respuesta correcta en verde, respuesta incorrecta en rojo con revelado simultáneo de la correcta.
- Racha estricta: exactamente 5 rondas consecutivas con 100% de aciertos para terminar el examen. Si hay un solo error en cualquier ronda, la racha vuelve a 0.

## Review Focus
1. Manejo de PDFs escaneados o con formatos complejos (fallback a extracción limpia con mensaje informativo).
2. Manejo de cuota o clave API inválida de Gemini (mostrar error amigable con botón directo a configuración).
3. Párrafos largos divididos adecuadamente sin truncar oraciones a la mitad.
4. Persistencia local para que las pruebas no se borren cuando el navegador se recargue.
5. Evaluación de preguntas abiertas tolerante a variaciones lingüísticas y sinopsis breves.

---

### Task 1: Scaffolding del Proyecto y Configuración Monorepo
**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `render.yaml`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Crear estructura de carpetas** (`src/server`, `src/client`, `public`)
- [ ] **Step 2: Configurar dependencias backend y frontend en package.json**
- [ ] **Step 3: Configurar TypeScript y build scripts unificados para Render**
- [ ] **Step 4: Verificar compilación base**

---

### Task 2: Servicio de Ingestión de Documentos y Segmentación de Párrafos
**Files:**
- Create: `src/server/services/documentParser.ts`
- Create: `src/server/tests/documentParser.test.ts`
- Modify: `src/server/index.ts`

- [ ] **Step 1: Escribir prueba unitaria para segmentación de texto y parseo de párrafos**
- [ ] **Step 2: Implementar extractor de PDF (`pdf-parse`), DOCX (`mammoth`) y texto plano**
- [ ] **Step 3: Implementar limpiador y chunker de párrafos significativos**
- [ ] **Step 4: Ejecutar pruebas y verificar paso**

---

### Task 3: Motor Gemini de Generación Exhaustiva y Calificación Semántica
**Files:**
- Create: `src/server/services/geminiService.ts`
- Create: `src/server/routes/api.ts`

- [ ] **Step 1: Diseñar prompt de desglose exhaustivo por párrafo con JSON Schema estructurado**
- [ ] **Step 2: Implementar generador de preguntas que itera párrafo por párrafo**
- [ ] **Step 3: Implementar evaluador semántico con IA para preguntas abiertas**
- [ ] **Step 4: Probar endpoints con simulación y respuestas estructuradas**

---

### Task 4: Almacenamiento y Persistencia de Pruebas
**Files:**
- Create: `src/server/services/storageService.ts`

- [ ] **Step 1: Implementar almacén JSON / SQLite local para quizzes creados**
- [ ] **Step 2: Crear endpoints CRUD (`GET /api/quizzes`, `POST /api/quizzes`, `DELETE /api/quizzes/:id`)**
- [ ] **Step 3: Verificar persistencia de pruebas y progreso**

---

### Task 5: Dashboard NotebookLM y Modal de Clave API
**Files:**
- Create: `src/client/components/Navbar.tsx`
- Create: `src/client/components/ApiKeyModal.tsx`
- Create: `src/client/components/Dashboard.tsx`
- Create: `src/client/components/QuizCard.tsx`

- [ ] **Step 1: Maquetar encabezado con título "Pruebas" y botón de API Key**
- [ ] **Step 2: Crear botón central heroico "+ Crear nueva prueba"**
- [ ] **Step 3: Diseñar tarjetas de pruebas estilo NotebookLM (título, preguntas, mejor racha, fecha)**
- [ ] **Step 4: Conectar almacenamiento de API Key en localStorage**

---

### Task 6: Modal de Creación (Subir Documento o Pegar Texto)
**Files:**
- Create: `src/client/components/CreateQuizModal.tsx`

- [ ] **Step 1: Crear pestañas "Subir documento" (PDF, DOCX, TXT) y "Pegar texto"**
- [ ] **Step 2: Añadir vista previa de conteo de párrafos detectados**
- [ ] **Step 3: Crear botón "Generar" con barra de progreso animada por párrafo**
- [ ] **Step 4: Integrar con backend y redirigir al reproductor al terminar**

---

### Task 7: Reproductor Interactivo Estilo Quizizz
**Files:**
- Create: `src/client/components/QuizPlayer.tsx`
- Create: `src/client/components/MultipleChoiceQuestion.tsx`
- Create: `src/client/components/OpenEndedQuestion.tsx`

- [ ] **Step 1: Diseñar interfaz de juego con colores vibrantes, formas y tipografía Quizizz**
- [ ] **Step 2: Implementar lógica de selección de opciones: verde para acierto, rojo para error + verde simultáneo para la opción correcta**
- [ ] **Step 3: Implementar caja de respuesta abierta con botón de envío y evaluación semántica IA**
- [ ] **Step 4: Mostrar retroalimentación/justificación pedagógica si la respuesta abierta es incorrecta**

---

### Task 8: Motor del Bucle de Maestría Infinita (Racha Estricta 5/5)
**Files:**
- Modify: `src/client/components/QuizPlayer.tsx`
- Create: `src/client/components/VictoryModal.tsx`

- [ ] **Step 1: Implementar contador de Racha Estricta (`🔥 0/5 Rondas Perfectas`)**
- [ ] **Step 2: Programar reinicio automático a la pregunta 1 sin confirmación al completar el banco**
- [ ] **Step 3: Programar reinicio de racha a 0 ante cualquier error en la ronda actual**
- [ ] **Step 4: Diseñar pantalla de Victoria con confeti y certificado de dominio al alcanzar 5/5**

---

### Task 9: Preparación para Render y Creación de Repositorio GitHub
**Files:**
- Create: `render.yaml`
- Modify: `README.md`

- [ ] **Step 1: Configurar build unificado (`vite build` + `tsc`) y script start**
- [ ] **Step 2: Inicializar repositorio Git local con commit inicial ordenado**
- [ ] **Step 3: Crear repositorio en GitHub (`Richicasa/mastery-quiz-app`) usando `gh repo create` y hacer push**
- [ ] **Step 4: Probar arranque local y verificar funcionamiento completo**
