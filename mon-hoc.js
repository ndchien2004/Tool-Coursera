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
let COURSES_LIST = [
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
  let activeOutsideClickListener = null;
  let currentScreen = 'list';
  let currentEditIndex = null;
  let showScreenRef = null;

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

  // Inject Custom Stylesheets for premium UI/UX
  function injectStyles() {
    if (document.getElementById('coursera-tool-styles')) return;
    const style = document.createElement('style');
    style.id = 'coursera-tool-styles';
    style.textContent = `
      /* Scrollbar cho dropdown */
      .ct-mon-dropdown *::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .ct-mon-dropdown *::-webkit-scrollbar-track {
        background: transparent;
      }
      .ct-mon-dropdown *::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
      .ct-mon-dropdown *::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }

      /* Animations */
      @keyframes ctFadeIn {
        from { opacity: 0; transform: scale(0.97); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes ctShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-4px); }
        75% { transform: translateX(4px); }
      }

      .ct-animate-fade-in {
        animation: ctFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .ct-animate-shake {
        animation: ctShake 0.2s ease-in-out 2;
      }

      /* Dropdown shadow */
      .ct-mon-dropdown {
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08) !important;
        border: 1px solid rgba(229, 231, 235, 0.9) !important;
      }

      /* Quick Emojis */
      .ct-emoji-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: #f3f4f6;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 15px;
        transition: all 0.15s ease;
      }
      .ct-emoji-btn:hover {
        background: #ffedd5;
        transform: scale(1.15);
      }
      .ct-emoji-btn:active {
        transform: scale(0.95);
      }
    `;
    document.head.appendChild(style);
  }

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
        'style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:' + (hasMultiple ? 'none' : '1px solid #f3f3f3') + ';color:#333;font-size:13px;font-weight:600;transition:all 0.15s ease;">' +
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
            'style="display:flex;align-items:center;gap:8px;padding:7px 14px 7px 54px;cursor:pointer;color:#555;font-size:12px;transition:all 0.15s ease;border-top:1px solid #f8f8f8;">' +
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
      item.onmouseenter = () => { item.style.background = '#fff7ed'; item.style.color = '#ea580c'; item.style.paddingLeft = '18px'; };
      item.onmouseleave = () => { item.style.background = ''; item.style.color = '#333'; item.style.paddingLeft = '14px'; };
      item.onclick = (e) => {
        e.stopPropagation();
        const url = item.getAttribute('data-url');
        if (url) { window.open(url, '_blank'); closeDropdown(); }
      };
    });

    // Multi-URL parent items (toggle sub-links)
    container.querySelectorAll('.ct-mon-item:not([data-url])').forEach(item => {
      item.onmouseenter = () => { item.style.background = '#fff7ed'; item.style.color = '#ea580c'; item.style.paddingLeft = '18px'; };
      item.onmouseleave = () => { item.style.background = ''; item.style.color = '#333'; item.style.paddingLeft = '14px'; };
    });

    // Sub-link items
    container.querySelectorAll('.ct-mon-subitem').forEach(item => {
      item.onmouseenter = () => { item.style.background = '#fff7ed'; item.style.color = '#ea580c'; item.style.paddingLeft = '58px'; };
      item.onmouseleave = () => { item.style.background = ''; item.style.color = '#555'; item.style.paddingLeft = '54px'; };
      item.onclick = (e) => {
        e.stopPropagation();
        const url = item.getAttribute('data-url');
        if (url) { window.open(url, '_blank'); closeDropdown(); }
      };
    });
  }

  async function loadCoursesList() {
    return new Promise((resolve) => {
      chrome.storage.local.get('coursesList', (data) => {
        if (data && data.coursesList && Array.isArray(data.coursesList)) {
          COURSES_LIST = data.coursesList;
        } else {
          chrome.storage.local.set({ coursesList: COURSES_LIST });
        }
        resolve();
      });
    });
  }

  function saveCoursesList() {
    chrome.storage.local.set({ coursesList: COURSES_LIST }, () => {
      updateButtonText();
    });
  }

  function updateButtonText() {
    const btn = document.getElementById(BTN_ID);
    if (btn) {
      const span = btn.querySelector('span');
      if (span) {
        span.textContent = COURSES_LIST.length;
      }
    }
  }

  function openDropdown(anchorBtn) {
    if (isDropdownOpen) { closeDropdown(); return; }

    const panel = anchorBtn.closest('.rounded-2xl, .shadow-2xl, [class*="shadow-2xl"], [class*="rounded-2xl"]') ||
                  anchorBtn.parentElement?.parentElement?.parentElement?.parentElement;
    if (!panel) return;

    const panelPosition = window.getComputedStyle(panel).position;
    if (panelPosition === 'static') panel.style.position = 'relative';

    const dd = document.createElement('div');
    dd.id = DROPDOWN_ID;
    dd.className = 'ct-mon-dropdown ct-animate-fade-in';
    dd.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:50;display:flex;flex-direction:column;background:#fff;border-radius:inherit;overflow:hidden;font-family:inherit;';

    function showScreen(screenName, editIndex = null) {
      currentScreen = screenName;
      currentEditIndex = editIndex;
      dd.innerHTML = '';

      if (screenName === 'list') {
        // --- 1. SCREEN VIEW LIST ---
        const header = document.createElement('div');
        header.style.cssText = 'padding:12px 16px;background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';
        header.innerHTML = '<span>🎓 Môn học (' + COURSES_LIST.length + ')</span>';

        const actionWrap = document.createElement('div');
        actionWrap.style.cssText = 'display:flex;align-items:center;gap:8px;';

        const settingsBtn = document.createElement('button');
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.title = 'Quản lý môn học';
        settingsBtn.style.cssText = 'background:rgba(255,255,255,0.25);border:none;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;transition:background 0.2s;';
        settingsBtn.onmouseenter = () => { settingsBtn.style.background = 'rgba(255,255,255,0.4)'; };
        settingsBtn.onmouseleave = () => { settingsBtn.style.background = 'rgba(255,255,255,0.25)'; };
        settingsBtn.onclick = (e) => { e.stopPropagation(); showScreen('manage'); };
        actionWrap.appendChild(settingsBtn);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = 'background:rgba(255,255,255,0.25);border:none;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;transition:background 0.2s;';
        closeBtn.onmouseenter = () => { closeBtn.style.background = 'rgba(255,255,255,0.4)'; };
        closeBtn.onmouseleave = () => { closeBtn.style.background = 'rgba(255,255,255,0.25)'; };
        closeBtn.onclick = (e) => { e.stopPropagation(); closeDropdown(); };
        actionWrap.appendChild(closeBtn);

        header.appendChild(actionWrap);
        dd.appendChild(header);

        const searchWrap = document.createElement('div');
        searchWrap.style.cssText = 'padding:10px 14px;border-bottom:1px solid #eee;background:#fafafa;flex-shrink:0;';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '🔍 Tìm kiếm môn học...';
        searchInput.autocomplete = 'off';
        searchInput.style.cssText = 'width:100%;padding:8px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;outline:none;font-family:inherit;background:#fff;box-sizing:border-box;transition:all 0.2s ease;';
        searchInput.onfocus = () => { searchInput.style.borderColor = '#f97316'; searchInput.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)'; };
        searchInput.onblur = () => { searchInput.style.borderColor = '#ddd'; searchInput.style.boxShadow = 'none'; };
        searchInput.oninput = () => { listEl.innerHTML = buildListHTML(searchInput.value); attachItemEvents(listEl); };
        searchInput.onclick = (e) => e.stopPropagation();
        searchWrap.appendChild(searchInput);
        dd.appendChild(searchWrap);

        const listEl = document.createElement('div');
        listEl.style.cssText = 'flex:1;overflow-y:auto;';
        listEl.innerHTML = buildListHTML('');
        dd.appendChild(listEl);
        attachItemEvents(listEl);

        const footer = document.createElement('div');
        footer.style.cssText = 'padding:8px 14px;border-top:1px solid #eee;background:#fafafa;text-align:center;font-size:11px;color:#999;flex-shrink:0;';
        footer.textContent = 'Bấm ✕ hoặc Esc để quay lại';
        dd.appendChild(footer);

        setTimeout(() => searchInput.focus(), 80);

      } else if (screenName === 'manage') {
        // --- 2. SCREEN MANAGE ---
        const header = document.createElement('div');
        header.style.cssText = 'padding:12px 16px;background:linear-gradient(135deg,#374151,#4b5563);color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';
        header.innerHTML = '<span>⚙️ Quản lý môn học</span>';

        const backBtn = document.createElement('button');
        backBtn.innerHTML = '🔙';
        backBtn.title = 'Quay lại danh sách';
        backBtn.style.cssText = 'background:rgba(255,255,255,0.2);border:none;color:#fff;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background 0.2s;';
        backBtn.onmouseenter = () => { backBtn.style.background = 'rgba(255,255,255,0.3)'; };
        backBtn.onmouseleave = () => { backBtn.style.background = 'rgba(255,255,255,0.2)'; };
        backBtn.onclick = (e) => { e.stopPropagation(); showScreen('list'); };
        header.appendChild(backBtn);
        dd.appendChild(header);

        const listContainer = document.createElement('div');
        listContainer.style.cssText = 'flex:1;overflow-y:auto;padding:10px 0;background:#fff;';

        if (COURSES_LIST.length === 0) {
          listContainer.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#999;font-size:12px;">📭 Danh sách trống. Hãy thêm môn học mới!</div>';
        } else {
          COURSES_LIST.forEach((c, index) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #f3f3f3;gap:10px;transition:background 0.2s;';
            row.onmouseenter = () => { row.style.background = '#f9fafb'; };
            row.onmouseleave = () => { row.style.background = 'transparent'; };

            const left = document.createElement('div');
            left.style.cssText = 'display:flex;align-items:center;gap:10px;overflow:hidden;flex:1;';
            const icon = document.createElement('span');
            icon.textContent = c.icon || '📘';
            icon.style.cssText = 'font-size:15px;';
            const name = document.createElement('span');
            name.textContent = c.name;
            name.style.cssText = 'font-weight:600;font-size:13px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            left.appendChild(icon);
            left.appendChild(name);
            row.appendChild(left);

            const actions = document.createElement('div');
            actions.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';

            const editBtn = document.createElement('button');
            editBtn.innerHTML = '✏️';
            editBtn.title = 'Chỉnh sửa';
            editBtn.style.cssText = 'background:#eff6ff;border:none;border-radius:6px;width:26px;height:26px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;color:#2563eb;transition:all 0.15s ease;';
            editBtn.onmouseenter = () => { editBtn.style.background = '#dbeafe'; editBtn.style.transform = 'scale(1.1)'; };
            editBtn.onmouseleave = () => { editBtn.style.background = '#eff6ff'; editBtn.style.transform = 'none'; };
            editBtn.onclick = (e) => { e.stopPropagation(); showScreen('edit', index); };
            actions.appendChild(editBtn);

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '🗑️';
            delBtn.title = 'Xóa';
            delBtn.style.cssText = 'background:#fef2f2;border:none;border-radius:6px;width:26px;height:26px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;color:#dc2626;transition:all 0.15s ease;';
            delBtn.onmouseenter = () => { delBtn.style.background = '#fee2e2'; delBtn.style.transform = 'scale(1.1)'; };
            delBtn.onmouseleave = () => { delBtn.style.background = '#fef2f2'; delBtn.style.transform = 'none'; };
            delBtn.onclick = (e) => {
              e.stopPropagation();
              if (confirm(`Bạn chắc chắn muốn xóa môn "${c.name}"?`)) {
                COURSES_LIST.splice(index, 1);
                saveCoursesList();
                showScreen('manage');
              }
            };
            actions.appendChild(delBtn);

            row.appendChild(actions);
            listContainer.appendChild(row);
          });
        }
        dd.appendChild(listContainer);

        const bottomWrap = document.createElement('div');
        bottomWrap.style.cssText = 'padding:12px 14px;background:#fafafa;border-top:1px solid #eee;';
        const addBtn = document.createElement('button');
        addBtn.innerHTML = '➕ Thêm môn học mới';
        addBtn.style.cssText = 'width:100%;padding:10px;background:linear-gradient(135deg,#f97316,#fb923c);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(249,115,22,0.2);transition:all 0.15s;';
        addBtn.onmouseenter = () => { addBtn.style.transform = 'translateY(-1px)'; addBtn.style.boxShadow = '0 4px 12px rgba(249,115,22,0.3)'; };
        addBtn.onmouseleave = () => { addBtn.style.transform = 'none'; addBtn.style.boxShadow = '0 2px 8px rgba(249,115,22,0.2)'; };
        addBtn.onclick = (e) => { e.stopPropagation(); showScreen('edit', null); };
        bottomWrap.appendChild(addBtn);
        dd.appendChild(bottomWrap);

        const footer = document.createElement('div');
        footer.style.cssText = 'padding:6px 14px 10px;background:#fafafa;text-align:center;font-size:10px;color:#bbb;flex-shrink:0;';
        footer.textContent = 'Danh sách thay đổi được lưu tự động';
        dd.appendChild(footer);

      } else if (screenName === 'edit') {
        // --- 3. SCREEN EDIT / ADD FORM ---
        const isEditing = editIndex !== null;
        const courseData = isEditing ? COURSES_LIST[editIndex] : { name: '', icon: '📘', urls: [''] };
        const originalUrls = getCourseUrls(courseData).join('\n');

        const header = document.createElement('div');
        header.style.cssText = 'padding:12px 16px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;';
        header.innerHTML = '<span>' + (isEditing ? '✏️ Chỉnh sửa môn' : '➕ Thêm môn mới') + '</span>';

        const backBtn = document.createElement('button');
        backBtn.innerHTML = '🔙';
        backBtn.title = 'Quay lại quản lý';
        backBtn.style.cssText = 'background:rgba(255,255,255,0.2);border:none;color:#fff;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background 0.2s;';
        backBtn.onmouseenter = () => { backBtn.style.background = 'rgba(255,255,255,0.3)'; };
        backBtn.onmouseleave = () => { backBtn.style.background = 'rgba(255,255,255,0.2)'; };
        backBtn.onclick = (e) => { e.stopPropagation(); showScreen('manage'); };
        header.appendChild(backBtn);
        dd.appendChild(header);

        const formWrap = document.createElement('div');
        formWrap.style.cssText = 'flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#fff;box-sizing:border-box;';

        const nameField = document.createElement('div');
        nameField.style.cssText = 'display:flex;flex-direction:column;gap:5px;';
        nameField.innerHTML = '<label style="font-weight:700;font-size:12px;color:#4b5563;">Tên môn học:</label>';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = courseData.name;
        nameInput.placeholder = 'Ví dụ: EAL202c';
        nameInput.style.cssText = 'padding:8px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;outline:none;font-family:inherit;transition:all 0.2s ease;';
        nameInput.onfocus = () => { nameInput.style.borderColor = '#f97316'; nameInput.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)'; };
        nameInput.onblur = () => { nameInput.style.borderColor = '#ddd'; nameInput.style.boxShadow = 'none'; };
        nameField.appendChild(nameInput);
        formWrap.appendChild(nameField);

        const iconField = document.createElement('div');
        iconField.style.cssText = 'display:flex;flex-direction:column;gap:5px;';
        iconField.innerHTML = '<label style="font-weight:700;font-size:12px;color:#4b5563;">Biểu tượng (Emoji):</label>';
        const iconInput = document.createElement('input');
        iconInput.type = 'text';
        iconInput.value = courseData.icon || '📘';
        iconInput.placeholder = 'Ví dụ: 🎓 hoặc 📘';
        iconInput.style.cssText = 'padding:8px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;outline:none;font-family:inherit;transition:all 0.2s ease;';
        iconInput.onfocus = () => { iconInput.style.borderColor = '#f97316'; iconInput.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)'; };
        iconInput.onblur = () => { iconInput.style.borderColor = '#ddd'; iconInput.style.boxShadow = 'none'; };
        iconField.appendChild(iconInput);

        // Quick Emoji Picker
        const quickEmojisContainer = document.createElement('div');
        quickEmojisContainer.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;';
        const popularEmojis = ['📘', '🎓', '💻', '🧠', '📊', '📝', '💡', '🔥', '🚀', '🎨'];
        popularEmojis.forEach(emoji => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'ct-emoji-btn';
          btn.textContent = emoji;
          btn.onclick = (e) => {
            e.stopPropagation();
            iconInput.value = emoji;
            btn.style.transform = 'scale(1.2)';
            setTimeout(() => { btn.style.transform = ''; }, 150);
          };
          quickEmojisContainer.appendChild(btn);
        });
        iconField.appendChild(quickEmojisContainer);
        formWrap.appendChild(iconField);

        const urlsField = document.createElement('div');
        urlsField.style.cssText = 'display:flex;flex-direction:column;gap:5px;flex:1;min-height:120px;';
        urlsField.innerHTML = '<label style="font-weight:700;font-size:12px;color:#4b5563;">Đường dẫn Coursera (Mỗi link 1 dòng):</label>';
        const urlsTextarea = document.createElement('textarea');
        urlsTextarea.value = originalUrls;
        urlsTextarea.placeholder = 'https://www.coursera.org/learn/...\nhttps://www.coursera.org/specializations/...';
        urlsTextarea.style.cssText = 'flex:1;padding:8px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:12px;outline:none;font-family:inherit;resize:none;box-sizing:border-box;min-height:100px;line-height:1.5;transition:all 0.2s ease;';
        urlsTextarea.onfocus = () => { urlsTextarea.style.borderColor = '#f97316'; urlsTextarea.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)'; };
        urlsTextarea.onblur = () => { urlsTextarea.style.borderColor = '#ddd'; urlsTextarea.style.boxShadow = 'none'; };
        urlsField.appendChild(urlsTextarea);
        formWrap.appendChild(urlsField);

        dd.appendChild(formWrap);

        const btnPanel = document.createElement('div');
        btnPanel.style.cssText = 'padding:12px 14px;background:#fafafa;border-top:1px solid #eee;display:flex;gap:8px;';

        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = 'Hủy';
        cancelBtn.style.cssText = 'flex:1;padding:10px;background:#e5e7eb;border:none;border-radius:8px;color:#4b5563;font-weight:700;font-size:13px;cursor:pointer;transition:background 0.15s;';
        cancelBtn.onmouseenter = () => { cancelBtn.style.background = '#d1d5db'; };
        cancelBtn.onmouseleave = () => { cancelBtn.style.background = '#e5e7eb'; };
        cancelBtn.onclick = (e) => { e.stopPropagation(); showScreen('manage'); };
        btnPanel.appendChild(cancelBtn);

        const saveBtn = document.createElement('button');
        saveBtn.innerHTML = 'Lưu';
        saveBtn.style.cssText = 'flex:2;padding:10px;background:linear-gradient(135deg,#f97316,#fb923c);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(249,115,22,0.2);transition:all 0.15s;';
        saveBtn.onmouseenter = () => { saveBtn.style.transform = 'translateY(-1px)'; saveBtn.style.boxShadow = '0 4px 12px rgba(249,115,22,0.3)'; };
        saveBtn.onmouseleave = () => { saveBtn.style.transform = 'none'; saveBtn.style.boxShadow = '0 2px 8px rgba(249,115,22,0.2)'; };
        saveBtn.onclick = (e) => {
          e.stopPropagation();
          const nameVal = nameInput.value.trim();
          const iconVal = iconInput.value.trim() || '📘';
          const urlsVal = urlsTextarea.value.trim().split('\n').map(u => u.trim()).filter(Boolean);

          let hasError = false;
          if (!nameVal) {
            nameInput.style.borderColor = '#ef4444';
            nameInput.classList.add('ct-animate-shake');
            setTimeout(() => nameInput.classList.remove('ct-animate-shake'), 400);
            hasError = true;
          } else {
            nameInput.style.borderColor = '#ddd';
          }

          if (urlsVal.length === 0) {
            urlsTextarea.style.borderColor = '#ef4444';
            urlsTextarea.classList.add('ct-animate-shake');
            setTimeout(() => urlsTextarea.classList.remove('ct-animate-shake'), 400);
            hasError = true;
          } else {
            urlsTextarea.style.borderColor = '#ddd';
          }

          if (hasError) return;

          const updatedCourse = {
            name: nameVal,
            icon: iconVal,
          };

          if (urlsVal.length === 1) {
            updatedCourse.url = urlsVal[0];
          } else {
            updatedCourse.urls = urlsVal;
          }

          if (isEditing) {
            COURSES_LIST[editIndex] = updatedCourse;
          } else {
            COURSES_LIST.push(updatedCourse);
          }

          saveCoursesList();
          showScreen('manage');
        };
        btnPanel.appendChild(saveBtn);
        dd.appendChild(btnPanel);

        setTimeout(() => nameInput.focus(), 80);
      }
    }

    showScreenRef = showScreen;
    dd.onclick = (e) => e.stopPropagation();
    panel.appendChild(dd);
    
    showScreen('list');
    isDropdownOpen = true;

    // Lắng nghe sự kiện click ra ngoài để đóng dropdown
    activeOutsideClickListener = (e) => {
      const ddEl = document.getElementById(DROPDOWN_ID);
      const btnEl = document.getElementById(BTN_ID);
      if (ddEl && !ddEl.contains(e.target) && btnEl && !btnEl.contains(e.target)) {
        closeDropdown();
      }
    };
    setTimeout(() => {
      document.addEventListener('click', activeOutsideClickListener);
    }, 50);
  }

  function closeDropdown() {
    const dd = document.getElementById(DROPDOWN_ID);
    if (dd) dd.remove();
    if (activeOutsideClickListener) {
      document.removeEventListener('click', activeOutsideClickListener);
      activeOutsideClickListener = null;
    }
    isDropdownOpen = false;
  }

  // ============ FIND & INJECT BUTTON ============
  // ============ FIND & INJECT BUTTON ============
  function isPanelOpen() {
    const wrapper = document.getElementById('coursera-tool');
    if (!wrapper) return false;

    const buttons = wrapper.querySelectorAll('button');
    const originalButtons = Array.from(buttons).filter(btn => btn.id !== BTN_ID);

    return originalButtons.length > 2;
  }

  function findSkipButton() {
    const wrapper = document.getElementById('coursera-tool');
    if (!wrapper) return null;

    const allBtns = wrapper.querySelectorAll('button');
    for (const btn of allBtns) {
      const text = (btn.textContent || '').trim();
      if (text.includes('Skip videos') || text.includes('Skip discussions')) return btn;
    }
    return null;
  }

  function injectButton() {
    const existingBtn = document.getElementById(BTN_ID);

    if (!isPanelOpen()) {
      if (existingBtn) {
        existingBtn.remove();
        closeDropdown();
      }
      return false;
    }

    if (existingBtn) return true;

    const skipBtn = findSkipButton();
    if (!skipBtn) return false;
    const buttonRow = skipBtn.parentElement;
    if (!buttonRow) return false;

    const monBtn = document.createElement('button');
    monBtn.id = BTN_ID;
    monBtn.className = skipBtn.className;
    monBtn.style.cssText = 'background:linear-gradient(135deg,#f97316 0%,#fb923c 100%)!important;color:#fff!important;border-color:#ea580c!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;white-space:nowrap!important;transition:all 0.2s ease!important;width:calc(50% - 3px)!important;margin-bottom:6px!important;';
    monBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 10 3 12 0v-5"></path></svg>Môn<span style="background:rgba(255,255,255,0.3);padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;">' + COURSES_LIST.length + '</span>';
    monBtn.onmouseenter = () => { monBtn.style.boxShadow = '0 4px 14px rgba(249,115,22,0.35)'; monBtn.style.transform = 'translateY(-1px)'; };
    monBtn.onmouseleave = () => { monBtn.style.boxShadow = ''; monBtn.style.transform = ''; };
    monBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openDropdown(monBtn); };

    // Insert monBtn on its own line above the skip buttons row
    buttonRow.parentElement.insertBefore(monBtn, buttonRow);

    console.log('[CourseraTool] ✅ Button "Môn" đã được thêm thành công!');
    return true;
  }

  // ============ INIT ============
  async function init() {
    injectStyles();
    await loadCoursesList();
    injectButton();
    const observer = new MutationObserver(() => {
      const open = isPanelOpen();
      const existingBtn = document.getElementById(BTN_ID);
      if ((open && !existingBtn) || (!open && existingBtn)) {
        injectButton();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Lắng nghe sự thay đổi của chrome.storage để đồng bộ các tab tức thì
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.coursesList) {
        COURSES_LIST = changes.coursesList.newValue || [];
        updateButtonText();
        
        const dd = document.getElementById(DROPDOWN_ID);
        if (dd && isDropdownOpen && typeof showScreenRef === 'function') {
          showScreenRef(currentScreen, currentEditIndex);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 1000);
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDropdown(); });
})();
