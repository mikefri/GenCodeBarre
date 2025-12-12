document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // I. RÉFÉRENCES ET VARIABLES GLOBALES
    // -------------------------------------------------------------------------
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

        // Source de Données
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

    let globalCodeData = []; // Stocke les données importées ou manuelles
    let inputCount = 2; // Compteur pour les inputs manuels (commence à 2 car 2 dans le HTML)

    // Définitions des formats de planches courants (Presets)
    const GRID_PRESETS = {
        'perso': { name: 'Personnalisé', mt: 4.5, ml: 5, cols: 3, rows: 8, lh: 36 },
        'avery_l7160': { name: 'Avery L7160 (65 étiquettes)', mt: 11.7, ml: 8.5, cols: 5, rows: 13, lh: 26.7 },
        'avery_j8163': { name: 'Avery J8163 (14 étiquettes)', mt: 9.9, ml: 10, cols: 2, rows: 7, lh: 42.4 },
        'avery_l7120': { name: 'Avery L7120 (10 étiquettes)', mt: 10, ml: 10, cols: 1, rows: 10, lh: 59.4 },
    };

    // -------------------------------------------------------------------------
    // II. GESTION DES PRÉSÉLECTIONS (PRESETS)
    // -------------------------------------------------------------------------

    /**
     * Remplit le menu déroulant des presets.
     */
    function populatePresets() {
        DOMElements.gridPresetSelect.innerHTML = '<option value="" selected disabled>Sélectionner un Modèle prédéfini...</option>';
        for (const key in GRID_PRESETS) {
            const preset = GRID_PRESETS[key];
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.name;
            DOMElements.gridPresetSelect.appendChild(option);
        }
        DOMElements.gridPresetSelect.value = 'perso'; // Sélectionne 'Personnalisé' par défaut
    }

    /**
     * Applique les valeurs d'un preset aux champs d'input de la grille.
     * @param {string} presetKey - Clé du preset.
     */
    function applyPreset(presetKey) {
        if (presetKey === 'perso') return; // Ne fait rien si 'Personnalisé' est sélectionné

        const preset = GRID_PRESETS[presetKey];
        if (preset) {
            DOMElements.marginTop.value = preset.mt;
            DOMElements.marginLeft.value = preset.ml;
            DOMElements.nbCols.value = preset.cols;
            DOMElements.nbRows.value = preset.rows;
            DOMElements.rowHeight.value = preset.lh;
            
            // Met à jour les variables CSS pour l'aperçu immédiatement
            updateSheetStyles();
            generateSheets();
        }
    }

    // -------------------------------------------------------------------------
    // III. GESTION DES SAISIES MANUELLES (Nouveauté : inputs individuels)
    // -------------------------------------------------------------------------

    /**
     * Crée un nouvel élément input de code et l'ajoute.
     */
    function createNewCodeInput(placeholderText) {
        const newInput = document.createElement('input');
        
        // Configure l'input
        newInput.type = 'text';
        newInput.className = 'manual-code-input';
        newInput.dataset.index = inputCount;
        newInput.placeholder = placeholderText || `Code ${inputCount + 1}`;
        
        // Événement : régénération à la saisie
        newInput.addEventListener('input', generateSheets); 
        
        // Ajout du champ et incrémentation
        DOMElements.manualInputContainer.appendChild(newInput);
        inputCount++;
    }

    // Initialisation des écouteurs pour les deux champs par défaut dans le HTML
    DOMElements.manualInputContainer.querySelectorAll('.manual-code-input').forEach(input => {
        input.addEventListener('input', generateSheets);
    });

    // Écouteur pour le bouton d'ajout de code
    DOMElements.addCodeInputBtn.addEventListener('click', () => {
        createNewCodeInput();
        // Focus sur le nouveau champ pour un flux de travail rapide
        const lastInput = DOMElements.manualInputContainer.lastElementChild;
        if (lastInput) lastInput.focus();
    });

    /**
     * Récupère les codes depuis tous les inputs manuels.
     * @returns {string[]} Tableau des codes non vides.
     */
    function getManualCodes() {
        const inputs = DOMElements.manualInputContainer.querySelectorAll('.manual-code-input');
        const codes = [];

        inputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                codes.push(value);
            }
        });
        return codes;
    }

    /**
     * Masque/affiche les inputs manuels ou le bouton d'import Excel
     * en fonction de si des données Excel sont chargées.
     * @param {boolean} isExcelLoaded - Vrai si des données Excel sont dans globalCodeData.
     */
    function toggleManualInputVisibility(isExcelLoaded) {
        if (isExcelLoaded) {
            DOMElements.manualInputContainer.style.opacity = '0.5';
            DOMElements.manualInputContainer.style.pointerEvents = 'none';
            DOMElements.addCodeInputBtn.style.display = 'none';
        } else {
            DOMElements.manualInputContainer.style.opacity = '1';
            DOMElements.manualInputContainer.style.pointerEvents = 'auto';
            DOMElements.addCodeInputBtn.style.display = 'flex'; // Utilise flex pour l'icône + texte
        }
    }

    // -------------------------------------------------------------------------
    // IV. GESTION DE L'IMPORT EXCEL
    // -------------------------------------------------------------------------

    /**
     * Lit et parse le fichier Excel (colonne A uniquement).
     */
    function handleExcelFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const excelCodes = [];
                // Itère sur les lignes de la colonne A (commence à A1)
                for (let R = 1; ; ++R) {
                    const cellAddress = 'A' + R;
                    const cell = worksheet[cellAddress];
                    if (!cell) break; // Arrête si la cellule est vide

                    const value = cell.v ? String(cell.v).trim() : '';
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
                alert("Erreur lors du traitement du fichier Excel. Assurez-vous qu'il est au format .xlsx ou .xls.");
                clearData();
            }
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * Met à jour la carte de statut après un import/chargement.
     * @param {number} count - Nombre de codes.
     * @param {boolean} isExcel - Vrai si les données viennent d'Excel.
     */
    function updateImportStatus(count, isExcel) {
        const source = isExcel ? 'Import Excel' : 'Saisie Manuelle';
        const rowsPerSheet = parseInt(DOMElements.nbCols.value) * parseInt(DOMElements.nbRows.value);
        const sheetsCount = Math.ceil(count / rowsPerSheet) || 1;

        DOMElements.importCount.innerHTML = `${count} codes chargés (${source}), répartis sur ${sheetsCount} planches.`;
        DOMElements.importStatus.style.display = 'block';
        DOMElements.clearDataBtn.style.display = 'flex';
        toggleManualInputVisibility(isExcel);

        // Si Excel est chargé, désactive l'input file temporairement
        DOMElements.dropZone.style.pointerEvents = isExcel ? 'none' : 'auto';
        DOMElements.dropZone.style.opacity = isExcel ? '0.5' : '1';
    }


    /**
     * Efface toutes les données de codes et réinitialise l'état.
     */
    function clearData() {
        globalCodeData = [];
        DOMElements.importStatus.style.display = 'none';
        DOMElements.clearDataBtn.style.display = 'none';
        
        // Réinitialise les inputs manuels à l'état initial (2 champs vides)
        DOMElements.manualInputContainer.innerHTML = `
            <input type="text" class="manual-code-input" data-index="0" placeholder="Code 1">
            <input type="text" class="manual-code-input" data-index="1" placeholder="Code 2">
        `;
        inputCount = 2;
        DOMElements.manualInputContainer.querySelectorAll('.manual-code-input').forEach(input => {
            input.addEventListener('input', generateSheets);
        });

        // Réactive l'import Excel
        DOMElements.dropZone.style.pointerEvents = 'auto';
        DOMElements.dropZone.style.opacity = '1';
        toggleManualInputVisibility(false);

        generateSheets(); // Rafraîchit l'aperçu
    }

    // Gestion des événements de drag & drop
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
    DOMElements.excelInput.addEventListener('change', (e) => handleExcelFile(e.target.files[0]));
    DOMElements.clearDataBtn.addEventListener('click', clearData);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) handleExcelFile(file);
    }

    // -------------------------------------------------------------------------
    // V. LOGIQUE DE GÉNÉRATION DES CODES ET PLANCHES
    // -------------------------------------------------------------------------

    /**
     * Met à jour les variables CSS pour l'agencement de la feuille.
     */
    function updateSheetStyles() {
        const sheet = document.querySelector('.sheet');
        if (sheet) {
            sheet.style.setProperty('--mt', DOMElements.marginTop.value + 'mm');
            sheet.style.setProperty('--ml', DOMElements.marginLeft.value + 'mm');
            sheet.style.setProperty('--cols', DOMElements.nbCols.value);
            sheet.style.setProperty('--rows', DOMElements.nbRows.value);
            sheet.style.setProperty('--lh', DOMElements.rowHeight.value + 'mm');
        }
    }

    /**
     * Crée l'élément SVG pour un code-barres.
     * @param {string} code - Le code à encoder.
     * @param {string} type - Le type de code (CODE128, EAN13...).
     * @param {number} scale - Facteur d'échelle.
     * @returns {string} Le code SVG sous forme de chaîne.
     */
    function generateBarcodeSVG(code, type, scale) {
        const barcodeOptions = {
            format: type,
            displayValue: true,
            margin: 0,
            width: scale * 2, // Ajustement de la largeur basée sur l'échelle
            height: scale * 50, // Ajustement de la hauteur basée sur l'échelle
            textMargin: 5
        };
        const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        JsBarcode(svgElement, code, barcodeOptions);
        return svgElement.outerHTML;
    }

    /**
     * Crée l'élément Canvas pour un QR Code.
     * @param {string} code - Le code à encoder.
     * @returns {HTMLCanvasElement} L'élément canvas du QR Code.
     */
    function generateQRCodeCanvas(code) {
        const qrCanvas = document.createElement('canvas');
        QRCode.toCanvas(qrCanvas, code, {
            errorCorrectionLevel: 'H',
            margin: 1,
            scale: 8 // Gère la densité du QR Code
        });
        return qrCanvas;
    }

    /**
     * Génère une cellule complète avec le code et ses options.
     * @param {string} code - Le code à traiter.
     * @param {string} type - Type de code.
     * @param {number} scale - Échelle.
     * @param {string} arrowOption - Option de flèche.
     * @returns {HTMLElement} L'élément div de la cellule de code.
     */
    function createBarcodeCell(code, type, scale, arrowOption) {
        const cell = document.createElement('div');
        cell.className = 'barcode-cell';

        if (arrowOption !== 'none') {
            const arrowDiv = document.createElement('div');
            arrowDiv.className = `arrow-marker ${arrowOption}`;
            cell.appendChild(arrowDiv);
        }

        if (type === 'QRCODE') {
            const qrCanvas = generateQRCodeCanvas(code);
            cell.appendChild(qrCanvas);
        } else {
            const svgString = generateBarcodeSVG(code, type, scale);
            // Insère directement le SVG. Le style (taille) sera géré par la cellule via le scale
            cell.innerHTML += svgString;
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
        if (globalCodeData.length > 0) {
            codes = globalCodeData;
            // Mise à jour du statut avec les données Excel (si on régénère)
            updateImportStatus(codes.length, true);
        } else {
            codes = getManualCodes();
            // Mise à jour du statut avec les données Manuelles (si on régénère)
            if (codes.length > 0) {
                 updateImportStatus(codes.length, false);
            } else {
                DOMElements.importStatus.style.display = 'none';
                DOMElements.clearDataBtn.style.display = 'none';
            }
        }
        
        // Mettre à jour les variables CSS pour la grille (marges, lignes, colonnes)
        updateSheetStyles();

        // 2. Préparation de l'aperçu
        DOMElements.sheetLayer.innerHTML = '';
        
        if (codes.length === 0) {
            DOMElements.sheetLayer.innerHTML = `<div id="pageSheet" class="sheet">
                <div id="gridContainer" class="grid-container">
                    <div class="barcode-cell" style="color:#aaa; font-size:0.8rem;">
                        (Zone d'aperçu - Importez un fichier ou saisissez des codes)
                    </div>
                </div>
            </div>`;
            return;
        }


        // 3. Génération des planches
        let codeIndex = 0;
        let sheetCount = Math.ceil(codes.length / cellsPerSheet);

        for (let s = 0; s < sheetCount; s++) {
            const currentSheet = document.createElement('div');
            currentSheet.className = 'sheet';
            currentSheet.id = `pageSheet_${s}`; // ID pour l'impression/téléchargement

            const currentGrid = document.createElement('div');
            currentGrid.className = 'grid-container';

            // Remplissage de la grille
            for (let i = 0; i < cellsPerSheet; i++) {
                if (codeIndex < codes.length) {
                    const code = codes[codeIndex];
                    const cell = createBarcodeCell(code, codeType, codeScale, arrowOption);
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
    }


    // -------------------------------------------------------------------------
    // VI. TÉLÉCHARGEMENT PDF (Logique avancée avec jsPDF et html2canvas)
    // -------------------------------------------------------------------------

    /**
     * Génère et télécharge le PDF à partir de l'aperçu HTML.
     */
    async function generatePDF() {
        DOMElements.downloadBtn.disabled = true;
        DOMElements.downloadBtn.textContent = 'Génération en cours...';

        const sheets = document.querySelectorAll('.sheet');
        if (sheets.length === 0) {
            alert("Aucune planche à télécharger.");
            DOMElements.downloadBtn.disabled = false;
            DOMElements.downloadBtn.textContent = 'Télécharger le PDF';
            return;
        }

        const doc = new window.jspdf.jsPDF({
            unit: 'mm',
            format: 'a4',
            orientation: 'p'
        });

        // Largeur/Hauteur de l'A4 en mm
        const pdfWidth = 210;
        const pdfHeight = 297; 

        for (let i = 0; i < sheets.length; i++) {
            const sheet = sheets[i];

            // 1. Génération de l'image (Canvas)
            const canvas = await html2canvas(sheet, {
                scale: 3, // Haute résolution pour le PDF
                useCORS: true,
                logging: false,
                backgroundColor: '#FFFFFF'
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);

            if (i > 0) {
                doc.addPage();
            }
            
            // 2. Ajout de l'image au PDF
            // L'image est étirée aux dimensions A4
            doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        doc.save(`planche_codebarres_${new Date().toISOString().slice(0, 10)}.pdf`);
        
        DOMElements.downloadBtn.disabled = false;
        DOMElements.downloadBtn.textContent = 'Télécharger le PDF';
    }


    // -------------------------------------------------------------------------
    // VII. GESTION DU ZOOM DE L'APERÇU
    // -------------------------------------------------------------------------
    
    /**
     * Met à jour le facteur de zoom de l'aperçu.
     */
    function updateZoom() {
        const zoomValue = DOMElements.zoomSlider.value;
        DOMElements.sheetLayer.style.transform = `scale(${zoomValue})`;
        DOMElements.zoomValue.textContent = `${Math.round(zoomValue * 100)}%`;
    }


    // -------------------------------------------------------------------------
    // VIII. GESTION DE LA MODALE D'AIDE
    // -------------------------------------------------------------------------

    function openModal() {
        DOMElements.helpModal.classList.add('open');
    }

    function closeModal() {
        DOMElements.helpModal.classList.remove('open');
    }


    // -------------------------------------------------------------------------
    // IX. ÉCOUTEURS D'ÉVÉNEMENTS
    // -------------------------------------------------------------------------
    
    // Contrôles qui déclenchent la régénération
    [
        DOMElements.codeType, 
        DOMElements.codeScale,
        DOMElements.marginTop, 
        DOMElements.marginLeft, 
        DOMElements.nbCols, 
        DOMElements.nbRows, 
        DOMElements.rowHeight,
        DOMElements.arrowOption
    ].forEach(element => element.addEventListener('input', generateSheets));

    DOMElements.gridPresetSelect.addEventListener('change', (e) => {
        applyPreset(e.target.value);
        // Réinitialise à la valeur "Personnalisé" après l'application du preset pour permettre des ajustements manuels
        DOMElements.gridPresetSelect.value = 'perso'; 
    });


    // Zoom et Téléchargement
    DOMElements.zoomSlider.addEventListener('input', updateZoom);
    DOMElements.downloadBtn.addEventListener('click', generatePDF);


    // Modale
    DOMElements.helpButton.addEventListener('click', openModal);
    DOMElements.closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === DOMElements.helpModal) {
            closeModal();
        }
    });


    // -------------------------------------------------------------------------
    // X. INITIALISATION
    // -------------------------------------------------------------------------

    // 1. Remplir les presets
    populatePresets();

    // 2. Appliquer le zoom initial
    updateZoom();

    // 3. Générer l'aperçu initial (doit afficher le message d'attente)
    generateSheets(); 

}); // Fin de DOMContentLoaded
