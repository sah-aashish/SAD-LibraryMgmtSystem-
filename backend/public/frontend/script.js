const fallbackCatalog = [
  { id: "BK-101", title: "JavaScript for Web Systems", author: "Maya Sharma", category: "Programming", status: "Available", shelf: "A-12" },
  { id: "BK-102", title: "Modern Library Operations", author: "R. Adhikari", category: "Business", status: "Issued", shelf: "B-04" },
  { id: "BK-103", title: "Introduction to HTML and CSS", author: "Rina Paudel", category: "Programming", status: "Available", shelf: "A-02" },
  { id: "BK-104", title: "World History Essentials", author: "A. Singh", category: "History", status: "Available", shelf: "C-18" },
  { id: "BK-105", title: "Scientific Thinking", author: "S. Karki", category: "Science", status: "Issued", shelf: "D-03" },
  { id: "BK-106", title: "Classic Literature Review", author: "N. Aryal", category: "Literature", status: "Available", shelf: "E-09" }
];

const fallbackAnnouncements = `
<announcements>
  <announcement><title>New Semester Registration</title><date>2026-03-20</date><message>New members can register online and collect library cards from the help desk.</message></announcement>
  <announcement><title>Borrowing Limit Updated</title><date>2026-03-18</date><message>Teachers can now borrow up to five books for twenty-one days.</message></announcement>
  <announcement><title>Reference Room Workshop</title><date>2026-03-15</date><message>Join the weekend session on digital catalog search and research support.</message></announcement>
</announcements>
`;

const catalogBody = document.querySelector("#catalogBody");
const catalogCount = document.querySelector("#catalogCount");
const searchInput = document.querySelector("#searchInput");
const categoryFilter = document.querySelector("#categoryFilter");
const availabilityFilter = document.querySelector("#availabilityFilter");
const catalogForm = document.querySelector("#catalogForm");
const memberForm = document.querySelector("#memberForm");
const contactForm = document.querySelector("#contactForm");
const memberResult = document.querySelector("#memberResult");
const contactResult = document.querySelector("#contactResult");
const announcementList = document.querySelector("#announcementList");

let catalogData = [];

async function loadCatalog() {
  try {
    const response = await fetch("data/books.json");
    if (!response.ok) throw new Error("Catalog response failed");
    catalogData = await response.json();
  } catch (error) {
    catalogData = fallbackCatalog;
  }
  renderCatalog(catalogData);
}

