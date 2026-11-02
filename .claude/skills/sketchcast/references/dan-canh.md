# Dàn cảnh: phong cách, đồ vật, bố cục, hiệu ứng

Thông số giao diện (màu, chữ, loại giấy, âm thanh, nhạc) nằm trong `brand/style.json`. Đổi giao diện thì sửa file đó, không sửa code.

## Phong cách
- Vẽ tay pastel: viền mực hơi run, tô pastel phẳng, không bóng đổ, nền giấy. Cảm giác **cuốn sổ tay của người đi khám phá**.
- Mỗi cảnh ghép từ **đồ vật rời** (AI vẽ, nền trong suốt) + **chữ viết tay do code viết** (luôn đúng dấu) + mũi tên. Một **đốm sáng dẫn đường** (màu nhấn) chạy theo đầu nét mực, vẽ từng thứ đúng lúc giọng nói nhắc tới. Đổi sang bàn tay cầm bút dạ: `brand/style.json` → `pen.type: "hand"`.
- **Mặc định: nền trắng; không hiện tên kênh trong video; phụ đề một màu cố định** (màu chủ đạo, `caption.color` trong `brand/style.json`, không đổi màu theo chữ đang đọc).
- Chữ trên hình và phụ đề không có dấu chấm, dấu phẩy cuối dòng (phụ đề tự bỏ, chữ `text` thì đừng viết dấu chấm).
- Màu nhấn (`accent`) chỉ dùng cho: phụ đề, vòng khoanh, gạch chân, dạ quang, số đếm, số năm, chặng đang kể.

## Đạo diễn hình (làm cho đẹp)
- Mỗi cảnh có **một điểm nhìn chính**: thứ to nhất, xuất hiện đúng câu quan trọng nhất. Còn lại nhỏ hơn và phụ.
- Ít mà to: 2–5 thứ mỗi cảnh, đồ vật chính cao 380–600 px, chữ 64–120 px, cách mép ≥ 40 px.
- Nhịp: không quá 4–5 giây liền không có gì mới (một thứ xuất hiện, một dấu nhấn, hoặc máy quay di chuyển). Mỗi cảnh khoảng 8–15 giây vẽ.
- Bố cục theo nội dung: so sánh → hai cột cân nhau; quy trình → 3 bước trái sang phải có mũi tên; con số → số đếm to ở giữa, một đồ vật minh hoạ bên cạnh; một ý lớn → đồ vật lớn bên trái, chữ bên phải.
- Đổi bố cục giữa các cảnh liền nhau để không lặp mắt.
- Nhân vật dẫn chuyện: không bắt buộc. Cần thì vẽ cho riêng video đó, mọi tư thế trong một tấm (`split`) để giữ giống nhau.

## Loại giấy (`paper` của từng cảnh)
| paper | Trông thế nào | Dùng khi |
|---|---|---|
| `plain` (mặc định) | nền trắng, mực đen | phần lớn video |
| `old` | nền trắng, mực nâu, đồ vật ngả màu cũ (sepia) | chuyện lịch sử ("ngày ấy") |
| `grid` | nền trắng, mực xanh đậm | tương lai, bằng chứng, nghiên cứu |
Nền luôn trắng; `old`/`grid` chỉ đổi màu mực và tông đồ vật, là gia vị, chỉ dùng khi nội dung đúng là vậy. Muốn thêm loại: `brand/style.json` → `papers` (giữ `pageBg` trắng).

## Hiệu ứng (mỗi chuyển động phải giúp người xem hiểu)
| Hiệu ứng | Khi nào | Khai báo |
|---|---|---|
| Trang mở đầu | Mọi video dài: khung đầu khi Facebook tự phát không tiếng, cũng là ảnh bìa | `script.json` → `hook` |
| Dải chặng | Khi video có các chặng rõ ràng (đang xảy ra, nghĩa là gì, làm gì...) | `script.json` → `stages`, cảnh → `stage` |
| Tua năm | Kể chuyện lịch sử hoặc nhảy tới tương lai | `script.json` → `year` (+ `yearLabel`) của cảnh |
| Số đếm | Con số quan trọng nhất của cảnh | item `count` |
| Biểu đồ cột, đường, người nhỏ | Kết quả nghiên cứu, so sánh, tỷ lệ "x trên 10" | item `chart` |
| Trích phát ngôn | Phân tích phát ngôn, câu nói nổi tiếng | item `quote` |
| Dòng thời gian | Lịch sử dự đoán, các mốc thay đổi | item `timeline` |
| Logo thật, mẩu báo | Nhận ra thương hiệu; bằng chứng tận mắt (tiêu đề bài báo, nghiên cứu) | item `image` |
| Người nổi tiếng vẽ tay | Người nói câu đang phân tích | object có `person` |
| Khoanh, gạch chân, dạ quang | 1–2 lần mỗi cảnh, đúng chữ giọng nói nhấn | `marks` |
| Máy quay đẩy vào | Giải thích chi tiết một vùng; quay về toàn cảnh trước khi hết cảnh | `cam` |
| Lật trang, âm thanh bút vẽ, tua, tích tắc | Tự động | (tự có) |

