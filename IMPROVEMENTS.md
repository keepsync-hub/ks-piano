# Mejoras propuestas para ks-piano

> Generado tras una revisión del código en `src/`. Algunas son correcciones de calidad, otras nuevas funcionalidades.

## 1. Cobertura de pruebas

**Estado actual:** No hay pruebas automatizadas.

**Propuesta:** Se agregó Vitest + jsdom + Testing Library como infraestructura. Los archivos de prueba iniciales cubren:
- Funciones puras del piano (`layout`, `noteNames`, `fingering`).
- Agrupación de notas en `usePlaybackEngine`.
- Entrada MIDI (`midiInput`).
- Teclado de computadora (`useComputerKeyboard`).

**Siguiente paso:** Agregar pruebas para `parseMidiFile` con archivos MIDI reales/binarios y para `usePlaybackEngine` extrayendo la lógica pura del hook.

## 2. Corrección: el metrónomo ignora la compás del archivo

**Problema:** En `usePlaybackEngine.ts` se usa la constante `BEATS_PER_MEASURE = 4` para decidir el acento del metrónomo, en lugar de `song.timeSignature`.

**Impacto:** Un archivo en 3/4 o 6/8 acentúa el primer tiempo correctamente solo por casualidad si coincide con múltiplos de 4.

**Sugerencia:**
```ts
const beatsPerMeasure = song.timeSignature?.[0] ?? 4
playClick(beat % beatsPerMeasure === 0)
```

## 3. Mejora: IDs deterministas para canciones cargadas

**Problema:** `parseMidiFile` usa `Date.now()` para generar el `id`. Esto hace que dos cargas del mismo archivo produzcan objetos distintos y dificulta las pruebas.

**Sugerencia:** Usar un hash del buffer o un contador, o permitir inyectar un generador de IDs.

## 4. Mejora: validación y manejo de errores al cargar MIDI

**Problema:** `parseMidiFile` no captura errores de `@tonejs/midi`. Un archivo corrupto puede dejar la app colgada.

**Sugerencia:**
```ts
try {
  const midi = new Midi(buffer)
  // ...
} catch (err) {
  throw new Error('Could not parse MIDI file')
}
```

Y en la UI mostrar un mensaje claro al usuario.

## 5. Mejora: persistencia de preferencias del usuario

**Problema:** Cada vez que se recarga la página se pierden:
- Modo de vista (`falling`, `sheet`, `both`)
- Velocidad de reproducción
- Metrónomo activado/desactivado
- Filtro de mano
- Shift de octava

**Sugerencia:** Guardar en `localStorage` y restaurar al iniciar.

## 6. Mejora: atajos de teclado visibles y configurables

**Problema:** Los atajos están documentados solo en el README. No hay indicación visual en la UI.

**Sugerencia:**
- Agregar tooltips en botones con su atajo (`Space`, `M`, `[`, `]`, etc.).
- Considerar un modal de ayuda de atajos con `?`.

## 7. Corrección: manejo de `e.preventDefault()` en atajos

**Problema:** `useShortcuts` no previene el comportamiento por defecto del navegador para algunas teclas (por ejemplo, `Space` hace scroll).

**Sugerencia:** Llamar `e.preventDefault()` dentro del handler cuando la tecla coincida con un atajo.

## 8. Mejora: feedback visual de errores en modo práctica

**Problema:** En modo práctica, si el usuario toca una nota incorrecta se incrementa `errors`, pero no hay feedback inmediato en la UI (solo contador).

**Sugerencia:** Resaltar la tecla pulsada en rojo brevemente o mostrar un indicador de error cerca del teclado.

## 9. Mejora: soporte para archivos `.mid` y `.midi` en el input

**Problema:** No se revisó el componente de carga, pero el parser acepta cualquier `File`. Sería útil validar extensión y tamaño máximo antes de leer el buffer.

## 10. Mejora: CI/CD básico

**Propuesta:** Agregar un workflow de GitHub Actions que ejecute:
```bash
npm ci
npm run lint
npm run build
npm run test
```

Esto garantiza que los PRs no rompan el build ni las pruebas.

## 11. Corrección: `BEATS_PER_MEASURE` hardcodeado

**Archivo:** `src/hooks/usePlaybackEngine.ts:21`

**Sugerencia:** Reemplazar la constante por el valor dinámico de `song.timeSignature[0]`.

## 12. Mejora: separar lógica pura del hook `usePlaybackEngine`

**Problema:** `usePlaybackEngine` es muy grande (~570 líneas) y mezcla estado de React con lógica de audio y temporización.

**Sugerencia:** Extraer:
- `buildGroups` (ya exportado para pruebas).
- Funciones de manejo de loop.
- Funciones de manejo de metrónomo.
- Un reducer o motor de práctica puro que reciba eventos y devuelva el siguiente estado.

Esto facilitaría las pruebas y el mantenimiento.
