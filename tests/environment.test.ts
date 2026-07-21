import { describe, expect, it } from 'vitest';
import { describeArchitecture, describeBrowser, describePlatform } from '../lib/environment';

const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';

describe('describePlatform', () => {
  it('reports the real macOS version instead of the frozen 10_15_7', () => {
    expect(describePlatform({ platform: 'macOS', platformVersion: '15.3.0' }, 'MacIntel')).toBe('macOS 15.3.0');
  });

  it('names Windows 11 from its platform version', () => {
    expect(describePlatform({ platform: 'Windows', platformVersion: '15.0.0' }, 'Win32')).toBe('Windows 11');
  });

  it('names Windows 10 from its platform version', () => {
    expect(describePlatform({ platform: 'Windows', platformVersion: '10.0.0' }, 'Win32')).toBe('Windows 10');
  });

  it('omits the version when the platform does not report one', () => {
    expect(describePlatform({ platform: 'Linux', platformVersion: '' }, 'Linux x86_64')).toBe('Linux');
  });

  it('falls back to the legacy platform string without hints', () => {
    expect(describePlatform(null, 'MacIntel')).toBe('MacIntel');
    expect(describePlatform({}, 'Linux x86_64')).toBe('Linux x86_64');
  });
});

describe('describeArchitecture', () => {
  it('identifies Apple Silicon', () => {
    expect(describeArchitecture({ architecture: 'arm', bitness: '64' })).toBe('arm64');
  });

  it('identifies 64-bit Intel/AMD', () => {
    expect(describeArchitecture({ architecture: 'x86', bitness: '64' })).toBe('x86-64');
  });

  it('keeps the architecture alone when bitness is missing', () => {
    expect(describeArchitecture({ architecture: 'arm' })).toBe('arm');
  });

  it('is empty when nothing is known', () => {
    expect(describeArchitecture(null)).toBe('');
    expect(describeArchitecture({})).toBe('');
  });
});

describe('describeBrowser', () => {
  it('uses the full version list, which is not reduced like the UA string', () => {
    const hints = {
      fullVersionList: [
        { brand: 'Not)A;Brand', version: '24.0.0.0' },
        { brand: 'Chromium', version: '150.0.7827.55' },
        { brand: 'Google Chrome', version: '150.0.7827.55' },
      ],
    };
    expect(describeBrowser(hints, MAC_UA)).toBe('Google Chrome 150.0.7827.55');
  });

  it('accepts Chromium when no Chrome brand is present', () => {
    const hints = { fullVersionList: [{ brand: 'Chromium', version: '150.0.7827.55' }] };
    expect(describeBrowser(hints, MAC_UA)).toBe('Chromium 150.0.7827.55');
  });

  it('ignores the greased brand entirely', () => {
    const hints = { fullVersionList: [{ brand: 'Not)A;Brand', version: '24.0.0.0' }] };
    expect(describeBrowser(hints, MAC_UA)).toBe('Chrome 150.0.0.0');
  });

  it('falls back to the reduced version from the UA string', () => {
    expect(describeBrowser(null, MAC_UA)).toBe('Chrome 150.0.0.0');
  });

  it('is empty when the UA string has no Chrome version either', () => {
    expect(describeBrowser(null, 'Mozilla/5.0 (compatible)')).toBe('');
  });
});
