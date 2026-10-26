import i18n from '../i18n';
import { useEditor } from '../state/editorStore';
import { getPerf } from '../state/perfStore';
import { useView } from '../state/viewStore';

/**
 * Error and performance reporting to Sentry. It is off unless VITE_SENTRY_DSN is set, so a fresh
 * clone sends nothing. The SDK is loaded as its own chunk after the first render, which keeps the
 * first download small; errors that happen before it arrives are queued and sent once it is ready.
 */

type Env = Partial<
  Record<
    | 'VITE_SENTRY_DSN'
    | 'VITE_SENTRY_ENVIRONMENT'
    | 'VITE_SENTRY_RELEASE'
    | 'VITE_SENTRY_TRACES_SAMPLE_RATE'
    | 'MODE',
    string
  >
>;

export type MonitoringConfig = {
  dsn: string;
  environment: string;
  release: string | undefined;
  tracesSampleRate: number;
};

/** Reads the build-time settings; `null` means monitoring is off. */
export function monitoringConfig(env: Env): MonitoringConfig | null {
  const dsn = env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return null;
  // An empty value counts as unset; Number('') would otherwise turn traces off.
  const rate = Number(env.VITE_SENTRY_TRACES_SAMPLE_RATE?.trim() || NaN);
  return {
    dsn,
    environment: env.VITE_SENTRY_ENVIRONMENT?.trim() || env.MODE || 'production',
    release: env.VITE_SENTRY_RELEASE?.trim() || undefined,
    // Page-load traces for a sample of sessions; 10% unless set otherwise.
    tracesSampleRate: Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0.1,
  };
}

/** What the editor was doing when something went wrong. Counts and switches only, no layout data. */
export function editorContext() {
  const { layout, selectedIds, placing } = useEditor.getState();
  const { look, instancing } = useView.getState();
  return {
    tags: { look, instancing: instancing ? 'on' : 'off', locale: i18n.language },
    editor: {
      items: layout.items.length,
      selected: selectedIds.length,
      placing: placing ?? 'none',
    },
    perf: getPerf(),
  };
}

type Sentry = typeof import('./sentry');
type Pending =
  | { error: unknown; extra?: Record<string, unknown> }
  | { message: string; extra?: Record<string, unknown> };

let sentry: Sentry | null = null;
let enabled = false;
const pending: Pending[] = [];

function send(item: Pending) {
  if (!sentry) {
    if (enabled) pending.push(item);
    return;
  }
  if ('error' in item) sentry.captureException(item.error, { extra: item.extra });
  else sentry.captureMessage(item.message, { level: 'warning', extra: item.extra });
}

/** Reports a caught error, e.g. from an error boundary. Does nothing when monitoring is off. */
export function reportError(error: unknown, extra?: Record<string, unknown>) {
  send({ error, extra });
}

/** Reports something that went wrong without an exception, e.g. a lost WebGL context. */
export function reportWarning(message: string, extra?: Record<string, unknown>) {
  send({ message, extra });
}

/** Starts monitoring if it is configured. Call once, before the first render. */
export function startMonitoring(config = monitoringConfig(import.meta.env)) {
  if (!config || enabled) return;
  enabled = true;

  // Until the SDK has loaded, catch uncaught errors ourselves so none are lost.
  const onError = (e: ErrorEvent) => pending.push({ error: e.error ?? e.message });
  const onRejection = (e: PromiseRejectionEvent) => pending.push({ error: e.reason });
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  void import('./sentry')
    .then((sdk) => {
      sdk.init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release,
        integrations: [sdk.browserTracingIntegration()],
        tracesSampleRate: config.tracesSampleRate,
        // No personal data: no user details, cookies, headers or request bodies.
        dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [] },
        beforeSend(event) {
          const { tags, editor, perf } = editorContext();
          event.tags = { ...tags, ...event.tags };
          event.contexts = { ...event.contexts, editor, perf };
          return event;
        },
      });
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      sentry = sdk;
      pending.splice(0).forEach(send);
    })
    .catch(() => {
      // Monitoring must never break the editor: if the SDK cannot load, carry on without it.
      enabled = false;
      pending.length = 0;
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    });
}
