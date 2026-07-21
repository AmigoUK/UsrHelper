import { describe, expect, it } from 'vitest';
import { isDomainAllowed, parseDomainList } from '../lib/domainScope';

describe('parseDomainList', () => {
  it('splits on commas and newlines, trimming and lowercasing', () => {
    expect(parseDomainList(' App.Example.com , staging.example.com\nlocalhost ')).toEqual([
      'app.example.com',
      'staging.example.com',
      'localhost',
    ]);
  });

  it('drops empty entries', () => {
    expect(parseDomainList('example.com,,  ,\n')).toEqual(['example.com']);
  });

  it('rejects patterns that would restore all-sites scope', () => {
    expect(parseDomainList('*, *., *.com, com, example.com')).toEqual(['example.com']);
  });

  it('keeps localhost even though it has no dot', () => {
    expect(parseDomainList('localhost')).toEqual(['localhost']);
  });

  it('strips a leading scheme and any path the user pasted', () => {
    expect(parseDomainList('https://app.example.com/login')).toEqual(['app.example.com']);
  });

  it('returns an empty list for empty input', () => {
    expect(parseDomainList('')).toEqual([]);
  });
});

describe('isDomainAllowed', () => {
  it('is false when no domains are configured', () => {
    expect(isDomainAllowed('app.example.com', [])).toBe(false);
  });

  it('matches an exact hostname', () => {
    expect(isDomainAllowed('app.example.com', ['app.example.com'])).toBe(true);
  });

  it('does not match a different host under the same domain', () => {
    expect(isDomainAllowed('other.example.com', ['app.example.com'])).toBe(false);
  });

  it('does not match a suffix that is not a subdomain boundary', () => {
    expect(isDomainAllowed('notexample.com', ['example.com'])).toBe(false);
    expect(isDomainAllowed('evil-example.com', ['*.example.com'])).toBe(false);
  });

  it('matches subdomains and the bare domain for a wildcard', () => {
    expect(isDomainAllowed('app.example.com', ['*.example.com'])).toBe(true);
    expect(isDomainAllowed('deep.app.example.com', ['*.example.com'])).toBe(true);
    expect(isDomainAllowed('example.com', ['*.example.com'])).toBe(true);
  });

  it('is case-insensitive about the hostname', () => {
    expect(isDomainAllowed('APP.Example.COM', ['app.example.com'])).toBe(true);
  });

  it('ignores a port on the hostname', () => {
    expect(isDomainAllowed('localhost:5173', ['localhost'])).toBe(true);
  });

  it('matches when any configured domain matches', () => {
    expect(isDomainAllowed('localhost', ['app.example.com', 'localhost'])).toBe(true);
  });

  it('ignores configured entries rejected by the guard', () => {
    expect(isDomainAllowed('facebook.com', ['*'])).toBe(false);
    expect(isDomainAllowed('facebook.com', ['*.com'])).toBe(false);
  });
});
