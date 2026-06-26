// ============================================================
// DASHBOARD VIEW
// Thêm: bộ lọc khoảng thời gian, biểu đồ tiến độ, chỉ số hiệu suất
// ============================================================

let dashboardState = { range: "all" };
let dashboardCharts = {}; // giữ reference Chart.js để destroy khi re-render

const DASHBOARD_RANGES = [
  { key: "7d", label: "7 ngày qua" },
  { key: "30d", label: "30 ngày qua" },
  { key: "month", label: "Tháng này" },
  { key: "all", label: "Toàn bộ" },
];

function dashboardRangeDates() {
  const today = todayStr();
  if (dashboardState.range === "7d") return { from: addDaysStr(today, -6), to: today };
  if (dashboardState.range === "30d") return { from: addDaysStr(today, -29), to: today };
  if (dashboardState.range === "month") {
    const [y, m] = today.split("-").map(Number);
    const first = `${y}-${pad2(m)}-01`;
    return { from: first, to: today };
  }
  return { from: "0000-01-01", to: "9999-12-31" }; // all
}

function renderDashboardView(container) {
  const { from, to } = dashboardRangeDates();
  const tasksInRange = store.tasks.filter((t) => t.due_date >= from && t.due_date <= to);

  const total = tasksInRange.length;
  // "Chờ xác nhận" là một TRẠNG THÁI hiện tại (đang chờ ai đó xác nhận xong việc),
  // không phải số liệu phát sinh "trong kỳ" — nên tính trên toàn bộ task, giống cách
  // tính "Hạn hôm nay" / "Đang trễ hạn" bên dưới, để không bị bộ lọc thời gian ẩn đi
  // những task đang thực sự cần xử lý.
  const waitingConfirm = store.tasks.filter((t) => t.status === "waiting_confirm").length;
  const done = tasksInRange.filter((t) => t.status === "done").length;
  const overdue = store.tasks.filter(isOverdue).length; // luôn tính trên toàn bộ, không phụ thuộc khoảng lọc
  const dueToday = store.tasks.filter(isDueToday).length;

  // "Đúng hạn" = hoàn thành (completed_at) vào ngày <= due_date.
  const doneOnTime = tasksInRange.filter((t) => t.status === "done" && t.completed_at && t.completed_at.slice(0, 10) <= t.due_date).length;
  const onTimeRate = done > 0 ? Math.round((doneOnTime / done) * 100) : null;

  const activeMembers = store.members.filter((m) => m.is_active !== false);

  const memberRows = activeMembers
    .map((m) => {
      const mineAll = tasksForMember(m.id);
      const mineInRange = mineAll.filter((t) => t.due_date >= from && t.due_date <= to);
      const mineActive = mineAll.filter((t) => !["done", "cancelled"].includes(t.status));
      const mineOverdue = mineAll.filter(isOverdue);
      const mineDoneInRange = mineInRange.filter((t) => t.status === "done");
      const overdueLogCount = overdueLogCountForMember(m.id);
      // % hoàn thành: trong số task có hạn rơi vào kỳ lọc, bao nhiêu đã xong (bất kể đúng/trễ hạn)
      const completionRate = mineInRange.length ? Math.round((mineDoneInRange.length / mineInRange.length) * 100) : 0;
      // % ĐÚNG hạn: chỉ tính trên các task ĐÃ hoàn thành — bao nhiêu % trong số đó xong không trễ.
      // Đây là chỉ số khác hẳn completionRate (đã xong hay chưa) nên không được gộp chung / dùng thay cho nhau.
      const doneOnTimeCount = mineDoneInRange.filter((t) => t.completed_at && t.completed_at.slice(0, 10) <= t.due_date).length;
      const onTimeRateMember = mineDoneInRange.length ? Math.round((doneOnTimeCount / mineDoneInRange.length) * 100) : null;
      return {
        m,
        total: mineInRange.length,
        active: mineActive.length,
        overdue: mineOverdue.length,
        done: mineDoneInRange.length,
        overdueLogCount,
        completionRate,
        onTimeRateMember,
      };
    })
    .sort((a, b) => b.overdue - a.overdue || b.active - a.active);

  container.innerHTML = `
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-lg font-semibold text-slate-800">Tổng quan</h1>
        <p class="text-sm text-slate-500">Hôm nay, ${formatDateVN(todayStr())}</p>
      </div>
      <div class="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
        ${DASHBOARD_RANGES.map(
          (r) => `
          <button onclick="setDashboardRange('${r.key}')"
            class="px-3 py-1.5 rounded-md text-xs font-medium transition ${dashboardState.range === r.key ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}">
            ${r.label}
          </button>`
        ).join("")}
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-1.5">
      ${statCard("Task trong kỳ", total, "text-slate-700", "bg-slate-100")}
      ${statCard("Hạn hôm nay", dueToday, "text-sky-700", "bg-sky-50")}
      ${statCard("Chờ xác nhận", waitingConfirm, "text-sky-700", "bg-sky-50")}
      ${statCard("Hoàn thành (kỳ)", done, "text-emerald-700", "bg-emerald-50")}
      ${statCard("Đang trễ hạn", overdue, "text-rose-700", "bg-rose-50")}
    </div>
    <p class="text-[11px] text-slate-400 mb-6">* "Task trong kỳ" và "Hoàn thành (kỳ)" đếm theo <span class="font-medium">hạn chót nằm trong khoảng đã chọn</span> ở góc trên. Các ô còn lại ("Hạn hôm nay", "Chờ xác nhận", "Đang trễ hạn") và "Đang xử lý" ở từng thẻ thành viên là số liệu <span class="font-medium">hiện tại</span>, không phụ thuộc khoảng thời gian đang chọn.</p>

    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <h2 class="font-medium text-slate-800">Tiến độ theo thành viên</h2>
        <span class="text-xs text-slate-400">Sắp xếp theo số task đang trễ · cột "trong kỳ" theo bộ lọc thời gian</span>
      </div>
      <div class="p-4">
        ${
          memberRows.length
            ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">${memberRows.map(memberCardHtml).join("")}</div>`
            : `<p class="text-center text-sm text-slate-400 py-8">Chưa có thành viên nào.</p>`
        }
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
      ${insightCard(
        "Tỷ lệ hoàn thành đúng hạn",
        onTimeRate === null ? "—" : `${onTimeRate}%`,
        onTimeRate === null
          ? "Chưa có task hoàn thành trong kỳ"
          : `${doneOnTime}/${done} task hoàn thành đúng hạn${doneOnTime < done ? ` · ${done - doneOnTime} task xong trễ` : ""}`,
        onTimeRate === null ? "text-slate-400" : onTimeRate >= 80 ? "text-emerald-600" : onTimeRate >= 50 ? "text-amber-600" : "text-rose-600"
      )}
      ${insightCard(
        "Tổng số lần từng trễ hạn (lịch sử)",
        store.overdueLogs.length,
        "Tính từ trước tới nay, không theo khoảng lọc",
        store.overdueLogs.length > 5 ? "text-rose-600" : "text-slate-600"
      )}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-medium text-slate-800 text-sm">Tiến độ hoàn thành theo ngày</h2>
          <span class="text-xs text-slate-400">${formatDateVN(from === "0000-01-01" ? firstTaskDate() : from)} – ${formatDateVN(to === "9999-12-31" ? todayStr() : to)}</span>
        </div>
        <div class="h-64"><canvas id="chart-progress"></canvas></div>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 class="font-medium text-slate-800 text-sm mb-3">Tỷ lệ trạng thái</h2>
        <div class="h-64"><canvas id="chart-status"></canvas></div>
      </div>
    </div>
  `;

  renderDashboardCharts(tasksInRange, from, to);
}

function setDashboardRange(key) {
  dashboardState.range = key;
  navigateTo("dashboard");
}

function firstTaskDate() {
  if (!store.tasks.length) return todayStr();
  return store.tasks.reduce((min, t) => (t.due_date < min ? t.due_date : min), store.tasks[0].due_date);
}

function statCard(label, value, textColor, bg) {
  return `
    <div class="rounded-2xl border border-slate-200 ${bg} px-4 py-3.5">
      <p class="text-xs text-slate-500 mb-1">${label}</p>
      <p class="text-2xl font-semibold ${textColor}">${value}</p>
    </div>`;
}

function insightCard(label, value, subtext, valueColor) {
  return `
    <div class="bg-white rounded-2xl border border-slate-200 px-4 py-4">
      <p class="text-xs text-slate-500 mb-1.5">${label}</p>
      <p class="text-xl font-semibold ${valueColor} truncate" title="${escapeHtml(String(value))}">${escapeHtml(String(value))}</p>
      <p class="text-xs text-slate-400 mt-1">${escapeHtml(subtext)}</p>
    </div>`;
}

// ---------- THẺ THÀNH VIÊN (trực quan: avatar + thanh tiến độ + chỉ số) ----------
function memberCardHtml(r) {
  const barColor = r.completionRate >= 80 ? "bg-emerald-500" : r.completionRate >= 50 ? "bg-amber-500" : "bg-slate-300";
  return `
    <div onclick="navigateTo('tasks', {memberId:'${r.m.id}'})"
      class="rounded-xl border ${r.overdue > 0 ? "border-rose-200" : "border-slate-200"} px-4 py-3.5 cursor-pointer hover:shadow-md transition bg-white">
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-full ${avatarColor(r.m.id)} text-white text-xs font-semibold flex items-center justify-center shrink-0">${initials(r.m.name)}</div>
          <span class="font-medium text-slate-700 text-sm truncate">${escapeHtml(r.m.name)}</span>
        </div>
        ${r.overdue > 0 ? `<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 shrink-0">Trễ ${r.overdue}</span>` : `<span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 shrink-0">Ổn</span>`}
      </div>

      <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
        <span>Hoàn thành trong kỳ</span>
        <span class="font-medium ${r.completionRate >= 80 ? "text-emerald-600" : r.completionRate >= 50 ? "text-amber-600" : "text-slate-500"}">${r.total ? r.completionRate + "%" : "—"}</span>
      </div>
      <div class="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
        <div class="h-full ${barColor} rounded-full" style="width:${r.total ? r.completionRate : 0}%"></div>
      </div>

      <div class="grid grid-cols-3 gap-1.5 text-center">
        <div>
          <p class="text-sm font-semibold text-slate-700">${r.active}</p>
          <p class="text-[10px] text-slate-400">Đang xử lý</p>
        </div>
        <div>
          <p class="text-sm font-semibold text-emerald-600">${r.done}</p>
          <p class="text-[10px] text-slate-400">Đã xong (kỳ)</p>
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-400">${r.overdueLogCount}</p>
          <p class="text-[10px] text-slate-400">Từng trễ</p>
        </div>
      </div>
    </div>`;
}

// ---------- BIỂU ĐỒ ----------
function renderDashboardCharts(tasksInRange, from, to) {
  if (typeof Chart === "undefined") return; // Chart.js chưa load được (vd. mất mạng) — bỏ qua, phần còn lại vẫn dùng được

  // Hủy chart cũ trước khi vẽ lại để tránh leak / canvas chồng
  Object.values(dashboardCharts).forEach((c) => c && c.destroy());
  dashboardCharts = {};

  // ---- Biểu đồ 1: cột số task hoàn thành mỗi ngày trong khoảng ----
  const realFrom = from === "0000-01-01" ? firstTaskDate() : from;
  const realTo = to === "9999-12-31" ? todayStr() : to;
  const days = [];
  let cursor = realFrom;
  let safety = 0;
  while (cursor <= realTo && safety < 370) {
    days.push(cursor);
    cursor = addDaysStr(cursor, 1);
    safety++;
  }
  const completedByDay = days.map(
    (d) => store.tasks.filter((t) => t.status === "done" && t.completed_at && t.completed_at.slice(0, 10) === d).length
  );
  // "Task mới tạo" chỉ tính task do người dùng tạo trực tiếp, KHÔNG tính các occurrence
  // được hệ thống tự sinh ra cho task định kỳ (parent_recurring_id) — vì chúng được tạo
  // hàng loạt cùng lúc với hạn nằm ở tương lai, tính vào đây sẽ tạo ra cột tăng vọt giả
  // ("vừa tạo 12 task") trong khi thực tế đó chỉ là việc dọn lịch định kỳ tự động.
  const createdByDay = days.map(
    (d) => store.tasks.filter((t) => t.created_at && t.created_at.slice(0, 10) === d && !t.parent_recurring_id).length
  );

  const progressCtx = document.getElementById("chart-progress");
  if (progressCtx) {
    dashboardCharts.progress = new Chart(progressCtx, {
      type: "bar",
      data: {
        labels: days.map((d) => formatDateShortVN(d)),
        datasets: [
          {
            label: "Hoàn thành",
            data: completedByDay,
            backgroundColor: "#10b981",
            borderRadius: 4,
            maxBarThickness: 22,
          },
          {
            label: "Task mới tạo",
            data: createdByDay,
            backgroundColor: "#6366f1",
            borderRadius: 4,
            maxBarThickness: 22,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, font: { size: 10 } } },
          y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
        },
      },
    });
  }

  // ---- Biểu đồ 2: doughnut tỷ lệ trạng thái ----
  const statusKeys = ["todo", "doing", "waiting_confirm", "done", "cancelled"];
  const statusCounts = statusKeys.map((s) => tasksInRange.filter((t) => t.status === s).length);
  const statusColors = { todo: "#cbd5e1", doing: "#f59e0b", waiting_confirm: "#0ea5e9", done: "#10b981", cancelled: "#94a3b8" };

  const statusCtx = document.getElementById("chart-status");
  if (statusCtx) {
    dashboardCharts.status = new Chart(statusCtx, {
      type: "doughnut",
      data: {
        labels: statusKeys.map((s) => STATUS_LABEL[s]),
        datasets: [
          {
            data: statusCounts,
            backgroundColor: statusKeys.map((s) => statusColors[s]),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
      },
    });
  }
}
