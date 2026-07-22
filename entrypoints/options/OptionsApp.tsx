import { useEffect, useState } from 'preact/hooks';
import { AppFooter } from '@/components/AppFooter';
import { AppVersion } from '@/components/AppVersion';
import { useT, type Language } from '@/lib/i18n';
import { parseDomainList } from '@/lib/domainScope';
import { defaultProfile, loadSettings, newId, saveSettings } from '@/lib/storage';
import type { ProjectProfile, Settings } from '@/lib/types';

const emailList = (value: string): string[] =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export function OptionsApp() {
  const { t, lang, setLang } = useT();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  if (!settings) return null;

  const persist = (next: Settings) => {
    setSettings(next);
    void saveSettings(next).then(() => {
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 1500);
    });
  };

  const updateProfile = (id: string, patch: Partial<ProjectProfile>) => {
    persist({
      ...settings,
      profiles: settings.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };

  const addProfile = () => {
    const profile = defaultProfile(newId());
    profile.name = `Profile ${settings.profiles.length + 1}`;
    persist({ ...settings, profiles: [...settings.profiles, profile], activeProfileId: profile.id });
  };

  const deleteProfile = (id: string) => {
    if (settings.profiles.length <= 1) return;
    const profiles = settings.profiles.filter((p) => p.id !== id);
    persist({
      ...settings,
      profiles,
      activeProfileId: settings.activeProfileId === id ? profiles[0].id : settings.activeProfileId,
    });
  };

  const toggle = (key: keyof Settings, label: string) => (
    <label class="toggle">
      <input
        type="checkbox"
        checked={settings[key] as boolean}
        onChange={(e) => persist({ ...settings, [key]: e.currentTarget.checked })}
      />
      {t(label)}
    </label>
  );

  return (
    <div style="max-width: 720px; margin: 0 auto; padding: 24px 16px 0;">
      <h1>
        {t('options.title')}
        <AppVersion />
      </h1>

      <div class="card">
        <label>{t('options.language')}</label>
        <select value={lang} onChange={(e) => setLang(e.currentTarget.value as Language)}>
          <option value="en">{t('options.language.en')}</option>
          <option value="pl">{t('options.language.pl')}</option>
        </select>
      </div>

      <h2>{t('options.reporter.title')}</h2>
      <div class="card">
        <div class="row">
          <div>
            <label>{t('options.reporter.customerNo')}</label>
            <input
              type="text"
              value={settings.reporter.customerNo}
              onChange={(e) =>
                persist({ ...settings, reporter: { ...settings.reporter, customerNo: e.currentTarget.value } })
              }
            />
          </div>
          <div>
            <label>{t('options.reporter.company')}</label>
            <input
              type="text"
              value={settings.reporter.company}
              onChange={(e) =>
                persist({ ...settings, reporter: { ...settings.reporter, company: e.currentTarget.value } })
              }
            />
          </div>
        </div>
        <div class="row">
          <div>
            <label>{t('options.reporter.firstName')}</label>
            <input
              type="text"
              value={settings.reporter.firstName}
              onChange={(e) =>
                persist({ ...settings, reporter: { ...settings.reporter, firstName: e.currentTarget.value } })
              }
            />
          </div>
          <div>
            <label>{t('options.reporter.lastName')}</label>
            <input
              type="text"
              value={settings.reporter.lastName}
              onChange={(e) =>
                persist({ ...settings, reporter: { ...settings.reporter, lastName: e.currentTarget.value } })
              }
            />
          </div>
          <div>
            <label>{t('options.reporter.anyDesk')}</label>
            <input
              type="text"
              value={settings.reporter.anyDesk}
              onChange={(e) =>
                persist({ ...settings, reporter: { ...settings.reporter, anyDesk: e.currentTarget.value } })
              }
            />
          </div>
        </div>
        <div class="hint">{t('options.reporter.hint')}</div>
      </div>

      <h2>{t('options.profiles.title')}</h2>
      {settings.profiles.map((profile) => (
        <div class="card" key={profile.id}>
          <div class="row">
            <div>
              <label>{t('options.profiles.name')}</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => updateProfile(profile.id, { name: e.currentTarget.value })}
              />
            </div>
            <div style="flex: 0 0 auto; display: flex; gap: 8px; align-items: flex-end; padding-top: 18px;">
              <label class="toggle" style="margin: 0;">
                <input
                  type="radio"
                  name="activeProfile"
                  checked={settings.activeProfileId === profile.id}
                  onChange={() => persist({ ...settings, activeProfileId: profile.id })}
                />
                {t('options.profiles.active')}
              </label>
              <button
                class="danger"
                disabled={settings.profiles.length <= 1}
                onClick={() => deleteProfile(profile.id)}
              >
                {t('options.profiles.delete')}
              </button>
            </div>
          </div>

          <label>{t('options.email.to')}</label>
          <input
            type="text"
            placeholder="dev@example.com, qa@example.com"
            value={profile.emailTo.join(', ')}
            onChange={(e) => updateProfile(profile.id, { emailTo: emailList(e.currentTarget.value) })}
          />

          <label>{t('options.email.cc')}</label>
          <input
            type="text"
            placeholder="manager@example.com"
            value={profile.emailCc.join(', ')}
            onChange={(e) => updateProfile(profile.id, { emailCc: emailList(e.currentTarget.value) })}
          />

          <label>{t('options.console.domains')}</label>
          <input
            type="text"
            placeholder="app.example.com, *.staging.example.com, localhost"
            value={(profile.domains ?? []).join(', ')}
            onChange={(e) => updateProfile(profile.id, { domains: parseDomainList(e.currentTarget.value) })}
          />
          <div class="hint">{t('options.console.domainsHint')}</div>

          <div class="row">
            <div>
              <label>{t('options.email.subjectPrefix')}</label>
              <input
                type="text"
                value={profile.subjectPrefix}
                onChange={(e) => updateProfile(profile.id, { subjectPrefix: e.currentTarget.value })}
              />
            </div>
            <div>
              <label>{t('options.folder.label')}</label>
              <input
                type="text"
                value={profile.subfolder}
                onChange={(e) => updateProfile(profile.id, { subfolder: e.currentTarget.value })}
              />
            </div>
          </div>
          <div class="hint">{t('options.folder.hint')}</div>

          <label>{t('options.template.label')}</label>
          <textarea
            rows={3}
            value={profile.descriptionTemplate}
            onChange={(e) =>
              updateProfile(profile.id, { descriptionTemplate: e.currentTarget.value })
            }
          />
          <div class="hint">{t('options.template.hint')}</div>

          <div class="row">
            <div>
              <label>{t('options.record.clipMinutes')}</label>
              <input
                type="number"
                min={1}
                max={30}
                value={profile.clipMinutes}
                onChange={(e) =>
                  updateProfile(profile.id, {
                    clipMinutes: Math.max(1, Number(e.currentTarget.value) || 5),
                  })
                }
              />
            </div>
            <div>
              <label>{t('options.record.maxMinutes')}</label>
              <input
                type="number"
                min={1}
                max={180}
                value={profile.maxMinutes}
                onChange={(e) =>
                  updateProfile(profile.id, {
                    maxMinutes: Math.max(1, Number(e.currentTarget.value) || 30),
                  })
                }
              />
            </div>
          </div>
        </div>
      ))}
      <button onClick={addProfile}>{t('options.profiles.add')}</button>

      <h2>{t('recorder.title')}</h2>
      <div class="card">
        {toggle('showRipples', 'options.record.ripples')}
        {toggle('showKeystrokes', 'options.record.keystrokes')}
        {toggle('showCameraBubble', 'options.record.camera')}
        {toggle('showTimestampOverlay', 'options.record.timestampOverlay')}
      </div>

      <h2>{t('editor.title')}</h2>
      <div class="card">
        {toggle('stampTimestampOnScreenshots', 'options.screenshot.timestampStamp')}
        {toggle('trackClickPath', 'options.screenshot.clickPath')}
        {toggle('captureConsoleErrors', 'options.console.capture')}
      </div>

      {savedToast && <div class="toast">{t('options.saved')}</div>}
      <AppFooter />
    </div>
  );
}
