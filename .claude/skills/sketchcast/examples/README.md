# Video mẫu (10 ngành)

Đây là các file kế hoạch của 10 video mẫu trên trang GitHub, mỗi video khoảng 30 giây. Xem video tại https://github.com/ducloc99/sketchcast/releases/tag/v1.0.0

| Thư mục | Ngành | Tiêu đề | Bút |
|---|---|---|---|
| `giao-duc` | Giáo dục | Vì sao bầu trời màu xanh? | bàn tay |
| `tai-chinh` | Tài chính | Lãi kép: tiền đẻ ra tiền | bàn tay |
| `y-te` | Y tế | Vắc-xin hoạt động thế nào? | đốm sáng |
| `bat-dong-san` | Bất động sản | Vay mua nhà: hỏi 3 câu | đốm sáng |
| `luat` | Luật, nhân sự | Thử việc: luật nói gì? | bàn tay |
| `ban-hang` | Bán hàng online | Vì sao bình giữ nhiệt giữ nóng lâu? | đốm sáng |
| `doanh-nghiep` | Doanh nghiệp | Khách phàn nàn: 3 bước xử lý | bàn tay |
| `du-lich` | Du lịch | Vịnh Hạ Long có gì đặc biệt? | đốm sáng |
| `tin-tuc` | Tin tức | Ai bắt bạn làm 8 tiếng? | đốm sáng |
| `cong-nghe` | Công nghệ | Mật khẩu mạnh trông thế nào? | bàn tay |

Mỗi thư mục có:
- `script.json`: lời đọc từng cảnh, câu móc, giọng đọc (`references/kich-ban.md`)
- `objects.json`: các đồ vật cần vẽ và câu mô tả gửi cho AI vẽ
- `scenes.json`: bố cục từng cảnh (vị trí, cỡ, lúc xuất hiện, khoanh, gạch chân, máy quay) (`references/dan-canh.md`)
- `style.json`: giao diện đã dùng (màu, bút, phong cách vẽ màu nước đậm)
- `demo.json`: ngành và người nên dùng

**Dùng để làm gì:** trước khi viết `script.json`, `objects.json`, `scenes.json` cho video mới, đọc 1–2 ví dụ gần chủ đề nhất để làm đúng định dạng và nhịp. Video mẫu ngắn (3 cảnh); video dài làm theo cùng cách, chỉ nhiều cảnh hơn. Muốn video mới trông giống một mẫu thì chép `prompt`, `pen`, `accent` trong `style.json` của mẫu đó sang `style.json` của video.

**`ban-hang` có đủ hình, giọng và mốc thời gian**, dựng lại được mà không tốn credit. Dùng để thử máy đã cài đủ chưa (xem "Lần đầu dùng" trong `SKILL.md`).
