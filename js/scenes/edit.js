import { FRAME } from '../config.js';
import {
  COLORS, RECIPES, RIFTS, SHARD_NAME, SHARD_TINT,
  canCraft, craftShort, finaleStatus, formatNum, recipePossible, viewsMath,
} from '../rules.js';
import { getSave, setSave } from '../state.js';
import { applyMute, bindAudio, sfx } from '../audio.js';
import { button, text } from '../ui.js';

const COST = {
  cold: '5 of one color',
  duo: '8 + 8 of two colors',
  trio: '6 of three colors · +1 sub',
  elite: '10 of one color + 1 scrap · next dive +10s',
  season: '12 of every color · finale key',
};

export class EditBay extends Phaser.Scene {
  constructor() {
    super('edit');
  }

  init(data) {
    this.banked = data?.banked || '';
    this.fromExtract = data?.from === 'extract';
  }

  create() {
    const save = getSave();
    applyMute(this, save.muted);
    bindAudio(this, 'hub');
    this.add.tileSprite(240, 427, 480, 854, 'td', FRAME.floorA).setTint(0x241428);
    this.selected = [];
    this.recipe = null;
    this.busy = false;
    this.posted = false;
    this.ui = [];
    this.drawList();
  }

  later(fn) {
    this.time.delayedCall(0, fn);
  }

  clear() {
    if (this.viewTween) {
      this.viewTween.stop();
      this.viewTween = null;
    }
    this.ui.forEach((node) => node.destroy());
    this.ui = [];
  }

  track(node) {
    this.ui.push(node);
    return node;
  }

  wallet() {
    const save = getSave();
    const line = COLORS.map((color) => `${SHARD_NAME[color]} ${save.shards[color]}`).join('  ');
    return `${line}\nscrap ${save.scrap}  ·  ${formatNum(save.views)} views  ·  ${save.subs} subs`;
  }

  drawList() {
    this.clear();
    this.recipe = null;
    this.track(text(this, 240, 42, 'EDIT BAY', 22, '#ff2bd6'));
    this.track(text(this, 240, 92, this.wallet(), 12, '#e8fbff'));
    if (this.banked) this.track(text(this, 240, 132, `Banked ${this.banked}`, 13, '#ffd166'));
    const save = getSave();
    RECIPES.forEach((recipe, index) => {
      const ready = recipePossible(save, recipe);
      const y = 190 + index * 100;
      this.track(button(this, 240, y, 420, 88, `${recipe.name}\n${COST[recipe.id]}\n${ready ? 'ready' : 'short'}`, () => {
        sfx(this, 'click');
        this.recipe = recipe;
        this.selected = [];
        this.later(() => this.drawDetail());
      }, { stroke: ready ? 0x3dfff3 : 0x4a4458, size: 15 }));
    });
    this.track(button(this, 240, 790, 220, 48, 'Studio', () => {
      sfx(this, 'click');
      const note = this.posted ? 'Short is up.' : (this.fromExtract ? 'Shards banked.' : '');
      this.later(() => this.scene.start('hub', { note }));
    }, { stroke: 0xff2bd6 }));
  }

  drawDetail() {
    this.clear();
    const recipe = this.recipe;
    const save = getSave();
    const math = viewsMath(recipe.base, save.gear.desk, save.subs);
    this.track(text(this, 240, 48, recipe.name, 22, '#ff2bd6'));
    this.track(text(this, 240, 90, COST[recipe.id], 13, '#9a93ad'));
    this.track(text(this, 240, 122, this.wallet(), 12, '#e8fbff'));
    this.track(text(this, 240, 168, math.text, 13, '#ffd166'));
    if (recipe.picks < COLORS.length) {
      COLORS.forEach((color, index) => {
        const count = save.shards[color];
        const enough = count >= recipe.each;
        const on = this.selected.includes(color);
        this.track(button(this, 56 + index * 88, 260, 80, 64, `${SHARD_NAME[color]}\n${count}/${recipe.each}`, () => this.toggleColor(color), {
          disabled: !enough,
          stroke: on ? 0xffd166 : SHARD_TINT[color],
          size: 12,
        }));
      });
      this.track(text(this, 240, 330, `Pick ${recipe.picks}`, 13, '#9a93ad'));
    }
    const check = canCraft(save, recipe, this.selected);
    const reason = check.ok ? `Craft & post\n${math.text}` : this.blockReason(check.reason, recipe);
    this.track(button(this, 240, 420, 420, 84, reason, () => this.beginPost(), {
      disabled: !check.ok || this.busy,
      size: 14,
    }));
    this.track(button(this, 240, 780, 220, 48, 'Back', () => {
      sfx(this, 'click');
      this.later(() => this.drawList());
    }, { stroke: 0xff2bd6 }));
  }

