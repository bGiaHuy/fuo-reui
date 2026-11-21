# FUOverflow — Luyện đề

Userscript bổ sung bảng trả lời trắc nghiệm ngay trong trình xem ảnh của FUOverflow: chọn đáp án, chấm theo bình luận, xem lời giải AI (BYOK đa nhà cung cấp) và lưu câu cần ôn ra CSV.

## 1. Cài đặt

Bạn cần trình duyệt có Tampermonkey và quyền truy cập bài viết trên FUOverflow. Người dùng chỉ cần cài userscript; Node.js và Python chỉ phục vụ phát triển, kiểm thử.

1. Cài và bật tiện ích Tampermonkey trong trình duyệt.
2. Mở [file userscript trên nhánh main](https://github.com/bGiaHuy/fuo-reui/raw/refs/heads/main/fuo-reui.user.js).
3. Khi Tampermonkey hiện trang cài đặt, chọn **Install / Cài đặt**. Nếu trình duyệt chỉ hiển thị hoặc tải mã nguồn, mở Tampermonkey → **Create a new script**, thay toàn bộ nội dung mặc định bằng nội dung file [fuo-reui.user.js](./fuo-reui.user.js), rồi lưu.
4. Trong Dashboard của Tampermonkey, kiểm tra script **FUOverflow — Luyện đề** đã được bật. Cho phép tiện ích chạy trên `fuoverflow.com`; nếu trình duyệt yêu cầu quyền chạy userscript, bật theo thông báo của Tampermonkey.
5. Tải lại bài viết FUOverflow đang mở.

Khi cập nhật, mở lại file trên main và xác nhận cập nhật trong Tampermonkey, hoặc thay nội dung script đã cài bằng mã mới rồi lưu. Tránh bật nhiều bản script cùng lúc.

## 2. Bắt đầu luyện đề

1. Mở bài viết có đề thi tại `https://fuoverflow.com/threads/...`.
2. Bấm ảnh câu hỏi để mở trình xem ảnh Fancybox; mở phần thông tin/bình luận bên cạnh nếu đang ẩn.
3. Bảng **Trả lời câu hỏi** xuất hiện trong thanh bên. Chờ phân loại xong trước khi chọn đáp án.
4. Với **Chọn một đáp án**, bấm một nút A–H để chấm ngay.
5. Với **Chọn nhiều đáp án**, bấm các phương án cần chọn, bấm lại để bỏ chọn, rồi bấm **Submit**. Chỉ đúng khi chọn khớp toàn bộ tập đáp án.
6. Đọc kết quả **Đúng / Sai** cùng nguồn đáp án; chuyển sang ảnh tiếp theo trong trình xem ảnh để tiếp tục.

**Nhận diện ảnh từ bản 1.5.3:** hỗ trợ tên ảnh bất kỳ như `Q1.png`, `Q27_91_20250804144948.webp`, `CEA201_SP26_FE (7).webp`. Script đọc tên từ dữ liệu gallery, nhận link ảnh có tham số ký thay đổi và caption ở ngoài slide trên mobile.

### Các nút trong bảng

| Nút | Cách dùng |
| --- | --- |
| **Làm lại** | Xóa lựa chọn và kết quả đang hiển thị của câu hiện tại để trả lời lại; giữ phân loại, dấu sao và lịch sử câu đã sai. |
| **Hiện bình luận / Ẩn bình luận** | Bật/tắt bình luận của ảnh đang xem. Bình luận mặc định được ẩn để tự luyện. |
| **Xem đáp án AI** | Gọi nhà cung cấp AI đang chọn để lấy đáp án tham khảo và giải thích bằng tiếng Việt; riêng thao tác này không chấm câu hỏi. Cần API key (hoặc endpoint HTTP cục bộ không cần key). |
| **Cài đặt AI** | Mở hộp thoại cấu hình nhà cung cấp AI, API key, loại tương thích, model và mức suy nghĩ. |
| **☆ Đánh dấu / ★ Đã đánh dấu** | Thêm/bỏ dấu sao cho câu muốn ôn lại. |
| **Xuất CSV** | Tải danh sách câu đã sai hoặc được đánh dấu của đề hiện tại. |
| **Thử lại phân loại** | Thử lại khi bình luận hoặc OCR tải lỗi; các nút đáp án bị khóa cho đến khi phân loại thành công. |

Lời giải AI dài có thể cuộn trong thanh bên, kèm tên nhà cung cấp, model và mức suy nghĩ (nếu khác `default`). Công thức được hiển thị bằng KaTeX.

## 3. Script chấm đáp án như thế nào?

- Script đọc bình luận của ảnh hiện tại, tính tối đa một phiếu hợp lệ cho mỗi tác giả và bỏ phần trích dẫn. Một số cách viết được nhận diện: `A`, `A,C`, `Đáp án: A`, hoặc kết luận `-> A`, `→ A`.
- Nếu có phiếu chọn nhiều chữ cái, câu hỏi được phân loại là chọn nhiều. Nếu không có phiếu hợp lệ, Tesseract OCR đọc ảnh tiếng Anh/Việt để tìm chỉ dẫn chọn nhiều; nếu không tìm thấy thì dùng chế độ chọn một.
- Khi chấm, **tập đáp án có nhiều phiếu nhất** được dùng làm đáp án tham khảo. Ví dụ `AC` và `CA` là cùng một tập; script không cộng riêng từng chữ cái để tạo đáp án.
- Khi không có phiếu hoặc các tập đứng đầu hòa nhau, script tự gọi nhà cung cấp AI đang chọn (mặc định là `DeepSeek`). Nếu thiếu key (với endpoint từ xa) hoặc gọi AI lỗi, lựa chọn được giữ lại để thử lại.
- Tỷ lệ phần trăm hiển thị là **tỷ lệ phiếu bình luận**, không phải xác suất đáp án đúng.
- Nếu AI khác đáp án bình luận, bảng lời giải nêu sự khác biệt; kết quả chấm vẫn theo bình luận khi có tập thắng rõ ràng.

Đáp án từ cộng đồng và AI đều là nguồn tham khảo; hãy đối chiếu với kiến thức môn học.

## 4. Cấu hình AI — BYOK & Đa nhà cung cấp (tùy chọn)

Bạn có thể chấm theo bình luận mà không cần cài AI hoặc API key. Khi dùng tính năng AI (theo mô hình BYOK — tự mang API key hoặc kết nối endpoint cục bộ), script gửi **ảnh câu hỏi và lựa chọn hiện tại** đến endpoint bạn đã chọn; các API trả phí có thể phát sinh chi phí theo tài khoản của bạn.

### Cách mở cài đặt và cài API key

- **Trong bảng luyện đề:** bấm nút **Cài đặt AI** để mở hộp thoại **Cài đặt AI (BYOK)**.
- **Trong menu Tampermonkey:**
  - Chọn **Cấu hình AI (BYOK / Model / Thinking)** để mở cùng hộp thoại cài đặt AI.
  - Chọn **Cài / xóa API key (nhà cung cấp hiện tại)** để nhập hoặc xóa nhanh API key cho nhà cung cấp đang kích hoạt (để trống và xác nhận để xóa; bấm Cancel để giữ nguyên).

Trong hộp thoại **Cài đặt AI (BYOK)**, sau khi chỉnh sửa, bấm **Lưu cấu hình** để áp dụng (bấm **Đóng**, nút `×`, nền ngoài hoặc `Esc` để đóng mà không lưu thay đổi cấu hình chưa lưu). Khi cài API key bằng **Đặt / đổi API key** hoặc xóa bằng **Xóa key**, thao tác áp dụng trực tiếp vào kho key của hồ sơ đang chọn.

### Nhà cung cấp dựng sẵn và hồ sơ tùy chỉnh

Script tích hợp sẵn 5 cấu hình nhà cung cấp (mặc định đang chọn là **DeepSeek**):

| Nhà cung cấp | Base URL mặc định | Loại tương thích mặc định | Model mặc định | Thinking mặc định |
| --- | --- | --- | --- | --- |
| **DeepSeek** | `https://api.deepseek.com` | `deepseek` | `deepseek-flash` | `off` |
| **OpenAI** | `https://api.openai.com/v1` | `openai` | `gpt-4.1-mini` | `default` |
| **Anthropic Claude** | `https://api.anthropic.com/v1` | `anthropic` | `claude-sonnet-4-5` | `off` |
| **Google Gemini** | `https://generativelanguage.googleapis.com/v1beta` | `gemini` | `gemini-2.5-flash` | `off` |
| **OpenRouter** | `https://openrouter.ai/api/v1` | `openai` | `openai/gpt-4.1-mini` | `default` |

- Với các preset dựng sẵn, bạn có thể chỉnh `Loại tương thích`, `Base URL`, `Model` và `Mức suy nghĩ (Thinking)`, hoặc bấm **Mặc định** để khôi phục thông số gốc của preset đó (không đổi hoặc xóa API key hiện tại trừ khi bạn lưu đổi domain sang origin khác).
- Bấm **+ Tùy chỉnh** để tạo hồ sơ mới (tối đa **20** hồ sơ tùy chỉnh), đặt **Tên hiển thị** (1–60 ký tự), cấu hình endpoint/model rồi lưu; bấm **Xóa** để xóa hồ sơ tùy chỉnh đang chọn (đồng thời xóa key gắn với hồ sơ đó).

### 4 chế độ tương thích (`Compatible Type`)

Trường **Loại tương thích** quyết định định dạng request/response mà script sử dụng:

- **`openai`** (*OpenAI-compatible (Chat Completions)*): gọi `POST {Base URL}/chat/completions` với `Authorization: Bearer ...` và `GET {Base URL}/models`. Phù hợp với OpenAI, OpenRouter, Ollama (`/v1`), LM Studio (`/v1`) và các gateway tương thích OpenAI.
- **`deepseek`** (*DeepSeek-compatible*): gọi `POST {Base URL}/chat/completions` với `Authorization: Bearer ...` và tham số `thinking` của DeepSeek, cùng `GET {Base URL}/models`.
- **`anthropic`** (*Anthropic Claude (Messages API)*): gọi `POST {Base URL}/messages` với header `x-api-key` và `anthropic-version: 2023-06-01`, cùng `GET {Base URL}/models`.
- **`gemini`** (*Google Gemini (GenerateContent)*): gọi `POST {Base URL}/models/{model}:generateContent` với header `x-goog-api-key`, cùng `GET {Base URL}/models` (chỉ hiển thị các model hỗ trợ `generateContent`).

### Khám phá danh sách model (`/models`) và nhập tay

- Bấm **Tải danh sách (/models)** để gửi `GET {Base URL}/models` (thời hạn chờ **15 giây**, có cache trong phiên cho đến khi bấm tải lại).
- Danh sách trả về được loại bỏ trùng lặp, sắp xếp theo ID và hiển thị tối đa **500** model.
- Khi có **hơn 10 model**, ô tìm kiếm **Lọc model…** sẽ tự động hiện để lọc nhanh trước khi chọn từ danh sách thả xuống.
- Bạn luôn có thể **nhập tay Model ID** trực tiếp vào ô **Model** (chấp nhận chữ, số và `. _ : / @ + -`, tối đa 160 ký tự, không chứa `..`, `//` hoặc kết thúc bằng `/`).

### 5 mức suy nghĩ (`Mức suy nghĩ (Thinking)`)

| Mức | Nhãn trong giao diện | Thời hạn chờ (timeout) | Ghi chú |
| --- | --- | --- | --- |
| `default` | `Mặc định (default)` | `60s` | Dùng mặc định của nhà cung cấp/model. |
| `off` | `Tắt (off)` | `60s` | Tắt suy nghĩ mở rộng (với DeepSeek/Gemini có hỗ trợ); phản hồi nhanh và tiết kiệm token nhất. |
| `low` | `Thấp (low)` | `90s` | Tăng ngân sách token và thời hạn chờ cho suy luận nhẹ. |
| `medium` | `Trung bình (medium)` | `90s` | Tăng ngân sách token và thời hạn chờ cho suy luận trung bình. |
| `high` | `Cao (high)` | `120s` | Ngân sách token và thời hạn chờ tối đa cho câu hỏi phức tạp. |

### Hỗ trợ endpoint cục bộ (`localhost` / Ollama / LM Studio)

- Script cho phép dùng `http://` riêng cho các địa chỉ loopback cục bộ: `http://localhost`, `http://127.0.0.1` và `http://[::1]` (ví dụ `http://localhost:11434/v1` cho Ollama hoặc `http://localhost:1234/v1` cho LM Studio).
- Khi nhập HTTP cục bộ, hộp thoại hiển thị cảnh báo *chỉ an toàn trên máy cá nhân* và trạng thái **Không bắt buộc (local HTTP)** — bạn có thể gọi `/models` và chấm/giải AI mà không cần cài API key (hoặc cài thêm key tùy chọn nếu proxy nội bộ yêu cầu).

### Cơ chế bảo mật

- **API key chỉ ghi (write-only) qua `prompt()`:** Key chỉ được nhập qua hộp thoại `prompt()` gốc của trình duyệt, lưu trong bộ nhớ userscript Tampermonkey (`fuoAIKeys`) và **không bao giờ** ghi vào DOM, ô `<input>`, `localStorage`, `sessionStorage`, CSV xuất ra hay `console.*`. Giao diện chỉ hiển thị trạng thái (`Đã cấu hình`, `Đã cấu hình (tùy chọn)`, `Không bắt buộc (local HTTP)`, `Chưa cài`). Nếu trước đây bạn đã cài `deepseekKey` cho `https://api.deepseek.com`, script tự đọc dự phòng cho tới khi bạn ghi key mới hoặc đổi domain.
- **Ràng buộc theo origin (`fuoAIKeys`):** Mỗi API key được lưu gắn liền với `origin` (`scheme + host + port`) của hồ sơ đó. Khi đổi **Base URL** sang origin khác và lưu, script tự động xóa API key cũ của hồ sơ đó (kể cả `deepseekKey` cũ nếu đổi domain của DeepSeek) và thông báo cài lại key để tránh rò rỉ key sang máy chủ khác.
- **Kiểm soát chặt chẽ Base URL và header xác thực:** Bắt buộc `https://` cho mọi endpoint từ xa (chỉ cho phép `http://` với `localhost`, `127.0.0.1`, `[::1]`); chặn thông tin đăng nhập trong URL (`user:pass@`), query string (`?`), fragment (`#`) và ký tự điều khiển. API key không bao giờ được gắn vào URL (ví dụ Google Gemini nhận key qua header `x-goog-api-key`, không dùng `?key=`).
- **Cô lập yêu cầu mạng và lọc thông báo lỗi:** Mọi lệnh `GM_xmlhttpRequest` đều bật `anonymous: true` (không gửi cookie trình duyệt kèm yêu cầu AI) và giới hạn thời gian chờ. Mọi thông báo lỗi từ nhà cung cấp đều đi qua bộ lọc ẩn bí mật (`[REDACTED]`) và cắt ngắn (tối đa 240 ký tự) trước khi hiển thị.
- **Chống XSS, prototype pollution, CSV injection và kiểm soát ảnh:** Giao diện không sử dụng `innerHTML` hay đánh giá chuỗi động; toàn bộ văn bản (tên nhà cung cấp, nhãn model, lỗi HTTP, lời giải AI) được chèn bằng `textContent`/DOM API và KaTeX chạy ở chế độ `trust: false`. Dữ liệu cấu hình/key chặn các khóa prototype (`__proto__`, `constructor`, `prototype`), CSV tự thoát ký tự đầu công thức (`=`, `+`, `-`, `@`), ảnh câu hỏi chỉ được đọc cùng origin với trang (`PNG/JPEG/WebP/GIF`) và giới hạn dung lượng **15 MB**.
- **Quyền `@connect *`:** Ngoài 5 domain dựng sẵn (`api.deepseek.com`, `api.openai.com`, `api.anthropic.com`, `generativelanguage.googleapis.com`, `openrouter.ai`), metadata khai báo `@connect *` để Tampermonkey hỏi xác nhận quyền truy cập theo từng domain tùy chỉnh hoặc cục bộ mới khi bạn sử dụng.

Chấm bằng AI và nút **Xem đáp án AI** dùng chung kết quả đã lấy cho cùng câu hỏi, lựa chọn và cấu hình AI trong phiên; đổi cấu hình sẽ xóa kết quả hiển thị cũ và hủy nhận phản hồi cũ đang chờ. Nếu AI trả dữ liệu không hợp lệ hoặc đáp án và lời giải mâu thuẫn, script báo lỗi để thử lại.

## 5. Lưu câu cần ôn và xuất CSV

- Câu từng trả lời sai và câu có dấu sao được lưu theo đường dẫn bài viết trong bộ nhớ Tampermonkey. Làm đúng ở lần sau hoặc bấm **Làm lại** không xóa lịch sử đã sai.
- Bấm **Xuất CSV** trong bảng, hoặc menu Tampermonkey **Xuất CSV câu sai / đánh dấu**.
- File có tên `<tên đề>_cau-can-on.csv`, gồm tên đề, câu hỏi, trạng thái sai/dấu sao, lựa chọn, đáp án tham khảo, nguồn đáp án (với AI là `<tên nhà cung cấp> · đáp án tham khảo`), link ảnh và link đề. Có thể mở bằng Excel hoặc nhập vào Google Sheets.
- Script cũng tự xuất một lần khi chấm xong câu có số lớn nhất trong danh sách ảnh mà nó nhận diện được. Đây không phải kiểm tra đã làm hết mọi câu; hãy xuất thủ công nếu danh sách ảnh không đầy đủ hoặc trình duyệt chặn tải xuống.
- Để xóa kết quả và dấu sao của **đề hiện tại**, chọn menu **Bắt đầu lượt luyện đề mới**, đọc hộp xác nhận rồi đồng ý. Trang sẽ tải lại. Nên xuất CSV trước nếu muốn giữ kết quả cũ.

## 6. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| Không thấy bảng luyện đề | Kiểm tra script đã bật, quyền truy cập trang, đúng đường dẫn `/threads/`, đã mở ảnh và thanh bên. Kiểm tra tên ảnh có đúng dạng hỗ trợ; tải lại trang sau khi cài/cập nhật. |
| Đang phân loại lâu hoặc không bấm được đáp án | Chờ bình luận/ảnh tải xong; kiểm tra mạng và quyền tải tài nguyên CDN, rồi bấm **Thử lại phân loại**. Khởi động OCR và nhận diện ảnh có thời hạn tối đa 60 giây cho mỗi bước. |
| Báo chưa cài API key | Cài key trong **Cài đặt AI** → **Đặt / đổi API key** hoặc menu Tampermonkey **Cài / xóa API key (nhà cung cấp hiện tại)**. Lưu ý đổi **Base URL** sang domain khác sẽ tự xóa key cũ nên cần cài lại; riêng endpoint HTTP cục bộ (`localhost`, `127.0.0.1`, `[::1]`) không bắt buộc key. |
| Nhà cung cấp AI báo lỗi HTTP, mất kết nối hoặc quá thời gian | Kiểm tra API key, số dư/quyền API, **Loại tương thích**, **Base URL**, **Model ID**, mạng và xác nhận quyền domain trong Tampermonkey (`@connect`), rồi thử lại. Timeout là `60s`/`90s`/`120s` tùy mức Thinking (`15s` cho `/models`). Phản hồi không hợp lệ hoặc mâu thuẫn cũng không được dùng để chấm. |
| Không lưu được cấu hình hoặc không tải được `/models` | Kiểm tra **Base URL** hợp lệ (`https://` cho endpoint từ xa hoặc `http://` loopback cục bộ, không chứa `user:pass@`, `?` hoặc `#`), **Model ID** hợp lệ và số hồ sơ tùy chỉnh chưa vượt quá 20. |
| Không đọc được ảnh để gửi AI hoặc báo ảnh quá lớn | Đợi ảnh tải xong. Luồng AI chỉ đọc ảnh cùng nguồn với trang, định dạng `PNG/JPEG/WebP/GIF` và dung lượng tối đa **15 MB**. |
| CSV chỉ có dòng tiêu đề | Đề hiện tại chưa có câu sai hoặc câu được đánh dấu. |
| Mất dữ liệu khi đổi máy/trình duyệt | Dữ liệu nằm trong bộ nhớ userscript của môi trường đang dùng; xuất CSV để giữ bản ôn tập. |

## 7. Phát triển và kiểm thử

### Cấu trúc repo

- `fuo-reui.user.js`: toàn bộ userscript (v2.0.0); sửa trực tiếp, không có bước build.
- `tests/quiz.spec.js`: kiểm thử Playwright với dữ liệu mô phỏng.
- `tests/fixture.html`: trang mẫu tương tác với bình luận, OCR giả lập, kho lưu giả lập (`fuoAIConfig`, `fuoAIKeys`, `deepseekKey` trong `window.gmStore` / `window.saved`) và giả lập `/models` + hoàn thành câu hỏi cho cả 4 loại tương thích (`openai`, `deepseek`, `anthropic`, `gemini`).
- `tests/ocr.html`: trang thử OCR thật qua CDN trên ảnh được tạo.
- `playwright.config.js`: cấu hình desktop 1280×800 và mobile 390×844.

### Chạy kiểm thử tự động

Cần Git, Node.js/npm và môi trường chạy Chromium của Playwright.

```sh
git clone https://github.com/bGiaHuy/fuo-reui.git
cd fuo-reui
npm ci
npx playwright install chromium
npm test
```

Trên Linux thiếu thư viện hệ thống, có thể dùng `npx playwright install --with-deps chromium` với quyền cài gói phù hợp.

```sh
# Chỉ chạy một cấu hình
npm test -- --project=desktop
npm test -- --project=mobile
```

Suite giả lập OCR và AI để kiểm tra luồng trả lời, chấm điểm, thử lại, lưu câu sai, dấu sao và CSV. Kết quả suite không xác nhận API AI thật hoặc tích hợp trên diễn đàn đang hoạt động.

### Mở trang mẫu thủ công

Từ thư mục gốc repo, cần Python 3:

```sh
python3 -m http.server 8765
```

- Mở [fixture luyện đề](http://localhost:8765/tests/fixture.html) để thử chọn A và C rồi **Submit**, **Làm lại**, đánh dấu, **Cài đặt AI** (bao gồm tải `/models` giả lập) và xuất CSV. Trang mẫu nạp trực tiếp script và không cần cài Tampermonkey.
- Mở [fixture OCR thật](http://localhost:8765/tests/ocr.html) để thử Tesseract; cần mạng để tải thư viện, worker và dữ liệu ngôn ngữ.
- Kiểm tra bản userscript đã cài trên FUOverflow riêng khi thay đổi tích hợp Fancybox hoặc API.

Phụ thuộc chạy trong trình duyệt được khai báo ở metadata userscript: Tesseract.js 5.1.1 và KaTeX 0.19.1. Playwright được ghim trong `package-lock.json`.


## v1.5.3 dynamic attachment detection

Question filenames no longer need a Q prefix: names such as
`CEA201_SP26_FE (7).webp` are accepted. Catalog discovery reads gallery caption
metadata and image alt text, groups attachments by `data-fancybox`, and matches
signed attachment URLs without their query/hash. Numbered Q filenames and
parenthesized numbers retain numeric completion order; other filenames use gallery
order. Existing full-filename practice keys are preserved.

Verified: 88 Playwright desktop/mobile tests passed, including arbitrary filenames
and changing URL signatures, plus captions moved outside the slide on mobile. Live CEA201 gallery UI was checked with injected GM
storage shims and mocked OCR; no installed userscript update or live AI call.

## v1.5.4 — Ảnh trùng tên

Các ảnh có cùng tên file trong một đề được phân biệt bằng đường dẫn attachment
(bỏ query/hash ký tạm thời). Đáp án, dấu sao và CSV được lưu riêng cho từng ảnh;
đề có tên ảnh riêng vẫn dùng khóa lưu cũ. Với sidebar có ID media, script chờ
đúng media trước khi đọc bình luận. Dữ liệu cũ đã gộp nhiều ảnh trùng tên không
thể tự tách lại chính xác; hãy làm lại các câu đó sau khi cập nhật.
