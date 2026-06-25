// ============================================================
// CALENDAR VIEW - lịch tháng, kéo thả task để dời hạn
// ============================================================

let calendarState = { monthDate: todayStr(), memberId: "me" };

function renderCalendarView(container) {
  if (calendarState.memberId === "me") calendarState.memberId = store.currentUser.id;
  const activeMembers = store.members.filter((m) => m.is_active !== false);

  const [y, m] = calendarState.monthDate.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const monthLabel = firstOfMonth.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  const gridStart = new Date(firstOfMonth);
  const startDow = gridStart.getDay() === 0 ? 7 : gridStart.getDay();
  gridStart.setDate(gridStart.getDate() - (startDow - 1));

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  const visibleTasks =
    calendarState.memberId === "all" ? store.tasks.filter((t) => t.status !== "cancelled") : tasksForMember(calendarState.memberId).filter((t) => t.status !== "cancelled");

  const overdueCount = visibleTasks.filter(isOverdue).length;

  container.innerHTML = `
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <h1 class="text-lg font-semibold text-slate-800">Lịch</h1>
      <div class="flex items-center gap-2 flex-wrap">
        <select id="calendar-member-select" class="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="${store.currentUser.id}" ${calendarState.memberId === store.currentUser.id ? "selected" : ""}>Của tôi</option>
          <option value="all" ${calendarState.memberId === "all" ? "selected" : ""}>Tất cả mọi người</option>
          ${activeMembers
            .filter((m) => m.id !== store.currentUser.id)
            .map((m) => `<option value="${m.id}" ${calendarState.memberId === m.id ? "selected" : ""}>${escapeHtml(m.name)}</option>`)
            .join("")}
        </select>
        <button onclick="calendarShiftMonth(-1)" class="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center">‹</button>
        <button onclick="calendarGoToday()" class="text-xs px-2.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">Hôm nay</button>
        <span class="text-sm font-medium text-slate-700 w-32 text-center capitalize">${monthLabel}</span>
        <button onclick="calendarShiftMonth(1)" class="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center">›</button>
      </div>
    </div>

    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div class="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-slate-200"></span>Chưa làm</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-amber-200"></span>Đang làm</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-sky-200"></span>Chờ xác nhận</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-emerald-200"></span>Hoàn thành</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-rose-300"></span>Trễ hạn</span>
      </div>
      ${overdueCount ? `<span class="text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">${overdueCount} task đang trễ hạn</span>` : ""}
    </div>

    <div class="grid grid-cols-7 text-xs font-medium text-slate-400 mb-1.5 px-1">
      ${["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => `<div class="text-center py-1">${d}</div>`).join("")}
    </div>
    <div class="grid grid-cols-7 gap-1.5">
      ${cells.map((d) => calendarCellHtml(d, m, visibleTasks)).join("")}
    </div>
  `;

  document.getElementById("calendar-member-select").addEventListener("change", (e) => {
    calendarState.memberId = e.target.value;
    renderCalendarView(container);
  });
}

