# FitWeeb Club — Fullstack (Frontend + Backend + DB)

Энэ төсөл нь фитнесс клубийн гишүүн бүртгэлийн веб бөгөөд:
- **Frontend**: `public/` доторх HTML/CSS/JS
- **Backend**: `Express` API (`server.js`)
- **Database**: `SQLite` (`data/fitweeb.db` via `better-sqlite3`)

## Суулгах

```bash
npm install
```

## Ажиллуулах

```bash
npm start
```

Тэгээд browser дээр: `http://localhost:3000`

## API

- `GET /health` — сервер шалгах
- `GET /api/members?limit=5` — сүүлийн гишүүд авах
- `POST /api/members` — шинэ гишүүн бүртгэх

`POST /api/members` body:

```json
{
  "name": "Бат-Эрдэнэ",
  "phone": "99112233",
  "email": "bat@example.com",
  "goal": "Жин хасах",
  "plan": "3 сар - Pro"
}
```
