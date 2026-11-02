# Bộ âm thanh hiệu ứng

Mở từng file mp3 trong thư mục này để nghe thử.
Cách dùng trong video: thêm `"sfx": "<tên>"` vào một món trong `scenes.json`, tiếng sẽ phát lúc món đó hiện ra (`"sfxAt": 0.5` để trễ nửa giây). Độ to từng tiếng chỉnh ở `sfxGain` trong `brand/style.json`.

## Tự có (video nào cũng phát, không cần ghi)
| Tên | Khi nào |
|---|---|
| scribble | Bút đang vẽ nét |
| whoosh | Lật sang trang mới |
| pop | Đồ vật hoặc ảnh bật ra |
| tick | Số đang đếm lên |
| rewind | Tua năm (về quá khứ, tới tương lai) |

## Ghi vào kịch bản khi cần
| Tên | Khi nào | Ví dụ |
|---|---|---|
| stamp | Con dấu đập xuống trang | "NÓI QUÁ", "ĐÚNG MỘT NỬA" |
| ding | Đúng, hoặc ý chính hiện ra | Đáp án sau câu "bạn đoán xem" |
| sparkle | Con số hay chữ quan trọng hiện lên | "48 giờ mỗi tuần" |
| wrong | Sai, tin không đúng | Tiêu đề giật gân bị gạch |
| boing | Nhân vật nhảy vào khung hình | Mở video, nhân vật xuất hiện |
| riser | Dồn lên trước khi lật đáp án (1,6 giây) | Ngay trước "ding" |
| paper | Lật một tờ giấy, lật thẻ | Rút tài liệu ra khỏi hồ sơ |
| marker | Bút dạ khoanh tròn, gạch chân | Khoanh dòng trong mẩu báo |
| coin | Tiền, giá cả, lương | "5 đô một ngày" |
| typing | Gõ phím (1,2 giây) | Chủ đề máy tính, AI |
| shutter | Chụp lại bằng chứng | Ảnh chụp trang web hiện ra |
| zoom | Kính lúp phóng to, máy quay đẩy vào | Soi một chi tiết |
| tada | Chốt lại, kết luận | Đoạn kết "chỗ đứng" |

Mỗi video nên dùng ít thôi: một tiếng riêng cho mỗi khoảnh khắc đáng nhớ, không phải mọi câu.

## Nguồn
- 15 tiếng (13 tiếng trong bảng thứ hai, cùng whoosh và pop) được tạo hoàn toàn bằng code (`make-sfx.mjs`), không tải về, không lo bản quyền. Chạy lại `node make-sfx.mjs` trong thư mục này ra đúng các file như cũ. Muốn sửa tiếng nào thì sửa hàm của tiếng đó trong file.
- scribble, tick lấy từ freesound.org (CC0, không cần ghi nguồn), rewind tạo bằng ffmpeg (xem `assets/CREDITS.md` của skill).
