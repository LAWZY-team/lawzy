# Deployment Instructions (Post-Push)

Code đã được push lên `main` và `production`. Để deploy lên Coolify:

## 1. SSH vào VPS Production

```bash
ssh root@103.172.79.196
# Password: d5zd2vUBQB8pdAG7
```

## 2. Trigger Coolify Deploy

Nếu Coolify chạy trên VPS:

```bash
# Deploy theo tag production
curl -X GET "http://localhost:8000/deploy?tag=production" \
  -H "Authorization: Bearer 1|PfT4E06Fw0HTsXXIN43dBDceUmyQdGXUsbqhcBvl48c3d1c0"
```

Hoặc dùng UUID ứng dụng (lấy từ Coolify UI > Application > UUID):

```bash
curl -X GET "http://localhost:8000/deploy?uuid=APP_UUID" \
  -H "Authorization: Bearer 1|PfT4E06Fw0HTsXXIN43dBDceUmyQdGXUsbqhcBvl48c3d1c0"
```

## 3. Kiểm tra

- **Backend**: Không có vòng lặp restart, logs không lỗi
- **Frontend**: Build thành công, static pages OK
- **Coolify**: Admin tại http://103.172.79.196 (hoặc URL bạn cấu hình)

## 4. Admin Coolify

- Email: admin@lawzy.vn
- Password: Lawzy@2026

---

**Lưu ý**: Sau khi deploy xong, nên đổi mật khẩu VPS và Coolify để bảo mật.
