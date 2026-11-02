# Chấm kịch bản và chấm video

## Chấm kịch bản (trước khi tốn credit)
Gọi một subagent (Agent, general-purpose) với **chỉ** lời thoại (không đưa research, không giải thích ý đồ) và vai sau:

> Bạn là <người xem của kênh, lấy từ mục "Nói chuyện với ai" trong `kenh.md`; không có thì: người Việt 25 tuổi, làm văn phòng>, đang lướt mạng xã hội lúc nghỉ trưa, video đang tắt tiếng và chỉ đọc phụ đề. Bạn chưa từng nghe tên kênh này. Đọc kịch bản như nghe một lần rồi trả lời:
> 1. Video nói gì, trong 1 câu. 2. Câu đầu tiên có làm bạn dừng lướt không, vì sao (chấm 1–5). 3. Câu nào khó hiểu, phải đọc lại. 4. Câu nào thừa, lạc đề, nghe như quảng cáo, như doạ dẫm, hay như máy viết. 5. Bạn học được điều gì mới không (chấm 1–5). 6. Xem xong bạn thấy yên tâm hơn và biết mình nên làm gì không, hay lo hơn (chấm 1–5, 1 = lo hơn). 7. Có muốn gửi cho ai không, ai, vì sao (chấm 1–5). 8. Chỗ nào bạn sẽ lướt đi.

Tự kiểm thêm: mọi con số và mốc năm có trong research.md; độ dài hợp lý; có đoạn kết theo `kenh.md`; một lời kêu gọi; không chữ cấm (`kich-ban.md`).

**Đạt** khi: câu móc ≥ 4, học được ≥ 4, yên tâm và biết làm gì ≥ 4, muốn gửi ≥ 3, câu tóm tắt của người đọc khớp "một ý mang về" trong research.md, không còn câu khó hiểu. Chưa đạt → viết lại đúng những chỗ được chỉ ra, chấm lại (tối đa 3 vòng). Ghi điểm vòng cuối vào `notes.md` của video.

## Kiểm chứng (subagent thứ hai, sau khi người đọc lạnh đã đạt)
Gọi một subagent khác (Agent, general-purpose), đưa **lời thoại + chữ sẽ hiện trên hình (text, trích dẫn, biểu đồ, dòng thời gian) + research.md**, với vai:

> Bạn là người kiểm chứng của một kênh kiến thức sống bằng niềm tin. Liệt kê **mọi** khẳng định có thể sai trong kịch bản: con số, mốc năm, tên người, tổ chức, nguyên văn trích dẫn, kết quả nghiên cứu, quan hệ nhân quả ("vì A nên B"), so sánh ("nhiều hơn", "đầu tiên", "duy nhất"). Với từng khẳng định: dòng nguồn nào trong research.md đỡ nó; kịch bản nói **đúng như nguồn**, **nói quá** (mạnh hơn nguồn), **thiếu điều kiện** (bỏ mất giới hạn hay "theo ai"), hay **không có nguồn**. Đề xuất câu sửa cho mọi chỗ không đúng như nguồn. Kiểm riêng: số trên biểu đồ khớp số trong lời; trích dẫn ghi đúng người và thời điểm; ý kiến (dự đoán của người nổi tiếng) không bị nói thành sự thật.

**Đạt** khi không còn khẳng định "không có nguồn" hay "nói quá"; mọi "thiếu điều kiện" đã thêm lại điều kiện. Sửa xong thì chạy lại bước này một lần. Ghi kết quả vào `notes.md`.
Hình thật: mọi logo, mẩu báo, ảnh có dòng trong `assets/img/SOURCES.md`; người thật chỉ vẽ từ ảnh công khai (`.work/people.md`).

## Chấm video đã dựng (trước khi giao)
Trên contact sheet và caption:
- Khung đầu (0,1 s) và poster (1,5 s): đọc được câu móc khi tắt tiếng, chữ to, rõ.
- Mỗi cảnh: thứ được vẽ khớp lời đang nói; một điểm nhìn chính; không đè phụ đề, dải chặng; nền trắng; không có tên kênh trên hình; không chữ do AI vẽ; đồ vật đúng thời kỳ; không trống quá 5 s.
- Dải chặng khoanh đúng chặng; tua năm đúng năm; số đếm ra đúng số; dấu nhấn trúng chữ.
- Bản dọc: không cắt mất thứ quan trọng; tiêu đề và câu kết đọc được.
- Âm thanh (theo thông số master): khoảng −14 LUFS. Nhờ người dùng nghe tên riêng.
- Caption đúng luật `caption.md`.
Lỗi nặng (sai sự thật, chữ sai, cắt mất nội dung) → sửa trước khi giao. Lỗi nhẹ → ghi vào `notes.md`.
