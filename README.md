# SHS CEO Dashboard Demo

Bản demo báo cáo kinh doanh dành cho CEO, dùng dữ liệu tĩnh từ báo cáo ngày **09/10/2026**.

## Xem demo

Mở `index.html` bằng trình duyệt, hoặc chạy một máy chủ tĩnh từ thư mục này.

- Tổng quan daily: kết quả lũy kế tháng và nhịp kinh doanh trong ngày.
- Cơ cấu KH & chính sách: KH mở mới trong tháng tách khỏi KH cũ; phân nhóm theo NAV và khớp lệnh 30 ngày.
- So sánh đơn vị: đóng góp phí tháng, tăng/giảm cùng kỳ và chi tiết khách hàng / tài sản của từng đơn vị.
- Định nghĩa & nguồn số liệu: kỳ đo, công thức và giới hạn của số liệu.

## Trình chiếu TV

Giao diện mặc định thiết kế cho màn hình ngang 16:9 (1920×1080), tự co theo kích thước cửa sổ. Chọn **Toàn màn hình** hoặc dùng F11. **Chế độ đọc** chuyển sang bố cục cuộn thông thường.

## Dữ liệu

Demo không tự cập nhật. Giá trị “—” là chưa có dữ liệu trong báo cáo nguồn, không phải bằng 0. Các chỉ tiêu tính lại và số làm tròn được ghi chú trong dashboard. Tăng doanh thu không được dùng riêng để kết luận nỗ lực của đơn vị.

Nguồn: BÁO CÁO KINH DOANH TOÀN HÀNG 09-10-2026.pdf. Không cần tải thêm thư viện để chạy dashboard.

## Deploy lên Vercel

1. Vào https://vercel.com/new và import repository `hiepnguyenduy221/dashboarddemo`.
2. Chọn Framework Preset **Other**, Root Directory giữ ở gốc repository (`.`).
3. `vercel.json` đã cấu hình bỏ qua bước cài đặt và build, xuất website từ thư mục gốc. Không cần biến môi trường.
4. Nhấn **Deploy**. Mở URL được Vercel cấp để xem dashboard; thêm `#units` để vào tab So sánh đơn vị.

Sau khi kết nối GitHub, các lần push tiếp theo lên nhánh production `main` sẽ cập nhật bản deploy.

Cấu hình tham chiếu: https://vercel.com/docs/project-configuration/vercel-json và https://vercel.com/docs/builds/configure-a-build.
