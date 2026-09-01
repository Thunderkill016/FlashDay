# FlashDay: Production-Ready UI/UX & Design System

Tài liệu này là nguồn sự thật (source of truth) cho UI/UX của FlashDay, được thiết kế với triết lý **"Quiet Confidence"** — một không gian học bình tĩnh, đáng tin cậy.
*Tài liệu được cập nhật dựa trên [Web Design Manifesto](file:///home/thunder/.gemini/antigravity/brain/af2acef4-81f4-4a62-8862-90a37571b868/Web_Design_Manifesto.md) (tổng hợp tinh hoa từ Apple, Google, Linear).*

---

## 1. HỆ THỐNG THỊ GIÁC (VISUAL SYSTEM & TOKENS)

### 1.1. Color Tokens & Contrast Audit
Tuyệt đối không sử dụng mã hex trực tiếp trong component. Chỉ sử dụng các semantic token dưới đây.

| Token | Hex | Role & Usage |
| :--- | :--- | :--- |
| `canvas` | `#F7F7F3` | Nền chính của ứng dụng (App background). |
| `surface` | `#FFFFFF` | Nền của thẻ học (Study card), modal, dropdown, input. |
| `text-primary` | `#172019` | Chữ chính, tiêu đề, nội dung thẻ. |
| `text-secondary` | `#59645C` | Chữ phụ, caption, placeholder, inactive icon. |
| `primary` | `#18553C` | Primary button, active states, progress bar, link. |
| `primary-hover` | `#123D2C` | Hover state cho primary button. |
| `primary-soft` | `#DCECE4` | Nền phụ cho badge, active tab, hoặc selected rating. |
| `focus` | `#0A66C2` | Focus ring bao quanh mọi interactive element khi navigate bằng phím. |
| `error` | `#9A4038` | Validation lỗi, thông báo lỗi, icon báo lỗi. |
| `warning` | `#7A4C00` | Thông báo cảnh báo. |
| `border-interactive`| `#7A847C` | Viền input, button secondary, tab active. |
| `border-decorative` | `#D9DED8` | Đường phân cách (divider), viền thẻ tĩnh. |
| `surface-hover` | `#F2F4F3` | Hover nền nhẹ cho secondary control. |
| `surface-disabled` | `#E2E5E3` | Nền control disabled, không dùng cho content. |
| `text-disabled` | `#9AA29D` | Chữ control disabled, không dùng cho nội dung cần đọc. |

**Bảng Kiểm Định Độ Tương Phản (Contrast Audit):**

| Cặp màu (Foreground / Background) | Tỉ lệ tương phản | Tiêu chuẩn WCAG (AA) | Kết quả |
| :--- | :--- | :--- | :--- |
| `text-primary` / `surface` | 16.71:1 | >= 4.5:1 (Text) | ✅ PASS |
| `text-primary` / `canvas` | 15.60:1 | >= 4.5:1 (Text) | ✅ PASS |
| `text-secondary` / `surface` | 6.17:1 | >= 4.5:1 (Text) | ✅ PASS |
| `surface` (Text) / `primary` | 8.74:1 | >= 4.5:1 (Text) | ✅ PASS |
| `primary` / `primary-soft` | 7.14:1 | >= 4.5:1 (Text) | ✅ PASS |
| `focus` (Outline) / `surface` | 5.69:1 | >= 3.0:1 (UI Component) | ✅ PASS |
| `surface` (Text) / `error` | 6.64:1 | >= 4.5:1 (Text) | ✅ PASS |
| `surface` (Text) / `warning` | 7.34:1 | >= 4.5:1 (Text) | ✅ PASS |
| `border-interactive` / `surface` | 3.88:1 | >= 3.0:1 (UI Component) | ✅ PASS |

### 1.2. Typography Tokens
Font family: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`

| Token | Kích thước (Size/Line height) | Weight | Letter Spacing | Áp dụng cho |
| :--- | :--- | :--- | :--- | :--- |
| `display-desktop` | 40px / 48px | 700 (Bold) | -0.03em | Heading màn trống, greeting (Tablet/Desktop) |
| `display-mobile` | 32px / 40px | 700 (Bold) | -0.025em | Heading màn trống, greeting (Mobile) |
| `h2` | 24px / 32px | 700 (Bold) | Normal | Tiêu đề card, Tiêu đề modal |
| `body` | 16px / 24px | 400 (Regular) | Normal | Nội dung câu, ý nghĩa, text nhập liệu |
| `button` | 16px / 20px | 700 (Bold) | Normal | Label của nút bấm chính |
| `label` | 14px / 20px | 600 (Semibold)| Normal | Label input, tab active, trạng thái card |
| `metadata` | 12px / 16px | 600 (Semibold)| Normal | Source chip, badge kỹ năng, caption phụ |

*(Không sử dụng bất kỳ text nào nhỏ hơn 12px)*

### 1.3. Spacing, Grid & Radius
- **Base Grid:** 4px. Hệ thống spacing chuẩn: `4, 8, 12, 16, 20, 24, 32, 40, 48` (px).
- **Radius:**
  - `radius-sm`: 8px (Source chip, badge, input)
  - `radius-md`: 14px (Secondary button, Rating button)
  - `radius-lg`: 16px (Primary CTA button)
  - `radius-xl-mob`: 20px (Study card trên Mobile)
  - `radius-xl-desk`: 24px (Study card trên Tablet/Desktop)
- **Motion:** `duration-fast`: 160ms, `duration-base`: 200ms. Chỉ dùng hiệu ứng opacity hoặc transform nhẹ. Phải tuân thủ `prefers-reduced-motion`.

---

## 2. COMPONENT ANATOMY & STATES

### 2.1. Buttons & CTAs
- **Primary CTA:**
  - Default: Nền `primary`, Chữ `surface` (`button` token), Cao 56px, Radius 16px, Padding ngang 24px.
  - Hover: Nền `primary-hover`.
  - Disabled: Nền `surface-disabled`, Chữ `text-disabled`. Disabled state không
    được là nơi duy nhất truyền đạt một điều kiện bắt buộc: đặt hướng dẫn hoặc
    lỗi ngay cạnh control.
- **Secondary Button:**
  - Default: Nền trong suốt, Viền 1px solid `border-interactive`, Chữ `text-primary`, Cao 48px, Radius 14px.
  - Hover: Nền `surface-hover`.
- **Rating Button:**
  - Default: Nền `surface`, Viền 1px solid `border-interactive`, Chữ `text-primary`, Cao 48px, Radius 14px. Label rõ ràng (VD: "Không nhớ", "Nhớ mang máng", "Nhớ rõ").
  - Selected: Nền `primary-soft`, Viền 1px solid `primary`, Chữ `primary`.
- **Icon Button (VD: Speaker):**
  - Chỉ dùng SVG outline 20px; riêng loa phát âm thanh chính giữa dùng SVG 28px trong vùng bấm `64x64px`. Các icon button khác có target tối thiểu `48x48px`. Chứa thuộc tính `aria-label`.
- **Focus State (Cho tất cả Interactive):**
  - Outline `2px solid focus`, `outline-offset: 2px`. Không bị che lấp bởi phần tử khác.

### 2.2. Inputs & Textareas
- **Textarea (Người học nhập ý hiểu):**
  - Default: Viền `1px solid border-interactive`, Nền `surface`, Chữ `body` `text-primary`. Padding 16px. Border-radius 12px. Min-height: 120px.
  - Focus: Viền `2px solid primary` (không dùng xanh dương cho viền input, xanh dương chỉ cho accessibility focus ring bao ngoài).
  - Error: Viền `2px solid error`. Dòng text báo lỗi (`label` token màu `error`) nằm ngay dưới input, cách 4px, mô tả rõ lỗi (VD: *"Bạn chưa viết ý hiểu của mình"*).

### 2.3. Tabs (Navigation)
- **Container:** Cao 48px. Nền trong suốt.
- **Active Tab:** Text `label`, màu `text-primary`, nền `surface`, radius 8px, shadow siêu nhẹ `0 1px 2px rgba(0,0,0,0.05)`. Padding 8px 16px.
- **Inactive Tab:** Text `label`, màu `text-secondary`, nền trong suốt.
*(Không dùng gạch chân mỏng để báo active)*

### 2.4. Skill Badge & Source Chip
- **Skill Badge (Góc trái thẻ học):**
  - Text `metadata` (Uppercase), Nền `canvas`, Chữ `text-secondary`. Padding 4px 8px. Radius 6px.
- **Source Chip (Góc phải thẻ học):**
  - Text `metadata`, Nền trong suốt, Viền 1px solid `border-interactive`, Chữ `text-secondary`, Icon info nhỏ kế bên. Padding 4px 8px. Radius 6px. Bấm vào sẽ mở Source Panel.

---

## 3. RESPONSIVE REDLINES (3 ARTBOARDS)

Kiến trúc tổng thể: Màu nền toàn app là `canvas`. Nội dung chính nằm gọn trong App Shell (căn giữa).

### 3.1. Mobile (390 x 844)
- **App Shell:** Rộng 100%, không giới hạn max-width nhưng có padding ngang `16px`.
- **Header:** Cao `56px`. Logo trái; trên mobile ưu tiên action Đăng nhập và Reset ở phải. Status chip được ẩn để không ép header tràn ngang.
- **Thanh Progress:** Đặt sát dưới Header, dài 100% width màn hình (trừ padding), cao `6px`, nền rãnh `border-decorative`, thanh chạy màu `primary`, bo tròn `3px`. Có text ẩn cho screen reader.
- **Study Card:** Rộng `calc(100vw - 32px)`. Background `surface`. Padding `20px`. Border-radius `20px`. Border `1px solid border-decorative`. Shadow: `0 4px 12px rgba(0,0,0,0.03)`.
- **Prompt Zone:** Min-height `248px`. Cao động (hug contents) nếu nội dung câu dài để không bao giờ bị cắt chữ.
- **Source Panel:** Mở dạng Bottom Sheet từ dưới lên, có nút Đóng và phím Escape.

### 3.2. Tablet (768 x 1024) & Desktop (1440 x 1024)
- **App Shell:** Căn giữa màn hình. Max-width `760px`. Padding ngang `24px`. KHÔNG thiết kế 2 cột cho màn Ôn, giữ nguyên Single Column Layout để tập trung 100% vào card.
- **Header:** Cao `64px`. Logo "FlashDay" bên trái. Subline `"Ôn để dùng được"` kế bên logo (màu `text-secondary`). Status chip bên phải.
- **Study Card:** Rộng 100% của App Shell (`712px`). Padding `24px`. Border-radius `24px`.
- **Prompt Zone:** Min-height `296px`.
- **Source Panel:** Mở dạng Popover/Tooltip Panel thả xuống ngay dưới Source Chip, có shadow `0 8px 24px rgba(0,0,0,0.08)`.

---

## 4. SCREEN ARCHITECTURES (CẤU TRÚC MÀN HÌNH)

### 4.1. Màn Ôn Tập (Study Screen) - Luồng Cốt Lõi
Quy tắc: 1 thẻ học, 1 hành động chính. Không hiển thị metadata thừa. Người dùng **bắt buộc phải thực hiện attempt có thể quan sát** trước khi lật thẻ.

#### A. Mặt Trước (Front Card) - Trạng thái "Attempt"
- **Top Bar của Card:** [Badge Kỹ Năng] ở trái (VD: "NÓI"). [Source Chip] ở phải.
- **Vùng Prompt (Căn giữa theo chiều dọc):**
  - **Mode ĐỌC:** Hiển thị câu tiếng Anh (display token, `text-primary`). Bên dưới là Textarea placeholder: *"Bạn hiểu câu này thế nào?"*.
  - **Mode VIẾT:** Hiển thị tình huống/ý tiếng Việt (display token, `text-primary`). Bên dưới là Textarea bắt buộc nhập tiếng Anh.
  - **Mode NGHE:** Ban đầu KHÔNG CÓ TEXT. Chỉ có một icon Speaker lớn (vùng bấm 64x64px, màu `primary`, nằm chính giữa). Bên dưới là dòng hướng dẫn `body` màu `text-secondary`: *"Nghe trước, rồi ghi ý bạn hiểu."* Kèm theo Textarea.
  - **Mode NÓI:** Hiển thị ý tiếng Việt. Có dòng Privacy note (`metadata`, `text-secondary`): *"Bản ghi chỉ ở tab này; không được tải lên hoặc đồng bộ."* Hai nút hành động ngang hàng: `[ Ghi âm trên máy ]` (Secondary) và `[ Tôi đã tự nói xong ]` (Secondary).
- **Vùng Đáy Card:**
  - Nút Primary CTA: `[ Xem đáp án ]`. Nút này dùng token disabled nếu user chưa type vào Textarea (đối với Đọc/Viết/Nghe) hoặc chưa click xác nhận nói (đối với Nói); hint cạnh input nêu rõ điều kiện đó.

#### B. Mặt Sau (Back Card) - Trạng thái "Self-Rating"
- **Top Bar:** Giữ nguyên Badge và Source. Bổ sung Heading `label` màu `text-secondary` ở trên cùng: *"Đáp án và tự chấm"*.
- **Vùng Nội Dung:**
  - Câu tiếng Anh chuẩn (`h2`, `text-primary`).
  - Nút Speaker nhỏ (48x48px) bên cạnh câu tiếng Anh.
  - Câu dịch/Ngữ cảnh (`body`, `text-secondary`).
  - Divider (`1px solid border-decorative`).
  - Label *"Bạn vừa trả lời:"* + Câu user đã gõ (hoặc trạng thái đã phát âm), màu `text-secondary`.
- **Vùng Rating (Tự chấm):**
  - Card có thể chứa nhiều Unit. Mỗi Unit phải là một rating button riêng, hiển thị target và trạng thái `Chưa chấm` / `Nhớ` / `Sai`; không được giản lược thành một điểm chung cho cả card.
  - Giữ hành vi Bespoke hiện tại: bấm từng Unit để chuyển trạng thái; `[ Tất cả nhớ ]` đánh dấu toàn bộ Unit trong card. Đây là rating state của scheduler, không phải điểm thành thạo.
- **Vùng Đáy Card:**
  - Nút Primary CTA: `[ Lưu lần ôn ]` giữ luồng Bespoke hiện tại. Khi còn Unit chưa chấm, hiển thị nhắc nhở rõ ràng thay vì âm thầm diễn giải là đã nhớ.
  - Nút Text/Link ở dưới cùng: `[ Báo card lỗi ]`.

### 4.2. Màn Bộ Nhớ (Memory Screen)
- Layout danh sách, background `canvas`. Max-width 760px.
- **List Item (Card nằm ngang):** Padding 16px. Border-radius 12px. Nền `surface`.
  - Hàng trên: Target English (`label`, `text-primary`), Trạng thái Scheduler (Chip nhỏ xíu VD: "Đang học", "Quen", "Vững" - dùng text, không dùng màu xanh lá báo thành thạo).
  - Hàng dưới: Nghĩa tiếng Việt cắt ngắn (`metadata`, `text-secondary`).
  - Bên dưới: bốn status chip có text cho Nghe/Nói/Đọc/Viết. Không dùng chấm hoặc màu đơn lẻ để truyền trạng thái.
- **Empty State:** Hình minh họa outline tĩnh (không mascot/3D). Heading `h2` *"Chưa có thẻ học nào"*. Dòng giải thích `body` *"Thêm các câu tiếng Anh bạn thực sự cần dùng vào bộ nhớ để FlashDay giúp bạn ôn tập."* Primary CTA `[ Thêm unit đầu tiên ]`.

### 4.3. Màn Thêm & Import (Progressive Disclosure)
- **Cấu trúc:** Giữ trong tab cấp cao `Thêm`; phần thêm thủ công đi trước, Import File là section thứ hai, không tạo cấp điều hướng mới nếu không cần thiết.
- **Thêm thủ công (Manual):**
  - **Nhóm bắt buộc (Luôn mở):**
    - Input: "Câu tiếng Anh cần nhớ" (Focus mặc định).
    - Input: "Ý nghĩa / Tình huống sử dụng".
  - **Nhóm mở rộng (Expandable Accordion):** "Ngữ cảnh và nguồn (Tuỳ chọn)"
    - Khi bấm mở ra: Câu nguồn English, bản dịch câu nguồn, URL, timestamp, subtitle/file name và ghi chú. (Dữ liệu nguồn được giữ nguyên vẹn, không cắt xén).
  - CTA đáy: `[ Thêm vào bộ nhớ ]` (Primary).
- **Import File (JSON/SRT):**
  - Khu vực Drag & Drop vuông vức (nền `canvas`, viền dashed `border-interactive`).
  - Trạng thái: Default (Biểu tượng tài liệu), Hover (Nền `primary-soft`), Uploading (Spinner), Success (Tên file + Dấu tick), Error (Viền `error`, Text màu `error` + Nút Thử lại).
  - Copy giải thích rõ: *"Hỗ trợ JSON hoặc SRT chứa transcript."* (Không hiển thị lược đồ schema kỹ thuật ra UI).

### 4.4. Auth & System States
- **Login Dialog:** Modal phủ mờ nền (Overlay rgba 0,0,0, 0.4). Căn giữa. Tiêu đề "Đăng nhập". Subline: "Đồng bộ tiến độ học của bạn". Giữ hai mode Email/password hiện có: `Đăng nhập` và `Tạo tài khoản`; không mô tả Google OAuth khi hệ thống chưa có provider đó.
- **Empty Queue (Màn Ôn):** Khi hết thẻ. Heading *"Hoàn tất hôm nay"*. Subline *"Bạn đã ôn xong tất cả các thẻ tới hạn."*. Secondary CTA `[ Xem bộ nhớ ]`.
- **Offline / Syncing:** Một indicator nhỏ (Status chip) góc phải Header. "Đang đồng bộ..." hoặc "Ngoại tuyến (đã lưu tạm)". Không block luồng học.

---

## 5. HANDOFF NOTES FOR DEVELOPERS

1. **Accessibility (A11y):**
   - Mọi thẻ `<button>` và `<a>` phải có `:focus-visible` trỏ tới CSS variable của `focus` token.
   - Các biểu tượng loa phát âm thanh phải bao bọc bởi `<button aria-label="Nghe âm thanh">`.
   - Các field lỗi phải dùng `aria-invalid="true"` và liên kết `aria-describedby` tới thẻ span chứa text báo lỗi.
2. **State Logic Cốt Lõi:**
   - **Engine State & Debug Metadata:** Developer lưu ý tuyệt đối không render JSON raw hay debug metrics (như hệ số FSRS, difficulty) ra UI của Learner. Nếu cần debug, hãy thiết kế một toggle ẩn (VD: gõ konami code hoặc `?debug=1` trên URL) để hiện thẻ `<pre>` riêng biệt.
   - **Progressive Disclosure:** Trong màn Thêm, form mở rộng bằng HTML `<details>` và `<summary>` hoặc state tương đương để giữ DOM gọn gàng.
3. **Data Model Integrity:**
   - Khi render Source Chip, dùng object `card.source` của runtime. Có thể chứa URL, timestamp, subtitle/file name, surrounding subtitles và context. Nếu URL rỗng nhưng có context, vẫn render context; không giả định có field backend tên `provenance`.
4. **CSS & Token Mapping:**
   - Developer cần thiết lập biến CSS (CSS Variables) map chuẩn xác theo bảng Token ở phần 1.1. Ví dụ: `--fd-primary: #18553C;`
5. **Breakpoints:**
   - Mobile: `< 600px`.
   - Tablet: `>= 600px` và `< 1024px`.
   - Desktop: `>= 1024px`.
   - Lưu ý padding của App shell sẽ snap từ 16px lên 24px khi vượt qua 600px.

---
*Tài liệu này là handoff có thể triển khai. Nó không thay thế kiểm thử browser ở ba viewport, keyboard/focus audit, hoặc kiểm tra các state thật sau khi code.*
