# Khắc phục lỗi "no space left on device" khi build

## Nguyên nhân

Build failed với lỗi:
```
failed to copy files: copy file range failed: no space left on device
COPY --from=builder /app/node_modules ./node_modules
```

Server build (Coolify) hết dung lượng đĩa khi copy `node_modules` của backend (~894 packages bao gồm devDependencies).

## Giải pháp đã áp dụng

### 1. Tối ưu Dockerfile backend

- Thêm stage `prod-deps` chỉ cài production dependencies (`npm ci --omit=dev`)
- Runner stage copy `node_modules` từ `prod-deps` (300 packages) thay vì `builder` (894 packages)
- Giảm ~66% dung lượng node_modules cần copy

### 2. Dọn dung lượng đĩa trên server

Chạy script cleanup trên **server chạy Coolify** (nơi build chạy - thường là 103.188.244.246 hoặc 103.172.79.196):

```bash
# SSH vào server (nhập mật khẩu khi được hỏi)
ssh root@103.188.244.246

# Chạy cleanup
docker builder prune -af
docker image prune -af
docker container prune -f

# Kiểm tra dung lượng
df -h
```

Hoặc dùng script có sẵn:
```bash
ssh root@103.188.244.246 'bash -s' < scripts/cleanup-docker-disk.sh
```

### 3. Bật Docker Cleanup trong Coolify (khuyến nghị)

Vào **Coolify UI** → **Servers** → **YOUR_SERVER** → **Configuration** → **Advanced**:

- **Docker Cleanup Threshold**: 80%
- **Docker Cleanup Frequency**: Bật và đặt cron (vd: `0 2 * * *` = 2h sáng mỗi ngày)
- **Force Docker Cleanup**: Bật

## Sau khi áp dụng

1. Commit và push thay đổi Dockerfile
2. Chạy cleanup trên server (nếu chưa)
3. Trigger deploy lại từ Coolify
