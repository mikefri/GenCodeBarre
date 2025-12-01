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
  
  // RÉFÉRENCES POUR LE TITRE
  titleInput: document.getElementById("customTitle"),
  titleSizeSlider: document.getElementById("titleSizeSlider"),
  titleDisplay: document.getElementById("title-display"),
  
  // NOUVELLE RÉFÉRENCE POUR LE FEEDBACK (Assurez-vous que cet ID existe dans votre HTML)
  codeFeedback: document.getElementById("code-feedback")
};

// --- GESTION DU TITRE ---
function updateTitle() {
  refs.titleDisplay.textContent = refs.titleInput.value;
  refs.titleDisplay.style.fontSize = refs.titleSizeSlider.value + 'em';
}

// --- FONCTIONS DE CONFIGURATION ---
function updatePageConfig() {
  const format = document.querySelector('input[name="format"]:checked').value;
  const orientation = document.querySelector('input[name="orientation"]:checked').value;
  refs.pageSheet.className = `sheet ${format} ${orientation}`;
  refs.printStyle.innerHTML = `@page { size: ${format.toUpperCase()} ${orientation}; margin: 0; }`;
}

function calculCheckDigit(ean12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (i % 2 === 0 ? 1 : 3) * parseInt(ean12[i]);
  const rem = sum % 10;
  return rem === 0 ? 0 : 10 - rem;
}

// --- FONCTION PRINCIPALE DE GÉNÉRATION ---
function generer() {
  const texte = refs.texte.value.trim();
  const type = refs.type.value;
  const displayValue = refs.showText.checked;
  
  // Réinitialisation de la zone de dessin
  refs.target.innerHTML = "";
  
  // Réinitialisation du feedback visuel (bordures et texte)
  refs.texte.style.borderColor = '#45475a'; // Couleur par défaut (var(--border-color) ou similaire)
  if (refs.codeFeedback) {
      refs.codeFeedback.textContent = "";
      refs.codeFeedback.style.color = '#a6adc8';
  }

  // Si le champ est vide (sauf pour QR Code qui a une valeur par défaut)
  if (!texte && type !== "QRCODE") {
    if (refs.codeFeedback) {
        refs.codeFeedback.textContent = "Saisissez des données pour générer le code.";
        refs.codeFeedback.style.color = '#f38ba8'; // Rouge erreur
    }
    return;
  }

  try {
    if (type === "CODE128") {
      if (refs.codeFeedback) refs.codeFeedback.textContent = "Code 128 : Standard polyvalent.";
      
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      refs.target.appendChild(svg);
      JsBarcode(svg, texte, {
        format: "CODE128", lineColor: "#000", background: "#ffffff",
        displayValue: displayValue, fontSize: 20, height: 100, margin: 10
      });

    } else if (type === "EAN13") {
      let num = texte.replace(/\D/g, ""); // Ne garder que les chiffres

      // Troncature si trop long
      if (num.length > 13) num = num.substring(0, 13);
      
      // Validation de la longueur
      if (num.length > 0 && num.length !== 12 && num.length !== 13) {
        refs.texte.style.borderColor = '#fab387'; // Orange avertissement
        if (refs.codeFeedback) {
            refs.codeFeedback.textContent = `EAN-13 : 12 ou 13 chiffres requis. Actuellement : ${num.length}.`;
            refs.codeFeedback.style.color = '#fab387';
        }
      } 
      // Calcul automatique de la clé si 12 chiffres
      else if (num.length === 12) {
        const checkDigit = calculCheckDigit(num);
        num += checkDigit;
        if (refs.codeFeedback) refs.codeFeedback.textContent = `Clé calculée (13e chiffre) : ${checkDigit}`;
      } 
      else if (num.length === 13) {
         if (refs.codeFeedback) refs.codeFeedback.textContent = `EAN-13 complet saisi.`;
      }

      // Arrêt si la longueur n'est pas valide pour la génération
      if (num.length !== 13) return;

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      refs.target.appendChild(svg);
      JsBarcode(svg, num, {
        format: "EAN13", lineColor: "#000", background: "#ffffff",
        displayValue: displayValue, fontSize: 24, height: 100, margin: 10
      });

    } else if (type === "QRCODE") {
      if (refs.codeFeedback) refs.codeFeedback.textContent = "QR Code généré.";
      
      const canvas = document.createElement("canvas");
      refs.target.appendChild(canvas);
      QRCode.toCanvas(canvas, texte || "https://exemple.com", {
        width: 300, margin: 1, color: { dark: "#000000", light: "#ffffff" }
      });
    }
  } catch (e) { 
    // Gestion des erreurs fatales (ex: caractères invalides pour Code 128)
    refs.texte.style.borderColor = '#f38ba8'; // Rouge erreur
    if (refs.codeFeedback) {
        refs.codeFeedback.textContent = "Erreur : Données invalides pour ce format.";
        refs.codeFeedback.style.color = '#f38ba8';
    }
    console.error("Erreur de génération :", e);
  }
}

function updateSize() {
  refs.wrapper.style.transform = `scale(${refs.slider.value})`;
}

function telecharger() {
  const container = document.querySelector('.sheet-container');
  // Sauvegarde du style actuel
  const originalTransform = container.style.transform;
  // Réinitialisation du scale pour une capture propre haute résolution
  container.style.transform = "none"; 

  html2canvas(document.getElementById("pageSheet"), {
    scale: 2, // Meilleure qualité
    backgroundColor: "#ffffff", 
    logging: false
  }).then(canvas => {
    const a = document.createElement("a");
    a.download = `etiquette_${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    // Restauration du zoom d'aperçu
    container.style.transform = originalTransform; 
  });
}

// --- ÉCOUTEURS ---
refs.texte.addEventListener("input", generer);
refs.type.addEventListener("change", generer);
refs.showText.addEventListener("change", generer);
refs.slider.addEventListener("input", updateSize);

// Écouteurs pour le titre
if (refs.titleInput) refs.titleInput.addEventListener("input", updateTitle);
if (refs.titleSizeSlider) refs.titleSizeSlider.addEventListener("input", updateTitle);

refs.formatInputs.forEach(input => input.addEventListener("change", updatePageConfig));
refs.orientationInputs.forEach(input => input.addEventListener("change", updatePageConfig));

if (refs.printBtn) refs.printBtn.addEventListener("click", () => window.print());
if (refs.downloadBtn) refs.downloadBtn.addEventListener("click", telecharger);

// Initialisation
updatePageConfig();
generer();
updateTitle();