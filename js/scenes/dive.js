import { FRAME, H, TILE, W } from '../config.js';
import { DIVE_MAP, FINALE_MAP, analyze } from '../maps.js';
import {
  ATTRACT, CONTACT_GAP, CORE_HP, DASH_COOLDOWN, DASH_IFRAME, DASH_SPEED, DASH_TIME,
  ELITE_HP, ELITE_ORB, EXTRACT_AT, FINALE_SECONDS, HURT_IFRAME, ORB_DAMAGE,
  PLAYER_SPEED, RIFT_COMBAT, RIFTS, SHARD_NAME, SHARD_TINT, SHOOTER_HP, WALKER_HP,
  WALKER_TOUCH, applyExtract, formatPocket, gearSum, hasRevive, lensStats, maxHp,
  rollEliteShards, spawnBudget, takeDiveBonus, timerSeconds, todayStamp,
} from '../rules.js';
import { getSave, setSave } from '../state.js';
import { applyMute, bindAudio, sfx } from '../audio.js';
import { button, scrim, text } from '../ui.js';

const HOLD = 0.55;

function darken(hex, amount) {
  const r = Math.round(((hex >> 16) & 255) * amount);
  const g = Math.round(((hex >> 8) & 255) * amount);
  const b = Math.round((hex & 255) * amount);
  return (r << 16) | (g << 8) | b;
}

export class Dive extends Phaser.Scene {
  constructor() {
    super('dive');
  }

  init(data) {
    this.riftId = data?.rift && RIFTS[data.rift] ? data.rift : 'school';
  }

