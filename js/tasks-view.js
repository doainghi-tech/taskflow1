// ============================================================
// TASKS VIEW - task chi tiết theo từng thành viên
// Hiển thị ĐỒNG THỜI 2 khối: Danh sách (lọc theo hạn) ở trên,
// Kanban (cột theo trạng thái) ở dưới — không cần nút chuyển qua lại.
// Tô màu task: viền theo TRẠNG THÁI + chấm tròn theo DỰ ÁN.
// ============================================================

let tasksViewState = { memberId: null, filter: "today" };

// Giá trị đặc biệt cho lựa chọn "Tất cả thành viên" trong dropdown chọn xem
const ALL_MEMBERS_VALUE = "__all__";

const TASK_FILTERS = [
  { key: "today", label: "Hạn hôm nay", fn: isDueToday },
  { key: "tomorrow", label: "Hạn ngày mai", fn: isDueTomorrow },
  { key: "week", label: "Tuần này", fn: isDueThisWeek },
  { key: "overdue", label: "Quá hạn", fn: isOverdue },
  { key: "all", label: "Tất cả", fn: () => true },
];

const KANBAN_COLUMNS = [
  { key: "todo", label: "Chưa làm" },
  { key: "doing", label: "Đang làm" },
  { key: "waiting_confirm", label: "Chờ xác nhận" },
  { key: "done", label: "Hoàn thành" },
];

// ---------- MÀU THEO DỰ ÁN (chấm tròn) ----------
// Bảng màu cố định, gán theo project_id (hash) để mỗi dự án có 1 màu ổn định
// xuyên suốt cả Danh sách và Kanban.
const PROJECT_DOT_COLORS = [
  "bg-indigo-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-cyan-600",
  "bg-orange-500",
  "bg-teal-500",
];
function projectDotColor(projectId) {
  if (!projectId) return "bg-slate-300";
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) hash = (hash + projectId.charCodeAt(i)) % PROJECT_DOT_COLORS.length;
  return PROJECT_DOT_COLORS[hash];
}

// ---------- VIỀN THEO TRẠNG THÁI ----------
const STATUS_BORDER_COLOR = {
  todo: "border-slate-200",
  doing: "border-amber-300",
  waiting_confirm: "border-sky-300",
  done: "border-emerald-300",
  cancelled: "border-slate-200",
};
// Trễ hạn luôn được nhấn mạnh bằng viền đỏ, bất kể trạng thái
function taskBorderClass(t) {
  if (isOverdue(t)) return "border-rose-300";
  return STATUS_BORDER_COLOR[t.status] || "border-slate-200";
}

function renderTasksView(container, params) {
  const activeMembers = store.members.filter((m) => m.is_active !== false);
  if (params && params.memberId) tasksViewState.memberId = params.memberId;
  if (!tasksViewState.memberId) {
    tasksViewState.memberId = isAdmin() ? activeMembers[0]?.id : store.currentUser.id;
  }
  const memberId = tasksViewState.memberId;

  const allMemberTasks = getTasksForSelection(memberId, activeMembers).filter((t) => t.status !== "cancelled");

  container.innerHTML = `
    <div class="flex items-center justify-between mb-5 flex-wrap gap-3">
      <h1 class="text-lg font-semibold text-slate-800">Task của thành viên</h1>
      <div class="flex items-center gap-2">
        <select id="member-select" class="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="${ALL_MEMBERS_VALUE}" ${memberId === ALL_MEMBERS_VALUE ? "selected" : ""}>Tất cả thành viên</option>
          ${activeMembers.map((m) => `<option value="${m.id}" ${m.id === memberId ? "selected" : ""}>${escapeHtml(m.name)}</option>`).join("")}
        </select>
      </div>
    </div>

    ${projectLegendHtml(allMemberTasks)}

    <div class="space-y-8">
      <section>
        <h2 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">${ICONS.list} Danh sách</h2>
        ${renderListLayout(allMemberTasks)}
      </section>
      <section>
        <h2 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">${ICONS.kanban} Kanban</h2>
        ${renderKanbanLayout(allMemberTasks)}
      </section>
    </div>
  `;

  document.getElementById("member-select").addEventListener("change", (e) => {
    tasksViewState.memberId = e.target.value;
    renderTasksView(container);
  });
}

