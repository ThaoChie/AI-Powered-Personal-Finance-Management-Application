# Test Cases – AI-Powered Personal Finance Management App

**Stack:** xUnit + Moq + FluentAssertions (Backend) | Playwright TypeScript (Frontend)

---

## 1. Auth – Login / Register

| ID | Type | Input | Expected |
|----|------|-------|----------|
| AUTH-01 | **Main** | POST /auth/register – email mới, password hợp lệ | 200 OK, message "Đăng ký thành công!" |
| AUTH-02 | **Main** | POST /auth/login – email & password đúng | 200 OK, trả về `token`, `username`, `fullName`, `email` |
| AUTH-03 | **Edge** | POST /auth/register – email đã tồn tại | 400 "Email này đã tồn tại." |
| AUTH-04 | **Edge** | POST /auth/register – thiếu `username` và `fullName` | 200 OK, tự điền `username = email`, `fullName = phần trước @` |
| AUTH-05 | **Alt** | POST /auth/login – sai password | 400 "Email hoặc mật khẩu không đúng." |
| AUTH-06 | **Alt** | GET /auth/profile – có JWT hợp lệ | 200 OK, trả về thông tin user |
| AUTH-07 | **Exception** | GET /auth/profile – không có JWT | 401 Unauthorized |
| AUTH-08 | **Exception** | POST /auth/login – email không tồn tại | 400 "Email hoặc mật khẩu không đúng." |

---

## 2. OTP (nếu có)

> *Auth hiện dùng JWT trực tiếp, không có OTP endpoint rõ ràng – skip hoặc test khi được thêm vào.*

---

## 3. Jars Management

| ID | Type | Input | Expected |
|----|------|-------|----------|
| JAR-01 | **Main** | GET /jars – JWT hợp lệ | 200, danh sách hũ của user |
| JAR-02 | **Main** | POST /jars – `{Name, Percent, Goal}` hợp lệ | 201, jar mới với `Balance = 0`, `UserId` gắn đúng |
| JAR-03 | **Main** | PUT /jars/{id} – cập nhật Name, Percent, Goal | 204, chỉ 3 field thay đổi, `Balance` giữ nguyên |
| JAR-04 | **Main** | DELETE /jars/{id} – hũ thuộc user | 204, xoá thành công |
| JAR-05 | **Edge** | PUT /jars/{id} – gửi kèm `Balance` mới | 204, nhưng Balance không đổi (server bảo vệ) |
| JAR-06 | **Edge** | DELETE /jars/{id} – hũ còn tiền (Balance > 0) | 204 (hiện vẫn cho xoá) |
| JAR-07 | **Alt** | GET /jars – user không có hũ nào | 200, array rỗng `[]` |
| JAR-08 | **Exception** | PUT /jars/{id} – id không thuộc user | 404 "Không tìm thấy hũ này hoặc bạn không có quyền sửa." |
| JAR-09 | **Exception** | GET /jars – không có JWT | 401 Unauthorized |

---

## 4. Transaction (CRUD)

| ID | Type | Input | Expected |
|----|------|-------|----------|
| TXN-01 | **Main** | POST /transactions – thu nhập (Amount > 0) | 200, tạo giao dịch, `jar.Balance` tăng |
| TXN-02 | **Main** | POST /transactions – chi tiêu (Amount < 0) | 200, tạo giao dịch, `jar.Balance` giảm |
| TXN-03 | **Main** | GET /transactions – JWT hợp lệ | 200, danh sách giao dịch của user sắp xếp mới nhất trước |
| TXN-04 | **Edge** | POST /transactions – Amount = 0 | 200 (server không chặn), Balance không đổi |
| TXN-05 | **Edge** | POST /transactions – Amount rất lớn (anomaly) | 200, giao dịch được tạo (trigger AI anomaly check) |
| TXN-06 | **Alt** | GET /transactions – chưa có giao dịch | 200, array rỗng `[]` |
| TXN-07 | **Exception** | POST /transactions – JarId không thuộc user | 400 "Hũ không tồn tại hoặc không thuộc về bạn!" |
| TXN-08 | **Exception** | POST /transactions – JarId không tồn tại | 400 |

---

## 5. BankSync Webhook (HMAC-SHA256)

> *Controller chưa thấy trong codebase hiện tại – thiết kế test case theo spec để implement.*

| ID | Type | Input | Expected |
|----|------|-------|----------|
| BANK-01 | **Main** | POST /webhook/bank – payload hợp lệ, HMAC-SHA256 đúng | 200 OK, giao dịch được tạo |
| BANK-02 | **Exception** | POST /webhook/bank – signature sai | 401 / 403 "Invalid HMAC signature" |
| BANK-03 | **Exception** | POST /webhook/bank – thiếu header `X-Signature` | 400 Bad Request |
| BANK-04 | **Edge** | POST /webhook/bank – `transactionId` đã tồn tại (duplicate) | 200 OK nhưng không tạo bản ghi mới (idempotent) |
| BANK-05 | **Edge** | POST /webhook/bank – Amount âm (hoàn tiền) | 200, cập nhật balance đúng chiều |
| BANK-06 | **Alt** | POST /webhook/bank – JarId không tồn tại trong payload | 400, không tạo giao dịch |

---

## 6. AI Anomaly Detection

> *Trigger khi giao dịch có |Amount| vượt ngưỡng bất thường – dựa vào `GeminiService`.*

| ID | Type | Input | Expected |
|----|------|-------|----------|
| AI-ANOM-01 | **Main** | Giao dịch bình thường (Amount trong phạm vi lịch sử) | `GeminiService` không được gọi / không tạo alert |
| AI-ANOM-02 | **Main** | Giao dịch lớn bất thường (e.g., > 10× median) | `GeminiService` được gọi, tạo `Notification` loại "warning" |
| AI-ANOM-03 | **Edge** | `GeminiService` trả về lỗi / timeout | Hệ thống không crash, giao dịch vẫn lưu, không tạo alert |
| AI-ANOM-04 | **Alt** | User chưa có lịch sử giao dịch (ngưỡng baseline = 0) | Không trigger anomaly khi nạp tiền lần đầu |
| AI-ANOM-05 | **Exception** | `GeminiKey` rỗng / không hợp lệ | `GeminiService.GetChatResponseAsync` trả về chuỗi lỗi, không throw exception |

---

## 7. AI Coaching (AICoachingService)

| ID | Type | Input | Expected |
|----|------|-------|----------|
| COACH-01 | **Main** | User có chi tiêu trong 7 ngày, chưa có Challenge tuần này | `GenerateChallengeAsync` được gọi, Challenge và Notification được tạo |
| COACH-02 | **Edge** | User đã có Challenge trong tuần này | Bỏ qua, không tạo thêm (idempotent) |
| COACH-03 | **Edge** | `GeminiService.GenerateChallengeAsync` trả về JSON không hợp lệ | Dùng nội dung mặc định, vẫn tạo Challenge thành công |
| COACH-04 | **Alt** | User không có giao dịch chi tiêu nào (totalExpense = 0) | Challenge được tạo với `targetAmount = 0`, nội dung mặc định |
| COACH-05 | **Exception** | Không có User nào trong hệ thống | Service log cảnh báo, không throw, loop kết thúc bình thường |
| COACH-06 | **Exception** | DB SaveChangesAsync thất bại | Exception được bắt ở vòng lặp ngoài, service không dừng |
