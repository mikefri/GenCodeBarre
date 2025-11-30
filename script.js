/* script.js */

// Références vers les éléments du DOM
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
  // On récupère tous les boutons radio de format et orientation
  formatInputs: document.querySelectorAll('input[name="format"]'),
  orientationInputs: document.querySelectorAll('input[name="orientation"]')
};

// --- FONCTIONS ---

function updatePageConfig() {
  const format = document.querySelector('input[name="format"]:checked').value;
  const orientation = document.querySelector('input[name="orientation"]:checked').value;
  
  // Mise à jour visuelle (classes CSS)
  refs.pageSheet.className = `sheet ${format} ${orientation}`;
  
  // Mise à jour pour l'imprimante (CSS dynamique)
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
      
      // Petit check pour EAN13
      if (num.length !== 13) {
         // On peut loguer l'erreur ou juste ne rien faire
         console.warn("13 chiffres requis pour EAN13");
         return; 
      }

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
  
  // On sauvegarde l'état actuel du transform
  const originalTransform = container.style.transform;
  
  // On reset l'échelle pour que l'image soit capturée en haute résolution (taille réelle)
  container.style.transform = "none"; 

  html2canvas(document.getElementById("pageSheet"), {
    scale: 2, 
    backgroundColor: "#ffffff", 
    logging: false
  }).then(canvas => {
    const a = document.createElement("a");
    a.download = `etiquette_${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    
    // On remet le zoom d'affichage
    container.style.transform = originalTransform; 
  });
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS (LISTENERS) ---

// Champs de saisie
refs.texte.addEventListener("input", generer);
refs.type.addEventListener("change", generer);
refs.showText.addEventListener("change", generer);
refs.slider.addEventListener("input", updateSize);

// Boutons Radio (Format & Orientation) - On doit boucler car il y en a plusieurs
refs.formatInputs.forEach(input => input.addEventListener("change", updatePageConfig));
refs.orientationInputs.forEach(input => input.addEventListener("change", updatePageConfig));

// Boutons Actions
refs.printBtn.addEventListener("click", () => window.print());
refs.downloadBtn.addEventListener("click", telecharger);

// --- INITIALISATION ---
// On lance une première fois pour afficher le code par défaut
updatePageConfig();
generer();
