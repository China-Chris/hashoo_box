# Postgres 一套做完（列表接前端）

## 1. 启动 Docker Desktop

本机需先开 Docker，再执行：

```bash
cd backend
docker compose up -d postgres
```

## 2. 一键起库 + 登记 20 个盒

```bash
cd backend
bash scripts/postgres-up-and-seed.sh
```

脚本会：

- 启动 `postgres:16`，映射端口 **5433→5432**（避免本机已有 Postgres 占 5432 连错库）
- 若 `.env` 没有 `DATABASE_URL`，会追加  
  `DATABASE_URL=postgresql://blindbox:blindbox@localhost:5433/blindbox`
- 调 `initPersistence()` 建表（`boxes` / `open_nonces`）
- 临时起后端，**POST /internal/register-box** 登记 **boxId 1..20**
- 停掉临时进程；你再用 **`npm run dev`** 常驻

## 3. 常驻后端

```bash
cd backend
npm run dev
```

确认：`curl http://localhost:3001/boxes` 返回 `items` 长度 20。

## 4. 前端

`.env.local` 已有 `NEXT_PUBLIC_API_URL=http://localhost:3001` 时，**重启 Next** 后刷新首页，应看到 **Hashoo#1 … #20** 来自后端，不再用本地 mock 的 Sold 位。

## 5. 手动登记单个盒

```bash
curl -X POST http://localhost:3001/internal/register-box \
  -H "Content-Type: application/json" \
  -d '{"boxId":"21","commitment":"200","saltHex":"0x21"}'
```

## 6. 表结构

见 `backend/db/init.sql`；运行时 `initDb()` 还会 `ALTER ... IF NOT EXISTS` 补 `opened_by` 等列。