  blockReason(reason, recipe) {
    if (reason === 'scrap') return 'Need 1 scrap';
    if (reason === 'shards') return 'Need more shards';
    if (reason === 'pick' || reason === 'dup') return `Pick ${recipe.picks} color${recipe.picks === 1 ? '' : 's'}`;
    return 'Cannot post';
  }

  toggleColor(color) {
    const recipe = this.recipe;
    const save = getSave();
    if (save.shards[color] < recipe.each) return;
    const index = this.selected.indexOf(color);
    if (index >= 0) this.selected.splice(index, 1);
    else if (this.selected.length < recipe.picks) this.selected.push(color);
    sfx(this, 'click');
    this.later(() => this.drawDetail());
  }

  beginPost() {
    if (this.busy || !this.recipe) return;
    const result = craftShort(getSave(), this.recipe.id, this.selected);
    if (!result.ok) {
      sfx(this, 'fail');
      return;
    }
    setSave(result.save);
    this.posted = true;
    this.busy = true;
    sfx(this, 'click');
    this.later(() => this.drawUpload(result));
  }

  drawUpload(result) {
    this.clear();
    this.track(text(this, 240, 250, 'UPLOADING', 24, '#3dfff3'));
    const back = this.add.rectangle(240, 310, 320, 16, 0x241428).setStrokeStyle(2, 0xff2bd6);
    const bar = this.add.rectangle(80, 310, 320, 16, 0x3dfff3).setOrigin(0, 0.5);
    bar.scaleX = 0;
    this.track(back);
    this.track(bar);
    this.tweens.add({
      targets: bar,
      scaleX: 1,
      duration: 1500,
      onComplete: () => this.showReceipt(result),
    });
  }

  showReceipt(result) {
    this.clear();
    const save = result.save;
    const status = finaleStatus(save);
    const lines = [result.math.text, `${formatNum(save.views)} views`];
    if (result.recipe.subs) lines.push('+1 sub');
    if (result.bonusRift) lines.push(`Next ${RIFTS[result.bonusRift].name} dive +10s`);
    if (result.recipe.finale && status.unlocked) lines.push('Finale door is open.');
    else if (result.recipe.finale) lines.push('Trailer locked in.');
    this.track(text(this, 240, 220, 'SHORT IS UP', 24, '#ff2bd6'));
    this.track(text(this, 240, 320, lines.join('\n'), 16, '#e8fbff'));
    const counter = { value: save.views - result.math.amount };
    const total = this.track(text(this, 240, 430, `${formatNum(Math.floor(counter.value))} views`, 22, '#3dfff3'));
    this.viewTween = this.tweens.add({
      targets: counter,
      value: save.views,
      duration: 700,
      onUpdate: () => {
        if (total.active) total.setText(`${formatNum(Math.floor(counter.value))} views`);
      },
    });
    this.track(button(this, 240, 560, 280, 60, 'Back to the bay', () => {
      sfx(this, 'confirm');
      this.busy = false;
      this.selected = [];
      this.later(() => this.drawList());
    }));
    this.track(button(this, 240, 640, 280, 56, 'Studio', () => {
      sfx(this, 'click');
      this.later(() => this.scene.start('hub', { note: 'Short is up.' }));
    }, { stroke: 0xff2bd6 }));
    sfx(this, 'confirm');
  }
}
