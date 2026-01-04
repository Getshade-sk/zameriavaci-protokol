# Zameriavací protokol – tieniaca technika

Webová aplikácia na vytváranie **zameriavacích protokolov** pre tieniacu techniku  
(žalúzie, rolety, screeny, markízy).

Aplikácia umožňuje zaznamenať údaje o zákazníkovi, jednotlivých oknách, rozmeroch,
type tienenia, montáži, ovládaní a fotografiách a následne automaticky vytvoriť
**PDF dokument**.

---

## Funkcie

- 📐 Evidencia rozmerov okien (šírka / výška v mm)
- 🪟 Viac okien v jednom zameraní
- 🧱 Typ montáže (do ostenia, na okno, na stenu)
- 🎛️ Typ ovládania (motor, vypínač, ovládač, kľuka)
- 🎨 Typ žalúzií (Z90, Z70, C80)
- 📝 Poznámky ku každému oknu
- 📷 Pridávanie fotografií k oknám
- 📄 Automatické generovanie PDF
- ☁️ Ukladanie PDF do Google Drive
- 📱 Optimalizované pre mobilné zariadenia
- 📴 Offline režim (PWA)

---

## Použitie

1. Otvor aplikáciu v prehliadači
2. Vyplň údaje o zákazníkovi
3. Pridaj jedno alebo viac okien
4. Vyplň rozmery, typ tienenia a montáže
5. Prilož fotografie
6. Klikni na **Uložiť (PDF + Drive)**

---

## Spustenie lokálne

Aplikácia **nefunguje cez `file://`**.  
Je potrebné ju spustiť cez lokálny HTTP server.

### Príklad (VS Code – Live Server):
1. Otvor projekt vo VS Code
2. Klikni pravým tlačidlom na `index.html`
3. Zvoľ **Open with Live Server**

---

## Hosting

Aplikácia môže byť hostovaná zadarmo cez:
- **GitHub Pages**
- **Netlify**

---

## Použité technológie

- HTML, CSS, JavaScript
- jsPDF
- Google Drive API (OAuth 2.0)
- Progressive Web App (PWA)

---

## Autor

Vytvorené pre potreby merania tieniacej techniky.
