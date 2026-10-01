# BRO TV: Night Rift

A portrait browser roguelite. You are the night editor of BRO TV. Dive a rift, grab clip shards, extract, cut one Short, post it, and spend the views on gear. Original names only. No copyrighted anime.

## Play

From this folder:

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080` on this phone. The page is portrait-first (480×854) and letterboxes on a wide screen.

The only network request is the Phaser 3.80.1 script on first load. After that, art, sound, and the save stay on the device. The save key is `brotv_night_rift_v1`.

## Controls

- Move: WASD, arrow keys, or the left stick.
- Aim: mouse, or touch the playfield.
- Shoot: click, hold the FIRE button, or hold Space. The drone fires.
- Dash: Shift or DASH. 0.35s of iframes, 0.8s cooldown.
- Pause: Esc or the II button. Quit from pause drops this dive's shards and keeps your gear.

On a rift, the extract pad opens at 40 seconds or when that episode's elite dies. Stand on it to extract. The timer starts at 70 seconds. If it hits zero, the dive fails. Death drops only the shards from that dive. One revive is available per local calendar day.

## Loop

Studio hub, then a rift, then the edit bay.

| Rift | Unlock | Shard | Elite |
|---|---|---|---|
| Rooftop Club | start | Fan | Hall Monitor |
| Scrap Bay | 2,000 best views | Bolt | Forklift Ace |
| Lantern Stairs | 8,000 | Ofuda | Bell Priest |
| Violet Alley | 20,000 | Fang | Mask Broker |
| Gold Set | 50,000 | Reel | Director |
| Season Finale | 100,000 best views, all 5 elites, and a Season Trailer | — | The Algorithm |

Shorts: Cold Open, Duo Cut, Trio Edit, Elite Cut, Season Trailer. The post button shows the views math: `base × (1 + 0.05 × desk tier) × (1 + 0.02 × subs)`. Subs in that formula stop rising after 25.

The finale is one room. Survive 90 seconds or break the core. The night pass does not add time there. Clearing it puts a star on the title. The channel stays playable.

## Checks

```bash
npm test
```

That runs the rules, map, and asset tests. It does not click the canvas.

## Credits

Kenney CC0 tiles and sounds. See `assets/CREDITS.md`. Music beds are generated in the browser. The neon HUD is drawn in code.

## Notes on the spec

A few calls were tighter or looser than a single line of the spec, so the last purchase and the finale door do something:

- Lens, hood, and night pass start at the first listed number (10 damage, 100 HP, +0s). Each buy steps up, including one step past the printed list, so tier 3 is 32 damage, 220 HP, and +30s. Costs stay 300/1500/6000, 300/1500/6000, and 800/3000/10000. The edit desk follows the formula exactly, tier 0 through 3.
- Rifts unlock from best views, so spending views does not lock a rift again.
- Scrap is the Elite Cut recipe in the table (1,600 views and +10s on the next dive of that color), not a separate +50% modifier. Bonus seconds stack until that rift is entered.
- The Season Trailer is required for the finale, along with 100,000 best views and all five elites.
- Contact damage has 0.45s of hurt iframes, plus a gap per enemy, so a crowd does not drain HP every frame.
- The hub is a button studio so the targets stay large on a phone.

GitHub Free cannot publish Pages from a private repo. This repo stays private. Play it from the local server above. Say if you want the repo public, and it can go to `https://markmarvik.github.io/bro-tv-night-rift/`.
