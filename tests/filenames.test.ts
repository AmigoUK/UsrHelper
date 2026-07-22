import { describe, expect, it } from 'vitest';
import {
  profileFilename,
  buildBaseName,
  buildDownloadPath,
  clipFilename,
  companionFilename,
  formatTimestamp,
  sanitizeSubfolder,
  screenshotFilename,
} from '../lib/filenames';

const date = new Date(2026, 6, 17, 14, 32, 5); // 2026-07-17 14:32:05 local time

describe('formatTimestamp', () => {
  it('formats as YYYY-MM-DD_HH-MM-SS with zero padding', () => {
    expect(formatTimestamp(date)).toBe('2026-07-17_14-32-05');
    expect(formatTimestamp(new Date(2026, 0, 3, 4, 5, 6))).toBe('2026-01-03_04-05-06');
  });
});

describe('buildBaseName', () => {
  it('prefixes with UsrHelper', () => {
    expect(buildBaseName(date)).toBe('UsrHelper_2026-07-17_14-32-05');
  });
});

describe('file names', () => {
  const base = buildBaseName(date);
  it('screenshot is png', () => {
    expect(screenshotFilename(base)).toBe('UsrHelper_2026-07-17_14-32-05.png');
  });
  it('companion is json', () => {
    expect(companionFilename(base)).toBe('UsrHelper_2026-07-17_14-32-05.json');
  });
  it('clips are numbered with zero padding', () => {
    expect(clipFilename(base, 1)).toBe('UsrHelper_2026-07-17_14-32-05_part-01.webm');
    expect(clipFilename(base, 12)).toBe('UsrHelper_2026-07-17_14-32-05_part-12.webm');
  });
});

describe('sanitizeSubfolder', () => {
  it('keeps normal nested folders', () => {
    expect(sanitizeSubfolder('UsrHelper/project-X')).toBe('UsrHelper/project-X');
  });
  it('strips illegal characters and dot segments', () => {
    expect(sanitizeSubfolder('  a<b>:c"|?*  ')).toBe('abc');
    expect(sanitizeSubfolder('../..//escape')).toBe('escape');
    expect(sanitizeSubfolder('a\\b')).toBe('a/b');
  });
  it('falls back to UsrHelper when empty', () => {
    expect(sanitizeSubfolder('')).toBe('UsrHelper');
    expect(sanitizeSubfolder('///')).toBe('UsrHelper');
  });
});

describe('buildDownloadPath', () => {
  it('joins sanitized subfolder and file name', () => {
    expect(buildDownloadPath('UsrHelper/project-X', 'a.png')).toBe('UsrHelper/project-X/a.png');
  });
});

describe('profileFilename', () => {
  it('slugifies the profile name', () => {
    expect(profileFilename('Deployment QA')).toBe('UsrHelper_profile_deployment-qa.json');
  });

  it('strips diacritics and punctuation a filesystem would rather not see', () => {
    expect(profileFilename('Wdrożenie / klient #2')).toBe('UsrHelper_profile_wdrozenie-klient-2.json');
  });

  it('falls back when the name leaves nothing usable', () => {
    expect(profileFilename('///')).toBe('UsrHelper_profile_profile.json');
    expect(profileFilename('')).toBe('UsrHelper_profile_profile.json');
  });

  it('keeps the name short enough to stay a filename', () => {
    expect(profileFilename('x'.repeat(200)).length).toBeLessThanOrEqual('UsrHelper_profile_.json'.length + 40);
  });
});
