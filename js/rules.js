export const SAVE_KEY = 'brotv_night_rift_v1';

export const DIVE_SECONDS = 70;
export const EXTRACT_AT = 40;
export const FINALE_SECONDS = 90;
export const ATTRACT = 48;
export const SUBS_CAP = 25;
export const VIEWS_FINALE = 100000;

export const WALKER_HP = 30;
export const SHOOTER_HP = 22;
export const ELITE_HP = 200;
export const CORE_HP = 1400;
export const WALKER_TOUCH = 10;
export const ORB_DAMAGE = 8;
export const ELITE_ORB = 12;
export const LENS_COOLDOWN = 0.18;

export const PLAYER_SPEED = 130;
export const DASH_SPEED = 380;
export const DASH_TIME = 0.14;
export const DASH_IFRAME = 0.35;
export const DASH_COOLDOWN = 0.8;
export const HURT_IFRAME = 0.45;
export const CONTACT_GAP = 0.55;

export const COLORS = ['fan', 'bolt', 'ofuda', 'fang', 'reel'];

export const SHARD_NAME = {
  fan: 'Fan',
  bolt: 'Bolt',
  ofuda: 'Ofuda',
  fang: 'Fang',
  reel: 'Reel',
};

export const SHARD_TINT = {
  fan: 0xff7ad9,
  bolt: 0x8fb7ff,
  ofuda: 0xff5a5a,
  fang: 0xb388ff,
  reel: 0xffd166,
};

export const RIFTS = {
  school: { id: 'school', name: 'Rooftop Club', tint: 0xff7ad9, views: 0, shard: 'fan', elite: 'Hall Monitor' },
  mecha: { id: 'mecha', name: 'Scrap Bay', tint: 0x8fb7ff, views: 2000, shard: 'bolt', elite: 'Forklift Ace' },
  shrine: { id: 'shrine', name: 'Lantern Stairs', tint: 0xff5a5a, views: 8000, shard: 'ofuda', elite: 'Bell Priest' },
  alley: { id: 'alley', name: 'Violet Alley', tint: 0xb388ff, views: 20000, shard: 'fang', elite: 'Mask Broker' },
  studio: { id: 'studio', name: 'Gold Set', tint: 0xffd166, views: 50000, shard: 'reel', elite: 'Director' },
  finale: { id: 'finale', name: 'Season Finale', tint: 0xf4f1ff, views: VIEWS_FINALE, shard: null, elite: 'The Algorithm' },
};

export const RIFT_ORDER = ['school', 'mecha', 'shrine', 'alley', 'studio', 'finale'];
export const EPISODE_IDS = ['school', 'mecha', 'shrine', 'alley', 'studio'];

export const RIFT_COMBAT = {
  school: { walker: 4, shooter: 1, walkerSpeed: 58, shooterSpeed: 36, eliteSpeed: 96, eliteTouch: 16, orbSpeed: 115 },
  mecha: { walker: 3, shooter: 3, walkerSpeed: 52, shooterSpeed: 34, eliteSpeed: 90, eliteTouch: 18, orbSpeed: 130 },
  shrine: { walker: 3, shooter: 2, walkerSpeed: 50, shooterSpeed: 32, eliteSpeed: 78, eliteTouch: 16, orbSpeed: 105 },
  alley: { walker: 5, shooter: 2, walkerSpeed: 78, shooterSpeed: 44, eliteSpeed: 112, eliteTouch: 18, orbSpeed: 145 },
  studio: { walker: 4, shooter: 3, walkerSpeed: 66, shooterSpeed: 40, eliteSpeed: 104, eliteTouch: 20, orbSpeed: 135 },
};

// Tier 0 is the free start and matches the first number in the spec
// (damage 10, HP 100, timer +0). Each purchase steps forward. Tier 3
// continues that step (32 damage, 220 HP, +30s) so the last payment
// changes the dive. Desk follows the spec formula exactly: 1 + 0.05 * tier.
export const LENS_DAMAGE = [10, 16, 24, 32];
export const HOOD_HP = [100, 140, 180, 220];
export const PASS_EXTRA = [0, 10, 20, 30];

export const GEAR = {
  lens: { name: 'Drone lens', costs: [300, 1500, 6000] },
  hood: { name: 'Hood', costs: [300, 1500, 6000] },
  desk: { name: 'Edit desk', costs: [500, 2000, 8000] },
  pass: { name: 'Night pass', costs: [800, 3000, 10000] },
};

