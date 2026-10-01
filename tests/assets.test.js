import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sounds = ['shoot', 'hit', 'hurt', 'smash', 'elite', 'pickup', 'click', 'confirm', 'fail'];

test('the page and Kenney files the game loads are in the repo', () => {
  const files = [
    'index.html',
    'css/style.css',
    'js/main.js',
    'assets/kenney/tiny-dungeon-sheet.png',
    ...sounds.map((name) => `assets/sfx/${name}.ogg`),
  ];
  for (const file of files) assert.equal(fs.existsSync(file), true, file);
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /phaser@3\.80\.1/);
  assert.match(html, /js\/main\.js/);
  const boot = fs.readFileSync('js/scenes/boot.js', 'utf8');
  for (const name of sounds) assert.match(boot, new RegExp(name));
});
