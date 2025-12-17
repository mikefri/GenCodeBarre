document.addEventListener('DOMContentLoaded', () => {

    // --- MISE À JOUR DE L'OBJET REFS ---
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
        zoomValue: document.getElementById('zoomValue'),

        // NOUVEAU: Références pour la saisie manuelle
        manualContainer: document.getElementById('manualInputContainer'),
        addCodeBtn: document.getElementById('addCodeInputBtn'),

        // Inputs Config
        codeType: document.getElementById('codeType'),
        marginTop: document.getElementById('marginTop'),
        marginLeft: document.getElementById('marginLeft'),
        nbCols: document.getElementById('nbCols'),
        nbRows: document.getElementById('nbRows'),
        rowHeight: document.getElementById('rowHeight'),
        codeScale: document.getElementById('codeScale'),

        // RÉFÉRENCES
        gridPresetSelect: document.getElementById('gridPresetSelect'),
        arrowOption: document.getElementById('arrowOption'),

        // RÉFÉRENCES MODALE
        helpModal: document.getElementById('helpModal'),
        helpButton: document.getElementById('helpButton'), 
        closeModalBtn: document.getElementById('closeModalBtn')
    };

    let appData = []; // Stockage des codes

    // --- DÉFINITION DES PRESETS DE GRILLE (INCHANGÉ) ---
    const gridPresets = [
        {
            name: "Planche de 24 70x36",
            marginTop: 3.5,
            marginLeft: 0,
            nbCols: 3,
            nbRows: 8,
            rowHeight: 36,
        },
        {
            name: "Planche de 4 210x74",
            marginTop: 0,
            marginLeft: 0,
            nbCols: 1,
            nbRows: 4,
            rowHeight: 74,
        },
        {
            name: "Petites Étiquettes (4x10)",
            marginTop: 5,
            marginLeft: 5,
            nbCols: 4,
            nbRows: 10,
            rowHeight: 25,
        },
        {
            name: "Très Grandes (2x2)",
            marginTop: 15,
            marginLeft: 15,
            nbCols: 2,
            nbRows: 2,
            rowHeight: 120,
        }
    ];

    // --- LOGIQUE DE SAISIE MANUELLE ---

    // Synchronise le contenu des inputs vers appData et relance le rendu
    function syncManualInputs() {
        const inputs = document.querySelectorAll('.manual-code-input');
        appData = Array.from(inputs)
            .map(input => input.value.trim())
            .filter(val => val !== ""); // On ignore les champs vides
        
        renderBarcodes();
    }

    // Crée une ligne d'input avec son bouton supprimer
    function createInputRow(value = "") {
        const row = document.createElement('div');
        row.className = 'input-row';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'manual-code-input';
        input.value = value;
        input.placeholder = "Entrez un code...";
        input.addEventListener('input', syncManualInputs);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-code-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.title = "Supprimer";
        removeBtn.onclick = () => {
            row.remove();
            syncManualInputs();
        };

        row.appendChild(input);
        row.appendChild(removeBtn);
        refs.manualContainer.appendChild(row);
    }

    // Écouteur pour le bouton "+"
    if (refs.addCodeBtn) {
        refs.addCodeBtn.addEventListener('click', () => createInputRow());
    }

    // --- GESTION DU ZOOM ---
    refs.zoomSlider.addEventListener('input', (e) => {
        const scale = parseFloat(e.target.value);
        refs.sheetLayer.style.transform = `scale(${scale})`;
        const percentage = Math.round(scale * 100);
        refs.zoomValue.textContent = `${percentage}%`;
    });

    // --- MISE A JOUR CSS GRILLE ---
    function updateSheetCSS(sheetElement) {
        const style = sheetElement.style;
        style.setProperty('--mt', refs.marginTop.value + 'mm');
        style.setProperty('--ml', refs.marginLeft.value + 'mm');
        style.setProperty('--cols', refs.nbCols.value);
        style.setProperty('--rows', refs.nbRows.value);
        style.setProperty('--lh', refs.rowHeight.value + 'mm');
    }

    function updateGridCSS() {
        updateSheetCSS(refs.pageSheet);
    }

    // Listeners sur tous les inputs de config
    [refs.marginTop, refs.marginLeft, refs.nbCols, refs.nbRows, refs.rowHeight, refs.codeScale, refs.codeType, refs.arrowOption]
        .forEach(el => el.addEventListener('input', () => {
            if (el !== refs.arrowOption && el !== refs.codeType) {
                refs.gridPresetSelect.value = "";
            }
            updateGridCSS();
            renderBarcodes();
        }));

    // --- GESTION DES PRESETS SELECTIONNÉS ---
    function populatePresets() {
        gridPresets.forEach((preset, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = preset.name;
            refs.gridPresetSelect.appendChild(option);
        });
    }

    refs.gridPresetSelect.addEventListener('change', (e) => {
        const selectedIndex = e.target.value;
        if (selectedIndex === "" || selectedIndex === null) return;

        const preset = gridPresets[selectedIndex];
        refs.marginTop.value = preset.marginTop;
        refs.marginLeft.value = preset.marginLeft;
        refs.nbCols.value = preset.nbCols;
        refs.nbRows.value = preset.nbRows;
        refs.rowHeight.value = preset.rowHeight;

        updateGridCSS();
        renderBarcodes();
    });

    // --- CRÉATION DU SVG DE FLÈCHE ---
    function createArrowSVG(fullOption) {
        if (fullOption === 'none' || !fullOption.startsWith('line-')) return null;

        const [style, dir] = fullOption.split('-');
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "10mm");
        svg.setAttribute("height", "20mm");
        svg.setAttribute("viewBox", "0 0 100 200");
        svg.style.marginRight = "5px";
        svg.style.flexShrink = "0";

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#000");
        path.setAttribute("stroke-width", "20");
        path.setAttribute("stroke-linecap", "round");

        let dAttribute = (dir === 'up') 
            ? "M 50,180 L 50,20 M 25,50 L 50,20 L 75,50" 
            : "M 50,20 L 50,180 M 25,150 L 50,180 L 75,150";

        path.setAttribute("d", dAttribute);
        svg.appendChild(path);
        return svg;
    }

    // --- RENDU DES CODES ---
    function renderBarcodes() {
        const sheetsToRemove = refs.sheetLayer.querySelectorAll('.sheet:not(#pageSheet)');
        sheetsToRemove.forEach(sheet => sheet.remove());

        const scale = parseFloat(refs.codeScale.value);
        const cols = parseInt(refs.nbCols.value);
        const rows = parseInt(refs.nbRows.value);
        const labelsPerPage = cols * rows;

        let dataToUse = appData.length === 0
            ? ["EXEMPLE-1", "EXEMPLE-2", "EXEMPLE-3"]
            : appData;

        const isDemo = appData.length === 0;
        const totalPages = Math.ceil(dataToUse.length / labelsPerPage);
        const fragment = document.createDocumentFragment();

        for (let p = 0; p < totalPages; p++) {
            const pageData = dataToUse.slice(p * labelsPerPage, (p + 1) * labelsPerPage);
            let currentSheet, pageGridContainer;

            if (p === 0) {
                currentSheet = refs.pageSheet;
                currentSheet.innerHTML = '';
            } else {
                currentSheet = document.createElement('div');
                currentSheet.className = 'sheet';
                updateSheetCSS(currentSheet);
            }

            pageGridContainer = document.createElement('div');
            pageGridContainer.className = 'grid-container';
            currentSheet.appendChild(pageGridContainer);
            if (p === 0) refs.gridContainer = pageGridContainer;

            pageData.forEach(code => createCell(code, scale, pageGridContainer, isDemo));
            if (p > 0) fragment.appendChild(currentSheet);
        }

        refs.sheetLayer.appendChild(fragment);

        if (appData.length > 0) {
            refs.importCount.textContent = `${appData.length} codes chargés.`;
        }
    }

    function createCell(text, scale, containerElement, isDemo = false) {
        const cell = document.createElement('div');
        cell.className = 'barcode-cell';
        if (isDemo) cell.style.opacity = "0.3";

        const arrowSVG = createArrowSVG(refs.arrowOption.value);
        if (arrowSVG) cell.appendChild(arrowSVG);

        try {
            const type = refs.codeType.value;
            let element;

            if (type === 'QRCODE') {
                element = document.createElement('canvas');
                QRCode.toCanvas(element, String(text), { margin: 0, width: 100 * scale });
            } else {
                element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                let codeText = String(text);
                if (type === 'EAN13') {
                    codeText = codeText.replace(/\D/g, "");
                    if (codeText.length === 12) codeText += calculCheckDigit(codeText);
                }
                JsBarcode(element, codeText, {
                    format: type, width: 2 * scale, height: 50 * scale, displayValue: true, margin: 5
                });
            }
            cell.appendChild(element);
        } catch (e) {
            cell.innerHTML = `<span style="color:red;font-size:0.7rem;">Erreur</span>`;
        }
        containerElement.appendChild(cell);
    }

    function calculCheckDigit(ean12) {
        let sum = 0;
        for (let i = 0; i < 12; i++) sum += (i % 2 === 0 ? 1 : 3) * parseInt(ean12[i]);
        const rem = sum % 10;
        return rem === 0 ? 0 : 10 - rem;
    }

    // --- IMPORT EXCEL ---
    refs.excelInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            appData = json.map(r => r[0]).filter(c => c !== undefined && c !== "");
            
            // On synchronise les inputs manuels avec l'import
            refs.manualContainer.innerHTML = '';
            appData.forEach(val => createInputRow(val));

            refs.importStatus.style.display = 'block';
            refs.clearBtn.style.display = 'inline-flex';
            renderBarcodes();
        };
        reader.readAsBinaryString(file);
    });

    // Clear
    refs.clearBtn.addEventListener('click', () => {
        appData = [];
        refs.manualContainer.innerHTML = '';
        createInputRow(); // On laisse une ligne vide
        refs.importStatus.style.display = 'none';
        refs.clearBtn.style.display = 'none';
        refs.excelInput.value = "";
        renderBarcodes();
    });

    // --- DOWNLOAD PDF ---
    refs.downloadBtn.addEventListener('click', async () => {
        refs.downloadBtn.textContent = 'Génération...';
        refs.downloadBtn.disabled = true;
        const originalTransform = refs.sheetLayer.style.transform;
        refs.sheetLayer.style.transform = "scale(1)";

        const sheets = refs.sheetLayer.querySelectorAll('.sheet');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        for (let i = 0; i < sheets.length; i++) {
            if (i > 0) pdf.addPage();
            const canvas = await html2canvas(sheets[i], { scale: 2, useCORS: true });
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
        }

        pdf.save('planche_codes.pdf');
        refs.sheetLayer.style.transform = originalTransform;
        refs.downloadBtn.textContent = 'Télécharger le PDF';
        refs.downloadBtn.disabled = false;
    });

    // --- MODALE D'AIDE ---
    const openModal = () => refs.helpModal?.classList.add('open');
    const closeModal = () => refs.helpModal?.classList.remove('open');
    refs.helpButton?.addEventListener('click', openModal);
    refs.closeModalBtn?.addEventListener('click', closeModal);

    // --- INIT ---
    populatePresets();
    updateGridCSS();
    // On crée deux lignes d'input par défaut
    createInputRow();
    createInputRow();
    renderBarcodes();
});
