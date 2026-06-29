# Quick Settle

Quick Settle là công cụ chốt sổ sau một buổi chơi có nhiều người thắng/thua. Mục tiêu là nhập kết quả từng ván, tính NET từng người, sau đó gom thành danh sách chuyển khoản ít lệnh nhất có thể.

## Mục đích

- Tạo phiên chơi riêng cho từng buổi.
- Quản lý người chơi trong phiên.
- Ghi kết quả từng ván.
- Sửa hoặc xóa ván bất kỳ khi phát hiện nhập sai.
- Cho người chơi nghỉ ngang hoặc chơi lại.
- Chốt sổ thành danh sách ai chuyển cho ai.
- Hiện QR chuyển khoản nếu người nhận đã có đủ thông tin tài khoản.
- Tải bản sao dữ liệu để cất giữ hoặc khôi phục lại khi đổi thiết bị.

## Cách dùng nhanh

1. Bấm **Tạo phiên**.
2. Thêm người chơi ở màn **Người chơi**.
3. Vào **Các ván** để nhập kết quả:
   - Người thắng nhập số dương.
   - Người thua nhập số âm.
   - Tổng mỗi ván phải bằng `0`.
4. Nếu có người nghỉ ngang, vào **Người chơi** và bấm **Nghỉ ngang**.
5. Nếu phát hiện ván cũ bị sai, vào **Các ván** và bấm **Sửa** ở đúng ván đó.
6. Khi xong, vào **Chốt sổ & QR** và bấm **Chốt sổ**.
7. Người thua quét QR hoặc chuyển khoản theo danh sách hiển thị.

## Đưa lên GitHub Pages

1. Tạo repository mới trên GitHub.
2. Upload toàn bộ nội dung thư mục này lên repository.
3. Vào **Settings → Pages**.
4. Chọn branch chứa mã nguồn, thường là `main`.
5. Chọn thư mục publish là root.
6. Lưu lại và mở đường dẫn GitHub Pages được cấp.

## Ghi chú về QR

QR chỉ hỗ trợ tạo ảnh để quét chuyển khoản. Ứng dụng không tự xác nhận tiền đã được nhận.

## Bản quyền

© 2026 Dương Việt Hoàng. All rights reserved.
