/**
 * Coursera Tool - Tính năng "Môn" (Subjects/Courses Navigation)
 * Script này inject button "Môn" vào panel Course Progress trên trang Coursera
 * 
 * HƯỚNG DẪN: Chỉnh sửa danh sách môn học ở biến COURSES_LIST bên dưới
 */

// ============================================================
// 📝 CẤU HÌNH DANH SÁCH MÔN HỌC - CHỈNH SỬA TẠI ĐÂY
// ============================================================
// Mỗi môn học gồm:
//   name:  Tên môn học hiển thị
//   url:   Link đơn (dùng khi chỉ có 1 link)
//   urls:  Mảng link (dùng khi có NHIỀU link cho 1 môn)
//   icon:  Emoji icon (tùy chọn, mặc định là 📘)
//
// VÍ DỤ MÔN CÓ 1 LINK:  { name: "ABC", url: "https://..." }
// VÍ DỤ MÔN CÓ 2+ LINK: { name: "XYZ", urls: ["https://...", "https://..."] }
// ============================================================
const COURSES_LIST = [
  {
    name: "ENW492c",
    url: "https://www.coursera.org/specializations/academic-english",
  },
  {
    name: "EAL202c",
    url: "https://www.coursera.org/specializations/speaklistenenglish",
  },
  {
    name: "BDT202c",
    urls: [
      "https://www.coursera.org/learn/illinois-tech-digital-transformation/home/info",
      "https://www.coursera.org/professional-certificates/google-cloud-digital-leader-training",
    ],
  },
  // --- THÊM MÔN HỌC MỚI ---
  // Môn 1 link:    { name: "Tên môn", url: "https://..." },
  // Môn nhiều link: { name: "Tên môn", urls: ["https://...", "https://..."] },
];
// ============================================================

