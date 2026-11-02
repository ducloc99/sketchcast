# Viết kịch bản (script.json)

## Độ dài
- Video dài: 3,5–5 phút, khoảng 800–1.150 âm tiết (giọng kể vừa phải ≈ 3,8 âm tiết/giây). 7–9 cảnh, mỗi cảnh 20–40 giây, một ý.
- Video ngắn (Reel, TikTok, giới thiệu sản phẩm): 25–60 giây, 2–4 cảnh.
- Đếm âm tiết trước khi gọi giọng đọc. Dài quá thì cắt ý, đừng nói nhanh.

## Câu đầu tiên quyết định tất cả
- Câu 0 của cảnh s1 là câu móc, được đọc trong lúc trang mở đầu (`hook`) đang hiện. Tối đa khoảng 12 chữ, cụ thể, có con số hoặc một sự trái ngược.
- Kiểu câu móc (ghi kiểu đã dùng vào `notes.md` của video). Các câu dưới chỉ minh hoạ **hình dạng** câu, **không phải dữ kiện**: số và chuyện trong video chỉ lấy từ research.md.
  - **Câu hỏi "ai, vì sao"**: "Ai bắt bạn làm tám tiếng một ngày?"
  - **Hoài niệm cụ thể**: "Năm <năm>, muốn xin việc, bạn phải <việc cũ ai cũng nhớ>."
  - **Sự thật ngược**: "<việc ai cũng tin là an toàn>, nhưng <điều ngược lại có nguồn>."
  - **Con số sốc**: "<con số có nguồn> người đi làm đã <làm gì>. Nhưng..."
  - **Kết quả trước**: "<một người bình thường> đã <kết quả bất ngờ có nguồn>."
- Không bao giờ mở bằng chào hỏi, giới thiệu kênh, "hôm nay chúng ta sẽ...".

## Cách nói
- Như kể cho bạn nghe: câu ngắn, mỗi câu một ý, chữ đời thường. Mỗi câu kết thúc bằng `.` `?` `!` (câu là mốc thời gian cho hình).
- Số và năm viết bằng chữ khi có thể đọc sai ("năm một nghìn chín trăm hai mươi sáu", "chín mươi ba phần trăm"). Phụ đề sẽ hiện đúng như chữ viết.
- Hạn chế chữ tiếng Anh giữa câu (làm giọng bị trôi). Tên sản phẩm thì để đầu câu.
- Con số nào cũng nói ai công bố: "theo khảo sát của...", "Bộ luật Lao động quy định...". Điều chưa chắc nói rõ "chưa chắc", "có thể".
- Cấm: "Bạn có biết", "Hãy cùng", "khám phá", "bí mật", "đột phá", "cách mạng", "siêu", "đừng bỏ lỡ", "không chỉ... mà còn", "hành trình", "chìa khoá", "bùng nổ", "thay đổi cuộc chơi", chuỗi câu hỏi tu từ, câu nào cũng ba vế.

## Khung, chặng, cách kết
- Tự đặt khung và 2–4 chặng hợp nội dung ngay trong script.json (ví dụ: đang xảy ra → nghĩa là gì → làm gì). Kênh có khung riêng ghi trong `kenh.md` thì theo khung đó.
- **Giọng chung**: bình tĩnh, trấn an bằng sự thật, không doạ, không tung hô. Mỗi video phải trả lời được: điều gì đáng lo, điều gì không cần lo, mình nên làm gì.
- **Chuyện lịch sử** ("ngày ấy"): mỗi cảnh lịch sử có ít nhất một chi tiết giác quan cụ thể (tiếng modem, mùi giấy báo, cái thẻ cào). Mỗi cảnh "bây giờ" có ít nhất một mẹo làm được ngay. Mỗi cảnh "sắp tới" nêu một tín hiệu có thật hôm nay (sản phẩm, thí nghiệm, luật, số liệu) trước khi đoán. Ba kịch bản tương lai: mỗi kịch bản bám vào một tín hiệu trong research.md, nói "có thể"; dự đoán của người nổi tiếng thì nói "X cho rằng", không coi là bằng chứng.
- **Cảnh cuối**: cách kết trong `kenh.md` + một câu hỏi về chính người xem + một lời mời theo dõi gắn với lời hứa kênh (ví dụ "Theo dõi <tên kênh>, mỗi tuần mình cùng nhau đi hết một câu hỏi."). Chỉ một lời kêu gọi.

## script.json
```json
{
 "title": "Ai bắt bạn làm 8 tiếng?",
 "stages": [{ "key": "happening", "label": "Đang xảy ra" }, { "key": "meaning", "label": "Nghĩa là gì" }, { "key": "action", "label": "Làm gì" }],
 "year0": 2026,
 "hook": { "text": "Ai bắt bạn\nlàm 8 tiếng?", "until": [1, 0], "obj": "<id một đồ vật trong objects.json, không bắt buộc>" },
 "teaser": { "title": "Ai nghĩ ra\n8 tiếng làm việc?", "cta": "Xem bản đầy đủ\ntrên trang nhé" },
 "voice": { "name": "Leda", "temperature": 0.35, "style": "Nói tiếng Việt tự nhiên như một người anh chị hiểu chuyện đang kể cho bạn nghe, giọng miền Nam ấm, bình tĩnh, tò mò, rõ chữ, nhịp vừa, không đọc như phát thanh viên. Giữ một giọng và một cảm xúc từ đầu đến cuối." },
 "scenes": [
  { "id": "s1", "title": "Mở đầu", "text": "Ai bắt bạn làm tám tiếng một ngày? ..." },
  { "id": "s2", "title": "Nhà máy ngày ấy", "year": 1914, "yearLabel": "Ngày ấy", "text": "..." },
  { "id": "s5", "title": "Bây giờ", "year": 2026, "text": "..." },
  { "id": "s7", "title": "Mười năm nữa", "year": 2035, "text": "..." }
 ]
}
```
- `stages`: các chặng của video; bỏ trống thì không có dải chặng.
- `hook.text`: 2 dòng, mỗi dòng ≤ 14 ký tự (cỡ chữ 124 trên trang). `until`: [câu, giây] lúc trang mở đầu lật đi (thường câu 1 của s1). `obj` (không bắt buộc): một đồ vật đứng cạnh câu móc, thường là đồ vật chính của video.
- `year`: chỉ ghi ở cảnh kể lịch sử hay tương lai; năm khác năm trước → hiệu ứng tua năm (giọng đọc tự chờ 1,4 giây). `yearLabel`: chữ nhỏ phía trên số năm (không bắt buộc). `year0` = năm hiện tại (điểm bắt đầu tua).
- `stage` và `paper` của từng cảnh ghi trong scenes.json (xem `dan-canh.md`).
- `teaser.title`: câu hỏi gây tò mò cho bản dọc (2 dòng ngắn); `teaser.cta`: câu cuối bản dọc.
