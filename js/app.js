// ============================================================
// APP SHELL - layout chính, điều hướng giữa các view
// ============================================================

const NAV_ITEMS = [
  { key: "dashboard", label: "Tổng quan", icon: "grid" },
  { key: "tasks", label: "Task của thành viên", icon: "list" },
  { key: "assignment", label: "Phân công", icon: "folder" },
  { key: "calendar", label: "Lịch", icon: "calendar" },
  { key: "extensions", label: "Gia hạn chờ duyệt", icon: "clock", adminOnly: true },
  { key: "members", label: "Thành viên", icon: "users", adminOnly: true },
];

const ICONS = {
  grid: '<svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  list: '<svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.2" fill="currentColor"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/><circle cx="4" cy="18" r="1.2" fill="currentColor"/></svg>',
  folder: '<svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>',
  calendar: '<svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  users: '<svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M15.5 14a5.6 5.6 0 0 1 5.8 6"/></svg>',
  bell: '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 1 0-12 0c0 3.5-1 5.5-1.8 6.7A1 1 0 0 0 5 16.4h14a1 1 0 0 0 .8-1.7C19 13.5 18 11.5 18 8Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/></svg>',
  refresh: '<svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 0 1 15.3-6.4M21 12a9 9 0 0 1-15.3 6.4"/><polyline points="18.5 3.5 18.5 8 14 8"/><polyline points="5.5 20.5 5.5 16 10 16"/></svg>',
  kanban: '<svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="9.5" y="4" width="5" height="10" rx="1"/><rect x="16" y="4" width="5" height="13" rx="1"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  edit: '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
};

let currentView = "dashboard";
let notificationDropdownOpen = false;
let notificationPollHandle = null;

const VIEW_TITLES = {
  dashboard: "Tổng quan",
  tasks: "Task của thành viên",
  assignment: "Phân công",
  calendar: "Lịch",
  extensions: "Gia hạn chờ duyệt",
  members: "Thành viên",
};

async function bootApp() {
  await loadAllData();
  renderShell();
  navigateTo("dashboard");
  startNotificationPolling();
}

function isAdmin() {
  return store.currentUser && store.currentUser.role === "admin";
}

function pendingExtensionCount() {
  return store.extensionRequests.filter((r) => r.status === "pending").length;
}

function renderShell() {
  const root = document.getElementById("app-root");
  root.innerHTML = `
    <div class="flex h-screen bg-slate-50 text-slate-800">
      <aside class="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div class="px-5 py-5 flex items-center gap-2 border-b border-slate-100">
          <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">TF</div>
          <span class="font-semibold text-slate-800">TaskFlow</span>
        </div>
        <nav id="nav-list" class="flex-1 px-3 py-4 space-y-1"></nav>
        <div class="px-3 py-4 border-t border-slate-100">
          <div class="flex items-center gap-2.5 px-2">
            <div class="w-8 h-8 rounded-full ${avatarColor(store.currentUser.id)} text-white text-xs font-semibold flex items-center justify-center shrink-0">
              ${initials(store.currentUser.name)}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-700 truncate">${escapeHtml(store.currentUser.name)}</p>
              <p class="text-xs text-slate-400">${store.currentUser.role === "admin" ? "Quản lý" : "Thành viên"}</p>
            </div>
            <button onclick="logout()" title="Đăng xuất" class="text-slate-400 hover:text-rose-500 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>
      <div class="flex-1 flex flex-col min-w-0">
        <header class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <h2 id="header-title" class="text-sm font-semibold text-slate-700">${VIEW_TITLES[currentView] || ""}</h2>
          <div class="flex items-center gap-1.5">
            <button id="refresh-btn" onclick="handleManualRefresh(this)" class="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500" title="Làm mới dữ liệu">
              ${ICONS.refresh}
            </button>
            <div class="relative">
              <button onclick="toggleNotificationDropdown(event)" class="relative w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500" title="Thông báo">
                ${ICONS.bell}
                <span id="notif-badge" class="${unreadNotificationCount() > 0 ? "" : "hidden"} absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white"></span>
              </button>
              <div id="notif-dropdown" class="hidden absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-lg z-50"></div>
            </div>
          </div>
        </header>
        <main class="flex-1 overflow-y-auto">
          <div id="view-root" class="max-w-6xl mx-auto px-6 py-6"></div>
        </main>
      </div>
    </div>
    <div id="toast-wrap" class="fixed bottom-5 right-5 z-50 flex flex-col items-end"></div>
    <div id="modal-root"></div>
  `;
  renderNav();
  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("notif-dropdown");
    const bellBtn = e.target.closest("button[onclick^='toggleNotificationDropdown']");
    if (dropdown && !dropdown.contains(e.target) && !bellBtn) {
      notificationDropdownOpen = false;
      dropdown.classList.add("hidden");
    }
  });
}