function calendarCellHtml(d, currentMonth, visibleTasks) {
  const dateStr = dateToStr(d);
  const inMonth = d.getMonth() + 1 === currentMonth;
  const isToday = dateStr === todayStr();
  const dayTasks = visibleTasks.filter((t) => t.due_date === dateStr);

  return `
    <div class="min-h-[92px] rounded-lg border ${isToday ? "border-indigo-400" : "border-slate-200"} ${inMonth ? "bg-white" : "bg-slate-50/60"} p-1.5 group relative"
      ondragover="event.preventDefault(); this.classList.add('ring-2','ring-indigo-300')"
      ondragleave="this.classList.remove('ring-2','ring-indigo-300')"
      ondrop="onCalendarDrop(event, '${dateStr}')">
      <div class="flex items-center justify-between mb-1">
        <div class="text-[11px] font-medium ${inMonth ? "text-slate-500" : "text-slate-300"} ${isToday ? "text-indigo-600" : ""}">${d.getDate()}</div>
        <button onclick="openQuickCreateTaskForDate('${dateStr}')" title="Tạo task nhanh cho ngày này"
          class="opacity-0 group-hover:opacity-100 transition w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-[11px] leading-none flex items-center justify-center hover:bg-indigo-200">+</button>
      </div>
      <div class="space-y-1">
        ${dayTasks
          .slice(0, 3)
          .map(
            (t) => `
          <div draggable="true" ondragstart="onCalendarDragStart(event, '${t.id}')" onclick="event.stopPropagation(); openTaskDetailModal('${t.id}')"
            class="text-[11px] px-1.5 py-1 rounded cursor-pointer leading-tight ${isOverdue(t) ? "bg-rose-100 text-rose-700" : STATUS_COLOR[t.status]} ${t.status === "done" ? "line-through" : ""} truncate hover:opacity-80"
            title="${escapeHtml(t.title)}">
            ${escapeHtml(t.title)}
          </div>`
          )
          .join("")}
        ${dayTasks.length > 3 ? `<div class="text-[10px] text-slate-400 px-1">+${dayTasks.length - 3} khác</div>` : ""}
      </div>
    </div>`;
}

function calendarGoToday() {
  calendarState.monthDate = todayStr();
  navigateTo("calendar");
}

function openQuickCreateTaskForDate(dateStr) {
  const activeMembers = store.members.filter((m) => m.is_active !== false);
  if (!store.projects.length) return toast("Chưa có dự án nào — vào mục Phân công để tạo dự án trước", "error");
  openModal(`
    <div class="p-5">
      <h3 class="font-semibold text-slate-800 mb-1">Tạo task nhanh</h3>
      <p class="text-xs text-slate-400 mb-4">Hạn: ${formatDateVN(dateStr)}</p>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Dự án</label>
          <select id="qc-project" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            ${store.projects.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Tên task</label>
          <input id="qc-title" type="text" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Người phụ trách</label>
          <select id="qc-assignee" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            ${memberOptionsHtml(activeMembers, store.currentUser.id)}
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button onclick="closeModal()" class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
        <button onclick="submitQuickCreateTask('${dateStr}')" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Tạo task</button>
      </div>
    </div>`);
}

async function submitQuickCreateTask(dateStr) {
  const projectId = document.getElementById("qc-project").value;
  const title = document.getElementById("qc-title").value.trim();
  const mainAssignee = document.getElementById("qc-assignee").value;
  if (!title) return toast("Nhập tên task", "error");
  try {
    const created = await apiCreateTask({
      project_id: projectId,
      title,
      description: "",
      task_type: "phat_sinh",
      recurrence_rule: null,
      main_assignee_id: mainAssignee,
      support_assignee_ids: [],
      due_date: dateStr,
      status: "todo",
      created_by: store.currentUser.id,
    });
    closeModal();
    toast("Đã tạo task", "success");
    await notifyUser(mainAssignee, "task_assigned", "Bạn được giao task mới", `${escapeHtml(title)} · Hạn: ${formatDateVN(dateStr)}`, created.id);
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể tạo task", "error");
  }
}

function calendarShiftMonth(delta) {
  const [y, m] = calendarState.monthDate.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  calendarState.monthDate = dateToStr(d);
  navigateTo("calendar");
}

function onCalendarDragStart(e, taskId) {
  e.dataTransfer.setData("text/task-id", taskId);
}

async function onCalendarDrop(e, dateStr) {
  e.preventDefault();
  e.currentTarget.classList.remove("ring-2", "ring-indigo-300");
  const taskId = e.dataTransfer.getData("text/task-id");
  if (!taskId) return;
  try {
    await apiUpdateTask(taskId, { due_date: dateStr, is_overdue_recorded: false });
    toast("Đã dời hạn task", "success");
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể dời hạn task", "error");
  }
}
