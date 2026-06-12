/* eslint-disable import/order */
/**
 * Diagnostics state and recorders for the on-screen debug panel.
 *
 * Used to surface fetch/render failures on devices without a JS console
 * (notably iOS 12 Safari). The host component owns the reactive state; this
 * module exposes pure reducers (state in → state out) plus a small lifecycle
 * helper for the global window-error listeners.
 *
 * Pattern intentionally mirrors the rest of src/utils/* — function collection,
 * no class, no internal mutable state.
 */

import * as EventUtils from './events';

//-----------------------------------------------------------------------------
// STATE
//-----------------------------------------------------------------------------

/**
 * Shape of the diagnostics state held by the host component. Strings are used
 * for timeWindow (rather than Date objects) so the state is trivially
 * serializable for an on-screen display.
 */
export interface DiagnosticsState {
  timeWindow?: { start: string; end: string };
  rawCount?: number;
  processedCount?: number;
  lastError?: { stage: string; message: string; stack?: string };
  globalErrors: string[];
}

/** Initial empty state. */
export const EMPTY_STATE: DiagnosticsState = { globalErrors: [] };

/** Maximum number of global error messages kept; oldest are dropped. */
const MAX_GLOBAL_ERRORS = 10;

//-----------------------------------------------------------------------------
// REDUCERS
//-----------------------------------------------------------------------------

/**
 * Append a global-scope error message, capped at MAX_GLOBAL_ERRORS most-recent
 * entries to bound growth over long sessions.
 */
export function recordGlobalError(state: DiagnosticsState, message: string): DiagnosticsState {
  const next = state.globalErrors.concat(message).slice(-MAX_GLOBAL_ERRORS);
  return { ...state, globalErrors: next };
}

/**
 * Merge fetch-pipeline diagnostics (time window, raw/processed counts) into
 * the state. Called by the host on each onDiag callback from fetchEventData.
 */
export function recordFetchDiag(
  state: DiagnosticsState,
  d: EventUtils.FetchDiagnostics,
): DiagnosticsState {
  const patch: Partial<DiagnosticsState> = {};
  if (d.timeWindow) {
    patch.timeWindow = {
      start: d.timeWindow.start.toISOString(),
      end: d.timeWindow.end.toISOString(),
    };
  }
  if (typeof d.rawCount === 'number') patch.rawCount = d.rawCount;
  if (typeof d.processedCount === 'number') patch.processedCount = d.processedCount;
  return { ...state, ...patch };
}

/**
 * Record a staged error (e.g. stage:'fetch' or 'render') into the state,
 * overwriting any previous lastError.
 */
export function recordError(
  state: DiagnosticsState,
  stage: string,
  error: unknown,
): DiagnosticsState {
  const err = error as { message?: string; stack?: string };
  return {
    ...state,
    lastError: {
      stage,
      message: err && err.message ? err.message : String(error),
      stack: err && err.stack ? err.stack : undefined,
    },
  };
}

//-----------------------------------------------------------------------------
// GLOBAL ERROR LISTENERS
//-----------------------------------------------------------------------------

/**
 * Pair of bound listeners attached to window 'error' and 'unhandledrejection'.
 * The host component holds the reference so it can detach on disconnect.
 */
export interface GlobalErrorListeners {
  onWindowError: (ev: ErrorEvent) => void;
  onUnhandledRejection: (ev: PromiseRejectionEvent) => void;
}

/**
 * Build a listener pair that forwards captured error detail via onMessage.
 * Uses defensive && chains (not optional chaining) so the SOURCE is iOS 12
 * safe independent of any future build-target changes.
 */
export function createGlobalErrorListeners(onMessage: (msg: string) => void): GlobalErrorListeners {
  return {
    onWindowError: (ev: ErrorEvent) => {
      const detail = ev.error && ev.error.stack ? ev.error.stack : ev.message;
      onMessage(`window.onerror: ${detail}`);
    },
    onUnhandledRejection: (ev: PromiseRejectionEvent) => {
      const reason = ev.reason;
      const detail =
        reason && reason.stack
          ? reason.stack
          : String(reason && reason.message ? reason.message : reason);
      onMessage(`unhandledrejection: ${detail}`);
    },
  };
}

export function attachGlobalErrorListeners(listeners: GlobalErrorListeners): void {
  window.addEventListener('error', listeners.onWindowError);
  window.addEventListener('unhandledrejection', listeners.onUnhandledRejection);
}

export function detachGlobalErrorListeners(listeners: GlobalErrorListeners): void {
  window.removeEventListener('error', listeners.onWindowError);
  window.removeEventListener('unhandledrejection', listeners.onUnhandledRejection);
}
