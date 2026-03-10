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
        fontSize: document.getElementById('fontSize'),
        fontSizePreview: document.getElementById('fontSizePreview'),
        helpModal: document.getElementById('helpModal'),
        helpButton: document.getElementById('helpButton'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        // Nouveaux éléments
        customLabel: document.getElementById('customLabel'),
        customLabelPosition: document.getElementById('customLabelPosition'),
        pageCounter: document.getElementById('pageCounter'),
        invalidBadge: document.getElementById('invalidBadge'),
        pdfProgress: document.getElementById('pdfProgress'),
        pdfProgressBar: document.getElementById('pdfProgressBar'),
        pdfProgressText: document.getElementById('pdfProgressText'),
    };

    // --- STOCKAGE ---
    let manualData = [];
    let excelData = [];
    let debounceTimer = null;

    // --- PRESETS ---
    const gridPresets = [
        { name: "Planche de 24 70x36", marginTop: 3.5, marginLeft: 0, nbCols: 3, nbRows: 8, rowHeight: 36 },
        { name: "Planche de 4 210x74", marginTop: 0, marginLeft: 0, nbCols: 1, nbRows: 4, rowHeight: 74 }
    ];

    // ─────────────────────────────────────────────
    // VALIDATION DES CODES
    // ─────────────────────────────────────────────
    function isCodeValid(text, type) {
        if (!text || text.trim() === '') return false;
        if (type === 'EAN13') {
            return /^\d{13}$/.test(String(text).trim());
        }
        if (type === 'QRCODE') return true;
        // CODE128 : tout caractère ASCII 32-126
        return /^[\x20-\x7E]+$/.test(String(text).trim());
    }

    // ─────────────────────────────────────────────
    // DEBOUNCE HELPER
    // ─────────────────────────────────────────────
    function debounce(fn, delay = 300) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fn, delay);
    }

    // ─────────────────────────────────────────────
    // LOGIQUE MANUELLE
    // ─────────────────────────────────────────────
    function syncManualInputs() {
        const inputs = document.querySelectorAll('.manual-code-input');
        manualData = Array.from(inputs).map(input => input.value.trim());
        debounce(() => renderBarcodes());
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

        // Drag & drop pour réordonner
        row.setAttribute('draggable', 'true');
        row.addEventListener('dragstart', onDragStart);
        row.addEventListener('dragover', onDragOver);
        row.addEventListener('drop', onDrop);
        row.addEventListener('dragend', onDragEnd);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-code-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.title = "Supprimer ce code";
        removeBtn.onclick = () => { row.remove(); syncManualInputs(); };

        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
        dragHandle.title = "Glisser pour réordonner";

        row.appendChild(dragHandle);
        row.appendChild(input);
        row.appendChild(removeBtn);
        refs.manualContainer.appendChild(row);
    }

    // ─────────────────────────────────────────────
    // DRAG & DROP RÉORDONNANCEMENT
    // ─────────────────────────────────────────────
    let dragSrcEl = null;

    function onDragStart(e) {
        dragSrcEl = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.input-row').forEach(r => r.classList.remove('drag-over'));
        this.classList.add('drag-over');
        return false;
    }

    function onDrop(e) {
        e.stopPropagation();
        if (dragSrcEl !== this) {
            const parent = refs.manualContainer;
            const allRows = [...parent.querySelectorAll('.input-row')];
            const srcIdx = allRows.indexOf(dragSrcEl);
            const dstIdx = allRows.indexOf(this);
            if (srcIdx < dstIdx) {
                parent.insertBefore(dragSrcEl, this.nextSibling);
            } else {
                parent.insertBefore(dragSrcEl, this);
            }
            syncManualInputs();
        }
        return false;
    }

    function onDragEnd() {
        document.querySelectorAll('.input-row').forEach(r => {
            r.classList.remove('dragging', 'drag-over');
        });
    }

    if (refs.addCodeBtn) refs.addCodeBtn.onclick = () => createInputRow();

    // ─────────────────────────────────────────────
    // PRESETS
    // ─────────────────────────────────────────────
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

    // ─────────────────────────────────────────────
    // APERÇU TAILLE TEXTE
    // ─────────────────────────────────────────────
    function updateFontSizePreview() {
        if (!refs.fontSizePreview || !refs.fontSize) return;
        const size = parseInt(refs.fontSize.value) || 13;
        refs.fontSizePreview.style.fontSize = size + 'px';
    }

    if (refs.fontSize) {
        refs.fontSize.addEventListener('input', () => {
            updateFontSizePreview();
            debounce(() => renderBarcodes());
        });
    }

    // ─────────────────────────────────────────────
    // COMPTEUR DE PLANCHES
    // ─────────────────────────────────────────────
    function updatePageCounter(totalPages, totalCodes, invalidCount) {
        if (!refs.pageCounter) return;
        refs.pageCounter.textContent = `${totalPages} planche${totalPages > 1 ? 's' : ''} · ${totalCodes} code${totalCodes > 1 ? 's' : ''}`;

        if (!refs.invalidBadge) return;
        if (invalidCount > 0) {
            refs.invalidBadge.textContent = `⚠️ ${invalidCount} code${invalidCount > 1 ? 's' : ''} invalide${invalidCount > 1 ? 's' : ''}`;
            refs.invalidBadge.style.display = 'inline-flex';
        } else {
            refs.invalidBadge.style.display = 'none';
        }
    }

    // ─────────────────────────────────────────────
    // RENDU PRINCIPAL
    // ─────────────────────────────────────────────
    function renderBarcodes() {
        // Supprimer les planches supplémentaires
        const sheetsToRemove = refs.sheetLayer.querySelectorAll('.sheet:not(#pageSheet)');
        sheetsToRemove.forEach(sheet => sheet.remove());

        const scale = parseFloat(refs.codeScale.value);
        const cols = parseInt(refs.nbCols.value);
        const rows = parseInt(refs.nbRows.value);
        const labelsPerPage = cols * rows;
        const type = refs.codeType.value;

        const filteredManual = manualData.filter(v => v !== "");
        let dataToUse = [...excelData, ...filteredManual];

        if (dataToUse.length === 0) dataToUse = ["APERÇU"];

        const isDemo = dataToUse[0] === "APERÇU";

        // Comptage invalides
        let invalidCount = 0;
        if (!isDemo) {
            dataToUse.forEach(code => {
                if (!isCodeValid(code, type)) invalidCount++;
            });
        }

        const totalPages = Math.ceil(dataToUse.length / labelsPerPage);
        updatePageCounter(isDemo ? 0 : totalPages, isDemo ? 0 : dataToUse.length, invalidCount);

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

            // Numéro de page
            if (!isDemo && totalPages > 1) {
                const pageLabel = document.createElement('div');
                pageLabel.className = 'page-number-label';
                pageLabel.textContent = `Page ${p + 1} / ${totalPages}`;
                currentSheet.appendChild(pageLabel);
            }

            const pageGridContainer = document.createElement('div');
            pageGridContainer.className = 'grid-container';
            currentSheet.appendChild(pageGridContainer);

            pageData.forEach(code => createCell(code, scale, pageGridContainer, isDemo, type));
            if (p > 0) fragment.appendChild(currentSheet);
        }
        refs.sheetLayer.appendChild(fragment);
    }

    function createCell(text, scale, containerElement, isDemo = false, type = null) {
        if (!type) type = refs.codeType.value;
        const cell = document.createElement('div');
        cell.className = 'barcode-cell';
        if (isDemo) cell.style.opacity = "0.3";

        const valid = isCodeValid(text, type);
        if (!valid && !isDemo) {
            cell.classList.add('cell-invalid');
        }

        // Texte personnalisé EN HAUT
        const labelPos = refs.customLabelPosition ? refs.customLabelPosition.value : 'top';
        const customText = refs.customLabel ? refs.customLabel.value.trim() : '';

        if (customText && labelPos === 'top') {
            const labelEl = document.createElement('div');
            labelEl.className = 'custom-label custom-label-top';
            labelEl.textContent = customText;
            cell.appendChild(labelEl);
        }

        const arrowSVG = createArrowSVG(refs.arrowOption.value);
        if (arrowSVG) cell.appendChild(arrowSVG);

        const fs = parseInt(refs.fontSize.value) || 13;

        // Wrapper pour le code (centrage)
        const codeWrapper = document.createElement('div');
        codeWrapper.className = 'code-wrapper';

        try {
            if (type === 'QRCODE') {
                const canvas = document.createElement('canvas');
                codeWrapper.appendChild(canvas);
                cell.appendChild(codeWrapper);
                containerElement.appendChild(cell);
                if (valid) {
                    QRCode.toCanvas(canvas, String(text), { margin: 0, width: 80 * scale });
                } else {
                    canvas.width = 80 * scale;
                    canvas.height = 80 * scale;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#fee2e2';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#ef4444';
                    ctx.font = `${10 * scale}px monospace`;
                    ctx.textAlign = 'center';
                    ctx.fillText('Invalide', canvas.width / 2, canvas.height / 2);
                }
            } else {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                codeWrapper.appendChild(svg);
                cell.appendChild(codeWrapper);

                if (valid) {
                    JsBarcode(svg, String(text), {
                        format: type,
                        width: 2 * scale,
                        height: 50 * scale,
                        displayValue: true,
                        margin: 5,
                        fontSize: fs,
                        textMargin: 2
                    });
                } else {
                    svg.setAttribute('width', `${120 * scale}`);
                    svg.setAttribute('height', `${50 * scale}`);
                    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    rect.setAttribute('width', '100%');
                    rect.setAttribute('height', '100%');
                    rect.setAttribute('fill', '#fee2e2');
                    const errText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    errText.setAttribute('x', '50%');
                    errText.setAttribute('y', '50%');
                    errText.setAttribute('dominant-baseline', 'middle');
                    errText.setAttribute('text-anchor', 'middle');
                    errText.setAttribute('fill', '#ef4444');
                    errText.setAttribute('font-size', `${10 * scale}`);
                    errText.setAttribute('font-family', 'monospace');
                    errText.textContent = `Invalide: ${String(text).substring(0, 12)}`;
                    svg.appendChild(rect);
                    svg.appendChild(errText);
                }
                containerElement.appendChild(cell);
            }
        } catch (e) {
            cell.innerHTML = `<span style="color:red;font-size:0.7rem;padding:4px;">Erreur: ${String(text).substring(0, 15)}</span>`;
            containerElement.appendChild(cell);
            return;
        }

        // Texte personnalisé EN BAS
        if (customText && labelPos === 'bottom') {
            const labelEl = document.createElement('div');
            labelEl.className = 'custom-label custom-label-bottom';
            labelEl.textContent = customText;
            cell.appendChild(labelEl);
        }

        // Copie au clic
        if (!isDemo) {
            cell.style.cursor = 'pointer';
            cell.title = `Cliquer pour copier "${text}"`;
            cell.addEventListener('click', () => copyToClipboard(String(text), cell));
        }
    }

    // ─────────────────────────────────────────────
    // COPIE PRESSE-PAPIER
    // ─────────────────────────────────────────────
    function copyToClipboard(text, cell) {
        navigator.clipboard.writeText(text).then(() => {
            showCopyToast(text);
            cell.classList.add('cell-copied');
            setTimeout(() => cell.classList.remove('cell-copied'), 800);
        }).catch(() => {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showCopyToast(text);
        });
    }

    function showCopyToast(text) {
        let toast = document.getElementById('copyToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'copyToast';
            toast.className = 'copy-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = `✅ Copié : ${text}`;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
    }

    // ─────────────────────────────────────────────
    // IMPORT EXCEL avec indicateur de progression
    // ─────────────────────────────────────────────
    refs.excelInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Afficher le spinner
        if (refs.dropZone) refs.dropZone.classList.add('loading');

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
                excelData = json.map(r => r[0]).filter(c => c !== undefined && c !== "").map(c => String(c).trim());
                if (refs.importStatus) refs.importStatus.style.display = 'block';
                if (refs.importCount) refs.importCount.textContent = `${excelData.length} codes Excel importés`;
                if (refs.clearBtn) refs.clearBtn.style.display = 'block';
            } catch(err) {
                alert("Erreur lors de la lecture du fichier Excel.");
            } finally {
                if (refs.dropZone) refs.dropZone.classList.remove('loading');
                renderBarcodes();
            }
        };
        reader.readAsBinaryString(file);
    });

    // ─────────────────────────────────────────────
    // DROP ZONE
    // ─────────────────────────────────────────────
    if (refs.dropZone) {
        refs.dropZone.addEventListener('click', () => refs.excelInput.click());
        refs.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            refs.dropZone.style.borderColor = 'var(--primary)';
        });
        refs.dropZone.addEventListener('dragleave', () => {
            refs.dropZone.style.borderColor = '';
        });
        refs.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            refs.dropZone.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file) {
                const dt = new DataTransfer();
                dt.items.add(file);
                refs.excelInput.files = dt.files;
                refs.excelInput.dispatchEvent(new Event('change'));
            }
        });
    }

    // ─────────────────────────────────────────────
    // FONCTIONS UTILES
    // ─────────────────────────────────────────────
    function updateSheetCSS(sheetElement) {
        sheetElement.style.setProperty('--mt', refs.marginTop.value + 'mm');
        sheetElement.style.setProperty('--ml', refs.marginLeft.value + 'mm');
        sheetElement.style.setProperty('--cols', refs.nbCols.value);
        sheetElement.style.setProperty('--rows', refs.nbRows.value);
        sheetElement.style.setProperty('--lh', refs.rowHeight.value + 'mm');
    }

    function createArrowSVG(fullOption) {
        if (fullOption === 'none' || !fullOption.startsWith('line-')) return null;
        const [, dir] = fullOption.split('-');
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "10mm");
        svg.setAttribute("height", "20mm");
        svg.setAttribute("viewBox", "0 0 100 200");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#000");
        path.setAttribute("stroke-width", "20");
        let d = (dir === 'up')
            ? "M 50,180 L 50,20 M 25,50 L 50,20 L 75,50"
            : "M 50,20 L 50,180 M 25,150 L 50,180 L 75,150";
        path.setAttribute("d", d);
        svg.appendChild(path);
        return svg;
    }

    // ─────────────────────────────────────────────
    // CLEAR
    // ─────────────────────────────────────────────
    if (refs.clearBtn) {
        refs.clearBtn.onclick = () => {
            excelData = [];
            manualData = [];
            refs.manualContainer.innerHTML = '';
            if (refs.importStatus) refs.importStatus.style.display = 'none';
            if (refs.clearBtn) refs.clearBtn.style.display = 'none';
            createInputRow();
            renderBarcodes();
        };
    }

    // ─────────────────────────────────────────────
    // ÉCOUTEURS CONFIG (avec debounce)
    // ─────────────────────────────────────────────
    [refs.marginTop, refs.marginLeft, refs.nbCols, refs.nbRows, refs.rowHeight,
     refs.codeScale, refs.codeType, refs.arrowOption, refs.customLabel, refs.customLabelPosition]
        .forEach(el => {
            if (el) el.addEventListener('input', () => {
                updateSheetCSS(refs.pageSheet);
                debounce(() => renderBarcodes());
            });
            if (el) el.addEventListener('change', () => {
                updateSheetCSS(refs.pageSheet);
                debounce(() => renderBarcodes());
            });
        });

    // ─────────────────────────────────────────────
    // ZOOM
    // ─────────────────────────────────────────────
    refs.zoomSlider.oninput = (e) => {
        const scale = parseFloat(e.target.value);
        refs.sheetLayer.style.transform = `scale(${scale})`;
        refs.zoomValue.textContent = `${Math.round(scale * 100)}%`;
    };

    // ─────────────────────────────────────────────
    // TÉLÉCHARGEMENT PDF (html2canvas + jsPDF)
    // ─────────────────────────────────────────────
    if (refs.downloadBtn) {
        refs.downloadBtn.addEventListener('click', generatePDF);
    }

    async function generatePDF() {
        const sheets = refs.sheetLayer.querySelectorAll('.sheet');
        if (!sheets.length) return;

        const btn = refs.downloadBtn;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération...';

        // Afficher barre de progression
        if (refs.pdfProgress) refs.pdfProgress.style.display = 'flex';

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
            const total = sheets.length;

            for (let i = 0; i < total; i++) {
                const sheet = sheets[i];

                // Mise à jour progression
                const pct = Math.round(((i) / total) * 100);
                if (refs.pdfProgressBar) refs.pdfProgressBar.style.width = pct + '%';
                if (refs.pdfProgressText) refs.pdfProgressText.textContent = `Page ${i + 1} / ${total}`;

                // Masquer temporairement le label de page pour le PDF propre
                const pageLabel = sheet.querySelector('.page-number-label');
                if (pageLabel) pageLabel.style.display = 'none';

                // Sauvegarde du transform
                const savedTransform = refs.sheetLayer.style.transform;
                refs.sheetLayer.style.transform = 'scale(1)';

                const canvas = await html2canvas(sheet, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    windowWidth: sheet.scrollWidth,
                    windowHeight: sheet.scrollHeight
                });

                refs.sheetLayer.style.transform = savedTransform;
                if (pageLabel) pageLabel.style.display = '';

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
            }

            if (refs.pdfProgressBar) refs.pdfProgressBar.style.width = '100%';
            if (refs.pdfProgressText) refs.pdfProgressText.textContent = 'Finalisation...';

            await new Promise(r => setTimeout(r, 300));
            pdf.save('planches-codes-barres.pdf');

        } catch (err) {
            alert('Erreur lors de la génération du PDF : ' + err.message);
            console.error(err);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Télécharger le PDF';
            if (refs.pdfProgress) {
                setTimeout(() => {
                    refs.pdfProgress.style.display = 'none';
                    if (refs.pdfProgressBar) refs.pdfProgressBar.style.width = '0%';
                }, 800);
            }
        }
    }

    // ─────────────────────────────────────────────
    // MODALE D'AIDE
    // ─────────────────────────────────────────────
    function openModal() {
        if (refs.helpModal) refs.helpModal.classList.add('open');
    }

    function closeModal() {
        if (refs.helpModal) refs.helpModal.classList.remove('open');
    }

    if (refs.helpButton) refs.helpButton.addEventListener('click', openModal);
    if (refs.closeModalBtn) refs.closeModalBtn.addEventListener('click', closeModal);

    if (refs.helpModal) {
        refs.helpModal.addEventListener('click', (e) => {
            if (e.target === refs.helpModal) closeModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && refs.helpModal && refs.helpModal.classList.contains('open')) {
            closeModal();
        }
    });

    // ─────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────
    populatePresets();
    updateSheetCSS(refs.pageSheet);
    updateFontSizePreview();
    createInputRow();
    renderBarcodes();
});
