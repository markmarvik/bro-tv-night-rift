import { W, H } from './config.js';
import { Boot } from './scenes/boot.js';
import { Title } from './scenes/title.js';
import { Hub } from './scenes/hub.js';
import { Dive } from './scenes/dive.js';
import { EditBay } from './scenes/edit.js';
import { Down } from './scenes/down.js';
import { Ending } from './scenes/ending.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#07060d',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  input: { activePointers: 4 },
  scene: [Boot, Title, Hub, Dive, EditBay, Down, Ending],
});
