// ============================================================
// API LAYER - gọi Google Apps Script (thay cho Supabase)
// Giữ nguyên tên + chữ ký hàm như bản cũ để các file view không
// cần sửa gì cả.
// ============================================================

// ---------- AUTH ----------
async function apiLogin(username, password) {
  return gsPost("login", { username, password });
}

// ---------- MEMBERS ----------
async function apiListMembers() {
  return gsGet("list", { table: "members" });
}
async function apiCreateMember(payload) {
  return gsPost("createMember", payload);
}
async function apiUpdateMember(id, payload) {
  return gsPost("updateMember", { id, patch: payload });
}

// ---------- PROJECTS ----------
async function apiListProjects() {
  return gsGet("list", { table: "projects" });
}
async function apiCreateProject(payload) {
  return gsPost("createProject", payload);
}

// ---------- TASKS ----------
async function apiListTasks() {
  return gsGet("list", { table: "tasks" });
}
async function apiCreateTask(payload) {
  return gsPost("createTask", payload);
}
async function apiCreateTasks(payloadArray) {
  if (!payloadArray.length) return [];
  return gsPost("createTasks", payloadArray);
}
async function apiUpdateTask(id, payload) {
  return gsPost("updateTask", { id, patch: { ...payload, updated_at: new Date().toISOString() } });
}
async function apiDeleteTask(id) {
  return gsPost("deleteTask", { id });
}

// ---------- NOTES ----------
async function apiListNotes() {
  return gsGet("list", { table: "task_notes" });
}
async function apiCreateNote(payload) {
  return gsPost("createNote", payload);
}
async function apiUpdateNote(id, payload) {
  return gsPost("updateNote", { id, patch: payload });
}
async function apiDeleteNote(id) {
  return gsPost("deleteNote", { id });
}

// ---------- NOTIFICATIONS ----------
async function apiListNotifications() {
  return gsGet("list", { table: "notifications" });
}
async function apiCreateNotification(payload) {
  return gsPost("createNotification", payload);
}
async function apiCreateNotifications(payloadArray) {
  if (!payloadArray.length) return [];
  return gsPost("createNotifications", payloadArray);
}
async function apiUpdateNotification(id, payload) {
  return gsPost("updateNotification", { id, patch: payload });
}
async function apiMarkAllNotificationsRead(recipientId) {
  return gsPost("markAllNotificationsRead", { recipientId });
}

// ---------- EXTENSION REQUESTS ----------
async function apiListExtensionRequests() {
  return gsGet("list", { table: "extension_requests" });
}
async function apiCreateExtensionRequest(payload) {
  return gsPost("createExtensionRequest", payload);
}
async function apiUpdateExtensionRequest(id, payload) {
  return gsPost("updateExtensionRequest", { id, patch: payload });
}

// ---------- OVERDUE LOGS ----------
async function apiListOverdueLogs() {
  return gsGet("list", { table: "overdue_logs" });
}
async function apiCreateOverdueLogs(payloadArray) {
  if (!payloadArray.length) return [];
  return gsPost("createOverdueLogs", payloadArray);
}

// ---------- LOAD GỘP (1 lần gọi duy nhất thay vì 6 lần) ----------
// Apps Script có độ trễ cao hơn Supabase mỗi lần gọi, nên gộp lại
// thành 1 request duy nhất để app mở nhanh hơn ở mọi trình duyệt.
async function apiGetAllData() {
  return gsGet("getAllData", {});
}
