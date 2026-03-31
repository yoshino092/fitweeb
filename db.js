const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "fitweeb.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    goal TEXT NOT NULL,
    plan TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const insertMemberStmt = db.prepare(`
  INSERT INTO members (name, phone, email, goal, plan)
  VALUES (@name, @phone, @email, @goal, @plan)
`);

const listMembersStmt = db.prepare(`
  SELECT id, name, phone, email, goal, plan, created_at AS createdAt
  FROM members
  ORDER BY id DESC
  LIMIT ?
`);

function createMember(member) {
  const result = insertMemberStmt.run(member);
  return result.lastInsertRowid;
}

function listMembers(limit = 5) {
  return listMembersStmt.all(limit);
}

module.exports = {
  createMember,
  listMembers,
};
