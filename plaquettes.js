document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // I. RÉFÉRENCES ET VARIABLES GLOBALES
    // =========================================================================
    // Utilisation de DOMElements pour la cohérence avec le premier code
    const DOMElements = {
        // Planches et Aperçu
        sheetLayer: document.getElementById('sheetLayer'),
        gridContainer: document.getElementById('gridContainer'),
        zoomSlider: document.getElementById('zoomSlider'),
        zoomValue: document.getElementById('zoomValue'),
        downloadBtn: document.getElementById('downloadBtn'),
        
        // Contrôles
        codeType: document.getElementById('codeType'),
        codeScale: document.getElementById('codeScale'),
        
        // Grille / Dimensions
        gridPresetSelect: document.getElementById('gridPresetSelect'),
        marginTop: document.getElementById('marginTop'),
        marginLeft: document.getElementById('marginLeft'),
        nbCols: document.getElementById('nbCols'),
        nbRows: document.getElementById('nbRows'),
        rowHeight: document.getElementById('rowHeight'),
        arrowOption: document.getElementById('arrowOption'),

        // Source de Données (Excel et Manuel)
        excelInput: document.getElementById('excelInput'),
        dropZone: document.getElementById('dropZone'),
        importStatus: document.getElementById('importStatus'),
        importCount: document.getElementById('importCount'),
        clearDataBtn: document.getElementById('clearDataBtn'),
        manualInputContainer: document.getElementById('manualInputContainer'),
        addCodeInputBtn: document.getElementById('addCodeInputBtn'),

        // Modale d'aide
        helpButton: document.getElementById('helpButton'),
        helpModal: document.getElementById('helpModal'),
        closeModalBtn: document.getElementById('closeModalBtn')
    };

    let globalCodeData = []; // Stocke les données importées (Excel)
    let inputCount = 2; // Compteur pour les inputs manuels (commence à 2 pour les 2 du HTML)
    
    // Définitions des formats de planches courants (Presets) - FUSION DES DEUX LISTES
    // NOTE: Le second code utilisait un tableau `gridPresets`, nous allons harmoniser en utilisant l'objet du premier code pour la clé (plus simple à gérer).
    const GRID_PRESETS = {
        
        'planche_24': { name: 'Planche de 24 (70x36)', mt: 3.5, ml: 0, cols: 3, rows: 8, lh: 36 },
        'planche_4': { name: 'Planche de 4 (210x74)', mt: 0, ml: 0, cols: 1, rows: 4, lh: 74 },
    };


    // =========================================================================
    // II. LOGIQUE DES PRESETS
    // =========================================================================

    function populatePresets() {
        DOMElements.gridPresetSelect.innerHTML = '<option value="perso" selected>Personnalisé</option><option value="" disabled>--- Modèles prédéfinis ---</option>';
        for (const key in GRID_PRESETS) {
            if (key === 'perso') continue;
            const preset = GRID_PRESETS[key];
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.name;
            DOMElements.gridPresetSelect.appendChild(option);
        }
        DOMElements.gridPresetSelect.value = 'perso'; 
    }

    function applyPreset(presetKey) {
        if (presetKey === 'perso' || !GRID_PRESETS[presetKey]) return;

        const preset = GRID_PRESETS[presetKey];
        DOMElements.marginTop.value = preset.mt;
        DOMElements.marginLeft.value = preset.ml;
        DOMElements.nbCols.value = preset.cols;
        DOMElements.nbRows.value = preset.rows;
        DOMElements.rowHeight.value = preset.lh;
        
        updateSheetStyles();
        generateSheets();
    }


    // =========================================================================
    // III. GESTION DES SAISIES MANUELLES
    // (Inclus dans la génération pour récupérer les codes si Excel est vide)
    // =========================================================================

    function createNewCodeInput(placeholderText) {
        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.className = 'manual-code-input';
        newInput.dataset.index = inputCount;
        newInput.placeholder = placeholderText || `Code ${inputCount + 1}`;
        newInput.addEventListener('input', generateSheets);
        
        DOMElements.manualInputContainer.appendChild(newInput);
        inputCount++;
    }

    function getManualCodes() {
        const inputs = DOMElements.manualInputContainer.querySelectorAll('.manual-code-input');
        const codes = [];
        inputs.forEach(input => {
            const value = input.value.trim();
            if (value) codes.push(value);
        });
        return codes;
    }

    function toggleManualInputVisibility(isExcelLoaded) {
        // Logique du premier code, plus complète pour désactiver la zone manuelle si Excel est chargé
        if (isExcelLoaded) {
            DOMElements.manualInputContainer.style.opacity = '0.5';
            DOMElements.manualInputContainer.style.pointerEvents = 'none';
            DOMElements.addCodeInputBtn.style.display = 'none';
        } else {
            DOMElements.manualInputContainer.style.opacity = '1';
            DOMElements.manualInputContainer.style.pointerEvents = 'auto';
            DOMElements.addCodeInputBtn.style.display = 'flex'; 
        }
    }


    // =========================================================================
    // IV. GESTION DE L'IMPORT EXCEL ET DU STATUT
    // =========================================================================

    function handleExcelFile(file) {
        if (!window.XLSX) {
            alert("La librairie XLSX (SheetJS) n'est pas chargée.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Utilisation du format 'binary' du second code, mais 'array' du premier est souvent préférable
                const data = new Uint8Array(e.target.result); 
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const excelCodes = [];
                // Itère sur les lignes de la colonne A (commence à A1)
                for (let R = 1; ; ++R) {
                    const cellAddress = 'A' + R;
                    const cell = worksheet[cellAddress];
                    if (!cell) break; 

                    const value = cell && cell.v ? String(cell.v).trim() : '';
                    if (value) {
                        excelCodes.push(value);
                    }
                }

                if (excelCodes.length > 0) {
                    globalCodeData = excelCodes;
                    updateImportStatus(excelCodes.length, true);
                    generateSheets();
                } else {
                    alert("Aucun code valide trouvé dans la colonne A du fichier Excel.");
                    clearData();
                }

            } catch (error) {
                console.error("Erreur lors du traitement du fichier Excel:", error);
                alert("Erreur lors du traitement du fichier Excel. Assurez-vous qu'il est au format valide.");
                clearData();
            }
        };
        reader.readAsArrayBuffer(file); // Utilise ArrayBuffer pour XLSX.read({type: 'array'})
    }
    
    function updateImportStatus(count, isExcel) {
        const source = isExcel ? 'Import Excel' : 'Saisie Manuelle';
        const rowsPerSheet = parseInt(DOMElements.nbCols.value) * parseInt(DOMElements.nbRows.value);
        const sheetsCount = Math.ceil(count / rowsPerSheet) || 1;

        DOMElements.importCount.innerHTML = `${count} codes chargés (${source}), répartis sur ${sheetsCount} planches.`;
        DOMElements.importStatus.style.display = 'block';
        DOMElements.clearDataBtn.style.display = 'flex';
        toggleManualInputVisibility(isExcel);

        DOMElements.dropZone.style.pointerEvents = isExcel ? 'none' : 'auto';
        DOMElements.dropZone.style.opacity = isExcel ? '0.5' : '1';
    }


    function clearData() {
        globalCodeData = [];
        DOMElements.importStatus.style.display = 'none';
        DOMElements.clearDataBtn.style.display = 'none';
        
        // Réinitialisation des inputs manuels à l'état initial
        DOMElements.manualInputContainer.innerHTML = `
            <input type="text" class="manual-code-input" data-index="0" placeholder="Code 1">
            <input type="text" class="manual-code-input" data-index="1" placeholder="Code 2">
        `;
        inputCount = 2;
        DOMElements.manualInputContainer.querySelectorAll('.manual-code-input').forEach(input => {
            input.addEventListener('input', generateSheets);
        });

        DOMElements.excelInput.value = null; // Vide l'input file
        DOMElements.dropZone.style.pointerEvents = 'auto';
        DOMElements.dropZone.style.opacity = '1';
        toggleManualInputVisibility(false);

        generateSheets(); 
    }


    // =========================================================================
    // V. LOGIQUE DE GÉNÉRATION DES CODES ET PLANCHES
    // =========================================================================

    /**
     * Met à jour les variables CSS pour l'agencement de la feuille.
     */
    function updateSheetStyles() {
        // Applique les styles à TOUTES les feuilles existantes et futures (via le CSS)
        const root = document.documentElement; 
        root.style.setProperty('--mt', DOMElements.marginTop.value + 'mm');
        root.style.setProperty('--ml', DOMElements.marginLeft.value + 'mm');
        root.style.setProperty('--cols', DOMElements.nbCols.value);
        root.style.setProperty('--rows', DOMElements.nbRows.value);
        root.style.setProperty('--lh', DOMElements.rowHeight.value + 'mm');
    }
    
    /**
     * Génère un SVG de flèche pour les marqueurs d'orientation.
     * (Logique du second code pour un style de ligne épais)
     */
    function createArrowSVG(fullOption) {
        if (fullOption === 'none' || !fullOption.startsWith('line-')) return null;

        const [, dir] = fullOption.split('-');
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        
        // Dimensions basées sur le second code
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

        let dAttribute = "";
        if (dir === 'up') {
            dAttribute = "M 50,180 L 50,20 M 25,50 L 50,20 L 75,50";
        } else if (dir === 'down') {
            dAttribute = "M 50,20 L 50,180 M 25,150 L 50,180 L 75,150";
        }

        if (dAttribute) {
            path.setAttribute("d", dAttribute);
            svg.appendChild(path);
            return svg;
        }
        return null;
    }


    /**
     * Calcule le chiffre de contrôle EAN13 (Logique du second code).
     */
    function calculCheckDigit(ean12) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            // Index pairs * 1, index impairs * 3
            sum += (i % 2 === 0 ? 1 : 3) * parseInt(ean12[i]); 
        }
        const rem = sum % 10;
        return rem === 0 ? 0 : 10 - rem;
    }

    /**
     * Crée l'élément Canvas pour un QR Code (Logique du premier code).
     */
    function generateQRCodeContent(code, scale) {
        const qrCanvas = document.createElement('canvas');
        QRCode.toCanvas(qrCanvas, String(code), {
            errorCorrectionLevel: 'H',
            margin: 1,
            // Utilisation du scale de l'input pour ajuster la taille
            width: 100 * scale 
        });
        return qrCanvas;
    }

    /**
     * Crée l'élément SVG pour un code-barres (Logique du premier code, ajustée).
     */
    function generateBarcodeSVGContent(code, type, scale) {
        const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        
        let codeText = String(code);
        if (type === 'EAN13' && codeText.length === 12) {
            codeText += calculCheckDigit(codeText.replace(/\D/g, "").substring(0, 12));
        }

        JsBarcode(svgElement, codeText, {
            format: type,
            displayValue: true,
            margin: 5, // Marge nécessaire pour le texte et pour éviter de toucher les bords
            width: 2 * scale, // Ajustement de la largeur basée sur l'échelle
            height: 50 * scale, // Ajustement de la hauteur basée sur l'échelle
            textMargin: 5
        });
        return svgElement;
    }
    
    /**
     * Génère une cellule complète.
     */
    function createBarcodeCell(code, type, scale, arrowOption, isDemo) {
        const cell = document.createElement('div');
        cell.className = 'barcode-cell';
        if (isDemo) cell.style.opacity = "0.3";

        // Ajout de la flèche
        const arrowContent = createArrowSVG(arrowOption);
        if (arrowContent) {
            cell.appendChild(arrowContent);
        }

        try {
            let element;
            if (type === 'QRCODE') {
                element = generateQRCodeContent(code, scale);
            } else {
                element = generateBarcodeSVGContent(code, type, scale);
            }
            cell.appendChild(element);
        } catch (e) {
            cell.textContent = `Erreur: ${e.message.substring(0, 30)}...`;
            cell.style.color = "red";
            cell.style.fontSize = "0.7rem";
        }
        return cell;
    }


    /**
     * Fonction principale de génération des planches à partir des données.
     */
    function generateSheets() {
        const rows = parseInt(DOMElements.nbRows.value);
        const cols = parseInt(DOMElements.nbCols.value);
        const cellsPerSheet = rows * cols;

        const codeType = DOMElements.codeType.value;
        const codeScale = parseFloat(DOMElements.codeScale.value);
        const arrowOption = DOMElements.arrowOption.value;

        // 1. Déterminer la source des données
        let codes;
        let isExcelSource = globalCodeData.length > 0;
        let isDemo = false;

        if (isExcelSource) {
            codes = globalCodeData;
            updateImportStatus(codes.length, true);
        } else {
            codes = getManualCodes();
            if (codes.length === 0) {
                 // Si pas de données, utiliser un exemple (logique du second code)
                codes = ["EXEMPLE-1", "EXEMPLE-2", "EXEMPLE-3", "EXEMPLE-4", "EXEMPLE-5", "EXEMPLE-6", "EXEMPLE-7", "EXEMPLE-8"];
                isDemo = true;
                DOMElements.importStatus.style.display = 'none';
                DOMElements.clearDataBtn.style.display = 'none';
            } else {
                updateImportStatus(codes.length, false);
            }
        }
        
        updateSheetStyles();

        // 2. Préparation de l'aperçu
        DOMElements.sheetLayer.innerHTML = '';
        
        if (codes.length === 0 && !isDemo) {
             // Message si vraiment vide (ne devrait arriver qu'après un Clear si l'exemple n'est pas utilisé)
            DOMElements.sheetLayer.innerHTML = `<div id="pageSheet" class="sheet">
                <div id="gridContainer" class="grid-container">
                    <div class="barcode-cell" style="color:#aaa; font-size:0.8rem; grid-column: 1 / -1; align-self: center; justify-self: center;">
                        (Zone d'aperçu - Importez un fichier Excel ou saisissez des codes)
                    </div>
                </div>
            </div>`;
            return;
        }

        // 3. Génération des planches (Logique Multi-pages du second code)
        let codeIndex = 0;
        let sheetCount = Math.ceil(codes.length / cellsPerSheet);

        for (let s = 0; s < sheetCount; s++) {
            const currentSheet = document.createElement('div');
            currentSheet.className = 'sheet';
            currentSheet.id = `pageSheet_${s}`; 

            const currentGrid = document.createElement('div');
            currentGrid.className = 'grid-container';

            // Remplissage de la grille
            for (let i = 0; i < cellsPerSheet; i++) {
                if (codeIndex < codes.length) {
                    const code = codes[codeIndex];
                    const cell = createBarcodeCell(code, codeType, codeScale, arrowOption, isDemo);
                    currentGrid.appendChild(cell);
                    codeIndex++;
                } else {
                    // Remplissage des cellules vides
                    const emptyCell = document.createElement('div');
                    emptyCell.className = 'barcode-cell empty';
                    currentGrid.appendChild(emptyCell);
                }
            }

            currentSheet.appendChild(currentGrid);
            DOMElements.sheetLayer.appendChild(currentSheet);
        }
        
        // Mise à jour de la référence du gridContainer de la première page si nécessaire
        DOMElements.gridContainer = DOMElements.sheetLayer.querySelector('.grid-container'); 
        
        // Mise à jour du statut des codes (sauf en mode démo)
        if (!isDemo && (isExcelSource || codes.length > 0)) {
             updateImportStatus(codes.length, isExcelSource);
        }
    }


    // =========================================================================
    // VI. TÉLÉCHARGEMENT PDF (Logique multi-pages avec progression)
    // =========================================================================

    async function generatePDF() {
        if (!window.jspdf || !window.html2canvas) {
            alert("Les librairies jsPDF et/ou html2canvas ne sont pas chargées. Impossible de générer le PDF.");
            return;
        }
        
        if (globalCodeData.length === 0 && getManualCodes().length === 0) {
            alert("Aucune donnée chargée pour générer un PDF.");
            return;
        }

        DOMElements.downloadBtn.disabled = true;
        DOMElements.downloadBtn.textContent = 'Génération en cours...';

        // 1. Mise en place de l'environnement de capture (Logique du second code)
        const originalTransform = DOMElements.sheetLayer.style.transform;
        const originalBoxShadow = DOMElements.sheetLayer.style.boxShadow;

        // Réinitialiser le zoom/ombre pour la capture
        DOMElements.sheetLayer.style.transform = "scale(1)";
        DOMElements.sheetLayer.style.boxShadow = "none";
        
        // Assurez-vous que les codes sont générés avant la capture
        generateSheets();

        const sheets = DOMElements.sheetLayer.querySelectorAll('.sheet');
        if (sheets.length === 0) {
            DOMElements.downloadBtn.textContent = 'Télécharger le PDF';
            DOMElements.downloadBtn.disabled = false;
            return;
        }
        
        // 2. Initialisation de jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pdfWidth = 210;
        const pdfHeight = 297;

        let pageIndex = 1;
        const totalSheets = sheets.length;

        for (const sheet of sheets) {
            // *** MISE À JOUR DE LA PROGRESSION *** (Logique du second code)
            DOMElements.downloadBtn.textContent = `Génération en cours... Page ${pageIndex} / ${totalSheets}`;

            if (pageIndex > 1) {
                pdf.addPage();
            }

            // 3. Capturer la feuille avec html2canvas (Scale: 2 pour l'optimisation)
            const canvas = await html2canvas(sheet, {
                scale: 2, 
                useCORS: true,
                logging: false,
                backgroundColor: '#FFFFFF'
            });

            // 4. Ajouter la capture au PDF
            const imgData = canvas.toDataURL('image/png');

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            pageIndex++;
        }

        // 5. Téléchargement du fichier
        pdf.save('planche_etiquettes_multi-pages.pdf');

        // 6. Restauration de l'affichage et du bouton
        DOMElements.sheetLayer.style.transform = originalTransform;
        DOMElements.sheetLayer.style.boxShadow = originalBoxShadow;
        DOMElements.downloadBtn.textContent = 'Télécharger le PDF';
        DOMElements.downloadBtn.disabled = false;
    }


    // =========================================================================
    // VII. GESTION DU ZOOM DE L'APERÇU
    // =========================================================================
    
    function updateZoom() {
        const zoomValue = DOMElements.zoomSlider.value;
        DOMElements.sheetLayer.style.transform = `scale(${zoomValue})`;
        DOMElements.zoomValue.textContent = `${Math.round(zoomValue * 100)}%`;
    }


    // =========================================================================
    // VIII. GESTION DE LA MODALE D'AIDE
    // =========================================================================

    function openModal() {
        if (DOMElements.helpModal) DOMElements.helpModal.classList.add('open');
    }

    function closeModal() {
        if (DOMElements.helpModal) DOMElements.helpModal.classList.remove('open');
    }


    // =========================================================================
    // IX. ÉCOUTEURS D'ÉVÉNEMENTS
    // =========================================================================
    
    // 1. Contrôles de Grille/Code qui déclenchent la régénération
    [
        DOMElements.codeType, 
        DOMElements.codeScale,
        DOMElements.marginTop, 
        DOMElements.marginLeft, 
        DOMElements.nbCols, 
        DOMElements.nbRows, 
        DOMElements.rowHeight,
        DOMElements.arrowOption
    ].forEach(element => element.addEventListener('input', () => {
        // Déselectionne le preset si un champ de dimension est modifié manuellement
        if (element.id !== 'codeType' && element.id !== 'codeScale' && element.id !== 'arrowOption') {
            DOMElements.gridPresetSelect.value = 'perso';
        }
        updateSheetStyles();
        generateSheets();
    }));

    DOMElements.gridPresetSelect.addEventListener('change', (e) => {
        applyPreset(e.target.value);
        // Réinitialise à 'Personnalisé' pour permettre l'édition manuelle après l'application
        DOMElements.gridPresetSelect.value = 'perso'; 
    });

    // 2. Saisie Manuelle (Initialisation)
    DOMElements.manualInputContainer.querySelectorAll('.manual-code-input').forEach(input => {
        input.addEventListener('input', generateSheets);
    });
    DOMElements.addCodeInputBtn.addEventListener('click', () => {
        createNewCodeInput();
        const lastInput = DOMElements.manualInputContainer.lastElementChild;
        if (lastInput) lastInput.focus();
    });

    // 3. Import Excel (Drag & Drop / Fichier)
    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
    function handleDrop(e) {
        preventDefaults(e);
        DOMElements.dropZone.classList.remove('highlight');
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) handleExcelFile(file);
    }
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        DOMElements.dropZone.addEventListener(eventName, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        DOMElements.dropZone.addEventListener(eventName, () => DOMElements.dropZone.classList.add('highlight'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        DOMElements.dropZone.addEventListener(eventName, () => DOMElements.dropZone.classList.remove('highlight'), false);
    });
    DOMElements.dropZone.addEventListener('drop', handleDrop, false);
    DOMElements.excelInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleExcelFile(e.target.files[0]);
    });
    DOMElements.clearDataBtn.addEventListener('click', clearData);


    // 4. Zoom et Téléchargement
    DOMElements.zoomSlider.addEventListener('input', updateZoom);
    DOMElements.downloadBtn.addEventListener('click', generatePDF);


    // 5. Modale d'aide
    DOMElements.helpButton.addEventListener('click', openModal);
    DOMElements.closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === DOMElements.helpModal) {
            closeModal();
        }
    });
    document.addEventListener('keydown', (e) => {
         if (e.key === 'Escape' && DOMElements.helpModal && DOMElements.helpModal.classList.contains('open')) {
            closeModal();
        }
    });


    // =========================================================================
    // X. INITIALISATION
    // =========================================================================

    // 1. Remplir les presets
    populatePresets();

    // 2. Appliquer le zoom initial
    updateZoom();

    // 3. Appliquer les styles CSS initiaux
    updateSheetStyles();

    // 4. Générer l'aperçu initial (doit afficher l'exemple)
    generateSheets(); 

}); // Fin de DOMContentLoaded
