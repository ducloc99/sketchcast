---
name: sketchcast
description: Viết kịch bản và làm trọn một video vẽ tay tiếng Việt (nét mực vẽ dần theo lời đọc, tô màu pastel, phụ đề karaoke, nhạc nền, âm thanh hiệu ứng), bản ngang 16:9 kèm bản dọc 9:16 cho Reels/TikTok/Shorts, caption và bình luận ghim nguồn. Từ tìm hiểu chủ đề đến kịch bản (có chấm bằng người đọc lạnh và người kiểm chứng), giọng đọc, đồ vật vẽ tay, dàn trang, hiệu ứng (dải chặng, trang mở đầu, loại giấy, tua năm, số đếm, biểu đồ, dạ quang), xuất video. Dùng khi người dùng nói "làm video", "làm video <chủ đề>", "viết kịch bản", "làm reel", "video vẽ tay", "làm lại cảnh...", "sửa video...", hoặc mới tải thư mục về và muốn bắt đầu.
---

# sketchcast: viết kịch bản và làm video vẽ tay

**Thư mục kênh** = thư mục đang mở trong Claude Code (có `brand/`, `kenh.md`, `videos/`). `<sk>` = `.claude/skills/sketchcast` khi đứng ở thư mục kênh; trong thư mục video (`videos/<dir>/`) thì `<sk>` = `../../.claude/skills/sketchcast`. Mọi lệnh `node <sk>/scripts/...` chạy **từ thư mục video**, trừ khi ghi khác. Khoá kie.ai tự tìm trong `.env` của thư mục kênh (dòng `KIE_API_KEY=...`).

Đọc trước: `kenh.md` (kênh nói với ai, lời hứa, cách kết, hashtag). Ví dụ có thật: `examples/` (10 video mẫu theo ngành, danh sách ở `examples/README.md`): trước khi viết script.json, objects.json, scenes.json thì đọc 1–2 mẫu gần chủ đề nhất. Khi viết kịch bản: `references/kich-ban.md`. Khi chấm: `references/cham.md`. Khi dàn cảnh: `references/dan-canh.md`. Khi viết caption: `references/caption.md`. Gặp lỗi: `references/loi-hay-gap.md`.

## Lần đầu dùng (chưa có `kenh.md`, hoặc thiếu `.claude/skills/sketchcast/scripts/node_modules`)
Làm lần lượt từng bước; xong mỗi bước báo ngắn cho người dùng (✓ hoặc cần họ làm gì).
1. Kiểm tra máy có đủ: `node -v` (cần 18 trở lên), `ffmpeg -version`, `python --version` (3.10 trở lên) và `python -c "import faster_whisper, librosa"`. Thiếu gì thì chỉ cho người dùng cài (Windows: `winget install OpenJS.NodeJS.LTS Gyan.FFmpeg Python.Python.3.12`; Mac: `brew install node ffmpeg python`; gói Python: `pip install faster-whisper librosa numpy`). Được phép thì chạy giúp họ.
2. Từ thư mục kênh: `node .claude/skills/sketchcast/scripts/init-channel.mjs` (cài gói cho các script, tạo `kenh.md`, `.env`; không ghi đè thứ đã có).
3. Khoá kie.ai (vẽ hình, đọc giọng, tạo nhạc đều chạy qua kie.ai). `.env` đã có khoá thì bỏ qua bước này. Chưa có thì hỏi người dùng đã có tài khoản kie.ai chưa:
   - **Chưa có:** hướng dẫn từng bước: vào https://kie.ai, bấm đăng ký (dùng tài khoản Google cho nhanh), nạp credit ở mục Billing (video 30 giây tốn khoảng 30–50 credit), rồi vào https://kie.ai/api-key bấm tạo khoá và chép lại.
   - **Có rồi:** lấy khoá ở https://kie.ai/api-key.
   - Rồi nhờ họ mở file `.env` trong thư mục này, dán khoá vào sau `KIE_API_KEY=` và lưu lại (mở bằng Notepad hoặc bất kỳ trình soạn chữ nào). Nếu họ dán khoá vào khung chat thì ghi giúp vào `.env`, đừng nhắc lại khoá trong câu trả lời. Không đọc khoá ra màn hình.
