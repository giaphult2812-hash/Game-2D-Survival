# Tiếp Tục Phát Triển Dự Án Từ GitHub Public Repository

**Có, hoàn toàn thực hiện được.** Vì repository của bạn ở chế độ **Public**, hệ thống có thể tải trực tiếp mã nguồn về môi trường làm việc tại đây để tiếp tục lập trình, kiểm thử và giúp bạn tải về toàn bộ mã nguồn đã cập nhật để tự `git push` lên lại GitHub.

## User Review & Critical Decisions

> [!IMPORTANT]
> Để bắt đầu thực hiện ngay sau khi bạn duyệt kế hoạch, bạn vui lòng cung cấp thêm **link GitHub repository (URL)** và **mô tả các tính năng/chỉnh sửa bạn muốn làm tiếp**.

- **Hướng thực hiện đã xác nhận**: Tiếp tục phát triển dự án có sẵn từ Public GitHub repository tại không gian làm việc này.
- **Cách cập nhật lại GitHub đã xác nhận**: Bạn sẽ tải toàn bộ mã nguồn sau khi hoàn tất về máy cá nhân (hoặc xuất qua tính năng Export) và tự thực hiện `git push` lên GitHub.
- **Lưu ý về tương thích môi trường**: Môi trường chạy trực tiếp (live preview) ở đây hỗ trợ tốt nhất cho ứng dụng web **Node.js 22** (React, Vite, Next.js, Express...). Nếu dự án gốc dùng ngôn ngữ khác (Python, PHP, Go, Flutter...), ta cần quyết định giữ nguyên để chỉnh sửa code tĩnh hoặc chuyển đổi (migrate/port) sang nền tảng Web/Node.js để chạy thử được ngay.

## 1. Overview & Core Concept

- **Mục tiêu**: Kéo mã nguồn từ link GitHub public vào workspace, khôi phục môi trường chạy, tiếp tục xây dựng/nâng cấp các phần còn dang dở, và đảm bảo mã nguồn sạch sẽ để bạn dễ dàng đồng bộ ngược lên nhánh Git của mình.
- **Đối tượng sử dụng**: Chủ sở hữu repository muốn tận dụng trợ lý lập trình trực tiếp trên codebase sẵn có mà không cần cấp quyền truy cập (token/SSH) vào tài khoản GitHub cá nhân.
- **Giá trị cốt lõi**: An toàn tuyệt đối cho tài khoản GitHub của bạn (không lộ token/mật khẩu), vẫn đảm bảo mã nguồn được cập nhật đầy đủ và có thể xem trước kết quả trực quan ngay trên trình duyệt.

## 2. User Experience & Visual Design

- **Quy trình tương tác từng bước**:
  1. **Cung cấp thông tin**: Bạn gửi link GitHub public và danh sách yêu cầu cần làm tiếp.
  2. **Đồng bộ mã nguồn**: Hệ thống tải mã nguồn từ GitHub về, đọc hiểu cấu trúc dữ liệu, giao diện và logic hiện có.
  3. **Khởi chạy & kiểm tra bản gốc**: Cài đặt các gói thư viện cần thiết, cấu hình chạy ứng dụng trên cổng chuẩn của môi trường để bạn xác nhận bản gốc hoạt động bình thường.
  4. **Phát triển tiếp**: Thực hiện code các tính năng mới, sửa lỗi hoặc cải tiến giao diện theo đúng phong cách thiết kế sẵn có của dự án (tránh làm xáo trộn style cũ trừ khi bạn yêu cầu thiết kế lại).
  5. **Nghiệm thu & cập nhật GitHub**: Bạn kiểm tra trên bản preview, tải mã nguồn đã hoàn thiện về và đẩy (push) lên GitHub của bạn.
- **Giao diện & Trải nghiệm**: Toàn bộ giao diện, hệ màu, font chữ và bố cục của dự án gốc sẽ được giữ nguyên tính nhất quán khi phát triển tiếp các màn hình hoặc chức năng mới.

## 3. Key Product Decisions & Trade-Offs

- **Phương án lấy mã nguồn**:
  - *Lựa chọn*: Tải mã nguồn từ Public GitHub repository qua kết nối HTTPS (`git clone` / tải archive).
  - *Lý do*: Hỗ trợ tải đầy đủ file và lịch sử/cấu trúc thư mục nhanh chóng mà không cần bạn chia sẻ khóa bí mật hay Personal Access Token.
  - *Phương án thay thế*: Dùng tính năng Import GitHub của nền tảng hoặc tải file nén `.zip` lên thủ công (cũng khả thi nếu sau này bạn chuyển repo sang Private).
- **Phương án đồng bộ ngược lên GitHub**:
  - *Lựa chọn*: Bàn giao mã nguồn sạch (không lưu file rác hoặc biến môi trường nhạy cảm) để bạn tải về và tự `git push`.
  - *Lý do*: Đáp ứng đúng mong muốn kiểm soát commit của bạn trước khi đưa code lên repository chính thức, đảm bảo an toàn bảo mật.
  - *Phương án thay thế*: Tích hợp GitHub OAuth/Token để push tự động — đã bỏ qua vì không cần thiết theo lựa chọn của bạn.

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Sơ đồ luồng làm việc (Workflow Architecture)**:

```text
┌────────────────────────┐      HTTPS Clone      ┌──────────────────────────┐
│  GitHub Public Repo    │ ────────────────────▶ │  Workspace (Node.js 22)  │
│  (Link do bạn gửi)     │                       │  Đọc cấu trúc & Phân tích│
└────────────────────────┘                       └────────────┬─────────────┘
                                                              │
                                                              ▼
┌────────────────────────┐      Tải mã nguồn     ┌──────────────────────────┐
│  Máy cá nhân của bạn   │ ◀──────────────────── │  Phát triển & Kiểm thử   │
│  (Kiểm tra & git push) │      sau hoàn tất     │  Code tiếp + Preview web │
└────────────────────────┘                       └──────────────────────────┘
```

- **Chiến lược tích hợp & tương thích kỹ thuật**:
  - **Triage tự động sau khi tải repo**: Phân loại dự án ngay khi nhận code (Web Node.js/React/Next.js, Mobile/Android, hoặc ngôn ngữ backend khác) để áp dụng bước cài đặt phụ thuộc (`npm install`) và khởi chạy cổng `3000` phù hợp.
  - **Bảo toàn dữ liệu & cấu hình**: Giữ nguyên cấu trúc file gốc tối đa; tách các biến môi trường nhạy cảm vào `.env.example` (không hardcode API key trong mã nguồn) để khi bạn push lên GitHub public không bị lộ bí mật.
  - **Kiểm tra chất lượng trước bàn giao**: Chạy kiểm tra biên dịch (build) và kiểm tra cú pháp (lint) sau khi hoàn thành các thay đổi để đảm bảo code tải về chạy ổn định ngay trên máy bạn.
