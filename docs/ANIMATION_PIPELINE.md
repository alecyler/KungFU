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
