/***********************************************************
 *  PDF FONT – DIKRITIKA (DejaVu Sans)
 ***********************************************************/
let customFontLoaded = false;

async function loadFont(pdf) {
    if (customFontLoaded) {
        pdf.setFont("DejaVu");
        return;
    }

    const response = await fetch("fonts/DejaVuSans.ttf");
    const fontData = await response.arrayBuffer();

    pdf.addFileToVFS("DejaVuSans.ttf", arrayBufferToBase64(fontData));
    pdf.addFont("DejaVuSans.ttf", "DejaVu", "normal");
    pdf.setFont("DejaVu");

    customFontLoaded = true;
}

function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/***********************************************************
 *  GOOGLE DRIVE AUTH (SPRÁVNY TOK – MOBILE SAFE)
 ***********************************************************/
const CLIENT_ID =
    "473955433506-to65bdpsd1c072k0lvt3dkgoakcqprko.apps.googleusercontent.com";

let accessToken = null;
let tokenClient = null;

// SDK musí byť načítané predtým, než initneme tokenClient
window.addEventListener("load", () => {
    if (!window.google || !google.accounts || !google.accounts.oauth2) {
        console.error("❌ Google OAuth SDK sa nenačítalo");
        return;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: (tokenResponse) => {
            accessToken = tokenResponse.access_token;
            console.log("✅ ACCESS TOKEN OK");
            alert("✅ Prihlásenie do Google Drive úspešné");
        }
    });
});

// Tlačidlo „Prihlásiť Google Drive“
function loginGoogle() {
    if (!tokenClient) {
        alert("Google OAuth ešte nie je pripravený");
        return;
    }

    tokenClient.requestAccessToken({
        prompt: "select_account"
    });
}

/***********************************************************
 *  FORMULÁR – OKNÁ + FOTKY
 ***********************************************************/
let windowCount = 0;
const windowPhotos = {};

function addWindow() {
    windowCount++;

    const w = document.createElement("div");
    w.className = "window-block";
    w.dataset.id = windowCount;

    w.innerHTML = `
        <h3>Okno ${windowCount}</h3>

        <label>Miestnosť
            <input data-label="Miestnosť">
        </label>

        <label>Typ tienenia
            <select data-label="Typ tienenia">
                <option>Žalúzia</option>
                <option>Roleta</option>
                <option>Screen</option>
            </select>
        </label>

        <label>Šírka
            <input type="number" data-label="Šírka (mm)"> mm
        </label>

        <label>Výška
            <input type="number" data-label="Výška (mm)"> mm
        </label>

        <label>Ovládanie
            <select data-label="Ovládanie">
                <option>Motor – vypínač</option>
                <option>Motor – ovládač</option>
                <option>Kľuka</option>
            </select>
        </label>

        <label>Poznámka
            <textarea data-label="Poznámka"></textarea>
        </label>

        <label>Fotky
            <input type="file" multiple accept="image/*"
                   onchange="handlePhotos(event, ${windowCount})">
        </label>

        <div id="photos-${windowCount}"></div>
    `;

    document.getElementById("windows").appendChild(w);
}

function handlePhotos(e, id) {
    if (!windowPhotos[id]) windowPhotos[id] = [];

    [...e.target.files].forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => {
            windowPhotos[id].push(ev.target.result);
            renderPhotos(id);
        };
        reader.readAsDataURL(file);
    });

    e.target.value = "";
}

function renderPhotos(id) {
    const c = document.getElementById(`photos-${id}`);
    c.innerHTML = "";

    windowPhotos[id].forEach((src, i) => {
        c.innerHTML += `
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
 *  PDF + GOOGLE DRIVE UPLOAD
 ***********************************************************/
document.getElementById("orderForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    await loadFont(pdf);

    let y = 10;

    const name =
        document.getElementById("customerName").value || "Zakaznik";

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

        pdf.setFontSize(10);
        w.querySelectorAll("[data-label]").forEach(f => {
            if (f.value) {
                pdf.text(`${f.dataset.label}: ${f.value}`, 12, y);
                y += 5;
            }
        });

        (windowPhotos[w.dataset.id] || []).forEach(img => {
            if (y > 240) {
                pdf.addPage();
                y = 10;
                pdf.setFont("DejaVu");
            }
            pdf.addImage(img, "JPEG", 10, y, 60, 45);
            y += 50;
        });

        y += 8;
    });

    const blob = pdf.output("blob");
    pdf.save(`${name}.pdf`);

    if (accessToken) {
        await uploadToDrive(blob, `${name}.pdf`, name);
    }
});

/***********************************************************
 *  GOOGLE DRIVE – PRIEČINKY + UPLOAD
 ***********************************************************/
async function uploadToDrive(blob, filename, customer) {
    const root = await ensureFolder("Zamerania");
    const customerFolder = await ensureFolder(customer, root);

    const metadata = {
        name: filename,
        parents: [customerFolder]
    };

    const form = new FormData();
    form.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", blob);

    await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            body: form
        }
    );
}

async function ensureFolder(name, parentId) {
    const q = `mimeType='application/vnd.google-apps.folder' and name='${name}'`
        + (parentId ? ` and '${parentId}' in parents` : "");

    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );

    const data = await res.json();
    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }

    const create = await fetch(
        "https://www.googleapis.com/drive/v3/files",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                mimeType: "application/vnd.google-apps.folder",
                parents: parentId ? [parentId] : []
            })
        }
    );

    const folder = await create.json();
    return folder.id;
}

/***********************************************************
 *  NOVÉ ZAMERANIE
 ***********************************************************/
function resetForm() {
    document.getElementById("orderForm").reset();
    document.getElementById("windows").innerHTML = "";
    windowCount = 0;
    for (const k in windowPhotos) delete windowPhotos[k];
}
