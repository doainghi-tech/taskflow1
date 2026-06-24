// ============================================================
// MEMBERS VIEW (ADMIN) - quản lý thành viên
// ============================================================

function renderMembersView(container) {
  if (!isAdmin()) {
    container.innerHTML = `<p class="text-sm text-slate-400">Bạn không có quyền xem mục này.</p>`;
    return;
  }
  container.innerHTML = `
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-lg font-semibold text-slate-800">Thành viên</h1>
      <button onclick="openCreateMemberModal()" class="px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Thêm thành viên</button>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
      ${store.members
        .map(
          (m) => `
        <div class="px-4 py-3.5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full ${avatarColor(m.id)} text-white text-xs font-semibold flex items-center justify-center">${initials(m.name)}</div>
            <div>
              <p class="font-medium text-slate-700 text-sm">${escapeHtml(m.name)} ${!m.is_active ? `<span class="text-xs text-slate-400">(đã khóa)</span>` : ""}</p>
              <p class="text-xs text-slate-400">@${escapeHtml(m.username)} · ${m.role === "admin" ? "Quản lý" : "Thành viên"}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="toggleMemberActive('${m.id}', ${m.is_active})" class="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              ${m.is_active ? "Khóa" : "Mở khóa"}
            </button>
          </div>
        </div>`
        )
        .join("")}
    </div>
  `;
}

function openCreateMemberModal() {
  openModal(`
    <div class="p-5">
      <h3 class="font-semibold text-slate-800 mb-4">Thêm thành viên</h3>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Họ tên</label>
          <input id="new-member-name" type="text" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Tên đăng nhập</label>
          <input id="new-member-username" type="text" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Mật khẩu</label>
          <input id="new-member-password" type="text" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-500 mb-1">Vai trò</label>
          <select id="new-member-role" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="staff">Thành viên</option>
            <option value="admin">Quản lý</option>
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <button onclick="closeModal()" class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Hủy</button>
        <button onclick="submitCreateMember()" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Tạo</button>
      </div>
    </div>`);
}

async function submitCreateMember() {
  const name = document.getElementById("new-member-name").value.trim();
  const username = document.getElementById("new-member-username").value.trim();
  const password = document.getElementById("new-member-password").value.trim();
  const role = document.getElementById("new-member-role").value;
  if (!name || !username || !password) return toast("Điền đầy đủ thông tin", "error");
  try {
    await apiCreateMember({ name, username, password, role });
    closeModal();
    toast("Đã thêm thành viên", "success");
    await refreshAndRerender();
  } catch (err) {
    toast("Không thể tạo (username đã tồn tại?)", "error");
  }
}

async function toggleMemberActive(id, current) {
  try {
    await apiUpdateMember(id, { is_active: !current });
    toast("Đã cập nhật", "success");
    await refreshAndRerender();
  } catch (err) {
    toast("Có lỗi xảy ra", "error");
  }
}
