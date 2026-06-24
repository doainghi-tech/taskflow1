// ============================================================
// CẤU HÌNH GOOGLE APPS SCRIPT (thay cho Supabase)
// 1. Mở Google Sheet bạn dùng làm database > Extensions > Apps Script
// 2. Dán nội dung file apps-script/Code.gs vào, lưu lại
// 3. Chạy hàm setupSheets() một lần (Authorize khi được hỏi)
// 4. Deploy > New deployment > chọn "Web app"
//    - Execute as: Me
//    - Who has access: Anyone
//    Bấm Deploy, copy "Web app URL" (dạng .../exec)
// 5. Dán URL đó thay vào dòng dưới đây
// ============================================================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw1L5A3W8SWhXE3aRO60hNbT0zdB03c-zVnlIJA8VjCmhJdr-mQ_AzoPEYIQthdZSK3VQ/exec";

// ---------- HÀM GỌI APPS SCRIPT ----------
// GET dùng để đọc dữ liệu (list / getAllData) — không bị vướng CORS.
async function gsGet(action, query) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set("action", action);
  Object.keys(query || {}).forEach((k) => url.searchParams.set(k, query[k]));
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.data;
}

// POST dùng để ghi dữ liệu (create/update/delete).
// Dùng Content-Type: text/plain để tránh bị browser gửi preflight OPTIONS
// (Apps Script không xử lý OPTIONS nên JSON content-type thường sẽ bị lỗi CORS).
async function gsPost(action, payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.data;
}
