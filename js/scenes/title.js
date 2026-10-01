import { BUILD } from '../config.js';
import { getSave, hasSave, resetSave, setSave } from '../state.js';
import { applyMute, bindAudio, sfx } from '../audio.js';
import { button, text } from '../ui.js';

export class Title extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    applyMute(this, getSave().muted);
    bindAudio(this, 'title');
    this.add.tileSprite(240, 427, 480, 854, 'td', 0).setTint(0x2a1438);
    this.ui = [];
    this.confirming = false;
    this.draw();
  }

  later(fn) {
    this.time.delayedCall(0, fn);
  }

  clearUi() {
    this.ui.forEach((node) => node.destroy());
    this.ui = [];
  }

  track(node) {
    this.ui.push(node);
    return node;
  }

  draw() {
    this.clearUi();
    const save = getSave();
    this.track(text(this, 240, 188, 'BRO TV', 52, '#ff2bd6'));
    if (save.finaleCleared) this.track(text(this, 392, 150, '★', 28, '#ffd166'));
    this.track(text(this, 240, 248, 'NIGHT RIFT', 22, '#3dfff3'));
    this.track(text(this, 240, 300, 'Night editor. Open a rift.\nCut the episode. Post it.', 14, '#9a93ad'));

    if (this.confirming) {
      this.track(text(this, 240, 400, 'Wipe this channel?\nViews, gear, and shards go.', 16, '#ffd166'));
      this.track(button(this, 240, 500, 320, 64, 'Wipe and start', () => {
        sfx(this, 'click');
        resetSave();
        this.later(() => this.scene.start('hub'));
      }));
      this.track(button(this, 240, 580, 320, 56, 'Back', () => {
        this.confirming = false;
        this.later(() => this.draw());
      }, { stroke: 0xff2bd6 }));
    } else {
      let y = 420;
      if (hasSave()) {
        this.track(button(this, 240, y, 320, 64, 'Continue', () => {
          sfx(this, 'click');
          this.later(() => this.scene.start('hub'));
        }));
        y += 84;
      }
      this.track(button(this, 240, y, 320, 64, 'New run', () => {
        sfx(this, 'click');
        if (!hasSave()) {
          resetSave();
          this.later(() => this.scene.start('hub'));
          return;
        }
        this.confirming = true;
        this.later(() => this.draw());
      }, { stroke: 0xff2bd6 }));
      this.track(button(this, 240, y + 84, 320, 56, save.muted ? 'Sound off' : 'Sound on', () => {
        const next = getSave();
        next.muted = !next.muted;
        if (hasSave()) setSave(next);
        applyMute(this, next.muted);
        sfx(this, 'click');
        this.later(() => this.draw());
      }));
    }
    this.track(text(this, 240, 800, `WASD · mouse · on-screen buttons\nbuild ${BUILD}`, 12, '#6d6780'));
  }
}
