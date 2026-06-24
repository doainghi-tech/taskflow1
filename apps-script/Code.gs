/* ============================================================
 * TASKFLOW — BACKEND APPS SCRIPT (thay cho Supabase)
 * Dán toàn bộ file này vào Apps Script (Extensions > Apps Script
 * mở từ chính Google Sheet bạn dùng làm database).
 *
 * Sau khi dán xong:
 * 1. Chạy hàm setupSheets() một lần (chọn hàm trong dropdown trên
 *    thanh công cụ Apps Script > bấm Run). Lần đầu Google sẽ hỏi
 *    cấp quyền — bấm Advanced > Go to project (unsafe) > Allow,
 *    vì đây là script bạn tự viết / dán.
 * 2. Deploy > New deployment > chọn loại "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    Bấm Deploy, copy "Web app URL" (dạng .../exec).
 * 3. Dán URL đó vào js/config.js (APPS_SCRIPT_URL).
 *
 * Mỗi khi sửa code.gs sau này, phải tạo deployment MỚI (hoặc
 * Manage deployments > sửa deployment cũ > bấm New version) để
 * URL áp dụng code mới.
 * ============================================================ */

// ---------- ĐỊNH NGHĨA CÁC SHEET (tương đương các table Supabase cũ) ----------
var SHEETS = {
  members: ["id", "name", "username", "password", "role", "is_active", "created_at"],
  projects: ["id", "name", "description", "created_by", "created_at"],
  tasks: [
    "id", "project_id", "title", "description", "task_type", "recurrence_rule",
    "recurrence_schedule", "parent_recurring_id", "main_assignee_id", "support_assignee_ids",
    "due_date", "status", "completed_at", "confirmed_by", "confirmed_at",
    "is_overdue_recorded", "created_by", "created_at", "updated_at",
  ],
  task_notes: ["id", "task_id", "member_id", "content", "is_done", "created_at", "updated_at"],
  extension_requests: [
    "id", "task_id", "requested_by", "old_due_date", "new_due_date", "reason",
    "status", "reviewed_by", "reviewed_at", "created_at",
  ],
  overdue_logs: ["id", "task_id", "member_id", "due_date", "recorded_at"],
  notifications: [
    "id", "recipient_id", "type", "title", "message", "task_id", "is_read", "created_at",
  ],
};

// Các cột cần JSON.parse/stringify khi đọc/ghi (vì Sheet chỉ lưu text)
var JSON_FIELDS = ["recurrence_rule", "recurrence_schedule", "support_assignee_ids"];
// Các cột boolean
var BOOL_FIELDS = ["is_active", "is_overdue_recorded", "is_done", "is_read"];

// ============================================================
// SETUP — chạy 1 lần để tạo sheet, header, định dạng cột, seed admin
// ============================================================
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    var headers = SHEETS[name];
    sh.clear();
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    // Format toàn bộ cột là Plain text để Sheet không tự đổi ngày/số
    sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat("@");
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, headers.length, 160);
  });

  // Xóa "Sheet1" mặc định nếu còn trống
  var sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) {
    ss.deleteSheet(sheet1);
  }

  // Seed tài khoản admin mặc định nếu bảng members đang trống
  var membersSheet = ss.getSheetByName("members");
  if (membersSheet.getLastRow() < 2) {
    appendRow_("members", {
      id: Utilities.getUuid(),
      name: "Quản trị viên",
      username: "admin",
      password: "admin123",
      role: "admin",
      is_active: true,
      created_at: new Date().toISOString(),
    });
  }

  Logger.log("Setup hoàn tất. Tài khoản đầu tiên: admin / admin123");
}

