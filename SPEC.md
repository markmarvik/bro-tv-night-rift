# BRO TV: NIGHT RIFT — build spec for Grok Build

Paste this whole file as the task. Build a finished, playable browser game. Do not use Unity, Godot, Unreal, or any native engine. Everything must run from the terminal and open in a browser.

## What this is

A complete 2D top-down arcade roguelite about a bedroom anime-clip channel. The player is the night editor. Each night a rift opens into an original anime-genre world. Dive in, grab Clip Shards, survive the episode, extract, craft a Short, post it, earn Views, buy gear, dive deeper.

No copyrighted anime. No Naruto, One Piece, JJK, Demon Slayer names, faces, moves, or music. Original worlds and original names only.

## Why 2D, not 3D

3D craft/grind looks bigger and ships worse from a terminal agent. This design is the full game: hub, combat, loot, crafting, meta grind, bosses, ending. Top-down 2D is the stack that can actually be finished.

## Stack (hard rules)

- Static site. `index.html` + `css/style.css` + `js/` modules. No bundler required.
- Phaser 3 from CDN (`https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js`). Arcade physics.
- Save with `localStorage` key `brotv_night_rift_v1`.
- Serve with `python3 -m http.server 8080` from the project root. Game must load at `http://localhost:8080`.
- Target: 60fps on a mid phone, portrait-first (9:16) and also fine at 16:9. Scale with `Phaser.Scale.FIT`, centered.
- No external network calls after load (YouTube Playables rule). All art, audio, and data ship in the repo.
- No accounts, no backend.

## Assets (free only)

Download CC0 Kenney packs and commit the PNGs you actually use under `assets/`. Do not hotlink.

- Kenney Tiny Dungeon (or Tiny Town) for tiles, props, chests: https://kenney.nl/assets/tiny-dungeon
- Kenney 1-Bit Pack or Pixel Platformer characters as the player/enemies if Tiny Dungeon bodies are enough: https://kenney.nl/assets
- Kenney UI Pack for buttons/panels: https://kenney.nl/assets/ui-pack
- Kenney Impact Sounds + Interface Sounds for SFX: https://kenney.nl/assets/impact-sounds
- If a needed sprite does not exist, draw it in code (graphics) or a 16x16 PNG you generate yourself. Do not scrape copyrighted anime art.

Anime look without anime IP: dark room, neon magenta/cyan UI, hooded player, worlds tinted per genre (school = pink tiles, mecha = steel blue, shrine = red lanterns, demon alley = purple fog, studio finale = gold). Tinting is `setTint`, not new art.

## Fantasy

Channel name on the save: **BRO TV**. Player character: hoodie kid, camera drone orbits them (a small sprite or circle that faces the aim). The drone is the weapon. Worlds are "episodes" the channel is clipping.

## Screens

1. Boot — load assets, read save.
2. Title — logo BRO TV / NIGHT RIFT, Continue, New Run (new game wipes save after confirm).
3. Studio hub — the meta screen.
4. Rift dive — the action screen.
5. Edit bay — crafting, shown after a successful extract (also openable from hub if you hold uncrafted shards).
6. Game over / channel killed — only if you fail an extract with 0 revive tokens. Meta progress stays.
7. Finale — unlocked at 100,000 Views.

## Game loop (this is the whole game)

```
Studio hub
  -> pick a rift you have unlocked
  -> Dive
       move, dash, drone-shot, grab shards, kill adds, optional elite, extract zone
  -> die = lose shards gathered this dive, back to hub (gear stays)
  -> extract = keep shards
  -> Edit bay: spend shards to craft a Short
  -> Post Short: convert to Views (and a few Subs)
  -> Spend Views on studio gear
  -> harder / new rifts open
  -> repeat until finale
```

A full session is 3–6 minutes. A clear of all 5 rifts plus finale is a few hours of grind, not an endless empty loop.

## Studio hub

Room: desk, door (rift), edit bay, upgrade wall, save is automatic.

Shown always: Views, Subs, shard wallet (5 colors), current gear tier.

Actions:

- **Open rift** — list of episodes. Locked ones show the Views required.
- **Edit bay** — craft.
- **Upgrade wall** — buy permanent gear.
- **Leaderboard stub** — local best Views only. No network. Label it "this browser".

## Rifts (5 episodes + finale)

Each rift is one tilemap room-sequence, not a proc-gen maze. Hand-place 3 rooms + extract pad. Enemy count scales with gear tier so it stays readable.

| ID | Name | Tint | Views to unlock | Shard dropped | Elite |
|---|---|---|---|---|---|
| school | Rooftop Club | pink | 0 | Fan Shard | Hall Monitor |
| mecha | Scrap Bay | steel | 2,000 | Bolt Shard | Forklift Ace |
| shrine | Lantern Stairs | red | 8,000 | Ofuda Shard | Bell Priest |
| alley | Violet Alley | purple | 20,000 | Fang Shard | Mask Broker |
| studio | Gold Set | gold | 50,000 | Reel Shard | Director |
| finale | Season Finale | white | 100,000 Views AND all 5 elites killed once | — | The Algorithm |

