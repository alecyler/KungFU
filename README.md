# IdleFist v12

IdleFist: The Tower That Punches Back

## Run
```bash
npm install
npm run dev
```

Open the Vite URL in your browser.

## New in v12
- Basic Rules box removed.
- Auto-pick powers is ON by default to avoid level-up stalls during testing.
- Manual input / test mode checkbox with move buttons.
- Distinct poses for Punch, One-Two, Kick, Foot Sweep, Uppercut, and Jump Kick.
- Hitstop/shake/popups kept from v12.
- Normal enemy bars are yellow; miniboss bars are purple.
- F/R/S gauges remain the main player bars; X stays hidden until charged.

Manual hotkeys when test mode is on:
1 Punch, 2 One-Two, 3 Kick, 4 Sweep, 5 Uppercut, 6 Jump Kick, J Jump, K Duck.


## v12 notes
- Added KO/death animation when Fortitude hits zero.
- Auto mode restarts after about 3 seconds.
- Manual test mode stays defeated until you press Restart.
- Animation roadmap: lock a small set of excellent key poses early, then polish individual powers/enemies after systems stabilize.