4. Hỏi người dùng vài câu ngắn rồi điền `kenh.md`: tên kênh, nói chuyện với ai, đăng ở đâu, muốn kết video thế nào. Muốn đổi màu, chữ, kiểu bút thì sửa `brand/style.json` (xem `references/dan-canh.md`).
5. Dựng thử video mẫu, không tốn credit, để chắc máy đã chạy được: từ thư mục kênh chép `.claude/skills/sketchcast/examples/ban-hang` sang `videos/thu-mau`, rồi trong `videos/thu-mau`: `node ../../.claude/skills/sketchcast/scripts/compose.mjs` → `npx hyperframes render -f 30 -o renders/raw.mp4 --quiet` → `node ../../.claude/skills/sketchcast/scripts/master.mjs renders/raw.mp4 renders/thu-mau.mp4 1.5 --sfx .work/sfx.json`. Ra `renders/thu-mau.mp4` (khoảng 27 giây) là xong; mở cho người dùng xem. Lỗi thì sửa theo thông báo (thường do thiếu ffmpeg hoặc chưa cài gói).
6. Nhạc nền (không bắt buộc): chép một bài mp3 họ có quyền dùng vào `brand/music/nhac-kenh.mp3`, hoặc tạo bằng AI (`node .claude/skills/sketchcast/scripts/setup-brand.mjs` từ thư mục kênh, khoảng 12 credit, chỉ chạy khi họ đồng ý).
7. Báo người dùng đã sẵn sàng, gợi ý câu đầu tiên ("Làm video về <chủ đề>"), và dặn: lần sau mở Claude Code ở đúng thư mục này.

## 0. Chủ đề và thư mục
- Chủ đề do người dùng nêu. Thư mục: dòng của chủ đề đó trong bảng "Đã làm" của `kenh.md`; chưa có thì tạo `videos/<ngày hôm nay>-<slug>/` và thêm một dòng vào bảng.
- Chưa có `research.md` → tìm hiểu chủ đề trước (tìm trên web, đọc nguồn gốc: báo lớn, cơ quan nhà nước, nghiên cứu). Ghi `research.md` gồm: **một ý mang về** (một câu), các dữ kiện (mỗi dòng một dữ kiện kèm nguồn, ngày, link), chuyện hoặc ví dụ cụ thể dùng được, và mục **phải kiểm lại trước khi đăng** (tin đang diễn biến, điều chưa chắc). Không viết kịch bản khi chưa có nguồn.
- research.md có mục "phải kiểm lại trước khi đăng" → kiểm lại ngay, trước khi viết.
- Nhạc nền: mọi video dùng chung `brand/music/nhac-kenh.mp3` nếu có. Không tạo nhạc riêng cho từng video. Không có thì bỏ `--music` ở bước 6, 7.
- Âm thanh hiệu ứng: `brand/sfx/` (danh mục `brand/sfx/README.md`). Muốn thêm tiếng (con dấu, chuông, lật giấy...) thì ghi `"sfx": "<tên>"` vào món đồ trong scenes.json (thêm `"sfxAt"` nếu muốn trễ vài giây); tiếng bút vẽ, lật trang, tua năm vẫn tự có.

## 1. Kịch bản → chấm → sửa
- Viết `script.json` theo `references/kich-ban.md`.
- Chấm theo `references/cham.md`: người đọc lạnh (dễ hiểu, hấp dẫn, bớt bất an) rồi người kiểm chứng (từng khẳng định khớp nguồn). Chưa đạt thì viết lại, tối đa 3 vòng.
- Người dùng chỉ bảo "viết kịch bản", hoặc dặn "cho mình duyệt trước" → dừng ở đây, gửi kịch bản dạng đọc được (từng cảnh: chặng, lời thoại, hình sẽ vẽ), kèm điểm chấm, và chờ. Bảo "làm video" thì làm tiếp luôn.