  create() {
    // Death and extract pause this world. Shutdown usually builds a new one;
    // resume if that world was kept.
    this.physics.resume();
    const rows = this.riftId === 'finale' ? FINALE_MAP : DIVE_MAP;
    this.level = analyze(rows);
    this.rift = RIFTS[this.riftId];
    this.finale = this.riftId === 'finale';
    this.combat = RIFT_COMBAT[this.riftId] || RIFT_COMBAT.school;
    this.enemyTint = this.finale ? 0x1a1024 : darken(this.rift.tint, 0.62);
    this.color = this.rift.shard;
    this.pocket = { shards: { fan: 0, bolt: 0, ofuda: 0, fang: 0, reel: 0 }, scrap: 0 };
    const taken = this.finale ? { bonus: 0 } : takeDiveBonus(getSave(), this.riftId);
    if (!this.finale) setSave(taken.save);
    const save = getSave();
    this.limit = this.finale ? FINALE_SECONDS : timerSeconds(save.gear.pass, taken.bonus);
    this.bonus = taken.bonus;
    this.elapsed = 0;
    this.mode = 'play';
    this.leaving = false;
    this.extractOn = false;
    this.eliteDead = false;
    this.hold = 0;
    this.fireCd = 0;
    this.dashCd = 0;
    this.dashT = 0;
    this.invuln = 0.45;
    this.kbx = 0;
    this.kby = 0;
    this.moveX = 0;
    this.moveY = 0;
    this.aim = -Math.PI / 2;
    this.stick = { x: 0, y: 0 };
    this.stickId = null;
    this.aimId = null;
    this.shootId = null;
    this.overlay = [];
    applyMute(this, save.muted);
    bindAudio(this, this.riftId);
    this.buildWorld();
    this.buildActors();
    this.buildHud();
    this.bindInput();
    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.enemies, this.layer);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.bullets, this.layer, (bullet) => {
      if (bullet?.born !== undefined) this.disableObj(bullet);
    });
    this.physics.add.collider(this.orbs, this.layer, (orb) => {
      if (orb?.born !== undefined) this.disableObj(orb);
    });
    this.physics.add.collider(this.shards, this.layer);
    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => this.hitEnemy(enemy, bullet));
    this.physics.add.overlap(this.bullets, this.breaks, (bullet, crate) => this.smash(crate, bullet));
    this.physics.add.overlap(this.player, this.breaks, (_player, crate) => this.smash(crate));
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => this.touchEnemy(enemy));
    this.physics.add.overlap(this.orbs, this.player, (orb) => this.touchOrb(orb));
    this.physics.add.overlap(this.player, this.shards, (_player, shard) => this.collect(shard));
    const cam = this.cameras.main;
    cam.setBounds(0, -120, this.mapW, this.mapH + 320);
    cam.startFollow(this.player, true, 0.16, 0.16);
    cam.setFollowOffset(0, 160);
    cam.roundPixels = true;
    cam.fadeIn(180, 7, 6, 13);
    if (this.bonus > 0) this.floatText(this.player.x, this.player.y - 36, `+${this.bonus}s`, '#ffd166');
  }

  buildWorld() {
    const level = this.level;
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: level.width, height: level.height });
    const tileset = map.addTilesetImage('td', 'td', TILE, TILE, 0, 0);
    const layer = map.createBlankLayer('ground', tileset, 0, 0, level.width, level.height);
    const floors = [FRAME.floorA, FRAME.floorB, FRAME.floorC, FRAME.floorD];
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const kind = level.kind[y][x];
        let frame = floors[(x * 3 + y * 5) % 4];
        if (kind === 'wall') frame = FRAME.wall;
        else if (kind === 'pillar') frame = FRAME.pillar;
        const tile = layer.putTileAt(frame, x, y);
        if (tile) tile.tint = this.rift.tint;
      }
    }
    layer.setCollision([FRAME.wall, FRAME.pillar]);
    this.layer = layer;
    this.mapW = level.width * TILE;
    this.mapH = level.height * TILE;
    this.physics.world.setBounds(0, 0, this.mapW, this.mapH);
  }

  buildActors() {
    const level = this.level;
    const spawn = this.tilePos(level.markers.P.x, level.markers.P.y);
    const hp = maxHp(getSave().gear.hood);
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'td', FRAME.player);
    this.player.setCollideWorldBounds(true);
    this.player.setCircle(8, 8, 8);
    this.player.setMaxVelocity(460, 460);
    this.player.hp = hp;
    this.player.maxHp = hp;
    this.drone = this.add.image(spawn.x, spawn.y - 22, 'drone').setDepth(5);
    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group({ maxSize: 48 });
    this.orbs = this.physics.add.group({ maxSize: 36 });
    this.shards = this.physics.add.group({ maxSize: 48 });
    this.breaks = this.physics.add.group();
    this.bars = this.add.graphics().setDepth(4500);
    this.used = new Set();
    const mark = (cell) => { if (cell) this.used.add(`${cell.x},${cell.y}`); };
    mark(level.markers.P);
    mark(level.markers.E);
    mark(level.markers.X);
    mark(level.markers.C);
    level.markers.B.forEach(mark);
    if (this.finale && level.markers.C) this.makeEnemy('core', level.markers.C.x, level.markers.C.y);
    else if (level.markers.E) this.makeEnemy('elite', level.markers.E.x, level.markers.E.y);
    const budget = spawnBudget(this.riftId, gearSum(getSave()));
    const mid = Math.min(1, level.rooms - 1);
    const first = Math.ceil(budget.walker / 2);
    this.placeKind('walker', first, 0);
    this.placeKind('walker', budget.walker - first, mid);
    this.placeKind('shooter', budget.shooter, mid);
    level.markers.B.forEach((cell, index) => {
      const pos = this.tilePos(cell.x, cell.y);
      const crate = this.breaks.create(pos.x, pos.y, 'td', index % 2 ? FRAME.crateB : FRAME.crate);
      crate.setTint(this.rift.tint);
      crate.setCircle(10, 6, 6);
      crate.body.immovable = true;
      crate.body.moves = false;
      crate.setDepth(pos.y);
    });
    if (level.markers.X) {
      const pad = this.tilePos(level.markers.X.x, level.markers.X.y);
      this.padX = pad.x;
      this.padY = pad.y;
      this.pad = this.add.circle(pad.x, pad.y, 16, 0x241428, 0.95).setStrokeStyle(2, 0x6d6780).setDepth(2);
    }
    this.floats = [];
    for (let i = 0; i < 24; i += 1) {
      this.floats.push(text(this, 0, 0, '', 14, '#ffffff').setVisible(false).setDepth(6000));
    }
  }

  buildHud() {
    this.uiPos = {
      pause: { x: W - 36, y: 30, r: 26 },
      stick: { x: 110, y: H - 140, r: 54 },
      dash: { x: W - 156, y: H - 96, r: 36 },
      shoot: { x: W - 78, y: H - 176, r: 42 },
    };
    this.add.rectangle(W / 2, 56, W, 112, 0x07060d, 0.55).setScrollFactor(0).setDepth(9000);
    this.add.rectangle(W / 2, H - 110, W, 220, 0x07060d, 0.5).setScrollFactor(0).setDepth(9000);
    this.timerText = text(this, W / 2, 22, '', 30, '#f4f1ff').setScrollFactor(0).setDepth(9200);
    this.shardText = text(this, 16, 18, '', 13, '#e8fbff', 0, 0.5).setScrollFactor(0).setDepth(9200);
    this.hpG = this.add.graphics().setScrollFactor(0).setDepth(9200);
    this.hpText = text(this, W / 2, 70, '', 12, '#e8fbff').setScrollFactor(0).setDepth(9200);
    this.objText = text(this, W / 2, 92, '', 12, '#ffd166').setScrollFactor(0).setDepth(9200);
    this.exText = text(this, W / 2, H - 252, '', 14, '#ffd166').setScrollFactor(0).setDepth(9200).setVisible(false);
    this.help = text(this, W / 2, H - 268, 'Move · aim · shoot · dash', 12, '#9a93ad').setScrollFactor(0).setDepth(9200);
    const pause = this.uiPos.pause;
    this.add.circle(pause.x, pause.y, pause.r, 0x1c1230, 0.9).setStrokeStyle(2, 0xff2bd6).setScrollFactor(0).setDepth(9100);
    text(this, pause.x, pause.y, 'II', 14, '#ff2bd6').setScrollFactor(0).setDepth(9200);
    const stick = this.uiPos.stick;
    this.add.circle(stick.x, stick.y, stick.r, 0x1c1230, 0.45).setStrokeStyle(2, 0x3dfff3).setScrollFactor(0).setDepth(9100);
    this.knob = this.add.circle(stick.x, stick.y, 22, 0x3dfff3, 0.9).setScrollFactor(0).setDepth(9101);
    const dash = this.uiPos.dash;
    this.dashCircle = this.add.circle(dash.x, dash.y, dash.r, 0x1c1230, 0.8).setStrokeStyle(2, 0xff2bd6).setScrollFactor(0).setDepth(9100);
    text(this, dash.x, dash.y, 'DASH', 11, '#ff2bd6').setScrollFactor(0).setDepth(9200);
    const shoot = this.uiPos.shoot;
    this.add.circle(shoot.x, shoot.y, shoot.r, 0x1c1230, 0.8).setStrokeStyle(2, 0x3dfff3).setScrollFactor(0).setDepth(9100);
    text(this, shoot.x, shoot.y, 'FIRE', 12, '#3dfff3').setScrollFactor(0).setDepth(9200);
  }

  bindInput() {
    const keys = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard.addKeys({
      w: keys.W, a: keys.A, s: keys.S, d: keys.D,
      up: keys.UP, down: keys.DOWN, left: keys.LEFT, right: keys.RIGHT,
      shift: keys.SHIFT, space: keys.SPACE, esc: keys.ESC,
    });
    this.input.on('pointerdown', (pointer) => this.onDown(pointer));
    this.input.on('pointermove', (pointer) => this.onMove(pointer));
    this.input.on('pointerup', (pointer) => this.onUp(pointer));
    this.input.on('pointerupoutside', (pointer) => this.onUp(pointer));
  }

  update(_time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc) && (this.mode === 'play' || this.mode === 'pause')) {
      this.togglePause();
    }
    if (this.mode !== 'play') return;
    const dt = Math.min(0.05, delta / 1000);
    this.elapsed += dt;
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.movePlayer(dt);
    this.aimFromMouse();
    if (this.aimId !== null || this.shootId !== null || this.keys.space.isDown) this.tryFire();
    if (Phaser.Input.Keyboard.JustDown(this.keys.shift)) this.tryDash();
    this.updateDrone();
    this.updateEnemies(dt);
    this.cull(this.bullets);
    this.cull(this.orbs);
    this.updateShards(dt);
    this.tickExtract(dt);
    if (this.mode !== 'play') return;
    if (!this.finale && !this.extractOn && (this.eliteDead || this.elapsed >= EXTRACT_AT)) this.openExtract();
    if (this.elapsed >= this.limit) {
      if (this.finale) this.winFinale();
      else this.fail('The rift closed.');
      return;
    }
    this.updateHud();
  }

  movePlayer(dt) {
    const keys = this.keys;
    let x = 0;
    let y = 0;
    if (keys.left.isDown || keys.a.isDown) x -= 1;
    if (keys.right.isDown || keys.d.isDown) x += 1;
    if (keys.up.isDown || keys.w.isDown) y -= 1;
    if (keys.down.isDown || keys.s.isDown) y += 1;
    if (x === 0 && y === 0 && (this.stick.x || this.stick.y)) {
      x = this.stick.x;
      y = this.stick.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    this.moveX = x;
    this.moveY = y;
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.player.setVelocity(this.dashVX, this.dashVY);
    } else {
      this.player.setVelocity(x * PLAYER_SPEED + this.kbx, y * PLAYER_SPEED + this.kby);
      const decay = Math.exp(-12 * dt);
      this.kbx *= decay;
      this.kby *= decay;
    }
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.player.alpha = Math.sin(this.invuln * 40) > 0 ? 0.4 : 1;
    } else {
      this.player.alpha = 1;
    }
    this.player.setDepth(this.player.y);
  }

  aimFromMouse() {
    const pointer = this.input.activePointer;
    if (pointer.wasTouch) return;
    if (pointer.y > H - 250) return;
    if (pointer.x > W - 70 && pointer.y < 80) return;
    this.aim = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x);
    if (pointer.isDown) this.tryFire();
  }

  updateDrone() {
    this.drone.x = this.player.x + Math.cos(this.aim) * 22;
    this.drone.y = this.player.y + Math.sin(this.aim) * 22;
    this.drone.rotation = this.aim;
    this.drone.setDepth(this.player.y + 1);
  }

  tryDash() {
    if (this.mode !== 'play' || this.dashCd > 0 || this.dashT > 0) return;
    let x = this.moveX;
    let y = this.moveY;
    if (x === 0 && y === 0) {
      x = Math.cos(this.aim);
      y = Math.sin(this.aim);
    }
    const len = Math.hypot(x, y) || 1;
    this.dashVX = (x / len) * DASH_SPEED;
    this.dashVY = (y / len) * DASH_SPEED;
    this.dashT = DASH_TIME;
    this.dashCd = DASH_COOLDOWN;
    this.invuln = Math.max(this.invuln, DASH_IFRAME);
    sfx(this, 'click');
  }

  tryFire() {
    if (this.fireCd > 0 || this.mode !== 'play') return;
    const origin = this.shotOrigin();
    const bullet = this.bullets.get(origin.x, origin.y, 'bullet');
    if (!bullet) return;
    bullet.enableBody(true, origin.x, origin.y, true, true);
    bullet.setCircle(4, 2, 2);
    bullet.setVelocity(Math.cos(this.aim) * 420, Math.sin(this.aim) * 420);
    bullet.damage = lensStats(getSave().gear.lens).damage;
    bullet.born = this.time.now;
    bullet.life = 650;
    bullet.setDepth(4000);
    this.fireCd = lensStats(getSave().gear.lens).cooldown;
    sfx(this, 'shoot');
  }

  shotOrigin() {
    const tile = this.layer.getTileAtWorldXY(this.drone.x, this.drone.y, false, this.cameras.main);
    if (!tile || tile.collides) return { x: this.player.x, y: this.player.y };
    return { x: this.drone.x, y: this.drone.y };
  }

  updateEnemies(dt) {
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) return;
      if (enemy.ring) enemy.ring.setPosition(enemy.x, enemy.y);
      enemy.setDepth(enemy.y);
      if (enemy.kind === 'core') {
        enemy.setVelocity(0, 0);
        enemy.fireCd -= dt;
        enemy.setAlpha(0.82 + Math.sin(this.time.now / 180) * 0.18);
        const alive = this.enemies.getChildren().filter((other) => other.active && other.kind === 'walker').length;
        if (enemy.fireCd <= 0 && alive < 6) {
          enemy.fireCd = 2.8;
          this.spawnEdgeWalker();
        }
        return;
      }
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      enemy.fireCd -= dt;
      if (enemy.kind === 'shooter') {
        if (dist > 210) enemy.setVelocity((dx / dist) * enemy.speed, (dy / dist) * enemy.speed);
        else if (dist < 130) enemy.setVelocity((-dx / dist) * enemy.speed, (-dy / dist) * enemy.speed);
        else enemy.setVelocity(0, 0);
        if (dist < 360 && enemy.fireCd <= 0) {
          this.enemyShoot(enemy);
          enemy.fireCd = 1.7;
        }
      } else {
        enemy.setVelocity((dx / dist) * enemy.speed, (dy / dist) * enemy.speed);
        if (enemy.kind === 'elite' && dist < 320 && enemy.fireCd <= 0) {
          this.enemyShoot(enemy);
          enemy.fireCd = 1.2;
        }
      }
    });
    this.drawBars();
  }

  drawBars() {
    this.bars.clear();
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || (enemy.kind !== 'elite' && enemy.kind !== 'core')) return;
      const width = enemy.kind === 'core' ? 48 : 34;
      const x = enemy.x - width / 2;
      const y = enemy.y - (enemy.kind === 'core' ? 36 : 30);
      this.bars.fillStyle(0x140e18, 0.9);
      this.bars.fillRect(x, y, width, 5);
      this.bars.fillStyle(enemy.kind === 'core' ? 0xf4f1ff : 0xffd166, 1);
      this.bars.fillRect(x, y, width * Math.max(0, enemy.hp / enemy.maxHp), 5);
    });
  }

  spawnEdgeWalker() {
    const pool = this.level.floors.filter((cell) => {
      const edge = cell.x === 1 || cell.x === this.level.width - 2 || cell.y === 1 || cell.y === this.level.height - 2;
      if (!edge) return false;
      const pos = this.tilePos(cell.x, cell.y);
      return Math.hypot(pos.x - this.player.x, pos.y - this.player.y) > 140;
    });
    if (!pool.length) return;
    const cell = pool[Math.floor(Math.random() * pool.length)];
    this.makeEnemy('walker', cell.x, cell.y, { speed: 74 });
  }

  enemyShoot(enemy) {
    const orb = this.orbs.get(enemy.x, enemy.y, 'orb');
    if (!orb) return;
    orb.enableBody(true, enemy.x, enemy.y, true, true);
    orb.setCircle(6, 1, 1);
    const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    const speed = enemy.kind === 'elite' ? this.combat.orbSpeed + 25 : this.combat.orbSpeed;
    orb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    orb.damage = enemy.kind === 'elite' ? ELITE_ORB : ORB_DAMAGE;
    orb.born = this.time.now;
    orb.life = 3200;
    orb.setDepth(3900);
  }

  cull(group) {
    const now = this.time.now;
    group.getChildren().forEach((obj) => {
      if (!obj.active) return;
      if (now - obj.born > obj.life || obj.x < -20 || obj.y < -20 || obj.x > this.mapW + 20 || obj.y > this.mapH + 20) {
        this.disableObj(obj);
      }
    });
  }

  updateShards(dt) {
    const decay = Math.exp(-4 * dt);
    this.shards.getChildren().forEach((shard) => {
      if (!shard.active) return;
      const dx = this.player.x - shard.x;
      const dy = this.player.y - shard.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 18) this.collect(shard);
      else if (dist < ATTRACT) shard.setVelocity((dx / dist) * 240, (dy / dist) * 240);
      else shard.setVelocity(shard.body.velocity.x * decay, shard.body.velocity.y * decay);
      shard.setDepth(shard.y);
    });
  }

  tickExtract(dt) {
    if (!this.pad || !this.extractOn || this.mode !== 'play') {
      if (this.exText) this.exText.setVisible(false);
      return;
    }
    const dist = Math.hypot(this.player.x - this.padX, this.player.y - this.padY);
    if (dist < 42) {
      this.hold += dt;
      this.exText.setVisible(true).setText(`EXTRACT ${Math.min(100, Math.floor((this.hold / HOLD) * 100))}%`);
      if (this.hold >= HOLD) this.doExtract();
    } else {
      this.hold = 0;
      this.exText.setVisible(false);
    }
  }

  updateHud() {
    const left = Math.max(0, Math.ceil(this.limit - this.elapsed));
    this.timerText.setText(String(left));
    this.timerText.setColor(left <= 10 ? '#ff5a7a' : '#f4f1ff');
    const ratio = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
    this.hpG.clear();
    this.hpG.fillStyle(0x241428, 1);
    this.hpG.fillRect(140, 46, 200, 12);
    this.hpG.fillStyle(ratio < 0.3 ? 0xff5a7a : 0x3dfff3, 1);
    this.hpG.fillRect(140, 46, 200 * ratio, 12);
    this.hpText.setText(String(Math.max(0, Math.ceil(this.player.hp))));
    if (this.finale) {
      this.shardText.setText('Season finale');
      this.objText.setText('Survive 90s or break the core');
    } else {
      const count = this.pocket.shards[this.color] || 0;
      const scrap = this.pocket.scrap ? `  +${this.pocket.scrap} scrap` : '';
      this.shardText.setText(`${count} ${SHARD_NAME[this.color]}${scrap}`);
      if (this.extractOn) this.objText.setText('Reach the gold pad');
      else {
        const remain = Math.max(0, Math.ceil(EXTRACT_AT - this.elapsed));
        this.objText.setText(`Pad in ${remain}s  ·  or kill ${this.rift.elite}`);
      }
    }
    this.dashCircle.setAlpha(this.dashCd > 0 ? 0.4 : 1);
    if (this.elapsed > 4) this.help.setVisible(false);
  }

  placeKind(kind, count, room) {
    if (count <= 0) return;
    let pool = this.level.floors.filter((cell) => cell.room === room && !this.used.has(`${cell.x},${cell.y}`) && this.farFromPlayer(cell));
    if (pool.length < count) {
      pool = this.level.floors.filter((cell) => !this.used.has(`${cell.x},${cell.y}`) && this.farFromPlayer(cell));
    }
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = pool[i];
      pool[i] = pool[j];
      pool[j] = swap;
    }
    for (let i = 0; i < count && i < pool.length; i += 1) {
      this.used.add(`${pool[i].x},${pool[i].y}`);
      this.makeEnemy(kind, pool[i].x, pool[i].y);
    }
  }

  farFromPlayer(cell) {
    const spawn = this.level.markers.P;
    return Math.abs(cell.x - spawn.x) + Math.abs(cell.y - spawn.y) > 5;
  }

  makeEnemy(kind, tx, ty, extra = {}) {
    const pos = this.tilePos(tx, ty);
    let frame = FRAME.walker;
    let hp = WALKER_HP;
    let speed = this.combat.walkerSpeed;
    let touch = WALKER_TOUCH;
    let scale = 1;
    if (kind === 'shooter') {
      frame = FRAME.shooter;
      hp = SHOOTER_HP;
      speed = this.combat.shooterSpeed;
      touch = 8;
    } else if (kind === 'elite') {
      hp = ELITE_HP;
      speed = this.combat.eliteSpeed;
      touch = this.combat.eliteTouch;
      scale = 1.65;
    } else if (kind === 'core') {
      hp = CORE_HP;
      speed = 0;
      touch = 14;
    }
    const enemy = kind === 'core'
      ? this.enemies.create(pos.x, pos.y, 'core')
      : this.enemies.create(pos.x, pos.y, 'td', frame);
    enemy.setScale(scale);
    if (kind === 'core') enemy.setCircle(20, 4, 4);
    else enemy.setCircle(9, 7, 7);
    enemy.refreshBody();
    enemy.setCollideWorldBounds(true);
    enemy.body.setAllowGravity(false);
    enemy.kind = kind;
    enemy.hp = hp;
    enemy.maxHp = hp;
    enemy.speed = extra.speed ?? speed;
    enemy.touch = touch;
    enemy.fireCd = kind === 'core' ? 1.4 : 0.5 + Math.random();
    enemy.nextHit = 0;
    enemy.baseTint = this.enemyTint;
    if (kind !== 'core') enemy.setTint(this.enemyTint);
    if (kind === 'core') {
      enemy.body.immovable = true;
      enemy.body.moves = false;
    }
    if (kind === 'elite') {
      enemy.ring = this.add.circle(pos.x, pos.y, 20, this.rift.tint, 0.18).setStrokeStyle(2, 0xffd166).setDepth(4);
    }
    return enemy;
  }

  tilePos(tx, ty) {
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }

  hitEnemy(enemy, bullet) {
    if (!enemy.active || !bullet.active) return;
    const damage = bullet.damage || 0;
    this.disableObj(bullet);
    enemy.hp -= damage;
    this.floatText(enemy.x, enemy.y - 20, String(damage), '#e8fbff');
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(45, () => {
      if (!enemy.active) return;
      enemy.clearTint();
      if (enemy.kind !== 'core') enemy.setTint(enemy.baseTint);
    });
    if (enemy.hp <= 0) this.killEnemy(enemy);
    else sfx(this, 'hit');
  }

  killEnemy(enemy) {
    if (!enemy.active) return;
    const { x, y, kind } = enemy;
    if (enemy.ring) {
      enemy.ring.destroy();
      enemy.ring = null;
    }
    this.disableObj(enemy);
    if (kind === 'elite') {
      const count = rollEliteShards();
      this.dropShards(x, y, count);
      this.pocket.scrap += 1;
      const save = getSave();
      if (save.elitesKilled[this.riftId] !== undefined) {
        save.elitesKilled[this.riftId] = true;
        setSave(save);
      }
      this.eliteDead = true;
      this.openExtract();
      this.floatText(x, y - 28, `+${count} ${SHARD_NAME[this.color]}`, '#ffd166');
      sfx(this, 'elite');
    } else if (kind === 'core') {
      sfx(this, 'elite');
      this.winFinale();
    } else {
      sfx(this, 'hit');
    }
  }

  smash(crate, bullet) {
    if (!crate?.active) return;
    const { x, y } = crate;
    this.disableObj(crate);
    if (bullet?.active) this.disableObj(bullet);
    if (this.color) this.dropShards(x, y, 1);
    sfx(this, 'smash');
  }

  dropShards(x, y, count) {
    if (!this.color) return;
    for (let i = 0; i < count; i += 1) {
      const shard = this.shards.get(x, y, 'shard');
      if (!shard) {
        this.pocket.shards[this.color] += 1;
        continue;
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 40;
      shard.enableBody(true, x, y, true, true);
      shard.setCircle(6, 2, 2);
      shard.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      shard.color = this.color;
      shard.setTint(SHARD_TINT[this.color]);
      shard.born = this.time.now;
      shard.life = 20000;
    }
  }

  collect(shard) {
    if (!shard.active) return;
    this.pocket.shards[shard.color] += 1;
    this.disableObj(shard);
    sfx(this, 'pickup');
    this.floatText(this.player.x, this.player.y - 18, `+${SHARD_NAME[shard.color]}`, '#e8fbff');
  }

  touchEnemy(enemy) {
    if (!enemy.active || this.time.now < enemy.nextHit) return;
    enemy.nextHit = this.time.now + CONTACT_GAP * 1000;
    this.hurt(enemy.touch, enemy);
  }

  touchOrb(orb) {
    if (!orb.active) return;
    const source = { x: orb.x, y: orb.y };
    const damage = orb.damage;
    this.disableObj(orb);
    this.hurt(damage, source);
  }

  hurt(amount, source) {
    if (this.mode !== 'play' || this.invuln > 0) return;
    this.player.hp -= amount;
    this.invuln = HURT_IFRAME;
    const angle = Math.atan2(this.player.y - source.y, this.player.x - source.x);
    this.kbx = Math.cos(angle) * 200;
    this.kby = Math.sin(angle) * 200;
    this.floatText(this.player.x, this.player.y - 22, String(amount), '#ff5a7a');
    this.cameras.main.shake(80, 0.004);
    sfx(this, 'hurt');
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.fail('The night editor went down.');
    }
  }

  openExtract() {
    if (this.finale || this.extractOn || this.mode !== 'play') return;
    this.extractOn = true;
    if (this.pad) {
      this.pad.setFillStyle(0xffd166, 0.28);
      this.pad.setStrokeStyle(3, 0xffd166, 1);
    }
  }

  doExtract() {
    if (this.mode !== 'play') return;
    const pocket = this.pocket;
    setSave(applyExtract(getSave(), pocket));
    sfx(this, 'confirm');
    this.leave('edit', { banked: formatPocket(pocket), from: 'extract' });
  }

  fail(reason) {
    if (this.mode !== 'play') return;
    this.player.setVelocity(0, 0);
    this.physics.pause();
    setSave(getSave());
    if (hasRevive(getSave())) {
      this.mode = 'revive';
      this.showRevive(reason);
      return;
    }
    sfx(this, 'fail');
    if (this.finale) this.leave('hub', { note: 'The Algorithm dumped the episode.' });
    else this.leave('down', { reason });
  }

  winFinale() {
    if (this.mode !== 'play') return;
    const save = getSave();
    save.finaleCleared = true;
    setSave(save);
    sfx(this, 'confirm');
    this.leave('ending');
  }

  showRevive(reason) {
    this.clearOverlay();
    this.overlay.push(scrim(this, 12000));
    this.overlay.push(text(this, W / 2, 300, 'DOWN', 32, '#ff5a7a').setDepth(12010));
    this.overlay.push(text(this, W / 2, 360, `${reason}\nOne revive is left today.`, 15, '#e8fbff').setDepth(12010));
    this.overlay.push(button(this, W / 2, 460, 280, 60, 'Revive', () => {
      this.later(() => {
        const save = getSave();
        save.reviveDate = todayStamp();
        setSave(save);
        this.player.hp = this.player.maxHp;
        this.invuln = 1.2;
        if (this.elapsed > this.limit - 5) this.limit = this.elapsed + 8;
        this.mode = 'play';
        this.physics.resume();
        this.clearOverlay();
        sfx(this, 'confirm');
      });
    }, { depth: 12010 }));
    this.overlay.push(button(this, W / 2, 540, 280, 60, 'Bail to studio', () => {
      this.later(() => {
        sfx(this, 'fail');
        const note = this.finale
          ? 'The Algorithm dumped the episode.'
          : 'Bailed out. Tonight\'s revive is still there.';
        this.leave('hub', { note });
      });
    }, { depth: 12010, stroke: 0xff5a7a }));
  }

  togglePause() {
    if (this.mode === 'play') {
      this.mode = 'pause';
      this.physics.pause();
      this.buildPause();
      return;
    }
    if (this.mode === 'pause') {
      this.mode = 'play';
      this.physics.resume();
      this.clearOverlay();
    }
  }

  buildPause() {
    this.clearOverlay();
    this.overlay.push(scrim(this, 12000));
    this.overlay.push(text(this, W / 2, 280, 'PAUSED', 32, '#ff2bd6').setDepth(12010));
    this.overlay.push(button(this, W / 2, 380, 280, 60, 'Resume', () => {
      sfx(this, 'click');
      this.later(() => this.togglePause());
    }, { depth: 12010 }));
    this.overlay.push(button(this, W / 2, 460, 280, 60, getSave().muted ? 'Sound off' : 'Sound on', () => {
      const save = getSave();
      save.muted = !save.muted;
      setSave(save);
      applyMute(this, save.muted);
      sfx(this, 'click');
      this.later(() => this.buildPause());
    }, { depth: 12010 }));
    this.overlay.push(button(this, W / 2, 540, 280, 60, 'Quit to studio', () => {
      sfx(this, 'fail');
      setSave(getSave());
      this.leave('hub', { note: 'Dive forfeited. This dive\'s shards are gone.' });
    }, { depth: 12010, stroke: 0xff5a7a }));
  }

  clearOverlay() {
    this.overlay.forEach((node) => node.destroy());
    this.overlay = [];
  }

  later(fn) {
    this.time.delayedCall(0, fn);
  }

  leave(key, data) {
    if (this.leaving) return;
    this.leaving = true;
    this.mode = 'done';
    this.physics.pause();
    this.cameras.main.fadeOut(180, 7, 6, 13);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }

  onDown(pointer) {
    if (this.mode === 'play' && this.hitCircle(pointer, this.uiPos.pause)) {
      this.togglePause();
      return;
    }
    if (this.mode !== 'play') return;
    if (this.inStick(pointer)) {
      this.stickId = pointer.id;
      this.placeStick(pointer);
      return;
    }
    if (this.hitCircle(pointer, this.uiPos.dash)) {
      this.tryDash();
      return;
    }
    if (this.hitCircle(pointer, this.uiPos.shoot)) {
      this.shootId = pointer.id;
      this.tryFire();
      return;
    }
    if (pointer.y < H - 250) {
      this.aimId = pointer.id;
      this.pointAim(pointer);
      this.tryFire();
    }
  }

  onMove(pointer) {
    if (pointer.id === this.stickId) this.placeStick(pointer);
    if (pointer.id === this.aimId) this.pointAim(pointer);
  }

  onUp(pointer) {
    if (pointer.id === this.stickId) {
      this.stickId = null;
      this.stick.x = 0;
      this.stick.y = 0;
      this.knob.setPosition(this.uiPos.stick.x, this.uiPos.stick.y);
    }
    if (pointer.id === this.aimId) this.aimId = null;
    if (pointer.id === this.shootId) this.shootId = null;
  }

  placeStick(pointer) {
    const spot = this.uiPos.stick;
    const dx = pointer.x - spot.x;
    const dy = pointer.y - spot.y;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, spot.r);
    const nx = dx / len;
    const ny = dy / len;
    this.knob.setPosition(spot.x + nx * clamped * 0.62, spot.y + ny * clamped * 0.62);
    if (len < 12) {
      this.stick.x = 0;
      this.stick.y = 0;
    } else {
      this.stick.x = nx * (clamped / spot.r);
      this.stick.y = ny * (clamped / spot.r);
    }
  }

  pointAim(pointer) {
    this.aim = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x);
  }

  hitCircle(pointer, spot) {
    return Math.hypot(pointer.x - spot.x, pointer.y - spot.y) < spot.r + 8;
  }

  inStick(pointer) {
    return pointer.x < this.uiPos.stick.x + 120 && pointer.y > H - 270;
  }

  floatText(x, y, message, color) {
    const node = this.floats.find((entry) => !entry.visible) || this.floats[0];
    this.tweens.killTweensOf(node);
    node.setText(message).setColor(color).setPosition(x, y).setVisible(true).setAlpha(1);
    this.tweens.add({
      targets: node,
      y: y - 26,
      alpha: 0,
      duration: 520,
      onComplete: () => node.setVisible(false),
    });
  }

  disableObj(obj) {
    if (!obj) return;
    if (obj.body) obj.disableBody(true, true);
    else {
      obj.setActive(false);
      obj.setVisible(false);
    }
  }
}
