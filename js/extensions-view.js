// ============================================================
// EXTENSIONS VIEW (ADMIN) - duyệt yêu cầu gia hạn
// ============================================================

function renderExtensionsView(container) {
  if (!isAdmin()) {
    container.innerHTML = `<p class="text-sm text-slate-400">Bạn không có quyền xem mục này.</p>`;
    return;
  }
  const pending = store.extensionRequests
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const reviewed = store.extensionRequests
    .filter((r) => r.status !== "pending")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 15);

  container.innerHTML = `
    <h1 class="text-lg font-semibold text-slate-800 mb-1">Gia hạn chờ duyệt</h1>
    <p class="text-sm text-slate-500 mb-5">${pending.length} yêu cầu đang chờ xử lý</p>

    <div class="space-y-2.5 mb-8">
      ${pending.length ? pending.map(extensionRowHtml).join("") : `<p class="text-sm text-slate-400 py-6 text-center bg-white rounded-xl border border-slate-200">Không có yêu cầu nào đang chờ.</p>`}
    </div>

    <h2 class="font-medium text-slate-700 mb-3">Lịch sử đã xử lý</h2>
    <div class="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
      ${
        reviewed.length
          ? reviewed
              .map((r) => {
                const task = store.tasks.find((t) => t.id === r.task_id);
                return `
            <div class="px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <p class="font-medium text-slate-700">${escapeHtml(task ? task.title : "(task đã xóa)")}</p>
                <p class="text-xs text-slate-400">${escapeHtml(memberName(r.requested_by))} đề xuất ${formatDateVN(r.old_due_date)} → ${formatDateVN(r.new_due_date)}</p>
              </div>
              <span class="text-xs font-medium px-2.5 py-1 rounded-full ${r.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}">
                ${r.status === "approved" ? "Đã duyệt" : "Từ chối"}
              </span>
            </div>`;
              })
              .join("")
          : `<p class="text-sm text-slate-400 py-6 text-center">Chưa có lịch sử.</p>`
      }
    </div>
  `;
}

function extensionRowHtml(r) {
  const task = store.tasks.find((t) => t.id === r.task_id);
  return `
    <div class="bg-white rounded-xl border border-amber-200 px-4 py-3.5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-medium text-slate-800">${escapeHtml(task ? task.title : "(task đã xóa)")}</p>
          <p class="text-xs text-slate-500 mt-1">Người gửi: <span class="font-medium">${escapeHtml(memberName(r.requested_by))}</span></p>
          <p class="text-xs text-slate-500 mt-0.5">Hạn: <span class="line-through">${formatDateVN(r.old_due_date)}</span> → <span class="font-medium text-amber-700">${formatDateVN(r.new_due_date)}</span></p>
          ${r.reason ? `<p class="text-xs text-slate-500 mt-1 italic">"${escapeHtml(r.reason)}"</p>` : ""}
        </div>
        <div class="flex gap-1.5 shrink-0">
          <button onclick="reviewExtension('${r.id}', 'rejected')" class="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">Từ chối</button>
          <button onclick="reviewExtension('${r.id}', 'approved')" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700">Duyệt</button>
        </div>
      </div>
    </div>`;
}

async function reviewExtension(reqId, decision) {
  const req = store.extensionRequests.find((r) => r.id === reqId);
  const task = store.tasks.find((t) => t.id === req.task_id);
  try {
    await apiUpdateExtensionRequest(reqId, {
      status: decision,
      reviewed_by: store.currentUser.id,
      reviewed_at: new Date().toISOString(),
    });
    if (decision === "approved") {
      await apiUpdateTask(req.task_id, { due_date: req.new_due_date, is_overdue_recorded: false });
    }
    toast(decision === "approved" ? "Đã duyệt gia hạn" : "Đã từ chối yêu cầu", "success");
    await notifyUser(
      req.requested_by,
      decision === "approved" ? "extension_approved" : "extension_rejected",
      decision === "approved" ? "Yêu cầu gia hạn đã được duyệt" : "Yêu cầu gia hạn bị từ chối",
      `${escapeHtml(task ? task.title : "")}${decision === "approved" ? ` · Hạn mới: ${formatDateVN(req.new_due_date)}` : ""}`,
      req.task_id
    );
    await refreshAndRerender();
  } catch (err) {
    toast("Có lỗi xảy ra", "error");
  }
}