// ============================================================
// ENTRYPOINTS WEB APP
// ============================================================
function doGet(e) {
  try {
    var action = e.parameter.action;
    var result;
    if (action === "getAllData") {
      result = {
        members: sortBy_(readSheetAsObjects_("members"), "created_at", "asc"),
        projects: sortBy_(readSheetAsObjects_("projects"), "created_at", "desc"),
        tasks: sortBy_(readSheetAsObjects_("tasks"), "due_date", "asc"),
        notes: sortBy_(readSheetAsObjects_("task_notes"), "created_at", "desc"),
        extensionRequests: sortBy_(readSheetAsObjects_("extension_requests"), "created_at", "desc"),
        overdueLogs: readSheetAsObjects_("overdue_logs"),
        notifications: sortBy_(readSheetAsObjects_("notifications"), "created_at", "desc"),
      };
    } else if (action === "list") {
      var table = e.parameter.table;
      if (!SHEETS[table]) throw new Error("Sheet không tồn tại: " + table);
      result = readSheetAsObjects_(table);
    } else {
      throw new Error("Action không hợp lệ: " + action);
    }
    return jsonOut_({ data: result });
  } catch (err) {
    return jsonOut_({ error: String(err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var payload = body.payload;
    var result;

    switch (action) {
      case "login": result = handleLogin_(payload); break;
      case "createMember": result = handleCreateMember_(payload); break;
      case "updateMember": result = handleUpdateMember_(payload); break;
      case "createProject": result = handleCreateProject_(payload); break;
      case "createTask": result = handleCreateTask_(payload); break;
      case "createTasks": result = handleCreateTasks_(payload); break;
      case "updateTask": result = handleUpdateTask_(payload); break;
      case "deleteTask": result = handleDeleteTask_(payload); break;
      case "createNote": result = handleCreateNote_(payload); break;
      case "updateNote": result = handleUpdateNote_(payload); break;
      case "deleteNote": result = handleDeleteNote_(payload); break;
      case "createExtensionRequest": result = handleCreateExtensionRequest_(payload); break;
      case "updateExtensionRequest": result = handleUpdateExtensionRequest_(payload); break;
      case "createOverdueLogs": result = handleCreateOverdueLogs_(payload); break;
      case "createNotification": result = handleCreateNotification_(payload); break;
      case "createNotifications": result = handleCreateNotifications_(payload); break;
      case "updateNotification": result = handleUpdateNotification_(payload); break;
      case "markAllNotificationsRead": result = handleMarkAllNotificationsRead_(payload); break;
      default: throw new Error("Action không hợp lệ: " + action);
    }
    return jsonOut_({ data: result });
  } catch (err) {
    return jsonOut_({ error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sortBy_(arr, field, dir) {
  return arr.slice().sort(function (a, b) {
    var av = a[field] || "", bv = b[field] || "";
    return dir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });
}

// ============================================================
// HANDLERS THEO TỪNG ACTION
// ============================================================
function handleLogin_(p) {
  var members = readSheetAsObjects_("members");
  var found = null;
  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    if (m.username === p.username && String(m.password) === String(p.password) && m.is_active === true) {
      found = m;
      break;
    }
  }
  return found;
}

// ---------- MEMBERS ----------
function handleCreateMember_(p) {
  var obj = Object.assign(
    { id: Utilities.getUuid(), role: "staff", is_active: true, created_at: new Date().toISOString() },
    p
  );
  return appendRow_("members", obj);
}
function handleUpdateMember_(p) {
  return updateRowById_("members", p.id, p.patch);
}

// ---------- PROJECTS ----------
function handleCreateProject_(p) {
  var obj = Object.assign({ id: Utilities.getUuid(), created_at: new Date().toISOString() }, p);
  return appendRow_("projects", obj);
}

// ---------- TASKS ----------
function handleCreateTask_(p) {
  var now = new Date().toISOString();
  var obj = Object.assign(
    {
      id: Utilities.getUuid(),
      created_at: now,
      updated_at: now,
      is_overdue_recorded: false,
      support_assignee_ids: p.support_assignee_ids || [],
      recurrence_rule: p.recurrence_rule || null,
    },
    p
  );
  return appendRow_("tasks", obj);
}
function handleCreateTasks_(p) {
  // p là 1 mảng payload task
  return p.map(function (item) { return handleCreateTask_(item); });
}
function handleUpdateTask_(p) {
  return updateRowById_("tasks", p.id, p.patch);
}
function handleDeleteTask_(p) {
  cascadeDeleteTask_(p.id);
  return { id: p.id, deleted: true };
}
function cascadeDeleteTask_(taskId) {
  // Xóa các occurrence con của task định kỳ trước (đệ quy)
  var tasks = readSheetAsObjects_("tasks");
  var children = tasks.filter(function (t) { return t.parent_recurring_id === taskId; });
  children.forEach(function (c) { cascadeDeleteTask_(c.id); });
  // Xóa dữ liệu liên quan (giống "on delete cascade" của Supabase cũ)
  deleteRowsWhere_("task_notes", "task_id", taskId);
  deleteRowsWhere_("extension_requests", "task_id", taskId);
  deleteRowsWhere_("overdue_logs", "task_id", taskId);
  deleteRowsWhere_("notifications", "task_id", taskId);
  deleteRowById_("tasks", taskId);
}

// ---------- NOTES ----------
function handleCreateNote_(p) {
  var now = new Date().toISOString();
  var obj = Object.assign({ id: Utilities.getUuid(), is_done: false, created_at: now, updated_at: now }, p);
  return appendRow_("task_notes", obj);
}
function handleUpdateNote_(p) {
  var patch = Object.assign({}, p.patch, { updated_at: new Date().toISOString() });
  return updateRowById_("task_notes", p.id, patch);
}
function handleDeleteNote_(p) {
  deleteRowById_("task_notes", p.id);
  return { id: p.id, deleted: true };
}

// ---------- EXTENSION REQUESTS ----------
function handleCreateExtensionRequest_(p) {
  var obj = Object.assign(
    { id: Utilities.getUuid(), status: "pending", created_at: new Date().toISOString() },
    p
  );
  return appendRow_("extension_requests", obj);
}
function handleUpdateExtensionRequest_(p) {
  return updateRowById_("extension_requests", p.id, p.patch);
}

// ---------- OVERDUE LOGS ----------
function handleCreateOverdueLogs_(p) {
  return p.map(function (item) {
    var obj = Object.assign({ id: Utilities.getUuid(), recorded_at: new Date().toISOString() }, item);
    return appendRow_("overdue_logs", obj);
  });
}

// ---------- NOTIFICATIONS ----------
function handleCreateNotification_(p) {
  var obj = Object.assign(
    { id: Utilities.getUuid(), is_read: false, created_at: new Date().toISOString() },
    p
  );
  return appendRow_("notifications", obj);
}
function handleCreateNotifications_(p) {
  // p là 1 mảng payload notification
  return p.map(function (item) { return handleCreateNotification_(item); });
}
function handleUpdateNotification_(p) {
  return updateRowById_("notifications", p.id, p.patch);
}
function handleMarkAllNotificationsRead_(p) {
  var sh = getSheet_("notifications");
  var headers = SHEETS.notifications;
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return { updated: 0 };
  var recipientCol = headers.indexOf("recipient_id") + 1;
  var readCol = headers.indexOf("is_read") + 1;
  var ids = sh.getRange(2, recipientCol, lastRow - 1, 1).getValues();
  var updated = 0;
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(p.recipientId)) {
      sh.getRange(i + 2, readCol, 1, 1).setValue(true);
      updated++;
    }
  }
  return { updated: updated };
}

// ============================================================
// HÀM ĐỌC/GHI SHEET CẤP THẤP
// ============================================================
function getSheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error("Sheet không tồn tại: " + name + " (chạy setupSheets() trước)");
  return sh;
}

function parseCell_(field, value) {
  if (JSON_FIELDS.indexOf(field) !== -1) {
    if (value === "" || value === null || typeof value === "undefined") {
      return field === "support_assignee_ids" ? [] : null;
    }
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch (e) { return field === "support_assignee_ids" ? [] : null; }
  }
  if (BOOL_FIELDS.indexOf(field) !== -1) {
    return value === true || value === "true" || value === "TRUE";
  }
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return value;
}

function serializeCell_(field, value) {
  if (typeof value === "undefined" || value === null) return "";
  if (JSON_FIELDS.indexOf(field) !== -1) return JSON.stringify(value);
  if (BOOL_FIELDS.indexOf(field) !== -1) return value === true ? true : value === false ? false : value;
  return value;
}

function readSheetAsObjects_(name) {
  var sh = getSheet_(name);
  var headers = SHEETS[name];
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var values = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var out = [];
  for (var r = 0; r < values.length; r++) {
    if (values[r][0] === "" || values[r][0] === null) continue; // bỏ dòng trống
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = parseCell_(headers[c], values[r][c]);
    }
    out.push(obj);
  }
  return out;
}

function appendRow_(name, obj) {
  var sh = getSheet_(name);
  var headers = SHEETS[name];
  var row = headers.map(function (h) { return serializeCell_(h, obj[h]); });
  sh.appendRow(row);
  return obj;
}

function findRowIndexById_(sh, headers, id) {
  var idCol = headers.indexOf("id") + 1;
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sh.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function updateRowById_(name, id, patch) {
  var sh = getSheet_(name);
  var headers = SHEETS[name];
  var rowIdx = findRowIndexById_(sh, headers, id);
  if (rowIdx === -1) throw new Error("Không tìm thấy dòng có id=" + id + " trong " + name);

  var currentValues = sh.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  var current = {};
  for (var c = 0; c < headers.length; c++) current[headers[c]] = parseCell_(headers[c], currentValues[c]);

  var merged = Object.assign({}, current, patch || {});
  var newRow = headers.map(function (h) { return serializeCell_(h, merged[h]); });
  sh.getRange(rowIdx, 1, 1, headers.length).setValues([newRow]);
  return merged;
}

function deleteRowById_(name, id) {
  var sh = getSheet_(name);
  var headers = SHEETS[name];
  var rowIdx = findRowIndexById_(sh, headers, id);
  if (rowIdx === -1) return false;
  sh.deleteRow(rowIdx);
  return true;
}

function deleteRowsWhere_(name, field, value) {
  var sh = getSheet_(name);
  var headers = SHEETS[name];
  var col = headers.indexOf(field) + 1;
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  for (var r = lastRow; r >= 2; r--) {
    var v = sh.getRange(r, col, 1, 1).getValue();
    if (String(v) === String(value)) sh.deleteRow(r);
  }
}
