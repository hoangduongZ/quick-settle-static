# Quick Settle Static

Bản HTML tĩnh chuyển đổi từ ý tưởng repo `quick-settle`: dùng trực tiếp trên browser, không cần backend/database.

## Cách dùng nhanh

1. Mở `index.html` bằng trình duyệt, hoặc host cả thư mục này lên GitHub Pages.
2. Tạo phiên chơi.
3. Thêm người chơi.
4. Nhập kết quả từng ván: người thắng nhập số dương, người thua nhập số âm. Tổng mỗi ván phải bằng 0.
5. Bấm **Chốt sổ** để sinh danh sách chuyển khoản tối ưu.

## Lưu dữ liệu

- `localStorage`: lưu toàn bộ phiên, người chơi, ván, NET và giao dịch đã chốt.
- `sessionStorage`: lưu phiên đang mở và nháp nhập ván theo từng tab.
- Có nút Export/Import JSON để backup hoặc chuyển máy.

## Deploy GitHub Pages

Cách đơn giản:

1. Tạo repo GitHub mới, ví dụ `quick-settle-static`.
2. Upload `index.html` và `README.md` vào root repo.
3. Vào **Settings → Pages**.
4. Source: chọn `Deploy from a branch`.
5. Branch: chọn `main`, folder `/root`.
6. Save và mở URL GitHub Pages được cấp.

## Ghi chú kỹ thuật

- Không dùng Maven, Java, Spring Boot, PostgreSQL.
- Dùng Tailwind CDN và vanilla JavaScript.
- Thuật toán chốt sổ: tách người âm / người dương, sort theo số dư lớn nhất, rồi match greedy đến khi hết nợ.
