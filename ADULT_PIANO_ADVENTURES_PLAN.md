# Plan de sesiones: Adult Piano Adventures® All-in-One Course Book 1

> Estructura de estudio derivada del libro *Adult Piano Adventures® All-in-One Course Book 1* (Nancy & Randall Faber, Faber Piano Adventures / Hal Leonard), pensada para dividir el avance en sesiones cortas y darle a cada una una pieza o ejercicio concreto para practicar en `ks-piano`.

## Metodología de investigación y sus límites

Este entorno bloquea el acceso saliente a los dominios donde vive el índice oficial del libro
(`pianoadventures.com`, `halleonard.com`, `amazon.com`, `books.google.com`, `archive.org`,
tiendas de partituras). Solo la búsqueda web funcionó, no la lectura directa de esas páginas, así
que **no pude extraer el índice unidad-por-unidad textual del libro**. Lo que sí se pudo confirmar
por búsqueda:

- El *All-in-One Course Book 1* combina en un solo volumen lo que antes eran tres libros
  separados (Lección, Teoría, Técnica) y cubre **Primer a Level 2B**.
- Tiene **16 unidades**, cada una con una sección de teoría y un bloque de **"3-Minute
  Technique"**.
- No fuerza al estudiante a quedarse anclado en la posición de Do central: introduce lectura
  intervalica desde el principio y va rotando la mano por varios pentacordios.
- Al terminar el libro, el estudiante lee en ambas claves con las manos juntas, conoce sostenidos
  y bemoles, pentacordios en varias tonalidades, acordes primarios (I–IV–V7) en Do y Sol Mayor, y
  acordes sus4.
- Piezas asociadas a esta edición/serie mencionadas en distintas fuentes: *Amazing Grace*, *The
  Can-Can*, *Catch a Falling Star*, *Danny Boy*, *Eine Kleine Nachtmusik*, *The Entertainer*,
  *Greensleeves*, *The Lion Sleeps Tonight*, *I'd Like to Teach the World to Sing*, *Merrily We
  Roll Along*, *Ode to Joy*, *Yankee Doodle*, *Row, Row, Row Your Boat*, *Clock Tower Bells*,
  *Russian Sailor's Dance*, *Lean on Me*.

Con esa base construí una progresión de **16 unidades × 2 sesiones = 32 sesiones**, ordenando
técnica y repertorio según la lógica pedagógica estándar del método (pentacordio por
pentacordio, acorde por acorde). **Recomiendo cotejar el número de unidad exacto contra el índice
físico del libro** — la agrupación temática (qué se enseña y en qué orden aproximado) es sólida,
pero el libro real podría numerar una pieza puntual una unidad antes o después.

## Por qué no reproduje el libro nota por nota

El contenido del libro está protegido por derechos de autor: no reproduzco sus arreglos, su texto
de teoría ni escaneos. Para las **32 sesiones** hice esto:

1. **Ejercicios técnicos genéricos** (pentacordios, cadencias I–IV–V7) — son patrones
   pedagógicos estándar de cualquier método de piano, sin contenido creativo protegible; los
   generé y exporté como `.mid` reales.
2. **Piezas de dominio público** (melodías tradicionales/folclóricas sin copyright vigente:
   *Merrily We Roll Along*, *Row, Row, Row Your Boat*, *Hot Cross Buns*, *Amazing Grace*,
   *Greensleeves*) — las arreglé yo mismo (no es el arreglo del libro) y las exporté a `.mid`.
3. **Temas clásicos fuera de copyright pero de arreglo delicado** (*Eine Kleine Nachtmusik*,
   *The Can-Can*, *Danny Boy*, *The Entertainer*) — en vez de arriesgar una transcripción
   nota-por-nota inexacta de memoria, generé un **motivo simplificado inspirado** en cada uno (4–8
   compases, claramente etiquetado como tal) para lectura a primera vista, no una transcripción
   fiel.
