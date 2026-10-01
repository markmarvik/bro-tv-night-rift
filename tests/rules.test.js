import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DIVE_SECONDS, HOOD_HP, LENS_DAMAGE, PASS_EXTRA, SAVE_KEY, SUBS_CAP,
  applyExtract, buyGear, canCraft, craftShort, defaultSave, emptyPocket,
  finaleStatus, formatNum, gearOffer, hasRevive, lensStats, maxHp, normalize,
  recipePossible, riftUnlocked, rollEliteShards, spawnBudget, takeDiveBonus,
  timerSeconds, todayStamp, viewsMath,
} from '../js/rules.js';

test('save key matches the spec', () => {
  assert.equal(SAVE_KEY, 'brotv_night_rift_v1');
});

test('views formula uses desk tier and a subs cap', () => {
  assert.deepEqual(
    viewsMath(120, 0, 0),
    { amount: 120, desk: 1, sub: 1, subsCapBonus: 0, text: '120 × 1.00 desk × 1.00 subs = 120' },
  );
  const mid = viewsMath(900, 2, 10);
  assert.equal(mid.amount, 1188);
  assert.equal(mid.text, '900 × 1.10 desk × 1.20 subs = 1,188');
  const capped = viewsMath(5000, 3, 100);
  assert.equal(capped.subsCapBonus, SUBS_CAP);
  assert.equal(capped.amount, 8625);
});

test('formatNum groups thousands', () => {
  assert.equal(formatNum(100000), '100,000');
  assert.equal(formatNum(0), '0');
});

test('gear steps and purchases', () => {
  assert.deepEqual(LENS_DAMAGE, [10, 16, 24, 32]);
  assert.deepEqual(HOOD_HP, [100, 140, 180, 220]);
  assert.deepEqual(PASS_EXTRA, [0, 10, 20, 30]);
  assert.equal(lensStats(0).damage, 10);
  assert.equal(lensStats(0).cooldown, 0.18);
  assert.equal(maxHp(2), 180);
  assert.equal(timerSeconds(0, 0), DIVE_SECONDS);
  assert.equal(timerSeconds(1, 0), 80);
  assert.equal(timerSeconds(3, 10), 110);

  let save = defaultSave();
  save.views = 300;
  const first = buyGear(save, 'lens');
  assert.equal(first.ok, true);
  assert.equal(first.save.views, 0);
  assert.equal(first.save.gear.lens, 1);
  assert.equal(save.gear.lens, 0);
  assert.equal(buyGear(first.save, 'lens').ok, false);

  save = defaultSave();
  save.views = 300 + 1500 + 6000;
  for (let i = 0; i < 3; i += 1) save = buyGear(save, 'hood').save;
  assert.equal(save.gear.hood, 3);
  assert.equal(save.views, 0);
  assert.equal(buyGear(save, 'hood').reason, 'max');
  assert.equal(gearOffer(defaultSave(), 'desk').cost, 500);
});

test('crafting spends shards, posts views, and leaves the input alone', () => {
  const save = defaultSave();
  save.shards.fan = 10;
  save.shards.bolt = 8;
  save.gear.desk = 1;
  const before = structuredClone(save);
  const cold = craftShort(save, 'cold', ['fan']);
  assert.equal(cold.ok, true);
  assert.equal(cold.save.shards.fan, 5);
  assert.equal(cold.math.amount, 126);
  assert.equal(cold.save.bestViews, 126);
  assert.deepEqual(save, before);

  const poor = craftShort(cold.save, 'duo', ['fan', 'bolt']);
  assert.equal(poor.ok, false);

  const duoSave = defaultSave();
  duoSave.shards.fan = 8;
  duoSave.shards.bolt = 8;
  const duo = craftShort(duoSave, 'duo', ['fan', 'bolt']);
  assert.equal(duo.ok, true);
  assert.equal(duo.save.shards.fan, 0);
  assert.equal(duo.math.amount, 400);

  const eliteSave = defaultSave();
  eliteSave.shards.ofuda = 10;
  eliteSave.scrap = 1;
  const elite = craftShort(eliteSave, 'elite', ['ofuda']);
  assert.equal(elite.ok, true);
  assert.equal(elite.save.scrap, 0);
  assert.equal(elite.save.nextDiveBonus.shrine, 10);
  assert.equal(elite.bonusRift, 'shrine');

  const noScrap = craftShort({ ...eliteSave, scrap: 0, shards: { ...eliteSave.shards } }, 'elite', ['ofuda']);
  assert.equal(noScrap.reason, 'scrap');
  assert.equal(canCraft(eliteSave, elite.recipe, ['ofuda', 'fan']).reason, 'pick');
});

