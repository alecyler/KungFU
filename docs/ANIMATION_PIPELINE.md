# IdleFist Pose Library Pipeline

This patch makes Alley Brawler animation data-driven.

## How it works

`src/main.js` now contains `POSE_LIBRARY`.

Each fighter profile has moves like:

```js
alleyBrawler: {
  punch: [
    { t: 0.00, ...guardPose },
    { t: 0.18, ...startupPose },
    { t: 0.34, ...activePose },
    { t: 1.00, ...recoveryPose }
  ]
}
```

The renderer interpolates between those keyframes. The important thing is that the active renderer now reads from that library instead of relying on a single hardcoded pose per move.

## What to send next

Best input:

1. A labelled sprite sheet.
2. Labels in left-to-right frame order.
3. Optional hitbox/active-frame marks.
4. Optional note like: `basic punch frames 1-4 = jab`, `punch 2 frames 1-5 = cross`.

Even better input:

- One GIF per move.
- Or sprite sheet rows cropped by move.

## Mapping format I can use

For each move, I will map frames to:

- startup
- active
- recovery
- return-to-guard

Then I convert the sprite silhouette into Dude joint angles:

- `la`: lead/left arm two-bone angles
- `ra`: rear/right arm two-bone angles
- `ll`: lead/left leg two-bone angles
- `rl`: rear/right leg two-bone angles
- `lean`: torso/head lean
- `hip`: hip offset/rotation feel
- `yShift`: vertical squat/jump offset

## Current Alley Brawler moves using keyframes

- idle
- run/walk
- turn
- punch
- oneTwo
- kick
- sweep
- uppercut
- jumpKick
- hadouken
- jump
- duck
- block
- hurt

## 2026-04-25 human-ratio puppet update

The live fighter renderer now treats the Dude more like a small human puppet instead of a pure stick figure:

- head
- torso/neck-to-hip
- upper arms
- lower arms
- wrist/hand nubs
- upper legs
- lower legs
- feet

The proportions live in `DUDE_MODELS` in `src/main.js`. Start from the default human-ish ratios, then vary per fighter profile or per reference sheet. The animation data is still angle-based, so each labelled sprite-sheet frame can become a keyframe by setting the arm/leg joint angles plus `lean`, `hip`, and `yShift`.

Alley Brawler now defaults to a more side-on guard stance instead of a straight-on `/|\\` neutral pose, and the run has been pulled toward a brawler shuffle while preserving the funny-walk archive for later gag use.

## 2026-04-25 sprite-sheet traced locomotion note

The live animation path for the player is:

`POSE_LIBRARY.alleyBrawler` → `poseAngles()` → `drawDude()` → `drawHumanPuppet()`

Do **not** patch a separate `walk` object unless the game code is changed to call it. The actual movement pose currently used by the game is named `run`, even when the character is visually walking forward. That naming mismatch caused several earlier patches to appear to do nothing.

Renderer angle convention:

- `0` points right
- `90` points down
- `180` points left
- negative angles point up

For idle/run/turn locomotion, keep upper-arm angles positive. Negative upper-arm angles are what produced the old hilarious overhead flailing. The runtime `sanitizeLocomotionPose()` guardrail intentionally clamps Alley Brawler idle/run arms to prevent that bug from returning.

The labelled sprite sheet has now been mapped this way:

- `Idle` → `idle`
- `forward walk loop` → `run`
- `backup walk loop` → `backRun` for a future retreat/backstep state
- `Turn` → `turn`
- `crouch` → `duck`
- `vertical jump` → `jump`
- fall/death behavior → `dead`

When tracing another sheet, update the keyframes in `POSE_LIBRARY.alleyBrawler` first, then verify by checking the console build tag printed from `ANIM_BUILD_TAG`.
