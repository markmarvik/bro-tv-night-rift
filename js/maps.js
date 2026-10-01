export const DIVE_MAP = [
  '###############',
  '#.............#',
  '#..B.......B..#',
  '#.............#',
  '#..%.......%..#',
  '#.............#',
  '#......P......#',
  '#.............#',
  '#.............#',
  '#..%.......%..#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '######...######',
  '#.............#',
  '#..B.......B..#',
  '#.............#',
  '#..%.......%..#',
  '#.............#',
  '#......B......#',
  '#.............#',
  '#.............#',
  '#..%.......%..#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '######...######',
  '#.............#',
  '#..B.......B..#',
  '#.............#',
  '#..%.......%..#',
  '#.............#',
  '#......E......#',
  '#.............#',
  '#..%.......%..#',
  '#.............#',
  '#......X......#',
  '#.............#',
  '#.............#',
  '###############',
];

export const FINALE_MAP = [
  '###############',
  '#.............#',
  '#..%.......%..#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#......C......#',
  '#.............#',
  '#..%.......%..#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#..%.......%..#',
  '#.............#',
  '#.............#',
  '#......P......#',
  '#.............#',
  '#..%.......%..#',
  '#.............#',
  '#.............#',
  '#..%.......%..#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '###############',
];

const MARKERS = {
  P: 'P',
  E: 'E',
  X: 'X',
  C: 'C',
  B: 'B',
};

export function analyze(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const kind = [];
  const markers = { P: null, E: null, X: null, C: null, B: [] };
  const doorYs = [];
  for (let y = 0; y < height; y += 1) {
    const row = rows[y];
    if (row.length !== width) throw new Error(`row ${y} is ${row.length} wide, expected ${width}`);
    kind[y] = [];
    let walls = 0;
    for (let x = 0; x < width; x += 1) {
      const cell = row[x];
      if (cell === '#') {
        kind[y][x] = 'wall';
        walls += 1;
        continue;
      }
      if (cell === '%') {
        kind[y][x] = 'pillar';
        continue;
      }
      if (cell !== '.' && !MARKERS[cell]) throw new Error(`bad tile '${cell}' at ${x},${y}`);
      kind[y][x] = 'floor';
      if (cell === 'B') markers.B.push({ x, y });
      else if (cell !== '.') markers[cell] = { x, y };
    }
    if (walls >= width - 4 && row.includes('.')) doorYs.push(y);
  }
  const floors = [];
  for (let y = 0; y < height; y += 1) {
    let room = 0;
    for (const doorY of doorYs) if (y > doorY) room += 1;
    for (let x = 0; x < width; x += 1) {
      if (kind[y][x] === 'floor') floors.push({ x, y, room });
    }
  }
  return { width, height, kind, markers, floors, doorYs, rooms: doorYs.length + 1 };
}

export function reachable(level, from, to) {
  if (!from || !to) return false;
  const walk = new Set(level.floors.map((cell) => `${cell.x},${cell.y}`));
  const start = `${from.x},${from.y}`;
  const goal = `${to.x},${to.y}`;
  if (!walk.has(start) || !walk.has(goal)) return false;
  const seen = new Set([start]);
  const queue = [from];
  while (queue.length) {
    const cell = queue.pop();
    if (cell.x === to.x && cell.y === to.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: cell.x + dx, y: cell.y + dy };
      const key = `${next.x},${next.y}`;
      if (walk.has(key) && !seen.has(key)) {
        seen.add(key);
        queue.push(next);
      }
    }
  }
  return false;
}
