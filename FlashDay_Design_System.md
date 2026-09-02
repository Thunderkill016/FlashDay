# FlashDay: Production-Ready UI/UX & Design System

Tài liệu này là nguồn sự thật (source of truth) cho UI/UX của FlashDay, được thiết kế với triết lý đa tầng nhằm tối ưu hóa từng giai đoạn trải nghiệm của người dùng. Hệ thống UI của FlashDay được chia thành 3 phân lớp (Tiered Design Architecture) rõ rệt:

1. **Neo-Brutalism (Marketing & Auth Flow)**: Dành cho Landing Page và trang Đăng nhập. Gây ấn tượng mạnh, phá cách, thu hút sự chú ý.
2. **Quiet Confidence (App Core)**: Dành cho không gian quản lý hệ thống (Learning Hub, Memory, Settings). Sáng sủa, đáng tin cậy, bình tĩnh.
3. **Monastic (Focus Chamber / Review Tab)**: Dành riêng cho màn hình ôn tập thẻ. Tối màu, tĩnh lặng tuyệt đối, loại bỏ mọi yếu tố thị giác gây nhiễu để tối đa hóa sự tập trung.

---

## 1. HỆ THỐNG ĐA TẦNG (THREE-TIERED ARCHITECTURE)

### 1.1. Tầng 1: Neo-Brutalism (Landing Page & Login)
**Mục đích:** Thu hút, hiện đại, thể hiện cá tính của sản phẩm.
- **Background:** Đen sâu (`--ink-950: #090B0D`).
- **Surface (Card/Box):** Trắng tinh (`#FFFFFF`) với viền rõ nét.
- **Accent/CTA:** Vàng chanh (`--flash: #E8FF65`).
- **Shadows:** Đổ bóng đặc, không nhòe (Solid drop shadows - ví dụ: `4px 4px 0 var(--ink-950)`).
- **Typography:** 
  - Display/Heading: `Bricolage Grotesque` (dày, ấn tượng).
  - Body/Form: `Be Vietnam Pro` hoặc `IBM Plex Mono`.

### 1.2. Tầng 2: Quiet Confidence (App Core / Hub)
**Mục đích:** Một không gian làm việc sáng sủa, sạch sẽ, tạo cảm giác đáng tin cậy như các công cụ năng suất (Apple, Linear).
- **Background (Canvas):** Off-white ấm (`#F7F7F3`).
- **Surface (Card/Dropdown):** Trắng (`#FFFFFF`).
- **Primary Accent:** Xanh ngọc bích đậm (`#18553C`).
- **Shadows:** Rất mềm, khuếch tán rộng (Soft shadows - ví dụ: `0 4px 20px rgba(0,0,0,0.05)`).
- **Typography:** 
  - Toàn hệ thống: `Inter` hoặc `system-ui`. Trọng tâm vào tính dễ đọc cao nhất với dữ liệu nhiều.

### 1.3. Tầng 3: Monastic (Review Tab / Focus Chamber)
**Mục đích:** Không gian "thiền định" để ôn tập. Không brand, không màu mè, không bóng đổ gây nhiễu. Trọng tâm 100% vào việc truy xuất trí nhớ.
- **Background (Canvas):** Đen sâu (`#090B0D`).
- **Surface (Study Card):** Xám siêu tối (`#111417`), tạo chiều sâu lõm nhẹ so với viền.
- **Borders:** Mờ ảo, trong suốt (`rgba(255,255,255,0.1)`).
- **Shadows:** Không sử dụng brutalist shadow, chỉ dùng inner shadow hoặc drop shadow cực kỳ tự nhiên.
- **Typography:** 
  - Prompt/Cues: `Bricolage Grotesque` (to, rõ ràng).
  - Body/Instructions: `Be Vietnam Pro`.

---

## 2. COLOR TOKENS CỤ THỂ

### 2.1. Tokens cho App Core (Quiet Confidence - Light Mode)
| Token | Hex | Role & Usage |
| :--- | :--- | :--- |
| `canvas` | `#F7F7F3` | Nền chính của ứng dụng. |
| `surface` | `#FFFFFF` | Nền của danh sách, modal, input. |
| `text-primary` | `#172019` | Chữ chính, tiêu đề. |
| `text-secondary` | `#59645C` | Chữ phụ, placeholder. |
| `primary` | `#18553C` | Primary button, progress bar. |
| `primary-hover` | `#123D2C` | Hover state cho primary button. |
| `border-interactive`| `#7A847C` | Viền input, button secondary. |
| `border-decorative` | `#D9DED8` | Đường phân cách tĩnh. |

