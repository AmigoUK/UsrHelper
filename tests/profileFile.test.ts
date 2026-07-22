import { describe, expect, it } from 'vitest';
import { buildProfileFile, parseProfileFile } from '../lib/profileFile';
import type { ProjectProfile } from '../lib/types';

const profile: ProjectProfile = {
  id: 'p1',
  name: 'Deployment QA',
  emailTo: ['dev@example.com', 'qa@example.com'],
  emailCc: ['boss@example.com'],
  domains: ['app.example.com', '*.staging.example.com'],
  subjectPrefix: '[Project X]',
  subfolder: 'UsrHelper/projectx',
  descriptionTemplate: 'Steps:\n1. ',
  clipMinutes: 3,
  maxMinutes: 20,
};

const fileText = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ ...buildProfileFile(profile), ...overrides });

describe('buildProfileFile', () => {
  it('carries the project settings a developer wants to share', () => {
    const file = buildProfileFile(profile);
    expect(file.kind).toBe('usrhelper-profile');
    expect(file.version).toBe(1);
    expect(file.profile.name).toBe('Deployment QA');
    expect(file.profile.emailTo).toEqual(['dev@example.com', 'qa@example.com']);
    expect(file.profile.domains).toEqual(['app.example.com', '*.staging.example.com']);
  });

  it('never carries the profile id, so an import cannot overwrite another profile', () => {
    expect(JSON.stringify(buildProfileFile(profile))).not.toContain('p1');
  });
});

describe('parseProfileFile', () => {
  it('accepts a file it produced itself', () => {
    const result = parseProfileFile(fileText());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile).toEqual({
      name: 'Deployment QA',
      emailTo: ['dev@example.com', 'qa@example.com'],
      emailCc: ['boss@example.com'],
      domains: ['app.example.com', '*.staging.example.com'],
      subjectPrefix: '[Project X]',
      subfolder: 'UsrHelper/projectx',
      descriptionTemplate: 'Steps:\n1. ',
      clipMinutes: 3,
      maxMinutes: 20,
    });
  });

  it('rejects something that is not JSON', () => {
    const result = parseProfileFile('not json at all');
    expect(result).toEqual({ ok: false, error: 'notJson' });
  });

  it('rejects JSON that is not a profile file', () => {
    expect(parseProfileFile(JSON.stringify({ hello: 'world' }))).toEqual({ ok: false, error: 'notProfile' });
  });

  it('rejects a newer file format rather than guessing at it', () => {
    expect(parseProfileFile(fileText({ version: 99 }))).toEqual({ ok: false, error: 'unsupportedVersion' });
  });

  it('strips a path escape out of the subfolder', () => {
    const result = parseProfileFile(fileText({ profile: { ...profile, subfolder: '../../../etc' } }));
    expect(result.ok && result.profile.subfolder).toBe('etc');
  });

  it('drops recipients that are not email addresses', () => {
    const result = parseProfileFile(
      fileText({ profile: { ...profile, emailTo: ['ok@example.com', 'not an email', '', 42] } }),
    );
    expect(result.ok && result.profile.emailTo).toEqual(['ok@example.com']);
  });

  it('drops domain patterns that would match every site', () => {
    const result = parseProfileFile(fileText({ profile: { ...profile, domains: ['*', '*.com', 'app.example.com'] } }));
    expect(result.ok && result.profile.domains).toEqual(['app.example.com']);
  });

  it('clamps recording limits into a sane range', () => {
    const result = parseProfileFile(fileText({ profile: { ...profile, clipMinutes: 9999, maxMinutes: -5 } }));
    expect(result.ok && result.profile.clipMinutes).toBe(60);
    expect(result.ok && result.profile.maxMinutes).toBe(1);
  });

  it('substitutes defaults for missing or wrongly typed fields', () => {
    const result = parseProfileFile(JSON.stringify({ kind: 'usrhelper-profile', version: 1, profile: {} }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.name).toBe('Imported profile');
    expect(result.profile.emailTo).toEqual([]);
    expect(result.profile.subfolder).toBe('UsrHelper');
    expect(result.profile.clipMinutes).toBe(5);
  });

  it('truncates absurdly long text instead of storing it', () => {
    const result = parseProfileFile(
      fileText({ profile: { ...profile, name: 'x'.repeat(500), descriptionTemplate: 'y'.repeat(9000) } }),
    );
    expect(result.ok && result.profile.name.length).toBe(60);
    expect(result.ok && result.profile.descriptionTemplate.length).toBe(2000);
  });

  it('caps how many recipients a file can bring', () => {
    const many = Array.from({ length: 50 }, (_, i) => `user${i}@example.com`);
    const result = parseProfileFile(fileText({ profile: { ...profile, emailTo: many } }));
    expect(result.ok && result.profile.emailTo.length).toBe(20);
  });

  it('ignores unknown keys rather than passing them into storage', () => {
    const result = parseProfileFile(fileText({ profile: { ...profile, evil: 'payload', id: 'other' } }));
    expect(result.ok && JSON.stringify(result.profile)).not.toContain('payload');
    expect(result.ok && 'id' in result.profile).toBe(false);
  });
});
