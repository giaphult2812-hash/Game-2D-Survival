# Tự động hóa đồng bộ Git (Auto Git Sync)

Mỗi khi bạn hoàn thành một tính năng, fix bug hoặc sửa đổi file trong dự án `d:\Game`:
1. Tự động kiểm tra trạng thái Git (`git status --porcelain`).
2. Nếu có thay đổi, tự động `git pull --rebase` để kéo mọi cập nhật mới nhất từ điện thoại/GitHub về trước.
3. Tự động `git add .`, tạo commit với thông điệp rõ ràng theo tính năng vừa làm (`git commit -m "..."`).
4. Tự động `git push origin main` lên GitHub để trên điện thoại luôn có phiên bản mới nhất ngay tức thì mà người dùng không cần phải nhắc nhở hay gõ lệnh.
