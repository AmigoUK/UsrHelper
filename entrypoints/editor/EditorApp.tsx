import { useEffect, useRef, useState } from 'preact/hooks';
import type { Annotation, Point, Tool } from '@/lib/annotations/model';
import { nextStepNumber } from '@/lib/annotations/model';
import { buildMosaic, renderScene, stampTimestamp } from '@/lib/annotations/render';
import type { CaptureRecord } from '@/lib/captureStore';
import { deleteCapture, getCapture } from '@/lib/captureStore';
import { buildBaseName, companionFilename, screenshotFilename } from '@/lib/filenames';
import { useT } from '@/lib/i18n';
import { buildMailtoUrl, buildReportBody } from '@/lib/mailto';
import { collectEnvironment, extensionVersion } from '@/lib/metadata';
import { saveBlob, saveJson, type SavedFile } from '@/lib/save';
import { addHistoryEntry, getActiveProfile, loadSettings, newId } from '@/lib/storage';
import type { ProjectProfile, ReportMetadata, Settings } from '@/lib/types';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#2563eb', '#a855f7', '#0f172a', '#ffffff'];
const TOOLS: Tool[] = ['select', 'pen', 'rect', 'ellipse', 'arrow', 'text', 'step', 'pixelate', 'crop'];
const TOOL_ICONS: Record<Tool, string> = {
  select: '⬚',
  pen: '✏',
  rect: '▭',
  ellipse: '◯',
  arrow: '↗',
  text: 'T',
  step: '➊',
  pixelate: '▩',
  crop: '⧉',
};

interface HistorySnapshot {
  annotations: Annotation[];
  baseIndex: number;
}

