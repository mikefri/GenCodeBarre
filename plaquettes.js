document.addEventListener('DOMContentLoaded', () => {

    // --- RÉFÉRENCES ---
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
        manualContainer: document.getElementById('manualInputContainer'),
        addCodeBtn: document.getElementById('addCodeInputBtn'),
        codeType: document.getElementById('codeType'),
        marginTop: document.getElementById('marginTop'),
        marginLeft: document.getElementById('marginLeft'),
        nbCols: document.getElementById('nbCols'),
        nbRows: document.getElementById('nbRows'),
        rowHeight: document.getElementById('rowHeight'),
        codeScale: document.getElementById('codeScale'),
        gridPresetSelect: document.getElementById('gridPresetSelect'),
        arrowOption: document.getElementById('arrowOption'),
        helpModal: document.getElementById('helpModal'),
        helpButton: document.getElementById('helpButton'), 
        closeModalBtn: document.getElementById('closeModalBtn')
    };

    // --- STOCKAGE ---
    let manualData = []; 
    let excelData = [];  

    // --- TES PRESETS RÉINSTALLÉS ---
    const gridPresets = [
        { name: "Planche de 24 70x36", marginTop: 3.5, marginLeft: 0, nbCols: 3, nbRows: 8, rowHeight: 36 },
        { name: "Planche de 4 210x74", marginTop: 0, marginLeft: 0, nbCols: 1, nbRows: 4, rowHeight: 74 }
    ];

    // --- LOGIQUE MANUELLE ---
    function syncManualInputs() {
        const inputs = document.querySelectorAll('.manual-code-input');
        manualData = Array.from(inputs).map(input => input.value.trim());
        renderBarcodes();
    }

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
        removeBtn.onclick = () => { row.remove(); syncManualInputs(); };

        row.appendChild(input);
        row.appendChild(removeBtn);
        refs.manualContainer.appendChild(row);
    }

    if (refs.addCodeBtn) refs.addCodeBtn.onclick = () => createInputRow();

    // --- GESTION DES PRESETS ---
    function populatePresets() {
        if (!refs.gridPresetSelect) return;
        gridPresets.forEach((preset, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = preset.name;
            refs.gridPresetSelect.appendChild(option);
        });
    }

    if (refs.gridPresetSelect) {
        refs.gridPresetSelect.addEventListener('change', (e) => {
            const selectedIndex = e.target.value;
            if (selectedIndex === "") return;
            const preset = gridPresets[selectedIndex];
            refs.marginTop.value = preset.marginTop;
            refs.marginLeft.value = preset.marginLeft;
            refs.nbCols.value = preset.nbCols;
            refs.nbRows.value = preset.nbRows;
            refs.rowHeight.value = preset.rowHeight;
            updateSheetCSS(refs.pageSheet);
            renderBarcodes();
        });
    }

    // --- RENDU ---
    function renderBarcodes() {
        const sheetsToRemove = refs.sheetLayer.querySelectorAll('.sheet:not(#pageSheet)');
        sheetsToRemove.forEach(sheet => sheet.remove());

        const scale = parseFloat(refs.codeScale.value);
        const cols = parseInt(refs.nbCols.value);
        const rows = parseInt(refs.nbRows.value);
        const labelsPerPage = cols * rows;

        const filteredManual = manualData.filter(v => v !== "");
        let dataToUse = [...excelData, ...filteredManual];
        
        if (dataToUse.length === 0) dataToUse = ["APERÇU"];

        const isDemo = dataToUse[0] === "APERÇU";
        const totalPages = Math.ceil(dataToUse.length / labelsPerPage);
        const fragment = document.createDocumentFragment();

        for (let p = 0; p < totalPages; p++) {
            const pageData = dataToUse.slice(p * labelsPerPage, (p + 1) * labelsPerPage);
            let currentSheet;

            if (p === 0) {
                currentSheet = refs.pageSheet;
                currentSheet.innerHTML = '';
            } else {
                currentSheet = document.createElement('div');
                currentSheet.className = 'sheet';
                updateSheetCSS(currentSheet);
            }

            const pageGridContainer = document.createElement('div');
            pageGridContainer.className = 'grid-container';
            currentSheet.appendChild(pageGridContainer);

            pageData.forEach(code => createCell(code, scale, pageGridContainer, isDemo));
            if (p > 0) fragment.appendChild(currentSheet);
        }
        refs.sheetLayer.appendChild(fragment);
    }

    function createCell(text, scale, containerElement, isDemo = false) {
        const cell = document.createElement('div');
        cell.className = 'barcode-cell';
        if (isDemo) cell.style.opacity = "0.3";

        const arrowSVG = createArrowSVG(refs.arrowOption.value);
        if (arrowSVG) cell.appendChild(arrowSVG);

        try {
            const type = refs.codeType.value;
            if (type === 'QRCODE') {
                const canvas = document.createElement('canvas');
                cell.appendChild(canvas);
                containerElement.appendChild(cell);
                QRCode.toCanvas(canvas, String(text), { margin: 0, width: 100 * scale });
            } else {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                cell.appendChild(svg);
                JsBarcode(svg, String(text), { format: type, width: 2 * scale, height: 50 * scale, displayValue: true, margin: 5 });
                containerElement.appendChild(cell);
            }
        } catch (e) {
            cell.innerHTML = `<span style="color:red;font-size:0.7rem;">Erreur</span>`;
            containerElement.appendChild(cell);
        }
    }

    // --- IMPORT EXCEL ---
    refs.excelInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            excelData = json.map(r => r[0]).filter(c => c !== undefined && c !== "");
            if (refs.importStatus) refs.importStatus.style.display = 'block';
            if (refs.importCount) refs.importCount.textContent = `${excelData.length} codes Excel`;
            renderBarcodes();
        };
        reader.readAsBinaryString(file);
    });

    // --- FONCTIONS UTILES ---
    function updateSheetCSS(sheetElement) {
        sheetElement.style.setProperty('--mt', refs.marginTop.value + 'mm');
        sheetElement.style.setProperty('--ml', refs.marginLeft.value + 'mm');
        sheetElement.style.setProperty('--cols', refs.nbCols.value);
        sheetElement.style.setProperty('--rows', refs.nbRows.value);
        sheetElement.style.setProperty('--lh', refs.rowHeight.value + 'mm');
    }

    function createArrowSVG(fullOption) {
        if (fullOption === 'none' || !fullOption.startsWith('line-')) return null;
        const [style, dir] = fullOption.split('-');
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "10mm"); svg.setAttribute("height", "20mm");
        svg.setAttribute("viewBox", "0 0 100 200");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none"); path.setAttribute("stroke", "#000"); path.setAttribute("stroke-width", "20");
        let d = (dir === 'up') ? "M 50,180 L 50,20 M 25,50 L 50,20 L 75,50" : "M 50,20 L 50,180 M 25,150 L 50,180 L 75,150";
        path.setAttribute("d", d);
        svg.appendChild(path);
        return svg;
    }

    refs.clearBtn.onclick = () => {
        excelData = [];
        manualData = [];
        refs.manualContainer.innerHTML = '';
        createInputRow();
        renderBarcodes();
    };

    // Écouteurs configs
    [refs.marginTop, refs.marginLeft, refs.nbCols, refs.nbRows, refs.rowHeight, refs.codeScale, refs.codeType, refs.arrowOption]
        .forEach(el => el.addEventListener('input', () => { 
            updateSheetCSS(refs.pageSheet); 
            renderBarcodes(); 
        }));

    // Zoom
    refs.zoomSlider.oninput = (e) => {
        const scale = parseFloat(e.target.value);
        refs.sheetLayer.style.transform = `scale(${scale})`;
        refs.zoomValue.textContent = `${Math.round(scale * 100)}%`;
    };

    // --- INIT ---
    populatePresets();
    updateSheetCSS(refs.pageSheet);
    createInputRow();
    renderBarcodes();
});
