import assert from 'node:assert/strict';
import test from 'node:test';
import { DIVE_MAP, FINALE_MAP, analyze, reachable } from '../js/maps.js';

function expectConnected(rows, markers) {
  const level = analyze(rows);
  assert.equal(level.width, 15);
  assert.ok(level.markers.P, 'player spawn');
  for (const name of markers) {
    const spot = level.markers[name];
    assert.ok(spot, name);
    assert.equal(reachable(level, level.markers.P, spot), true, name);
  }
  const orphan = level.floors.find((cell) => !reachable(level, level.markers.P, cell));
  assert.equal(orphan, undefined);
  return level;
}

test('school rift is three connected rooms', () => {
  const level = expectConnected(DIVE_MAP, ['E', 'X']);
  assert.equal(level.doorYs.length, 2, level.doorYs.join(','));
  assert.ok(level.markers.B.length >= 6);
  for (const crate of level.markers.B) {
    assert.equal(reachable(level, level.markers.P, crate), true);
  }
});

test('finale arena is one open room', () => {
  const level = expectConnected(FINALE_MAP, ['C']);
  assert.equal(level.doorYs.length, 0);
  assert.equal(level.markers.X, null);
  assert.equal(level.markers.E, null);
});
