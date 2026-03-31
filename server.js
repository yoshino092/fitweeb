const express = require("express");
const path = require("path");
const { createMember, listMembers } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "fitweeb-api" });
});

app.get("/api/members", (req, res) => {
  const rawLimit = Number(req.query.limit || 5);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 5;
  const members = listMembers(limit);
  res.json({ members });
});

app.post("/api/members", (req, res) => {
  const { name, phone, email, goal, plan } = req.body || {};

  if (!name || !phone || !email || !goal || !plan) {
    return res.status(400).json({ message: "Бүх талбарыг заавал бөглөнө үү." });
  }

  if (!/^\d{8}$/.test(phone)) {
    return res.status(400).json({ message: "Утас 8 оронтой тоо байх ёстой." });
  }

  const id = createMember({
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: String(email).trim(),
    goal: String(goal).trim(),
    plan: String(plan).trim(),
  });

  return res.status(201).json({ id, message: "Амжилттай бүртгэгдлээ." });
});

app.listen(PORT, () => {
  console.log(`FitWeeb server started on http://localhost:${PORT}`);
});
