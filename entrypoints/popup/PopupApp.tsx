import { useEffect, useState } from 'preact/hooks';
import { AppVersion } from '@/components/AppVersion';
import { useT } from '@/lib/i18n';
import type { CaptureMode } from '@/lib/messages';
import { isRestrictedUrl, sendToBackground } from '@/lib/messages';
import { loadSettings, saveSettings } from '@/lib/storage';
import type { Settings } from '@/lib/types';
import { HistoryList } from './HistoryList';

export function PopupApp() {
  const { t } = useT();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    void loadSettings().then(setSettings);
    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => setRestricted(isRestrictedUrl(tab?.url)));
  }, []);

  const capture = async (mode: CaptureMode) => {
    await sendToBackground({ type: 'capture', mode });
    window.close();
  };

  const startRecording = async () => {
    await chrome.tabs.create({ url: chrome.runtime.getURL('/recorder.html') });
    window.close();
  };

  const switchProfile = (id: string) => {
    if (!settings) return;
    const next = { ...settings, activeProfileId: id };
    setSettings(next);
    void saveSettings(next);
  };

  return (
    <div style="width: 320px; padding: 12px;">
      <div class="row" style="margin-bottom: 10px;">
        <strong style="font-size: 15px;">
          {t('app.name')}
          <AppVersion />
        </strong>
        <button
          style="flex: 0 0 auto;"
          onClick={() => chrome.runtime.openOptionsPage()}
          title={t('popup.settings')}
        >
          ⚙ {t('popup.settings')}
        </button>
      </div>

      {settings && settings.profiles.length > 1 && (
        <div style="margin-bottom: 10px;">
          <label>{t('popup.profile.label')}</label>
          <select
            value={settings.activeProfileId}
            onChange={(e) => switchProfile(e.currentTarget.value)}
          >
            {settings.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {restricted && <div class="hint" style="margin-bottom: 8px;">{t('popup.pageNotSupported')}</div>}

      <div style="display: grid; gap: 6px;">
        <button class="primary" disabled={restricted} onClick={() => capture('visible')}>
          📷 {t('popup.screenshot.visible')}
        </button>
        <button disabled={restricted} onClick={() => capture('fullpage')}>
          📜 {t('popup.screenshot.fullpage')}
        </button>
        <button disabled={restricted} onClick={() => capture('region')}>
          ✂ {t('popup.screenshot.region')}
        </button>
        <button onClick={startRecording}>🎥 {t('popup.record.start')}</button>
      </div>

      <HistoryList />
    </div>
  );
}
