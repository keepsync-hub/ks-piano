# Rediseño UX/UI — chrome cálido, superficie de práctica intacta

> Ejercicio de discusión antes de tocar código, siguiendo el mismo formato de
> `DUOLINGO_ANALYSIS.md` y `SIMPLYPIANO_ANALYSIS.md`: propuesta inicial,
> contraargumento y alternativa elegida.

## Propuesta inicial

Clonar el lenguaje visual completo de Duolingo/SimplyPiano en toda la app:
fondo claro, tarjetas grandes, tipografía redondeada tipo cómic, colores muy
saturados, confeti y animaciones en cualquier pantalla, incluida la zona de
partitura/piano.

## Contraargumento

ks-piano no es una app de lecciones pasivas: el pentagrama, las notas
cayendo y el teclado son la superficie donde el usuario **lee música en
tiempo real** mientras toca. Un rediseño 100% claro y juguetón ahí tendría
costos reales:

- Menos contraste de las notas de color sobre fondo claro — crítico para
  practicar de noche, uso habitual de piano.
- Movimiento/confeti en la zona de lectura distrae justo cuando se necesita
  más foco motriz y visual.
- Ni Duolingo ni SimplyPiano son "todo juguetón" en la práctica: SimplyPiano
  mantiene su pantalla de partitura oscura y funcional, y reserva el tono
  cálido y gamificado para el menú, el header, las tarjetas de lección y las
  pantallas de resultado.

## Alternativa elegida

Separar **chrome (motivación/navegación)** de **superficie de práctica
(lectura)**:

- **Chrome rediseñado** — header, racha, XP, selección de perfil, lista de
  canciones, toolbar, resumen de sesión: paleta más cálida (violeta como
  color de marca, deliberadamente distinto de los colores funcionales de
  nota — azul mano izquierda, verde mano derecha, rosa input, ámbar
  siguiente nota — para que un acento de UI nunca se confunda con un estado
  de nota), esquinas más redondeadas, botones táctiles estilo Duolingo
  (relieve 3D que se comprime al presionar), animaciones de celebración
  (confeti al terminar el 5-Min Workout, racha con rebote, estrellas con
  entrada escalonada, anillo de meta diaria con "pop").
- **Superficie de práctica sin cambios funcionales** — piano, notas
  cayendo, partitura: se mantiene oscura y de alto contraste, pero gana
  **refuerzo positivo instantáneo**: un destello verde breve en la tecla al
  acertar una nota (antes solo existía el destello rojo de error), en la
  línea de SimplyPiano.
- Tipografía: pila de fuentes redondeadas del sistema (`ui-rounded`, `Segoe
  UI Rounded`, …) en vez de importar una fuente web — mantiene la app
  100% offline (ver README: "runs entirely in the browser") sin depender de
  una CDN.
- Todas las animaciones nuevas respetan `prefers-reduced-motion`.

## Qué cambió en el código

- `src/index.css` — tokens de diseño (`--brand`, `--success`, `--warm`,
  `--gold`, radios, easings) y utilidades compartidas (`.btn-tactile`,
  `@keyframes pop-in`), fuente redondeada de sistema.
- `App.css`, `ProgressHUD.css/tsx` — título con gradiente, racha con rebote
  y llama animada, barra de XP con brillo, anillo de meta con "pop".
- `ProfileGate.css` — tarjeta de bienvenida con fondo radial cálido, avatar
  con rebote al pasar el mouse, botón de inicio táctil.
- `SongLibrary.css/tsx`, `TransportControls.css/tsx` — filas de canción
  tipo tarjeta, estrellas con entrada escalonada.
- `WorkoutPanel.css/tsx` + `Confetti.tsx/css` (nuevo) — confeti y stats con
  entrada escalonada al terminar un workout.
- `PianoKeyboard.css/tsx`, `App.tsx` — destello verde de acierto (`successFlash`),
  simétrico al destello rojo de error ya existente.
- `PracticeToolbar.css`, `Legend.css` — migrados a los tokens compartidos
  para consistencia visual.

No se tocó la lógica de negocio (XP, rachas, dificultad, MIDI, motor de
reproducción) ni `FallingNotes.css`/`SheetMusic.css`, por la razón explicada
arriba.