export const RECIPES = [
  { id: 'cold', name: 'Cold Open', base: 120, picks: 1, each: 5, scrap: 0, subs: 0, bonus: 0, finale: false },
  { id: 'duo', name: 'Duo Cut', base: 400, picks: 2, each: 8, scrap: 0, subs: 0, bonus: 0, finale: false },
  { id: 'trio', name: 'Trio Edit', base: 900, picks: 3, each: 6, scrap: 0, subs: 1, bonus: 0, finale: false },
  { id: 'elite', name: 'Elite Cut', base: 1600, picks: 1, each: 10, scrap: 1, subs: 0, bonus: 10, finale: false },
  { id: 'season', name: 'Season Trailer', base: 5000, picks: 5, each: 12, scrap: 0, subs: 0, bonus: 0, finale: true },
];

export function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function emptyShards() {
  return { fan: 0, bolt: 0, ofuda: 0, fang: 0, reel: 0 };
}

export function defaultSave() {
  return {
    views: 0,
    subs: 0,
    shards: emptyShards(),
    scrap: 0,
    gear: { lens: 0, hood: 0, desk: 0, pass: 0 },
    elitesKilled: { school: false, mecha: false, shrine: false, alley: false, studio: false },
    finaleCleared: false,
    bestViews: 0,
    reviveDate: '',
    muted: false,
    seasonTrailerPosted: false,
    nextDiveBonus: { school: 0, mecha: 0, shrine: 0, alley: 0, studio: 0 },
  };
}

function num(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(num(value, min))));
}

export function normalize(raw) {
  const save = defaultSave();
  if (!raw || typeof raw !== 'object') return save;
  save.views = Math.max(0, Math.floor(num(raw.views)));
  save.subs = Math.max(0, Math.floor(num(raw.subs)));
  save.scrap = Math.max(0, Math.floor(num(raw.scrap)));
  save.bestViews = Math.max(save.views, Math.floor(num(raw.bestViews)));
  save.finaleCleared = !!raw.finaleCleared;
  save.muted = !!raw.muted;
  save.seasonTrailerPosted = !!raw.seasonTrailerPosted;
  save.reviveDate = typeof raw.reviveDate === 'string' ? raw.reviveDate : '';
  for (const color of COLORS) {
    save.shards[color] = Math.max(0, Math.floor(num(raw.shards?.[color])));
  }
  for (const id of Object.keys(save.gear)) {
    save.gear[id] = clampInt(raw.gear?.[id], 0, 3);
  }
  for (const id of EPISODE_IDS) {
    save.elitesKilled[id] = !!raw.elitesKilled?.[id];
    save.nextDiveBonus[id] = Math.max(0, Math.floor(num(raw.nextDiveBonus?.[id])));
  }
  save.bestViews = Math.max(save.bestViews, save.views);
  return save;
}

export function emptyPocket() {
  return { shards: emptyShards(), scrap: 0 };
}