// Lấy danh sách task theo lựa chọn trong dropdown:
// - 1 thành viên cụ thể: dùng tasksForMember như cũ
// - "Tất cả thành viên": gộp task của mọi thành viên đang active, loại trùng theo id
//   (1 task có thể vừa là "Chính" của người này, vừa "Hỗ trợ" cho người khác)
function getTasksForSelection(memberId, activeMembers) {
  if (memberId !== ALL_MEMBERS_VALUE) return tasksForMember(memberId);
  const seen = new Set();
  const result = [];
  activeMembers.forEach((m) => {
    tasksForMember(m.id).forEach((t) => {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        result.push(t);
      }
    });
  });
  return result;
}
function projectLegendHtml(tasks) {
  const projectIds = [...new Set(tasks.map((t) => t.project_id).filter(Boolean))];
  if (!projectIds.length) return "";
  return `
    <div class="flex items-center gap-3 flex-wrap mb-5 text-xs text-slate-500">
      <span class="font-medium text-slate-400">Dự án:</span>
      ${projectIds
        .map((pid) => {
          const p = getProject(pid);
          return `<span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full ${projectDotColor(pid)}"></span>${escapeHtml(p ? p.name : "—")}</span>`;
        })
        .join("")}
    </div>`;
}

function setTaskFilter(key) {
  tasksViewState.filter = key;
  navigateTo("tasks");
}

function emptyState(msg) {
  return `<div class="text-center py-16 text-slate-400 text-sm">${msg || "Không có task nào trong mục này."}</div>`;
}

// ============================================================
// LAYOUT: DANH SÁCH (lọc theo hạn)
// ============================================================
function renderListLayout(allMemberTasks) {
  const filterFn = TASK_FILTERS.find((f) => f.key === tasksViewState.filter).fn;
  const filtered = allMemberTasks.filter(filterFn).sort((a, b) => a.due_date.localeCompare(b.due_date));

  return `
    <div class="flex gap-1.5 mb-5 flex-wrap">
      ${TASK_FILTERS.map((f) => {
        const count = allMemberTasks.filter(f.fn).length;
        const active = f.key === tasksViewState.filter;
        return `<button onclick="setTaskFilter('${f.key}')"
          class="px-3.5 py-1.5 rounded-full text-sm font-medium transition
            ${active ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}">
          ${f.label} ${count ? `<span class="opacity-70">(${count})</span>` : ""}
        </button>`;
      }).join("")}
    </div>
    <div class="space-y-2.5" id="task-list">
      ${filtered.length ? filtered.map((t) => taskRowHtml(t)).join("") : emptyState()}
    </div>`;
}

function taskRowHtml(t) {
  const project = getProject(t.project_id);
  const overdue = isOverdue(t);
  const isDone = t.status === "done";
  const noteCount = store.notes.filter((n) => n.task_id === t.id).length;
  const pendingExt = store.extensionRequests.find((r) => r.task_id === t.id && r.status === "pending");
  const recurringTag = t.task_type === "dinh_ky" ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">Định kỳ</span>` : "";

  return `
    <div onclick="openTaskDetailModal('${t.id}')" class="bg-white rounded-xl border-2 ${taskBorderClass(t)} ${isDone ? "bg-emerald-50/40" : ""} px-4 py-3.5 cursor-pointer hover:shadow-md transition">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="flex items-center gap-1.5 text-xs font-medium text-indigo-500">
              <span class="w-2 h-2 rounded-full ${projectDotColor(t.project_id)} shrink-0"></span>
              ${escapeHtml(project ? project.name : "Không có dự án")}
            </span>
            ${recurringTag}
            ${overdue ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 font-medium">Trễ hạn</span>` : ""}
            ${t.status === "waiting_confirm" ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">Chờ xác nhận</span>` : ""}
          </div>
          <p class="font-medium ${isDone ? "text-emerald-700 line-through" : "text-slate-800"}">${escapeHtml(t.title)}</p>
          ${t.description ? `<p class="text-sm text-slate-500 mt-0.5">${escapeHtml(t.description)}</p>` : ""}
          <div class="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
            <span class="${overdue ? "text-rose-600 font-medium" : ""}">Hạn: ${formatDateVN(t.due_date)}</span>
            <span>Chính: ${escapeHtml(memberName(t.main_assignee_id))}</span>
            ${t.support_assignee_ids?.length ? `<span>Hỗ trợ: ${t.support_assignee_ids.map(memberName).map(escapeHtml).join(", ")}</span>` : ""}
            ${pendingExt ? `<span class="text-amber-600 font-medium">Đã gửi yêu cầu gia hạn → ${formatDateVN(pendingExt.new_due_date)} (chờ duyệt)</span>` : ""}
          </div>
          ${overdueCaptionHtml(t)}
        </div>
        <div onclick="event.stopPropagation()" class="flex flex-col items-end gap-2 shrink-0">
          <select onchange="quickChangeStatus('${t.id}', this.value)" class="text-xs font-medium border rounded-full px-2.5 py-1 ${STATUS_COLOR[t.status]} border-transparent">
            ${Object.keys(STATUS_LABEL)
              .filter((s) => isAdmin() || s !== "done")
              .map((s) => `<option value="${s}" ${s === t.status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`)
              .join("")}
          </select>
          <div class="flex gap-1.5 flex-wrap justify-end">
            <button onclick="openNotesModal('${t.id}')" class="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1">
              Ghi chú${noteCount ? ` (${noteCount})` : ""}
            </button>
            ${
              !["done", "cancelled"].includes(t.status) && !pendingExt
                ? `<button onclick="openExtensionModal('${t.id}')" class="text-xs px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50">Gia hạn</button>`
                : ""
            }
            ${
              isAdmin() && t.status === "waiting_confirm"
                ? `<button onclick="confirmTaskDone('${t.id}')" class="text-xs px-2.5 py-1 rounded-lg bg-sky-600 text-white hover:bg-sky-700">Xác nhận xong</button>`
                : ""
            }
          </div>
        </div>
      </div>
    </div>`;
}

// ============================================================
// LAYOUT: KANBAN (4 cột theo trạng thái, dàn trải, kéo-thả)
// ============================================================
function renderKanbanLayout(allMemberTasks) {
  const sorted = allMemberTasks.slice().sort((a, b) => a.due_date.localeCompare(b.due_date));
  return `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-start">
      ${KANBAN_COLUMNS.map((col) => kanbanColumnHtml(col, sorted.filter((t) => t.status === col.key))).join("")}
    </div>`;
}

function kanbanColumnHtml(col, tasks) {
  const dotColor = {
    todo: "bg-slate-400",
    doing: "bg-amber-500",
    waiting_confirm: "bg-sky-500",
    done: "bg-emerald-500",
  }[col.key];
  return `
    <div class="bg-slate-100/70 rounded-2xl p-3 min-h-[200px]"
      ondragover="event.preventDefault()"
      ondrop="onKanbanDrop(event, '${col.key}')">
      <div class="flex items-center gap-2 px-1 mb-3">
        <span class="w-2 h-2 rounded-full ${dotColor}"></span>
        <span class="text-sm font-semibold text-slate-700">${col.label}</span>
        <span class="text-xs text-slate-400">(${tasks.length})</span>
      </div>
      <div class="space-y-2.5">
        ${tasks.length ? tasks.map((t) => kanbanCardHtml(t)).join("") : `<p class="text-xs text-slate-400 text-center py-6">Trống</p>`}
      </div>
    </div>`;
}

function kanbanCardHtml(t) {
  const project = getProject(t.project_id);
  const overdue = isOverdue(t);
  const isDone = t.status === "done";
  const noteCount = store.notes.filter((n) => n.task_id === t.id).length;
  const pendingExt = store.extensionRequests.find((r) => r.task_id === t.id && r.status === "pending");

  return `
    <div draggable="true" ondragstart="onKanbanDragStart(event, '${t.id}')" onclick="openTaskDetailModal('${t.id}')"
      class="bg-white rounded-xl border-2 ${taskBorderClass(t)} px-3.5 py-3 cursor-pointer shadow-sm hover:shadow-md transition">
      <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span class="flex items-center gap-1 text-[11px] font-medium text-indigo-500">
          <span class="w-1.5 h-1.5 rounded-full ${projectDotColor(t.project_id)} shrink-0"></span>
          ${escapeHtml(project ? project.name : "—")}
        </span>
        ${t.task_type === "dinh_ky" ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">Định kỳ</span>` : ""}
        ${overdue ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 font-medium">Trễ hạn</span>` : ""}
      </div>
      <p class="text-sm font-medium ${isDone ? "text-emerald-700 line-through" : "text-slate-800"} leading-snug">${escapeHtml(t.title)}</p>
      ${overdueCaptionHtml(t)}
      <div class="flex items-center justify-between mt-2.5">
        <span class="text-[11px] ${overdue ? "text-rose-600 font-medium" : "text-slate-400"}">${formatDateVN(t.due_date)}</span>
        <div class="flex items-center gap-1.5">
          ${noteCount ? `<span class="text-[11px] text-slate-400 flex items-center gap-0.5">📝${noteCount}</span>` : ""}
          ${pendingExt ? `<span class="text-[11px]" title="Đang chờ duyệt gia hạn">⏳</span>` : ""}
          <div class="w-5 h-5 rounded-full ${avatarColor(t.main_assignee_id)} text-white text-[10px] font-semibold flex items-center justify-center" title="${escapeHtml(memberName(t.main_assignee_id))}">
            ${initials(memberName(t.main_assignee_id))}
          </div>
        </div>
      </div>
      <div class="flex gap-1.5 mt-2.5" onclick="event.stopPropagation()">
        <button onclick="openNotesModal('${t.id}')" class="flex-1 text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">Ghi chú</button>
        ${
          isAdmin() && t.status === "waiting_confirm"
            ? `<button onclick="confirmTaskDone('${t.id}')" class="flex-1 text-[11px] px-2 py-1 rounded-md bg-sky-600 text-white hover:bg-sky-700">Xác nhận</button>`
            : !["done", "cancelled"].includes(t.status) && !pendingExt
            ? `<button onclick="openExtensionModal('${t.id}')" class="flex-1 text-[11px] px-2 py-1 rounded-md border border-amber-200 text-amber-700 hover:bg-amber-50">Gia hạn</button>`
            : ""
        }
      </div>
    </div>`;
}

function onKanbanDragStart(e, taskId) {
  e.dataTransfer.setData("text/task-id", taskId);
}

async function onKanbanDrop(e, newStatus) {
  e.preventDefault();
  const taskId = e.dataTransfer.getData("text/task-id");
  if (!taskId) return;
  if (newStatus === "done" && !isAdmin()) {
    return toast("Chỉ quản lý mới xác nhận hoàn thành. Hãy chuyển task sang \"Chờ xác nhận\".", "error");
  }
  await quickChangeStatus(taskId, newStatus);
}

// ============================================================
// THAY ĐỔI TRẠNG THÁI
// ============================================================
async function quickChangeStatus(taskId, status) {
  const task = store.tasks.find((t) => t.id === taskId);
  if (status === "done" && !isAdmin()) {
    toast("Chỉ quản lý mới xác nhận hoàn thành. Hãy chuyển sang \"Chờ xác nhận\".", "error");
    return navigateTo(currentView);
  }
  const oldStatus = task ? task.status : null;
  try {
    const payload = { status };
    if (status === "done") payload.completed_at = new Date().toISOString();
    await apiUpdateTask(taskId, payload);
    toast("Đã cập nhật trạng thái", "success");
    if (status === "waiting_confirm" && task) {
      // Báo cho admin biết có task cần xác nhận hoàn thành
      await notifyUsers(
        adminIds(),
        "confirm_needed",
        "Task cần xác nhận hoàn thành",
        `${escapeHtml(memberName(task.main_assignee_id))} báo đã xong: ${escapeHtml(task.title)}`,
        taskId
      );
    } else if (task && status !== oldStatus) {
      // Các thay đổi trạng thái khác (vd. Chưa làm ↔ Đang làm, dời lại từ
      // Chờ xác nhận...): báo cho quản lý + người phụ trách chính + người hỗ
      // trợ, trừ chính người vừa thực hiện thay đổi này.
      await notifyTaskStatusChange(task, oldStatus, status);
    }
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể cập nhật trạng thái", "error");
  }
}

// Gửi thông báo chuông cho admin + người phụ trách chính + người hỗ trợ khi
// trạng thái task thay đổi, loại trừ người vừa bấm thực hiện thay đổi đó.
async function notifyTaskStatusChange(task, oldStatus, newStatus) {
  const recipients = new Set([...adminIds(), task.main_assignee_id, ...(task.support_assignee_ids || [])]);
  recipients.delete(store.currentUser.id);
  if (!recipients.size) return;
  await notifyUsers(
    [...recipients],
    "task_status_changed",
    "Task đổi trạng thái",
    `${escapeHtml(task.title)} · ${STATUS_LABEL[oldStatus] || oldStatus} → ${STATUS_LABEL[newStatus] || newStatus} (${escapeHtml(memberName(store.currentUser.id))})`,
    task.id
  );
}

async function confirmTaskDone(taskId) {
  const task = store.tasks.find((t) => t.id === taskId);
  try {
    await apiUpdateTask(taskId, {
      status: "done",
      completed_at: new Date().toISOString(),
      confirmed_by: store.currentUser.id,
      confirmed_at: new Date().toISOString(),
    });
    toast("Đã xác nhận hoàn thành", "success");
    if (task) {
      await notifyUsers(
        [task.main_assignee_id, ...(task.support_assignee_ids || [])],
        "task_confirmed",
        "Task đã được xác nhận hoàn thành",
        escapeHtml(task.title),
        taskId
      );
    }
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể xác nhận", "error");
  }
}

// ============================================================
// CHI TIẾT TASK — modal dùng chung, mở được từ MỌI nơi hiển thị task
// (Danh sách, Kanban, Phân công, Lịch). Chỉ xem + có nút "Sửa" riêng
// để chuyển qua modal sửa (openEditTaskModal, ở assignment-view.js).
// ============================================================
function openTaskDetailModal(taskId) {
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return toast("Không tìm thấy task (có thể đã bị xóa)", "error");

  const project = getProject(task.project_id);
  const overdue = isOverdue(task);
  const noteCount = store.notes.filter((n) => n.task_id === task.id).length;
  const pendingExt = store.extensionRequests.find((r) => r.task_id === task.id && r.status === "pending");
  const canEditStatus = task.status !== "done" || isAdmin();

  openModal(`
    <div class="p-5">
      <div class="flex items-start justify-between gap-3 mb-1">
        <h3 class="font-semibold text-slate-800 leading-snug">${escapeHtml(task.title)}</h3>
        <span class="text-[11px] px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[task.status]}">${STATUS_LABEL[task.status]}</span>
      </div>
      <p class="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full ${projectDotColor(task.project_id)}"></span>
        ${escapeHtml(project ? project.name : "Không có dự án")}
        ${task.task_type === "dinh_ky" ? " · Định kỳ" : ""}
      </p>

      ${task.description ? `<p class="text-sm text-slate-600 mb-4 whitespace-pre-wrap">${escapeHtml(task.description)}</p>` : ""}

      <div class="space-y-2 text-sm bg-slate-50 rounded-xl p-3.5">
        <div class="flex justify-between gap-3"><span class="text-slate-400">Hạn chót</span><span class="font-medium ${overdue ? "text-rose-600" : "text-slate-700"}">${formatDateVN(task.due_date)}${overdue ? " · Trễ hạn" : ""}</span></div>
        ${task.status === "done" && overdueInfo(task) ? `<div class="flex justify-between gap-3"><span class="text-slate-400">Ngày hoàn thành</span><span class="font-medium text-slate-700">${task.completed_at ? formatDateVN(task.completed_at.slice(0, 10)) : "—"}</span></div>` : ""}
        <div class="flex justify-between gap-3"><span class="text-slate-400">Phụ trách chính</span><span class="font-medium text-slate-700">${escapeHtml(memberName(task.main_assignee_id))}</span></div>
        ${task.support_assignee_ids?.length ? `<div class="flex justify-between gap-3"><span class="text-slate-400">Hỗ trợ</span><span class="font-medium text-slate-700 text-right">${task.support_assignee_ids.map(memberName).map(escapeHtml).join(", ")}</span></div>` : ""}
        ${pendingExt ? `<div class="flex justify-between gap-3"><span class="text-slate-400">Gia hạn</span><span class="font-medium text-amber-600 text-right">Chờ duyệt → ${formatDateVN(pendingExt.new_due_date)}</span></div>` : ""}
      </div>
      ${overdueCaptionHtml(task, "px-1")}

      ${
        canEditStatus
          ? `<div class="mt-4">
              <label class="block text-xs font-medium text-slate-500 mb-1">Đổi trạng thái</label>
              <select onchange="quickChangeStatus('${task.id}', this.value); closeModal();" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                ${Object.keys(STATUS_LABEL)
                  .filter((s) => isAdmin() || s !== "done")
                  .map((s) => `<option value="${s}" ${s === task.status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`)
                  .join("")}
              </select>
            </div>`
          : ""
      }

      <div class="flex flex-wrap justify-end gap-2 mt-5">
        <button onclick="closeModal()" class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Đóng</button>
        <button onclick="closeModal(); openNotesModal('${task.id}')" class="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">
          Ghi chú${noteCount ? ` (${noteCount})` : ""}
        </button>
        ${
          !["done", "cancelled"].includes(task.status) && !pendingExt
            ? `<button onclick="closeModal(); openExtensionModal('${task.id}')" class="px-4 py-2 rounded-lg text-sm font-medium border border-amber-200 text-amber-700 hover:bg-amber-50">Gia hạn</button>`
            : ""
        }
        <button onclick="closeModal(); openEditTaskModal('${task.id}')" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Sửa task</button>
      </div>
    </div>`);
}

// ============================================================
// GHI CHÚ — thêm / sửa / xóa / tick đã xử lý
// (chỉ người viết ghi chú mới được sửa/xóa của mình)
// ============================================================
function openNotesModal(taskId) {
  const task = store.tasks.find((t) => t.id === taskId);
  renderNotesModalContent(taskId, task);
  setTimeout(() => {
    const input = document.getElementById("note-input");
    if (input) {
      input.focus();
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitNote(taskId);
      });
    }
  }, 0);
}

function renderNotesModalContent(taskId, task) {
  const notes = store.notes.filter((n) => n.task_id === taskId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  openModal(`
    <div class="p-5">
      <h3 class="font-semibold text-slate-800 mb-1">${escapeHtml(task.title)}</h3>
      <p class="text-xs text-slate-400 mb-4">Ghi chú công việc</p>
      <div class="space-y-2.5 max-h-72 overflow-y-auto mb-4 pr-1" id="notes-list">
        ${notes.length ? notes.map((n) => noteItemHtml(n, taskId)).join("") : `<p class="text-sm text-slate-400 text-center py-4">Chưa có ghi chú nào.</p>`}
      </div>
      <div class="flex gap-2">
        <input id="note-input" type="text" placeholder="Thêm ghi chú..." class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onclick="submitNote('${taskId}')" class="px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Gửi</button>
      </div>
    </div>`);
}

function noteItemHtml(n, taskId) {
  const isMine = store.currentUser && n.member_id === store.currentUser.id;
  const isEditing = notesEditingId === n.id;
  if (isEditing) {
    return `
      <div class="bg-slate-50 rounded-lg px-3 py-2.5">
        <textarea id="note-edit-input" rows="2" class="w-full border border-indigo-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">${escapeHtml(n.content)}</textarea>
        <div class="flex justify-end gap-1.5 mt-1.5">
          <button onclick="cancelEditNote('${taskId}')" class="text-[11px] px-2.5 py-1 rounded-md text-slate-500 hover:bg-slate-100">Hủy</button>
          <button onclick="submitEditNote('${n.id}', '${taskId}')" class="text-[11px] px-2.5 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Lưu</button>
        </div>
      </div>`;
  }
  return `
    <div class="bg-slate-50 rounded-lg px-3 py-2.5 ${n.is_done ? "opacity-60" : ""}">
      <div class="flex items-start gap-2">
        <button onclick="toggleNoteDone('${n.id}', ${!n.is_done}, '${taskId}')"
          title="${n.is_done ? "Đánh dấu chưa xử lý" : "Đánh dấu đã xử lý"}"
          class="mt-0.5 w-4.5 h-4.5 rounded-full border shrink-0 flex items-center justify-center transition
            ${n.is_done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-400"}">
          ${ICONS.check}
        </button>
        <div class="min-w-0 flex-1">
          <p class="text-sm text-slate-700 ${n.is_done ? "line-through" : ""}">${escapeHtml(n.content)}</p>
          <p class="text-[11px] text-slate-400 mt-1">${escapeHtml(memberName(n.member_id))} · ${new Date(n.created_at).toLocaleString("vi-VN")}${n.updated_at && n.updated_at !== n.created_at ? " · đã sửa" : ""}</p>
        </div>
        ${
          isMine
            ? `<div class="flex gap-1 shrink-0">
                <button onclick="startEditNote('${n.id}', '${taskId}')" title="Sửa" class="text-slate-400 hover:text-indigo-600 p-0.5">${ICONS.edit}</button>
                <button onclick="confirmDeleteNote('${n.id}', '${taskId}')" title="Xóa" class="text-slate-400 hover:text-rose-500 p-0.5">${ICONS.trash}</button>
              </div>`
            : ""
        }
      </div>
    </div>`;
}

let notesEditingId = null;

function startEditNote(noteId, taskId) {
  notesEditingId = noteId;
  const task = store.tasks.find((t) => t.id === taskId);
  renderNotesModalContent(taskId, task);
}

function cancelEditNote(taskId) {
  notesEditingId = null;
  const task = store.tasks.find((t) => t.id === taskId);
  renderNotesModalContent(taskId, task);
}

async function submitEditNote(noteId, taskId) {
  const content = document.getElementById("note-edit-input").value.trim();
  if (!content) return toast("Nội dung ghi chú không được trống", "error");
  try {
    await apiUpdateNote(noteId, { content });
    const note = store.notes.find((n) => n.id === noteId);
    if (note) note.content = content;
    notesEditingId = null;
    toast("Đã cập nhật ghi chú", "success");
    const task = store.tasks.find((t) => t.id === taskId);
    renderNotesModalContent(taskId, task);
  } catch (err) {
    toast("Không thể cập nhật ghi chú", "error");
  }
}

function confirmDeleteNote(noteId, taskId) {
  confirmDialog("Xóa ghi chú này?", async () => {
    try {
      await apiDeleteNote(noteId);
      store.notes = store.notes.filter((n) => n.id !== noteId);
      toast("Đã xóa ghi chú", "success");
      const task = store.tasks.find((t) => t.id === taskId);
      renderNotesModalContent(taskId, task);
    } catch (err) {
      toast("Không thể xóa ghi chú", "error");
    }
  });
}

async function toggleNoteDone(noteId, newVal, taskId) {
  try {
    await apiUpdateNote(noteId, { is_done: newVal });
    const note = store.notes.find((n) => n.id === noteId);
    if (note) note.is_done = newVal;
    const task = store.tasks.find((t) => t.id === taskId);
    renderNotesModalContent(taskId, task);
    navigateTo(currentView);
  } catch (err) {
    toast("Không thể cập nhật", "error");
  }
}

async function submitNote(taskId) {
  const input = document.getElementById("note-input");
  const content = input.value.trim();
  if (!content) return;
  try {
    const created = await apiCreateNote({ task_id: taskId, member_id: store.currentUser.id, content, is_done: false });
    store.notes.unshift(created);
    toast("Đã thêm ghi chú", "success");
    const task = store.tasks.find((t) => t.id === taskId);
    renderNotesModalContent(taskId, task);
    navigateTo(currentView);
    setTimeout(() => {
      const newInput = document.getElementById("note-input");
      if (newInput) newInput.focus();
    }, 0);
  } catch (err) {
    toast("Không thể thêm ghi chú", "error");
  }
}

// ============================================================
// GIA HẠN
// ============================================================
function openExtensionModal(taskId) {
  const task = store.tasks.find((t) => t.id === taskId);
  openModal(`
    <div class="p-5">
      <h3 class="font-semibold text-slate-800 mb-1">Yêu cầu gia hạn</h3>
      <p class="text-xs text-slate-400 mb-4">${escapeHtml(task.title)} · Hạn hiện tại: ${formatDateVN(task.due_date)}</p>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Hạn mới đề xuất</label>
          <input id="ext-new-date" type="date" min="${task.due_date}" value="${addDaysStr(task.due_date, 1)}" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Lý do</label>
          <textarea id="ext-reason" rows="3" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Vì sao cần gia hạn?"></textarea>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button onclick="closeModal()" class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
        <button onclick="submitExtensionRequest('${taskId}')" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700">Gửi yêu cầu</button>
      </div>
    </div>`);
}

async function submitExtensionRequest(taskId) {
  const task = store.tasks.find((t) => t.id === taskId);
  const newDate = document.getElementById("ext-new-date").value;
  const reason = document.getElementById("ext-reason").value.trim();
  if (!newDate) return toast("Chọn hạn mới", "error");
  try {
    await apiCreateExtensionRequest({
      task_id: taskId,
      requested_by: store.currentUser.id,
      old_due_date: task.due_date,
      new_due_date: newDate,
      reason,
      status: "pending",
    });
    closeModal();
    toast("Đã gửi yêu cầu gia hạn đến quản lý", "success");
    await notifyUsers(
      adminIds(),
      "extension_requested",
      "Yêu cầu gia hạn mới",
      `${escapeHtml(memberName(store.currentUser.id))} đề xuất gia hạn: ${escapeHtml(task.title)} → ${formatDateVN(newDate)}`,
      taskId
    );
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể gửi yêu cầu", "error");
  }
}
