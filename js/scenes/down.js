import { FRAME } from '../config.js';
import { formatNum } from '../rules.js';
import { getSave } from '../state.js';
import { applyMute, bindAudio, sfx } from '../audio.js';
import { button, text } from '../ui.js';

export class Down extends Phaser.Scene {
  constructor() {
    super('down');
  }

  init(data) {
    this.reason = data?.reason || 'The episode died in the edit.';
  }

  create() {
    const save = getSave();
    applyMute(this, save.muted);
    bindAudio(this, 'hub');
    this.add.tileSprite(240, 427, 480, 854, 'td', FRAME.floorA).setTint(0x180810);
    text(this, 240, 240, 'CHANNEL KILLED', 26, '#ff5a7a');
    text(this, 240, 320, 'The episode died in the edit.\nGear, views, and banked shards stay.', 15, '#e8fbff');
    text(this, 240, 400, this.reason, 14, '#ffd166');
    text(this, 240, 470, `${formatNum(save.views)} views\n${formatNum(save.subs)} subs`, 16, '#3dfff3');
    button(this, 240, 580, 300, 64, 'Back to the studio', () => {
      sfx(this, 'click');
      this.time.delayedCall(0, () => this.scene.start('hub'));
    });
  }
}
