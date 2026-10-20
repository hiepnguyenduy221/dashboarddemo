"""Định nghĩa dữ liệu đầu vào của dashboard — nguồn duy nhất cho template Excel,
script import và tài liệu.

Nguyên tắc: chỉ nhận số gốc. Mọi chỉ tiêu tính lại được (lũy kế tháng, AUM,
Δ phiên trước, BQ, tổng toàn công ty, tỷ lệ…) do app.js tính, không nhập.

Mỗi cột: (mã, kiểu, đơn vị, bắt buộc, mô tả).
Kiểu: date | text | int | num | enum:<a>|<b> | flag (x = có)
"""

COMPANY = "Toàn công ty"
UNASSIGNED_UNIT = ""  # PHONG: để trống đơn vị = nhân sự chưa gắn trung tâm
ABCD_GROUPS = ["A", "B", "C", "D", "NAV_AM"]
PKKH_SEGMENTS = [
    "Dormant", "Mass", "Active Trader", "HVT", "HNW", "UHNW", "Block Deal (BD)",
    "Zero", "Unclassified", "Other",
]
CHANNELS = ["MG", "Digital", "Khác"]

META_KEYS = [
    ("ngay_bao_cao", "date", True, "Ngày dữ liệu kinh doanh (phiên cuối trong sheet NGAY)."),
    ("ngay_chot_kh", "date", True, "Ngày chốt tổng KH và luồng KH mới (sheet KH)."),
    ("ngay_gan_nhan", "date", True, "Ngày gán nhãn A–D và PKKH (thường là cuối tháng trước)."),
    ("ngay_hieu_qua_abcd", "date", True, "Ngày đo quy mô/hiệu quả A–D (sheet ABCD)."),
    ("abcd_tuan_tu_ngay", "date", True, "Ngày bắt đầu giai đoạn 'riêng tuần' của A–D; kết thúc tại ngay_hieu_qua_abcd."),
    ("ngay_hieu_qua_pkkh", "date", True, "Ngày đo hiệu quả PKKH (sheet PKKH)."),
    ("ngay_chot_nhan_su", "date", True, "Ngày chốt cây nhân sự và DTPN MG/CTV (sheet PHONG)."),
    ("ngay_nhan_su_ky_truoc", "date", True, "Mốc so sánh số MG/CTV (thường là cuối tháng trước)."),
    ("nguon_kinh_doanh", "text", False, "Tên nguồn số kinh doanh (sheet NGAY, KY)."),
    ("nguon_kh", "text", False, "Tên nguồn KH / luồng KH mới (sheet KH)."),
    ("nguon_abcd", "text", False, "Tên nguồn nhãn A–D (sheet ABCD)."),
    ("nguon_pkkh", "text", False, "Tên nguồn phân khúc PKKH (sheet PKKH)."),
    ("nguon_nhan_su", "text", False, "Tên nguồn cây nhân sự / DTPN MG-CTV (sheet PHONG)."),
]

