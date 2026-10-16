# MasteryQuiz (InfiQuiz) ⚡🧠

> **Plataforma de estudio acelerado por interrogación exhaustiva y bucle de maestría infinito.**  
> Diseñada para dominar capítulos completos de libros párrafo por párrafo con interfaz interactiva estilo **Quizizz / NotebookLM**, retroalimentación instantánea y evaluación semántica con Inteligencia Artificial.

---

## 🎯 Metodología de Estudio

1. **Desglose Exhaustivo por Párrafo:** El capítulo se analiza párrafo por párrafo para extraer **la totalidad absoluta de preguntas posibles**. Ningún dato, causa, consecuencia, definición o matiz queda sin interrogar.
2. **Diversidad de Tipologías:**
   - 🔘 **Opción Múltiple:** 4 alternativas contextuales (1 correcta, 3 distractores plausibles).
   - ⚖️ **Verdadero / Falso:** Evaluando precisión de conceptos.
   - ✏️ **Completar:** Término o palabra clave faltante en una oración.
   - 💡 **Pregunta Abierta / Justificación:** Respuestas en lenguaje natural evaluadas por IA con comprensión semántica.
3. **Bucle de Maestría Infinita (Racha Estricta 5/5):**
   - Una vez finalizada la última pregunta del banco, la prueba se reinicia automáticamente en bucle sin preguntar al usuario.
   - La prueba **solo se da por terminada** cuando el estudiante alcanza **5 rondas consecutivas con 100% de aciertos**. Si se comete un solo error en cualquier ronda, la racha vuelve a 0/5.

---

## 🎮 Dinámica de Feedback Visual (Estilo Quizizz)

- **Opciones Múltiples y Verdadero/Falso:**
  - Si aciertas: La opción seleccionada se ilumina en **verde vibrante**.
  - Si fallas: La opción seleccionada se ilumina en **rojo vibrante** y **simultáneamente en el mismo panel la opción correcta se ilumina en verde**.
- **Preguntas Abiertas:**
  - Evaluadas con inteligencia semántica tolerante a variaciones en redacción o respuestas sintéticas.
  - Si es incorrecta: El contenedor se tiñe de rojo y la IA te brinda una **justificación/pista pedagógica explicando el error sin darte la respuesta de inmediato**, para forzar la fijación del conocimiento.

---

## 🚀 Despliegue en Render

La aplicación está lista para desplegarse en Render en el plan gratuito (utiliza menos de 70 MB de RAM y compila estáticos):

### Opción A: Despliegue Automático con `render.yaml`
1. Sube este repositorio a tu cuenta de GitHub (`Richicasa`).
2. En tu dashboard de [Render](https://dashboard.render.com), haz clic en **New +** > **Blueprint**.
3. Selecciona tu repositorio. Render detectará automáticamente `render.yaml` y configurará el servicio web.

### Opción B: Despliegue Manual como Web Service
- **Runtime:** Node
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Variables de entorno opcionales:**
  - `PORT`: `10000` (o el asignado por Render)
  - `GEMINI_API_KEY`: *(Opcional, ya que cada usuario puede ingresar su propia clave directamente en la interfaz).*

---

## 💻 Ejecución Local

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar y ejecutar en modo producción
npm run build
npm start

# O ejecutar en modo desarrollo caliente
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

---

## 🔑 Configuración de API Key (Google Gemini)

Los usuarios pueden hacer clic en el botón **"Configurar API Key"** en la esquina superior derecha e ingresar su clave de Gemini obtenida gratuitamente en [Google AI Studio](https://aistudio.google.com/app/apikey).
- La clave se almacena en el `localStorage` de su navegador y viaja de manera segura al backend en la cabecera `x-gemini-key`.
- Cero costo de servidor para el anfitrión.
