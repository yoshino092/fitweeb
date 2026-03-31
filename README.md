# FitWeeb — Role Based Fitness Management System

Энэ хувилбар нь **frontend + backend + sqlite db** бүхий, **admin / trainer / member** эрхтэй систем юм.

## Нэвтрэх демо эрхүүд

- Admin: `admin@fitweeb.mn` / `admin123`
- Trainer: `trainer@fitweeb.mn` / `trainer123`
- Member: `member@fitweeb.mn` / `member123`

## Ажиллуулах

```bash
npm install
npm start
```

Open: `http://localhost:3000`

## Архитектур

- `server.js` — REST API + Role authorization
- `db.js` — SQLite schema, seed data, password hash
- `public/` — role-based frontend interface

## Шаардлагын хамрах хүрээ (товч)

- Гишүүн: профайл, гишүүнчлэл, дасгалжуулагч, slot харах/захиалах, ирц, төлбөр, ахиц, share progress
- Дасгалжуулагч: нэвтрэх, өөрийн гишүүд, slot үүсгэх/харах, goal үүсгэх, member progress тайлан
- Админ: member CRUD + хайлт, plan CRUD, payment бүртгэл, revenue/attendance/slot/progress тайлан, export
- Систем: role-based interface, search/filter, өгөгдөл DB-д хадгалах, огноо/цаг бүртгэх

## Гол API-ууд

### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`

### Member
- `GET /api/member/profile`
- `GET /api/member/membership`
- `GET /api/member/trainers`
- `GET /api/member/trainer-slots?trainerId=<id>`
- `POST /api/member/book-slot`
- `GET /api/member/attendance`
- `GET /api/member/payments`
- `GET /api/member/progress`
- `POST /api/member/share-progress`
- `GET /api/member/assigned-trainer`

### Trainer
- `GET /api/trainer/members`
- `POST /api/trainer/slots`
- `GET /api/trainer/slots`
- `POST /api/trainer/goals`
- `GET /api/trainer/reports/:memberId`

### Admin
- `GET/POST /api/admin/members`
- `PUT/DELETE /api/admin/members/:id`
- `GET/POST /api/admin/plans`
- `PUT/DELETE /api/admin/plans/:id`
- `POST /api/admin/payments`
- `GET /api/admin/revenue`
- `GET /api/admin/slots`
- `GET /api/admin/attendance`
- `GET /api/admin/progress`
- `GET /api/admin/export`
