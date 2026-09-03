# คู่มือการนำระบบขึ้นใช้งานจริงบน Production (Production Deployment Guide)
ระบบห้องเรียนส่งงานและตรวจงานชุมนุมสื่อสร้างสรรค์ (SSSParty)

---

## 📋 รายการตรวจสอบความพร้อมก่อนขึ้น Production (Pre-flight Checklist)

- [ ] **ฐานข้อมูล PostgreSQL**: มีฐานข้อมูล PostgreSQL 15+ พร้อมใช้งาน (Local, Docker, หรือ Managed เช่น Supabase / Neon / AWS RDS)
- [ ] **Object Storage**: มี S3-Compatible Bucket พร้อม Access Key / Secret Key (เช่น Cloudflare R2, AWS S3 หรือ MinIO)
- [ ] **โดเมนและ SSL**: มีชื่อโดเมน (Domain Name) พร้อมชี้ DNS A-Record มายัง IP เซิร์ฟเวอร์ และเปิดพอร์ต 80, 443
- [ ] **JWT Secret**: สร้างสตริงสุ่มความยาวไม่ต่ำกว่า 32 ตัวอักษร เช่น:
  ```bash
  openssl rand -base64 32
  ```
- [ ] **ผู้ดูแลระบบคนแรก (Initial Admin)**: มีบัญชี Admin ในระบบเพื่อเข้าสู่ระบบครั้งแรก

---

## วิธีที่ 1: Deploy ด้วย Docker & Docker Compose (แนะนำ)

เหมาะสำหรับการ Deploy บน VPS (Ubuntu, Debian, Rocky Linux) หรือ Cloud Server

### ขั้นตอนที่ 1: ติดตั้ง Docker & Docker Compose บนเซิร์ฟเวอร์
```bash
# บน Ubuntu / Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### ขั้นตอนที่ 2: โคลนโค้ดและตั้งค่าไฟล์ Environment
```bash
git clone <your-repo-url> /opt/sssparty
cd /opt/sssparty

# คัดลอกและแก้ไขไฟล์ .env
cp .env.example .env
nano .env
```
กำหนดค่าที่จำเป็นใน `.env`:
- `DATABASE_URL`: กำหนดการเชื่อมต่อฐานข้อมูล
- `JWT_SECRET`: สตริงสุ่ม 32+ ตัวอักษร
- `NEXT_PUBLIC_APP_URL`: โดเมนของเว็บไซต์ เช่น `https://sssparty.school.ac.th`
- ข้อมูลการเชื่อมต่อ S3 Storage

### ขั้นตอนที่ 3: สั่ง Build และ Start Containers
```bash
docker compose up -d --build
```

### ขั้นตอนที่ 4: รัน Database Migration และเพิ่มข้อมูลเริ่มต้น
```bash
docker compose exec app bun run db:deploy
docker compose exec app bun run db:seed
```

---

## วิธีที่ 2: Deploy ตรงบนเซิร์ฟเวอร์ด้วย Bun/Node.js + PM2

เหมาะสำหรับเซิร์ฟเวอร์ที่ต้องการความเร็วและควบคุม Service ด้วยตนเอง

### ขั้นตอนที่ 1: ติดตั้ง Bun และ PM2
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

sudo npm install -g pm2
```

### ขั้นตอนที่ 2: ติดตั้ง Dependencies และ Build โครงการ
```bash
cd /opt/sssparty
bun install --frozen-lockfile
bun run db:generate
bun run db:deploy
bun run build
```

### ขั้นตอนที่ 3: สตาร์ตระบบด้วย PM2
สร้างไฟล์ `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: "sssparty",
      script: ".next/standalone/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
      },
    },
  ],
};
```
สั่งรัน PM2 และตั้งให้เปิดตัวเองอัตโนมัติเมื่อเซิร์ฟเวอร์รีบูต:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## การตั้งค่า Reverse Proxy & SSL (HTTPS)

### ตัวเลือก A: การใช้ Nginx + Let's Encrypt Certbot
สร้างไฟล์ Config ที่ `/etc/nginx/sites-available/sssparty`:
```nginx
server {
    listen 80;
    server_name sssparty.school.ac.th;

    # เพิ่มขนาดจำกัดไฟล์อัปโหลดให้สอดคล้องกับระบบ (50MB)
    client_max_body_size 55M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
เปิดใช้งาน Site และติดตั้ง SSL:
```bash
sudo ln -s /etc/nginx/sites-available/sssparty /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# ติดตั้งฟรี SSL Certificate
sudo certbot --nginx -d sssparty.school.ac.th
```

### ตัวเลือก B: การใช้ Caddy (ออก SSL อัตโนมัติในตัว)
ในไฟล์ `/etc/caddy/Caddyfile`:
```caddy
sssparty.school.ac.th {
    request_body {
        max_size 55MB
    }
    reverse_proxy 127.0.0.1:3000
}
```
สั่ง Reload Caddy:
```bash
sudo systemctl reload caddy
```

---

## การตรวจสอบสถานะระบบ (Health Check & Monitoring)

ระบบมี Endpoint สำหรับตรวจสอบความพร้อมการทำงานอยู่ที่:
```
GET https://sssparty.school.ac.th/api/health
```
ตัวอย่าง Response:
```json
{
  "status": "healthy",
  "uptimeSeconds": 86400,
  "timestamp": "2026-09-03T15:30:00.000Z",
  "database": {
    "status": "connected",
    "latencyMs": 4
  },
  "environment": "production"
}
```
สามารถนำ URL นี้ไปผูกกับ **Uptime Kuma**, **Pingdom**, หรือ Docker Healthcheck ได้ทันที

---

## สคริปต์สำรองข้อมูลฐานข้อมูลอัตโนมัติ (Automated Backup Script)

สร้างไฟล์ `/opt/backup_db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/sssparty_backup_$TIMESTAMP.sql.gz"

mkdir -p $BACKUP_DIR

# คำสั่ง Dump และ Compress ข้อมูล
pg_dump -U postgres -d sssparty | gzip > $FILENAME

# ลบไฟล์สำรองที่มีอายุเกิน 30 วันอัตโนมัติ
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -delete

echo "Backup created: $FILENAME"
```
กำหนดให้สคริปต์รันทุกตี 3 ของทุกวันผ่าน Crontab:
```bash
chmod +x /opt/backup_db.sh
crontab -e
# เพิ่มบรรทัดนี้:
0 3 * * * /opt/backup_db.sh > /dev/null 2>&1
```

---

## สรุปคำสั่งที่ใช้งานบ่อยบน Production

| คำสั่ง | คำอธิบาย |
|---|---|
| `bun run db:deploy` | นำ Migration โครงสร้างฐานข้อมูลล่าสุดไปปรับใช้บน Production |
| `bun run db:generate` | อัปเดต Prisma Client ตาม Schema ล่าสุด |
| `bun run db:seed` | นำเข้าข้อมูลผู้ดูแลระบบและข้อมูลตั้งต้น |
| `bun run build` | คอมไพล์โปรเจกต์ Next.js ในโหมด Standalone |
| `docker compose restart app` | สั่งรีสตาร์ตระบบเมื่อมีการแก้ไข Config |
