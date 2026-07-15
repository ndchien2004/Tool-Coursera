/**
 * Quiz Start Bridge
 *
 * The bundled Start handler still waits for two selectors from Coursera's old
 * quiz UI. Remember the user's click across navigation and continue directly
 * into AI filling as soon as the current quiz controls are ready.
 */
(function() {
  'use strict';

  const PREFIX = '[QuizBridge]';
  const BRIDGE_VERSION = '1.0.12-legacy-first';
  const SOLVE_QUIZ_ACTION = 'courseraTool.solveQuiz';
  const STORAGE_KEY = 'coursera-tool:pending-quiz-start';
  const EXTENSION_STORAGE_KEY = 'courseraToolPendingQuizStart';
  const DOCUMENT_TOKEN = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const MAX_PENDING_AGE = 2 * 60 * 1000;
  const MIN_RESUME_DELAY = 800;
  const QUIZ_READY_GRACE = 2000;
  const STALE_START_TIMEOUT = 12_000;
  const RETRY_DELAYS = [500, 1000, 1800, 3000, 5000, 8000, 12000, 18000, 30000];

  let memoryPending = null;
  let observerTimer = null;
  let resumeInProgress = false;
  let directQuizInProgress = false;
  let rememberedStartButton = null;
  let staleSpinnerSince = 0;
  let lastUrl = location.href;
  const autoFillAttemptedUrls = new Set();

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function getQuizPageKey() {
    return `${location.origin}${location.pathname}`;
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
    void Promise.resolve(chrome.storage.local.set({ [EXTENSION_STORAGE_KEY]: value })).catch((error) => {
      console.warn(PREFIX, 'Could not persist pending quiz state:', error);
    });
  }

  function clearPending() {
    memoryPending = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_error) {}
    void Promise.resolve(chrome.storage.local.remove(EXTENSION_STORAGE_KEY)).catch((error) => {
      console.warn(PREFIX, 'Could not clear pending quiz state:', error);
    });
  }

  async function restorePending() {
    const current = readPending();
    if (pendingIsValid(current)) return current;

    try {
      const stored = await chrome.storage.local.get(EXTENSION_STORAGE_KEY);
      const pending = stored[EXTENSION_STORAGE_KEY];
      if (!pendingIsValid(pending)) {
        if (pending) clearPending();
        return null;
      }

      memoryPending = pending;
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
      } catch (_error) {}
      console.info(PREFIX, 'Restored pending Start action after navigation.');
      return pending;
    } catch (error) {
      console.warn(PREFIX, 'Could not restore pending quiz state:', error);
      return null;
    }
  }

  function isVisible(element) {
    if (!element || !element.isConnected) return false;
    const style = getComputedStyle(element);
    return element.getClientRects().length > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden';
  }

  function getPanelRoots() {
    const wrapper = document.getElementById('coursera-tool');
    const candidates = wrapper
      ? [wrapper, ...wrapper.querySelectorAll('.rounded-2xl.shadow-2xl')]
      : Array.from(document.querySelectorAll('.rounded-2xl.shadow-2xl'));

    return Array.from(new Set(candidates))
      .filter(Boolean)
      .filter((panel) => {
        const text = normalizeText(panel.textContent);
        return (text.includes('quiz') || text.includes('source') || text.includes('model') || text.includes('gemini'))
          && (text.includes('start') || text.includes('bắt đầu'));
      });
  }

  function isPanelStartButton(button) {
    if (!button) return false;
    const text = normalizeText(button.textContent);
    const title = normalizeText(button.getAttribute('title') || '');
    if (!text.includes('start') && !title.includes('start') && !text.includes('bắt đầu') && !title.includes('bắt đầu')) return false;
    return Boolean(button.closest('#coursera-tool')) || getPanelRoots().some((panel) => panel.contains(button));
  }

  function clearLegacyQuizDecorations(root = document) {
    const badges = root.querySelectorAll([
      '.badge[data-text="Gemini"]',
      '.badge[data-text="ChatGPT"]',
      '.badge[data-text="DeepSeek"]',
      '.badge[data-text="FPT"]',
      '.badge[data-text="OK"]'
    ].join(','));

    for (const badge of badges) {
      if (badge.closest('#coursera-tool')) continue;
      const label = badge.closest('label');
      badge.remove();
      if (!label) continue;

      // The legacy filler overwrites these inline properties on Coursera's
      // answer label. Removing them restores the site's own layout and hitbox.
      label.style.removeProperty('border');
      label.style.removeProperty('border-radius');
      label.style.removeProperty('padding');
    }
  }

  function findPanelStartButton() {
    if (rememberedStartButton?.isConnected) return rememberedStartButton;

    for (const panel of getPanelRoots()) {
      const buttons = Array.from(panel.querySelectorAll('button'));
      const button = buttons.find((candidate) => {
        const text = normalizeText(candidate.textContent);
        const title = normalizeText(candidate.title);
        return candidate.dataset.quizStartBridge === 'true' ||
          text.includes('start') ||
          title.includes('start') ||
          text.includes('bắt đầu') ||
          title.includes('bắt đầu');
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
    const knownQuestions = Array.from(document.querySelectorAll('.css-1hhf6i, .rc-FormPartsQuestion'))
      .filter((container) => !container.closest('#coursera-tool'));
    if (knownQuestions.some((container) => {
      return container.querySelector('input, textarea, [role="radio"], [role="checkbox"]');
    })) return true;

    const selectors = [
      'input[type="radio"]',
      'input[type="checkbox"]',
      '[role="radio"]',
      '[role="checkbox"]',
      'input[type="text"]',
      'textarea'
    ];

    const controls = Array.from(document.querySelectorAll(selectors.join(','))).filter(isQuizControl);
    return controls.filter((control) => {
      return control.matches('input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"]');
    }).length >= 2 || controls.some((control) => control.matches('textarea'));
  }

  function isQuizControl(control) {
    if (!control || control.disabled || control.closest('#coursera-tool')) return false;

    const id = normalizeText(control.id);
    const name = normalizeText(control.getAttribute('name'));
    const nearbyText = normalizeText(
      control.closest('label, fieldset, [role="group"], div')?.textContent
    );

    return !id.includes('agreement-checkbox') &&
      !name.includes('agreement') &&
      !nearbyText.includes('honor code') &&
      !nearbyText.includes('understand and agree');
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

  function tryResumeQuiz() {
    if (resumeInProgress || directQuizInProgress) return false;

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

    // Coursera can replace Start Assignment with the quiz through an in-page
    // route change. In that case the bundled async handler is still alive and
    // may later overwrite our choices. Reload once to destroy that stale
    // handler; the pending action survives in sessionStorage and resumes below.
    if (pending.documentToken === DOCUMENT_TOKEN && (pending.reloadCount || 0) < 1) {
      writePending({
        ...pending,
        reloadCount: 1,
        reloadedAt: Date.now()
      });
      console.info(PREFIX, 'Quiz opened in the same document; reloading once before AI fill.');
      location.reload();
      return true;
    }

    // Continue the original user action directly. A programmatic button.click()
    // creates an untrusted event, so the direct-fill capture listener correctly
    // ignores it. Calling runDirectQuiz here preserves the one-click flow across
    // both full navigation and Coursera's in-page route transitions.
    clearPending();
    resumeInProgress = true;
    console.info(PREFIX, 'Quiz loaded after Start Assignment; starting direct AI fill.');
    void runDirectQuiz(startButton).finally(() => {
      resumeInProgress = false;
    });
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
    if (directQuizInProgress) {
      staleSpinnerSince = 0;
      return false;
    }
    if (startButton?.dataset.quizDirectRunning === 'true') {
      staleSpinnerSince = 0;
      return false;
    }
    if (!startButton || !startButton.disabled) {
      staleSpinnerSince = 0;
      return false;
    }

    if (!staleSpinnerSince) {
      staleSpinnerSince = Date.now();
      console.info(PREFIX, 'Observed a disabled Start button; checking for a stale handler.');
      return false;
    }

    if (Date.now() - staleSpinnerSince < STALE_START_TIMEOUT) return false;

    staleSpinnerSince = 0;
    console.info(PREFIX, 'Untracked quiz detected after Start Assignment; starting direct AI fill.');
    void runDirectQuiz(startButton);
    return true;
  }

  function cleanText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/\b\d+\s+points?\b/gi, '')
      .trim();
  }

  function findQuestionContainer(control) {
    const explicit = control.closest([
      '.rc-FormPartsQuestion',
      '.css-1hhf6i',
      'fieldset'
    ].join(','));
    if (explicit) return explicit;

    let candidate = control.parentElement;
    for (let depth = 0; candidate && candidate !== document.body && depth < 8; depth += 1) {
      if (!candidate.matches('label, .rc-Option, [role="radio"], [role="checkbox"]')) {
        const controls = candidate.querySelectorAll([
          'input[type="radio"]',
          'input[type="checkbox"]',
          '[role="radio"]',
          '[role="checkbox"]',
          'textarea'
        ].join(','));
        if (controls.length > 1) return candidate;
      }
      candidate = candidate.parentElement;
    }

    return control.parentElement;
  }

  function getOptionText(control) {
    const option = control.closest('label, .rc-Option, [role="radio"], [role="checkbox"]');
    return cleanText(option?.innerText || option?.textContent || control.value || '');
  }

  function getQuestionText(container, optionTexts) {
    if (!container) return '';
    const promptSelectors = [
      '[data-testid*="question-prompt"]',
      '.css-x3q7o9 > div:nth-child(2)',
      '.rc-FormPartsQuestion__content .rc-CML',
      '.rc-CML'
    ].join(',');
    const prompt = Array.from(container.querySelectorAll(promptSelectors)).find((candidate) => {
      return !candidate.closest('label, .rc-Option, [role="radio"], [role="checkbox"]');
    });

    if (prompt) return cleanText(prompt.innerText || prompt.textContent);

    let text = cleanText(container.innerText || container.textContent);
    for (const optionText of optionTexts) {
      if (optionText) text = text.replace(optionText, ' ');
    }
    return cleanText(text);
  }

  function findGroupContainer(groupControls, allControls) {
    if (!groupControls.length) return null;

    let container = groupControls[0].parentElement;
    while (container && container !== document.body && !groupControls.every((control) => container.contains(control))) {
      container = container.parentElement;
    }
    if (!container) return groupControls[0].parentElement;

    let best = container;
    let current = container;
    for (let depth = 0; current.parentElement && current.parentElement !== document.body && depth < 10; depth += 1) {
      const parent = current.parentElement;
      const hasOtherQuestionControls = allControls.some((control) => {
        return !groupControls.includes(control) && parent.contains(control);
      });
      if (hasOtherQuestionControls) break;
      best = parent;
      current = parent;
    }

    return best;
  }

  function collectQuizQuestions() {
    const grouped = new Map();
    const controlSelector = [
      'input[type="radio"]',
      'input[type="checkbox"]',
      '[role="radio"]',
      '[role="checkbox"]',
      'input[type="text"]',
      'textarea'
    ].join(',');
    const controls = Array.from(document.querySelectorAll(controlSelector)).filter(isQuizControl);
    const choiceSelector = 'input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"]';
    const choiceControls = controls.filter((control) => control.matches(choiceSelector));
    const nativeNameCounts = new Map();
    for (const control of choiceControls) {
      if (!(control instanceof HTMLInputElement) || !control.name) continue;
      const key = `${control.type}:${cleanText(control.name)}`;
      nativeNameCounts.set(key, (nativeNameCounts.get(key) || 0) + 1);
    }

    for (const control of controls) {
      const role = control.getAttribute('role');
      const isRadio = control.type === 'radio' || role === 'radio';
      const isCheckbox = control.type === 'checkbox' || role === 'checkbox';
      const possibleGroupName = (isRadio || isCheckbox) && control instanceof HTMLInputElement
        ? cleanText(control.name)
        : '';
      const nativeGroupName = possibleGroupName && (
        isRadio || (nativeNameCounts.get(`checkbox:${possibleGroupName}`) || 0) > 1
      ) ? possibleGroupName : '';
      const semanticGroup = control.closest('[role="radiogroup"], [role="group"], fieldset');
      const fallbackContainer = semanticGroup || findQuestionContainer(control) || control.parentElement;
      const key = nativeGroupName
        ? `${isRadio ? 'radio' : 'checkbox'}:${nativeGroupName}`
        : fallbackContainer;

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(control);
    }

    return Array.from(grouped.values()).map((questionControls, questionIndex) => {
      const id = `q${questionIndex + 1}`;
      const questionChoiceControls = questionControls.filter((control) => {
        return control.matches(choiceSelector);
      });
      const textControls = questionControls.filter((control) => control.matches('textarea, input[type="text"]'));
      const container = findGroupContainer(
        questionChoiceControls.length ? questionChoiceControls : textControls,
        controls
      );
      const optionTexts = questionChoiceControls.map(getOptionText);
      const options = questionChoiceControls.map((control, optionIndex) => ({
        id: `${id}o${optionIndex + 1}`,
        text: optionTexts[optionIndex] || `Option ${optionIndex + 1}`
      }));
      const type = textControls.length
        ? 'text'
        : questionChoiceControls.some((control) => control.type === 'checkbox' || control.getAttribute('role') === 'checkbox')
          ? 'multiple'
          : 'single';

      return {
        payload: {
          id,
          type,
          question: getQuestionText(container, optionTexts),
          options
        },
        choiceControls: questionChoiceControls,
        textControls
      };
    }).filter((question) => {
      return question.payload.question &&
        (question.payload.options.length || question.textControls.length);
    });
  }

  function setNativeValue(control, value) {
    const prototype = control instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(control, value);
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyQuizAnswers(questions, answers) {
    const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
    let filled = 0;

    for (const question of questions) {
      const answer = answerByQuestion.get(question.payload.id);
      if (!answer) continue;

      if (question.payload.type === 'text') {
        if (!answer.answerText) continue;
        for (const control of question.textControls) setNativeValue(control, answer.answerText);
        filled += 1;
        continue;
      }

      const selectedIds = new Set(answer.optionIds || []);
      if (!selectedIds.size) continue;

      question.choiceControls.forEach((control, index) => {
        const optionId = question.payload.options[index]?.id;
        const shouldSelect = selectedIds.has(optionId);
        const role = control.getAttribute('role');
        const isRadio = control.type === 'radio' || role === 'radio';
        const isChecked = role
          ? control.getAttribute('aria-checked') === 'true'
          : control.checked;
        if (isRadio) {
          if (shouldSelect && !isChecked) control.click();
        } else if (isChecked !== shouldSelect) {
          control.click();
        }
      });
      filled += 1;
    }

    return filled;
  }

  function getStatusElement(button) {
    const panelRoots = getPanelRoots();
    const panel = button
      ? panelRoots.find((candidate) => candidate.contains(button)) || panelRoots[0]
      : panelRoots[0];
    if (!panel) return null;

    let status = panel.querySelector('[data-quiz-ai-status="true"]');
    if (status) return status;

    status = document.createElement('div');
    status.dataset.quizAiStatus = 'true';
    status.setAttribute('role', 'status');
    status.style.cssText = [
      'margin-top:6px',
      'padding:6px 8px',
      'border-radius:6px',
      'font-size:10px',
      'line-height:1.35',
      'display:none',
      'white-space:normal'
    ].join(';');

    const row = button?.parentElement;
    (row?.parentElement || panel).insertBefore(status, row?.nextSibling || null);
    return status;
  }

  function setQuizStatus(button, message, type = 'info') {
    const status = getStatusElement(button);
    if (!status) return;

    const colors = {
      info: ['#eff6ff', '#1d4ed8', '#bfdbfe'],
      success: ['#ecfdf3', '#047857', '#a7f3d0'],
      error: ['#fff1f2', '#be123c', '#fecdd3']
    };
    const [background, color, border] = colors[type] || colors.info;
    status.textContent = message;
    status.style.display = 'block';
    status.style.background = background;
    status.style.color = color;
    status.style.border = `1px solid ${border}`;
  }

  async function requestQuizAnswers(questions) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('AI service did not respond within 50 seconds.'));
      }, 50_000);

      chrome.runtime.sendMessage({
        action: SOLVE_QUIZ_ACTION,
        questions: questions.map((question) => question.payload)
      }, (response) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || 'The AI service did not return a response.'));
          return;
        }
        resolve(response);
      });
    });
  }

  async function runDirectQuiz(button) {
    if (directQuizInProgress || button?.dataset.quizDirectRunning === 'true') return;

    directQuizInProgress = true;
    autoFillAttemptedUrls.add(getQuizPageKey());
    if (button) {
      button.dataset.quizDirectRunning = 'true';
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.style.opacity = '0.7';
    }

    try {
      clearLegacyQuizDecorations();
      const questions = collectQuizQuestions();
      if (!questions.length) throw new Error('Không tìm thấy câu hỏi trên trang hiện tại.');

      setQuizStatus(button, `Đã đọc ${questions.length} câu hỏi. Đang gọi AI...`);
      console.info(PREFIX, 'Sending questions to the configured AI provider:', questions.map((item) => item.payload));

      const response = await requestQuizAnswers(questions);
      const filled = applyQuizAnswers(questions, response.answers || []);
      if (!filled) throw new Error('AI đã trả lời nhưng không có đáp án nào khớp với các lựa chọn trên trang.');

      setQuizStatus(
        button,
        `Đã điền ${filled}/${questions.length} câu bằng ${response.model}. Vui lòng kiểm tra trước khi Submit.`,
        filled === questions.length ? 'success' : 'info'
      );
      console.info(PREFIX, 'Direct AI fill completed:', { filled, total: questions.length, model: response.model });
    } catch (error) {
      console.error(PREFIX, 'Direct AI fill failed:', error);
      setQuizStatus(button, `Lỗi: ${error?.message || 'Không thể gọi AI.'}`, 'error');
    } finally {
      directQuizInProgress = false;
      if (button) {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.style.opacity = '';
        delete button.dataset.quizDirectRunning;
      }
    }
  }

  // Capture runs before React's handler, so the marker survives a full navigation.
  document.addEventListener('click', (event) => {
    if (resumeInProgress || !event.isTrusted || !(event.target instanceof Element)) return;

    const button = event.target.closest('button');
    if (!isPanelStartButton(button)) {
      const quizChoice = event.target.closest('label, input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"]');
      if (quizChoice && !quizChoice.closest('#coursera-tool')) {
        setTimeout(clearLegacyQuizDecorations, 0);
      }
      return;
    }

    rememberedStartButton = button;
    button.dataset.quizStartBridge = 'true';
    clearLegacyQuizDecorations();

    const startedWithQuiz = hasQuizControls();

    // When the questions are already rendered, let the bundled Start handler
    // run first. It remains the most compatible path for the configured Source
    // providers. The stale-spinner watchdog below invokes direct AI only when
    // that handler actually gets stuck.
    if (startedWithQuiz && !hasVisibleStartAssignment()) {
      clearPending();
      console.info(PREFIX, 'Quiz is already open; allowing the bundled Start handler to run.');
      setTimeout(recoverUntrackedSpinner, QUIZ_READY_GRACE + 250);
      return;
    }

    writePending({
      startedAt: Date.now(),
      originUrl: location.href,
      startedWithQuiz,
      quizReadyAt: startedWithQuiz ? Date.now() : null,
      reloadCount: 0,
      documentToken: DOCUMENT_TOKEN
    });
    console.info(PREFIX, 'Start requested; waiting for the quiz UI.');
    scheduleRetries();
  }, true);

  function init() {
    console.info(PREFIX, 'loaded', BRIDGE_VERSION);
    clearLegacyQuizDecorations();
    void restorePending().then((pending) => {
      if (!pending) return;
      scheduleRetries();
      setTimeout(tryResumeQuiz, 0);
    });

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
