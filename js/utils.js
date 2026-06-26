// ============================================================
// UTILITIES
// ============================================================

function pad2(n) { return String(n).padStart(2, "0"); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dateToStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function strToDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDaysStr(dateStr, days) {
  const d = strToDate(dateStr);
  d.setDate(d.getDate() + days);
  return dateToStr(d);
}

function addMonthsStr(dateStr, months) {
  const d = strToDate(dateStr);
  d.setMonth(d.getMonth() + months);
  return dateToStr(d);
}

function formatDateVN(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateShortVN(dateStr) {
  if (!dateStr) return "—";
  const d = strToDate(dateStr);
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return `${days[d.getDay()]} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

function startOfWeekStr(dateStr) {
  const d = strToDate(dateStr);
  const dow = d.getDay() === 0 ? 7 : d.getDay(); // Mon=1..Sun=7
  d.setDate(d.getDate() - (dow - 1));
  return dateToStr(d);
}

function endOfWeekStr(dateStr) {
  return addDaysStr(startOfWeekStr(dateStr), 6);
}

function isOverdue(task) {
  return task.due_date < todayStr() && !["done", "cancelled"].includes(task.status);
}

// ---------- TRỄ HẠN: số ngày trễ (đang trễ HOẶC đã hoàn thành trễ) ----------
// Số ngày chênh giữa 2 chuỗi ngày "yyyy-mm-dd" (toStr - fromStr), luôn >= 0
// nếu toStr nằm sau fromStr.
function diffDaysStr(fromStr, toStr) {
  return Math.round((strToDate(toStr) - strToDate(fromStr)) / 86400000);
}

// Trả về thông tin trễ hạn của 1 task, hoặc null nếu không trễ:
// - Task chưa xong & đang trễ: { days, finished: false } — số ngày trễ tính tới hôm nay
// - Task đã hoàn thành nhưng hoàn thành SAU hạn: { days, finished: true } — số ngày trễ
//   tính tới ngày hoàn thành. Giữ lại thông tin này dù task đã chuyển sang "Hoàn thành",
//   để biết task từng trễ bao lâu.
function overdueInfo(task) {
  if (!task || !task.due_date) return null;
  if (!["done", "cancelled"].includes(task.status)) {
    if (isOverdue(task)) return { days: diffDaysStr(task.due_date, todayStr()), finished: false };
    return null;
  }
  if (task.status === "done" && task.completed_at) {
    const completedDate = task.completed_at.slice(0, 10);
    if (completedDate > task.due_date) {
      return { days: diffDaysStr(task.due_date, completedDate), finished: true };
    }
  }
  return null;
}

// Dòng chú thích nhỏ (HTML) hiển thị số ngày trễ — dùng chung cho mọi nơi
// hiển thị task (danh sách, kanban, modal chi tiết).
function overdueCaptionHtml(task, extraClass) {
  const info = overdueInfo(task);
  if (!info) return "";
  const dayWord = info.days === 1 ? "1 ngày" : `${info.days} ngày`;
  const text = info.finished ? `Hoàn thành trễ ${dayWord} so với hạn` : `Đang trễ ${dayWord}`;
  const color = info.finished ? "text-rose-500" : "text-rose-600 font-medium";
  return `<p class="text-[11px] ${color} mt-1 ${extraClass || ""}">${text}</p>`;
}

function isDueToday(task) {
  return task.due_date === todayStr() && !["done", "cancelled"].includes(task.status);
}

function isDueTomorrow(task) {
  return task.due_date === addDaysStr(todayStr(), 1) && !["done", "cancelled"].includes(task.status);
}

function isDueThisWeek(task) {
  const t = todayStr();
  return task.due_date >= startOfWeekStr(t) && task.due_date <= endOfWeekStr(t) && !["done", "cancelled"].includes(task.status);
}

function timeAgoVN(isoStr) {
  if (!isoStr) return "";
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return new Date(isoStr).toLocaleDateString("vi-VN");
}

const STATUS_LABEL = { todo: "Chưa làm", doing: "Đang làm", waiting_confirm: "Chờ xác nhận", done: "Hoàn thành", cancelled: "Đã hủy" };
const STATUS_COLOR = {
  todo: "bg-slate-100 text-slate-600",
  doing: "bg-amber-100 text-amber-700",
  waiting_confirm: "bg-sky-100 text-sky-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-400 line-through",
};

const WEEKDAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

// Mô tả ngắn lịch nộp định kỳ, ví dụ: "Thứ 7 hằng tuần" / "Trước ngày 10 hằng tháng"
function recurrenceScheduleLabel(rule, schedule) {
  if (!rule) return "";
  if (rule.type === "weekly" && schedule && schedule.weekday !== undefined && schedule.weekday !== null) {
    return `${WEEKDAY_LABELS[schedule.weekday]} hằng tuần`;
  }
  if (rule.type === "monthly" && schedule && schedule.dayOfMonth) {
    return schedule.beforeDay
      ? `Trước ngày ${schedule.dayOfMonth} hằng tháng`
      : `Ngày ${schedule.dayOfMonth} hằng tháng`;
  }
  if (rule.type === "daily") return "Hằng ngày";
  return "";
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1][0] || "?").toUpperCase();
}

function avatarColor(id) {
  const colors = ["bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-fuchsia-500", "bg-cyan-600"];
  let hash = 0;
  for (let i = 0; i < (id || "").length; i++) hash = (hash + id.charCodeAt(i)) % colors.length;
  return colors[hash];
}

// ---------- TOAST ----------
function toast(message, type = "info") {
  const wrap = document.getElementById("toast-wrap");
  const el = document.createElement("div");
  const colors = { info: "bg-slate-800", success: "bg-emerald-600", error: "bg-rose-600" };
  el.className = `${colors[type] || colors.info} text-white text-sm px-4 py-2.5 rounded-lg shadow-lg mb-2 animate-fade-in`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .3s";
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

// ---------- MODAL ----------
function openModal(innerHtml, opts = {}) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 flex items-center justify-center p-4" id="modal-backdrop">
      <div class="bg-white rounded-2xl shadow-2xl w-full ${opts.width || "max-w-lg"} max-h-[90vh] overflow-y-auto" id="modal-card">
        ${innerHtml}
      </div>
    </div>`;
  root.querySelector("#modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop" && !opts.persistent) closeModal();
  });
}
function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}

function confirmDialog(message, onConfirm) {
  openModal(`
    <div class="p-6">
      <p class="text-slate-700 mb-5">${escapeHtml(message)}</p>
      <div class="flex justify-end gap-2">
        <button class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100" onclick="closeModal()">Hủy</button>
        <button class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-700" id="confirm-btn">Xác nhận</button>
      </div>
    </div>`);
  document.getElementById("confirm-btn").addEventListener("click", () => {
    closeModal();
    onConfirm();
  });
}

function memberOptionsHtml(members, selectedId, opts = {}) {
  return members
    .filter((m) => m.is_active !== false || m.id === selectedId)
    .map((m) => `<option value="${m.id}" ${m.id === selectedId ? "selected" : ""}>${escapeHtml(m.name)}</option>`)
    .join("");
}
