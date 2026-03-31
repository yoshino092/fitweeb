const form = document.getElementById("memberForm");
const statusText = document.getElementById("status");
const membersEl = document.getElementById("members");

async function loadMembers() {
  membersEl.innerHTML = "<li>Ачааллаж байна...</li>";

  try {
    const response = await fetch("/api/members?limit=5");
    const payload = await response.json();
    const members = payload.members || [];

    membersEl.innerHTML = "";

    if (members.length === 0) {
      membersEl.innerHTML = "<li>Одоогоор бүртгэл алга.</li>";
      return;
    }

    members.forEach((member) => {
      const li = document.createElement("li");
      li.className = "member";
      li.textContent = `${member.name} • ${member.goal} • ${member.plan}`;
      membersEl.appendChild(li);
    });
  } catch (error) {
    membersEl.innerHTML = "<li>Сервертэй холбогдож чадсангүй.</li>";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusText.textContent = "";

  const data = new FormData(form);
  const member = {
    name: data.get("name")?.toString().trim(),
    phone: data.get("phone")?.toString().trim(),
    email: data.get("email")?.toString().trim(),
    goal: data.get("goal")?.toString().trim(),
    plan: data.get("plan")?.toString().trim(),
  };

  try {
    const response = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(member),
    });

    const payload = await response.json();

    if (!response.ok) {
      statusText.textContent = `❌ ${payload.message || "Алдаа гарлаа."}`;
      return;
    }

    form.reset();
    statusText.textContent = "✅ Амжилттай бүртгэгдлээ!";
    loadMembers();
  } catch (error) {
    statusText.textContent = "❌ Сервертэй холбогдож чадсангүй.";
  }
});

loadMembers();
