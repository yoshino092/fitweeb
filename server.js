const crypto = require("crypto");
const express = require("express");
const path = require("path");
const { db, hashPassword } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const sessions = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !sessions.has(token)) return res.status(401).json({ message: "Нэвтэрнэ үү." });
  req.user = sessions.get(token);
  req.token = token;
  next();
}

function role(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Хандах эрхгүй." });
    next();
  };
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = db
    .prepare("SELECT id, name, email, role, trainer_id as trainerId, password_hash FROM users WHERE email = ?")
    .get(String(email || "").trim());

  if (!user || user.password_hash !== hashPassword(String(password || ""))) {
    return res.status(401).json({ message: "И-мэйл эсвэл нууц үг буруу." });
  }

  const token = makeToken();
  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, trainerId: user.trainerId };
  sessions.set(token, safeUser);
  return res.json({ token, user: safeUser });
});

app.post("/api/auth/logout", auth, (req, res) => {
  sessions.delete(req.token);
  res.json({ ok: true });
});

app.get("/api/me", auth, (req, res) => res.json({ user: req.user }));

app.get("/api/member/profile", auth, role("member"), (req, res) => {
  const profile = db.prepare("SELECT id, name, email, phone, role, trainer_id as trainerId, created_at as createdAt FROM users WHERE id = ?").get(req.user.id);
  res.json({ profile });
});

app.get("/api/member/membership", auth, role("member"), (req, res) => {
  const membership = db
    .prepare(`SELECT m.id, p.name as planName, p.months, p.price, m.start_date as startDate, m.end_date as endDate, m.status
              FROM memberships m JOIN membership_plans p ON m.plan_id = p.id WHERE m.member_id = ? ORDER BY m.id DESC LIMIT 1`)
    .get(req.user.id);
  res.json({ membership });
});

app.get("/api/member/trainers", auth, role("member"), (_req, res) => {
  const trainers = db.prepare("SELECT id, name, email, phone FROM users WHERE role = 'trainer'").all();
  res.json({ trainers });
});

app.get("/api/member/trainer-slots", auth, role("member"), (req, res) => {
  const trainerId = Number(req.query.trainerId || req.user.trainerId || 0);
  const slots = db
    .prepare(`SELECT s.*, u.name as trainerName, (SELECT COUNT(*) FROM bookings b WHERE b.slot_id=s.id AND b.status='booked') as bookedCount
              FROM trainer_slots s JOIN users u ON u.id=s.trainer_id WHERE s.trainer_id = ? ORDER BY s.slot_date, s.slot_time`)
    .all(trainerId);
  res.json({ slots });
});

app.post("/api/member/book-slot", auth, role("member"), (req, res) => {
  const slotId = Number(req.body.slotId);
  const slot = db.prepare("SELECT * FROM trainer_slots WHERE id = ?").get(slotId);
  if (!slot) return res.status(404).json({ message: "Slot олдсонгүй." });

  const booked = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE slot_id = ? AND status='booked'").get(slotId).c;
  if (booked >= slot.capacity) return res.status(400).json({ message: "Slot дүүрсэн байна." });

  try {
    db.prepare("INSERT INTO bookings (member_id, slot_id) VALUES (?, ?)").run(req.user.id, slotId);
    res.status(201).json({ message: "Slot амжилттай захиалагдлаа." });
  } catch (_e) {
    res.status(400).json({ message: "Та энэ slot-г өмнө нь захиалсан байна." });
  }
});

app.get("/api/member/attendance", auth, role("member"), (req, res) => {
  const rows = db.prepare("SELECT id, checkin_at as checkinAt, note FROM attendance WHERE member_id = ? ORDER BY id DESC").all(req.user.id);
  res.json({ attendance: rows });
});

app.get("/api/member/payments", auth, role("member"), (req, res) => {
  const rows = db.prepare("SELECT id, amount, paid_at as paidAt, method FROM payments WHERE member_id = ? ORDER BY id DESC").all(req.user.id);
  res.json({ payments: rows });
});

app.get("/api/member/progress", auth, role("member"), (req, res) => {
  const goals = db.prepare("SELECT id, title, status, created_at as createdAt FROM goals WHERE member_id=? ORDER BY id DESC").all(req.user.id);
  const logs = db.prepare("SELECT id, weight, calories, note, shared, created_at as createdAt FROM progress_logs WHERE member_id=? ORDER BY id DESC").all(req.user.id);
  res.json({ goals, logs });
});

app.post("/api/member/share-progress", auth, role("member"), (req, res) => {
  const { weight, calories, note, shared } = req.body || {};
  db.prepare("INSERT INTO progress_logs (member_id, weight, calories, note, shared) VALUES (?, ?, ?, ?, ?)").run(req.user.id, weight || null, calories || null, note || "", shared ? 1 : 0);
  res.status(201).json({ message: "Ахиц хадгалагдлаа." });
});

app.get("/api/member/assigned-trainer", auth, role("member"), (req, res) => {
  const trainer = db.prepare("SELECT id, name, email, phone FROM users WHERE id = ?").get(req.user.trainerId || 0);
  res.json({ trainer });
});

app.get("/api/trainer/members", auth, role("trainer"), (req, res) => {
  const members = db.prepare("SELECT id, name, email, phone FROM users WHERE role='member' AND trainer_id = ?").all(req.user.id);
  res.json({ members });
});

