// ============================================================
// AUTH - đăng nhập / đăng xuất / phiên làm việc
// ============================================================

function renderLoginScreen() {
  const root = document.getElementById("app-root");
  root.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg mb-3">TF</div>
          <h1 class="text-xl font-semibold text-slate-800">TaskFlow</h1>
          <p class="text-sm text-slate-500 mt-1">Quản lý task &amp; tiến độ team</p>
        </div>
        <form id="login-form" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Tên đăng nhập</label>
            <input id="login-username" type="text" required autocomplete="username"
              class="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">Mật khẩu</label>
            <input id="login-password" type="password" required autocomplete="current-password"
              class="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <p id="login-error" class="text-sm text-rose-600 hidden"></p>
          <button type="submit" class="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
            Đăng nhập
          </button>
        </form>
        <p class="text-center text-xs text-slate-400 mt-4">Chúc các bạn có một ngày làm việc hiệu quả!</p>
      </div>
    </div>`;

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const errEl = document.getElementById("login-error");
    errEl.classList.add("hidden");
    try {
      const user = await apiLogin(username, password);
      if (!user) {
        errEl.textContent = "Sai tên đăng nhập hoặc mật khẩu.";
        errEl.classList.remove("hidden");
        return;
      }
      store.currentUser = user;
      localStorage.setItem("taskflow_user_id", user.id);
      await bootApp();
    } catch (err) {
      errEl.textContent = "Không kết nối được tới máy chủ. Kiểm tra lại APPS_SCRIPT_URL trong js/config.js.";
      errEl.classList.remove("hidden");
    }
  });
}

function logout() {
  localStorage.removeItem("taskflow_user_id");
  store.currentUser = null;
  if (typeof notificationPollHandle !== "undefined" && notificationPollHandle) {
    clearInterval(notificationPollHandle);
    notificationPollHandle = null;
  }
  renderLoginScreen();
}

async function restoreSession() {
  const id = localStorage.getItem("taskflow_user_id");
  if (!id) return false;
  try {
    const members = await apiListMembers();
    const user = members.find((m) => String(m.id) === String(id) && m.is_active);
    if (!user) return false;
    store.currentUser = user;
    return true;
  } catch (err) {
    // Lỗi mạng/API tạm thời (vd. Apps Script khởi động chậm) — KHÔNG được coi
    // là "phiên hết hạn" và đăng xuất người dùng. Báo lỗi ngay trên màn hình
    // đăng nhập để người dùng biết cần thử lại (F5), thay vì âm thầm văng ra.
    console.error("Không thể khôi phục phiên đăng nhập:", err);
    const errEl = document.getElementById("login-error");
    if (errEl) {
      errEl.textContent = "Không kết nối được tới máy chủ. Vui lòng tải lại trang (F5) — tài khoản của bạn vẫn còn đăng nhập.";
      errEl.classList.remove("hidden");
    }
    return false;
  }
}
