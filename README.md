# SHS CEO Dashboard Demo

Bản demo báo cáo kinh doanh dành cho CEO. Giao diện ở `index.html` + `app.js`, số liệu ở `data.json` (sinh từ Excel).

## Xem demo

Trang đọc `data.json` bằng `fetch`, nên phải chạy qua máy chủ tĩnh (mở trực tiếp file `index.html` sẽ báo lỗi tải dữ liệu):

```bash
python -m http.server 8000
```

Rồi mở http://localhost:8000.

- Tổng quan daily: kết quả lũy kế tháng và nhịp kinh doanh trong ngày.
- Cơ cấu KH & chính sách: KH mở mới trong tháng tách khỏi KH cũ; phân nhóm theo NAV và khớp lệnh 30 ngày.
- So sánh đơn vị: đóng góp phí tháng, tăng/giảm cùng kỳ và chi tiết khách hàng / tài sản của từng đơn vị.
- Định nghĩa & nguồn số liệu: kỳ đo, công thức và giới hạn của số liệu.

## Trình chiếu TV

Giao diện mặc định thiết kế cho màn hình ngang 16:9 (1920×1080), tự co theo kích thước cửa sổ. Chọn **Toàn màn hình** hoặc dùng F11. **Chế độ đọc** chuyển sang bố cục cuộn thông thường.

## Cập nhật dữ liệu

1. Team data điền `data/template_dashboard.xlsx`. File dữ liệu mẫu chỉ dùng nội bộ, không đưa lên repo public.
2. Chạy máy chủ tĩnh như ở trên, mở http://localhost:8000/tools/import.html (Chrome hoặc Edge, cần mạng để tải thư viện đọc Excel).
3. Kéo thả file Excel vào trang. Trang kiểm tra file; có lỗi (sai cột, trùng dòng, đơn vị lạ, ngày sai…) thì liệt kê theo sheet và dòng, không cho lưu.
4. Bấm **Xem trước dashboard** để xem số mới trước khi ghi.
5. Bấm **Lưu data.json**, chọn file `data.json` ở thư mục gốc repo để ghi đè. Trình duyệt không hỗ trợ ghi trực tiếp thì file được tải về; chép đè vào thư mục gốc repo.
6. Commit và push `data.json`; Vercel tự deploy.

Cách thay cho bước 2–5, chạy bằng dòng lệnh (cần `pip install openpyxl`), cùng quy tắc kiểm tra:

```bash
python tools/excel_to_json.py duong_dan_file.xlsx
```

Template chỉ chứa số gốc; lũy kế, AUM, Δ, bình quân, tổng toàn công ty, tỷ lệ… do `app.js` tính. Sửa cột ở `tools/dashboard_schema.py`, rồi chạy `python tools/make_template.py` để sinh lại template và cập nhật quy tắc trong `tools/import.html`. Tài liệu nghiệp vụ chi tiết được giữ nội bộ, không đăng trong repo public.

Giá trị “—” là chưa có dữ liệu, không phải bằng 0. Tăng doanh thu không được dùng riêng để kết luận nỗ lực của đơn vị. Dashboard không cần thư viện ngoài.

## Deploy lên Vercel

1. Vào https://vercel.com/new và import repository `hiepnguyenduy221/dashboarddemo`.
2. Chọn Framework Preset **Other**, Root Directory giữ ở gốc repository (`.`).
3. `vercel.json` đã cấu hình bỏ qua bước cài đặt và build, xuất website từ thư mục gốc. Không cần biến môi trường.
4. Nhấn **Deploy**. Mở URL được Vercel cấp để xem dashboard; thêm `#units` để vào tab So sánh đơn vị.

Sau khi kết nối GitHub, các lần push tiếp theo lên nhánh production `main` sẽ cập nhật bản deploy.

Cấu hình tham chiếu: https://vercel.com/docs/project-configuration/vercel-json và https://vercel.com/docs/builds/configure-a-build.