test('trio grants a sub and the season trailer is the finale key', () => {
  const save = defaultSave();
  save.shards = { fan: 6, bolt: 6, ofuda: 6, fang: 0, reel: 0 };
  const trio = craftShort(save, 'trio', ['fan', 'bolt', 'ofuda']);
  assert.equal(trio.ok, true);
  assert.equal(trio.save.subs, 1);
  assert.equal(trio.math.amount, 900);

  const rich = defaultSave();
  for (const color of Object.keys(rich.shards)) rich.shards[color] = 12;
  assert.equal(recipePossible(rich, trio.recipe), true);
  const season = craftShort(rich, 'season', []);
  assert.equal(season.ok, true);
  assert.equal(season.save.seasonTrailerPosted, true);
  assert.equal(season.save.shards.fan, 0);
  assert.equal(finaleStatus(season.save).trailerOk, true);
  assert.equal(finaleStatus(season.save).unlocked, false);
  season.save.bestViews = 100000;
  for (const id of Object.keys(season.save.elitesKilled)) season.save.elitesKilled[id] = true;
  assert.equal(finaleStatus(season.save).unlocked, true);
  assert.equal(riftUnlocked(season.save, 'finale'), true);
});

test('rifts stay open from best views after the wallet is spent', () => {
  const save = defaultSave();
  assert.equal(riftUnlocked(save, 'school'), true);
  assert.equal(riftUnlocked(save, 'mecha'), false);
  save.bestViews = 2000;
  save.views = 0;
  assert.equal(riftUnlocked(save, 'mecha'), true);
  assert.equal(riftUnlocked(save, 'shrine'), false);
});

test('extract banks the pocket and death would not need to touch gear', () => {
  const save = defaultSave();
  save.gear.hood = 2;
  save.shards.fan = 1;
  const next = applyExtract(save, { shards: { fan: 4, bolt: 0, ofuda: 0, fang: 0, reel: 0 }, scrap: 1 });
  assert.equal(next.shards.fan, 5);
  assert.equal(next.scrap, 1);
  assert.equal(next.gear.hood, 2);
  assert.equal(save.shards.fan, 1);
  const bonus = takeDiveBonus(next, 'school');
  next.nextDiveBonus.school = 20;
  const taken = takeDiveBonus(next, 'school');
  assert.equal(taken.bonus, 20);
  assert.equal(taken.save.nextDiveBonus.school, 0);
  assert.equal(bonus.bonus, 0);
});

test('revive is one local calendar day', () => {
  const save = defaultSave();
  const day = new Date(2026, 9, 1);
  assert.equal(todayStamp(day), '2026-10-01');
  assert.equal(hasRevive(save, day), true);
  save.reviveDate = '2026-10-01';
  assert.equal(hasRevive(save, day), false);
  assert.equal(hasRevive(save, new Date(2026, 9, 2)), true);
});

test('normalize fills a partial save and keeps mute', () => {
  const save = normalize({ views: 40, shards: { fan: 2 }, gear: { lens: 9 }, muted: true });
  assert.equal(save.views, 40);
  assert.equal(save.bestViews, 40);
  assert.equal(save.shards.fan, 2);
  assert.equal(save.shards.bolt, 0);
  assert.equal(save.gear.lens, 3);
  assert.equal(save.gear.hood, 0);
  assert.equal(save.muted, true);
  assert.equal(save.finaleCleared, false);
  assert.deepEqual(emptyPocket().shards, { fan: 0, bolt: 0, ofuda: 0, fang: 0, reel: 0 });
});

test('enemy counts grow with gear and elite shards stay in range', () => {
  assert.deepEqual(spawnBudget('school', 0), { walker: 4, shooter: 1, elite: 1 });
  assert.deepEqual(spawnBudget('school', 4), { walker: 6, shooter: 2, elite: 1 });
  assert.equal(spawnBudget('alley', 100).walker, 9);
  assert.equal(spawnBudget('finale', 12).walker, 0);
  assert.equal(rollEliteShards(() => 0), 8);
  assert.equal(rollEliteShards(() => 0.999), 12);
});
