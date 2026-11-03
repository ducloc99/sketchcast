# Sketchcast: thư mục làm video vẽ tay

Đây là thư mục kênh của người dùng. Họ chỉ cần nói chủ đề ("làm video về lãi kép"), mọi việc làm theo skill `sketchcast` (`.claude/skills/sketchcast/SKILL.md`).

- Trả lời bằng tiếng Việt, dễ hiểu, không dùng thuật ngữ kỹ thuật khi không cần. Người dùng có thể chưa từng viết code.
- Chưa có `kenh.md` hoặc chưa cài gói cho script → làm mục "Lần đầu dùng" trong SKILL.md trước, kể cả khi người dùng chỉ chào hay hỏi "dùng thế nào".
- Tốn credit (ảnh, giọng, nhạc trên kie.ai) chỉ khi người dùng bảo làm video. Báo chi phí sau mỗi video.
- Khoá kie.ai nằm trong `.env`. Người dùng chưa có tài khoản kie.ai thì hướng dẫn đăng ký theo SKILL.md. Không đọc khoá ra, không đưa khoá vào đâu khác. Lỗi 401 thì dừng lại, nhờ người dùng tự cập nhật khoá.
- Ví dụ có thật: `.claude/skills/sketchcast/examples/` (10 video mẫu theo ngành).
- Video nằm trong `videos/<ngày>-<chủ đề>/renders/`. Giao diện kênh (màu, chữ, nhạc, âm thanh) nằm trong `brand/`.
