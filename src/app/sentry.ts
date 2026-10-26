// Only the parts of the Sentry SDK the editor uses. Loading this file rather than the whole
// package lets the bundler leave out session replay, user feedback and profiling.
export { browserTracingIntegration, captureException, captureMessage, init } from '@sentry/react';
