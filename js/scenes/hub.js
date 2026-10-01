import { FRAME } from '../config.js';
import {
  COLORS, GEAR, RIFT_ORDER, RIFTS, SHARD_NAME,
  finaleStatus, formatNum, gearOffer, buyGear, riftUnlocked,
} from '../rules.js';
import { getSave, setSave } from '../state.js';
import { applyMute, bindAudio, sfx } from '../audio.js';
import { button, scrim, text } from '../ui.js';

export class Hub extends Phaser.Scene {
  constructor() {
    super('hub');
  }

  init(data) {
    this.note = data?.note || '';
  }

  create() {
    setSave(getSave());
    applyMute(this, getSave().muted);
    bindAudio(this, 'hub');
    this.add.tileSprite(240, 427, 480, 854, 'td', FRAME.floorA).setTint(0x241428);
    this.overlay = [];
    this.viewsText = text(this, 240, 118, '', 28, '#3dfff3');
    this.metaText = text(this, 240, 156, '', 13, '#9a93ad');
    this.shardText = text(this, 240, 186, '', 12, '#e8fbff');
    this.gearText = text(this, 240, 210, '', 12, '#ffd166');
    this.noteText = text(this, 240, 242, '', 13, '#ff7ad9');
    text(this, 240, 58, 'BRO TV', 36, '#ff2bd6');
    text(this, 240, 90, 'STUDIO', 12, '#9a93ad');
    this.menu = [];
    this.refreshStats();
    this.drawMenu();
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.overlay.length) this.later(() => this.closeOverlay());
    });
  }

  later(fn) {
    this.time.delayedCall(0, fn);
  }

  refreshStats() {
    const save = getSave();
    this.viewsText.setText(`${formatNum(save.views)} views`);
    this.metaText.setText(`${formatNum(save.subs)} subs  ·  best ${formatNum(save.bestViews)}`);
    const shards = COLORS.map((color) => `${SHARD_NAME[color]} ${save.shards[color]}`).join('  ');
    this.shardText.setText(save.scrap ? `${shards}  ·  scrap ${save.scrap}` : shards);
    const gear = save.gear;
    this.gearText.setText(`Lens ${gear.lens}  Hood ${gear.hood}  Desk ${gear.desk}  Pass ${gear.pass}`);
    this.noteText.setText(this.note);
  }

  clearMenu() {
    this.menu.forEach((node) => node.destroy());
    this.menu = [];
  }

  closeOverlay() {
    this.overlay.forEach((node) => node.destroy());
    this.overlay = [];
  }

  trackOverlay(node) {
    this.overlay.push(node);
    return node;
  }

  drawMenu() {
    this.clearMenu();
    const save = getSave();
    const finale = finaleStatus(save);
    const items = [
      ['Open a rift', () => this.openRifts(), 0x3dfff3],
      ['Edit bay', () => this.later(() => this.scene.start('edit')), 0xff2bd6],
      ['Upgrade wall', () => this.openUpgrades(), 0xffd166],
    ];
    items.forEach(([label, fn, stroke], index) => {
      this.menu.push(button(this, 240, 330 + index * 86, 400, 70, label, () => {
        sfx(this, 'click');
        fn();
      }, { stroke }));
    });
    const finaleLabel = finale.unlocked
      ? 'Season finale'
      : `Finale locked\n${finale.elites}/5 elites · trailer ${finale.trailerOk ? 'yes' : 'no'}`;
    this.menu.push(button(this, 240, 588, 400, 70, finaleLabel, () => {
      sfx(this, finale.unlocked ? 'confirm' : 'fail');
      if (finale.unlocked) this.later(() => this.scene.start('dive', { rift: 'finale' }));
      else this.openRifts();
    }, { stroke: finale.unlocked ? 0xffd166 : 0x4a4458, disabled: false }));
    this.menu.push(text(this, 240, 700, `Best views · this browser\n${formatNum(save.bestViews)}`, 14, '#9a93ad'));
    this.menu.push(button(this, 240, 780, 220, 48, save.muted ? 'Sound off' : 'Sound on', () => {
      const next = getSave();
      next.muted = !next.muted;
      setSave(next);
      applyMute(this, next.muted);
      sfx(this, 'click');
      this.later(() => {
        this.refreshStats();
        this.drawMenu();
      });
    }, { size: 14 }));
  }

  openRifts() {
    this.closeOverlay();
    const save = getSave();
    this.trackOverlay(scrim(this, 40));
    this.trackOverlay(text(this, 240, 48, 'TONIGHT\'S RIFTS', 18, '#3dfff3').setDepth(50));
    RIFT_ORDER.forEach((id, index) => {
      const rift = RIFTS[id];
      const open = riftUnlocked(save, id);
      const y = 118 + index * 96;
      let detail;
      if (id === 'finale') {
        const status = finaleStatus(save);
        detail = `${formatNum(save.bestViews)}/${formatNum(rift.views)} · elites ${status.elites}/5 · trailer ${status.trailerOk ? 'yes' : 'no'}`;
      } else if (open) {
        detail = `${SHARD_NAME[rift.shard]} shards · ${rift.elite}${save.elitesKilled[id] ? ' down' : ''}`;
      } else {
        detail = `Needs ${formatNum(rift.views)} best views`;
      }
      const node = button(this, 240, y, 420, 84, `${rift.name}\n${detail}`, () => {
        if (!open) {
          sfx(this, 'fail');
          return;
        }
        sfx(this, 'confirm');
        this.later(() => this.scene.start('dive', { rift: id }));
      }, { depth: 50, stroke: open ? rift.tint : 0x4a4458, size: 15 });
      this.trackOverlay(node);
    });
    this.trackOverlay(button(this, 240, 800, 220, 48, 'Back', () => {
      sfx(this, 'click');
      this.later(() => this.closeOverlay());
    }, { depth: 50, stroke: 0xff2bd6 }));
  }

  openUpgrades() {
    this.closeOverlay();
    const save = getSave();
    this.trackOverlay(scrim(this, 40));
    this.trackOverlay(text(this, 240, 52, 'UPGRADE WALL', 18, '#ffd166').setDepth(50));
    this.trackOverlay(text(this, 240, 82, `${formatNum(save.views)} views to spend`, 13, '#9a93ad').setDepth(50));
    Object.keys(GEAR).forEach((id, index) => {
      const offer = gearOffer(save, id);
      const y = 180 + index * 140;
      const line = offer.maxed
        ? `${offer.name}  MAX\n${offer.current}`
        : `${offer.name}  tier ${offer.tier}/3\n${offer.current}  →  ${offer.next}`;
      this.trackOverlay(text(this, 240, y, line, 15, '#e8fbff').setDepth(50));
      const label = offer.maxed ? 'Maxed' : (offer.affordable ? `Buy  ${formatNum(offer.cost)}` : `Need ${formatNum(offer.cost)}`);
      this.trackOverlay(button(this, 240, y + 48, 280, 48, label, () => {
        const result = buyGear(getSave(), id);
        if (!result.ok) {
          sfx(this, 'fail');
          return;
        }
        setSave(result.save);
        sfx(this, 'confirm');
        this.refreshStats();
        this.later(() => this.openUpgrades());
      }, { depth: 50, disabled: !offer.affordable, size: 15 }));
    });
    this.trackOverlay(button(this, 240, 800, 220, 48, 'Back', () => {
      sfx(this, 'click');
      this.later(() => {
        this.closeOverlay();
        this.drawMenu();
      });
    }, { depth: 50, stroke: 0xff2bd6 }));
  }
}