function renderCatalog(items) {
  catalogBody.innerHTML = "";
  if (!items.length) {
    catalogBody.innerHTML = '<tr><td colspan="6">No matching books were found. Try another keyword or category.</td></tr>';
    catalogCount.textContent = "0 books found";
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((book) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${book.id}</td>
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${book.category}</td>
      <td><span class="status-badge ${book.status === "Available" ? "status-available" : "status-issued"}">${book.status}</span></td>
      <td>${book.shelf}</td>
    `;
    fragment.appendChild(row);
  });
  catalogBody.appendChild(fragment);
  catalogCount.textContent = `${items.length} book${items.length === 1 ? "" : "s"} found`;
}

function applyCatalogFilters() {
  const keyword = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const availability = availabilityFilter.value;

  const filtered = catalogData.filter((book) => {
    const matchesKeyword = [book.title, book.author, book.category, book.id].join(" ").toLowerCase().includes(keyword);
    const matchesCategory = category === "all" || book.category === category;
    const matchesAvailability = availability === "all" || book.status === availability;
    return matchesKeyword && matchesCategory && matchesAvailability;
  });
  renderCatalog(filtered);
}

async function loadAnnouncements() {
  let xmlText = fallbackAnnouncements;
  try {
    const response = await fetch("data/announcements.xml");
    if (!response.ok) throw new Error("Announcement response failed");
    xmlText = await response.text();
  } catch (error) {
    xmlText = fallbackAnnouncements;
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");
  const nodes = [...xmlDoc.querySelectorAll("announcement")];
  announcementList.innerHTML = "";

  nodes.forEach((node) => {
    const item = document.createElement("article");
    item.className = "announcement-item";
    item.innerHTML = `
      <small>${node.querySelector("date")?.textContent || ""}</small>
      <h3>${node.querySelector("title")?.textContent || "Notice"}</h3>
      <p>${node.querySelector("message")?.textContent || ""}</p>
    `;
    announcementList.appendChild(item);
  });
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setError(name, message) {
  const target = document.querySelector(`[data-error-for="${name}"]`);
  if (target) target.textContent = message;
}

function clearErrors(form) {
  form.querySelectorAll(".error").forEach((item) => {
    item.textContent = "";
  });
}

function handleMemberSubmit(event) {
  event.preventDefault();
  clearErrors(memberForm);
  memberResult.textContent = "";

  const formData = new FormData(memberForm);
  const values = Object.fromEntries(formData.entries());
  let isValid = true;

  if (!values.memberName || values.memberName.trim().length < 3) {
    setError("memberName", "Enter at least 3 characters.");
    isValid = false;
  }
  if (!validateEmail(values.memberEmail || "")) {
    setError("memberEmail", "Enter a valid email address.");
    isValid = false;
  }
  if (!/^\d{8,10}$/.test(values.memberPhone || "")) {
    setError("memberPhone", "Enter 8 to 10 digits.");
    isValid = false;
  }
  if (!values.memberType) {
    setError("memberType", "Select a member type.");
    isValid = false;
  }
  if (!memberForm.querySelector("#agreeRules").checked) {
    setError("agreeRules", "You must agree before submitting.");
    isValid = false;
  }
  if (!isValid) return;

  const existingMembers = JSON.parse(localStorage.getItem("vivlixMembers") || "[]");
  const memberRecord = {
    name: values.memberName.trim(),
    email: values.memberEmail.trim(),
    phone: values.memberPhone.trim(),
    type: values.memberType,
    purpose: values.memberMessage?.trim() || "",
    joinedOn: new Date().toLocaleDateString()
  };

  existingMembers.push(memberRecord);
  localStorage.setItem("vivlixMembers", JSON.stringify(existingMembers));
  document.cookie = `vivlixMember=${encodeURIComponent(memberRecord.name)}; path=/`;
  memberResult.textContent = `Membership request saved for ${memberRecord.name}. Admin panel data can now use this stored member record.`;
  memberForm.reset();
}

function handleContactSubmit(event) {
  event.preventDefault();
  clearErrors(contactForm);
  contactResult.textContent = "";

  const formData = new FormData(contactForm);
  const values = Object.fromEntries(formData.entries());
  let isValid = true;

  if (!values.contactSubject || values.contactSubject.trim().length < 4) {
    setError("contactSubject", "Enter a subject with at least 4 characters.");
    isValid = false;
  }
  if (!validateEmail(values.contactEmail || "")) {
    setError("contactEmail", "Enter a valid email address.");
    isValid = false;
  }
  if (!values.contactMessage || values.contactMessage.trim().length < 10) {
    setError("contactMessage", "Message should be at least 10 characters.");
    isValid = false;
  }
  if (!isValid) return;

  contactResult.textContent = "Your message has been recorded successfully for follow-up.";
  contactForm.reset();
}

function drawUsageCanvas() {
  const canvas = document.querySelector("#usageCanvas");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const points = [55, 80, 68, 110, 95, 130, 120];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f4f7ff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(44, 104, 255, 0.12)";
  context.lineWidth = 1;
  for (let y = 20; y <= 150; y += 30) {
    context.beginPath();
    context.moveTo(20, y);
    context.lineTo(400, y);
    context.stroke();
  }

  context.strokeStyle = "#2c68ff";
  context.lineWidth = 4;
  context.beginPath();
  points.forEach((point, index) => {
    const x = 35 + index * 55;
    const y = 160 - point;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  points.forEach((point, index) => {
    const x = 35 + index * 55;
    const y = 160 - point;
    context.fillStyle = "#16c0b0";
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#607095";
    context.font = "12px Poppins";
    context.fillText(labels[index], x - 12, 165);
  });
}

catalogForm?.addEventListener("submit", (event) => event.preventDefault());
searchInput?.addEventListener("input", applyCatalogFilters);
categoryFilter?.addEventListener("change", applyCatalogFilters);
availabilityFilter?.addEventListener("change", applyCatalogFilters);
memberForm?.addEventListener("submit", handleMemberSubmit);
contactForm?.addEventListener("submit", handleContactSubmit);
window.addEventListener("load", drawUsageCanvas);
window.addEventListener("resize", drawUsageCanvas);

loadCatalog();
loadAnnouncements();
