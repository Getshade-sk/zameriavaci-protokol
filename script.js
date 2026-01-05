/***********************************************************
 *  GLOBALS
 ***********************************************************/
let windowCount = 0;
const windowPhotos = {};
let accessToken = null;
let tokenClient = null;
let customFontLoaded = false;

const CLIENT_ID =
  "473955433506-to65bdpsd1c072k0lvt3dkgoakcqprko.apps.googleusercontent.com";

/***********************************************************
 *  GOOGLE AUTH
 ***********************************************************/
function initGoogleAuth() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: "https://www.googleapis.com/auth/drive.file",
    callback: (token) => {
      accessToken = token.access_token;
      alert("✅ Prihlásenie do Google Drive úspešné");
    }
  });
}

function loginGoogle() {
  if (!tokenClient) initGoogleAuth();
  tokenClient.requestAccessToken({ prompt: "select_account" });
}

/***********************************************************
 *  FONT FOR PDF (DIACRITICS)
 ***********************************************************/
async function loadFont(pdf) {
  if (customFontLoaded) {
    pdf.setFont("DejaVu");
    return;
  }

  const res = await fetch("fonts/DejaVuSans.ttf");
  const buf = await res.arrayBuffer();

  const base64 = arrayBufferToBase64(buf);
  pdf.addFileToVFS("DejaVuSans.ttf", base64);
  pdf.addFont("DejaVuSans.ttf", "DejaVu", "normal");
  pdf.setFont("DejaVu");

  customFontLoaded = true;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/***********************************************************
 *  WINDOWS + PHOTOS
 ***********************************************************/
function addWindow() {
  windowCount++;
  const id = windowCount;

  const div = document.createElement("div");
  div.className = "window-block";
  div.dataset.id = id;

  div.innerHTML = `
    <h3>Okno ${id}</h3>

    <label>Miestnosť
      <input>
    </label>

    <label>Typ tienenia
      <select>
        <option>Žalúzia</option>
        <option>Roleta</option>
        <option>Screen</option>
      </select>
    </label>

    <label>Šírka (mm)
      <input type="number">
    </label>

    <label>Výška (mm)
      <input type="number">
    </label>

    <label>Ovládanie
      <select>
        <option>Motor – vypínač</option>
        <option>Motor – ovládač</option>
        <option>Kľuka</option>
      </select>
    </label>

    <label>Fotky
      <input type="file" accept="image/*" multiple
        onchange="handlePhotos(event, ${id})">
    </label>

    <div id="photos-${id}"></div>

    <label>Poznámky
      <textarea></textarea>
    </label>
  `;

  document.getElementById("windows").appendChild(div);
}

function handlePhotos(e, id) {
  const files = Array.from(e.target.files);
  if (!windowPhotos[id]) windowPhotos[id] = [];

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      windowPhotos[id].push(ev.target.result);
      renderPhotos(id);
    };
    reader.readAsDataURL(file);
  });

  e.target.value = "";
}

function renderPhotos(id) {
  const box = document.getElementById(`photos-${id}`);
  box.innerHTML = "";

  (windowPhotos[id] || []).forEach((src, i) => {
    box.innerHTML += `
      <div class="photo-item">
        <img src="${src}">
        <button type="button" class="remove-photo"
          onclick="removePhoto(${id}, ${i})">×</button>
      </div>
    `;
  });
}

function removePhoto(id, index) {
  windowPhotos[id].splice(index, 1);
  renderPhotos(id);
}

/***********************************************************
 *  FORM + PDF
 ***********************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("orderForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    await loadFont(pdf);

    let y = 10;
    const name = customerName.value || "Zakaznik";

    pdf.setFontSize(16);
    pdf.text("Zameriavací protokol", 10, y);
    y += 10;

    pdf.setFontSize(11);
    pdf.text(`Meno: ${name}`, 10, y); y += 6;
    pdf.text(`Email: ${customerEmail.value}`, 10, y); y += 6;
    pdf.text(`Telefón: ${customerPhone.value}`, 10, y); y += 6;
    pdf.text(`Adresa: ${customerAddress.value}`, 10, y); y += 6;
    pdf.text(`Dátum: ${measureDate.value}`, 10, y); y += 10;

    document.querySelectorAll(".window-block").forEach((w, i) => {
      if (y > 260) {
        pdf.addPage();
        y = 10;
        pdf.setFont("DejaVu");
      }

      pdf.setFontSize(13);
      pdf.text(`Okno ${i + 1}`, 10, y);
      y += 6;

      w.querySelectorAll("input, select, textarea").forEach((el) => {
        if (el.type !== "file" && el.value) {
          pdf.setFontSize(10);
          pdf.text(`${el.parentElement.firstChild.textContent.trim()}: ${el.value}`, 12, y);
          y += 5;
        }
      });

      (windowPhotos[w.dataset.id] || []).forEach((img) => {
        if (y > 240) {
          pdf.addPage();
          y = 10;
        }
        pdf.addImage(img, "JPEG", 10, y, 60, 45);
        y += 50;
      });

      y += 5;
    });

    pdf.save(`${name}.pdf`);
  });
});
