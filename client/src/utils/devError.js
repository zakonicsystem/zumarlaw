// Dev error injector utilities (development-only)
// scheduleDevError(delayMs, autoClearMs): after delayMs will set a global flag that triggers a DevError component to throw.
// cancelDevError(): cancels scheduled error and clears flag.

export function scheduleDevError(delayMs = 5000, autoClearMs = 20000) {
  // Clear existing timers
  try { if (window.__devErrorTimeout) clearTimeout(window.__devErrorTimeout); } catch (e) {}
  try { if (window.__devErrorClearTimeout) clearTimeout(window.__devErrorClearTimeout); } catch (e) {}

  window.__devErrorScheduledAt = Date.now();
  window.__devErrorTimeout = setTimeout(() => {
    window.__showDevError = true;
    console.warn('[devError] Dev error ');
    // Emit event so React components can re-render when flag changes
    try { window.dispatchEvent(new CustomEvent('devErrorChanged', { detail: { show: true } })); } catch (e) {}
    if (autoClearMs) {
      window.__devErrorClearTimeout = setTimeout(() => {
        window.__showDevError = false;
        console.warn('[devError] Dev error ');
        try { window.dispatchEvent(new CustomEvent('devErrorChanged', { detail: { show: false } })); } catch (e) {}
      }, autoClearMs);
    }
  }, delayMs);
}

export function cancelDevError() {
  try { if (window.__devErrorTimeout) clearTimeout(window.__devErrorTimeout); } catch (e) {}
  try { if (window.__devErrorClearTimeout) clearTimeout(window.__devErrorClearTimeout); } catch (e) {}
  window.__showDevError = false;
  window.__devErrorScheduledAt = null;
  console.warn('[devError] Dev error cancelled and flag cleared');
  try { window.dispatchEvent(new CustomEvent('devErrorChanged', { detail: { show: false } })); } catch (e) {}
}
