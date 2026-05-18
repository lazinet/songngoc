# Song Ngoc Website – SNCC

Website chính thức cho **Công ty TNHH Cơ Khí Xây Dựng Song Ngọc** (MST: 0312260211).

---

## Thông tin dự án

| Thông tin | Chi tiết |
|---|---|
| Tên công ty | Công ty TNHH Cơ Khí Xây Dựng Song Ngọc |
| Website | sncc.vn / songngoc.com.vn |
| Màu sắc | Xanh lá `#00854A` · Cam `#F38022` |
| Hosting | Cloudflare Pages |
| Worker API | Cloudflare Workers |
| Liên hệ | songngoc.stmc@gmail.com · 086 893 7699 |

---

## Cấu trúc thư mục

```
songngoc/
├── assets/
│   ├── css/              # Stylesheet chính
│   ├── fonts/            # Web fonts
│   ├── images/
│   │   ├── activities/   # Ảnh hoạt động nội bộ
│   │   ├── hero/         # Ảnh banner hero
│   │   ├── misc/         # Ảnh tổng hợp, logo, icon
│   │   ├── news/         # Ảnh thumbnail tin tức
│   │   ├── partners/     # Logo đối tác
│   │   ├── projects/     # Ảnh dự án
│   │   ├── sectors/      # Ảnh lĩnh vực hoạt động
│   │   └── team/         # Ảnh đội ngũ
│   ├── js/               # JavaScript
│   ├── logos/            # Logo công ty
│   └── webfonts/         # Font Awesome webfonts
├── api/
│   └── worker.js         # Cloudflare Worker – Form handler
├── data/
│   ├── projects.json     # 30 dự án nổi bật
│   ├── sectors.json      # 7 lĩnh vực hoạt động
│   ├── activities.json   # Hoạt động nội bộ / thiện nguyện
│   ├── jobs.json         # Vị trí tuyển dụng
│   ├── news.json         # Tin tức & bài viết
│   └── settings.json     # Cài đặt website, SEO, thông tin công ty
├── .vscode/              # Cấu hình VS Code
├── _redirects            # Cloudflare Pages redirect rules
├── wrangler.toml         # Cloudflare Worker config
├── .gitignore
└── README.md
```

---

## Data JSON

Tất cả nội dung được quản lý qua các file JSON trong thư mục `data/`:

### `data/projects.json`
30 dự án với các field:
- `id`, `slug`, `title`, `category` (`cang|congnghe|dandu|phuhung|diengio|nhatruong`)
- `year`, `client`, `location`, `description`
- `image` (path tương đối), `gallery` (mảng paths)
- `featured` (bool), `tags` (mảng chuỗi)

### `data/sectors.json`
7 lĩnh vực hoạt động với: `id`, `slug`, `title`, `shortTitle`, `description`, `longDescription`, `icon` (FA class), `image`, `highlights`, `color`

### `data/activities.json`
Hoạt động nội bộ: `category` gồm `team-building|kham-suc-khoe|thien-nguyen|le-ky-niem`

### `data/jobs.json`
Vị trí tuyển dụng: `type` (`full-time|part-time`), `salary`, `requirements[]`, `benefits[]`

### `data/news.json`
Tin tức: `category` gồm `du-an|kien-thuc|tuyen-dung`

### `data/settings.json`
Cài đặt toàn trang: thông tin công ty, liên hệ, mạng xã hội, SEO mặc định, theme màu sắc, navigation menu

---

## Cloudflare Worker

Worker API xử lý form liên hệ tại `api/worker.js`.

### Cài đặt môi trường

```bash
# Cài đặt Wrangler CLI
npm install -g wrangler

# Đăng nhập Cloudflare
wrangler login

# Đặt secrets (chạy từng lệnh, nhập giá trị khi được hỏi)
wrangler secret put TURNSTILE_SECRET
wrangler secret put GAS_URL
```

### Deploy Worker

```bash
# Deploy môi trường preview
wrangler deploy --env preview

# Deploy production
wrangler deploy --env production
```

### Test local

```bash
wrangler dev
# Worker chạy tại http://localhost:8787
```

---

## Cloudflare Pages

Website được host trên Cloudflare Pages với cấu hình:

- **Build command:** *(không cần – static site)*
- **Build output:** `/` (root)
- **Custom domain:** sncc.vn, songngoc.com.vn

### Redirect rules

File `_redirects` cấu hình:
- Alias URL tiếng Anh → tiếng Việt (301)
- URL cũ → URL mới (301)
- 404 fallback → `/404.html`

---

## Lĩnh vực hoạt động

1. Tư vấn thiết kế nhà công nghiệp, công trình thủy
2. Thi công XD Công trình Công nghiệp và Dân dụng
3. Thi công Cầu, Cảng, Đường giao thông
4. Thi công chống ăn mòn trên biển
5. Thi công cơ giới, san lấp mặt bằng, hạ tầng
6. Thi công cấu kiện đúc sẵn
7. Cho thuê thiết bị thi công, cung cấp nhân công

---

## Thông tin liên hệ

- **Địa chỉ:** VP-2-09, Lầu 2, Tòa nhà St. Moritz, 1014 Phạm Văn Đồng, P. Hiệp Bình Chánh, TP.HCM
- **Điện thoại:** 086 893 7699
- **Email:** songngoc.stmc@gmail.com · songngoc@sncc.vn
- **Facebook:** facebook.com/songngoc.com.vn
- **YouTube:** youtube.com/@songngocconstruction3109
- **Zalo:** 0868937699
- **Google Maps:** [Xem bản đồ](https://www.google.com/maps/place/CÔNG+TY+TNHH+CƠ+KHÍ+XÂY+DỰNG+SONG+NGỌC/@10.8380516,106.7348122,17z)

---

*Phát triển bởi HATHYO Digital Agency*
