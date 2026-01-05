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
 *  FORM + PDF + GOOGLE DRIVE UPLOAD
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

    // 1️⃣ Generovanie PDF
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
      if (y > 260) { pdf.addPage(); y = 10; pdf.setFont("DejaVu"); }

      pdf.setFontSize(13);
      pdf.text(`Okno ${i + 1}`, 10, y); y += 6;

      w.querySelectorAll("input, select, textarea").forEach((el) => {
        if (el.type !== "file" && el.value) {
          pdf.setFontSize(10);
          pdf.text(`${el.parentElement.firstChild.textContent.trim()}: ${el.value}`, 12, y);
          y += 5;
        }
      });

      (windowPhotos[w.dataset.id] || []).forEach((img) => {
        if (y > 240) { pdf.addPage(); y = 10; }
        pdf.addImage(img, "JPEG", 10, y, 60, 45);
        y += 50;
      });

      y += 5;
    });

    // 2️⃣ Lokálne uloženie
    pdf.save(`${name}.pdf`);

    // 3️⃣ Upload do Google Drive
    if (!accessToken) {
      alert("⚠️ Prihláste sa do Google Drive pred uložením online!");
      return;
    }

    const pdfBlob = pdf.output("blob");

    async function uploadToDrive(blob, fileName) {
      let folderId;

      try {
        // Skontroluj alebo vytvor priečinok "Zamerania"
        const folderRes = await fetch(
          "https://www.googleapis.com/drive/v3/files?q=name='Zamerania' and mimeType='application/vnd.google-apps.folder' and trashed=false",
          { headers: { Authorization: "Bearer " + accessToken } }
        );
        const folderData = await folderRes.json();

        if (folderData.files && folderData.files.length > 0) {
          folderId = folderData.files[0].id;
        } else {
          const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
            method: "POST",
            headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Zamerania", mimeType: "application/vnd.google-apps.folder" })
          });
          const createData = await createRes.json();
          folderId = createData.id;
        }
      } catch (err) {
        console.error("Chyba priečinka:", err);
        alert("❌ Nepodarilo sa pripraviť priečinok Zamerania v Drive");
        return;
      }

      // Upload PDF
      const formData = new FormData();
      formData.append(
        "metadata",
        new Blob([JSON.stringify({ name: fileName, mimeType: "application/pdf", parents: [folderId] })], {
          type: "application/json"
        })
      );
      formData.append("file", blob);

      try {
        const res = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          { method: "POST", headers: { Authorization: "Bearer " + accessToken }, body: formData }
        );
        const data = await res.json();
        console.log("Drive upload response:", data);

        if (data.id) alert("✅ PDF uložené do Google Drive (priečinok Zamerania)!");
        else console.error("Chyba Drive upload:", data);

      } catch (err) {
        console.error("Chyba pri ukladaní PDF do Drive:", err);
        alert("❌ Chyba pri ukladaní PDF do Google Drive");
      }
    }

    // Zavoláme upload
    uploadToDrive(pdfBlob, `${name}.pdf`);
  });
});


