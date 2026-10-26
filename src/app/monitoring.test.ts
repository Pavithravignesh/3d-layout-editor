import { beforeEach, describe, expect, it } from 'vitest';
import { useEditor } from '../state/editorStore';
import { useView } from '../state/viewStore';
import { editorContext, monitoringConfig } from './monitoring';

describe('monitoringConfig', () => {
  it('is off without a DSN, so a fresh clone sends nothing', () => {
    expect(monitoringConfig({})).toBeNull();
    expect(monitoringConfig({ VITE_SENTRY_DSN: '   ' })).toBeNull();
  });

  it('uses safe defaults when only the DSN is set', () => {
    expect(
      monitoringConfig({
        VITE_SENTRY_DSN: 'https://key@o1.ingest.sentry.io/1',
        MODE: 'production',
      }),
    ).toEqual({
      dsn: 'https://key@o1.ingest.sentry.io/1',
      environment: 'production',
      release: undefined,
      tracesSampleRate: 0.1,
    });
  });

  it('takes the environment, release and sample rate from the build settings', () => {
    const config = monitoringConfig({
      VITE_SENTRY_DSN: 'https://key@o1.ingest.sentry.io/1',
      VITE_SENTRY_ENVIRONMENT: 'preview',
      VITE_SENTRY_RELEASE: 'abc123',
      VITE_SENTRY_TRACES_SAMPLE_RATE: '0.5',
    });
    expect(config).toMatchObject({
      environment: 'preview',
      release: 'abc123',
      tracesSampleRate: 0.5,
    });
  });

  it('falls back to 10% when the sample rate is not a number between 0 and 1', () => {
    for (const rate of ['abc', '2', '-1', '', ' ']) {
      expect(
        monitoringConfig({ VITE_SENTRY_DSN: 'x', VITE_SENTRY_TRACES_SAMPLE_RATE: rate })
          ?.tracesSampleRate,
      ).toBe(0.1);
    }
  });
});

describe('editorContext', () => {
  const initialEditor = useEditor.getState();
  const initialView = useView.getState();
  beforeEach(() => {
    useEditor.setState(initialEditor, true);
    useView.setState(initialView, true);
  });

  it('reports counts and display switches, not the layout itself', () => {
    useEditor.getState().loadTestLayout(5);
    useView.setState({ look: 'optimised', instancing: false });

    const context = editorContext();

    expect(context.tags).toMatchObject({ look: 'optimised', instancing: 'off' });
    expect(context.editor).toEqual({ items: 5, selected: 0, placing: 'none' });
    expect(JSON.stringify(context)).not.toContain('"label"');
  });
});