(function() {
  'use strict';

  const BTN_ID = 'coursera-tool-mon-btn';
  const DROPDOWN_ID = 'coursera-tool-mon-dropdown';
  let isDropdownOpen = false;

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Lấy tên ngắn từ URL (phần cuối path)
  function getShortName(url) {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      // Bỏ "home/info" ở cuối nếu có
      const cleaned = parts.filter(p => p !== 'home' && p !== 'info');
      return cleaned[cleaned.length - 1] || u.pathname;
    } catch { return url; }
  }

  // Lấy danh sách URLs cho 1 course (hỗ trợ cả url đơn và urls mảng)
  function getCourseUrls(course) {
    if (course.urls && Array.isArray(course.urls)) return course.urls;
    if (course.url) return [course.url];
    return [];
  }

  const bgColors = [
    '#e3f2fd', '#e8f5e9', '#fff3e0', '#f3e5f5', '#ffebee',
    '#e0f2f1', '#fce4ec', '#e8eaf6', '#fff8e1', '#e0f7fa'
  ];

  // ============ DROPDOWN ============
  function buildListHTML(filter) {
    const filtered = COURSES_LIST.filter(c =>
      c.name.toLowerCase().includes((filter || '').toLowerCase())
    );

    if (filtered.length === 0) {
      return '<div style="padding:20px;text-align:center;color:#999;font-size:12px;">' +
        (filter ? '🔍 Không tìm thấy môn học' : '📭 Chưa có môn học nào') + '</div>';
    }

    return filtered.map((c, i) => {
      const bg = bgColors[i % bgColors.length];
      const icon = c.icon || '📘';
      const urls = getCourseUrls(c);
      const hasMultiple = urls.length > 1;

      // Main item
      let html = '<div class="ct-mon-item" data-index="' + i + '" ' +
        (hasMultiple ? '' : 'data-url="' + escHtml(urls[0] || '') + '"') +
        ' title="' + escHtml(c.name) + '" ' +
        'style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:' + (hasMultiple ? 'none' : '1px solid #f3f3f3') + ';color:#333;font-size:13px;font-weight:600;transition:background 0.12s, padding-left 0.12s;">' +
        '<div style="width:30px;height:30px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;background:' + bg + ';">' + icon + '</div>' +
        '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(c.name) + '</span>';

      if (hasMultiple) {
        html += '<span style="font-size:10px;background:#ffedd5;color:#c2410c;padding:1px 6px;border-radius:4px;font-weight:700;">' + urls.length + ' link</span>';
        html += '<span style="font-size:11px;opacity:0.4;">▼</span>';
      } else {
        html += '<span style="font-size:11px;opacity:0.3;">→</span>';
      }
      html += '</div>';

      // Sub-links for multi-URL courses
      if (hasMultiple) {
        html += '<div class="ct-mon-sublinks" data-parent="' + i + '" style="border-bottom:1px solid #f3f3f3;">';
        urls.forEach((u, j) => {
          const shortName = getShortName(u);
          html += '<div class="ct-mon-subitem" data-url="' + escHtml(u) + '" ' +
            'style="display:flex;align-items:center;gap:8px;padding:7px 14px 7px 54px;cursor:pointer;color:#555;font-size:12px;transition:background 0.12s, color 0.12s;border-top:1px solid #f8f8f8;">' +
            '<span style="color:#3b82f6;font-size:11px;flex-shrink:0;">🔗</span>' +
            '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escHtml(u) + '">Link ' + (j + 1) + ': ' + escHtml(shortName) + '</span>' +
            '<span style="font-size:10px;opacity:0.3;">→</span>' +
            '</div>';
        });
        html += '</div>';
      }

      return html;
    }).join('');
  }

  function attachItemEvents(container) {
    // Single-URL items
    container.querySelectorAll('.ct-mon-item[data-url]').forEach(item => {
      item.onmouseenter = () => { item.style.background = '#fff7ed'; item.style.color = '#ea580c'; };
      item.onmouseleave = () => { item.style.background = ''; item.style.color = '#333'; };
      item.onclick = (e) => {
        e.stopPropagation();
        const url = item.getAttribute('data-url');
        if (url) { window.open(url, '_blank'); closeDropdown(); }
      };
    });

    // Multi-URL parent items (toggle sub-links)
    container.querySelectorAll('.ct-mon-item:not([data-url])').forEach(item => {
      item.onmouseenter = () => { item.style.background = '#fff7ed'; item.style.color = '#ea580c'; };
      item.onmouseleave = () => { item.style.background = ''; item.style.color = '#333'; };
      // Click on parent is optional - sub-links are always visible
    });

    // Sub-link items
    container.querySelectorAll('.ct-mon-subitem').forEach(item => {
      item.onmouseenter = () => { item.style.background = '#fff7ed'; item.style.color = '#ea580c'; };
      item.onmouseleave = () => { item.style.background = ''; item.style.color = '#555'; };
      item.onclick = (e) => {
        e.stopPropagation();
        const url = item.getAttribute('data-url');
        if (url) { window.open(url, '_blank'); closeDropdown(); }
      };
    });
  }

  function openDropdown(anchorBtn) {
    if (isDropdownOpen) { closeDropdown(); return; }

    const panel = anchorBtn.closest('.rounded-2xl, .shadow-2xl, [class*="shadow-2xl"], [class*="rounded-2xl"]') ||
                  anchorBtn.parentElement?.parentElement?.parentElement?.parentElement;
    if (!panel) return;

    const panelPosition = window.getComputedStyle(panel).position;
    if (panelPosition === 'static') panel.style.position = 'relative';

    // Dropdown BÊN TRONG panel
    const dd = document.createElement('div');
    dd.id = DROPDOWN_ID;
    dd.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:50;display:flex;flex-direction:column;background:#fff;border-radius:inherit;overflow:hidden;';

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';
    header.innerHTML = '<span>🎓 Danh sách môn học (' + COURSES_LIST.length + ')</span>';
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'background:rgba(255,255,255,0.25);border:none;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;';
    closeBtn.onmouseenter = () => { closeBtn.style.background = 'rgba(255,255,255,0.4)'; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = 'rgba(255,255,255,0.25)'; };
    closeBtn.onclick = (e) => { e.stopPropagation(); closeDropdown(); };
    header.appendChild(closeBtn);
    dd.appendChild(header);

    // Search
    const searchWrap = document.createElement('div');
    searchWrap.style.cssText = 'padding:10px 14px;border-bottom:1px solid #eee;background:#fafafa;flex-shrink:0;';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '🔍 Tìm kiếm môn học...';
    searchInput.autocomplete = 'off';
    searchInput.style.cssText = 'width:100%;padding:8px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;outline:none;font-family:inherit;background:#fff;box-sizing:border-box;';
    searchInput.onfocus = () => { searchInput.style.borderColor = '#f97316'; };
    searchInput.onblur = () => { searchInput.style.borderColor = '#ddd'; };
    searchInput.oninput = () => { listEl.innerHTML = buildListHTML(searchInput.value); attachItemEvents(listEl); };
    searchInput.onclick = (e) => e.stopPropagation();
    searchWrap.appendChild(searchInput);
    dd.appendChild(searchWrap);

    // List
    const listEl = document.createElement('div');
    listEl.style.cssText = 'flex:1;overflow-y:auto;';
    listEl.innerHTML = buildListHTML('');
    dd.appendChild(listEl);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = 'padding:8px 14px;border-top:1px solid #eee;background:#fafafa;text-align:center;font-size:11px;color:#999;flex-shrink:0;';
    footer.textContent = 'Bấm ✕ hoặc Esc để quay lại';
    dd.appendChild(footer);

    dd.onclick = (e) => e.stopPropagation();
    panel.appendChild(dd);
    attachItemEvents(listEl);
    isDropdownOpen = true;
    setTimeout(() => searchInput.focus(), 80);
  }

  function closeDropdown() {
    const dd = document.getElementById(DROPDOWN_ID);
    if (dd) dd.remove();
    isDropdownOpen = false;
  }

  // ============ FIND & INJECT BUTTON ============
  function findSkipButton() {
    const allBtns = document.querySelectorAll('button');
    for (const btn of allBtns) {
      const text = (btn.textContent || '').trim();
      if (text.includes('Skip videos') || text.includes('Skip discussions')) return btn;
    }
    return null;
  }

  function injectButton() {
    if (document.getElementById(BTN_ID)) return true;
    const skipBtn = findSkipButton();
    if (!skipBtn) return false;
    const buttonRow = skipBtn.parentElement;
    if (!buttonRow) return false;

    const monBtn = document.createElement('button');
    monBtn.id = BTN_ID;
    monBtn.className = skipBtn.className;
    monBtn.style.cssText = 'background:linear-gradient(135deg,#f97316 0%,#fb923c 100%)!important;color:#fff!important;border-color:#ea580c!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;white-space:nowrap!important;transition:all 0.2s ease!important;width:100%!important;margin-bottom:6px!important;';
    monBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 10 3 12 0v-5"></path></svg>Môn<span style="background:rgba(255,255,255,0.3);padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;">' + COURSES_LIST.length + '</span>';
    monBtn.onmouseenter = () => { monBtn.style.boxShadow = '0 4px 14px rgba(249,115,22,0.35)'; monBtn.style.transform = 'translateY(-1px)'; };
    monBtn.onmouseleave = () => { monBtn.style.boxShadow = ''; monBtn.style.transform = ''; };
    monBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openDropdown(monBtn); };

    buttonRow.parentElement.insertBefore(monBtn, buttonRow);
    console.log('[CourseraTool] ✅ Button "Môn" đã được thêm thành công!');
    return true;
  }

  // ============ INIT ============
  function init() {
    if (injectButton()) return;
    const observer = new MutationObserver(() => {
      if (document.getElementById(BTN_ID)) return;
      injectButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 1000);
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDropdown(); });
})();