Dive rules, all rifts:

- 70 seconds on screen. Timer top-center.
- Extract pad unlocks at 40s or when elite dies, whichever first.
- Player HP 100. Contact damage and shots hurt.
- Shards drop from breakables and elites. Auto-attract inside 48px.
- Death: drop this dive's shards, keep gear, return to hub. One free revive token per real-world day stored in save (simple date stamp).

## Combat

- WASD / left stick virtual buttons move. Mouse or right-side touch aims. Click / shoot button fires.
- Drone shot: fast pellet, 8px, cooldown 0.18s base.
- Dash: 0.35s iframes, 0.8s cooldown. Shift or on-screen dash.
- No combos, no skill tree in the dive. Depth is gear + crafting, not a fighting game.

Enemies (reuse 2 sprites, tinted):

- Walker — chases, contact damage 10.
- Shooter — stops and fires a slow orb.
- Elite — bigger, 200 HP, drops 8–12 shards and a guaranteed gear scrap (used only as a craft bonus, not a separate currency: scrap = +50% Views on the next Short if spent).

## Crafting (Edit bay)

A Short is a recipe. You always craft exactly one Short, then post it. Cannot queue.

| Short | Cost | Views out | Extra |
|---|---|---|---|
| Cold Open | 5 of any one color | 120 | — |
| Duo Cut | 8 color A + 8 color B | 400 | — |
| Trio Edit | 6 of three different colors | 900 | +1 Sub |
| Elite Cut | 10 of that rift's color + 1 scrap | 1,600 | next dive in that rift has +10s |
| Season Trailer | 12 of all 5 colors | 5,000 | unlocks finale door if elites are dead |

Views formula: `base * (1 + 0.05 * editDeskTier) * (1 + 0.02 * subsCapBonus)`. Show the math on the post button so it is obvious.

Posting is instant. A 1.5s "uploading" tween, then Views tick up. That is the juice.

## Grind / upgrades (permanent, Views cost)

| Gear | Tiers | Effect | Cost t1 / t2 / t3 |
|---|---|---|---|
| Drone lens | 3 | shot damage 10 / 16 / 24 | 300 / 1,500 / 6,000 |
| Hood | 3 | max HP 100 / 140 / 180 | 300 / 1,500 / 6,000 |
| Edit desk | 3 | Views multiplier +5% / +10% / +15% | 500 / 2,000 / 8,000 |
| Night pass | 3 | dive timer +0 / +10s / +20s | 800 / 3,000 / 10,000 |

Buying is the grind. No random loot boxes. Elites are the only RNG (shard count 8–12).

## Finale

One room. The Algorithm is a stationary core that spawns walkers. 90 seconds. Win = ending card: "BRO TV hit season finale. Subs: N. Views: N." Lose = back to hub, no shard loss beyond the dive. Beating it sets `finaleCleared: true` and title screen shows a small star. Game remains playable.

## Save shape

```js
{
  views: 0,
  subs: 0,
  shards: { fan: 0, bolt: 0, ofuda: 0, fang: 0, reel: 0 },
  scrap: 0,
  gear: { lens: 0, hood: 0, desk: 0, pass: 0 },
  elitesKilled: { school: false, mecha: false, shrine: false, alley: false, studio: false },
  finaleCleared: false,
  bestViews: 0,
  reviveDate: ""
}
```

Write save on hub enter, on extract, on death, on purchase, on post.

## Controls HUD

Portrait: move pad bottom-left, shoot and dash bottom-right, timer top, HP bar under timer, shard count top-left. Pause button opens a panel (resume, quit to hub = forfeit dive shards).

Desktop: WASD, mouse aim, click shoot, Shift dash, Esc pause.

## Audio

Kenney CC0 shots, hit, pickup, UI click, a short loop per rift if present in the packs. Mute toggle in pause and on title, persisted in save.

## Build order (do it in this order, stop only when playable end to end)

1. Project skeleton, Phaser boot, scale, title screen.
2. Studio hub with fake buttons and the save object.
3. One rift (school) with tilemap, player, drone shot, one walker, extract, timer.
4. Death and extract both return to hub with the right shard rules.
5. Edit bay recipes and Views.
6. Upgrade wall changes combat numbers.
7. Other four rifts as tinted+relabeled copies of school with their elite.
8. Finale.
9. Touch controls, mute, polish HP bars and floating damage numbers.
10. README: how to serve, controls, asset credits (Kenney CC0).

## Done means

- New game to finale is possible without console errors.
- Refresh keeps Views, gear, shards.
- Death does not delete gear.
- A Short can be crafted and posted.
- Works with mouse and with on-screen buttons.
- No copyrighted characters or names.

## Out of scope

Multiplayer, accounts, ads, YouTube SDK, cloud save, 3D, dialogue trees, gacha pulls, real anime footage.
