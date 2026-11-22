# FUO reUI

**Luyện đề trắc nghiệm ngay trên ảnh bài đăng FUOverflow — ẩn bình luận để tự làm, bấm A–H chấm tức thì theo cộng đồng hoặc AI, xuất câu sai ra CSV ôn lại trước giờ thi.**

Userscript dành cho sinh viên FPT và người dùng [FUOverflow](https://fuoverflow.com/) luyện đề từ các bài tổng hợp ảnh trên diễn đàn mà không phải vừa nhìn ảnh vừa che bình luận.

<p align="left">
  <a href="https://raw.githubusercontent.com/bGiaHuy/fuo-reui/main/fuo-reui.user.js"><img src="https://img.shields.io/badge/Cài_userscript-v2.0.0-00485B?style=for-the-badge&logo=tampermonkey&logoColor=white" alt="Cài userscript v2.0.0"></a>
  <a href="#cài-đặt"><img src="https://img.shields.io/badge/Trình_duyệt-Chrome_%7C_Edge_%7C_Firefox_%7C_Safari-2563EB?style=for-the-badge" alt="Trình duyệt hỗ trợ"></a>
  <a href="#phát-triển-và-đóng-góp"><img src="https://img.shields.io/badge/Playwright-108_passed-16A34A?style=for-the-badge&logo=playwright&logoColor=white" alt="108 Playwright tests passed"></a>
  <img src="https://img.shields.io/badge/Target-fuoverflow.com-EA580C?style=for-the-badge" alt="Target fuoverflow.com">
</p>

![Giao diện FUO reUI đang chấm câu hỏi CEA201 trên FUOverflow](./docs/images/fuo-reui-demo.png)

*Ảnh chụp thực tế khi luyện đề CEA201 trên FUOverflow: bảng nút `A–H` gắn ngay thanh bên Fancybox, báo lựa chọn sai (`B ✗`) và đáp án đúng (`D ✓`) theo bình luận, kèm lời giải tham khảo từ DeepSeek. Từ bản `2.0.0`, bảng có thêm nút **Cài đặt AI** để đổi nhà cung cấp, model và mức suy nghĩ.*

---

## Cài đặt

Người dùng cuối chỉ cần trình duyệt có Tampermonkey. Node.js và Python chỉ dùng khi phát triển hoặc chạy test.

### Bước 1: Cài Tampermonkey

- **Khuyên dùng (Chrome, Edge, Brave, Cốc Cốc, Arc):** cài [Tampermonkey trên Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo). Trên trình duyệt nhân Chromium bản mới, mở `chrome://extensions` (hoặc trang quản lý tiện ích của trình duyệt) và bật **Developer mode** / quyền chạy userscript nếu Tampermonkey yêu cầu.
- **Lựa chọn thay thế cho trình duyệt hoặc tiện ích khác:**
  - Firefox: [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/)
  - Microsoft Edge (store riêng): [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
  - Safari: [Mac App Store](https://apps.apple.com/app/tampermonkey/id1482490089)
  - Opera: [Opera Add-ons](https://addons.opera.com/extensions/details/tampermonkey-beta/)
  - Trình quản lý userscript thay thế: [Violentmonkey](https://violentmonkey.github.io/)

### Bước 2: Cài userscript

1. Mở trực tiếp **[fuo-reui.user.js (nhánh `main`)](https://raw.githubusercontent.com/bGiaHuy/fuo-reui/main/fuo-reui.user.js)**.
2. Khi Tampermonkey mở trang cài đặt, bấm **Install** (hoặc **Update** nếu đã cài bản cũ).
3. Tải lại bài viết FUOverflow đang mở và cho phép tiện ích chạy trên `fuoverflow.com` nếu trình duyệt hỏi quyền.

*Nếu trình duyệt chỉ mở trang chữ mã nguồn thay vì giao diện Tampermonkey:* mở Dashboard Tampermonkey → **Create a new script**, thay toàn bộ nội dung mặc định bằng mã trong file [`fuo-reui.user.js`](./fuo-reui.user.js) rồi lưu (`Ctrl + S`). Tránh bật song song nhiều bản script cùng lúc.

**Trạng thái dự án:** bản hiện tại là `v2.0.0`, phát hành trực tiếp trên nhánh `main` (chưa đóng gói GitHub Release riêng), đã kiểm thử `108` ca Playwright cho cả desktop và mobile.

---

## Vấn đề giải quyết

Đề thi trên FUOverflow thường được đăng thành album ảnh trong trình xem Fancybox. Khi ôn trực tiếp trên diễn đàn, bình luận đáp án nằm ngay cạnh ảnh nên dễ nhìn thấy trước khi kịp nghĩ; gặp câu nhiều người chọn khác nhau thì phải lướt từng bình luận để tự tính số đông; làm hết đề cũng không có danh sách câu đã sai để xem lại.

FUO reUI chèn bảng trả lời trực tiếp vào thanh bên của Fancybox và mặc định ẩn phần bình luận. Bạn chọn đáp án ngay trên ảnh, xem chấm điểm tức thì theo phiếu cộng đồng hoặc AI, rồi tải toàn bộ câu sai và câu đánh dấu ra CSV để ôn lại.

---

## Tính năng chính

| Hạng mục | FUO reUI xử lý |
| --- | --- |
| Chọn đáp án ngay trong ảnh | Bảng nút `A–H` gắn cố định vào thanh bên Fancybox. Câu chọn một chấm ngay khi bấm; câu chọn nhiều cho phép chọn nhiều phương án rồi bấm **Submit** (chỉ tính đúng khi khớp cả tập đáp án). |
| Ẩn bình luận mặc định | Che khu vực bình luận của ảnh đang mở để tránh lộ đáp án; bấm **Hiện bình luận** khi cần đọc thảo luận. |
| Chấm theo đồng thuận & OCR | Đếm tối đa một phiếu hợp lệ cho mỗi tác giả (bỏ phần trích dẫn) và lấy tập đáp án có nhiều phiếu nhất. Nếu chưa có phiếu hợp lệ, Tesseract.js (`eng+vie`) đọc ảnh để phân biệt câu chọn một hay chọn nhiều. |
| Lời giải AI (BYOK đa nhà cung cấp) | Gọi AI giải thích bằng tiếng Việt và hiển thị công thức toán bằng KaTeX. Tích hợp sẵn 5 preset (`DeepSeek`, `OpenAI`, `Anthropic Claude`, `Google Gemini`, `OpenRouter`), cho thêm tối đa `20` hồ sơ tùy chỉnh, tải `/models`, chỉnh `Thinking` và gọi endpoint HTTP cục bộ (`Ollama`, `LM Studio`). |
| Nhận diện ảnh linh hoạt | Nhận tên ảnh tùy ý như `Q1.png`, `Q27_91_20250804144948.webp`, `CEA201_SP26_FE (7).webp`; xử lý URL có tham số ký thay đổi và tách riêng các ảnh trùng tên trong cùng một đề. |
| Lưu câu cần ôn & xuất CSV | Lưu lịch sử câu sai và câu gắn sao (`☆ Đánh dấu`) theo từng bài viết; xuất file `<tên đề>_cau-can-on.csv` dùng được trong Excel, Google Sheets hoặc nhập sang Anki. |

---

## Cách sử dụng

1. Mở bài viết chứa đề thi tại `https://fuoverflow.com/threads/...`.
2. Bấm vào một ảnh câu hỏi để mở Fancybox (mở thanh thông tin/bình luận bên cạnh nếu đang ẩn).
3. Chờ bảng **Trả lời câu hỏi** phân loại xong (`Chọn một đáp án` hoặc `Chọn nhiều đáp án`), sau đó chọn phương án `A–H` (với câu chọn nhiều, bấm thêm **Submit**).
4. Đọc kết quả `Đúng / Sai`, nguồn đáp án và tỷ lệ bình luận, rồi chuyển sang ảnh tiếp theo.

### Các nút trên bảng

| Nút | Chức năng |
| --- | --- |
| **Làm lại** | Xóa lựa chọn và kết quả đang hiện của câu hiện tại để chọn lại; vẫn giữ phân loại, dấu sao và lịch sử câu đã từng sai. |
| **Hiện bình luận / Ẩn bình luận** | Bật hoặc tắt bình luận của ảnh đang xem. |
| **Xem đáp án AI** | Gọi nhà cung cấp AI đang chọn để lấy đáp án tham khảo và lời giải tiếng Việt; riêng nút này không chấm câu hỏi. |
| **Cài đặt AI** | Mở hộp thoại **Cài đặt AI (BYOK)** để chọn nhà cung cấp, chỉnh Base URL, loại tương thích, model và mức suy nghĩ. |
| **☆ Đánh dấu / ★ Đã đánh dấu** | Gắn hoặc bỏ dấu sao cho câu cần ôn lại. |
| **Xuất CSV** | Tải danh sách câu đã sai hoặc được đánh dấu của đề hiện tại. |
| **Thử lại phân loại** | Chạy lại bước đọc bình luận hoặc OCR khi mạng lỗi; các nút đáp án bị khóa cho đến khi phân loại xong. |

### Cấu hình AI nhanh (tùy chọn)

Chấm theo bình luận không cần cài AI. Nếu muốn dùng giải thích AI hoặc tự động chấm khi bình luận chưa có / hòa phiếu:

1. Bấm **Cài đặt AI** trên bảng (hoặc menu Tampermonkey → **Cấu hình AI (BYOK / Model / Thinking)**).
2. Chọn một trong 5 preset sẵn có (`DeepSeek` mặc định, `OpenAI`, `Anthropic Claude`, `Google Gemini`, `OpenRouter`) hoặc bấm **+ Tùy chỉnh** để tự khai báo endpoint tương thích `openai`, `deepseek`, `anthropic`, `gemini`.
3. Bấm **Đặt / đổi API key** để nhập key. Nếu dùng mô hình chạy cục bộ như Ollama (`http://localhost:11434/v1`) hoặc LM Studio (`http://localhost:1234/v1`), API key không bắt buộc.
4. Nhập Model ID hoặc bấm **Tải danh sách (/models)** (ô **Lọc model…** tự hiện khi danh sách vượt quá `10` model), chọn mức **Thinking** (`default`, `off`, `low`, `medium`, `high`) rồi bấm **Lưu cấu hình**.

Để xóa kết quả và dấu sao của riêng đề đang mở và làm lại từ đầu, chọn menu Tampermonkey → **Bắt đầu lượt luyện đề mới**.

---

## Giới hạn và tích hợp

- **Phạm vi trang:** chỉ chạy trên `https://fuoverflow.com/threads/*` dựa trên cấu trúc Fancybox hiện tại của FUOverflow; không hỗ trợ các trang web luyện thi khác.
- **Tài khoản và chi phí:** chấm theo bình luận và OCR không cần tài khoản hay API key. Tính năng AI dùng cơ chế BYOK: chi phí và hạn mức (quota) tính theo tài khoản API của riêng bạn, trừ khi bạn nối tới máy chủ cục bộ (`http://localhost`, `http://127.0.0.1`, `http://[::1]`).
- **Độ tin cậy của đáp án:** bình luận cộng đồng và AI đều chỉ là nguồn tham khảo. Tỷ lệ phần trăm hiển thị là tỷ lệ phiếu bình luận, không phải xác suất đáp án đúng. Khi bình luận có một tập đáp án thắng rõ ràng, kết quả chấm vẫn theo bình luận kể cả khi AI chọn khác (bảng lời giải sẽ ghi rõ sự chênh lệch).
- **Giới hạn kỹ thuật:** luồng AI chỉ đọc ảnh cùng origin với trang, định dạng `PNG/JPEG/WebP/GIF`, dung lượng tối đa `15 MB`. Thời gian chờ tối đa: `15s` cho `/models`; `60s` (`default`/`off`), `90s` (`low`/`medium`) hoặc `120s` (`high`) cho lời giải AI; `60s` mỗi bước cho OCR.
- **Tính năng chưa có:** chưa đồng bộ tiến độ giữa các trình duyệt hoặc nhiều thiết bị — hãy xuất CSV nếu muốn giữ bản ôn tập. Script tự xuất CSV một lần khi chấm xong câu có số lớn nhất nhận diện được trong gallery, nhưng nếu danh sách ảnh không đầy đủ hoặc trình duyệt chặn tải tự động thì cần bấm **Xuất CSV** thủ công.

---

## Dữ liệu và quyền riêng tư

- **Lưu cục bộ:** lịch sử câu sai, câu gắn sao (`fuoReview:*`), cấu hình AI (`fuoAIConfig`) và API key (`fuoAIKeys`) được lưu trong bộ nhớ userscript của Tampermonkey trên máy bạn. Không có máy chủ trung gian hay đồng bộ đám mây.
- **Xử lý API key:** key chỉ nhập qua hộp thoại `prompt()` của trình duyệt và không ghi vào DOM, ô `<input>`, `localStorage`, `sessionStorage`, file CSV hay `console.*`. Mỗi key gắn theo origin (`scheme + host + port`): nếu đổi **Base URL** sang domain khác và lưu, script tự xóa key cũ để tránh gửi nhầm sang máy chủ khác. Lỗi HTTP từ nhà cung cấp cũng được lọc bí mật (`[REDACTED]`) trước khi hiển thị.
- **Dữ liệu gửi ra ngoài:** script không gắn telemetry hay theo dõi hành vi. Chỉ khi bạn bấm **Xem đáp án AI** hoặc khi cần AI chấm (không có phiếu / hòa phiếu), trình duyệt mới gửi ảnh câu hỏi và lựa chọn hiện tại trực tiếp tới endpoint bạn đã cấu hình qua `GM_xmlhttpRequest` với `anonymous: true` (không kèm cookie trình duyệt). Khi dùng các domain tùy chỉnh mới, Tampermonkey sẽ hỏi xác nhận quyền `@connect`. Ngoài ra, trình duyệt tải thư viện KaTeX (`0.19.1`) và Tesseract.js (`5.1.1`) từ CDN khi chạy.

---

## Phát triển và đóng góp

- **Công nghệ:** toàn bộ userscript nằm trong một file [`fuo-reui.user.js`](./fuo-reui.user.js) (JavaScript thuần, sửa trực tiếp, không cần bước build). Phụ thuộc trình duyệt: KaTeX `0.19.1`, Tesseract.js `5.1.1`. Kiểm thử dùng Playwright `1.56.1` (`tests/quiz.spec.js`, `tests/fixture.html`, `tests/ocr.html`).

### Chạy kiểm thử tự động

Cần Git và Node.js/npm:

```sh
git clone https://github.com/bGiaHuy/fuo-reui.git
cd fuo-reui
npm ci
npx playwright install chromium
npm test
```

Trên Linux thiếu thư viện hệ thống, dùng `npx playwright install --with-deps chromium`. Chạy riêng một cấu hình viewport (`1280×800` hoặc `390×844`):

```sh
npm test -- --project=desktop
npm test -- --project=mobile
```

*Bộ test giả lập OCR và AI nên không gọi API thật hay diễn đàn đang chạy.*

### Chạy trang mẫu thủ công

Từ thư mục gốc repo (cần Python 3):

```sh
python3 -m http.server 8765
```

- `http://localhost:8765/tests/fixture.html`: thử luồng làm bài, chấm điểm, **Cài đặt AI** (kèm mock `/models`) và xuất CSV mà không cần cài Tampermonkey.
- `http://localhost:8765/tests/ocr.html`: thử Tesseract OCR thật qua CDN trên ảnh tạo sẵn.

### Báo lỗi và gửi thay đổi

Mở [GitHub Issue](https://github.com/bGiaHuy/fuo-reui/issues) kèm mô tả lỗi (hoặc tên ảnh / cấu trúc bình luận gặp vấn đề), hoặc tạo Pull Request kèm kiểm thử trong `tests/quiz.spec.js`.

---

## Credits và License

### Tác giả và đóng góp

- **Gia Huy Bùi** ([@bGiaHuy](https://github.com/bGiaHuy)) — tác giả gốc của repo và userscript ban đầu, cải thiện giao diện đọc lời giải AI trên sidebar và kiểm duyệt tích hợp BYOK.
- **Phùng Xuân Bách** ([@Gokigenzo](https://github.com/Gokigenzo)) — đồng phát triển: phân loại câu hỏi theo phiếu bình luận và OCR, lời giải AI kèm KaTeX, đánh dấu sao, xuất CSV, nhận diện tên ảnh linh hoạt (`v1.5.3`) và tách ảnh trùng tên (`v1.5.4`).
- **thanh huy** ([@premierere](https://github.com/premierere)) — đóng góp hỗ trợ AI BYOK đa nhà cung cấp, tải danh sách `/models` và tùy chọn mức suy nghĩ (`Thinking`).

### Thư viện và nền tảng

- [KaTeX](https://katex.org/) — hiển thị công thức toán.
- [Tesseract.js](https://tesseract.projectnaptha.com/) — OCR phân loại câu hỏi trên trình duyệt.
- [Playwright](https://playwright.dev/) — bộ kiểm thử tự động desktop và mobile.
- [Tampermonkey](https://www.tampermonkey.net/) — trình chạy userscript.
- [FUOverflow](https://fuoverflow.com/) — diễn đàn nguồn đề thi; dự án này phát triển độc lập, không trực thuộc ban quản trị FUOverflow.

### License

Repo hiện chưa có file `LICENSE`. Nếu bạn muốn phân phối lại hoặc dùng ngoài mục đích học tập cá nhân, hãy trao đổi trước với tác giả qua [GitHub Issues](https://github.com/bGiaHuy/fuo-reui/issues).
