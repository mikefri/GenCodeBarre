// Références aux éléments du DOM
const refs = {
    excelInput: document.getElementById('excelInput'),
    dropZone: document.getElementById('dropZone'),
    importStatus: document.getElementById('importStatus'),
    importCount: document.getElementById('importCount'),
    clearBtn: document.getElementById('clearDataBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    
    gridContainer: document.getElementById('gridContainer'),
    pageSheet: document.getElementById('pageSheet'),
    sheetLayer: document.getElementById('sheetLayer'),
    zoomSlider: document.getElementById('zoomSlider'),
    
    // Inputs Config
    codeType: document.getElementById('codeType'),
    marginTop: document.getElementById('marginTop'),
    marginLeft: document.getElementById('marginLeft'),
    nbCols: document.getElementById('nbCols'),
    nbRows: document.getElementById('nbRows'),
    rowHeight: document.getElementById('rowHeight'),
    codeScale: document.getElementById('codeScale')
};

let appData = []; // Stockage des codes

// --- GESTION DU ZOOM ---
refs.zoomSlider.addEventListener('input', (e) => {
    refs.sheetLayer.style.transform = `scale(${e.target.value})`;
});

// --- MISE A JOUR CSS GRILLE ---
function updateGridCSS() {
    const style = refs.pageSheet.style;
    style.setProperty('--mt', refs.marginTop.value + 'mm');
    style.setProperty('--ml', refs.marginLeft.value + 'mm');
    style.setProperty('--cols', refs.nbCols.value);
    style.setProperty('--rows', refs.nbRows.value);
    style.setProperty('--lh', refs.rowHeight.value + 'mm');
}

// Listeners sur tous les inputs de config
[refs.marginTop, refs.marginLeft, refs.nbCols, refs.nbRows, refs.rowHeight, refs.codeScale, refs.codeType]
    .forEach(el => el.addEventListener('input', () => {
        updateGridCSS();
        renderBarcodes();
    }));

// --- RENDU DES CODES ---
function renderBarcodes() {
    refs.gridContainer.innerHTML = '';
    const scale = parseFloat(refs.codeScale.value);
    
    if (appData.length === 0) {
        // Afficher un exemple fictif si vide
        createCell("EXEMPLE", scale, true);
        return;
    }

    appData.forEach(code => {
        createCell(code, scale);
    });
}

function createCell(text, scale, isDemo = false) {
    const cell = document.createElement('div');
    cell.className = 'barcode-cell';
    if(isDemo) cell.style.opacity = "0.3";

    try {
        const type = refs.codeType.value;
        let element;

        if (type === 'QRCODE') {
            element = document.createElement('canvas');
            // Nécessite la librairie 'qrcode.min.js'
            QRCode.toCanvas(element, String(text), { // Conversion en String pour éviter des erreurs
                margin: 0, 
                width: 100 * scale 
            });
        } else {
            element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            // Correction EAN13 check digit
            let codeText = String(text); // Conversion en String
            if(type === 'EAN13') {
                codeText = codeText.replace(/\D/g, "");
                if(codeText.length === 12) codeText += calculCheckDigit(codeText);
            }
            
            // Nécessite la librairie 'JsBarcode.all.min.js'
            JsBarcode(element, codeText, {
                format: type,
                lineColor: "#000",
                width: 2 * scale,
                height: 50 * scale,
                displayValue: true,
                margin: 5
            });
        }
        cell.appendChild(element);
    } catch(e) {
        cell.textContent = "Erreur";
        cell.style.color = "red";
        console.error("Erreur de génération de code:", e);
    }
    
    refs.gridContainer.appendChild(cell);
}

// Calcul de la clé de contrôle EAN-13 (Check Digit)
function calculCheckDigit(ean12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (i % 2 === 0 ? 1 : 3) * parseInt(ean12[i]);
  const rem = sum % 10;
  return rem === 0 ? 0 : 10 - rem;
}

// --- IMPORT EXCEL ---
function handleFile(e) {
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = e.target.result;
        // Nécessite la librairie 'xlsx.full.min.js'
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Filtre colonne A (indice 0)
        appData = json.map(r => r[0]).filter(c => c !== undefined && c !== "");
        
        // UI Update
        refs.importStatus.style.display = 'block';
        refs.importCount.textContent = `${appData.length} codes chargés`;
        refs.clearBtn.style.display = 'inline-flex';
        
        renderBarcodes();
    };
    reader.readAsBinaryString(file);
}

refs.excelInput.addEventListener('change', handleFile);
   
// Clear Data
refs.clearBtn.addEventListener('click', () => {
    appData = [];
    refs.importStatus.style.display = 'none';
    refs.clearBtn.style.display = 'none';
    refs.excelInput.value = ""; // Réinitialise l'input file
    renderBarcodes();
});

// Download PNG
refs.downloadBtn.addEventListener('click', () => {
    const originalTransform = refs.sheetLayer.style.transform;
    refs.sheetLayer.style.transform = "none"; // Reset zoom pour capture
    
    // Nécessite la librairie 'html2canvas.min.js'
    html2canvas(refs.pageSheet, { scale: 2 }).then(canvas => {
        const a = document.createElement('a');
        a.download = 'planche_etiquettes.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
        refs.sheetLayer.style.transform = originalTransform; // Restore zoom
    });
});

// Initialisation
updateGridCSS();
renderBarcodes(); // Affiche l'exemple au démarrage
