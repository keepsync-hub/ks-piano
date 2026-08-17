# ks-piano practice progress

ks-piano keeps each profile's practice progress in the browser's
`localStorage` (there's no backend). This file is a local, git-tracked
snapshot of that progress, for anyone who wants a history of it alongside
the code.

It is **not synced automatically** — from the app's hamburger (☰) options
menu (top-right of the practice stage), use **⤓ Export progress (.md)** to
download a fresh copy covering every profile on the current device, then
replace this file's contents with the download (or commit the download
under a new name to keep a history over time).

## Format

Each profile gets its own section:

- **Level** — current level and total XP
- **Streak** — consecutive days with at least one completed workout session
- **Daily goal today** — met once a workout session ("▶ Start 5-Min
  Workout") has been completed today
- **Songs** — a table of best star rating, times completed, and last played
  date, per song

Star ratings are based on the error rate of a completed run: 0% errors
earns ★★★, up to 20% errors earns ★★☆, and anything above 20% still earns
★☆☆ (a song only earns zero stars if the run wasn't completed at all).

No profiles have been exported yet on this machine.