function renderNav() {
  const navList = document.getElementById("nav-list");
  navList.innerHTML = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin())
    .map((item) => {
      const active = item.key === currentView;
      const badge =
        item.key === "extensions" && pendingExtensionCount() > 0
          ? `<span class="ml-auto text-[11px] bg-rose-500 text-white rounded-full px-1.5 py-0.5 leading-none">${pendingExtensionCount()}</span>`
          : "";
      return `
        <button data-view="${item.key}" onclick="navigateTo('${item.key}')"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition
            ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}">
          <span class="${active ? "text-indigo-600" : "text-slate-400"}">${ICONS[item.icon]}</span>
          <span>${item.label}</span>
          ${badge}
        </button>`;
    })
    .join("");
}

const VIEW_RENDERERS = {
  dashboard: renderDashboardView,
  tasks: renderTasksView,
  assignment: renderAssignmentView,
  calendar: renderCalendarView,
  extensions: renderExtensionsView,
  members: renderMembersView,
};

function navigateTo(viewKey, params) {
  currentView = viewKey;
  renderNav();
  const titleEl = document.getElementById("header-title");
  if (titleEl) titleEl.textContent = VIEW_TITLES[viewKey] || "";
  const fn = VIEW_RENDERERS[viewKey];
  const container = document.getElementById("view-root");
  if (fn) fn(container, params);
}

async function refreshAndRerender() {
  await loadAllData();
  renderNav();
  navigateTo(currentView);
  refreshNotificationBadge();
}

// Nút làm mới thủ công cạnh chuông thông báo: tải lại toàn bộ dữ liệu từ
// Google Sheet ngay lập tức, không cần đợi vòng poll 30 giây hoặc F5 cả trang.
async function handleManualRefresh(btn) {
  if (btn.dataset.loading === "1") return; // chặn bấm liên tục khi đang tải
  btn.dataset.loading = "1";
  btn.disabled = true;
  btn.classList.add("animate-spin");
  try {
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể làm mới dữ liệu", "error");
  } finally {
    const liveBtn = document.getElementById("refresh-btn");
    if (liveBtn) {
      liveBtn.classList.remove("animate-spin");
      liveBtn.disabled = false;
      liveBtn.dataset.loading = "0";
    }
  }
}

// ============================================================
// CHUÔNG THÔNG BÁO
// ============================================================
const NOTIF_ICON_BY_TYPE = {
  task_assigned: { icon: "📋", color: "bg-indigo-50 text-indigo-600" },
  extension_requested: { icon: "⏳", color: "bg-amber-50 text-amber-600" },
  extension_approved: { icon: "✅", color: "bg-emerald-50 text-emerald-600" },
  extension_rejected: { icon: "❌", color: "bg-rose-50 text-rose-600" },
  confirm_needed: { icon: "🔎", color: "bg-sky-50 text-sky-600" },
  task_confirmed: { icon: "🎉", color: "bg-emerald-50 text-emerald-600" },
  task_status_changed: { icon: "🔄", color: "bg-indigo-50 text-indigo-600" },
};

function refreshNotificationBadge() {
  const badge = document.getElementById("notif-badge");
  if (!badge) return;
  badge.classList.toggle("hidden", unreadNotificationCount() === 0);
  if (notificationDropdownOpen) renderNotificationDropdown();
}

