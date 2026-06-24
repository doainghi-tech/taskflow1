# TaskFlow — Quản lý task & tiến độ team (bản Google Sheet)

App quản lý task nội bộ: dashboard tổng quan (có bộ lọc thời gian + biểu đồ),
theo dõi task theo từng thành viên (xem dạng danh sách hoặc Kanban), ghi chú
công việc (sửa/xóa/tick đã xử lý), nhắc trễ hạn, gia hạn cần quản lý duyệt,
phân công dự án (task định kỳ có lịch nộp bắt buộc rõ ràng), lịch kéo-thả,
và chuông thông báo tự động cập nhật.

Đây là 1 trang web tĩnh (HTML/CSS/JS thuần, không cần build) + **Google Sheet
làm backend lưu dữ liệu thật**, đọc/ghi qua Google Apps Script. Vì dữ liệu nằm
trên Google Sheet (đám mây của Google), mở app ở máy nào / trình duyệt nào
cũng kéo về đúng 1 nguồn dữ liệu chung — không phụ thuộc máy đang dùng.
Deploy free bằng GitHub Pages.

## Tính năng nổi bật

- **Ghi chú công việc**: thêm, sửa, xóa ghi chú (chỉ người viết sửa/xóa được
  ghi chú của mình), tick "đã xử lý" cho từng ghi chú.
- **Chuông thông báo** (góc trên bên phải): tự động báo khi có task mới giao,
  yêu cầu gia hạn được duyệt/từ chối, hoặc có task cần admin xác nhận hoàn
  thành. Tự kiểm tra thông báo mới mỗi 30 giây.
- **Luồng xác nhận hoàn thành**: thành viên chuyển task sang "Chờ xác nhận"
  khi xong việc, admin xác nhận thì task mới chính thức "Hoàn thành" — tránh
  trường hợp tự đánh dấu xong mà không ai biết.
