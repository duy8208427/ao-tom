# Nguồn dữ liệu bản đồ 3D ao tôm

Nguồn: [PCTomCa](https://iot.clb4u.com/) (tài khoản admin đã xem ngày 19/10/2026) và video giao diện Enfarm (`d:\New folder\Enfarm.mp4`).

## Giao diện Enfarm cần bắt chước

- Bản đồ vệ tinh nghiêng (góc nhìn 3D), thanh tìm kiếm giữa trên, logo góc trái, chuyển ngôn ngữ góc phải.
- Ghim trang trại phát sáng; khi zoom xa thấy cụm điểm, khi zoom gần thấy nhãn tên.
- Hover: thẻ nổi với ảnh, tên, địa chỉ, diện tích, loại, vài chỉ số mới nhất (màu đạt/cảnh báo).
- Click: bảng phải với đồng hồ đo (vùng xanh an toàn / đỏ ngoài ngưỡng) và biểu đồ lịch sử theo mốc thời gian.
- Mini-map góc phải dưới, nút zoom / la bàn / lớp bản đồ.

## Menu PCTomCa liên quan ao tôm

- Dashboard: `https://iot.clb4u.com/users/dashboard/index.html` và `https://iot.clb4u.com/default/index/index.html`
- Realtime: `/iot/realtime_dashboard/index.html`
- Số liệu đo: `/iot/report/index.html`
- Cảnh báo: `/iot/alerts/index.html`
- Bản đồ thiết bị: `/iot/map_devices/index.html`
- Quản lý thiết bị: `/iot/viewdevice/index.html`
- Danh sách ao: `/ponds/ponds/index.html`
- Công việc: `/ponds/tasks/index.html`
- Báo cáo tổng hợp ao: `/ponds/report/index.html`
- Tham số môi trường: `/iot/viewparam/index.html`

Không đưa vào bản đồ 3D: điều khiển thiết bị từ xa, đếm tôm trong ảnh, chẩn đoán sức khỏe tôm.

## API

| Việc | Phương thức | Đường dẫn | Ghi chú |
| --- | --- | --- | --- |
| Đăng nhập | POST form | `/users/login/index.html` | `username`, `password` |
| Danh sách ao | POST | `/api/ponds/index.html` | `action=list` |
| Chi tiết ao | POST | `/api/ponds/index.html` | `action=get&id=` |
| Realtime | GET | `/api/realtime/{deviceCode}/index.html` | 18 chỉ số, `status` OK/HIGH/LOW |
| Tham số | GET | `/api/get_params/index.html` | mã, tên, đơn vị |
| Lịch sử đo | POST JSON | `/api/report/index.html` | `param_code`, `device_code`, `date_from`, `date_to` — trả về mốc `alert_time` / `measured_value` |
| Công việc | POST | `/api/tasks/index.html` | `action=list` |
| Thiết bị | HTML | `/iot/viewdevice/index.html` | bảng ID, mã, tên, ao, vị trí, lat, lng |
| Báo cáo ao | POST form | `/ponds/report/index.html` | `pond_id` |
| Cảnh báo | HTML | `/iot/alerts/index.html` | thiết bị, chỉ số, mức, nội dung, thời gian |

Tọa độ nằm ở thiết bị, không nằm ở hồ sơ ao. Hai ao chưa gán tủ (`POND0002` Tân Thành, `p0009` Vĩnh Long) dùng tọa độ ước lượng theo địa danh.

## Hover (thẻ tóm tắt)

Tên ao, mã ao, vị trí, diện tích, thể tích, DO / pH / nhiệt độ / độ mặn, thời điểm đo mới nhất, màu trạng thái.

## Click (bảng chi tiết)

Hồ sơ ao, danh sách tủ, đồng hồ 18 chỉ số theo ngưỡng, cảnh báo, biểu đồ lịch sử (1 ngày / 1 tuần / 1 tháng), chất lượng nước trung bình Đạt/Vượt ngưỡng, số lần cho ăn, tần suất thay nước, chi phí thức ăn/hóa chất, công việc ao.

## File dữ liệu đã lưu

- `data/ponds.json`
- `data/devices.json` (không lưu API key thiết bị)
- `data/parameters.json`
- `data/pond-aoahung01-report.json`

Không lưu mật khẩu, cookie phiên, khóa OpenWeather, hay API key thiết bị.
