const API_BASE = "";
const TOKEN_KEY = "vivlix_admin_token";
const USER_KEY = "vivlix_admin_user";

const authScreen = document.querySelector("#authScreen");
const adminApp = document.querySelector("#adminApp");
const authMessage = document.querySelector("#authMessage");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const authTabs = [...document.querySelectorAll(".auth-tab")];

const navLinks = [...document.querySelectorAll(".nav-link")];
const views = [...document.querySelectorAll(".view")];
const subtabs = [...document.querySelectorAll(".subtab")];
const subviews = [...document.querySelectorAll(".subview")];
const roleLabel = document.querySelector("#roleLabel");
const menuSearch = document.querySelector("#menuSearch");
const logoutButton = document.querySelector("#logoutButton");

const metricBooks = document.querySelector("#metricBooks");
const metricMembers = document.querySelector("#metricMembers");
const metricOverdue = document.querySelector("#metricOverdue");
const metricPending = document.querySelector("#metricPending");
const metricFines = document.querySelector("#metricFines");
const metricOutstanding = document.querySelector("#metricOutstanding");

const bookTableBody = document.querySelector("#bookTableBody");
const memberTableBody = document.querySelector("#memberTableBody");
const roomTableBody = document.querySelector("#roomTableBody");
const reservationTableBody = document.querySelector("#reservationTableBody");
const issuedTableBody = document.querySelector("#issuedTableBody");
const historyTableBody = document.querySelector("#historyTableBody");
const searchResults = document.querySelector("#searchResults");

const issueBookSelect = document.querySelector("#issueBookSelect");
const issueUserSelect = document.querySelector("#issueUserSelect");
const issueDateInput = document.querySelector("#issueDate");
const returnDateInput = document.querySelector("#returnDate");
const issueMessage = document.querySelector("#issueMessage");
const bookMessage = document.querySelector("#bookMessage");
const settingsMessage = document.querySelector("#settingsMessage");

