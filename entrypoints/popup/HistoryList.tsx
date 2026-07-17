import { useEffect, useState } from 'preact/hooks';
import { useT } from '@/lib/i18n';
import { buildMailtoUrl } from '@/lib/mailto';
import { loadHistory, getActiveProfile } from '@/lib/storage';
import { showFile } from '@/lib/save';
import type { HistoryEntry } from '@/lib/types';

async function reEmail(entry: HistoryEntry): Promise<void> {
  const profile = await getActiveProfile();
  const lines = [entry.description, '', entry.pageUrl, '', `Attach: ${entry.files.join(', ')}`]
    .filter((l, i) => l !== '' || i === 1 || i === 3)
    .join('\n');
  const subject = `${profile.subjectPrefix} ${entry.kind === 'screenshot' ? 'Screenshot' : 'Screencast'} — ${
    entry.pageTitle || new Date(entry.createdAt).toLocaleString()
  }`.trim();
  const url = buildMailtoUrl({
    to: profile.emailTo,
    cc: profile.emailCc,
    subject,
    body: lines,
  });
  await chrome.tabs.create({ url });
}

export function HistoryList() {
  const { t } = useT();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    void loadHistory().then(setHistory);
  }, []);

  return (
    <div style="margin-top: 14px;">
      <h2 style="margin: 0 0 6px;">{t('popup.history.title')}</h2>
      {history.length === 0 && <div class="hint">{t('popup.history.empty')}</div>}
      {history.slice(0, 5).map((entry) => (
        <div key={entry.id} class="card" style="padding: 8px; margin-bottom: 6px;">
          <div class="row">
            {entry.thumbnailDataUrl && (
              <img
                src={entry.thumbnailDataUrl}
                style="width: 48px; height: 36px; object-fit: cover; border-radius: 4px; flex: 0 0 auto;"
              />
            )}
            <div style="min-width: 0;">
              <div style="font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                {entry.kind === 'screenshot' ? '📷' : '🎥'} {entry.pageTitle || entry.pageUrl}
              </div>
              <div class="hint">{new Date(entry.createdAt).toLocaleString()}</div>
            </div>
          </div>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <button style="font-size: 11px; padding: 3px 8px;" onClick={() => showFile(entry.downloadIds[0])}>
              {t('popup.history.open')}
            </button>
            <button style="font-size: 11px; padding: 3px 8px;" onClick={() => void reEmail(entry)}>
              {t('popup.history.mailto')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