## objects.json
```json
{ "objects": {
  "s2-props": { "split": true, "prompt": "4 separate objects: a vintage factory time clock with a punch card slot, a 1920s black car seen from the side (no logo), a worker's metal lunch box, a factory whistle on a pipe" },
  "pager":    { "prompt": "a 1990s beeper pager with a tiny grey screen, no text on the screen" },
  "office":   { "prompt": "a small modern office desk with a laptop and a coffee cup", "aspect": "16:9" }
} }
```
- Mô tả rõ hình dáng, chất liệu, thời kỳ (kiểu dáng đặc trưng ở Việt Nam nếu có). Phong cách và luật "không chữ, nền trong suốt" được tự ghép thêm.
- Không chữ, không logo, không số trên màn hình. Cần chữ thì dùng item `text`.
- Gom 3–6 đồ vật nhỏ cùng cảnh vào một tấm `"split": true` → `<id>-1.png`, `<id>-2.png`... (trái qua phải, trên xuống dưới). Xem `.work/objects.jpg` để biết id nào là gì.
- Đồ vật cho giấy `old` vẫn vẽ màu pastel bình thường: bộ dựng tự phủ sepia.

## scenes.json
```json
{ "s1": { "stage": "belief", "paper": "plain",
    "items": [
      { "obj": "office", "x": 560, "y": 560, "h": 420, "at": [1, 0] },
      { "text": "Một ngày đi làm", "x": 1320, "y": 300, "size": 84, "at": [1, 0.8] },
      { "count": [0, 8], "suffix": " tiếng", "x": 1320, "y": 560, "size": 170, "at": [2, 0] },
      { "arrow": [900, 560, 1080, 560], "at": [2, 1.0] } ],
    "marks": [ { "circle": [1320, 560, 260, 110], "at": [3, 0.4] } ],
    "cam": [ { "box": "full" }, { "box": [900, 380, 1720, 720], "at": [2, 0.2], "dur": 1.6 }, { "box": "full", "at": [4, 0] } ] } }
```
| Item | Trường | Ghi chú |
|---|---|---|
| đồ vật | `obj`, `x`, `y` (tâm), `h` hoặc `w`, `at`, `flip`, `z`, `anim` | mặc định tay vẽ nét rồi tô màu; `anim`: `pop` (bật vào), `fade` (hiện dần) |
| chữ | `text`, `x`, `y`, `size`, `at`, `align`, `color` | viết tay từng nét; `\n` xuống dòng; màu theo loại giấy |
| số đếm | `count: [từ, tới]`, `prefix`, `suffix`, `x`, `y`, `size`, `at`, `dur` | màu nhấn, đếm sau khi tay vẽ xong thứ trước; 1 cái mỗi cảnh |
| mũi tên | `arrow: [x1,y1,x2,y2]`, `at`, `color`, `width` | cong nhẹ, vẽ tay |
| đường | `line: [x1,y1,x2,y2]` hoặc `[[x,y],...]`, `color`, `width`, `at` | nét thẳng vẽ tay (gạch nối, khung, trục) |
| hình | `shape: "rect"\|"ellipse"\|"person"`, `box` / `c: [cx,cy,rx,ry]` / `x,y,h`, `fill`, `stroke`, `at` | khung, ô màu, người nhỏ; vẽ viền rồi tô màu |
| hình thật | `image: "assets/img/x.png"`, `x`, `y`, `h` hoặc `w`, `frame: "none"\|"clip"`, `tilt`, `at` | logo (`none`, hiện dần), mẩu báo (`clip`: khung giấy, băng dính, rơi xuống rồi nằm yên) |

