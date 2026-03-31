const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "fitweeb.db"));
db.pragma("journal_mode = WAL");

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK(role IN ('admin','trainer','member')),
  password_hash TEXT NOT NULL,
  trainer_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS membership_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  months INTEGER NOT NULL,
  price REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY(member_id) REFERENCES users(id),
  FOREIGN KEY(plan_id) REFERENCES membership_plans(id)
);

CREATE TABLE IF NOT EXISTS trainer_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id INTEGER NOT NULL,
  slot_date TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(trainer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  slot_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_id, slot_id),
  FOREIGN KEY(member_id) REFERENCES users(id),
  FOREIGN KEY(slot_id) REFERENCES trainer_slots(id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  checkin_at TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY(member_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  paid_at TEXT NOT NULL,
  method TEXT NOT NULL,
  FOREIGN KEY(member_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  trainer_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  weight REAL,
  calories INTEGER,
  note TEXT,
  shared INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(member_id) REFERENCES users(id)
);
`);

const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
if (userCount === 0) {
  const insUser = db.prepare(`INSERT INTO users (name, email, phone, role, password_hash, trainer_id) VALUES (?, ?, ?, ?, ?, ?)`);
  const adminId = insUser.run("System Admin", "admin@fitweeb.mn", "99000000", "admin", hashPassword("admin123"), null).lastInsertRowid;
  const trainerId = insUser.run("Coach Tsetse", "trainer@fitweeb.mn", "99110011", "trainer", hashPassword("trainer123"), null).lastInsertRowid;
  const memberId = insUser.run("Bat-Erdene", "member@fitweeb.mn", "99112233", "member", hashPassword("member123"), trainerId).lastInsertRowid;

  const planId = db.prepare("INSERT INTO membership_plans (name, months, price, status) VALUES ('Pro 3 сар', 3, 300000, 'active')").run().lastInsertRowid;
  db.prepare("INSERT INTO memberships (member_id, plan_id, start_date, end_date, status) VALUES (?, ?, date('now'), date('now','+3 month'), 'active')").run(memberId, planId);
  const slotId = db.prepare("INSERT INTO trainer_slots (trainer_id, slot_date, slot_time, capacity, note) VALUES (?, date('now','+1 day'), '18:00', 8, 'Cardio')").run(trainerId).lastInsertRowid;
  db.prepare("INSERT INTO bookings (member_id, slot_id) VALUES (?, ?)").run(memberId, slotId);
  db.prepare("INSERT INTO attendance (member_id, checkin_at, note) VALUES (?, datetime('now','-2 day'), 'Morning session')").run(memberId);
  db.prepare("INSERT INTO payments (member_id, amount, paid_at, method) VALUES (?, 300000, datetime('now','-3 day'), 'QPay')").run(memberId);
  db.prepare("INSERT INTO goals (member_id, trainer_id, title, status) VALUES (?, ?, '5кг жин хасах', 'active')").run(memberId, trainerId);
  db.prepare("INSERT INTO progress_logs (member_id, weight, calories, note, shared) VALUES (?, 82.5, 2100, 'Эхний долоо хоног', 1)").run(memberId);
}

module.exports = { db, hashPassword };
