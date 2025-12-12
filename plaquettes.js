document.addEventListener('DOMContentLoaded', () => {

    // --- MISE À JOUR DE L'OBJET REFS AVEC TOUS LES ÉLÉMENTS (INCLUANT helpButton) ---
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

        // ✅ RÉFÉRENCES MODALE (helpButton est de retour)
        helpModal: document.getElementById('helpModal'),
        helpButton: document.getElementById('helpButton'), 
        closeModalBtn: document.getElementById('closeModalBtn')
    };

    let appData = []; // Stockage des codes

    // --- DÉFINITION DES PRESETS DE GRILLE ---
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
    // --- FIN PRESETS ---

    // --- GESTION DU ZOOM ---
refs.zoomSlider.addEventListener('input', (e) => {
        const scale = parseFloat(e.target.value);
        // 1. Mettre à jour l'échelle visuelle
        refs.sheetLayer.style.transform = `scale(${scale})`;

        // 2. Mettre à jour le pourcentage affiché
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

        if (selectedIndex === "" || selectedIndex === null) {
            return;
        }

        const preset = gridPresets[selectedIndex];

        // 1. Appliquer les valeurs aux champs de configuration
        refs.marginTop.value = preset.marginTop;
        refs.marginLeft.value = preset.marginLeft;
        refs.nbCols.value = preset.nbCols;
        refs.nbRows.value = preset.nbRows;
        refs.rowHeight.value = preset.rowHeight;

        // 2. Mettre à jour la grille visuelle
        updateGridCSS();
        renderBarcodes();
    });
    // --- FIN PRESETS LOGIQUE ---

    // ---------------------------------------------
    // --- CRÉATION DU SVG DE FLÈCHE (LIGNE ÉPAISSE) ---
    // ---------------------------------------------
    function createArrowSVG(fullOption) {
        // fullOption est la valeur du selecteur, ex: 'line-up' ou 'line-down'
        if (fullOption === 'none' || !fullOption.startsWith('line-')) {
            return null; // Ignore les autres styles que 'line'
        }

        const [style, dir] = fullOption.split('-');

        // Dimensions : 10mm de large, 20mm de haut
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "10mm");
        svg.setAttribute("height", "20mm");
        svg.setAttribute("viewBox", "0 0 100 200");
        svg.style.marginRight = "5px";
        svg.style.flexShrink = "0";

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

        // Configuration pour le style LIGNE ÉPAISSE
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#000");
        path.setAttribute("stroke-width", "20"); // Epaisseur : 16 (TRÈS ÉPAIS)
        path.setAttribute("stroke-linecap", "round");

        let dAttribute = "";

        if (dir === 'up') {
            // Ligne du bas (180) vers le haut (20) + tête de flèche
            dAttribute = "M 50,180 L 50,20 M 25,50 L 50,20 L 75,50";
        } else if (dir === 'down') {
            // Ligne du haut (20) vers le bas (180) + tête de flèche
            dAttribute = "M 50,20 L 50,180 M 25,150 L 50,180 L 75,150";
        }

        if (dAttribute) {
            path.setAttribute("d", dAttribute);
            svg.appendChild(path);
            return svg;
        }

        return null;
    }


    // --- RENDU DES CODES (Multi-Pages) ---
    function renderBarcodes() {
        // Supprimer toutes les pages supplémentaires sauf la première
        const sheetsToRemove = refs.sheetLayer.querySelectorAll('.sheet:not(#pageSheet)');
        sheetsToRemove.forEach(sheet => sheet.remove());

        const scale = parseFloat(refs.codeScale.value);
        const cols = parseInt(refs.nbCols.value);
        const rows = parseInt(refs.nbRows.value);
        const labelsPerPage = cols * rows;

        let dataToUse = appData.length === 0
            ? ["EXEMPLE-1", "EXEMPLE-2", "EXEMPLE-3", "EXEMPLE-4", "EXEMPLE-5", "EXEMPLE-6", "EXEMPLE-7", "EXEMPLE-8"]
            : appData;

        const isDemo = appData.length === 0;

        if (dataToUse.length === 0) {
            refs.pageSheet.innerHTML = '<div id="gridContainer" class="grid-container"><div class="barcode-cell" style="color:#aaa; font-size:0.8rem;">(Zone d\'aperçu - Importez un fichier)</div></div>';
            refs.gridContainer = document.getElementById('gridContainer');
            return;
        }

        const totalPages = Math.ceil(dataToUse.length / labelsPerPage);

        const fragment = document.createDocumentFragment();

        for (let p = 0; p < totalPages; p++) {
            const pageStart = p * labelsPerPage;
            const pageEnd = pageStart + labelsPerPage;
            const pageData = dataToUse.slice(pageStart, pageEnd);

            let currentSheet;
            let pageGridContainer;

            if (p === 0) {
                currentSheet = refs.pageSheet;
                currentSheet.innerHTML = '';

                pageGridContainer = document.createElement('div');
                pageGridContainer.className = 'grid-container';
                pageGridContainer.id = 'gridContainer';
                currentSheet.appendChild(pageGridContainer);
                refs.gridContainer = pageGridContainer;
            } else {
                currentSheet = document.createElement('div');
                currentSheet.className = 'sheet';
                updateSheetCSS(currentSheet);

                pageGridContainer = document.createElement('div');
                pageGridContainer.className = 'grid-container';
                currentSheet.appendChild(pageGridContainer);
                fragment.appendChild(currentSheet);
            }

            // Remplir la grille
            pageData.forEach(code => {
                createCell(code, scale, pageGridContainer, isDemo);
            });
        }

        refs.sheetLayer.appendChild(fragment);

        // Mise à jour du statut
        if (appData.length > 0) {
            refs.importCount.textContent = `${appData.length} codes chargés, répartis sur ${totalPages} planches.`;
        }
    }

    // --- Création d'une cellule (Code-barres ou QR Code) ---
    function createCell(text, scale, containerElement, isDemo = false) {
        const cell = document.createElement('div');
        cell.className = 'barcode-cell';
        if (isDemo) cell.style.opacity = "0.3";

        // AJOUT DE LA FLÈCHE
        const arrowDirection = refs.arrowOption.value; // ex: 'line-up'
        const arrowSVG = createArrowSVG(arrowDirection);
        if (arrowSVG) {
            cell.appendChild(arrowSVG);
        }

        try {
            const type = refs.codeType.value;
            let element;

            if (type === 'QRCODE') {
                element = document.createElement('canvas');
                QRCode.toCanvas(element, String(text), {
                    margin: 0,
                    width: 100 * scale
                });
            } else {
                element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                // Correction EAN13 check digit
                let codeText = String(text);
                if (type === 'EAN13') {
                    codeText = codeText.replace(/\D/g, "");
                    if (codeText.length === 12) codeText += calculCheckDigit(codeText);
                }

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
        } catch (e) {
            cell.textContent = `Erreur: ${e.message.substring(0, 30)}...`;
            cell.style.color = "red";
            cell.style.fontSize = "0.7rem";
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
    function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const data = e.target.result;
            const workbook = XLSX.read(data, {
                type: 'binary'
            });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {
                header: 1
            });

            // Filtre colonne A
            appData = json.map(r => r[0]).filter(c => c !== undefined && c !== "");

            // UI Update
            refs.importStatus.style.display = 'block';
            refs.clearBtn.style.display = 'inline-flex';

            renderBarcodes();
        };
        reader.readAsBinaryString(file);
    }

    refs.excelInput.addEventListener('change', handleFile);

    // Drop Zone handling
    refs.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        refs.dropZone.style.borderColor = 'var(--primary)';
    });

    refs.dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        refs.dropZone.style.borderColor = 'var(--border-subtle)';
    });

    refs.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        refs.dropZone.style.borderColor = 'var(--border-subtle)';
        if (e.dataTransfer.files.length) {
            refs.excelInput.files = e.dataTransfer.files;
            handleFile({ target: refs.excelInput });
        }
    });

    // Clear
    refs.clearBtn.addEventListener('click', () => {
        appData = [];
        refs.importStatus.style.display = 'none';
        refs.clearBtn.style.display = 'none';
        refs.excelInput.value = "";
        renderBarcodes();
    });

    // --- Download PDF (Multi-Pages) avec Progression ---
    refs.downloadBtn.addEventListener('click', async () => {
        // Désactiver le bouton pendant le traitement
        refs.downloadBtn.textContent = 'Génération en cours...';
        refs.downloadBtn.disabled = true;

        // 1. Mise en place de l'environnement de capture
        const originalTransform = refs.sheetLayer.style.transform;
        const originalBoxShadow = refs.sheetLayer.style.boxShadow;

        // Réinitialiser le zoom/ombre pour la capture
        refs.sheetLayer.style.transform = "scale(1)";
        refs.sheetLayer.style.boxShadow = "none";

        // Récupérer toutes les planches affichées
        const sheets = refs.sheetLayer.querySelectorAll('.sheet');
        if (sheets.length === 0 || appData.length === 0) {
            alert("Aucune donnée chargée pour générer un PDF.");
            refs.downloadBtn.textContent = 'Télécharger le PDF';
            refs.downloadBtn.disabled = false;
            return;
        }

        // 2. Initialisation de jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pdfWidth = 210;
        const pdfHeight = 297;

        let firstPage = true;
        let pageIndex = 1;
        const totalSheets = sheets.length;

        for (const sheet of sheets) {
            // *** MISE À JOUR DE LA PROGRESSION ***
            refs.downloadBtn.textContent = `Génération en cours... Page ${pageIndex} / ${totalSheets}`;

            if (!firstPage) {
                // Ajouter une nouvelle page au PDF pour toutes les feuilles après la première
                pdf.addPage();
            }

            // 3. Capturer la feuille avec html2canvas (Scale: 2 pour l'optimisation)
            const canvas = await html2canvas(sheet, {
                scale: 2,
                useCORS: true,
                logging: false,
            });

            // 4. Ajouter la capture au PDF
            const imgData = canvas.toDataURL('image/png');

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            firstPage = false;
            pageIndex++;
        }

        // 5. Téléchargement du fichier
        pdf.save('planche_etiquettes_multi-pages.pdf');

        // 6. Restauration de l'affichage et du bouton
        refs.sheetLayer.style.transform = originalTransform;
        refs.sheetLayer.style.boxShadow = originalBoxShadow;
        refs.downloadBtn.textContent = 'Télécharger le PDF';
        refs.downloadBtn.disabled = false;
    });


    // ------------------------------------------------
    // --- GESTION DE LA MODALE D'AIDE (CORRIGÉE) ---
    // ------------------------------------------------

    // Fonction pour ouvrir la modale
    function openModal() {
        if (refs.helpModal) refs.helpModal.classList.add('open');
    }

    // Fonction pour fermer la modale
    function closeModal() {
        if (refs.helpModal) refs.helpModal.classList.remove('open');
    }

    // 1. Ouvrir la modale au clic sur le bouton '?'
    if (refs.helpButton) {
        refs.helpButton.addEventListener('click', openModal);
    }

    // 2. Fermer la modale au clic sur le bouton 'X'
    if (refs.closeModalBtn) {
        refs.closeModalBtn.addEventListener('click', closeModal);
    }

    // 3. Fermer la modale si on clique en dehors (sur l'overlay)
    if (refs.helpModal) {
        refs.helpModal.addEventListener('click', (e) => {
            // Ne fermer que si l'élément cliqué est l'overlay lui-même
            if (e.target === refs.helpModal) {
                closeModal();
            }
        });
    }

    // 4. Fermer la modale si on appuie sur la touche ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && refs.helpModal && refs.helpModal.classList.contains('open')) {
            closeModal();
        }
    });


    // --- Init ---
    populatePresets();
    updateGridCSS();
    renderBarcodes(); // Affiche l'exemple au démarrage

    // AJOUT: Initialiser le pourcentage de zoom
    const initialScale = parseFloat(refs.zoomSlider.value);
    const initialPercentage = Math.round(initialScale * 100);
    refs.zoomValue.textContent = `${initialPercentage}%`;
});