SHEETS = [
    {
        "name": "THONG_TIN",
        "title": "Ngày chốt và tên nguồn",
        "grain": "Một dòng mỗi khóa (danh sách khóa cố định).",
        "key": ["khoa"],
        "columns": [
            ("khoa", "text", "", True, "Mã khóa — không sửa."),
            ("gia_tri", "any", "", True, "Ngày ghi dd/mm/yyyy; nguồn ghi tên file/báo cáo."),
            ("mo_ta", "text", "", False, "Diễn giải — không cần sửa."),
        ],
    },
    {
        "name": "DON_VI",
        "title": "Danh mục đơn vị",
        "grain": "Một dòng mỗi đơn vị kinh doanh. Tên ở đây là tên duy nhất dùng trong mọi sheet.",
        "key": ["ten_don_vi"],
        "columns": [
            ("ten_don_vi", "text", "", True, "Tên hiển thị, ví dụ 'HCM', 'Hoàn Kiếm'. Không dùng 'Toàn công ty'."),
            ("kenh", "enum:" + "|".join(CHANNELS), "", True, "Kênh mở KH: MG, Digital hoặc Khác."),
            ("thu_tu", "int", "", False, "Thứ tự trong bộ lọc; để trống thì theo thứ tự dòng."),
        ],
    },
    {
        "name": "NGAY",
        "title": "Chuỗi theo phiên",
        "grain": "Một dòng mỗi (phiên, đơn vị) từ đầu tháng đến ngay_bao_cao; thêm dòng đơn vị 'Toàn công ty'.",
        "key": ["ngay", "don_vi"],
        "columns": [
            ("ngay", "date", "", True, "Ngày phiên giao dịch."),
            ("don_vi", "unit+company", "", True, "Tên đơn vị trong DON_VI hoặc 'Toàn công ty'."),
            ("kh_mo_moi", "int", "KH", False, "Số KH mở mới trong ngày."),
            ("gtgd", "num", "tỷ đồng", False, "Giá trị giao dịch trong ngày."),
            ("phi_net", "num", "triệu đồng", False, "Doanh thu phí net trong ngày."),
            ("thi_phan_ngay", "num", "%", False, "Thị phần trong ngày (ví dụ 2,41 = 2,41%)."),
            ("thi_phan_bq_luy_ke", "num", "%", False, "Thị phần bình quân lũy kế từ đầu tháng đến ngày này."),
            ("du_no", "num", "tỷ đồng", False, "Dư nợ cuối ngày (không gồm KH nợ xấu)."),
            ("nav", "num", "tỷ đồng", False, "NAV cuối ngày."),
            ("nap_rut_rong", "num", "tỷ đồng", False, "Nạp − rút trong ngày (âm = rút ròng)."),
            ("gtgd_thi_truong", "num", "tỷ đồng", False, "GTGD toàn thị trường; chỉ điền ở dòng 'Toàn công ty'."),
        ],
    },
    {
        "name": "KY",
        "title": "Chỉ tiêu kỳ & chi tiết ngày báo cáo",
        "grain": "Một dòng mỗi đơn vị + 'Toàn công ty', tại ngay_bao_cao.",
        "key": ["don_vi"],
        "columns": [
            ("don_vi", "unit+company", "", True, "Tên đơn vị hoặc 'Toàn công ty'."),
            ("thi_phan_ke_hoach", "num", "%", False, "Thị phần kế hoạch tháng."),
            ("gtgd_cung_ky", "num", "tỷ đồng", False, "GTGD lũy kế cùng kỳ tháng trước (cùng số phiên)."),
            ("phi_cung_ky", "num", "triệu đồng", False, "Phí net lũy kế cùng kỳ tháng trước."),
            ("thi_phan_cung_ky", "num", "%", False, "Thị phần BQ cùng kỳ tháng trước."),
            ("thi_phan_hose", "num", "%", False, "Thị phần BQ tháng trên HOSE."),
            ("thi_phan_hnx", "num", "%", False, "Thị phần BQ tháng trên HNX."),
            ("thi_phan_upcom", "num", "%", False, "Thị phần BQ tháng trên UPCOM."),
            ("thi_phan_hose_cung_ky", "num", "%", False, "Thị phần HOSE cùng kỳ tháng trước."),
            ("thi_phan_hnx_cung_ky", "num", "%", False, "Thị phần HNX cùng kỳ tháng trước."),
            ("thi_phan_upcom_cung_ky", "num", "%", False, "Thị phần UPCOM cùng kỳ tháng trước."),
            ("du_no_margin", "num", "tỷ đồng", False, "Dư nợ margin thuần cuối ngày báo cáo."),
            ("du_no_ung_truoc", "num", "tỷ đồng", False, "Dư nợ ứng trước cuối ngày báo cáo."),
            ("du_no_3_ben", "num", "tỷ đồng", False, "Dư nợ 3 bên cuối ngày báo cáo."),
            ("tien_nap", "num", "tỷ đồng", False, "Tiền nạp trong ngày báo cáo."),
            ("tien_rut", "num", "tỷ đồng", False, "Tiền rút trong ngày báo cáo."),
            ("so_kh_nap", "int", "KH", False, "Số KH nạp tiền trong ngày báo cáo."),
            ("so_kh_rut", "int", "KH", False, "Số KH rút tiền trong ngày báo cáo."),
            ("dieu_chuyen_noi_bo", "num", "tỷ đồng", False, "Điều chuyển nội bộ lũy kế tháng (tách khỏi dòng tiền ngoài)."),
        ],
    },
    {
        "name": "KH",
        "title": "Khách hàng & KH mới",
        "grain": "Một dòng mỗi đơn vị, tại ngay_chot_kh. Toàn công ty = tổng các dòng.",
        "key": ["don_vi"],
        "columns": [
            ("don_vi", "unit", "", True, "Tên đơn vị trong DON_VI."),
            ("tong_kh", "int", "KH", True, "Tổng KH hiện tại của đơn vị."),
            ("kh_moi_nop_tien", "int", "KH", False, "Trong KH mở mới tháng: số KH đã nộp tiền."),
            ("kh_moi_khop_lenh", "int", "KH", False, "Trong KH mở mới tháng: số KH đã khớp lệnh."),
            ("nav_kh_moi", "num", "tỷ đồng", False, "NAV của tệp KH mở mới tháng."),
            ("du_no_kh_moi", "num", "tỷ đồng", False, "Dư nợ của tệp KH mở mới tháng."),
            ("gtgd_kh_moi", "num", "tỷ đồng", False, "GTGD lũy kế tháng của tệp KH mở mới."),
            ("phi_kh_moi", "num", "triệu đồng", False, "Phí net lũy kế tháng của tệp KH mở mới."),
        ],
    },
    {
        "name": "PHONG",
        "title": "Nhân sự & kết quả theo phòng",
        "grain": "Một dòng mỗi phòng, tại ngay_chot_nhan_su. Đơn vị và toàn công ty = tổng các phòng.",
        "key": ["don_vi", "ma_phong"],
        "columns": [
            ("don_vi", "unit+blank", "", False, "Tên đơn vị; để trống nếu nhân sự chưa gắn trung tâm."),
            ("ma_phong", "text", "", True, "Mã phòng, duy nhất trong đơn vị."),
            ("ten_phong", "text", "", True, "Tên phòng."),
            ("truong_phong", "text", "", False, "Họ tên trưởng phòng."),
            ("chua_phan_phong", "flag", "", False, "Ghi x nếu dòng gom nhân sự chưa phân phòng."),
            ("so_mg", "int", "người", False, "Số MG tại ngày chốt."),
            ("so_ctv", "int", "người", False, "Số CTV tại ngày chốt."),
            ("so_khac", "int", "người", False, "Số nhân sự loại khác (OTHER), không gộp vào MG/CTV."),
            ("so_mg_ky_truoc", "int", "người", False, "Số MG tại ngay_nhan_su_ky_truoc."),
            ("so_ctv_ky_truoc", "int", "người", False, "Số CTV tại ngay_nhan_su_ky_truoc."),
            ("dtpn_mg", "num", "triệu đồng", False, "DTPN lũy kế tháng do MG mang về."),
            ("dtpn_ctv", "num", "triệu đồng", False, "DTPN lũy kế tháng do CTV mang về."),
            ("dtpn_chua_phan_loai", "num", "triệu đồng", False, "DTPN lũy kế tháng chưa xác định MG/CTV."),
            ("dtpn_cung_ky", "num", "triệu đồng", False, "DTPN lũy kế cùng kỳ tháng trước của phòng."),
            ("du_no_bq", "num", "tỷ đồng", False, "Dư nợ bình quân tháng."),
            ("gtgd_thang", "num", "tỷ đồng", False, "GTGD lũy kế tháng."),
            ("nav", "num", "tỷ đồng", False, "NAV cuối ngày."),
            ("kh_mo_moi", "int", "KH", False, "KH mở mới lũy kế tháng."),
            ("kh_moi_nop_tien", "int", "KH", False, "KH mới đã nộp tiền."),
            ("kh_moi_khop_lenh", "int", "KH", False, "KH mới đã khớp lệnh lần đầu."),
            ("kh_cu", "int", "KH", False, "Tổng KH cũ."),
            ("kh_cu_khop_lenh", "int", "KH", False, "KH cũ có khớp lệnh trong tháng."),
            ("suc_mua", "num", "tỷ đồng", False, "Sức mua khả dụng."),
        ],
    },
    {
        "name": "ABCD",
        "title": "Nhãn KH cũ A–D",
        "grain": "Một dòng mỗi (đơn vị, nhóm A/B/C/D/NAV_AM). Toàn công ty = tổng các đơn vị.",
        "key": ["don_vi", "nhom"],
        "columns": [
            ("don_vi", "unit", "", True, "Tên đơn vị trong DON_VI (đơn vị quản lý tại ngay_gan_nhan)."),
            ("nhom", "enum:" + "|".join(ABCD_GROUPS), "", True, "A/B/C/D; NAV_AM = KH NAV âm (nhãn chồng, chỉ điền so_kh_hien_tai)."),
            ("so_kh_chot", "int", "KH", False, "Số KH của nhóm tại ngay_gan_nhan."),
            ("so_kh_hien_tai", "int", "KH", True, "Số KH của nhóm tại ngay_hieu_qua_abcd."),
            ("kh_khop_thang", "int", "KH", False, "Số KH có khớp lệnh lũy kế tháng."),
            ("nav_hien_tai", "num", "tỷ đồng", False, "NAV hiện tại của nhóm."),
            ("nav_bq_thang_truoc", "num", "tỷ đồng", False, "NAV bình quân tháng trước."),
            ("tien_mat_hien_tai", "num", "tỷ đồng", False, "Tiền mặt hiện tại (chỉ cộng số dư dương)."),
            ("tien_mat_bq_thang_truoc", "num", "tỷ đồng", False, "Tiền mặt bình quân tháng trước."),
            ("gtgd_luy_ke", "num", "tỷ đồng", False, "GTGD lũy kế tháng."),
            ("gtgd_thang_truoc", "num", "tỷ đồng", False, "GTGD cả tháng trước."),
            ("phi_luy_ke", "num", "triệu đồng", False, "Phí net lũy kế tháng."),
            ("phi_thang_truoc", "num", "triệu đồng", False, "Phí net cả tháng trước."),
            ("kh_khop_tuan", "int", "KH", False, "Số KH khớp lệnh trong giai đoạn tuần."),
            ("gtgd_tuan", "num", "tỷ đồng", False, "GTGD trong giai đoạn tuần."),
            ("phi_tuan", "num", "triệu đồng", False, "Phí net trong giai đoạn tuần."),
        ],
    },
    {
        "name": "PKKH",
        "title": "Phân khúc KH (PKKH)",
        "grain": "Một dòng mỗi (đơn vị, phân khúc), nhãn và đơn vị cố định tại ngay_gan_nhan. Toàn công ty = tổng.",
        "key": ["don_vi", "phan_khuc"],
        "columns": [
            ("don_vi", "unit", "", True, "Tên đơn vị trong DON_VI."),
            ("phan_khuc", "enum:" + "|".join(PKKH_SEGMENTS), "", True, "Tên phân khúc."),
            ("so_kh", "int", "KH", True, "Số KH gắn nhãn đầu tháng."),
            ("kh_khop_thang", "int", "KH", False, "Số KH có khớp lệnh lũy kế tháng."),
            ("nav_hien_tai", "num", "tỷ đồng", False, "NAV tại ngay_hieu_qua_pkkh."),
            ("nav_bq_thang_truoc", "num", "tỷ đồng", False, "NAV bình quân tháng trước."),
            ("du_no_hien_tai", "num", "tỷ đồng", False, "Dư nợ tại ngay_hieu_qua_pkkh."),
            ("du_no_bq_thang_truoc", "num", "tỷ đồng", False, "Dư nợ bình quân tháng trước."),
            ("gtgd_luy_ke", "num", "tỷ đồng", False, "GTGD lũy kế tháng."),
            ("gtgd_thang_truoc", "num", "tỷ đồng", False, "GTGD cả tháng trước."),
            ("phi_luy_ke", "num", "triệu đồng", False, "Phí net lũy kế tháng."),
            ("phi_thang_truoc", "num", "triệu đồng", False, "Phí net cả tháng trước."),
        ],
    },
]

SHEET_BY_NAME = {s["name"]: s for s in SHEETS}


def column_codes(sheet):
    return [c[0] for c in sheet["columns"]]
