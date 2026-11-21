# FUOverflow — Luyện đề

Userscript bổ sung bảng trả lời trắc nghiệm ngay trong trình xem ảnh của FUOverflow: chọn đáp án, chấm theo bình luận, xem lời giải AI và lưu câu cần ôn ra CSV.

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
| **Xem đáp án AI** | Lấy đáp án tham khảo và giải thích bằng tiếng Việt; riêng thao tác này không chấm câu hỏi. Cần DeepSeek API key. |
| **☆ Đánh dấu / ★ Đã đánh dấu** | Thêm/bỏ dấu sao cho câu muốn ôn lại. |
| **Xuất CSV** | Tải danh sách câu đã sai hoặc được đánh dấu của đề hiện tại. |
| **Thử lại phân loại** | Thử lại khi bình luận hoặc OCR tải lỗi; các nút đáp án bị khóa cho đến khi phân loại thành công. |

Lời giải AI dài có thể cuộn trong thanh bên. Công thức được hiển thị bằng KaTeX.

## 3. Script chấm đáp án như thế nào?

- Script đọc bình luận của ảnh hiện tại, tính tối đa một phiếu hợp lệ cho mỗi tác giả và bỏ phần trích dẫn. Một số cách viết được nhận diện: `A`, `A,C`, `Đáp án: A`, hoặc kết luận `-> A`, `→ A`.
- Nếu có phiếu chọn nhiều chữ cái, câu hỏi được phân loại là chọn nhiều. Nếu không có phiếu hợp lệ, Tesseract OCR đọc ảnh tiếng Anh/Việt để tìm chỉ dẫn chọn nhiều; nếu không tìm thấy thì dùng chế độ chọn một.
- Khi chấm, **tập đáp án có nhiều phiếu nhất** được dùng làm đáp án tham khảo. Ví dụ `AC` và `CA` là cùng một tập; script không cộng riêng từng chữ cái để tạo đáp án.
- Khi không có phiếu hoặc các tập đứng đầu hòa nhau, script tự gọi DeepSeek. Nếu thiếu key hoặc gọi AI lỗi, lựa chọn được giữ lại để thử lại.
- Tỷ lệ phần trăm hiển thị là **tỷ lệ phiếu bình luận**, không phải xác suất đáp án đúng.
- Nếu AI khác đáp án bình luận, bảng lời giải nêu sự khác biệt; kết quả chấm vẫn theo bình luận khi có tập thắng rõ ràng.

Đáp án từ cộng đồng và AI đều là nguồn tham khảo; hãy đối chiếu với kiến thức môn học.

## 4. Cấu hình DeepSeek (tùy chọn)

Bạn có thể chấm theo bình luận mà không cài key. AI cần key riêng và tài khoản API có khả năng thực hiện yêu cầu.

1. Mở một bài viết FUOverflow.
2. Bấm biểu tượng Tampermonkey → chọn menu của **FUOverflow — Luyện đề**.
3. Chọn **Cài / xóa DeepSeek API key**.
4. Dán API key rồi xác nhận. Muốn xóa key, mở lại menu này, để trống và xác nhận; bấm Cancel để giữ nguyên.
5. Quay lại ảnh, bấm **Xem đáp án AI**, hoặc thử chấm lại câu cần AI.

Key được lưu bằng bộ nhớ của userscript qua Tampermonkey. Khi dùng AI, script gửi **ảnh câu hỏi và lựa chọn hiện tại** đến `api.deepseek.com`, kèm key để xác thực. Yêu cầu API có thể phát sinh phí theo tài khoản của bạn. Không đưa key vào mã nguồn hoặc commit lên GitHub.

Chấm bằng AI và nút xem lời giải dùng chung kết quả đã lấy cho cùng câu/lựa chọn trong phiên. Nếu AI trả dữ liệu không hợp lệ hoặc đáp án và lời giải mâu thuẫn, script báo lỗi để thử lại.

## 5. Lưu câu cần ôn và xuất CSV