### Khối ghép (tự tách thành chữ, đường, hình, cùng nét vẽ tay, đúng số)
```json
{ "quote": "Ba giờ một ca, mười lăm giờ một tuần.", "who": "J. M. Keynes", "when": "1930", "x": 1180, "y": 470, "w": 1000, "size": 68, "at": [1, 0] }
{ "timeline": [ { "year": 1914, "text": "Ford: 8 giờ một ngày" }, { "year": 1919, "text": "ILO: 48 giờ một tuần", "at": [2, 0] } ], "x1": 260, "x2": 1660, "y": 480, "at": [1, 0] }
{ "chart": "bar", "title": "Lập trình viên làm cùng AI", "unit": "%", "signed": true, "box": [360, 260, 1560, 760],
  "data": [ { "label": "Họ đoán", "value": 24 }, { "label": "Họ cảm thấy", "value": 20, "at": [2, 0] }, { "label": "Đo thật", "value": -19, "at": [3, 0] } ] }
{ "chart": "line", "unit": " giờ", "box": [300, 300, 1620, 760], "data": [ { "label": "1914", "value": 48 }, { "label": "1926", "value": 40 } ] }
{ "chart": "dots", "total": 10, "value": 3, "box": [360, 330, 1560, 620], "caption": "3 trên 10 người", "at": [1, 0], "hiAt": [2, 0] }
```
- `quote`: thanh màu nhấn, dấu ngoặc kép lớn, lời trích viết tay (tự xuống dòng theo `w`), dòng "ai · khi nào". Nguyên văn phải có trong research.md; dịch thì nói "đại ý".
- `timeline`: mũi tên ngang, mỗi mốc một vạch, năm màu nhấn, chú thích bên dưới; `at` riêng từng mốc để khớp lời; `alternate: true` để chú thích lên xuống xen kẽ khi nhiều mốc.
- `chart: "bar"`: cột vẽ tay mọc lần lượt, số trên đầu cột, nhãn dưới; số âm thì cột đi xuống dưới trục 0 (`signed: true` thêm dấu +). `at` riêng từng cột.
- `chart: "line"`: trục, đường nối vẽ liền một nét, chấm và số ở từng điểm.
- `chart: "dots"`: `total` người nhỏ, `value` người đầu tô màu nhấn (vẽ lúc `hiAt`), `caption` dưới. Hợp với "x trên 10 người".
- Số trên biểu đồ phải đúng như research.md (người kiểm chứng sẽ đối chiếu).

- `at`: [số câu, giây sau đầu câu] (lấy từ `sentences.mjs`), hoặc một số giây tính từ lúc giọng bắt đầu cảnh. Các thứ cách nhau ≥ 1,5 s (tay chỉ vẽ một thứ một lúc).
- `marks`: `{ "circle": [cx, cy, rx, ry] }`, `{ "underline": [x1, y, x2] }`, `{ "highlight": [x1, y, x2] }` (y = giữa dòng chữ).
- `cam`: phần tử đầu `{ "box": "full" }`; đẩy vào vùng đang giải thích (`box`, `at`, `dur` 1,2–2); phóng tối đa 1,15 lần.

## Vùng chừa trống
- Trang 1920×1080. **Dưới 14%** (y > 930): phụ đề. **Góc trên trái** khi có dải chặng (bề rộng thật: vùng xanh dương trong preview).
- Cảnh sẽ vào bản dọc: mọi thứ quan trọng trong **x 240–1680** (vạch xanh lá trong preview).

## Bố cục hay dùng
| Bố cục | Khi nào | Cách sắp |
|---|---|---|
| Số lớn ở giữa | Một con số là cả câu chuyện của cảnh. | đồ vật minh hoạ bên trái, nhãn nhỏ ở trên, số đếm to bên phải, vòng khoanh khi giọng nhấn |
| Trích dẫn và chân dung | Phân tích phát ngôn: người nói bên trái, lời trích bên phải. | obj chân dung (h ~640) bên trái + quote w ~880 bên phải |
| Dòng thời gian ngang | 3–5 mốc, mỗi mốc hiện đúng câu nói tới. | timeline x1 250 → x2 1670, y giữa trang |
| Đoạn kết 3 ô | Kết video: đáng lo · không cần lo · nên làm. | 3 shape rect cao 550, mỗi ô một tiêu đề màu và 2 dòng chữ, hiện theo 3 câu |
| So sánh hai cột | Đúng / chưa đúng; niềm tin / nghiên cứu; trước / sau. | line chia giữa, tiêu đề màu mỗi cột, đồ vật và chú thích bên dưới |
| Bằng chứng tận mắt | Giới thiệu một nghiên cứu hay bài báo. | mẩu báo (frame clip) to bên trái, kính lúp bên phải |
| Cán cân ủng hộ / phản bác | Chủ đề còn tranh cãi: lý lẽ hai phía, công bằng. | cán cân ở giữa; cảnh ủng hộ chữ bên trái, cảnh phản bác chữ bên phải |
| Hàng logo | Nhắc tới nhiều công ty cùng lúc. | 3 image logo cùng y, cách đều, chiều cao chỉnh theo độ đậm của từng logo |
| Quy trình 3 bước | Hướng dẫn làm gì: bước 1 → 2 → 3. | 3 đồ vật cách đều, mũi tên giữa, chú thích dưới mỗi bước, mỗi bước một câu |
| Một ý lớn | Câu chốt, khẩu hiệu, ý mang về. | đồ vật lớn bên trái (h ~520), chữ 2 dòng cỡ 110 bên phải, gạch chân |
