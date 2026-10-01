import { FRAME } from '../config.js';
import { formatNum } from '../rules.js';
import { getSave } from '../state.js';
import { applyMute, bindAudio, sfx } from '../audio.js';
import { button, text } from '../ui.js';

export class Ending extends Phaser.Scene {
  constructor() {
    super('ending');
  }

  create() {
    const save = getSave();
    applyMute(this, save.muted);
    bindAudio(this, 'finale');
    this.add.tileSprite(240, 427, 480, 854, 'td', FRAME.floorA).setTint(0xf4f1ff).setAlpha(0.35);
    text(this, 240, 220, '★', 42, '#ffd166');
    text(this, 240, 300, 'BRO TV hit season finale.', 18, '#ff2bd6');
    text(this, 240, 360, `Subs: ${formatNum(save.subs)}. Views: ${formatNum(save.views)}.`, 16, '#e8fbff');
    text(this, 240, 430, 'The channel stays open.', 14, '#9a93ad');
    button(this, 240, 540, 300, 64, 'Back to the studio', () => {
      sfx(this, 'click');
      this.time.delayedCall(0, () => this.scene.start('hub'));
    });
  }
}