## 2. Dựng project
```
node .claude/skills/sketchcast/scripts/new-project.mjs videos/<dir>      (từ thư mục kênh, rồi cd vào videos/<dir>)
```
Giữ nguyên research.md, script.json, notes.md đã có; chép giao diện kênh (style.json), font.

## 3. Giọng đọc (bắt đầu sớm, chạy nền)
```
node <sk>/scripts/voice.mjs            # đọc theo đoạn 60–90 s, kiểm tra giọng bị trôi, tự đọc lại đoạn lỗi
python -I <sk>/scripts/words.py .       # cắt vo-N.mp3 theo cảnh + words.json (mốc thời gian từng chữ)
node <sk>/scripts/sentences.mjs         # in từng câu của từng cảnh kèm số thứ tự và giây bắt đầu
```
- Đọc mọi dòng "heard" so với kịch bản: tên riêng, con số, câu bị bỏ hoặc lặp. Đọc sai thật → viết lại câu đó cho dễ đọc (tên riêng đầu câu, số viết bằng chữ) rồi `voice.mjs --only N`.
- `WARNING chunk N still drifts` → viết lại các câu ở giây được báo (thường do chữ tiếng Anh, chuỗi số dài) rồi `--only N`. `--max 70` nếu trôi lặp lại.

## 4. Đồ vật vẽ tay và hình thật
- Viết `objects.json` theo `references/dan-canh.md`: đồ vật từng cảnh, **không chữ, không logo**. Gom 3–6 đồ vật nhỏ của một cảnh vào một tấm (`"split": true`) cho rẻ.
- Người nổi tiếng: object có `"person": "<tên trên Wikipedia>"` → vẽ theo phong cách kênh từ ảnh công khai. Xem kỹ độ giống so với ảnh gốc (ghi ở `.work/people.md`), không giống thì vẽ lại hoặc bỏ người đó.
- Hình thật (không phải vẽ): `node <sk>/scripts/get-image.mjs logo "OpenAI"` (logo chính thức), `get-image.mjs shot <url> <id> --at "<chữ trên trang>"` (chụp tiêu đề bài báo, nghiên cứu làm mẩu báo), `get-image.mjs photo <url> <id>` (ảnh công khai). Mở từng ảnh xem: chữ đọc được, không có thông tin riêng tư. Nguồn tự ghi vào `assets/img/SOURCES.md` → đưa vào bình luận ghim.
- `node <sk>/scripts/gen-objects.mjs` (mọi thứ còn thiếu) hoặc `gen-objects.mjs <id> ...` (vẽ lại). Xem `.work/objects.jpg`: sai thời kỳ, có chữ lạ, dính nhau, méo, khác nét vẽ → vẽ lại. kie báo bận thì chạy lại.

## 5. Dàn trang và thời gian
- Viết `scenes.json` theo `references/dan-canh.md` (đọc kỹ mục "Đạo diễn hình"), dùng giây thật từ `sentences.mjs`.
- `node <sk>/scripts/compose.mjs --preview` → xem `.work/layout/*.jpg` (đỏ = phụ đề, xanh dương = dải chặng, vạch xanh lá = vùng an toàn cho bản dọc). Sửa đến khi gọn, to, có một điểm nhìn chính, không đè nhau.
- `node <sk>/scripts/compose.mjs` → `npx hyperframes lint` (0 lỗi) → `npx hyperframes snapshot --at <2–3 mốc mỗi cảnh, gồm 0.1 và 1.5> --no-end --describe false -o .work/snap` → xem contact sheet: thứ tự vẽ khớp lời, trang mở đầu rõ ở 0,1 s, chặng khoanh đúng, năm tua đúng, không gì bị cắt. Sửa và dựng lại.