- Câu từng trả lời sai và câu có dấu sao được lưu theo đường dẫn bài viết trong bộ nhớ Tampermonkey. Làm đúng ở lần sau hoặc bấm **Làm lại** không xóa lịch sử đã sai.
- Bấm **Xuất CSV** trong bảng, hoặc menu Tampermonkey **Xuất CSV câu sai / đánh dấu**.
- File có tên `<tên đề>_cau-can-on.csv`, gồm tên đề, câu hỏi, trạng thái sai/dấu sao, lựa chọn, đáp án tham khảo, nguồn đáp án, link ảnh và link đề. Có thể mở bằng Excel hoặc nhập vào Google Sheets.
- Script cũng tự xuất một lần khi chấm xong câu có số lớn nhất trong danh sách ảnh mà nó nhận diện được. Đây không phải kiểm tra đã làm hết mọi câu; hãy xuất thủ công nếu danh sách ảnh không đầy đủ hoặc trình duyệt chặn tải xuống.
- Để xóa kết quả và dấu sao của **đề hiện tại**, chọn menu **Bắt đầu lượt luyện đề mới**, đọc hộp xác nhận rồi đồng ý. Trang sẽ tải lại. Nên xuất CSV trước nếu muốn giữ kết quả cũ.

## 6. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| Không thấy bảng luyện đề | Kiểm tra script đã bật, quyền truy cập trang, đúng đường dẫn `/threads/`, đã mở ảnh và thanh bên. Kiểm tra tên ảnh có đúng dạng hỗ trợ; tải lại trang sau khi cài/cập nhật. |
| Đang phân loại lâu hoặc không bấm được đáp án | Chờ bình luận/ảnh tải xong; kiểm tra mạng và quyền tải tài nguyên CDN, rồi bấm **Thử lại phân loại**. Khởi động OCR và nhận diện ảnh có thời hạn tối đa 60 giây cho mỗi bước. |
| Báo chưa cài API key | Cài key trong menu Tampermonkey. Lỗi này có thể xuất hiện khi bình luận không đủ để xác định đáp án. |
| DeepSeek báo HTTP, mất kết nối hoặc quá thời gian | Kiểm tra key, số dư/quyền API và mạng, rồi thử lại. Phản hồi không hợp lệ cũng sẽ không được dùng để chấm. |
| Không đọc được ảnh để gửi AI | Đợi ảnh tải xong. Luồng AI chỉ đọc ảnh cùng nguồn với trang và có kiểu nội dung PNG/JPEG/WebP/GIF được hỗ trợ. |
| CSV chỉ có dòng tiêu đề | Đề hiện tại chưa có câu sai hoặc câu được đánh dấu. |
| Mất dữ liệu khi đổi máy/trình duyệt | Dữ liệu nằm trong bộ nhớ userscript của môi trường đang dùng; xuất CSV để giữ bản ôn tập. |

## 7. Phát triển và kiểm thử

### Cấu trúc repo

- `fuo-reui.user.js`: toàn bộ userscript; sửa trực tiếp, không có bước build.
- `tests/quiz.spec.js`: kiểm thử Playwright với dữ liệu mô phỏng.
- `tests/fixture.html`: trang mẫu tương tác với bình luận và OCR/AI giả lập.
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

Suite giả lập OCR và AI để kiểm tra luồng trả lời, chấm điểm, thử lại, lưu câu sai, dấu sao và CSV. Kết quả suite không xác nhận API DeepSeek thật hoặc tích hợp trên diễn đàn đang hoạt động.

### Mở trang mẫu thủ công

Từ thư mục gốc repo, cần Python 3:

```sh
python3 -m http.server 8765
```

- Mở [fixture luyện đề](http://localhost:8765/tests/fixture.html) để thử chọn A và C rồi **Submit**, **Làm lại**, đánh dấu và xuất CSV. Trang mẫu nạp trực tiếp script và không cần cài Tampermonkey.
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