export function formatNum(n) {
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.abs(Math.floor(n)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function todayStamp(date = new Date()) {
  const z = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${z(date.getMonth() + 1)}-${z(date.getDate())}`;
}

export function hasRevive(save, date = new Date()) {
  return save.reviveDate !== todayStamp(date);
}

export function lensStats(tier) {
  const index = clampInt(tier, 0, 3);
  return { damage: LENS_DAMAGE[index], cooldown: LENS_COOLDOWN };
}

export function maxHp(tier) {
  return HOOD_HP[clampInt(tier, 0, 3)];
}

export function timerSeconds(passTier, bonus = 0) {
  return DIVE_SECONDS + PASS_EXTRA[clampInt(passTier, 0, 3)] + Math.max(0, bonus);
}

export function gearSum(save) {
  return save.gear.lens + save.gear.hood + save.gear.desk + save.gear.pass;
}

export function gearBlurb(id, tier) {
  const index = clampInt(tier, 0, 3);
  if (id === 'lens') return `Damage ${LENS_DAMAGE[index]}`;
  if (id === 'hood') return `HP ${HOOD_HP[index]}`;
  if (id === 'desk') return `Views × ${(1 + 0.05 * index).toFixed(2)}`;
  return `Rift timer ${DIVE_SECONDS + PASS_EXTRA[index]}s`;
}

export function gearOffer(save, id) {
  const tier = save.gear[id];
  const maxed = tier >= 3;
  const cost = maxed ? 0 : GEAR[id].costs[tier];
  return {
    id,
    name: GEAR[id].name,
    tier,
    maxed,
    cost,
    affordable: !maxed && save.views >= cost,
    current: gearBlurb(id, tier),
    next: maxed ? '' : gearBlurb(id, tier + 1),
  };
}

export function buyGear(save, id) {
  if (!GEAR[id]) return { ok: false, reason: 'gear' };
  const tier = save.gear[id];
  if (tier >= 3) return { ok: false, reason: 'max' };
  const cost = GEAR[id].costs[tier];
  if (save.views < cost) return { ok: false, reason: 'views', cost };
  const next = clone(save);
  next.views -= cost;
  next.gear[id] += 1;
  return { ok: true, save: next, cost, tier: next.gear[id] };
}

export function viewsMath(base, deskTier, subs) {
  const desk = 1 + 0.05 * clampInt(deskTier, 0, 3);
  const subsCapBonus = Math.min(Math.max(0, Math.floor(num(subs))), SUBS_CAP);
  const sub = 1 + 0.02 * subsCapBonus;
  const amount = Math.floor(base * desk * sub);
  const text = `${formatNum(base)} × ${desk.toFixed(2)} desk × ${sub.toFixed(2)} subs = ${formatNum(amount)}`;
  return { amount, desk, sub, subsCapBonus, text };
}

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) || null;
}

export function recipePossible(save, recipe) {
  if (save.scrap < recipe.scrap) return false;
  if (recipe.picks === COLORS.length) {
    return COLORS.every((color) => save.shards[color] >= recipe.each);
  }
  const counts = COLORS.map((color) => save.shards[color]).sort((a, b) => b - a);
  return counts.slice(0, recipe.picks).every((count) => count >= recipe.each);
}

export function canCraft(save, recipe, colors) {
  const picked = recipe.picks === COLORS.length ? COLORS.slice() : colors;
  if (!picked || picked.length !== recipe.picks) return { ok: false, reason: 'pick' };
  if (new Set(picked).size !== picked.length) return { ok: false, reason: 'dup' };
  for (const color of picked) {
    if (!COLORS.includes(color)) return { ok: false, reason: 'color' };
    if (save.shards[color] < recipe.each) return { ok: false, reason: 'shards', color };
  }
  if (save.scrap < recipe.scrap) return { ok: false, reason: 'scrap' };
  return { ok: true, colors: picked };
}

export function craftShort(save, recipeId, colors) {
  const recipe = recipeById(recipeId);
  if (!recipe) return { ok: false, reason: 'recipe' };
  const check = canCraft(save, recipe, colors);
  if (!check.ok) return check;
  const next = clone(save);
  for (const color of check.colors) next.shards[color] -= recipe.each;
  next.scrap -= recipe.scrap;
  const math = viewsMath(recipe.base, next.gear.desk, next.subs);
  next.views += math.amount;
  next.bestViews = Math.max(next.bestViews, next.views);
  next.subs += recipe.subs;
  let bonusRift = null;
  if (recipe.bonus > 0 && check.colors.length === 1) {
    bonusRift = EPISODE_IDS.find((id) => RIFTS[id].shard === check.colors[0]) || null;
    if (bonusRift) next.nextDiveBonus[bonusRift] += recipe.bonus;
  }
  if (recipe.finale) next.seasonTrailerPosted = true;
  return { ok: true, save: next, math, recipe, colors: check.colors, bonusRift };
}

export function applyExtract(save, pocket) {
  const next = clone(save);
  for (const color of COLORS) next.shards[color] += Math.max(0, Math.floor(num(pocket?.shards?.[color])));
  next.scrap += Math.max(0, Math.floor(num(pocket?.scrap)));
  return next;
}

export function takeDiveBonus(save, riftId) {
  const next = clone(save);
  const bonus = next.nextDiveBonus[riftId] || 0;
  if (riftId in next.nextDiveBonus) next.nextDiveBonus[riftId] = 0;
  return { save: next, bonus };
}

export function riftUnlocked(save, id) {
  if (id === 'finale') return finaleStatus(save).unlocked;
  const rift = RIFTS[id];
  if (!rift) return false;
  return save.bestViews >= rift.views;
}

export function finaleStatus(save) {
  const elites = EPISODE_IDS.filter((id) => save.elitesKilled[id]).length;
  const viewsOk = save.bestViews >= VIEWS_FINALE;
  const elitesOk = elites === EPISODE_IDS.length;
  const trailerOk = !!save.seasonTrailerPosted;
  return {
    unlocked: viewsOk && elitesOk && trailerOk,
    elites,
    viewsOk,
    elitesOk,
    trailerOk,
  };
}

export function spawnBudget(riftId, gearTotal) {
  if (riftId === 'finale') return { walker: 0, shooter: 0, elite: 0 };
  const base = RIFT_COMBAT[riftId] || RIFT_COMBAT.school;
  const extra = Math.min(4, Math.floor(Math.max(0, gearTotal) / 2));
  return {
    walker: base.walker + extra,
    shooter: base.shooter + Math.floor(extra / 2),
    elite: 1,
  };
}

export function rollEliteShards(rng = Math.random) {
  return 8 + Math.floor(rng() * 5);
}

export function formatPocket(pocket) {
  const parts = COLORS
    .filter((color) => pocket?.shards?.[color])
    .map((color) => `${pocket.shards[color]} ${SHARD_NAME[color]}`);
  if (pocket?.scrap) parts.push(`${pocket.scrap} scrap`);
  return parts.join(' · ') || 'nothing';
}

export function riftForShard(color) {
  return EPISODE_IDS.find((id) => RIFTS[id].shard === color) || null;
}
