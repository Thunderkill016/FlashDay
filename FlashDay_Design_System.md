# FlashDay: Unified Neo-Brutalist Design System

Tài liệu này là nguồn sự thật (source of truth) DUY NHẤT cho UI/UX của toàn bộ dự án FlashDay. Nhằm duy trì tính nhất quán tuyệt đối, toàn bộ ứng dụng (từ Landing Page, màn hình Đăng nhập, đến App Core và màn hình Ôn tập) đều sử dụng chung một ngôn ngữ thiết kế: **Neo-Brutalism**.

## 1. TRIẾT LÝ THIẾT KẾ (THE PHILOSOPHY)
**Neo-Brutalism** mang lại cảm giác mạnh mẽ, táo bạo, và kỹ thuật. Nó loại bỏ sự mờ ảo của các thiết kế web truyền thống, thay vào đó là sự rõ ràng đến mức cực đoan.
- **Không có vùng xám (No ambiguous states):** Các ranh giới phải được định nghĩa bằng viền đen (solid borders) sắc nét.
- **Đổ bóng cứng (Hard Shadows):** Không dùng shadow khuếch tán (blur). Bóng đổ phải đặc, màu đen hoặc màu tương phản mạnh.
- **Độ tương phản tối đa:** Chữ luôn phải cực kỳ dễ đọc trên nền.
- **Thô nhưng có tổ chức:** Tuy mang tên Brutalism, cấu trúc layout phải cực kỳ chặt chẽ (Grid, Flexbox căn chỉnh hoàn hảo).

## 2. HỆ THỐNG TOKENS (VISUAL SYSTEM)

### Màu sắc cốt lõi (Core Colors)
| Token | Hex | Role & Usage |
| :--- | :--- | :--- |
| `ink-950` | `#090B0D` | Màu đen sâu. Dùng làm background chính của toàn bộ App, viền (border), chữ trên nền sáng, và bóng đổ (shadow). |
| `ink-800` | `#1c2024` | Đen nhạt hơn, dùng làm nền phụ (secondary background) hoặc disabled states. |
| `flash` | `#E8FF65` | Vàng chanh rực rỡ. Dùng làm điểm nhấn, Primary CTA, logo, và các focus state quan trọng. |
| `surface` | `#FFFFFF` | Trắng tinh. Dùng làm nền cho các Card, Input field, Box nổi bật để tạo độ tương phản cực mạnh với nền đen. |
| `muted` | `#606660` | Xám. Dùng cho text phụ, hint text. |

### Typography
- **Display / Heading:** `Bricolage Grotesque` (Dày, góc cạnh, ấn tượng mạnh).
- **Body / Form / Data:** `Inter` hoặc `Be Vietnam Pro` (Rõ ràng, dễ đọc cho dữ liệu học thuật).

### Hình khối & Viền (Shapes & Borders)
- **Border mặc định:** `2px solid var(--ink-950)` hoặc `3px solid var(--ink-950)` cho các khối lớn.
- **Radius:** Không quá bo tròn tròn xoe. Mức độ bo góc (Border-radius) nên từ `8px` (Input) đến `16px` (Card).
- **Shadow (Khối nổi):** `box-shadow: 6px 6px 0 var(--ink-950);`. Khi hover, shadow tăng lên `8px 8px 0` và form dịch chuyển lên `-2px`. Khi active/click, shadow giảm xuống `2px 2px 0` và form dịch chuyển xuống `2px`.
- Nếu nền đã là đen (`ink-950`), bóng đổ phải là màu `#E8FF65` hoặc Card phải có màu `#FFFFFF` để lộ ra bóng đen.

## 3. CẤU TRÚC MÀN HÌNH CHUẨN (STANDARD LAYOUTS)

### 3.1. Landing Page & Auth
- Không gian nền luôn là Đen (`#090B0D`), có thể xen kẽ nhiễu nhẹ (noise) hoặc gradient vàng rất tối để tạo chiều sâu.
- Các Box chức năng (Form đăng nhập, Pricing card) là khối màu Trắng (`#FFFFFF`), viền đen, bóng đen.

### 3.2. App Core (Bảng điều khiển & Bộ nhớ)
- Sử dụng lưới (Grid) sắc nét.
- Background App là Đen. Các thẻ nhớ (Memory Cards) là các khối hình chữ nhật màu Trắng hoặc Vàng, nằm rải rác nhưng có trật tự.
- Sidebar hoặc Header có ranh giới phân tách bằng viền rõ ràng (`border-bottom: 2px solid var(--ink-900)`).

### 3.3. Màn Ôn Tập (Study / Focus)
- Để tránh nhức mắt khi học lâu, Card ôn tập sẽ đảo màu: Nền Đen (`#111417`), viền Vàng (`#E8FF65`) hoặc viền Trắng trong suốt.
- Vẫn tuân thủ Neo-Brutalism nhưng giảm diện tích vùng màu sáng xuống mức tối thiểu (chỉ giữ màu sáng ở Text và Primary CTA).

## 4. QUY TẮC ACCESSIBILITY & UX
- Mọi nút bấm (Button) phải có feedback rõ ràng: `:hover` nảy lên, `:active` lún xuống.
- Input khi được chọn (`:focus`) phải có viền nổi bật (dùng màu `flash` hoặc viền đen đặc).
- Các form luôn cung cấp đủ nhãn (Labels) và aria-attributes. Tuyệt đối không ẩn Label.
