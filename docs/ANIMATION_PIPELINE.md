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
