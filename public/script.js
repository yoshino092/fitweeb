const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const authStatus = document.getElementById("authStatus");
const output = document.getElementById("output");

const memberPanel = document.getElementById("memberPanel");
const trainerPanel = document.getElementById("trainerPanel");
const adminPanel = document.getElementById("adminPanel");

let token = "";
let me = null;

function showPanels(role) {
  memberPanel.classList.toggle("hidden", role !== "member");
  trainerPanel.classList.toggle("hidden", role !== "trainer");
  adminPanel.classList.toggle("hidden", role !== "admin");
}

function setOutput(data) {
  output.textContent = JSON.stringify(data, null, 2);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || "Алдаа");
  return body;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(loginForm);
  try {
    const payload = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
    });
    token = payload.token;
    me = payload.user;
    authStatus.textContent = `✅ ${me.name} (${me.role}) нэвтэрлээ`;
    logoutBtn.classList.remove("hidden");
    showPanels(me.role);
    setOutput(payload.user);
  } catch (err) {
    authStatus.textContent = `❌ ${err.message}`;
  }
});

logoutBtn.addEventListener("click", async () => {
  if (!token) return;
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (_err) {}
  token = "";
  me = null;
  authStatus.textContent = "Гарлаа.";
  logoutBtn.classList.add("hidden");
  showPanels("none");
  setOutput({});
});

document.body.addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const endpoint = target.dataset.api;
  if (endpoint) {
    try {
      const data = await api(endpoint);
      setOutput(data);
    } catch (err) {
      setOutput({ error: err.message });
    }
  }

  if (target.id === "shareProgressBtn") {
    try {
      const data = await api("/api/member/share-progress", {
        method: "POST",
        body: JSON.stringify({ weight: 81.9, calories: 2000, note: "Өнөөдрийн ахиц", shared: true }),
      });
      setOutput(data);
    } catch (err) {
      setOutput({ error: err.message });
    }
  }

  if (target.id === "createSlotBtn") {
    try {
      const data = await api("/api/trainer/slots", {
        method: "POST",
        body: JSON.stringify({ slotDate: "2026-04-02", slotTime: "19:00", capacity: 10, note: "Strength" }),
      });
      setOutput(data);
    } catch (err) {
      setOutput({ error: err.message });
    }
  }

  if (target.id === "createGoalBtn") {
    try {
      const data = await api("/api/trainer/members");
      const memberId = data.members?.[0]?.id;
      if (!memberId) throw new Error("Гишүүн олдсонгүй");
      const created = await api("/api/trainer/goals", {
        method: "POST",
        body: JSON.stringify({ memberId, title: "1 сарын дотор cardio нэмэх" }),
      });
      setOutput(created);
    } catch (err) {
      setOutput({ error: err.message });
    }
  }

  if (target.id === "createMemberBtn") {
    try {
      const created = await api("/api/admin/members", {
        method: "POST",
        body: JSON.stringify({
          name: "Шинэ Гишүүн",
          email: `member${Date.now()}@fitweeb.mn`,
          phone: "99001122",
          password: "member123",
        }),
      });
      setOutput(created);
    } catch (err) {
      setOutput({ error: err.message });
    }
  }

  if (target.id === "createPlanBtn") {
    try {
      const created = await api("/api/admin/plans", {
        method: "POST",
        body: JSON.stringify({ name: "Elite 6 сар", months: 6, price: 550000, status: "active" }),
      });
      setOutput(created);
    } catch (err) {
      setOutput({ error: err.message });
    }
  }
});
