// ============================================================
// ASSIGNMENT VIEW - quản lý dự án & phân công task
// ============================================================

let assignmentExpanded = {};

function renderAssignmentView(container) {
  const projects = store.projects;
  container.innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-lg font-semibold text-slate-800">Phân công</h1>
      <button onclick="openCreateProjectModal()" class="px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Tạo dự án</button>
    </div>
    <div class="space-y-3" id="project-list">
      ${projects.length ? projects.map(projectCardHtml).join("") : `<p class="text-sm text-slate-400 py-10 text-center bg-white rounded-xl border border-slate-200">Chưa có dự án nào. Tạo dự án đầu tiên để bắt đầu phân công.</p>`}
    </div>
  `;
}

function projectCardHtml(p) {
  const tasks = store.tasks.filter((t) => t.project_id === p.id && !t.parent_recurring_id);
  const expanded = !!assignmentExpanded[p.id];
  const doneCount = store.tasks.filter((t) => t.project_id === p.id && t.status === "done").length;
  const totalCount = store.tasks.filter((t) => t.project_id === p.id).length;

  return `
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div class="px-5 py-4 flex items-center justify-between cursor-pointer" onclick="toggleProjectExpand('${p.id}')">
        <div>
          <p class="font-medium text-slate-800">${escapeHtml(p.name)}</p>
          ${p.description ? `<p class="text-xs text-slate-500 mt-0.5">${escapeHtml(p.description)}</p>` : ""}
          <p class="text-xs text-slate-400 mt-1">${totalCount} task · ${doneCount} hoàn thành</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="event.stopPropagation(); openCreateTaskModal('${p.id}')" class="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium">+ Task</button>
          <svg class="w-4 h-4 text-slate-400 transition ${expanded ? "rotate-180" : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      ${
        expanded
          ? `<div class="border-t border-slate-100 divide-y divide-slate-50">
              ${tasks.length ? tasks.map((t) => assignmentTaskRowHtml(t)).join("") : `<p class="text-sm text-slate-400 py-5 text-center">Chưa có task nào trong dự án này.</p>`}
            </div>`
          : ""
      }
    </div>`;
}

function toggleProjectExpand(id) {
  assignmentExpanded[id] = !assignmentExpanded[id];
  navigateTo("assignment");
}

function assignmentTaskRowHtml(t) {
  const overdue = isOverdue(t);
  const childCount = t.task_type === "dinh_ky" ? store.tasks.filter((c) => c.parent_recurring_id === t.id).length : 0;
  return `
    <div onclick="openTaskDetailModal('${t.id}')" class="px-5 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition">
      <div class="min-w-0">
        <div class="flex items-center gap-2 mb-0.5 flex-wrap">
          <p class="font-medium text-sm text-slate-700">${escapeHtml(t.title)}</p>
          ${t.task_type === "dinh_ky" ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">Định kỳ · ${recurrenceScheduleLabel(t.recurrence_rule, t.recurrence_schedule) || recurrenceLabel(t.recurrence_rule)}</span>` : ""}
          <span class="text-[11px] px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status]}">${STATUS_LABEL[t.status]}</span>
        </div>
        <p class="text-xs text-slate-500">
          Chính: <span class="font-medium">${escapeHtml(memberName(t.main_assignee_id))}</span>
          ${t.support_assignee_ids?.length ? ` · Hỗ trợ: ${t.support_assignee_ids.map(memberName).map(escapeHtml).join(", ")}` : ""}
          · Hạn: <span class="${overdue ? "text-rose-600 font-medium" : ""}">${formatDateVN(t.due_date)}</span>
          ${childCount ? ` · ${childCount} kỳ sắp tới đã tạo` : ""}
        </p>
      </div>
      <div onclick="event.stopPropagation()" class="flex items-center gap-1.5 shrink-0">
        <button onclick="openEditTaskModal('${t.id}')" class="text-slate-300 hover:text-indigo-600" title="Sửa task">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
        <button onclick="confirmDeleteTask('${t.id}')" class="text-slate-300 hover:text-rose-500" title="Xóa task">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>`;
}

// ---------- SỬA TASK ----------
function openEditTaskModal(taskId) {
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return;
  const activeMembers = store.members.filter((m) => m.is_active !== false || m.id === task.main_assignee_id);
  openModal(
    `
    <div class="p-5">
      <h3 class="font-semibold text-slate-800 mb-4">Sửa task</h3>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Tên task</label>
          <input id="edit-task-title" type="text" value="${escapeHtml(task.title)}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Mô tả</label>
          <textarea id="edit-task-desc" rows="2" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">${escapeHtml(task.description || "")}</textarea>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Người phụ trách chính</label>
            <select id="edit-task-main" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              ${memberOptionsHtml(activeMembers, task.main_assignee_id)}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Người hỗ trợ</label>
            <select id="edit-task-support" multiple class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-[38px] focus:outline-none focus:ring-2 focus:ring-indigo-500">
              ${activeMembers.map((m) => `<option value="${m.id}" ${(task.support_assignee_ids || []).includes(m.id) ? "selected" : ""}>${escapeHtml(m.name)}</option>`).join("")}
            </select>
            <p class="text-[11px] text-slate-400 mt-1">Người hỗ trợ mới thêm vào sẽ nhận được thông báo.</p>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Hạn chót</label>
          <input id="edit-task-due" type="date" value="${task.due_date}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button onclick="closeModal()" class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
        <button onclick="submitEditTask('${taskId}')" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Lưu thay đổi</button>
      </div>
    </div>`,
    { width: "max-w-xl" }
  );
}

async function submitEditTask(taskId) {
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return;
  const title = document.getElementById("edit-task-title").value.trim();
  const description = document.getElementById("edit-task-desc").value.trim();
  const mainAssignee = document.getElementById("edit-task-main").value;
  const newSupport = Array.from(document.getElementById("edit-task-support").selectedOptions).map((o) => o.value);
  const dueDate = document.getElementById("edit-task-due").value;
  if (!title) return toast("Nhập tên task", "error");
  if (!dueDate) return toast("Chọn hạn chót", "error");

  // Xác định người hỗ trợ MỚI được thêm vào (so với danh sách cũ) và người
  // phụ trách chính mới (nếu vừa được đổi sang) — chỉ những người này mới
  // cần nhận thông báo "được giao task", tránh báo lại cho người đã biết rồi.
  const oldSupport = task.support_assignee_ids || [];
  const newlyAddedSupport = newSupport.filter((id) => !oldSupport.includes(id));
  const mainAssigneeChanged = mainAssignee !== task.main_assignee_id;

  try {
    await apiUpdateTask(taskId, {
      title,
      description,
      main_assignee_id: mainAssignee,
      support_assignee_ids: newSupport,
      due_date: dueDate,
    });
    closeModal();
    toast("Đã lưu thay đổi", "success");

    const newlyNotified = [...newlyAddedSupport, ...(mainAssigneeChanged ? [mainAssignee] : [])];
    if (newlyNotified.length) {
      await notifyUsers(
        newlyNotified,
        "task_assigned",
        "Bạn được giao task mới",
        `${escapeHtml(title)} · Hạn: ${formatDateVN(dueDate)}`,
        taskId
      );
    }
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể lưu thay đổi", "error");
  }
}

function recurrenceLabel(rule) {
  if (!rule) return "";
  const map = { daily: "ngày", weekly: "tuần", monthly: "tháng" };
  return `mỗi ${rule.interval > 1 ? rule.interval + " " : ""}${map[rule.type] || rule.type}`;
}

function confirmDeleteTask(taskId) {
  confirmDialog("Xóa task này? Hành động không thể hoàn tác.", async () => {
    try {
      await apiDeleteTask(taskId);
      toast("Đã xóa task", "success");
      await refreshAndRerender();
    } catch (err) {
      toast("Không thể xóa task", "error");
    }
  });
}

// ---------- TẠO DỰ ÁN ----------
function openCreateProjectModal() {
  openModal(`
    <div class="p-5">
      <h3 class="font-semibold text-slate-800 mb-4">Tạo dự án mới</h3>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Tên dự án</label>
          <input id="new-project-name" type="text" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Mô tả (không bắt buộc)</label>
          <textarea id="new-project-desc" rows="2" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button onclick="closeModal()" class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
        <button onclick="submitCreateProject()" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Tạo dự án</button>
      </div>
    </div>`);
}

async function submitCreateProject() {
  const name = document.getElementById("new-project-name").value.trim();
  const description = document.getElementById("new-project-desc").value.trim();
  if (!name) return toast("Nhập tên dự án", "error");
  try {
    const p = await apiCreateProject({ name, description, created_by: store.currentUser.id });
    closeModal();
    toast("Đã tạo dự án", "success");
    assignmentExpanded[p.id] = true;
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể tạo dự án", "error");
  }
}

// ---------- TẠO TASK ----------
function openCreateTaskModal(projectId) {
  const activeMembers = store.members.filter((m) => m.is_active !== false);
  openModal(
    `
    <div class="p-5">
      <h3 class="font-semibold text-slate-800 mb-4">Tạo task mới</h3>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Tên task</label>
          <input id="new-task-title" type="text" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Mô tả</label>
          <textarea id="new-task-desc" rows="2" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Người phụ trách chính</label>
            <select id="new-task-main" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              ${memberOptionsHtml(activeMembers)}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Người hỗ trợ</label>
            <select id="new-task-support" multiple class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-[38px] focus:outline-none focus:ring-2 focus:ring-indigo-500">
              ${activeMembers.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Loại task</label>
          <div class="flex gap-2">
            <label class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm flex items-center gap-2 cursor-pointer">
              <input type="radio" name="task-type" value="phat_sinh" checked onchange="onTaskTypeChange()" /> Phát sinh
            </label>
            <label class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm flex items-center gap-2 cursor-pointer">
              <input type="radio" name="task-type" value="dinh_ky" onchange="onTaskTypeChange()" /> Định kỳ
            </label>
          </div>
        </div>
        <div id="due-date-field">
          <label class="block text-xs font-medium text-slate-500 mb-1">Hạn chót</label>
          <input id="new-task-due" type="date" value="${todayStr()}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div id="recurrence-fields" class="hidden space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">Lặp lại mỗi</label>
              <select id="rec-type" onchange="onRecurrenceTypeChange()" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="daily">Ngày</option>
                <option value="weekly" selected>Tuần</option>
                <option value="monthly">Tháng</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">Số lượng kỳ (mỗi N)</label>
              <input id="rec-interval" type="number" min="1" value="1" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div id="rec-weekly-field">
            <label class="block text-xs font-medium text-slate-500 mb-1">Nộp vào thứ nào trong tuần <span class="text-rose-500">*</span></label>
            <select id="rec-weekday" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              ${WEEKDAY_LABELS.map((label, idx) => `<option value="${idx}" ${idx === 6 ? "selected" : ""}>${label}</option>`).join("")}
            </select>
            <p class="text-[11px] text-slate-400 mt-1">Ví dụ: chọn "Thứ 7" → báo cáo nộp vào thứ 7 hằng tuần.</p>
          </div>
          <div id="rec-monthly-field" class="hidden">
            <label class="block text-xs font-medium text-slate-500 mb-1">Hạn nộp trong tháng <span class="text-rose-500">*</span></label>
            <div class="flex gap-2 items-center">
              <select id="rec-month-mode" class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="on">Vào ngày</option>
                <option value="before">Trước ngày</option>
              </select>
              <input id="rec-day-of-month" type="number" min="1" max="31" value="10" class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <span class="text-sm text-slate-500">hằng tháng</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Ví dụ: "Trước ngày" 10 → phải nộp trước ngày 10 hằng tháng.</p>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button onclick="closeModal()" class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
        <button onclick="submitCreateTask('${projectId}')" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Tạo task</button>
      </div>
    </div>`,
    { width: "max-w-xl" }
  );
}

function onTaskTypeChange() {
  const type = document.querySelector('input[name="task-type"]:checked').value;
  document.getElementById("recurrence-fields").classList.toggle("hidden", type !== "dinh_ky");
  if (type === "dinh_ky") onRecurrenceTypeChange();
}

function onRecurrenceTypeChange() {
  const type = document.getElementById("rec-type").value;
  document.getElementById("rec-weekly-field").classList.toggle("hidden", type !== "weekly");
  document.getElementById("rec-monthly-field").classList.toggle("hidden", type !== "monthly");
}

async function submitCreateTask(projectId) {
  const title = document.getElementById("new-task-title").value.trim();
  const description = document.getElementById("new-task-desc").value.trim();
  const mainAssignee = document.getElementById("new-task-main").value;
  const support = Array.from(document.getElementById("new-task-support").selectedOptions).map((o) => o.value);
  const taskType = document.querySelector('input[name="task-type"]:checked').value;
  const dueDate = document.getElementById("new-task-due").value;
  if (!title) return toast("Nhập tên task", "error");
  if (!dueDate) return toast("Chọn hạn chót", "error");

  let recurrenceRule = null;
  let recurrenceSchedule = null;
  if (taskType === "dinh_ky") {
    const recType = document.getElementById("rec-type").value;
    recurrenceRule = {
      type: recType,
      interval: parseInt(document.getElementById("rec-interval").value, 10) || 1,
    };
    if (recType === "weekly") {
      const weekdayEl = document.getElementById("rec-weekday");
      if (weekdayEl.value === "") return toast("Chọn thứ trong tuần bắt buộc nộp báo cáo", "error");
      recurrenceSchedule = { weekday: parseInt(weekdayEl.value, 10) };
    } else if (recType === "monthly") {
      const dayEl = document.getElementById("rec-day-of-month");
      const dayVal = parseInt(dayEl.value, 10);
      if (!dayVal || dayVal < 1 || dayVal > 31) return toast("Nhập ngày trong tháng bắt buộc nộp báo cáo (1-31)", "error");
      recurrenceSchedule = {
        dayOfMonth: dayVal,
        beforeDay: document.getElementById("rec-month-mode").value === "before",
      };
    }
  }

  try {
    const created = await apiCreateTask({
      project_id: projectId,
      title,
      description,
      task_type: taskType,
      recurrence_rule: recurrenceRule,
      recurrence_schedule: recurrenceSchedule,
      main_assignee_id: mainAssignee,
      support_assignee_ids: support,
      due_date: dueDate,
      status: "todo",
      created_by: store.currentUser.id,
    });
    closeModal();
    toast("Đã tạo task", "success");
    assignmentExpanded[projectId] = true;
    await notifyUsers(
      [mainAssignee, ...support],
      "task_assigned",
      "Bạn được giao task mới",
      `${escapeHtml(title)} · Hạn: ${formatDateVN(dueDate)}`,
      created.id
    );
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể tạo task", "error");
  }
}
