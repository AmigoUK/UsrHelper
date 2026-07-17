import { describe, expect, it } from 'vitest';
import { keyLabel } from '../lib/recordingOverlay';

const ev = (key: string, mods: Partial<Record<'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey', boolean>> = {}) => ({
  key,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  shiftKey: false,
  ...mods,
});

describe('keyLabel', () => {
  it('captions modifier combos', () => {
    expect(keyLabel(ev('s', { ctrlKey: true }))).toBe('Ctrl + S');
    expect(keyLabel(ev('v', { ctrlKey: true, shiftKey: true }))).toBe('Ctrl + Shift + V');
  });

  it('captions special keys without modifiers', () => {
    expect(keyLabel(ev('Enter'))).toBe('Enter');
    expect(keyLabel(ev('Escape'))).toBe('Esc');
    expect(keyLabel(ev('F5'))).toBe('F5');
  });

  it('ignores plain typing (privacy)', () => {
    expect(keyLabel(ev('a'))).toBeNull();
    expect(keyLabel(ev('A', { shiftKey: true }))).toBeNull();
  });

  it('ignores bare modifier presses', () => {
    expect(keyLabel(ev('Control', { ctrlKey: true }))).toBeNull();
    expect(keyLabel(ev('Shift', { shiftKey: true }))).toBeNull();
  });
});