function toggleNotificationDropdown(e) {
  e.stopPropagation();
  notificationDropdownOpen = !notificationDropdownOpen;
  const dropdown = document.getElementById("notif-dropdown");
  dropdown.classList.toggle("hidden", !notificationDropdownOpen);
  if (notificationDropdownOpen) renderNotificationDropdown();
}

function renderNotificationDropdown() {
  const dropdown = document.getElementById("notif-dropdown");
  if (!dropdown) return;
  const items = notificationsForCurrentUser().slice(0, 25);
  dropdown.innerHTML = `
    <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white">
      <span class="text-sm font-semibold text-slate-700">Thông báo</span>
      ${items.some((n) => !n.is_read) ? `<button onclick="markAllNotifsRead()" class="text-xs text-indigo-600 hover:underline font-medium">Đánh dấu đã đọc tất cả</button>` : ""}
    </div>
    <div class="divide-y divide-slate-50">
      ${
        items.length
          ? items.map(notificationItemHtml).join("")
          : `<p class="text-sm text-slate-400 text-center py-8">Chưa có thông báo nào.</p>`
      }
    </div>`;
}

function notificationItemHtml(n) {
  const meta = NOTIF_ICON_BY_TYPE[n.type] || { icon: "🔔", color: "bg-slate-50 text-slate-600" };
  return `
    <button onclick="onNotificationClick('${n.id}', ${n.task_id ? `'${n.task_id}'` : "null"})"
      class="w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition ${!n.is_read ? "bg-indigo-50/40" : ""}">
      <span class="w-8 h-8 rounded-full ${meta.color} flex items-center justify-center text-sm shrink-0">${meta.icon}</span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-slate-700 leading-snug">${escapeHtml(n.title)}</p>
        ${n.message ? `<p class="text-xs text-slate-500 mt-0.5 leading-snug">${escapeHtml(n.message)}</p>` : ""}
        <p class="text-[11px] text-slate-400 mt-1">${timeAgoVN(n.created_at)}</p>
      </div>
      ${!n.is_read ? `<span class="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>` : ""}
    </button>`;
}

async function onNotificationClick(notifId, taskId) {
  const n = store.notifications.find((x) => x.id === notifId);
  if (n && !n.is_read) {
    try {
      await apiUpdateNotification(notifId, { is_read: true });
      n.is_read = true;
      refreshNotificationBadge();
    } catch (err) {
      console.error(err);
    }
  }
  notificationDropdownOpen = false;
  document.getElementById("notif-dropdown").classList.add("hidden");
  if (taskId) {
    const task = store.tasks.find((t) => t.id === taskId);
    if (task) navigateTo("tasks", { memberId: task.main_assignee_id });
  }
}

async function markAllNotifsRead() {
  try {
    await apiMarkAllNotificationsRead(store.currentUser.id);
    store.notifications.forEach((n) => {
      if (n.recipient_id === store.currentUser.id) n.is_read = true;
    });
    renderNotificationDropdown();
    refreshNotificationBadge();
  } catch (err) {
    toast("Không thể đánh dấu đã đọc", "error");
  }
}

function startNotificationPolling() {
  if (notificationPollHandle) clearInterval(notificationPollHandle);
  notificationPollHandle = setInterval(async () => {
    if (!store.currentUser) return;
    try {
      const latest = await apiListNotifications();
      store.notifications = latest;
      refreshNotificationBadge();
    } catch (err) {
      console.error("Lỗi khi kiểm tra thông báo mới:", err);
    }
  }, 30000); // 30 giây / lần
}

// ---------- INIT ----------
window.addEventListener("DOMContentLoaded", async () => {
  renderLoginScreen();
  const restored = await restoreSession();
  if (restored) {
    try {
      await bootApp();
    } catch (err) {
      console.error(err);
      toast("Lỗi kết nối Google Sheet. Kiểm tra APPS_SCRIPT_URL trong js/config.js", "error");
    }
  }
});