- **Task định kỳ có lịch nộp rõ ràng**: khi tạo task định kỳ, phải chọn cụ thể
  thứ trong tuần (vd: "Thứ 7 hằng tuần") hoặc ngày/hạn trong tháng (vd: "Trước
  ngày 10 hằng tháng").
- **Task của thành viên**: chuyển đổi giữa view Danh sách (lọc theo hạn) và
  view Kanban (4 cột: Chưa làm / Đang làm / Chờ xác nhận / Hoàn thành, kéo-thả
  được), task hoàn thành được tô màu xanh nổi bật.
- **Lịch**: có nút "Hôm nay", chú giải màu theo trạng thái, đếm nhanh số task
  đang trễ hạn trong tháng, và nút tạo task nhanh ngay trên ô ngày trống.
- **Dashboard**: chọn khoảng thời gian xem báo cáo (7 ngày / 30 ngày / tháng
  này / toàn bộ), biểu đồ cột tiến độ theo ngày, biểu đồ tỷ lệ trạng thái,
  tỷ lệ hoàn thành đúng hạn, và thành viên xuất sắc nhất trong kỳ.



## 1. Tạo Google Sheet làm database (5 phút, miễn phí)

> ⚠️ **Đang nâng cấp từ bản cũ?** Bản này có thêm sheet `notifications` và
> thêm cột mới trong `tasks` (`recurrence_schedule`, `confirmed_by`,
> `confirmed_at`) và `task_notes` (`is_done`, `updated_at`). Khi dán code mới
> và chạy lại `setupSheets()`, hàm này sẽ **xóa sạch header + dữ liệu cũ**
> của tất cả sheet liên quan (vì dùng `sh.clear()`). Nếu bạn đã có dữ liệu
> thật quan trọng, hãy **sao lưu (Tạo bản sao) Google Sheet hiện tại trước**,
> rồi tự copy dữ liệu cũ sang cấu trúc cột mới bằng tay sau khi setup xong.

1. Vào https://sheets.google.com → tạo 1 Sheet mới, đặt tên bất kỳ (ví dụ `TaskFlow DB`).
2. Trong Sheet đó, vào menu **Extensions (Tiện ích mở rộng) → Apps Script**.
   Một tab Apps Script mới sẽ mở ra, đã tự gắn (bound) với Sheet này.
3. Xóa hết code mẫu (`function myFunction() {...}`) trong file `Code.gs`,
   mở file `apps-script/Code.gs` trong repo này, copy toàn bộ nội dung, dán vào.
   Bấm 💾 (Save).
4. Trên thanh công cụ, chọn hàm **setupSheets** ở ô dropdown cạnh nút Run (▶),
   bấm **Run**.
   - Lần đầu Google sẽ hỏi cấp quyền: bấm **Review permissions** → chọn tài
     khoản Google của bạn → nếu thấy cảnh báo "Google hasn't verified this
     app", bấm **Advanced** → **Go to (tên project) (unsafe)** → **Allow**.
     (Cảnh báo này bình thường vì đây là script tự viết/dán, không phải app
     bên thứ ba.)
   - Script này sẽ tự tạo đủ các sheet con (`members`, `projects`, `tasks`,
     `task_notes`, `extension_requests`, `overdue_logs`) với cột tương ứng,
     và tạo tài khoản admin mặc định: `admin` / `admin123`.
   - Bạn sẽ thấy các tab mới xuất hiện ở dưới Sheet — đó là nơi toàn bộ task
     và thông tin chi tiết sẽ được lưu, có thể mở xem/sửa tay trực tiếp.

## 2. Deploy Apps Script thành Web App (để app gọi vào được)

1. Trong tab Apps Script, bấm nút **Deploy** (góc trên phải) → **New deployment**.
2. Bấm icon ⚙️ cạnh "Select type" → chọn **Web app**.
3. Điền:
   - **Execute as**: Me (tài khoản của bạn)
   - **Who has access**: Anyone
4. Bấm **Deploy**. Lần đầu sẽ phải cấp quyền lại tương tự bước trên.
5. Copy **Web app URL** hiện ra (dạng `https://script.google.com/macros/s/AKfycb.../exec`).

> ⚠️ Mỗi khi bạn sửa lại nội dung `Code.gs` sau này, phải vào **Deploy →
> Manage deployments** → chọn deployment hiện tại → bấm ✏️ → **Version: New
> version** → **Deploy**, để URL áp dụng đúng code mới (sửa code mà không
> tạo version mới thì app vẫn gọi vào bản code cũ).

## 3. Gắn URL vào code

Mở file `js/config.js`, thay dòng:

```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

bằng URL thật bạn vừa copy ở bước 2.5. Lưu file.

## 4. Đẩy lên GitHub & bật GitHub Pages

```bash
git init
git add .
git commit -m "TaskFlow - Google Sheet backend"
git branch -M main
git remote add origin https://github.com/<ten-ban>/<ten-repo>.git
git push -u origin main
```

Sau đó vào repo trên GitHub → **Settings** → **Pages** → mục **Source**
chọn nhánh `main`, thư mục `/ (root)` → **Save**. Sau ~1 phút, GitHub cho bạn
một link dạng `https://<ten-ban>.github.io/<ten-repo>/` — đó là link để cả
team truy cập. Mở link này ở bất kỳ máy/trình duyệt nào cũng kéo dữ liệu
từ đúng Google Sheet đã cấu hình.

## 5. Đăng nhập & dùng

- Đăng nhập lần đầu: `admin` / `admin123`.
- Vào mục **Thành viên** (chỉ admin thấy) để tạo tài khoản cho từng người
  trong team, đổi mật khẩu admin nếu muốn.
- Vào **Phân công** → **Tạo dự án** → trong dự án **+ Task** để giao việc,
  chọn loại "Phát sinh" (việc đơn lẻ) hoặc "Định kỳ" (tự sinh task theo
  ngày/tuần/tháng).
- Mỗi thành viên vào **Task của thành viên** để xem task theo hạn hôm nay /
  ngày mai / tuần này / đã trễ, ghi chú, hoặc gửi yêu cầu gia hạn.
- Admin vào **Gia hạn chờ duyệt** để duyệt/từ chối các yêu cầu.
- **Lịch**: xem & kéo-thả task qua ngày khác để đổi hạn (của mình hoặc xem
  của cả team).
- **Tổng quan**: số liệu chung + bảng tiến độ từng thành viên, ai đang trễ
  bao nhiêu task, từng trễ bao nhiêu lần.

## Ghi chú quan trọng về an toàn dữ liệu

Đây là bản dùng nội bộ cho team nhỏ, tối ưu cho tốc độ triển khai:

- Đăng nhập dùng sheet `members` tự quản lý (không qua Google OAuth thật),
  mật khẩu lưu dạng chữ thường (plain text) ngay trong Sheet. **Đừng dùng
  mật khẩu quan trọng** của cá nhân cho các tài khoản này.
- Web app Apps Script đặt "Who has access: Anyone" — bất kỳ ai có Web app
  URL đều gọi được API đọc/ghi dữ liệu (URL này nằm công khai trong code
  frontend `js/config.js`). Vì vậy: **không public repo/app này cho người
  ngoài team**, hoặc đặt repo ở chế độ private + GitHub Pages chỉ chia link
  nội bộ.
- Bản thân Google Sheet (file bạn tạo ở bước 1) thì vẫn theo quyền chia sẻ
  Google Drive bình thường — chỉ bạn (người tạo) và người bạn share mới mở
  trực tiếp sheet xem được, tách biệt với việc app gọi qua Web App URL.
- Khi team lớn hơn hoặc cần bảo mật chặt hơn, nên cân nhắc chuyển username/
  password qua Google OAuth thật, hoặc thêm bước kiểm tra "API key" đơn giản
  trong header request giữa frontend và Apps Script.

## Cấu trúc thư mục

```
index.html                   giao diện chính
css/style.css                style bổ sung
js/config.js                 ⚠️ chỗ dán Apps Script Web App URL
js/utils.js                  hàm helper (ngày tháng, toast, modal, nhãn lịch định kỳ)
js/api.js                    các lệnh gọi Apps Script (CRUD qua Google Sheet)
js/store.js                  state toàn cục + logic sinh task định kỳ / ghi nhận trễ hạn / thông báo
js/auth.js                   đăng nhập / đăng xuất
js/app.js                    layout chính + điều hướng + chuông thông báo (poll 30s)
js/dashboard.js               view Tổng quan (bộ lọc thời gian + biểu đồ Chart.js)
js/tasks-view.js             view Task của thành viên (danh sách/Kanban, ghi chú, gia hạn, xác nhận hoàn thành)
js/assignment-view.js        view Phân công (dự án, task, định kỳ + lịch nộp bắt buộc)
js/calendar-view.js          view Lịch (kéo-thả, tạo task nhanh)
js/extensions-view.js        view Gia hạn chờ duyệt (admin)
js/members-view.js           view Thành viên (admin)
apps-script/Code.gs          script Apps Script: tạo sheet + toàn bộ API đọc/ghi
```

## Tùy biến thêm

- Đổi tên app: sửa `<title>` và logo "TF" trong `index.html` / `js/app.js`.
- Đổi màu chủ đạo: tìm/thay `indigo` bằng màu Tailwind khác (ví dụ `teal`,
  `blue`) trong các file `js/*.js`.
- Muốn tự động nhắc trễ hạn qua Telegram/Zalo: có thể thêm 1 Apps Script
  Trigger chạy theo lịch (Time-driven trigger) gọi hàm quét sheet `tasks`
  rồi gửi tin nhắn — tương tự cách bạn từng làm cho Pivo CRM.
- Muốn xem/sửa dữ liệu nhanh bằng tay: mở thẳng Google Sheet, sửa trực tiếp
  trong các tab `members` / `tasks` / ... — app sẽ thấy thay đổi này ngay
  lần load tiếp theo (không cần qua giao diện).
