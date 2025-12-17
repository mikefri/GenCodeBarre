document.addEventListener('DOMContentLoaded', () => {

    // --- RÉFÉRENCES ---
    const refs = {
        manualContainer: document.getElementById('manualInputContainer'),
        addCodeBtn: document.getElementById('addCodeInputBtn'),
        pageSheet: document.getElementById('pageSheet'),
        sheetLayer: document.getElementById('sheetLayer'),
        
        // Config Inputs
        codeType: document.getElementById('codeType'),
        marginTop: document.getElementById('marginTop'),
        marginLeft: document.getElementById('marginLeft'),
        nbCols: document.getElementById('nbCols'),
        nbRows: document.getElementById('nbRows'),
        rowHeight: document.getElementById('rowHeight'),
        codeScale: document.getElementById('codeScale'),
        arrowOption: document.getElementById('arrowOption'),
        gridPresetSelect: document.getElementById('gridPresetSelect'),
        
        // Autres
        zoomSlider: document.getElementById('zoomSlider'),
        zoomValue: document.getElementById('zoomValue'),
        downloadBtn: document.getElementById('downloadBtn'),
        excelInput: document.getElementById('excelInput'),
        clearBtn: document.getElementById('clearDataBtn'),
        importStatus: document.getElementById('importStatus'),
        importCount: document.getElementById('importCount')
    };

    let appData = [];

    // --- LOGIQUE DE SAISIE ET MISE À JOUR ---

    function syncManualInputs() {
        const inputs = document.querySelectorAll('.manual-code-input');
        // On récupère les valeurs et on filtre les vides
        appData = Array.from(inputs).map(i => i.value.trim()).filter(v => v !== "");
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
        
        // Mise à jour immédiate pendant la frappe
        input.addEventListener('input', syncManualInputs);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-code-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
            row.remove();
            syncManualInputs();
        };

        row.appendChild(input);
        row.appendChild(removeBtn);
        refs.manualContainer.appendChild(row);
    }

    // --- RENDU DES CODES ---

    function renderBarcodes() {
        // Nettoyage des anciennes pages
        const extraSheets = refs.sheetLayer.querySelectorAll('.sheet:not(#pageSheet)');
        extraSheets.forEach(s => s.remove());

        const scale = parseFloat(refs.codeScale.value) || 1;
        const cols = parseInt(refs.nbCols.value) || 1;
        const rows = parseInt(refs.nbRows.value) || 1;
        const labelsPerPage = cols * rows;

        // Si vide, on met un texte par défaut
        let dataToDraw = appData.length > 0 ? appData : ["APERÇU"];
        const totalPages = Math.ceil(dataToDraw.length / labelsPerPage);

        for (let p = 0; p < totalPages; p++) {
            const pageData = dataToDraw.slice(p * labelsPerPage, (p + 1) * labelsPerPage);
            let currentSheet;

            if (p === 0) {
                currentSheet = refs.pageSheet;
                currentSheet.innerHTML = ''; 
            } else {
                currentSheet = document.createElement('div');
                currentSheet.className = 'sheet';
                refs.sheetLayer.appendChild(currentSheet);
            }
            
            updateSheetCSS(currentSheet);
            const grid = document.createElement('div');
            grid.className = 'grid-container';
            currentSheet.appendChild(grid);

            pageData.forEach(code => {
                const cell = document.createElement('div');
                cell.className = 'barcode-cell';
                
                const arrow = createArrowSVG(refs.arrowOption.value);
                if(arrow) cell.appendChild(arrow);

                const type = refs.codeType.value;
                try {
                    if (type === 'QRCODE') {
                        const canvas = document.createElement('canvas');
                        cell.appendChild(canvas);
                        grid.appendChild(cell);
                        QRCode.toCanvas(canvas, code, { width: 100 * scale, margin: 0 });
                    } else {
                        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                        cell.appendChild(svg);
                        grid.appendChild(cell);
                        JsBarcode(svg, code, {
                            format: type,
                            width: 2 * scale,
                            height: 50 * scale,
                            displayValue: true
                        });
                    }
                } catch(e) {
                    cell.innerHTML = "<small>Err</small>";
                    grid.appendChild(cell);
                }
            });
        }
    }

    // --- FONCTIONS UTILES ---

    function updateSheetCSS(sheet) {
        sheet.style.setProperty('--mt', refs.marginTop.value + 'mm');
        sheet.style.setProperty('--ml', refs.marginLeft.value + 'mm');
        sheet.style.setProperty('--cols', refs.nbCols.value);
        sheet.style.setProperty('--rows', refs.nbRows.value);
        sheet.style.setProperty('--lh', refs.rowHeight.value + 'mm');
    }

    function createArrowSVG(val) {
        if (val === 'none') return null;
        const dir = val.split('-')[1];
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "30"); svg.setAttribute("height", "60");
        svg.setAttribute("viewBox", "0 0 100 200");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none"); path.setAttribute("stroke", "black"); path.setAttribute("stroke-width", "15");
        path.setAttribute("d", dir === 'up' ? "M50,150 L50,50 M20,80 L50,50 L80,80" : "M50,50 L50,150 M20,120 L50,150 L80,120");
        svg.appendChild(path);
        return svg;
    }

    // --- GESTION EXCEL & CLEAR ---

    if(refs.excelInput) {
        refs.excelInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
                appData = json.map(r => r[0]).filter(c => c != null && c !== "");
                
                refs.manualContainer.innerHTML = '';
                appData.forEach(val => createInputRow(val));
                renderBarcodes();
            };
            reader.readAsBinaryString(file);
        });
    }

    if(refs.clearBtn) {
        refs.clearBtn.onclick = () => {
            appData = [];
            refs.manualContainer.innerHTML = '';
            createInputRow();
            renderBarcodes();
        };
    }

    // --- ÉCOUTEURS D'ÉVÉNEMENTS ---

    refs.addCodeBtn.onclick = () => createInputRow();

    [refs.marginTop, refs.marginLeft, refs.nbCols, refs.nbRows, refs.rowHeight, refs.codeScale, refs.codeType, refs.arrowOption]
    .forEach(el => {
        if(el) el.oninput = () => renderBarcodes();
    });

    refs.zoomSlider.oninput = (e) => {
        const val = e.target.value;
        refs.sheetLayer.style.transform = `scale(${val})`;
        refs.zoomValue.textContent = Math.round(val * 100) + "%";
    };

    // --- INITIALISATION ---
    createInputRow(); 
    renderBarcodes();
});
