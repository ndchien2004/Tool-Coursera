/**
 * Quiz Start Bridge
 *
 * The bundled Start handler still waits for two selectors from Coursera's old
 * quiz UI. Remember the user's click, provide compatibility markers when the
 * quiz is ready, and only invoke Start again if navigation lost the handler.
 */
(function() {
  'use strict';

  const PREFIX = '[QuizBridge]';
  const STORAGE_KEY = 'coursera-tool:pending-quiz-start';
  const MAX_PENDING_AGE = 2 * 60 * 1000;
  const MIN_RESUME_DELAY = 800;
  const QUIZ_READY_GRACE = 2000;
  const COMPAT_MARKER_ID = 'coursera-tool-quiz-compat';
  const RETRY_DELAYS = [500, 1000, 1800, 3000, 5000, 8000, 12000, 18000, 30000];

  let memoryPending = null;
  let observerTimer = null;
  let resumeInProgress = false;
  let rememberedStartButton = null;
  let staleSpinnerSince = 0;
  let lastUrl = location.href;

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function readPending() {
    try {
      const value = sessionStorage.getItem(STORAGE_KEY);
      return value ? JSON.parse(value) : memoryPending;
    } catch (_error) {
      return memoryPending;
    }
  }

  function writePending(value) {
    memoryPending = value;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (_error) {}
  }

  function clearPending() {
    memoryPending = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_error) {}
  }

  function isVisible(element) {
    if (!element || !element.isConnected) return false;
    const style = getComputedStyle(element);
    return element.getClientRects().length > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden';
  }

  function getPanelRoots() {
    return Array.from(document.querySelectorAll('.rounded-2xl.shadow-2xl'))
      .filter((panel) => {
        const text = normalizeText(panel.textContent);
        return text.includes('quiz') && text.includes('source');
      });
  }

  function isPanelStartButton(button) {
    if (!button || normalizeText(button.textContent) !== 'start') return false;
    return getPanelRoots().some((panel) => panel.contains(button));
  }

  function findPanelStartButton() {
    if (rememberedStartButton?.isConnected) return rememberedStartButton;

    for (const panel of getPanelRoots()) {
      const buttons = Array.from(panel.querySelectorAll('button'));
      const button = buttons.find((candidate) => {
        return candidate.dataset.quizStartBridge === 'true' ||
          normalizeText(candidate.textContent) === 'start' ||
          normalizeText(candidate.title) === 'start';
      }) || buttons.find((candidate) => candidate.disabled && candidate.querySelector('svg'));
      if (button) return button;

      // CourseraTool renders Source and Start in the same compact row. This
      // structural fallback still works after the button text becomes a spinner.
      for (const select of panel.querySelectorAll('select')) {
        let row = select.parentElement;
        for (let depth = 0; depth < 2 && row && row !== panel; depth += 1) {
          const rowButton = row.querySelector('button');
          if (rowButton) return rowButton;
          row = row.parentElement;
        }
      }
    }
    return null;
  }

  function hasQuizControls() {
    const selectors = [
      'input[type="radio"]',
      'input[type="checkbox"]',
      '[role="radio"]',
      '[role="checkbox"]',
      'textarea'
    ];

    return Array.from(document.querySelectorAll(selectors.join(','))).some((control) => {
      return !control.closest('.rounded-2xl.shadow-2xl');
    });
  }

  function hasVisibleStartAssignment() {
    return Array.from(document.querySelectorAll('button, a, [role="button"]')).some((element) => {
      const text = normalizeText(element.textContent);
      return isVisible(element) && (text === 'start assignment' || text === 'resume assignment');
    });
  }

  function pendingIsValid(pending) {
    return pending &&
      Number.isFinite(pending.startedAt) &&
      Date.now() - pending.startedAt <= MAX_PENDING_AGE;
  }

  function installCompatibilityMarkers() {
    let container = document.getElementById(COMPAT_MARKER_ID);
    if (container) return container;

    container = document.createElement('div');
    container.id = COMPAT_MARKER_ID;
    container.hidden = true;
    container.setAttribute('aria-hidden', 'true');

    // r2 first awaits an old cover-page action selector for up to six minutes.
    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.dataset.testid = 'action-button';
    container.appendChild(actionButton);

    // It then loops forever until the legacy React modal portal exists.
    const modalPortal = document.createElement('div');
    modalPortal.className = 'ReactModalPortal';
    container.appendChild(modalPortal);

    document.body.appendChild(container);
    setTimeout(() => container.remove(), 60 * 1000);
    return container;
  }

  function tryResumeQuiz() {
    if (resumeInProgress) return false;

    const pending = readPending();
    if (!pendingIsValid(pending)) {
      if (pending) clearPending();
      return false;
    }

    if (Date.now() - pending.startedAt < MIN_RESUME_DELAY) return false;
    if (!hasQuizControls() || hasVisibleStartAssignment()) return false;

    if (!pending.quizReadyAt) {
      writePending({ ...pending, quizReadyAt: Date.now() });
      return false;
    }

    if (Date.now() - pending.quizReadyAt < QUIZ_READY_GRACE) return false;

    const startButton = findPanelStartButton();
    if (!startButton || !isVisible(startButton)) return false;

    // When Start Assignment changes into the quiz inside the same document, the
    // old React handler remains disabled forever. A single reload creates the
    // clean state that Coursera's current UI requires.
    if (startButton.disabled) {
      if (!pending.startedWithQuiz && (pending.reloadCount || 0) < 1) {
        writePending({
          ...pending,
          reloadCount: 1,
          reloadedAt: Date.now()
        });
        console.info(PREFIX, 'Stale Start handler detected; reloading once.');
        location.reload();
        return true;
      }

      // After our reload no handler has been invoked yet; wait until the panel
      // finishes initializing instead of consuming the pending action.
      if ((pending.reloadCount || 0) > 0) return false;

      installCompatibilityMarkers();
      clearPending();
      console.info(PREFIX, 'Quiz loaded; released the active Start handler.');
      return true;
    }

    // A full navigation destroys the original handler. Re-run it in the new
    // document after installing the compatibility selectors it expects.
    installCompatibilityMarkers();
    clearPending();
    resumeInProgress = true;
    console.info(PREFIX, 'Quiz loaded after navigation; restarting the Start handler.');
    startButton.click();
    setTimeout(() => {
      resumeInProgress = false;
    }, 0);
    return true;
  }

  function scheduleRetries() {
    for (const delay of RETRY_DELAYS) {
      setTimeout(tryResumeQuiz, delay);
    }
  }

  function recoverUntrackedSpinner() {
    // The click bridge is the preferred path. This watchdog handles UI builds
    // where the extension's React event never reaches our capture listener.
    if (readPending() || !hasQuizControls() || hasVisibleStartAssignment()) {
      staleSpinnerSince = 0;
      return false;
    }

    const startButton = findPanelStartButton();
    if (!startButton || !startButton.disabled || !isVisible(startButton)) {
      staleSpinnerSince = 0;
      return false;
    }

    if (!staleSpinnerSince) {
      staleSpinnerSince = Date.now();
      console.info(PREFIX, 'Observed a disabled Start button; checking for a stale handler.');
      return false;
    }

    if (Date.now() - staleSpinnerSince < QUIZ_READY_GRACE) return false;

    const now = Date.now();
    writePending({
      startedAt: now,
      originUrl: location.href,
      startedWithQuiz: false,
      quizReadyAt: now - QUIZ_READY_GRACE,
      reloadCount: 1,
      recoveredFromSpinner: true
    });
    console.info(PREFIX, 'Untracked stale spinner detected; reloading once.');
    location.reload();
    return true;
  }

  // Capture runs before React's handler, so the marker survives a full navigation.
  document.addEventListener('click', (event) => {
    if (resumeInProgress || !event.isTrusted || !(event.target instanceof Element)) return;

    const button = event.target.closest('button');
    if (!isPanelStartButton(button)) return;

    rememberedStartButton = button;
    button.dataset.quizStartBridge = 'true';

    const startedWithQuiz = hasQuizControls();

    // On the current quiz UI the questions may already be visible while the
    // URL still does not contain /attempt. Install markers before r2 starts.
    if (startedWithQuiz && !hasVisibleStartAssignment()) {
      installCompatibilityMarkers();
    }

    writePending({
      startedAt: Date.now(),
      originUrl: location.href,
      startedWithQuiz,
      quizReadyAt: startedWithQuiz ? Date.now() : null,
      reloadCount: 0
    });
    console.info(PREFIX, 'Start requested; waiting for the quiz UI.');
    scheduleRetries();
  }, true);

  function init() {
    console.info(PREFIX, 'loaded');
    const pending = readPending();
    if (pendingIsValid(pending)) scheduleRetries();
    else if (pending) clearPending();

    if (document.body) {
      new MutationObserver(() => {
        recoverUntrackedSpinner();
        if (!readPending()) return;
        if (observerTimer) clearTimeout(observerTimer);
        observerTimer = setTimeout(tryResumeQuiz, 250);
      }).observe(document.body, { childList: true, subtree: true });
    }

    // Coursera uses client-side navigation, which does not reload content scripts.
    setInterval(() => {
      recoverUntrackedSpinner();
      if (readPending()) tryResumeQuiz();

      if (location.href === lastUrl) return;
      lastUrl = location.href;
      if (readPending()) {
        console.info(PREFIX, 'Navigation detected; waiting for quiz controls.');
        scheduleRetries();
      }
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
