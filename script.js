/* script.js */

const refs = {
  texte: document.getElementById("texte"),
  type: document.getElementById("type"),
  showText: document.getElementById("showText"),
  slider: document.getElementById("sizeSlider"),
  target: document.getElementById("canvas-target"),
  wrapper: document.getElementById("barcode-wrapper"),
  pageSheet: document.getElementById("pageSheet"),
  printStyle: document.getElementById("print-style"),
  printBtn: document.getElementById("printBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  formatInputs: document.querySelectorAll('input[name="format"]'),
  orientationInputs: document.querySelectorAll('input[name="orientation"]'),
  
  // NOUVELLES RÉFÉRENCES POUR LE TITRE
  titleInput: document.getElementById("customTitle"),
  titleSizeSlider: document.getElementById("titleSizeSlider"),
  titleDisplay: document.getElementById("title-display")
};

// --- GESTION DU TITRE ---
function updateTitle() {
  // Met à jour le texte
  refs.titleDisplay.textContent = refs.titleInput.value;
  // Met à jour la taille (en 'em' pour que ce soit relatif)
  refs.titleDisplay.style.fontSize = refs.titleSizeSlider.value + 'em';
}

// --- FONCTIONS EXISTANTES ---
function updatePageConfig() {
  const format = document.querySelector('input[name="format"]:checked').value;
  const orientation = document.querySelector('input[name="orientation"]:checked').value;
  refs.pageSheet.className = `sheet ${format} ${orientation}`;
  refs.printStyle.innerHTML = `@page { size: ${format.toUpperCase()} ${orientation}; margin: 0; }`;
}

function generer() {
  const texte = refs.texte.value.trim();
  const type = refs.type.value;
  const displayValue = refs.showText.checked;

  refs.target.innerHTML = "";
  if (!texte && type !== "QRCODE") return;

  try {
    if (type === "CODE128") {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      refs.target.appendChild(svg);
      JsBarcode(svg, texte, {
        format: "CODE128", lineColor: "#000", background: "#ffffff",
        displayValue: displayValue, fontSize: 20, height: 100, margin: 10
      });
    } else if (type === "EAN13") {
      let num = texte.replace(/\D/g, "");
      if (num.length === 12) num += calculCheckDigit(num);
      if (num.length !== 13 && num.length > 0) console.warn("13 chiffres requis");

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      refs.target.appendChild(svg);
      JsBarcode(svg, num, {
        format: "EAN13", lineColor: "#000", background: "#ffffff",
        displayValue: displayValue, fontSize: 24, height: 100, margin: 10
      });
    } else if (type === "QRCODE") {
      const canvas = document.createElement("canvas");
      refs.target.appendChild(canvas);
      QRCode.toCanvas(canvas, texte || "https://exemple.com", {
        width: 300, margin: 1, color: { dark: "#000000", light: "#ffffff" }
      });
    }
  } catch (e) { console.warn(e); }
}

function updateSize() {
  refs.wrapper.style.transform = `scale(${refs.slider.value})`;
}

function calculCheckDigit(ean12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (i % 2 === 0 ? 1 : 3) * parseInt(ean12[i]);
  const rem = sum % 10;
  return rem === 0 ? 0 : 10 - rem;
}

function telecharger() {
  const container = document.querySelector('.sheet-container');
  const originalTransform = container.style.transform;
  container.style.transform = "none"; 

  html2canvas(document.getElementById("pageSheet"), {
    scale: 2, backgroundColor: "#ffffff", logging: false
  }).then(canvas => {
    const a = document.createElement("a");
    a.download = `etiquette_${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    container.style.transform = originalTransform; 
  });
}

// --- ÉCOUTEURS ---
refs.texte.addEventListener("input", generer);
refs.type.addEventListener("change", generer);
refs.showText.addEventListener("change", generer);
refs.slider.addEventListener("input", updateSize);

// Nouveaux écouteurs pour le titre
refs.titleInput.addEventListener("input", updateTitle);
refs.titleSizeSlider.addEventListener("input", updateTitle);

refs.formatInputs.forEach(input => input.addEventListener("change", updatePageConfig));
refs.orientationInputs.forEach(input => input.addEventListener("change", updatePageConfig));

refs.printBtn.addEventListener("click", () => window.print());
refs.downloadBtn.addEventListener("click", telecharger);

// Init
updatePageConfig();
generer();
updateTitle(); // Init titre vide ou par défaut