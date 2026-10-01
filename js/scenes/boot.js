import { bootSave, getSave } from '../state.js';
import { applyMute } from '../audio.js';

export class Boot extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    const label = this.add.text(240, 420, 'LOADING', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '20px',
      color: '#3dfff3',
    }).setOrigin(0.5);
    this.load.on('progress', (value) => {
      label.setText(`LOADING ${Math.floor(value * 100)}`);
    });
    this.load.spritesheet('td', 'assets/kenney/tiny-dungeon-sheet.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    ['shoot', 'hit', 'hurt', 'smash', 'elite', 'pickup', 'click', 'confirm', 'fail']
      .forEach((key) => this.load.audio(key, `assets/sfx/${key}.ogg`));
  }

  create() {
    this.textures.get('td').setFilter(Phaser.Textures.FilterMode.NEAREST);
    paintTextures(this);
    const keys = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard?.addCapture([
      keys.UP, keys.DOWN, keys.LEFT, keys.RIGHT, keys.SPACE,
      keys.SHIFT, keys.W, keys.A, keys.S, keys.D,
    ]);
    this.input.mouse?.disableContextMenu();
    bootSave();
    applyMute(this, getSave().muted);
    this.scene.start('title');
  }
}

function paintTextures(scene) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0xff2bd6, 1);
  g.fillCircle(6, 6, 6);
  g.fillStyle(0xe8fbff, 1);
  g.fillCircle(6, 6, 3);
  g.generateTexture('bullet', 12, 12);
  g.clear();

  g.fillStyle(0xff4d6a, 1);
  g.fillCircle(7, 7, 7);
  g.fillStyle(0xffd0dc, 1);
  g.fillCircle(7, 7, 3);
  g.generateTexture('orb', 14, 14);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillTriangle(8, 1, 15, 8, 8, 15);
  g.fillTriangle(8, 1, 1, 8, 8, 15);
  g.generateTexture('shard', 16, 16);
  g.clear();

  g.fillStyle(0x14121c, 1);
  g.fillCircle(10, 10, 8);
  g.fillStyle(0x3dfff3, 1);
  g.fillCircle(10, 10, 4.5);
  g.fillStyle(0xff2bd6, 1);
  g.fillCircle(14, 10, 2.4);
  g.generateTexture('drone', 20, 20);
  g.clear();

  g.fillStyle(0xf4f1ff, 1);
  g.fillCircle(24, 24, 22);
  g.fillStyle(0xff2bd6, 1);
  g.fillCircle(24, 24, 8);
  g.fillStyle(0x3dfff3, 1);
  g.fillCircle(24, 24, 3);
  g.generateTexture('core', 48, 48);
  g.destroy();
}
