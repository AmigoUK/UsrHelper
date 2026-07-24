import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { buildBaseName, clipFilename, companionFilename } from '@/lib/filenames';
import { AppVersion } from '@/components/AppVersion';
import { useT } from '@/lib/i18n';
import { buildMailtoUrl, buildReportBody } from '@/lib/mailto';
import { buildMarkdownReport } from '@/lib/markdownReport';
import { copyText } from '@/lib/clipboard';
import { collectEnvironment, extensionVersion } from '@/lib/metadata';
import { ClipRecorder, composeStreams } from '@/lib/recording';
import { saveBlob, saveJson, type SavedFile } from '@/lib/save';
import { addHistoryEntry, getActiveProfile, loadSettings, newId } from '@/lib/storage';
import type { ProjectProfile, ReportMetadata, Settings } from '@/lib/types';

type Phase = 'setup' | 'countdown' | 'recording' | 'saving' | 'done' | 'error';

interface MicState {
  status: 'ok' | 'none' | 'denied' | 'pending';
  stream?: MediaStream;
}

export function RecorderApp() {
  const { t } = useT();
  const [phase, setPhase] = useState<Phase>('setup');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [profile, setProfile] = useState<ProjectProfile | null>(null);
  const [mic, setMic] = useState<MicState>({ status: 'pending' });
  const [micLevel, setMicLevel] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [clipIndex, setClipIndex] = useState(1);
  const [paused, setPaused] = useState(false);
  const [description, setDescription] = useState('');
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
  const [limitHit, setLimitHit] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** Set only when the clipboard refused the write — holds the text to copy by hand. */
  const [copyFallback, setCopyFallback] = useState<string | null>(null);

  /** The fallback box exists to be copied, so it opens ready for Ctrl/Cmd+C. */
  const selectAll = useCallback((el: HTMLTextAreaElement | null) => {
    el?.focus();
    el?.select();
  }, []);

  const recorderRef = useRef<ClipRecorder | null>(null);
  const streamsRef = useRef<{ display?: MediaStream; camera?: MediaStream; compositorStop?: () => void }>({});
  const clipsRef = useRef<{ blob: Blob; index: number }[]>([]);
  const baseNameRef = useRef('');
  const startedAtRef = useRef('');
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    void loadSettings().then((s) => {
      setSettings(s);
      setCameraOn(s.showCameraBubble);
    });
    void getActiveProfile().then((p) => {
      setProfile(p);
      if (p.descriptionTemplate) setDescription(p.descriptionTemplate);
    });
    void initMicrophone();
    return () => cleanupStreams();
  }, []);

  async function initMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMic({ status: 'ok', stream });
      attachLevelMeter(stream);
    } catch (err) {
      const name = (err as DOMException)?.name;
      setMic({ status: name === 'NotFoundError' ? 'none' : 'denied' });
    }
  }

  function attachLevelMeter(stream: MediaStream) {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      if (!audioCtxRef.current) return;
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      setMicLevel(Math.min(100, Math.round((peak / 64) * 100)));
      requestAnimationFrame(loop);
    };
    loop();
  }

  function cleanupStreams() {
    streamsRef.current.compositorStop?.();
    streamsRef.current.display?.getTracks().forEach((t) => t.stop());
    streamsRef.current.camera?.getTracks().forEach((t) => t.stop());
    mic.stream?.getTracks().forEach((t) => t.stop());
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    void chrome.runtime.sendMessage({ type: 'recording:setOverlays', enabled: false }).catch(() => {});
  }

  async function begin() {
    if (!settings || !profile) return;
    let display: MediaStream;
    try {
      display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
    } catch {
      setErrorKey('recorder.screenDenied');
      setPhase('error');
      return;
    }
    streamsRef.current.display = display;
    display.getVideoTracks()[0].addEventListener('ended', () => void stopRecording());

    let camera: MediaStream | undefined;
    if (cameraOn) {
      try {
        camera = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        streamsRef.current.camera = camera;
      } catch {
        camera = undefined;
      }
    }

    // Countdown 3-2-1 before recording starts.
    setPhase('countdown');
    for (let n = 3; n > 0; n--) {
      setCountdown(n);
      await new Promise((r) => setTimeout(r, 1000));
    }

    const audioTracks = mic.stream?.getAudioTracks() ?? [];
    let recordedStream: MediaStream;
    if (camera || settings.showTimestampOverlay) {
      const composed = composeStreams(display, audioTracks, {
        cameraStream: camera,
        timestamp: settings.showTimestampOverlay,
      });
      recordedStream = composed.stream;
      streamsRef.current.compositorStop = composed.stop;
    } else {
      recordedStream = new MediaStream([...display.getVideoTracks(), ...audioTracks]);
    }

    await chrome.runtime
      .sendMessage({
        type: 'recording:setOverlays',
        enabled: true,
        options: {
          ripples: settings.showRipples,
          keystrokes: settings.showKeystrokes,
          timestamp: false, // burned in by the compositor instead
        },
      })
      .catch(() => {});

    const now = new Date();
    baseNameRef.current = buildBaseName(now);
    startedAtRef.current = now.toISOString();
    clipsRef.current = [];

    const recorder = new ClipRecorder(recordedStream, {
      clipMs: profile.clipMinutes * 60_000,
      maxMs: profile.maxMinutes * 60_000,
      onClip: (blob, index) => {
        clipsRef.current.push({ blob, index });
        void saveClip(blob, index);
      },
      onTick: (total, clip, isPaused) => {
        setElapsed(total);
        setClipIndex(clip);
        setPaused(isPaused);
      },
      onLimit: () => {
        setLimitHit(true);
        void finishRecording();
      },
    });
    recorderRef.current = recorder;
    recorder.start();
    setPhase('recording');
  }

  async function saveClip(blob: Blob, index: number) {
    if (!profile) return;
    try {
      const file = await saveBlob(blob, profile.subfolder, clipFilename(baseNameRef.current, index));
      setSavedFiles((prev) => [...prev, file]);
    } catch (err) {
      console.error('clip save failed', err);
      setErrorKey('editor.saveError');
    }
  }

  async function stopRecording() {
    if (!recorderRef.current) return;
    await recorderRef.current.stop();
    await finishRecording();
  }

  async function finishRecording() {
    if (phase === 'saving' || phase === 'done') return;
    setPhase('saving');
    // Give the last clip's save a moment to register.
    await new Promise((r) => setTimeout(r, 300));
    cleanupStreams();
    setPhase('done');
  }

  async function buildMetadata(files: string[]): Promise<ReportMetadata> {
    return {
      kind: 'screencast',
      reporter: settings?.reporter,
      description,
      capturedAt: startedAtRef.current,
      pageUrl: '',
      pageTitle: '',
      environment: await collectEnvironment(),
      consoleErrors: [],
      clickPath: [],
      notes: [],
      files,
      extensionVersion: extensionVersion(),
    };
  }

  async function saveReport(handoff: 'none' | 'email' | 'clipboard') {
    if (!profile) return;
    setCopied(false);
    setCopyFallback(null);
    const filePaths = savedFiles.map((f) => f.path);
    const meta = await buildMetadata(filePaths);
    try {
      const json = await saveJson(meta, profile.subfolder, companionFilename(baseNameRef.current));
      const allFiles = [...savedFiles, json];
      await addHistoryEntry({
        id: newId(),
        kind: 'screencast',
        createdAt: new Date().toISOString(),
        files: allFiles.map((f) => f.path),
        downloadIds: allFiles.map((f) => f.downloadId),
        description,
        pageUrl: '',
        pageTitle: '',
      });
      const reported = { ...meta, files: allFiles.map((f) => f.path) };
      if (handoff === 'email') {
        const url = buildMailtoUrl({
          to: profile.emailTo,
          cc: profile.emailCc,
          subject: `${profile.subjectPrefix} ${t('mailto.subject.screencast')}`.trim(),
          body: buildReportBody(reported, t),
          truncationNote: t('mailto.truncated'),
        });
        window.open(url, '_self');
      } else if (handoff === 'clipboard') {
        const markdown = buildMarkdownReport(reported, t);
        // The clips are already on disk, so a refused clipboard costs the paste,
        // not the recording — hand the text over to be copied by hand instead.
        if (await copyText(markdown)) setCopied(true);
        else setCopyFallback(markdown);
      }
    } catch (err) {
      console.error(err);
      setErrorKey('editor.saveError');
    }
  }

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div style="max-width: 560px; margin: 0 auto; padding: 32px 16px;">
      <h1>
        {t('recorder.title')}
        <AppVersion />
      </h1>

      {phase === 'setup' && (
        <div class="card">
          <label>{t('recorder.mic.label')}</label>
          {mic.status === 'ok' && (
            <div style="background: var(--panel-2); border-radius: 6px; height: 12px; overflow: hidden;">
              <div
                style={`height: 100%; width: ${micLevel}%; background: ${micLevel > 5 ? 'var(--ok)' : 'var(--faint)'}; transition: width 0.1s;`}
              />
            </div>
          )}
          {mic.status === 'none' && <div class="hint">{t('recorder.mic.none')}</div>}
          {mic.status === 'denied' && <div class="hint" style="color: var(--danger);">{t('recorder.mic.denied')}</div>}

          <label class="toggle" style="margin-top: 14px;">
            <input type="checkbox" checked={cameraOn} onChange={(e) => setCameraOn(e.currentTarget.checked)} />
            {t('recorder.camera.label')}
          </label>

          {profile && (
            <div class="hint" style="margin-top: 8px;">
              {t('options.record.clipMinutes')}: {profile.clipMinutes} · {t('options.record.maxMinutes')}: {profile.maxMinutes}
            </div>
          )}

          <button class="primary" style="margin-top: 16px; width: 100%;" onClick={() => void begin()}>
            🎥 {t('recorder.start')}
          </button>
          <div class="hint" style="margin-top: 6px;">{t('recorder.chooseSource')}</div>
        </div>
      )}

      {phase === 'countdown' && (
        <div class="card" style="text-align: center; font-size: 64px; padding: 48px;">
          {countdown}
          <div style="font-size: 14px; color: var(--muted);">{t('recorder.countdown', { n: countdown })}</div>
        </div>
      )}

      {phase === 'recording' && (
        <div class="card">
          <div style="display: flex; align-items: center; gap: 10px; font-size: 22px;">
            <span style={`width: 12px; height: 12px; border-radius: 50%; background: ${paused ? 'var(--faint)' : 'var(--danger)'}; display: inline-block;`} />
            {formatTime(elapsed)}
            <span class="hint">{t('recorder.clip', { n: clipIndex })}</span>
          </div>
          <div style="background: var(--panel-2); border-radius: 6px; height: 8px; overflow: hidden; margin: 10px 0;">
            <div style={`height: 100%; width: ${micLevel}%; background: var(--ok); transition: width 0.1s;`} />
          </div>
          <div class="row">
            {!paused ? (
              <button onClick={() => { recorderRef.current?.pause(); }}>⏸ {t('recorder.pause')}</button>
            ) : (
              <button onClick={() => { recorderRef.current?.resume(); }}>▶ {t('recorder.resume')}</button>
            )}
            <button class="primary" onClick={() => void stopRecording()}>
              ⏹ {t('recorder.stop')}
            </button>
          </div>
        </div>
      )}

      {(phase === 'saving' || phase === 'done') && (
        <div class="card">
          {limitHit && <div style="color: var(--danger); margin-bottom: 8px;">{t('recorder.limitReached')}</div>}
          <div>
            {t('recorder.saved', {
              n: savedFiles.length,
              path: profile?.subfolder ?? 'UsrHelper',
            })}
          </div>
          <ul class="hint" style="margin: 8px 0; padding-left: 18px;">
            {savedFiles.map((f) => (
              <li key={f.path}>{f.path}</li>
            ))}
          </ul>

          <label>{t('editor.description.label')}</label>
          <textarea
            rows={4}
            value={description}
            placeholder={t('editor.description.placeholder')}
            onInput={(e) => setDescription(e.currentTarget.value)}
          />
          <div class="row" style="margin-top: 10px;">
            <button class="primary" disabled={phase === 'saving'} onClick={() => void saveReport('none')}>
              💾 {t('common.save')}
            </button>
            <button class="primary" disabled={phase === 'saving'} onClick={() => void saveReport('email')}>
              ✉ {t('recorder.saveEmail')}
            </button>
            <button class="primary" disabled={phase === 'saving'} onClick={() => void saveReport('clipboard')}>
              📋 {t('recorder.saveCopy')}
            </button>
          </div>
          {savedFiles.length > 0 && (
            <div class="hint" style="margin-top: 8px;">
              {t('mailto.attachReminder', { files: savedFiles.map((f) => f.path).join(', ') })}
            </div>
          )}
          {copied && (
            <div class="card" style="border-color: var(--ok); margin-top: 10px;">{t('clipboard.copied')}</div>
          )}
          {copyFallback && (
            <div class="card" style="border-color: var(--danger); margin-top: 10px;">
              <div>{t('clipboard.error')}</div>
              <textarea
                readOnly
                class="clipboard-fallback"
                ref={selectAll}
                style="width: 100%; min-height: 120px; margin-top: 6px;"
                value={copyFallback}
              />
            </div>
          )}
        </div>
      )}

      {phase === 'error' && errorKey && (
        <div class="card" style="border-color: var(--danger);">
          <div>{t(errorKey)}</div>
          <button style="margin-top: 10px;" onClick={() => { setErrorKey(null); setPhase('setup'); }}>
            {t('editor.retry')}
          </button>
        </div>
      )}
      {phase !== 'error' && errorKey && (
        <div class="card" style="border-color: var(--danger); margin-top: 10px;">{t(errorKey)}</div>
      )}
    </div>
  );
}
