export const FONT = 'ui-monospace, "Courier New", monospace';

export function text(scene, x, y, value, size, color, originX = 0.5, originY = 0.5) {
  const node = scene.add.text(x, y, value, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    align: 'center',
  });
  node.setOrigin(originX, originY);
  return node;
}

export function button(scene, x, y, w, h, label, onClick, opts = {}) {
  const depth = opts.depth ?? 10;
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(opts.disabled ? 0x2a2438 : 0x1c1230, 0.96);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
  g.lineStyle(2, opts.disabled ? 0x4a4458 : (opts.stroke ?? 0x3dfff3), 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
  const labelNode = text(scene, x, y, label, opts.size || 16, opts.disabled ? '#6d6780' : (opts.color || '#e8fbff'));
  labelNode.setWordWrapWidth(w - 24);
  labelNode.setAlign('center');
  labelNode.setDepth(depth + 1);
  const zone = scene.add.zone(x, y, w, h).setOrigin(0.5).setDepth(depth + 2);
  if (!opts.disabled && onClick) {
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => onClick());
  }
  return {
    g,
    t: labelNode,
    zone,
    destroy() {
      g.destroy();
      labelNode.destroy();
      zone.destroy();
    },
  };
}

export function scrim(scene, depth = 40) {
  const node = scene.add.rectangle(240, 427, 480, 854, 0x07060d, 0.78).setDepth(depth);
  node.setInteractive();
  return node;
}
