import { defaultSave } from './rules.js';
import { loadSave, writeSave } from './save.js';

let save = defaultSave();
let exists = false;

export function bootSave() {
  const loaded = loadSave();
  save = loaded.save;
  exists = loaded.exists;
  return loaded;
}

export function getSave() {
  return save;
}

export function hasSave() {
  return exists;
}

export function setSave(next) {
  save = next;
  exists = true;
  writeSave(save);
  return save;
}

export function resetSave() {
  const muted = !!save.muted;
  save = defaultSave();
  save.muted = muted;
  exists = true;
  writeSave(save);
  return save;
}