export function EditorApp() {
  const { t } = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [record, setRecord] = useState<CaptureRecord | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);
  const [description, setDescription] = useState('');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [profile, setProfile] = useState<ProjectProfile | null>(null);
  const [savedFiles, setSavedFiles] = useState<SavedFile[] | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; screenX: number; screenY: number } | null>(null);
  const [, forceRender] = useState(0);

  // Mutable editor state kept in refs (canvas drawing happens outside React).
  const bases = useRef<HTMLCanvasElement[]>([]);
  const baseIndex = useRef(0);
  const mosaics = useRef<(HTMLCanvasElement | null)[]>([]);
  const annotations = useRef<Annotation[]>([]);
  const undoStack = useRef<HistorySnapshot[]>([]);
  const redoStack = useRef<HistorySnapshot[]>([]);
  const drawing = useRef<Annotation | null>(null);
  const dragStart = useRef<Point | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) return;
    void (async () => {
      const rec = await getCapture(id);
      if (!rec) return;
      setRecord(rec);
      const s = await loadSettings();
      setSettings(s);
      const p = await getActiveProfile();
      setProfile(p);
      if (p.descriptionTemplate) setDescription(p.descriptionTemplate);

      const bitmap = await createImageBitmap(rec.blob);
      const base = document.createElement('canvas');
      base.width = bitmap.width;
      base.height = bitmap.height;
      base.getContext('2d')!.drawImage(bitmap, 0, 0);
      bases.current = [base];
      mosaics.current = [null];
      redraw();
    })();
  }, []);

  const currentBase = () => bases.current[baseIndex.current];

  const currentMosaic = () => {
    const idx = baseIndex.current;
    if (!mosaics.current[idx]) mosaics.current[idx] = buildMosaic(currentBase());
    return mosaics.current[idx]!;
  };

  function redraw(extra?: Annotation | null) {
    const canvas = canvasRef.current;
    const base = currentBase();
    if (!canvas || !base) return;
    if (canvas.width !== base.width || canvas.height !== base.height) {
      canvas.width = base.width;
      canvas.height = base.height;
    }
    const ctx = canvas.getContext('2d')!;
    const list = extra ? [...annotations.current, extra] : annotations.current;
    const needsMosaic = list.some((a) => a.kind === 'pixelate');
    renderScene(ctx, base, list, needsMosaic ? currentMosaic() : undefined);
    if (cropRect) {
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = Math.max(2, base.width / 500);
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, base.width, cropRect.y);
      ctx.fillRect(0, cropRect.y + cropRect.h, base.width, base.height - cropRect.y - cropRect.h);
      ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.h);
      ctx.fillRect(cropRect.x + cropRect.w, cropRect.y, base.width - cropRect.x - cropRect.w, cropRect.h);
      ctx.restore();
    }
    if (selectedId) {
      const a = annotations.current.find((x) => x.id === selectedId);
      if (a) {
        const box = annotationBounds(a);
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x - 6, box.y - 6, box.w + 12, box.h + 12);
        ctx.restore();
      }
    }
  }

  function snapshot() {
    undoStack.current.push({
      annotations: structuredClone(annotations.current),
      baseIndex: baseIndex.current,
    });
    redoStack.current = [];
    forceRender((n) => n + 1);
  }

  function undo() {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ annotations: structuredClone(annotations.current), baseIndex: baseIndex.current });
    annotations.current = prev.annotations;
    baseIndex.current = prev.baseIndex;
    setSelectedId(null);
    setCropRect(null);
    redraw();
    forceRender((n) => n + 1);
  }

  function redo() {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ annotations: structuredClone(annotations.current), baseIndex: baseIndex.current });
    annotations.current = next.annotations;
    baseIndex.current = next.baseIndex;
    setSelectedId(null);
    redraw();
    forceRender((n) => n + 1);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        snapshot();
        annotations.current = annotations.current.filter((a) => a.id !== selectedId);
        setSelectedId(null);
        redraw();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  function canvasPoint(e: MouseEvent): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function scaledSize(): number {
    // Annotation stroke width scales with image resolution for consistency.
    const base = currentBase();
    return Math.max(2, Math.round((size * base.width) / 1400));
  }

  function onPointerDown(e: MouseEvent) {
    if (!record || textInput) return;
    const p = canvasPoint(e);
    dragStart.current = p;

    if (tool === 'select') {
      const hit = [...annotations.current].reverse().find((a) => hitTest(a, p));
      setSelectedId(hit?.id ?? null);
      if (hit) snapshot();
      redraw();
      return;
    }
    if (tool === 'text') {
      setTextInput({ x: p.x, y: p.y, screenX: e.clientX, screenY: e.clientY });
      return;
    }
    if (tool === 'step') {
      snapshot();
      annotations.current.push({
        id: newId(),
        kind: 'step',
        x: p.x,
        y: p.y,
        n: nextStepNumber(annotations.current),
        color,
        size: scaledSize(),
      });
      redraw();
      return;
    }
    if (tool === 'crop') {
      setCropRect(null);
      drawing.current = null;
      return;
    }
    const id = newId();
    const s = tool === 'pixelate' ? scaledSize() * 6 : scaledSize();
    if (tool === 'pen' || tool === 'pixelate') {
      drawing.current = { id, kind: tool, points: [p], color, size: s };
    } else if (tool === 'rect' || tool === 'ellipse') {
      drawing.current = { id, kind: tool, x: p.x, y: p.y, w: 0, h: 0, color, size: s };
    } else if (tool === 'arrow') {
      drawing.current = { id, kind: 'arrow', x1: p.x, y1: p.y, x2: p.x, y2: p.y, color, size: s };
    }
  }

  function onPointerMove(e: MouseEvent) {
    if (!dragStart.current) return;
    const p = canvasPoint(e);

    if (tool === 'select' && selectedId) {
      const a = annotations.current.find((x) => x.id === selectedId);
      if (a) {
        moveAnnotation(a, p.x - dragStart.current.x, p.y - dragStart.current.y);
        dragStart.current = p;
        redraw();
      }
      return;
    }
    if (tool === 'crop') {
      const start = dragStart.current;
      setCropRect({
        x: Math.min(start.x, p.x),
        y: Math.min(start.y, p.y),
        w: Math.abs(p.x - start.x),
        h: Math.abs(p.y - start.y),
      });
      redraw();
      return;
    }
    const d = drawing.current;
    if (!d) return;
    if (d.kind === 'pen' || d.kind === 'pixelate') {
      d.points.push(p);
    } else if (d.kind === 'rect' || d.kind === 'ellipse') {
      d.x = Math.min(dragStart.current.x, p.x);
      d.y = Math.min(dragStart.current.y, p.y);
      d.w = Math.abs(p.x - dragStart.current.x);
      d.h = Math.abs(p.y - dragStart.current.y);
    } else if (d.kind === 'arrow') {
      d.x2 = p.x;
      d.y2 = p.y;
    }
    redraw(d);
  }

  function onPointerUp() {
    dragStart.current = null;
    const d = drawing.current;
    if (d) {
      drawing.current = null;
      snapshot();
      annotations.current.push(d);
      redraw();
    }
  }

  function commitText(value: string) {
    if (textInput && value.trim()) {
      snapshot();
      annotations.current.push({
        id: newId(),
        kind: 'text',
        x: textInput.x,
        y: textInput.y,
        text: value,
        color,
        size: scaledSize(),
      });
    }
    setTextInput(null);
    redraw();
  }

  function applyCrop() {
    if (!cropRect || cropRect.w < 10 || cropRect.h < 10) return;
    snapshot();
    const base = currentBase();
    const next = document.createElement('canvas');
    next.width = Math.round(cropRect.w);
    next.height = Math.round(cropRect.h);
    next
      .getContext('2d')!
      .drawImage(base, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
    bases.current.push(next);
    mosaics.current.push(null);
    baseIndex.current = bases.current.length - 1;
    for (const a of annotations.current) moveAnnotation(a, -cropRect.x, -cropRect.y);
    setCropRect(null);
    setTool('select');
    redraw();
  }

  function addClickPath() {
    if (!record || record.clickPath.length === 0) return;
    snapshot();
    const dpr = record.devicePixelRatio;
    let n = nextStepNumber(annotations.current);
    for (const click of record.clickPath) {
      let x = click.x;
      let y = click.y;
      if (record.mode === 'fullpage') {
        x += click.scrollX;
        y += click.scrollY;
      } else if (record.mode === 'region' && record.regionOrigin) {
        x -= record.regionOrigin.x;
        y -= record.regionOrigin.y;
      }
      x *= dpr;
      y *= dpr;
      const base = currentBase();
      if (x < 0 || y < 0 || x > base.width || y > base.height) continue;
      annotations.current.push({
        id: newId(),
        kind: 'step',
        x,
        y,
        n: n++,
        color: '#f97316',
        size: scaledSize(),
      });
    }
    redraw();
  }

  async function exportImage(): Promise<{ blob: Blob; thumbnail: string }> {
    const base = currentBase();
    const out = document.createElement('canvas');
    out.width = base.width;
    out.height = base.height;
    const ctx = out.getContext('2d')!;
    const needsMosaic = annotations.current.some((a) => a.kind === 'pixelate');
    renderScene(ctx, base, annotations.current, needsMosaic ? currentMosaic() : undefined);
    if (settings?.stampTimestampOnScreenshots && record) {
      stampTimestamp(ctx, out.width, out.height, new Date(record.capturedAt).toLocaleString());
    }
    const blob = await new Promise<Blob>((resolve, reject) =>
      out.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
    );
    const thumb = document.createElement('canvas');
    thumb.width = 96;
    thumb.height = Math.round((96 / out.width) * out.height);
    thumb.getContext('2d')!.drawImage(out, 0, 0, thumb.width, thumb.height);
    return { blob, thumbnail: thumb.toDataURL('image/jpeg', 0.7) };
  }

  function buildMetadata(files: string[]): ReportMetadata {
    return {
      kind: 'screenshot',
      reporter: settings?.reporter,
      description,
      capturedAt: record!.capturedAt,
      pageUrl: record!.pageUrl,
      pageTitle: record!.pageTitle,
      environment: collectEnvironment(),
      consoleErrors: settings?.captureConsoleErrors ? record!.consoleErrors : [],
      clickPath: record!.clickPath,
      files,
      extensionVersion: extensionVersion(),
    };
  }

  async function save(withEmail: boolean) {
    if (!record || !profile) return;
    setSaveError(false);
    try {
      const { blob, thumbnail } = await exportImage();
      const base = buildBaseName(new Date());
      const image = await saveBlob(blob, profile.subfolder, screenshotFilename(base));
      const meta = buildMetadata([image.path]);
      const json = await saveJson(
        { ...meta, files: [image.path] },
        profile.subfolder,
        companionFilename(base),
      );
      const files = [image, json];
      setSavedFiles(files);
      await addHistoryEntry({
        id: newId(),
        kind: 'screenshot',
        createdAt: new Date().toISOString(),
        files: files.map((f) => f.path),
        downloadIds: files.map((f) => f.downloadId),
        thumbnailDataUrl: thumbnail,
        description,
        pageUrl: record.pageUrl,
        pageTitle: record.pageTitle,
      });
      await deleteCapture(record.id);
      if (withEmail) {
        const body = buildReportBody({ ...meta, files: files.map((f) => f.path) }, t);
        const url = buildMailtoUrl({
          to: profile.emailTo,
          cc: profile.emailCc,
          subject: `${profile.subjectPrefix} ${t('mailto.subject.screenshot')} — ${record.pageTitle}`.trim(),
          body,
          truncationNote: t('mailto.truncated'),
        });
        window.open(url, '_self');
      }
    } catch (err) {
      console.error(err);
      setSaveError(true);
    }
  }

  const sidebarDisabled = !record || !profile;

  return (
    <div class="editor-layout">
      <div class="editor-canvas-area" style="position: relative;">
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => onPointerDown(e as unknown as MouseEvent)}
          onMouseMove={(e) => onPointerMove(e as unknown as MouseEvent)}
          onMouseUp={() => onPointerUp()}
          onMouseLeave={() => onPointerUp()}
        />
        {textInput && (
          <textarea
            class="editor-text-input"
            style={`left: ${textInput.screenX}px; top: ${textInput.screenY}px; position: fixed;`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitText((e.target as HTMLTextAreaElement).value);
              } else if (e.key === 'Escape') {
                setTextInput(null);
              }
            }}
            onBlur={(e) => commitText((e.target as HTMLTextAreaElement).value)}
            placeholder={t('editor.textPrompt')}
          />
        )}
      </div>

      <div class="editor-sidebar">
        <h1 style="margin: 0;">{t('editor.title')}</h1>

        <div class="toolbar">
          {TOOLS.map((tl) => (
            <button
              key={tl}
              class={tool === tl ? 'active' : ''}
              title={t(`editor.tool.${tl}`)}
              onClick={() => {
                setTool(tl);
                if (tl !== 'crop') setCropRect(null);
              }}
            >
              {TOOL_ICONS[tl]} {t(`editor.tool.${tl}`)}
            </button>
          ))}
        </div>

        <div class="row">
          <button onClick={undo} disabled={undoStack.current.length === 0}>
            ↶ {t('editor.undo')}
          </button>
          <button onClick={redo} disabled={redoStack.current.length === 0}>
            ↷ {t('editor.redo')}
          </button>
        </div>

        {tool === 'crop' && cropRect && (
          <div class="row">
            <button class="primary" onClick={applyCrop}>
              {t('editor.crop.apply')}
            </button>
            <button
              onClick={() => {
                setCropRect(null);
                redraw();
              }}
            >
              {t('editor.crop.cancel')}
            </button>
          </div>
        )}

        <div>
          <label>{t('editor.color')}</label>
          <div class="color-row">
            {COLORS.map((c) => (
              <button
                key={c}
                class={`color-swatch ${color === c ? 'active' : ''}`}
                style={`background: ${c};`}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div>
          <label>
            {t('editor.size')}: {size}
          </label>
          <input
            type="range"
            min={1}
            max={12}
            value={size}
            style="width: 100%;"
            onInput={(e) => setSize(Number(e.currentTarget.value))}
          />
        </div>

        {record && record.clickPath.length > 0 && (
          <button onClick={addClickPath}>🖱 {t('editor.clickPath.add')}</button>
        )}

        <div style="flex: 1; display: flex; flex-direction: column;">
          <label>{t('editor.description.label')}</label>
          <textarea
            style="flex: 1; min-height: 120px; resize: vertical;"
            value={description}
            placeholder={t('editor.description.placeholder')}
            onInput={(e) => setDescription(e.currentTarget.value)}
          />
        </div>

        <div class="row">
          <button class="primary" disabled={sidebarDisabled} onClick={() => save(false)}>
            💾 {t('editor.save')}
          </button>
          <button class="primary" disabled={sidebarDisabled} onClick={() => save(true)}>
            ✉ {t('editor.saveEmail')}
          </button>
        </div>

        {savedFiles && (
          <div class="card" style="border-color: var(--ok);">
            <div>{t('editor.saved', { path: savedFiles[0].path })}</div>
            <div class="hint">{t('editor.attachHint', { path: savedFiles[0].path })}</div>
          </div>
        )}
        {saveError && (
          <div class="card" style="border-color: var(--danger);">
            <div>{t('editor.saveError')}</div>
            <button onClick={() => save(false)}>{t('editor.retry')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function annotationBounds(a: Annotation): { x: number; y: number; w: number; h: number } {
  switch (a.kind) {
    case 'pen':
    case 'pixelate': {
      const xs = a.points.map((p) => p.x);
      const ys = a.points.map((p) => p.y);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
    case 'rect':
    case 'ellipse':
      return { x: a.x, y: a.y, w: a.w, h: a.h };
    case 'arrow': {
      const x = Math.min(a.x1, a.x2);
      const y = Math.min(a.y1, a.y2);
      return { x, y, w: Math.abs(a.x2 - a.x1), h: Math.abs(a.y2 - a.y1) };
    }
    case 'text':
      return { x: a.x, y: a.y, w: a.text.length * a.size * 3.5, h: a.size * 8 };
    case 'step': {
      const r = Math.max(14, a.size * 5);
      return { x: a.x - r, y: a.y - r, w: r * 2, h: r * 2 };
    }
  }
}

function hitTest(a: Annotation, p: { x: number; y: number }): boolean {
  const b = annotationBounds(a);
  const pad = 8;
  return p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad;
}

function moveAnnotation(a: Annotation, dx: number, dy: number): void {
  switch (a.kind) {
    case 'pen':
    case 'pixelate':
      for (const p of a.points) {
        p.x += dx;
        p.y += dy;
      }
      break;
    case 'rect':
    case 'ellipse':
      a.x += dx;
      a.y += dy;
      break;
    case 'arrow':
      a.x1 += dx;
      a.y1 += dy;
      a.x2 += dx;
      a.y2 += dy;
      break;
    case 'text':
    case 'step':
      a.x += dx;
      a.y += dy;
      break;
  }
}