let currentUser = readStoredUser();
let books = [];
let users = [];
let issues = [];
let settings = { fine_per_day: 1, max_books_per_member: 5, max_issue_days: 14 };
const rooms = [
  { room: "Reading Hall A", capacity: 60, status: "Open", supervisor: "Anita Karki" },
  { room: "Research Room", capacity: 24, status: "Reserved", supervisor: "Sujan Rai" },
  { room: "Reference Section", capacity: 40, status: "Open", supervisor: "Mina Thapa" }
];

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function storeAuth(authToken, user) {
  localStorage.setItem(TOKEN_KEY, authToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  currentUser = user;
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  currentUser = null;
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token()) {
    headers.Authorization = `Bearer ${token()}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({ success: false, message: "Invalid server response." }));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Request failed.");
  }

  return data.data;
}

function showAuthMessage(message, isError = true) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#cc3d3d" : "#2d7a55";
}

function switchAuthTab(name) {
  authTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.authTab === name));
  loginForm.classList.toggle("active", name === "login");
  registerForm.classList.toggle("active", name === "register");
  showAuthMessage("", false);
}

function setAuthenticatedLayout(isAuthed) {
  authScreen.classList.toggle("hidden", isAuthed);
  adminApp.classList.toggle("hidden", !isAuthed);
}

function badgeForStatus(status) {
  const normalized = String(status).toLowerCase();
  if (["available", "open", "returned"].includes(normalized)) return `<span class="status-pill status-green">${status}</span>`;
  if (["issued", "pending", "reserved", "overdue"].includes(normalized)) return `<span class="status-pill status-yellow">${status}</span>`;
  return `<span class="status-pill status-blue">${status}</span>`;
}

function setActiveView(viewName) {
  navLinks.forEach((link) => link.classList.toggle("active", link.dataset.view === viewName));
  views.forEach((view) => view.classList.toggle("active", view.dataset.viewPanel === viewName));
}

function setActiveSubtab(name) {
  subtabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.subtab === name));
  subviews.forEach((view) => view.classList.toggle("active", view.dataset.subview === name));
}

function renderBooks() {
  bookTableBody.innerHTML = books.map((book) => `
    <tr>
      <td>${book.id}</td>
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${book.category || "-"}</td>
      <td>${badgeForStatus((book.available_copies || 0) > 0 ? "Available" : "Issued")}</td>
      <td>${book.shelf_location || "-"}</td>
    </tr>
  `).join("");
}

function renderUsers() {
  memberTableBody.innerHTML = users.map((user) => `
    <tr>
      <td>${user.full_name}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
    </tr>
  `).join("");
}

function renderRooms() {
  roomTableBody.innerHTML = rooms.map((room) => `
    <tr>
      <td>${room.room}</td>
      <td>${room.capacity}</td>
      <td>${badgeForStatus(room.status)}</td>
      <td>${room.supervisor}</td>
    </tr>
  `).join("");
}

function renderReservations() {
  reservationTableBody.innerHTML = `
    <tr>
      <td colspan="5">Reservation management can be added on top of the authenticated API layer.</td>
    </tr>
  `;
}

function renderIssues() {
  const bookKeyword = document.querySelector("#returnSearchBook").value.trim().toLowerCase();
  const userKeyword = document.querySelector("#returnSearchUser").value.trim().toLowerCase();
  const statusFilter = document.querySelector("#returnStatusFilter").value;

  const filtered = issues.filter((item) => {
    const bookMatch = item.book.toLowerCase().includes(bookKeyword);
    const userMatch = item.member.toLowerCase().includes(userKeyword);
    const statusMatch = statusFilter === "all" || item.status === statusFilter;
    return bookMatch && userMatch && statusMatch;
  });

  issuedTableBody.innerHTML = filtered.map((item) => `
    <tr>
      <td>${item.book}</td>
      <td>${item.member}</td>
      <td>${item.issue_date}</td>
      <td>${item.due_date}</td>
      <td>${item.status === "issued" ? "Not Renewed" : "-"}</td>
      <td>${item.status === "issued" ? "Not Renewed" : "-"}</td>
      <td>${Number(item.fine_amount || 0).toFixed(2)}</td>
      <td>
        <div class="action-group">
          <button type="button" class="btn btn-royal" data-action="return" data-id="${item.id}" ${item.status !== "issued" ? "disabled" : ""}>Return</button>
        </div>
      </td>
    </tr>
  `).join("");

  historyTableBody.innerHTML = issues.map((item) => `
    <tr>
      <td>${item.member}</td>
      <td>${item.book}</td>
      <td>${item.status}</td>
      <td>${item.issue_date}</td>
      <td>${item.return_date || "-"}</td>
      <td>${Number(item.fine_amount || 0).toFixed(2)}</td>
    </tr>
  `).join("");
}

function renderSearchResults() {
  const keyword = document.querySelector("#recordSearch").value.trim().toLowerCase();
  const combined = [
    ...books.map((book) => `Book: ${book.title} (${book.author})`),
    ...users.map((user) => `User: ${user.full_name} (${user.role})`)
  ].filter((item) => item.toLowerCase().includes(keyword));
  searchResults.innerHTML = combined.length ? combined.map((item) => `<li>${item}</li>`).join("") : "<li>No matching records found.</li>";
}

function renderSettings() {
  document.querySelector("#settingQuota").textContent = settings.max_books_per_member;
  document.querySelector("#settingFine").textContent = Number(settings.fine_per_day).toFixed(2);
  document.querySelector("#settingMinFine").textContent = Number(settings.fine_per_day * 10).toFixed(2);
  document.querySelector("#settingFineable").textContent = "Yes";
  document.querySelector("#quotaInput").value = settings.max_books_per_member;
  document.querySelector("#fineAmountInput").value = settings.fine_per_day;
  document.querySelector("#minFineInput").value = Number(settings.fine_per_day * 10).toFixed(2);
  document.querySelector("#fineableInput").value = "Yes";
}

function populateIssueOptions() {
  issueBookSelect.innerHTML = `<option value="">-- Select Book --</option>` + books.map((book) => `<option value="${book.id}">${book.title}</option>`).join("");
  issueUserSelect.innerHTML = `<option value="">-- Select User --</option>` + users
    .filter((user) => user.role === "member")
    .map((user) => `<option value="${user.id}">${user.full_name}</option>`)
    .join("");
}

function renderDashboardStats(stats) {
  metricBooks.textContent = stats.total_books ?? 0;
  metricMembers.textContent = stats.total_members ?? 0;
  metricOverdue.textContent = stats.overdue_books ?? 0;
  metricPending.textContent = 0;
  metricFines.textContent = `RS ${Number(stats.collected_fines || 0).toFixed(2)}`;
  metricOutstanding.textContent = "RS 0.00";
}

function drawTrendChart() {
  const canvas = document.querySelector("#trendCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const labels = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const values = [0, 0, 0, 0, 0, 0];
  const chartWidth = canvas.width - 110;
  const startX = 60;
  const baselineY = 230;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(79, 85, 109, 0.10)";
  for (let y = 50; y <= baselineY; y += 36) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(canvas.width - 30, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#8d9099";
  ctx.font = "12px Inter";
  ["2", "1.5", "1", "0.5", "0"].forEach((label, index) => ctx.fillText(label, 15, 58 + index * 36));
  ctx.strokeStyle = "#5c69da";
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = startX + (chartWidth / (labels.length - 1)) * index;
    const y = baselineY - value * 60;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  labels.forEach((label, index) => {
    const x = startX + (chartWidth / (labels.length - 1)) * index;
    ctx.fillText(label, x - 10, 260);
  });
}

async function loadAppData() {
  const [bookData, userData, statsData, issueData, settingsData] = await Promise.all([
    api("/books"),
    api("/users"),
    api("/dashboard-stats"),
    api("/issues"),
    api("/settings")
  ]);

  books = bookData.books || [];
  users = userData.users || [];
  issues = issueData.issues || [];
  settings = settingsData.settings || settings;

  roleLabel.textContent = currentUser?.full_name || currentUser?.email || "Admin User";
  renderBooks();
  renderUsers();
  renderRooms();
  renderReservations();
  renderIssues();
  renderSearchResults();
  renderSettings();
  populateIssueOptions();
  renderDashboardStats(statsData);
  drawTrendChart();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(loginForm);
  try {
    const data = await api("/login", {
      method: "POST",
      body: JSON.stringify({
        email: form.get("loginEmail"),
        password: form.get("loginPassword")
      })
    });
    storeAuth(data.token, data.user);
    setAuthenticatedLayout(true);
    await loadAppData();
    showAuthMessage("", false);
  } catch (error) {
    showAuthMessage(error.message);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(registerForm);
  try {
    const data = await api("/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: form.get("registerName"),
        email: form.get("registerEmail"),
        password: form.get("registerPassword"),
        role: form.get("registerRole")
      })
    });
    storeAuth(data.token, data.user);
    setAuthenticatedLayout(true);
    await loadAppData();
    showAuthMessage("Registration completed successfully.", false);
  } catch (error) {
    showAuthMessage(error.message);
  }
});

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchAuthTab(tab.dataset.authTab));
});

logoutButton.addEventListener("click", () => {
  clearAuth();
  setAuthenticatedLayout(false);
  switchAuthTab("login");
});

document.querySelector("#bookForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await api("/books", {
      method: "POST",
      body: JSON.stringify({
        title: form.get("bookTitle"),
        author: form.get("bookAuthor"),
        category: form.get("bookCategory"),
        shelf_location: form.get("bookShelf"),
        total_copies: 1,
        available_copies: 1
      })
    });
    bookMessage.textContent = "Book added successfully.";
    event.currentTarget.reset();
    await loadAppData();
  } catch (error) {
    bookMessage.textContent = error.message;
  }
});

document.querySelector("#issueBookForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await api("/issue-book", {
      method: "POST",
      body: JSON.stringify({
        book_id: Number(form.get("issueBookSelect")),
        user_id: Number(form.get("issueUserSelect")),
        issue_date: form.get("issueDate"),
        due_date: form.get("returnDate")
      })
    });
    issueMessage.textContent = "Book issued successfully.";
    await loadAppData();
  } catch (error) {
    issueMessage.textContent = error.message;
  }
});

issuedTableBody.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (action !== "return" || !id) return;

  try {
    await api("/return-book", {
      method: "POST",
      body: JSON.stringify({
        issue_id: Number(id),
        return_date: new Date().toISOString().slice(0, 10)
      })
    });
    await loadAppData();
  } catch (error) {
    issueMessage.textContent = error.message;
  }
});

document.querySelector("#editSettingsBtn").addEventListener("click", () => {
  document.querySelector("#settingsEditor").classList.toggle("hidden");
});

document.querySelector("#settingsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await api("/settings", {
      method: "PUT",
      body: JSON.stringify({
        max_books_per_member: Number(form.get("quotaInput")),
        fine_per_day: Number(form.get("fineAmountInput")),
        max_issue_days: Math.max(1, Number(form.get("minFineInput")) || settings.max_issue_days)
      })
    });
    settingsMessage.textContent = "Settings updated successfully.";
    await loadAppData();
  } catch (error) {
    settingsMessage.textContent = error.message;
  }
});

document.querySelector("#recordSearch").addEventListener("input", renderSearchResults);
document.querySelector("#returnSearchBook").addEventListener("input", renderIssues);
document.querySelector("#returnSearchUser").addEventListener("input", renderIssues);
document.querySelector("#returnStatusFilter").addEventListener("change", renderIssues);

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveView(link.dataset.view);
  });
});

subtabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveSubtab(tab.dataset.subtab));
});

menuSearch.addEventListener("input", () => {
  const keyword = menuSearch.value.trim().toLowerCase();
  navLinks.forEach((link) => {
    link.style.display = link.textContent.toLowerCase().includes(keyword) ? "flex" : "none";
  });
});

issueDateInput.value = new Date().toISOString().slice(0, 10);
returnDateInput.value = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

(async function init() {
  if (!token() || !currentUser) {
    setAuthenticatedLayout(false);
    switchAuthTab("login");
    return;
  }

  try {
    setAuthenticatedLayout(true);
    await loadAppData();
  } catch (error) {
    clearAuth();
    setAuthenticatedLayout(false);
    showAuthMessage("Session expired. Please log in again.");
  }
})();

window.addEventListener("resize", drawTrendChart);