## 6. Xuất video dài
```
npx hyperframes render -f 30 -o renders/raw.mp4 --quiet           (chạy nền, khoảng 2 phút cho mỗi phút video)
node <sk>/scripts/master.mjs renders/raw.mp4 renders/<slug>.mp4 1.5 --sfx .work/sfx.json --music ../../brand/music/nhac-kenh.mp3 --music-from <0|30|60|90>
```
Poster ở giây 1,5 = trang mở đầu đã gạch chân (dùng làm ảnh bìa). Đổi `--music-from` giữa các video để đoạn mở nhạc không lặp lại y hệt. Mỗi lần chỉ render một video.

## 7. Bản dọc cho Reels
- Chọn 2–3 cảnh liên tiếp đứng được một mình (45–60 s); `teaser.title` và `teaser.cta` trong script.json.
- **Chỉ làm Reel** (không có video dài): viết kịch bản 45–60 s, 2–4 cảnh, rồi chạy `--vertical` với tất cả các cảnh và bỏ bước 6.
```
node <sk>/scripts/compose.mjs --vertical s2,s3
npx hyperframes render teaser -f 30 -o renders/raw-reel.mp4 --quiet
node <sk>/scripts/master.mjs renders/raw-reel.mp4 renders/<slug>-reel.mp4 1 --sfx .work/sfx-teaser.json --music ../../brand/music/nhac-kenh.mp3 --music-from <n>
```
- Snapshot thư mục `teaser/` 3–4 mốc: thứ quan trọng nằm trong khung, không bị cắt mép.

## 8. Caption và bình luận ghim
`references/caption.md` → `caption.txt` gồm 3 khối: `=== Caption video dài ===`, `=== Caption Reel ===`, `=== Bình luận ghim ===`.

## 9. Kiểm tra cuối và giao
- Chấm video theo `references/cham.md`. Sửa nếu có lỗi nặng.
- `node <sk>/scripts/cost.mjs` → chi phí credit.
- Cập nhật dòng của video trong bảng "Đã làm" của `kenh.md` (trạng thái "Đã làm video", tiêu đề cuối cùng). Lỗi mới gặp và cách sửa → `references/loi-hay-gap.md`.
- Trả lời người dùng: đường dẫn 2 video + 2 poster, dán nguyên caption, chi phí, điều chưa kiểm chứng được hoặc phải kiểm lại trước khi đăng, và nhờ họ nghe lại cách đọc tên riêng (bạn không nghe được).

## Luật cứng
- Không chữ do AI vẽ trong đồ vật: mọi chữ là item `text` (code viết, đúng dấu). Đồ vật có chữ lạ → vẽ lại.
- Người thật: chỉ vẽ khi có ảnh công khai làm mẫu và thật cần thiết; còn không, kể bằng đồ vật, bối cảnh, tên viết tay.
- Không logo do AI tự vẽ. Cần nhắc thương hiệu thì viết tên bằng item `text`.
- Không vẽ nguồn, chú thích, nhãn chương lên hình. Nguồn để ở bình luận ghim.
- Không nhắc công cụ làm video trong video hay caption.
- Lỗi của script trong `scripts/`: sửa tận gốc trong skill (không vá tay trong index.html) và ghi vào `references/loi-hay-gap.md`.
- Thêm kiểu hình hay hiệu ứng mới vào `compose.mjs` thì thêm luôn vào `references/dan-canh.md`, để lần sau còn biết mà dùng.
- Tốn credit (ảnh, giọng, nhạc): báo trước cho người dùng ước tính, sau mỗi bước báo số đã tiêu (`cost.mjs`). kie.ai báo 401 → dừng, nhờ người dùng tự cập nhật khoá trong `.env`.