### 2.2. Tokens cho Focus Chamber (Monastic - Dark Mode)
| Token | Hex/RGBA | Role & Usage |
| :--- | :--- | :--- |
| `fd-canvas` | `#090B0D` | Không gian tối bao quanh thẻ học. |
| `fd-surface` | `#111417` | Nền thẻ học (Study Card). |
| `fd-primary-text` | `#F1F5F9` | Chữ chính của câu hỏi/đáp án. |
| `fd-secondary-text`| `#94A3B8` | Chữ phụ, hướng dẫn, gợi ý. |
| `fd-border` | `rgba(255,255,255,0.1)` | Viền thẻ, viền nút bấm tĩnh. |
| `fd-border-hover` | `rgba(255,255,255,0.2)` | Viền thẻ khi hover (nếu có tương tác). |

---

## 3. SPACING, GRID & RADIUS (Áp dụng chung)

- **Base Grid:** 4px. Hệ thống spacing chuẩn: `4, 8, 12, 16, 20, 24, 32, 40, 48` (px).
- **Radius (Neo-Brutalism & Monastic):**
  - Thường sử dụng bo góc lớn cho mảng khối (Card/Modal): `24px`.
  - Nút bấm chính: `12px` - `16px`.
- **Radius (Quiet Confidence):**
  - Card/Bảng: `16px`.
  - Nút bấm, Input: `8px`.

---

## 4. SCREEN ARCHITECTURES (CẤU TRÚC MÀN HÌNH)

### 4.1. Màn Ôn Tập (Focus Chamber) - Luồng Cốt Lõi
Quy tắc: 1 thẻ học, 1 hành động chính. Không hiển thị metadata thừa. Người dùng **bắt buộc phải thực hiện attempt có thể quan sát** trước khi lật thẻ.
- **Top Bar của Card:** [Badge Kỹ Năng] ở trái (VD: "NÓI"). [Source Chip] ở phải.
- **Vùng Prompt (Căn giữa theo chiều dọc):**
  - Focus vào chữ to (`Bricolage Grotesque`). Textarea/Input dùng màu nền `fd-canvas` để tạo độ lõm so với thẻ học (`fd-surface`).
- **Mặt Sau (Back Card):**
  - Giữ hành vi Bespoke hiện tại: bấm từng Unit để chuyển trạng thái `Chưa chấm` / `Nhớ` / `Sai`. Tránh việc tự động diễn giải điểm thành thạo.

### 4.2. Màn Bộ Nhớ (Memory Screen) - Dùng Quiet Confidence
- Layout danh sách, background `canvas` (sáng). 
- Các thẻ nhớ hiển thị dưới dạng hàng ngang gọn gàng, nền `surface` (trắng), chữ rõ ràng dễ quét thông tin.

### 4.3. Landing Page & Auth Flow - Dùng Neo-Brutalism
- **Auth Box:** Form Đăng nhập/Đăng ký nằm gọn trong hộp trắng tinh. Đổ bóng đen cứng (`box-shadow: 4px 4px 0 #090B0D`). Căn giữa trên nền tối của Landing Page.
- **Button:** Sử dụng màu Vàng (`#E8FF65`), viền đen, hiệu ứng nhấp nhô mượt mà nhưng góc cạnh.

---

## 5. HANDOFF NOTES FOR DEVELOPERS

1. **Tuân thủ đúng Ngữ Cảnh (Context-Aware UI):**
   - Không dùng component/CSS của hệ thống "Quiet Confidence" nhúng vào màn hình Review (Monastic). 
   - Landing/Auth và App có file CSS độc lập (`landing.css` vs `app.css`) để đảm bảo không rò rỉ token.
2. **Accessibility (A11y):**
   - Mọi thẻ `<button>` và `<a>` phải có `:focus-visible`.
   - Các field lỗi phải dùng `aria-invalid="true"` và liên kết `aria-describedby` tới thẻ span chứa text báo lỗi.
3. **State Logic Cốt Lõi:**
   - **Engine State & Debug Metadata:** Developer lưu ý tuyệt đối không render JSON raw hay debug metrics (như hệ số FSRS, difficulty) ra UI của Learner.

---
*Tài liệu này là sự quy hoạch rõ ràng về 3 Pattern Design của ứng dụng, tránh sự nhầm lẫn giữa các luồng trải nghiệm.*
