const BEDS = {
  title: [196, 247],
  hub: [220, 277],
  school: [330, 415, 494],
  mecha: [110, 165],
  shrine: [392, 494, 587],
  alley: [146, 174, 220],
  studio: [262, 330, 392],
  finale: [98, 123, 155],
};

const VOL = {
  shoot: 0.2,
  hit: 0.28,
  hurt: 0.42,
  smash: 0.34,
  elite: 0.46,
  pickup: 0.4,
  click: 0.22,
  confirm: 0.42,
  fail: 0.4,
};

let ctxRef = null;
let master = null;
let nodes = [];
let current = '';
let mutedFlag = false;

function stopNodes() {
  nodes.forEach((node) => {
    try {
      node.stop?.();
      node.disconnect?.();
    } catch {
      /* already stopped */
    }
  });
  nodes = [];
  current = '';
}

export function applyMute(scene, muted) {
  mutedFlag = !!muted;
  if (scene?.sound) scene.sound.mute = mutedFlag;
  if (master) master.gain.value = mutedFlag ? 0 : 0.8;
}

export function poke(scene) {
  const ctx = scene?.sound?.context;
  if (!ctx) return;
  ctxRef = ctx;
  if (!master) {
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  master.gain.value = mutedFlag ? 0 : 0.8;
  if (ctx.state === 'suspended') ctx.resume();
  scene.sound.unlock?.();
}

export function startBed(scene, name) {
  poke(scene);
  if (!ctxRef || current === name) return;
  stopNodes();
  current = name;
  const freqs = BEDS[name] || BEDS.hub;
  freqs.forEach((freq, index) => {
    const osc = ctxRef.createOscillator();
    const gain = ctxRef.createGain();
    osc.type = index === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    gain.gain.value = 0.018;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    nodes.push(osc, gain);
  });
}

export function bindAudio(scene, bedName) {
  const kick = () => startBed(scene, bedName);
  kick();
  scene.input.on('pointerdown', kick);
}

export function sfx(scene, key) {
  if (!scene?.sound || scene.sound.mute) return;
  if (!scene.cache?.audio?.exists(key)) return;
  scene.sound.play(key, { volume: VOL[key] ?? 0.3 });
}
