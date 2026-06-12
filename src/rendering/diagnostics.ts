/* eslint-disable import/order */
/**
 * Diagnostics panel renderer.
 *
 * Intentionally uses only basic, widely-supported APIs so it renders even on
 * very old engines (iOS 12 Safari). Text is selectable for easy transcription
 * by users reporting issues without DevTools access.
 *
 * The panel is rendered above the regular card content so it stays visible
 * even when the underlying calendar render falls back to the 'error' state.
 */

import { TemplateResult, html } from 'lit';
import * as Diagnostics from '../utils/diagnostics';

/**
 * Inline style used by the diagnostics panel. Hard-coded red border + tinted
 * background so the panel is unambiguously distinguishable from the calendar
 * even in a dark/light theme mismatch.
 *
 * (Future cleanup: move to styles.ts with HA color tokens; left inline for
 * now because the panel is dev-only and isolated from the main card CSS.)
 */
const PANEL_STYLE =
  'user-select:text;-webkit-user-select:text;white-space:pre-wrap;word-break:break-word;' +
  'font-family:monospace;font-size:11px;line-height:1.4;padding:8px;margin:0 0 8px 0;' +
  'border:1px solid #f00;border-radius:6px;background:rgba(255,0,0,0.06);color:var(--primary-text-color);';

/**
 * Render the on-screen diagnostics panel.
 */
export function renderDiagnosticsPanel(
  state: Diagnostics.DiagnosticsState,
  eventsLength: number,
  isLoading: boolean,
  version: string,
): TemplateResult {
  const tw = state.timeWindow
    ? `${state.timeWindow.start} → ${state.timeWindow.end}`
    : '(not reached)';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '(no navigator)';
  return html`
    <div style="${PANEL_STYLE}">
      <div><strong>calendar-card-pro diagnostics</strong> (v${version})</div>
      <div>UA: ${ua}</div>
      <div>events.length: ${eventsLength} | isLoading: ${String(isLoading)}</div>
      <div>time window: ${tw}</div>
      <div>rawCount (fetched): ${state.rawCount === undefined ? '—' : state.rawCount}</div>
      <div>processedCount: ${state.processedCount === undefined ? '—' : state.processedCount}</div>
      <div>
        lastError:
        ${state.lastError
          ? `[${state.lastError.stage}] ${state.lastError.message}${state.lastError.stack ? '\n' + state.lastError.stack : ''}`
          : 'none'}
      </div>
      <div>
        globalErrors: ${state.globalErrors.length ? state.globalErrors.join('\n\n') : 'none'}
      </div>
    </div>
  `;
}

/**
 * Prepend the diagnostics panel to existing card content. Returning the
 * combined TemplateResult from one place lets the host component drop its
 * own `html` import from lit — keeping calendar-card-pro.ts a pure
 * orchestrator with no inline templates.
 */
export function prependDiagnosticsPanel(
  content: TemplateResult,
  state: Diagnostics.DiagnosticsState,
  eventsLength: number,
  isLoading: boolean,
  version: string,
): TemplateResult {
  return html`${renderDiagnosticsPanel(state, eventsLength, isLoading, version)}${content}`;
}
