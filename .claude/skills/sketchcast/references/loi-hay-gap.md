# Lỗi hay gặp và cách xử lý

Gặp lỗi mới khi làm video thì ghi thêm vào đây (ngày, lỗi, cách sửa), để lần sau không vấp lại.

- 2026-10-21: font Patrick Hand (cũ) không có ký tự "→": dùng item `arrow`. 2026-10-22: đổi sang Be Vietnam Pro (rộng hơn ~1,4 lần), bù bằng `textScale` 0.74 trong style.json.
- 2026-10-21: Facebook tự phát video không tiếng, nên khung hình đầu và trang mở đầu (`hook`) quyết định người xem có dừng lại hay không. Câu móc phải đọc được ngay ở giây 0.
- 2026-10-21: số đếm (`count`) phải chờ tay vẽ xong thứ trước, nếu không thì bị bàn tay che (đã sửa trong compose.mjs).
- 2026-10-21: bản dọc là một project riêng trong thư mục `teaser/` (một project chỉ được có một composition gốc). Render bằng `npx hyperframes render teaser ...`.
- 2026-10-21: kie.ai báo lỗi 401 nghĩa là khoá hết hạn: dừng lại, nhờ người dùng tự cập nhật khoá trong file `.env` của kênh.
- 2026-10-21 (research): Voz chặn truy cập tự động (403), vbpl.moj.gov.vn không vào được: dùng bản đăng lại của văn bản luật (thuvienphapluat.vn, caselaw.vn) và phỏng vấn trên báo.
- 2026-10-21 (research): ghi chú có sẵn có thể sai (ví dụ nhập hai mốc năm làm một: Ford 8 giờ/ngày là 1914, tuần 40 giờ là 1926). Luôn kiểm lại.
- 2026-10-22: kie.ai không tải được ảnh gốc lớn trên Wikimedia (lỗi 1013): gen-objects tự dùng ảnh thu nhỏ 960px.
- 2026-10-22: dòng đăng ký timeline phải giữ đúng dạng `window.__timelines["main"] = tl;` (viết gộp kiểu khác thì bộ kiểm tra của HyperFrames báo không thấy timeline).
- 2026-10-22: cảnh nhiều thứ hơn thời gian lời nói thì nét vẽ bị trang lật cắt ngang: compose.mjs giờ tự vẽ nhanh hơn ở cuối cảnh và in WARNING; thấy WARNING thì bớt thứ, thêm maxDur hoặc nói thêm.
- 2026-10-22: đồ vật lớn hơn 1600px làm trang nặng (ảnh 4,6 MB): gen-objects tự thu nhỏ.
- 2026-10-22: logo dạng chữ (wordmark) đặt theo chiều cao dễ dính nhau: đặt theo `w` (bề rộng).
- 2026-10-22: máy quay đẩy vào làm nội dung gần mép trên lấn vào dải chặng: cảnh có tiêu đề cao thì đừng đẩy máy quay.
- 2026-10-22: mô hình vẽ ảnh (GPT Image qua kie.ai) từ chối vẽ chân dung Donald Trump và Elon Musk (6 lần, lỗi 1013), trong khi Jensen Huang, Sam Altman, Keynes vẽ được. Chính trị gia và vài người rất nổi tiếng có thể bị chặn: khi đó kể bằng mẩu báo thật (`get-image.mjs shot`), trích dẫn và tên viết tay thay cho chân dung; không cố lách.
- 2026-10-22: ảnh gốc Wikimedia lớn hơn khoảng 3 MB và vài ảnh thu nhỏ bị kie.ai báo 1013: thử ảnh gốc nhỏ hơn hoặc ảnh khác của cùng người.
- 2026-10-22: Trump và Putin vẽ được bằng google/nano-banana-edit (kie.ai, khoảng 4 credit/ảnh) với ảnh Wikipedia làm mẫu (image_urls), nét mực rõ, giống người thật; GPT Image vẫn từ chối. Ảnh ra 1344x768, phóng lên 1920 vẫn ổn cho cảnh vẽ tay.
