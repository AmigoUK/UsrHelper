import { parseDomainList } from './domainScope';
import { sanitizeSubfolder } from './filenames';
import type { ProjectProfile } from './types';

/** A profile without its local id — the id is assigned when the file is imported. */
export type SharedProfile = Omit<ProjectProfile, 'id'>;

export interface ProfileFile {
  kind: 'usrhelper-profile';
  version: 1;
  profile: SharedProfile;
}

const KIND = 'usrhelper-profile';
const VERSION = 1;

const MAX_NAME = 60;
const MAX_PREFIX = 60;
const MAX_TEMPLATE = 2000;
const MAX_RECIPIENTS = 20;
const MAX_DOMAINS = 20;

/** Deliberately lenient: enough to reject prose, not to police valid addresses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Everything a developer wants to hand to a tester, and nothing else. Reporter
 * details are per-person and report history never leaves the machine, so
 * neither is here; the id is dropped so an import can never overwrite an
 * existing profile.
 */
export function buildProfileFile(profile: ProjectProfile): ProfileFile {
  return {
    kind: KIND,
    version: VERSION,
    profile: {
      name: profile.name,
      emailTo: [...profile.emailTo],
      emailCc: [...profile.emailCc],
      domains: [...(profile.domains ?? [])],
      subjectPrefix: profile.subjectPrefix,
      subfolder: profile.subfolder,
      descriptionTemplate: profile.descriptionTemplate,
      clipMinutes: profile.clipMinutes,
      maxMinutes: profile.maxMinutes,
    },
  };
}

export type ParseResult =
  | { ok: true; profile: SharedProfile }
  | { ok: false; error: 'notJson' | 'notProfile' | 'unsupportedVersion' };

const text = (value: unknown, max: number, fallback = ''): string =>
  typeof value === 'string' ? value.slice(0, max) : fallback;

const recipients = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === 'string' && EMAIL.test(v.trim()))
        .map((v) => v.trim())
        .slice(0, MAX_RECIPIENTS)
    : [];

const minutes = (value: unknown, fallback: number, max: number): number => {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(Math.max(n, 1), max);
};

/**
 * Reads a shared profile file. Everything in it is untrusted input from someone
 * else's machine, so each field is validated and clamped and unknown keys are
 * dropped — the result is built explicitly rather than spread from the file.
 */
export function parseProfileFile(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'notJson' };
  }
  if (typeof parsed !== 'object' || parsed === null) return { ok: false, error: 'notProfile' };
  const file = parsed as Record<string, unknown>;
  if (file.kind !== KIND) return { ok: false, error: 'notProfile' };
  if (typeof file.version !== 'number' || file.version > VERSION) {
    return { ok: false, error: 'unsupportedVersion' };
  }
  const source = (typeof file.profile === 'object' && file.profile !== null ? file.profile : {}) as Record<
    string,
    unknown
  >;

  const name = text(source.name, MAX_NAME).trim();
  const domains = Array.isArray(source.domains)
    ? parseDomainList(source.domains.filter((d): d is string => typeof d === 'string').join(',')).slice(0, MAX_DOMAINS)
    : [];

  return {
    ok: true,
    profile: {
      name: name || 'Imported profile',
      emailTo: recipients(source.emailTo),
      emailCc: recipients(source.emailCc),
      domains,
      subjectPrefix: text(source.subjectPrefix, MAX_PREFIX, '[UsrHelper]'),
      subfolder: sanitizeSubfolder(text(source.subfolder, 200)),
      descriptionTemplate: text(source.descriptionTemplate, MAX_TEMPLATE),
      clipMinutes: minutes(source.clipMinutes, 5, 60),
      maxMinutes: minutes(source.maxMinutes, 30, 240),
    },
  };
}
