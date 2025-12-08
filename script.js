const refs = {
      texte: document.getElementById("texte"),
      type: document.getElementById("type"),
      showText: document.getElementById("showText"),
      
      slider: document.getElementById("sizeSlider"),
      sliderVal: document.getElementById("codeSizeVal"),
      
      target: document.getElementById("canvas-target"),
      pageSheet: document.getElementById("pageSheet"),
      sheetLayer: document.getElementById("sheetLayer"),
      printStyle: document.getElementById("print-style"),
      printBtn: document.getElementById("printBtn"),
      downloadBtn: document.getElementById("downloadBtn"),
      formatInputs: document.querySelectorAll('input[name="format"]'),
      orientationInputs: document.querySelectorAll('input[name="orientation"]'),
      
      titleInput: document.getElementById("customTitle"),
      titleSizeSlider: document.getElementById("titleSizeSlider"),
      titleSizeVal: document.getElementById("titleSizeVal"),
      titleDisplay: document.getElementById("title-display"),
      
      // Nouveau Zoom
      previewZoomSlider: document.getElementById("previewZoomSlider"),
      previewZoomVal: document.getElementById("previewZoomVal"),
      
      tabs: document.querySelectorAll('.tab-btn'),
      tabContents: document.querySelectorAll('.tab-content'),

      excelInput: document.getElementById("excelInput"),
      dropZone: document.getElementById("dropZone"),
      importStatus: document.getElementById("importStatus"),
      importCount: document.getElementById("importCount"),
      clearDataBtn: document.getElementById("clearDataBtn"),
      regenerateBatchBtn: document.getElementById("regenerateBatchBtn"),
      btnTabGen: document.getElementById("btn-tab-gen")
    };

    // --- VARIABLES D'ÉTAT ---
    let appState = {
        mode: 'single', // 'single' ou 'batch'
        batchData: []   // Stocke les codes importés
    };

    // --- GESTION DU ZOOM APERÇU ---
    refs.previewZoomSlider.addEventListener("input", (e) => {
      const val = e.target.value;
      refs.sheetLayer.style.transform = `scale(${val})`;
      refs.previewZoomVal.textContent = Math.round(val * 100) + "%";
    });

    // --- GESTION DES ONGLETS ---
    function switchTab(targetId) {
      refs.tabs.forEach(t => {
        if(t.getAttribute('data-target') === targetId) t.classList.add('active');
        else t.classList.remove('active');
      });
      refs.tabContents.forEach(c => {
        if(c.id === targetId) c.classList.add('active');
        else c.classList.remove('active');
      });
    }
    refs.tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.getAttribute('data-target'))));

    // --- FONCTIONS GENERATEUR ---
    function updateTitle() {
      refs.titleDisplay.textContent = refs.titleInput.value;
      refs.titleDisplay.style.fontSize = refs.titleSizeSlider.value + 'em';
      refs.titleSizeVal.textContent = refs.titleSizeSlider.value;
    }

    function updatePageConfig() {
      const format = document.querySelector('input[name="format"]:checked').value;
      const orientation = document.querySelector('input[name="orientation"]:checked').value;
      refs.pageSheet.className = `sheet ${format} ${orientation}`;
      // On ajoute margin:0 dans la regle @page pour l'impression
      refs.printStyle.innerHTML = `@page { size: ${format.toUpperCase()} ${orientation}; margin: 0; }`;
    }

    function generer() {
        const scale = parseFloat(refs.slider.value);
        refs.sliderVal.textContent = scale;
        refs.target.innerHTML = "";

        if (appState.mode === 'batch' && appState.batchData.length > 0) {
            refs.target.classList.add('grid-mode');
            appState.batchData.forEach(code => {
                const itemDiv = document.createElement("div");
                itemDiv.className = "barcode-item";
                const container = createBarcodeElement(code, scale);
                if (container) itemDiv.appendChild(container);
                refs.target.appendChild(itemDiv);
            });
        } else {
            refs.target.classList.remove('grid-mode');
            const texte = refs.texte.value.trim();
            if (!texte && refs.type.value !== "QRCODE") return;
            const element = createBarcodeElement(texte, scale);
            if (element) refs.target.appendChild(element);
        }
    }

    function createBarcodeElement(text, scale) {
        const type = refs.type.value;
        const displayValue = refs.showText.checked;
        try {
            if (type === "CODE128") {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                JsBarcode(svg, text, {
                    format: "CODE128", lineColor: "#000", background: "#ffffff",
                    displayValue: displayValue, fontSize: 20 * scale, height: 100 * scale,
                    width: 2 * scale, margin: 10 * scale
                });
                return svg;
            } else if (type === "EAN13") {
                let num = text.replace(/\D/g, "");
                if (num.length === 12) num += calculCheckDigit(num);
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                JsBarcode(svg, num, {
                    format: "EAN13", lineColor: "#000", background: "#ffffff",
                    displayValue: displayValue, fontSize: 24 * scale, height: 100 * scale,
                    width: 2 * scale, margin: 10 * scale
                });
                return svg;
            } else if (type === "QRCODE") {
                const canvas = document.createElement("canvas");
                const qrWidth = Math.floor(300 * scale);
                QRCode.toCanvas(canvas, text || "https://exemple.com", {
                    width: qrWidth, margin: 1, color: { dark: "#000000", light: "#ffffff" }
                }, function (error) { if (error) console.error(error); });
                return canvas;
            }
        } catch (e) {
            const errDiv = document.createElement("div");
            errDiv.style.color = "red"; errDiv.style.fontSize = "10px"; errDiv.innerText = "Err.";
            return errDiv;
        }
        return null;
    }

    function calculCheckDigit(ean12) {
      let sum = 0;
      for (let i = 0; i < 12; i++) sum += (i % 2 === 0 ? 1 : 3) * parseInt(ean12[i]);
      const rem = sum % 10;
      return rem === 0 ? 0 : 10 - rem;
    }

    // --- IMPORT EXCEL ---
    function handleFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        let codes = json.map(row => row[0]).filter(cell => cell !== undefined && cell !== null && cell !== "");
        
        appState.batchData = codes;
        appState.mode = 'batch'; 
        updateImportStatus(codes.length);
        switchTab('tab-generator');
        generer();
      };
      reader.readAsBinaryString(file);
    }

    function updateImportStatus(count) {
        if(count > 0) {
            refs.importStatus.style.display = 'block';
            refs.importCount.textContent = `${count} codes importés avec succès.`;
            refs.regenerateBatchBtn.style.display = 'flex';
            refs.clearDataBtn.style.display = 'flex';
        } else {
            resetImportUI();
        }
    }

    function resetImportUI() {
        refs.importStatus.style.display = 'none';
        refs.regenerateBatchBtn.style.display = 'none';
        refs.clearDataBtn.style.display = 'none';
        refs.excelInput.value = "";
    }

    // --- LISTENERS ---
    refs.texte.addEventListener("input", () => { appState.mode = 'single'; generer(); });
    refs.type.addEventListener("change", generer);
    refs.showText.addEventListener("change", generer);
    refs.slider.addEventListener("input", generer);
    refs.titleInput.addEventListener("input", updateTitle);
    refs.titleSizeSlider.addEventListener("input", updateTitle);
    refs.formatInputs.forEach(input => input.addEventListener("change", updatePageConfig));
    refs.orientationInputs.forEach(input => input.addEventListener("change", updatePageConfig));
    refs.printBtn.addEventListener("click", () => window.print());
    
    refs.downloadBtn.addEventListener("click", () => {
        // Pour html2canvas, on enlève temporairement le scale visuel
        const originalTransform = refs.sheetLayer.style.transform;
        refs.sheetLayer.style.transform = "none";
        
        // On s'assure de capturer la feuille entière
        html2canvas(document.getElementById("pageSheet"), { 
            scale: 2, 
            backgroundColor: "#ffffff", 
            logging: false 
        })
        .then(canvas => {
            const a = document.createElement("a");
            a.download = `etiquette_${Date.now()}.png`;
            a.href = canvas.toDataURL("image/png");
            a.click();
            // On remet le zoom utilisateur
            refs.sheetLayer.style.transform = originalTransform; 
        });
    });

    refs.excelInput.addEventListener("change", handleFile);
    refs.clearDataBtn.addEventListener("click", () => { appState.batchData = []; appState.mode = 'single'; resetImportUI(); generer(); });
    refs.regenerateBatchBtn.addEventListener("click", () => {
        if(appState.batchData.length > 0) { appState.mode = 'batch'; switchTab('tab-generator'); generer(); }
    });

    // Effet Drag & Drop Visuel
    const dz = refs.dropZone;
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.style.borderColor = 'var(--primary)'; dz.style.background = 'rgba(59, 130, 246, 0.1)'; });
    dz.addEventListener('dragleave', (e) => { e.preventDefault(); dz.style.borderColor = 'var(--border-subtle)'; dz.style.background = 'var(--bg-app)'; });
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.style.borderColor = 'var(--border-subtle)'; dz.style.background = 'var(--bg-app)'; 
        if(e.dataTransfer.files.length) { refs.excelInput.files = e.dataTransfer.files; handleFile({target: refs.excelInput}); } 
    });

    // Initialisation
    window.addEventListener('load', () => { 
        updatePageConfig(); 
        generer(); 
        updateTitle();
        // Set zoom initial
        refs.sheetLayer.style.transform = `scale(0.65)`;
    });


// Initialisation
    window.addEventListener('load', () => { 
        updatePageConfig(); 
        generer(); 
        updateTitle();
        // Set zoom initial
        refs.sheetLayer.style.transform = `scale(0.65)`;
    });

    // ******* AJOUTER CE BLOC *******
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then(registration => {
            console.log('Service Worker enregistré avec succès :', registration.scope);
          })
          .catch(error => {
            console.error('Échec de l\'enregistrement du Service Worker :', error);
          });
      });
    }
