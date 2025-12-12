document.addEventListener('DOMContentLoaded', () => {

    // --- VARIABLES GLOBALES ---
    let appData = []; // Stocke les données importées (codes)
    let currentGridPreset = null; // Stocke le preset de grille sélectionné
    
    // Structure pour stocker les presets
    const gridPresets = [
        { name: "Avery L7160 (65 étiquettes)", mt: 4.8, ml: 4.8, cols: 5, rows: 13, lh: 38.1 / 2 },
        { name: "Avery L7162 (16 étiquettes)", mt: 15, ml: 15, cols: 4, rows: 4, lh: 70 / 2 },
        { name: "Avery L7163 (14 étiquettes)", mt: 15, ml: 15, cols: 2, rows: 7, lh: 99.1 / 2 },
        { name: "Standard 3x8 (36mm Haut)", mt: 4.5, ml: 5, cols: 3, rows: 8, lh: 36 },
        { name: "Standard 2x5 (50mm Haut)", mt: 10, ml: 10, cols: 2, rows: 5, lh: 50 },
    ];


    // --- RÉFÉRENCES DOM ---
    const refs = {
        // Data & Import
        excelInput: document.getElementById('excelInput'),
        dropZone: document.getElementById('dropZone'),
        importStatus: document.getElementById('importStatus'),
        importCount: document.getElementById('importCount'),
        clearBtn: document.getElementById('clearDataBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        
        // AJOUT: Saisie Manuelle
        manualInput: document.getElementById('manualInput'), 

        // Rendu
        sheetLayer: document.getElementById('sheetLayer'),
        pageSheet: document.getElementById('pageSheet'),
        zoomSlider: document.getElementById('zoomSlider'),
        // AJOUT: Affichage du Zoom
        zoomValue: document.getElementById('zoomValue'),
        
        // Inputs Config
        marginTop: document.getElementById('marginTop'),
        marginLeft: document.getElementById('marginLeft'),
        nbCols: document.getElementById('nbCols'),
        nbRows: document.getElementById('nbRows'),
        rowHeight: document.getElementById('rowHeight'),
        codeScale: document.getElementById('codeScale'),
        codeType: document.getElementById('codeType'),
        arrowOption: document.getElementById('arrowOption'),
        
        // Presets
        gridPresetSelect: document.getElementById('gridPresetSelect'),
        
        // Help Modal
        helpButton: document.getElementById('helpButton'),
        helpModal: document.getElementById('helpModal'),
        closeModalBtn: document.getElementById('closeModalBtn'),
    };

    // Initialisation de la référence dynamique de la grille
    let gridContainer = refs.pageSheet.querySelector('.grid-container');

    // --- GESTION DU ZOOM ---
    refs.zoomSlider.addEventListener('input', (e) => {
        const scale = parseFloat(e.target.value);
        // 1. Mettre à jour l'échelle visuelle
        refs.sheetLayer.style.transform = `scale(${scale})`;

        // 2. Mettre à jour le pourcentage affiché
        const percentage = Math.round(scale * 100);
        refs.zoomValue.textContent = `${percentage}%`;
    });

    // --- GESTION DE LA MODALE D'AIDE ---
    refs.helpButton.addEventListener('click', () => {
        refs.helpModal.classList.add('open');
    });

    refs.closeModalBtn.addEventListener('click', () => {
        refs.helpModal.classList.remove('open');
    });

    refs.helpModal.addEventListener('click', (e) => {
        if (e.target === refs.helpModal) {
            refs.helpModal.classList.remove('open');
        }
    });

    // --- GESTION DES PRESETS DE GRILLE ---

    function populatePresets() {
        gridPresets.forEach((preset, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = preset.name;
            refs.gridPresetSelect.appendChild(option);
        });
    }

    refs.gridPresetSelect.addEventListener('change', (e) => {
        const index = parseInt(e.target.value);
        if (!isNaN(index) && gridPresets[index]) {
            currentGridPreset = gridPresets[index];
            refs.marginTop.value = currentGridPreset.mt;
            refs.marginLeft.value = currentGridPreset.ml;
            refs.nbCols.value = currentGridPreset.cols;
            refs.nbRows.value = currentGridPreset.rows;
            refs.rowHeight.value = currentGridPreset.lh;
        } else {
            currentGridPreset = null;
        }
        updateGridCSS();
        renderBarcodes();
    });
    
    // --- GESTION DES CHANGEMENTS D'INPUTS ---

    function updateGridCSS() {
        // Mise à jour des variables CSS de la première feuille (modèle)
        refs.pageSheet.style.setProperty('--mt', `${refs.marginTop.value}mm`);
        refs.pageSheet.style.setProperty('--ml', `${refs.marginLeft.value}mm`);
        refs.pageSheet.style.setProperty('--cols', refs.nbCols.value);
        refs.pageSheet.style.setProperty('--rows', refs.nbRows.value);
        refs.pageSheet.style.setProperty('--lh', `${refs.rowHeight.value}mm`);
        
        // Mettre à jour les variables pour toutes les pages générées dynamiquement
        refs.sheetLayer.querySelectorAll('.sheet').forEach(sheet => {
            sheet.style.setProperty('--mt', `${refs.marginTop.value}mm`);
            sheet.style.setProperty('--ml', `${refs.marginLeft.value}mm`);
            sheet.style.setProperty('--cols', refs.nbCols.value);
            sheet.style.setProperty('--rows', refs.nbRows.value);
            sheet.style.setProperty('--lh', `${refs.rowHeight.value}mm`);
        });

        // Régénérer le conteneur de grille si nécessaire (pour prendre en compte les nouvelles colonnes/lignes)
        if (gridContainer) {
             gridContainer.style.gridTemplateColumns = `repeat(${refs.nbCols.value}, 1fr)`;
             gridContainer.style.gridTemplateRows = `repeat(${refs.nbRows.value}, ${refs.rowHeight.value}mm)`;
        }
    }

    // Événements pour les modifications qui affectent la grille ou le rendu
    [refs.marginTop, refs.marginLeft, refs.nbCols, refs.nbRows, refs.rowHeight, refs.codeScale, refs.codeType, refs.arrowOption].forEach(input => {
        input.addEventListener('change', () => {
            updateGridCSS();
            renderBarcodes();
        });
    });

    // --- GESTION DE LA SAISIE MANUELLE (AJOUT) ---
    refs.manualInput.addEventListener('input', () => {
        // Vider les données Excel si l'utilisateur commence à saisir manuellement
        if (appData.length > 0) {
            appData = [];
            refs.excelInput.value = ""; // Réinitialiser le champ de fichier
        }
        // Rendre les codes immédiatement
        renderBarcodes();
    });


    // --- OBTENIR TOUTES LES DONNÉES DISPONIBLES (MANUEL OU EXCEL) ---
    function getCombinedData() {
        // 1. Récupérer les données de la saisie manuelle
        const manualData = refs.manualInput.value
            .split('\n') // Sépare par ligne
            .map(line => line.trim()) // Nettoie chaque ligne
            .filter(code => code !== ""); // Filtre les lignes vides

        let dataToUse;
        let source;

        if (appData.length > 0) { // Priorité 1: Données Excel
            dataToUse = appData;
            source = 'Excel';
        } else if (manualData.length > 0) { // Priorité 2: Données Manuelles
            dataToUse = manualData;
            source = 'Manuel';
        } else {
            dataToUse = [];
            source = 'Aucune';
        }

        // Mise à jour de l'interface et gestion de l'état
        if (dataToUse.length > 0) {
            refs.importStatus.style.display = 'block';
            refs.clearBtn.style.display = 'inline-flex';
            const totalPages = Math.ceil(dataToUse.length / (parseInt(refs.nbCols.value) * parseInt(refs.nbRows.value)));
            refs.importCount.textContent = `${dataToUse.length} codes chargés (${source}), répartis sur ${totalPages} planches.`;
            
            // Gestion de la désactivation/activation de l'autre source
            if (source === 'Excel') {
                refs.manualInput.disabled = true;
                refs.manualInput.style.opacity = '0.5';
            } else { // Source Manuel ou Aucune
                refs.manualInput.disabled = false;
                refs.manualInput.style.opacity = '1';
                refs.dropZone.style.display = 'block'; // S'assurer que la zone de drop est visible
            }
            
        } else {
            refs.importStatus.style.display = 'none';
            refs.clearBtn.style.display = 'none';
            refs.manualInput.disabled = false;
            refs.manualInput.style.opacity = '1';
        }
        
        return dataToUse;
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
        const codeType = refs.codeType.value;
        const arrowOption = refs.arrowOption.value;

        // Utiliser la nouvelle fonction pour obtenir les données
        let dataToUse = getCombinedData(); 
        
        const isDemo = dataToUse.length === 0;

        if (isDemo) { 
            // Si aucune donnée utilisateur, afficher l'exemple sur la première cellule
            dataToUse = ["EXEMPLE-1"];
        }

        if (dataToUse.length === 0) {
            refs.pageSheet.innerHTML = '<div id="gridContainer" class="grid-container"><div class="barcode-cell" style="color:#aaa; font-size:0.8rem;">(Zone d\'aperçu - Importez ou saisissez des codes)</div></div>';
            gridContainer = document.getElementById('gridContainer');
            updateGridCSS(); // S'assurer que le style est appliqué même à la grille vide
            return;
        }

        const totalPages = Math.ceil(dataToUse.length / labelsPerPage);
        const fragment = document.createDocumentFragment();

        for (let page = 0; page < totalPages; page++) {
            let sheet;
            if (page === 0) {
                // Utiliser la feuille existante pour la première page
                sheet = refs.pageSheet;
                sheet.innerHTML = '';
            } else {
                // Cloner la feuille pour les pages suivantes
                sheet = refs.pageSheet.cloneNode(false);
                sheet.removeAttribute('id');
            }
            
            // Créer le conteneur de grille
            const newGridContainer = document.createElement('div');
            newGridContainer.className = 'grid-container';
            sheet.appendChild(newGridContainer);
            
            // Appliquer les variables CSS à la nouvelle page
            updateGridCSS.call({ sheet });
            
            const startIdx = page * labelsPerPage;
            const endIdx = Math.min(startIdx + labelsPerPage, dataToUse.length);

            for (let i = startIdx; i < endIdx; i++) {
                const codeValue = dataToUse[i];
                const cell = document.createElement('div');
                cell.className = 'barcode-cell';

                // Gestion de la flèche (Arrow Option)
                if (arrowOption !== 'none') {
                    const arrow = document.createElement('span');
                    arrow.style.fontSize = `${scale * 15}px`; // Taille de la flèche
                    arrow.textContent = arrowOption === 'line-up' ? '▲' : '▼';
                    arrow.style.color = '#333';
                    arrow.style.marginRight = '5px';
                    cell.appendChild(arrow);
                }

                if (codeType === 'QRCODE') {
                    // QR Code
                    const canvas = document.createElement('canvas');
                    cell.appendChild(canvas);
                    QRCode.toCanvas(canvas, codeValue, { errorCorrectionLevel: 'H', scale: scale * 2.5, margin: 1 }, function (error) {
                        if (error) console.error(error);
                    });
                } else {
                    // Code 128 / EAN-13
                    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.setAttribute('class', 'barcode');
                    cell.appendChild(svg);
                    
                    let finalCode = codeValue;
                    
                    if (codeType === 'EAN13') {
                        // S'assurer que le code a 12 ou 13 chiffres
                        if (finalCode.length === 12) {
                             // Calculer et ajouter la clé de contrôle si 12 chiffres
                            finalCode = calculateEAN13CheckDigit(finalCode);
                        } else if (finalCode.length !== 13) {
                            // Ignorer les codes EAN13 mal formatés
                            cell.innerHTML = `<span style="color:red; font-size:0.7rem;">EAN13: ${finalCode} (Erreur de longueur)</span>`;
                            continue;
                        }
                    }

                    JsBarcode(svg, finalCode, {
                        format: codeType,
                        displayValue: true,
                        width: scale,
                        height: scale * 35,
                        margin: 0,
                        fontSize: scale * 12,
                        textMargin: scale * 3
                    });
                }
                
                if (page === 0) {
                    refs.pageSheet.querySelector('.grid-container').appendChild(cell);
                } else {
                    newGridContainer.appendChild(cell);
                }
            }
            
            if (page > 0) {
                fragment.appendChild(sheet);
            }
        }
        
        refs.sheetLayer.appendChild(fragment);

        // Mettre à jour la référence du conteneur de grille après le rendu
        gridContainer = refs.pageSheet.querySelector('.grid-container');
    }

    // Fonction de calcul de la clé de contrôle EAN-13 (inchangée)
    function calculateEAN13CheckDigit(code) {
        if (code.length !== 12) return code;
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(code[i]);
            sum += (i % 2 === 0) ? digit : digit * 3;
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        return code + checkDigit;
    }


    // --- GESTION DES FICHIERS (Drag & Drop) ---

    // Prévention du comportement par défaut de Drag and Drop (inchangé)
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        refs.dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Gestion des surlignements (inchangé)
    refs.dropZone.addEventListener('dragenter', () => refs.dropZone.classList.add('highlight'), false);
    refs.dropZone.addEventListener('dragleave', () => refs.dropZone.classList.remove('highlight'), false);
    refs.dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        refs.dropZone.classList.remove('highlight');
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) {
            handleFile(file);
        }
    }

    refs.excelInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    });

    // Fonction de lecture de fichier et mise à jour de appData
    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Filtre colonne A (première colonne)
            // S'assurer que les codes sont des chaînes non nulles et non vides
            appData = json.map(r => String(r[0] || '')).filter(c => c.trim() !== "");
            
            // Vider et désactiver l'entrée manuelle après un import Excel réussi
            refs.manualInput.value = "";
            refs.manualInput.disabled = true;
            refs.manualInput.style.opacity = '0.5';

            renderBarcodes();
        };
        reader.readAsArrayBuffer(file);
    }

    // Clear
    refs.clearBtn.addEventListener('click', () => {
        appData = [];
        refs.manualInput.value = ""; // AJOUT: Effacer la saisie manuelle
        refs.manualInput.disabled = false; // AJOUT: Réactiver la saisie manuelle
        refs.manualInput.style.opacity = '1'; // AJOUT: Style normal
        refs.importStatus.style.display = 'none';
        refs.clearBtn.style.display = 'none';
        refs.excelInput.value = "";
        renderBarcodes();
    });

    // --- GESTION DU TÉLÉCHARGEMENT PDF (html2canvas + jsPDF) ---
    refs.downloadBtn.addEventListener('click', async () => {
        if (refs.downloadBtn.disabled) return;
        refs.downloadBtn.disabled = true;
        refs.downloadBtn.textContent = 'Génération du PDF...';

        try {
            const sheets = refs.sheetLayer.querySelectorAll('.sheet');
            if (sheets.length === 0) {
                 alert("Aucune donnée chargée pour générer un PDF.");
                 return;
            }

            const { jsPDF } = window.jspdf;
            
            // Dimensions A4 en points (standard pour jsPDF)
            const A4_WIDTH_PT = 595.28; 
            const A4_HEIGHT_PT = 841.89;

            const pdf = new jsPDF('p', 'pt', 'a4');

            for (let i = 0; i < sheets.length; i++) {
                const sheet = sheets[i];
                
                // Si ce n'est pas la première page, ajouter une nouvelle page
                if (i > 0) {
                    pdf.addPage();
                }

                // Utiliser html2canvas pour capturer l'élément de la feuille
                const canvas = await html2canvas(sheet, {
                    scale: 3, // Augmenter la résolution pour une meilleure qualité
                    useCORS: true,
                });
                
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                
                // Ajouter l'image de la page au PDF
                pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_PT, A4_HEIGHT_PT);
            }

            pdf.save('planche-code-barres.pdf');

        } catch (error) {
            console.error("Erreur lors de la génération du PDF:", error);
            alert("Une erreur est survenue lors de la génération du PDF.");
        } finally {
            refs.downloadBtn.disabled = false;
            refs.downloadBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg> Télécharger le PDF';
        }
    });


    // --- Init ---
    populatePresets();
    updateGridCSS();
    renderBarcodes(); // Affiche l'exemple au démarrage

    // Initialiser le pourcentage de zoom
    const initialScale = parseFloat(refs.zoomSlider.value);
    const initialPercentage = Math.round(initialScale * 100);
    refs.zoomValue.textContent = `${initialPercentage}%`;
});
