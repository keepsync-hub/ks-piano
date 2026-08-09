# Análisis de la lógica de progreso de Duolingo aplicada a ks-piano

> Evaluación de los mecanismos de motivación/progreso de Duolingo y cómo se adaptaron a la práctica de piano en esta rama, junto con perfiles diferenciados por edad/complejidad.

## Mecánicas de Duolingo

| Mecánica | Descripción en Duolingo | ¿Aplica a aprender piano? |
|---|---|---|
| **XP por lección** | Cada lección da ~10-20 XP, con bonus por lecciones "perfectas" (sin errores) | Sí — el equivalente es XP por tiempo practicado + bonus por canción completada según errores |
| **Racha diaria (streak)** | Se mantiene completando al menos una lección/objetivo diario; "streak freeze" para no perderla | Sí — pero encadenada al **objetivo diario de XP**, no a "tocar una nota cualquiera", para que sea un hábito real y no un hueco fácil de explotar |
| **Objetivo diario configurable** | Casual/Regular/Serio/Intenso, en minutos de lección | Sí — mismos 4 niveles, expresados en XP (≈ minutos de práctica) |
| **Niveles / coronas** | Curva de XP acumulado con niveles crecientes por unidad | Simplificado a un nivel global con 100 XP planos por nivel — predecible y fácil de entender para un niño |
| **Árbol de habilidades / unidades** | Unidades secuenciales que se desbloquean al dominar la anterior | Sí — "Skill Path" por nivel de dificultad de canción (Tier 1-5), se desbloquea el siguiente tier con ≥1.5 estrellas promedio en el actual |
| **Corazones / vidas** | Penaliza errores, limita intentos | **No implementado** — en piano los errores son parte natural del aprendizaje motriz; limitar intentos desalentaría la repetición, que es justamente lo que hace falta |
| **Ligas semanales / leaderboard** | Competencia social entre usuarios | **Fuera de alcance** — no hay backend ni cuentas; es una app local de un solo dispositivo |
| **Ejercicios de refuerzo (spaced repetition)** | Duolingo re-presenta palabras que se están "olvidando" | Sí — una canción dominada que no se toca en 3+ días se marca "🔁 Review" en la lista |
| **Gemas / power-ups** | Moneda cosmética/de conveniencia | **Fuera de alcance** — no aporta al aprendizaje, solo añade complejidad de UI |

## Perfiles: niño vs. adulto

La segunda mitad del objetivo — "un perfil para niño y un perfil para adulto basado en la complejidad de las canciones" — se resolvió reutilizando el mismo motor de progreso en vez de bifurcar la app en dos experiencias distintas:

- **`Profile`** (`src/types.ts`): cada perfil tiene `type: 'child' | 'adult'`, nombre y avatar. Se guarda en `localStorage` (`useProfiles`), y cada perfil tiene su **propio progreso aislado** (`ks-piano-progress-<profileId>`), para que el streak, XP y estrellas de un niño y un adulto en el mismo dispositivo nunca se mezclen.
- **Complejidad de canciones** (`src/piano/difficulty.ts`): un heurístico 0-100 basado en densidad de notas, uso de ambas manos, acordes reales (varias notas en una misma mano a la vez), rango de alturas y tempo. Se aplica igual a las canciones de la demo y a cualquier MIDI subido, así que el mismo criterio ordena todo el repertorio en 5 tiers (`Beginner` → `Expert`).
- **Tope por perfil** (`src/piano/skillPath.ts`): un perfil `child` solo ve hasta el Tier 3; un perfil `adult` ve hasta el Tier 5. Dentro de ese tope, el desbloqueo por tiers es igual para ambos — un niño avanzado puede llegar hasta donde su perfil lo permite, y un adulto empieza en el mismo Tier 1 si es principiante.
- Las subidas de MIDI del usuario **no se filtran por perfil** (si alguien sube un archivo, es porque lo quiere tocar), solo el repertorio incluido en la app respeta el tope.

## Qué se implementó en esta rama

- `src/piano/xp.ts` — XP por segundo de práctica + bonus por canción completada (según estrellas) + nivel a partir de XP total + presets de objetivo diario.
- `src/hooks/useProgress.ts` (reescrito) — progreso namespaced por perfil, racha atada al objetivo diario, XP acumulado por día, `isDueForReview` para repaso espaciado.
- `src/piano/difficulty.ts` + `src/piano/skillPath.ts` — puntaje de dificultad y árbol de tiers con desbloqueo progresivo.
- `src/hooks/useProfiles.ts` + `src/components/ProfileGate.tsx` — creación/selección de perfil, pantalla de bienvenida "¿Quién está jugando?" al estilo Netflix.
- `src/components/ProgressHUD.tsx` — insignia de nivel, barra de XP, anillo de objetivo diario y racha, en el header.
- `src/components/SongLibrary.tsx` — agrupa canciones por tier, con candados en tiers bloqueados y badge de repaso (🔁) en canciones que ya se dominaron pero llevan días sin tocarse.
- Dos canciones demo nuevas (`src/midi/demoSongs.ts`) para tener variedad de tiers: "Mary Had a Little Lamb" (Tier 1) y un "Two-Hand Arpeggio Étude" original (Tier 4), sumadas a las 3 existentes que ya cubrían Tier 1-2.

## Qué se dejó fuera (y por qué)

- **Corazones/vidas**: penalizar intentos va contra cómo se aprende un instrumento (repetición deliberada de un pasaje difícil).
- **Ligas/leaderboard social**: requiere backend y cuentas; no encaja en una app 100% local basada en `localStorage`.
- **Detección por micrófono** (ya señalado en `SIMPLYPIANO_ANALYSIS.md`): sigue pendiente, es ortogonal a la gamificación.
- **Migración del progreso previo a `ks-piano-progress`** (clave global, sin perfil): se dejó fuera a propósito — es una app de demostración sin usuarios reales dependiendo de datos guardados, así que no se justificaba el código de migración. Cada perfil nuevo arranca en cero.
