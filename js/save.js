import { SAVE_KEY, normalize } from './rules.js';

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { save: normalize(null), exists: false };
    return { save: normalize(JSON.parse(raw)), exists: true };
  } catch {
    return { save: normalize(null), exists: false };
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (err) {
    console.warn('Night Rift could not write the save.', err);
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* private mode */
  }
}