4. **Piezas todavía protegidas** (*Catch a Falling Star*, *Clock Tower Bells* — pieza original de
   Faber —, *Lean on Me*, *I'd Like to Teach the World to Sing*, *The Lion Sleeps Tonight*,
   *Russian Sailor's Dance*) — no generé nada; la tabla de abajo indica que hay que **buscar y
   cargar el MIDI manualmente** (con la función "Upload your own .mid/.midi" que ya tiene la app).

## Cómo usar el repertorio generado

Las 22 piezas/ejercicios ya están **integradas en la librería de canciones de la app**
(`src/midi/adultPianoAdventuresBook1.ts`, sumadas a `DEMO_SONGS` en `src/midi/demoSongs.ts`), así
que aparecen directo en la lista de canciones agrupadas por Tier — no hace falta subir nada a
mano. El mismo contenido también se exporta como `.mid` real en
[`practice-plans/adult-piano-adventures-book1/midi/`](practice-plans/adult-piano-adventures-book1/midi/),
regenerable con `node scripts/generate-adult-piano-adventures-midis.mjs`, por si se quiere abrir en
otro programa o cargarlo con **"Upload your own .mid/.midi files"**. *Mary Had a Little Lamb*,
*Twinkle Twinkle Little Star*, *Ode to Joy* y el *Two-Hand Arpeggio Étude* vivían antes como
canciones de ejemplo genéricas en `demoSongs.ts`; al quitarse ese contenido de muestra se
migraron aquí con su propio `.mid` generado, para no perder las 4 sesiones que dependían de ellas.

Los Tiers de la librería (`src/piano/skillPath.ts`) se calculan automáticamente a partir de la
densidad de notas, el rango, los acordes y el tempo de cada pieza (`src/piano/difficulty.ts`) — no
son asignados a mano por unidad. Con las 22 piezas, la distribución quedó así:

| Tier | Piezas |
|---|---|
| 1 · Beginner | Mary Had a Little Lamb |
| 2 · Easy | Twinkle Twinkle, Ode to Joy, Merrily We Roll Along, Row Row Row Your Boat, Hot Cross Buns, Amazing Grace, Danny Boy, Greensleeves, The Entertainer (motivo), y los 6 calentamientos de pentacordio (Do/Sol/Fa/Re/La/La menor) |
| 3 · Intermediate | Eine Kleine Nachtmusik (motivo), The Can-Can (motivo) |
| 4 · Advanced | Two-Hand Arpeggio Étude, cadencia I–IV–V7–I en Do, cadencia I–IV–V7–I en Sol, escala de Do + cadencia final |
| 5 · Expert | (vacío — ya lo estaba antes de este plan; ninguna canción de la librería llega a ese nivel de exigencia) |

## Estructura de las 32 sesiones

| Unidad | Sesión | Foco técnico / teórico | Pieza sugerida | Fuente |
|---|---|---|---|---|
| 1 | 1 | Geografía del teclado, postura, valores rítmicos (redonda/blanca/negra), compás 4/4 | — (ritmo y tacto, sin pieza) | — |
| 1 | 2 | Lectura direccional antes del pentagrama | Merrily We Roll Along | `unit01-merrily-we-roll-along.mid` (generado) |
| 2 | 1 | Pentagrama, Do central, notas guía (Sol y Fa) | Mary Had a Little Lamb | `unit02-mary-had-a-little-lamb.mid` (generado) |
| 2 | 2 | Primera pieza con manos independientes/juntas | Row, Row, Row Your Boat | `unit02-row-row-row-your-boat.mid` (generado) |
| 3 | 1 | Técnica: pentacordio de Do | C Pentascale Warm-up | `unit03-c-pentascale.mid` (generado) |
| 3 | 2 | Lectura en posición de Do | Twinkle Twinkle Little Star | `unit03-twinkle-twinkle-little-star.mid` (generado) |
| 4 | 1 | Intervalos 2ª–5ª, silencio de negra | Hot Cross Buns | `unit04-hot-cross-buns.mid` (generado) |
| 4 | 2 | Blanca con puntillo, repaso de intervalos | Ode to Joy | `unit04-ode-to-joy.mid` (generado) |
| 5 | 1 | Técnica: pentacordio de Sol, acorde I | G Pentascale Warm-up | `unit05-g-pentascale.mid` (generado) |
| 5 | 2 | Compás de 3/4, acorde de Sol Mayor en bloque | Amazing Grace | `unit06-amazing-grace.mid` (generado) |
| 6 | 1 | Corcheas y frases | Eine Kleine Nachtmusik (motivo) | `unit06-eine-kleine-nachtmusik-motif.mid` (generado, motivo simplificado) |
| 6 | 2 | Repaso libre | Elegir 1 pieza ya dominada | — |
| 7 | 1 | Técnica: pentacordio de Fa, clave de Fa ampliada | F Pentascale Warm-up | `unit07-f-pentascale.mid` (generado) |
| 7 | 2 | Saltos y digitación fija en posición de Fa | The Can-Can (motivo) | `unit07-can-can-motif.mid` (generado, motivo simplificado) |
| 8 | 1 | Técnica: cadencia I–IV–V7–I en Do | Cadencia I–IV–V7–I en Do | `unit08-cadence-C.mid` (generado) |
| 8 | 2 | Acompañamiento con acordes bajo la melodía | Danny Boy (frase) | `unit08-danny-boy-motif.mid` (generado, motivo simplificado) |
| 9 | 1 | Técnica: pentacordio de Re, sostenidos | D Pentascale Warm-up | `unit09-d-pentascale.mid` (generado) |
| 9 | 2 | Aplicación en pieza popular | Catch a Falling Star | Buscar y cargar MIDI manualmente (con copyright) |
| 10 | 1 | Técnica: cadencia I–IV–V7–I en Sol | Cadencia I–IV–V7–I en Sol | `unit10-cadence-G.mid` (generado) |
| 10 | 2 | Pieza original del método con acordes | Clock Tower Bells | Buscar y cargar MIDI manualmente (pieza original de Faber, con copyright) |
| 11 | 1 | Técnica: pentacordio de La, ritmo sincopado | A Pentascale Warm-up | `unit11-a-pentascale.mid` (generado) |
| 11 | 2 | Pieza popular con síncopa | Lean on Me | Buscar y cargar MIDI manualmente (con copyright) |
| 12 | 1 | Técnica: acordes sus4 y acompañamiento arpegiado | Two-Hand Arpeggio Étude | `unit12-arpeggio-etude.mid` (generado) |
| 12 | 2 | Lectura expresiva en tonalidad menor relativa | Greensleeves (frase) | `unit12-greensleeves-motif.mid` (generado, motivo simplificado) |
| 13 | 1 | Técnica: pentacordio de La menor | A minor Pentascale Warm-up | `unit13-a-minor-pentascale.mid` (generado) |
| 13 | 2 | Pieza popular en modo mayor con salto de octava | I'd Like to Teach the World to Sing | Buscar y cargar MIDI manualmente (con copyright) |
| 14 | 1 | Lectura más allá de la posición de 5 dedos, síncopa avanzada | The Entertainer (motivo) | `unit14-the-entertainer-motif.mid` (generado, motivo simplificado) |
| 14 | 2 | Pieza popular con ostinato rítmico | The Lion Sleeps Tonight | Buscar y cargar MIDI manualmente (con copyright) |
| 15 | 1 | Técnica: escala de Do Mayor completa (una octava) + cadencia final | C Major Scale + Cadence | `unit15-c-scale-and-cadence.mid` (generado) |
| 15 | 2 | Pieza folclórica con carácter/dinámica | Russian Sailor's Dance | Buscar y cargar MIDI manualmente (posible copyright vigente) |
| 16 | 1 | Repaso general: repertorio a elección | 2–3 piezas ya dominadas | — |
| 16 | 2 | "Recital" de cierre + puente al Book 2 | Repertorio favorito del alumno | — |

## Después del Book 1

*Adult Piano Adventures* continúa con el **Book 2** (Level 2B–3A) y **Book 3** (Level 3A–3B),
profundizando en escalas de una octava en más tonalidades, acordes con inversiones, y piezas más
largas. Si se quiere, puedo repetir este mismo ejercicio de investigación + generación de MIDI
para el Book 2 una vez completadas estas 32 sesiones.

## Fuentes

- [Adult Piano Adventures All-in-One Course Book 1 — Faber Piano Adventures](https://pianoadventures.com/product/adult-piano-adventures-all-in-one-course-book-1/)
- [Adult Piano Adventures — Level 1 — Faber Piano Adventures](https://pianoadventures.com/piano-books/adult-piano-adventures/level-1/)
- [Adult Piano Adventures All-in-One Piano Course Book 1 — Hal Leonard](https://www.halleonard.com/product/420242/adult-piano-adventures-all-in-one-piano-course-book-1)
- [Adult Piano Adventures All-in-One Piano Course Book 1 — Ellis Music](https://www.ellismusic.com/p-8692-adult-piano-adventures-all-in-one-piano-course-book-1-primer-through-level-2b.aspx)
- [Adult Piano Adventures: All in One Course - Book 1 — Amazon](https://www.amazon.com/Adult-Piano-Adventures-All-Course/dp/1616773022)
- [Adult Piano Adventures All-in-One Piano Course Book 1 — Google Books](https://books.google.com/books/about/Adult_Piano_Adventures_All_in_One_Piano.html?id=UrU7DwAAQBAJ)
- [Adult piano adventures (comprehensive course, All-in-one lesson book) — Internet Archive](https://archive.org/details/adultpianoadvent0000fabe)
