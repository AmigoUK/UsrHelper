export type ReportKind = 'screenshot' | 'screencast';

export interface ProjectProfile {
  id: string;
  name: string;
  /** Recipient email addresses. */
  emailTo: string[];
  /** Carbon-copy email addresses. */
  emailCc: string[];
  /**
   * Domains of the application under test. The MAIN-world `console.error`
   * wrapper is installed only here — everywhere else the extension stays out of
   * the page's call stack. Empty means it is never installed.
   */
  domains: string[];
  /** Prefix prepended to the mailto subject, e.g. "[Project X]". */
  subjectPrefix: string;
  /** Subfolder under Downloads/ where files are saved. */
  subfolder: string;
  /** Template pre-filled into the description field. */
  descriptionTemplate: string;
  /** Length of a single screencast clip, in minutes. */
  clipMinutes: number;
  /** Maximum total recording length, in minutes. */
  maxMinutes: number;
}

export interface ReporterInfo {
  customerNo: string;
  company: string;
  firstName: string;
  lastName: string;
  anyDesk: string;
}

export interface Settings {
  reporter: ReporterInfo;
  activeProfileId: string;
  profiles: ProjectProfile[];
  showCameraBubble: boolean;
  showKeystrokes: boolean;
  showRipples: boolean;
  showTimestampOverlay: boolean;
  stampTimestampOnScreenshots: boolean;
  trackClickPath: boolean;
  captureConsoleErrors: boolean;
}

export interface ClickPathEntry {
  x: number;
  y: number;
  /** Page scroll offsets at click time. */
  scrollX: number;
  scrollY: number;
  button: 'left' | 'middle' | 'right';
  at: string; // ISO timestamp
}

export interface ConsoleErrorEntry {
  message: string;
  source?: string;
  at: string; // ISO timestamp
}

export interface EnvironmentInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  viewport: string;
  devicePixelRatio: number;
}

export interface ReportMetadata {
  kind: ReportKind;
  reporter?: ReporterInfo;
  description: string;
  capturedAt: string; // ISO timestamp
  pageUrl: string;
  pageTitle: string;
  environment: EnvironmentInfo;
  consoleErrors: ConsoleErrorEntry[];
  clickPath: ClickPathEntry[];
  files: string[];
  extensionVersion: string;
}

export interface HistoryEntry {
  id: string;
  kind: ReportKind;
  createdAt: string; // ISO timestamp
  /** Paths relative to Downloads/, e.g. "UsrHelper/report.png". */
  files: string[];
  downloadIds: number[];
  thumbnailDataUrl?: string;
  description: string;
  pageUrl: string;
  pageTitle: string;
}
