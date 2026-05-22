/**
 * Panel Layout Fix - Tối ưu panel cho màn hình nhỏ
 * Chuyển 3 button "Skip videos & readings", "Skip discussions", "Môn" sang chiều dọc
 * để panel gọn hơn, không che nút "Start"
 */
(function() {
  'use strict';

  // Inject CSS override for compact vertical layout
  function injectCompactCSS() {
    if (document.getElementById('panel-fix-css')) return;
    
    const style = document.createElement('style');
    style.id = 'panel-fix-css';
    style.textContent = `
      /* === PANEL COMPACT FIX === */
      
      /* Giảm max-width và padding panel chính */
      .rounded-2xl.shadow-2xl.bg-white {
        max-width: 250px !important;
        padding: 8px 10px !important;
      }
      
      /* Giảm kích thước header section */
      .rounded-2xl.shadow-2xl .font-bold.text-sm {
        font-size: 11px !important;
        margin-bottom: 3px !important;
        margin-top: 3px !important;
      }
      
      /* Giảm padding và font size tất cả button trong panel */
      .rounded-2xl.shadow-2xl button {
        padding: 3px 7px !important;
        font-size: 10px !important;
      }
      
      /* Giảm gap giữa các element */
      .rounded-2xl.shadow-2xl .gap-2 {
        gap: 3px !important;
      }
      .rounded-2xl.shadow-2xl .gap-3 {
        gap: 4px !important;
      }
      .rounded-2xl.shadow-2xl .gap-4 {
        gap: 5px !important;
      }
      
      /* Giảm margin sections */
      .rounded-2xl.shadow-2xl .my-3,
      .rounded-2xl.shadow-2xl .my-2 {
        margin-top: 4px !important;
        margin-bottom: 4px !important;
      }
      .rounded-2xl.shadow-2xl .mb-3,
      .rounded-2xl.shadow-2xl .mb-2 {
        margin-bottom: 3px !important;
      }
      .rounded-2xl.shadow-2xl .mt-3,
      .rounded-2xl.shadow-2xl .mt-2 {
        margin-top: 4px !important;
      }
      .rounded-2xl.shadow-2xl .mb-4 {
        margin-bottom: 4px !important;
      }
      
      /* Giảm kích thước input và select */
      .rounded-2xl.shadow-2xl input,
      .rounded-2xl.shadow-2xl select {
        font-size: 10px !important;
        padding: 2px 5px !important;
      }
      
      /* Giảm text footer version */
      .rounded-2xl.shadow-2xl .text-xs {
        font-size: 9px !important;
      }
      
      /* Giảm padding p-5 */
      .rounded-2xl.shadow-2xl.p-5 {
        padding: 8px 10px !important;
      }

      /* Giảm border-t section spacing */
      .rounded-2xl.shadow-2xl .border-t {
        padding-top: 4px !important;
        margin-top: 4px !important;
      }

      /* Giảm khoảng cách dòng "flex justify-between mt-3 mb-2" (Quiz header) */
      .rounded-2xl.shadow-2xl .flex.justify-between.mt-3.mb-2 {
        margin-top: 4px !important;
        margin-bottom: 3px !important;
      }

      /* Theme cam cho toan bo nut trong panel */
      .rounded-2xl.shadow-2xl button,
      .rounded-2xl.shadow-2xl [role="button"] {
        background: linear-gradient(135deg, #f97316 0%, #fb923c 100%) !important;
        border-color: #ea580c !important;
        color: #fff !important;
        box-shadow: none !important;
      }

      .rounded-2xl.shadow-2xl button:hover,
      .rounded-2xl.shadow-2xl [role="button"]:hover {
        background: linear-gradient(135deg, #ea580c 0%, #f97316 100%) !important;
      }

      .rounded-2xl.shadow-2xl input:focus,
      .rounded-2xl.shadow-2xl select:focus {
        border-color: #f97316 !important;
        box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.16) !important;
      }

      .rounded-2xl.shadow-2xl input[type="checkbox"] {
        accent-color: #f97316 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function getPanelRoot() {
    return document.querySelector('.rounded-2xl.shadow-2xl');
  }

  function getModelSelect(panel) {
    const selects = Array.from(panel.querySelectorAll('select'));
    return selects.find((select) => {
      const text = Array.from(select.options || [])
        .map((option) => `${option.textContent || ''} ${option.value || ''}`.toLowerCase())
        .join(' ');
      return text.includes('gemini') || text.includes('gpt');
    }) || null;
  }

  function getApiInput(panel) {
    const inputs = Array.from(panel.querySelectorAll('input'));
    return inputs.find((input) => {
      const placeholder = (input.placeholder || '').toLowerCase();
      const aria = (input.getAttribute('aria-label') || '').toLowerCase();
      return placeholder.includes('api') || aria.includes('api');
    }) || null;
  }

  function setTextByContent(panel, matcher, nextText) {
    const els = panel.querySelectorAll('span, div, label, p');
    for (const el of els) {
      const text = (el.textContent || '').trim();
      if (matcher(text)) {
        el.textContent = nextText;
      }
    }
  }

  function syncProviderUI(panel, modelSelect) {
    const isOpenAI = (modelSelect?.value || '').toLowerCase().startsWith('gpt-');
    const apiInput = getApiInput(panel);

    setTextByContent(
      panel,
      (text) => text === 'Gemini API:' || text === 'ChatGPT API:' || text === 'API Key:',
      isOpenAI ? 'ChatGPT API:' : 'Gemini API:'
    );

    if (apiInput) {
      apiInput.placeholder = isOpenAI ? 'Enter OpenAI API key' : 'Enter Gemini API';
      apiInput.setAttribute('data-ai-provider', isOpenAI ? 'openai' : 'gemini');
    }
  }

  async function bindAIFields(panel) {
    const modelSelect = getModelSelect(panel);
    const apiInput = getApiInput(panel);
    if (!modelSelect || !apiInput) return;

    if (!modelSelect.querySelector('option[value="gpt-4o-mini"]')) {
      modelSelect.insertAdjacentHTML(
        'beforeend',
        '<option value="gpt-4o-mini">gpt-4o-mini</option><option value="gpt-4.1-mini">gpt-4.1-mini</option>'
      );
    }

    if (!modelSelect.getAttribute('data-chatgpt-bound')) {
      modelSelect.setAttribute('data-chatgpt-bound', 'true');
      modelSelect.addEventListener('change', async () => {
        const model = modelSelect.value || '';
        const isOpenAI = model.toLowerCase().startsWith('gpt-');
        await chrome.storage.local.set({
          model,
          aiProvider: isOpenAI ? 'openai' : 'gemini',
        });
        syncProviderUI(panel, modelSelect);
      });
    }

    if (!apiInput.getAttribute('data-chatgpt-bound')) {
      apiInput.setAttribute('data-chatgpt-bound', 'true');
      apiInput.addEventListener('input', async () => {
        const value = apiInput.value || '';
        const model = modelSelect.value || '';
        const isOpenAI = model.toLowerCase().startsWith('gpt-');
        await chrome.storage.local.set({
          aiProvider: isOpenAI ? 'openai' : 'gemini',
          openaiAPI: isOpenAI ? value : (await chrome.storage.local.get('openaiAPI')).openaiAPI || '',
          geminiAPI: isOpenAI ? (await chrome.storage.local.get('geminiAPI')).geminiAPI || '' : value,
        });
      });
    }

    const stored = await chrome.storage.local.get(['model', 'geminiAPI', 'openaiAPI', 'aiProvider']);
    if (stored.model && !Array.from(modelSelect.options).some((option) => option.value === stored.model)) {
      modelSelect.insertAdjacentHTML('beforeend', '<option value="' + stored.model + '">' + stored.model + '</option>');
    }
    if (stored.model) {
      modelSelect.value = stored.model;
    }

    const isOpenAI = ((stored.aiProvider || '').toLowerCase() === 'openai') || ((modelSelect.value || '').toLowerCase().startsWith('gpt-'));
    if (isOpenAI && stored.openaiAPI) {
      apiInput.value = stored.openaiAPI;
    } else if (!isOpenAI && stored.geminiAPI) {
      apiInput.value = stored.geminiAPI;
    }

    syncProviderUI(panel, modelSelect);
  }

  /**
   * Tìm panel và chuyển button row (Skip videos, Skip discussions, Môn) sang chiều dọc
   */
  function fixButtonLayout() {
    // Tìm panel dựa trên class đặc trưng
    const panels = document.querySelectorAll('.rounded-2xl.shadow-2xl');
    if (panels.length === 0) return false;

    let fixed = false;

    panels.forEach(panel => {
      // Tìm tất cả button trong panel
      const allButtons = panel.querySelectorAll('button');
      let skipBtn = null;
      let buttonRow = null;

      for (const btn of allButtons) {
        const text = (btn.textContent || '').trim();
        if (text.includes('Skip video') || text.includes('Skip discussion')) {
          skipBtn = btn;
          buttonRow = btn.parentElement;
          break;
        }
      }

      if (!buttonRow) return;

      // Kiểm tra đã fix chưa
      if (buttonRow.getAttribute('data-panel-fixed') === 'true') return;
      buttonRow.setAttribute('data-panel-fixed', 'true');

      // Chuyển button row sang chiều dọc
      buttonRow.style.setProperty('display', 'flex', 'important');
      buttonRow.style.setProperty('flex-direction', 'column', 'important');
      buttonRow.style.setProperty('gap', '4px', 'important');
      buttonRow.style.setProperty('align-items', 'stretch', 'important');

      // Đảm bảo mỗi button full width và text center
      const btns = buttonRow.querySelectorAll('button');
      btns.forEach(btn => {
        btn.style.setProperty('width', '100%', 'important');
        btn.style.setProperty('justify-content', 'center', 'important');
        btn.style.setProperty('text-align', 'center', 'important');
      });

      fixed = true;
    });

    return fixed;
  }

  /**
   * Gán link Facebook vào nút "Support" trong footer panel
   */
  function fixSupportLink() {
    const FB_URL = 'https://www.facebook.com/hoa.nguyenxuan.3979489/';
    const panels = document.querySelectorAll('.rounded-2xl.shadow-2xl');
    panels.forEach(panel => {
      // Tìm tất cả element chứa text "Support"
      const allEls = panel.querySelectorAll('span, a, button, div, p');
      for (const el of allEls) {
        if (el.childNodes.length > 5) continue;
        const text = (el.textContent || '').trim();
        if (text === 'Support' && !el.getAttribute('data-fb-linked')) {
          el.setAttribute('data-fb-linked', 'true');

          // Tìm parent clickable gần nhất (a, button hoặc element có onclick)
          let clickable = el.closest('a') || el.closest('button') || el.closest('[onclick]');
          // Nếu không tìm thấy, dùng parent trực tiếp
          if (!clickable) clickable = el.parentElement;

          // Override tất cả ancestor có thể handle click
          let current = el;
          while (current && current !== panel) {
            if (current.tagName === 'A') {
              current.href = FB_URL;
              current.target = '_blank';
              current.setAttribute('data-fb-linked', 'true');
            }
            // Remove existing onclick handlers bằng cách clone node
            current.setAttribute('data-fb-linked', 'true');
            current = current.parentElement;
          }

          // Attach click handler capture phase để chặn hoàn toàn event gốc
          (clickable || el).addEventListener('click', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.open(FB_URL, '_blank');
          }, true); // true = capture phase, chạy trước event gốc
        }
      }
    });
  }

  // Init
  function init() {
    injectCompactCSS();
    fixButtonLayout();
    fixSupportLink();
    const panel = getPanelRoot();
    if (panel) {
      bindAIFields(panel).catch(console.error);
    }

    // Observer để apply lại khi panel re-render
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fixButtonLayout();
        fixSupportLink();
        const currentPanel = getPanelRoot();
        if (currentPanel) {
          bindAIFields(currentPanel).catch(console.error);
        }
      }, 200);
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }
})();
