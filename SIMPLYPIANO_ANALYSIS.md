# Análisis de SimplyPiano vs ks-piano

> Evaluación de funcionalidades de SimplyPiano y propuestas de mejora para ks-piano.

## Funcionalidades de SimplyPiano

| Categoría | Funcionalidad | Descripción |
|-----------|---------------|-------------|
| **Aprendizaje** | Cursos estructurados | 27 cursos divididos en Soloist (clásico) y Chords (pop) |
| **Aprendizaje** | Video lecciones | Videos introductorios y demostraciones |
| **Aprendizaje** | Secciones de canciones | Canciones divididas en intro, verso, coro, etc. |
| **Aprendizaje** | 5-Minute Workouts | Sesiones cortas de práctica diaria |
| **Feedback** | Detección por micrófono | Escucha notas de piano acústico o digital |
| **Feedback** | Feedback instantáneo | Notas verdes/rojas en tiempo real |
| **Feedback** | Modo práctica forzado | No permite avanzar hasta tocar correctamente |
| **Feedback** | Backing tracks | Pistas de acompañamiento con banda/cantante |
| **Motivación** | Gamificación | Puntos, rachas, calificación de 3 estrellas |
| **Motivación** | Perfiles múltiples | Hasta 5 perfiles por cuenta familiar |
| **Motivación** | Progreso persistente | Guarda avance entre sesiones |
| **Contenido** | Biblioteca de canciones | 5,000+ canciones simplificadas |
| **Contenido** | Partituras imprimibles | PDF descargables para práctica offline |
| **Contenido** | Teclado en pantalla | Para practicar sin piano físico |

## Estado actual de ks-piano

| Categoría | Funcionalidad | Estado |
|-----------|---------------|--------|
| Visualización | Notas cayentes | ✅ Implementado |
| Visualización | Partitura (VexFlow) | ✅ Implementado |
| Visualización | Vista dividida (ambas) | ✅ Implementado |
| Práctica | Modo escucha | ✅ Implementado |
| Práctica | Modo práctica (espera nota) | ✅ Implementado |
| Práctica | Práctica de una mano | ✅ Implementado |
| Práctica | Metrónomo con count-in | ✅ Implementado |
| Práctica | Loop A-B | ✅ Implementado |
| Práctica | Digitación sugerida | ✅ Implementado |
| Práctica | Control de velocidad | ✅ Implementado |
| Práctica | Timeline navegable | ✅ Implementado |
| Práctica | Shift de octava | ✅ Implementado |
| Entrada | Teclado MIDI | ✅ Implementado |
| Entrada | Teclado de computadora | ✅ Implementado |
| Entrada | Teclado en pantalla | ✅ Implementado |
| Contenido | Canciones demo | ✅ Implementado |
| Contenido | Carga de archivos MIDI | ✅ Implementado |
| Feedback | Contador de errores | ✅ Implementado |
| Feedback | Progreso en tiempo real | ✅ Implementado |
| **Persistencia** | **Guardar progreso** | ❌ **Falta** |
| **Motivación** | **Sistema de estrellas** | ❌ **Falta** |
| **Motivación** | **Rachas de práctica** | ❌ **Falta** |
| **Feedback** | **Feedback visual de errores** | ❌ **Falta** |
| **Aprendizaje** | **Cursos estructurados** | ❌ **Falta** |
| **Aprendizaje** | **Secciones de canciones** | ❌ **Falta** |
| **Aprendizaje** | **5-minute workouts** | ❌ **Falta** |
| **Entrada** | **Detección por micrófono** | ✅ **Implementado** |
| **Contenido** | **Biblioteca grande** | ❌ **Falta** |
| **Contenido** | **Partituras imprimibles** | ❌ **Falta** |

## Mejoras propuestas (priorizadas)

### Prioridad Alta (implementadas en esta rama)

1. **Persistencia de progreso** (`localStorage`)
   - Guardar preferencias de usuario (velocidad, modo, vista)
   - Guardar estadísticas por canción (mejor puntuación, errores)
   - Guardar racha de práctica diaria

2. **Sistema de calificación con estrellas**
   - 3 estrellas: 0 errores
   - 2 estrellas: 1-3 errores
   - 1 estrella: 4-6 errores
   - 0 estrellas: 7+ errores o incompleto

3. **Feedback visual de errores**
   - Resaltar en rojo la tecla incorrecta pulsada
   - Mostrar animación de error en el teclado

4. **Racha de práctica**
   - Contador de días consecutivos practicando
   - Mostrar en la UI para motivación

### Prioridad Media

5. **Secciones de canciones**
   - Permitir marcar secciones (intro, verso, coro)
   - Practicar secciones individuales
   - Navegación rápida entre secciones

6. **Modo 5-minute workout**
   - Selección aleatoria de ejercicios cortos
   - Enfoque en conceptos recientes

7. **Detección por micrófono** — *implementado*
   - Web Audio `AnalyserNode` + suma armónica con resta iterativa de parciales
   - Permite usar un piano acústico sin MIDI; monofónico sólido, acordes aproximados
   - Ver la sección «Playing through the microphone» del `README.md` para los límites

### Prioridad Baja

8. **Cursos estructurados**
   - Crear lecciones progresivas
   - Videos introductorios
   - Teoría musical integrada

9. **Biblioteca de canciones**
   - Integrar API de canciones MIDI
   - Categorías por género/dificultad

10. **Partituras imprimibles**
    - Exportar a PDF
    - Vista de impresión optimizada

## Implementación en esta rama

Se implementaron las mejoras de **Prioridad Alta**:
- `useLocalStorage` hook genérico
- `useProgress` hook para estadísticas y rachas
- Sistema de estrellas en `TransportControls`
- Feedback visual de errores en `PianoKeyboard`
- Persistencia de preferencias en `App`
