// ============================================================
// DASHBOARD VIEW
// Thêm: bộ lọc khoảng thời gian, biểu đồ tiến độ, chỉ số hiệu suất
// ============================================================

let dashboardState = { range: "30d" };
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
  const doing = tasksInRange.filter((t) => t.status === "doing").length;
  const waitingConfirm = tasksInRange.filter((t) => t.status === "waiting_confirm").length;
  const done = tasksInRange.filter((t) => t.status === "done").length;
  const overdue = store.tasks.filter(isOverdue).length; // luôn tính trên toàn bộ, không phụ thuộc khoảng lọc
  const dueToday = store.tasks.filter(isDueToday).length;

  const doneOnTime = tasksInRange.filter((t) => t.status === "done" && t.completed_at && t.completed_at.slice(0, 10) <= t.due_date).length;
  const onTimeRate = done > 0 ? Math.round((doneOnTime / done) * 100) : null;

  const activeMembers = store.members.filter((m) => m.is_active !== false);

  const memberRows = activeMembers
    .map((m) => {
      const mineAll = tasksForMember(m.id);
      const mineInRange = mineAll.filter((t) => t.due_date >= from && t.due_date <= to);
      const mineActive = mineAll.filter((t) => !["done", "cancelled"].includes(t.status));
      const mineOverdue = mineAll.filter(isOverdue);
      const mineDoneInRange = mineInRange.filter((t) => t.status === "done").length;
      const overdueLogCount = overdueLogCountForMember(m.id);
      const completionRate = mineInRange.length ? Math.round((mineDoneInRange / mineInRange.length) * 100) : 0;
      return {
        m,
        total: mineInRange.length,
        active: mineActive.length,
        overdue: mineOverdue.length,
        done: mineDoneInRange,
        overdueLogCount,
        completionRate,
      };
    })
    .sort((a, b) => b.overdue - a.overdue || b.active - a.active);

  const topPerformer = memberRows.filter((r) => r.total > 0).sort((a, b) => b.completionRate - a.completionRate)[0];

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

    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      ${statCard("Task trong kỳ", total, "text-slate-700", "bg-slate-100")}
      ${statCard("Hạn hôm nay", dueToday, "text-sky-700", "bg-sky-50")}
      ${statCard("Chờ xác nhận", waitingConfirm, "text-sky-700", "bg-sky-50")}
      ${statCard("Hoàn thành (kỳ)", done, "text-emerald-700", "bg-emerald-50")}
      ${statCard("Đang trễ hạn", overdue, "text-rose-700", "bg-rose-50")}
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

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      ${insightCard(
        "Tỷ lệ hoàn thành đúng hạn",
        onTimeRate === null ? "—" : `${onTimeRate}%`,
        onTimeRate === null ? "Chưa có task hoàn thành trong kỳ" : onTimeRate >= 80 ? "Team đang làm rất tốt" : onTimeRate >= 50 ? "Cần cải thiện tốc độ xử lý" : "Cần chú ý — nhiều task trễ hạn",
        onTimeRate === null ? "text-slate-400" : onTimeRate >= 80 ? "text-emerald-600" : onTimeRate >= 50 ? "text-amber-600" : "text-rose-600"
      )}
      ${insightCard(
        "Thành viên xuất sắc nhất kỳ",
        topPerformer ? topPerformer.m.name : "—",
        topPerformer ? `${topPerformer.completionRate}% hoàn thành đúng hạn` : "Chưa đủ dữ liệu",
        "text-indigo-600"
      )}
      ${insightCard(
        "Tổng số lần từng trễ hạn (lịch sử)",
        store.overdueLogs.length,
        "Tính từ trước tới nay, không theo khoảng lọc",
        store.overdueLogs.length > 5 ? "text-rose-600" : "text-slate-600"
      )}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 class="font-medium text-slate-800">Tiến độ theo thành viên</h2>
        <span class="text-xs text-slate-400">Sắp xếp theo số task đang trễ · cột "trong kỳ" theo bộ lọc thời gian</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-slate-400 border-b border-slate-100">
              <th class="text-left font-medium px-5 py-2.5">Thành viên</th>
              <th class="text-right font-medium px-3 py-2.5">Task trong kỳ</th>
              <th class="text-right font-medium px-3 py-2.5">Đang xử lý</th>
              <th class="text-right font-medium px-3 py-2.5">Hoàn thành (kỳ)</th>
              <th class="text-right font-medium px-3 py-2.5">% Hoàn thành</th>
              <th class="text-right font-medium px-3 py-2.5">Đang trễ</th>
              <th class="text-right font-medium px-5 py-2.5">Từng trễ (lịch sử)</th>
            </tr>
          </thead>
          <tbody>
            ${memberRows
              .map(
                (r) => `
              <tr class="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onclick="navigateTo('tasks', {memberId:'${r.m.id}'})">
                <td class="px-5 py-3">
                  <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-full ${avatarColor(r.m.id)} text-white text-xs font-semibold flex items-center justify-center">${initials(r.m.name)}</div>
                    <span class="font-medium text-slate-700">${escapeHtml(r.m.name)}</span>
                  </div>
                </td>
                <td class="text-right px-3 py-3 text-slate-500">${r.total}</td>
                <td class="text-right px-3 py-3 text-slate-500">${r.active}</td>
                <td class="text-right px-3 py-3 text-emerald-600">${r.done}</td>
                <td class="text-right px-3 py-3">
                  <span class="font-medium ${r.completionRate >= 80 ? "text-emerald-600" : r.completionRate >= 50 ? "text-amber-600" : "text-slate-400"}">${r.total ? r.completionRate + "%" : "—"}</span>
                </td>
                <td class="text-right px-3 py-3 font-semibold ${r.overdue > 0 ? "text-rose-600" : "text-slate-300"}">${r.overdue}</td>
                <td class="text-right px-5 py-3 text-slate-400">${r.overdueLogCount}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
        ${!memberRows.length ? `<p class="text-center text-sm text-slate-400 py-8">Chưa có thành viên nào.</p>` : ""}
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
  const createdByDay = days.map((d) => store.tasks.filter((t) => t.created_at && t.created_at.slice(0, 10) === d).length);

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