app.post("/api/trainer/slots", auth, role("trainer"), (req, res) => {
  const { slotDate, slotTime, capacity, note } = req.body || {};
  db.prepare("INSERT INTO trainer_slots (trainer_id, slot_date, slot_time, capacity, note) VALUES (?, ?, ?, ?, ?)").run(req.user.id, slotDate, slotTime, Number(capacity || 1), note || "");
  res.status(201).json({ message: "Slot үүслээ." });
});

app.get("/api/trainer/slots", auth, role("trainer"), (req, res) => {
  const slots = db.prepare("SELECT * FROM trainer_slots WHERE trainer_id=? ORDER BY id DESC").all(req.user.id);
  res.json({ slots });
});

app.post("/api/trainer/goals", auth, role("trainer"), (req, res) => {
  const { memberId, title } = req.body || {};
  db.prepare("INSERT INTO goals (member_id, trainer_id, title, status) VALUES (?, ?, ?, 'active')").run(memberId, req.user.id, title || "Goal");
  res.status(201).json({ message: "Зорилго үүслээ." });
});

app.get("/api/trainer/reports/:memberId", auth, role("trainer"), (req, res) => {
  const memberId = Number(req.params.memberId);
  const progress = db.prepare("SELECT id, weight, calories, note, created_at as createdAt FROM progress_logs WHERE member_id=? ORDER BY id DESC").all(memberId);
  res.json({ progress });
});

app.get("/api/admin/members", auth, role("admin"), (req, res) => {
  const q = `%${String(req.query.q || "").trim()}%`;
  const members = db.prepare("SELECT id, name, email, phone, trainer_id as trainerId, created_at as createdAt FROM users WHERE role='member' AND (name LIKE ? OR email LIKE ?) ORDER BY id DESC").all(q, q);
  res.json({ members });
});

app.post("/api/admin/members", auth, role("admin"), (req, res) => {
  const { name, email, phone, password, trainerId } = req.body || {};
  const result = db.prepare("INSERT INTO users (name, email, phone, role, password_hash, trainer_id) VALUES (?, ?, ?, 'member', ?, ?)").run(name, email, phone, hashPassword(password || "member123"), trainerId || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put("/api/admin/members/:id", auth, role("admin"), (req, res) => {
  const id = Number(req.params.id);
  const { name, phone, trainerId } = req.body || {};
  db.prepare("UPDATE users SET name=?, phone=?, trainer_id=? WHERE id=? AND role='member'").run(name, phone, trainerId || null, id);
  res.json({ ok: true });
});

app.delete("/api/admin/members/:id", auth, role("admin"), (req, res) => {
  db.prepare("DELETE FROM users WHERE id=? AND role='member'").run(Number(req.params.id));
  res.json({ ok: true });
});

app.get("/api/admin/plans", auth, role("admin"), (_req, res) => {
  res.json({ plans: db.prepare("SELECT * FROM membership_plans ORDER BY id DESC").all() });
});

app.post("/api/admin/plans", auth, role("admin"), (req, res) => {
  const { name, months, price, status } = req.body || {};
  const result = db.prepare("INSERT INTO membership_plans (name, months, price, status) VALUES (?, ?, ?, ?)").run(name, months, price, status || "active");
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put("/api/admin/plans/:id", auth, role("admin"), (req, res) => {
  const { name, months, price, status } = req.body || {};
  db.prepare("UPDATE membership_plans SET name=?, months=?, price=?, status=? WHERE id=?").run(name, months, price, status, Number(req.params.id));
  res.json({ ok: true });
});

app.delete("/api/admin/plans/:id", auth, role("admin"), (req, res) => {
  db.prepare("DELETE FROM membership_plans WHERE id=?").run(Number(req.params.id));
  res.json({ ok: true });
});

app.post("/api/admin/payments", auth, role("admin"), (req, res) => {
  const { memberId, amount, method } = req.body || {};
  db.prepare("INSERT INTO payments (member_id, amount, paid_at, method) VALUES (?, ?, datetime('now'), ?)").run(memberId, amount, method || "Cash");
  res.status(201).json({ ok: true });
});

app.get("/api/admin/revenue", auth, role("admin"), (_req, res) => {
  const revenue = db.prepare("SELECT COALESCE(SUM(amount),0) as totalRevenue, COUNT(*) as paymentsCount FROM payments").get();
  res.json({ revenue });
});

app.get("/api/admin/slots", auth, role("admin"), (_req, res) => {
  const slots = db.prepare("SELECT s.*, u.name as trainerName FROM trainer_slots s JOIN users u ON u.id=s.trainer_id ORDER BY s.id DESC").all();
  res.json({ slots });
});

app.get("/api/admin/attendance", auth, role("admin"), (_req, res) => {
  const attendance = db.prepare("SELECT a.id, a.checkin_at as checkinAt, a.note, u.name as memberName FROM attendance a JOIN users u ON u.id=a.member_id ORDER BY a.id DESC").all();
  res.json({ attendance });
});

app.get("/api/admin/progress", auth, role("admin"), (_req, res) => {
  const logs = db.prepare("SELECT p.*, u.name as memberName FROM progress_logs p JOIN users u ON u.id=p.member_id ORDER BY p.id DESC").all();
  res.json({ logs });
});

app.get("/api/admin/export", auth, role("admin"), (_req, res) => {
  const data = {
    members: db.prepare("SELECT id, name, email, phone, trainer_id as trainerId FROM users WHERE role='member'").all(),
    payments: db.prepare("SELECT * FROM payments").all(),
    progress: db.prepare("SELECT * FROM progress_logs").all(),
  };
  res.json(data);
});

app.listen(PORT, () => console.log(`FitWeeb running: http://localhost:${PORT}`));
