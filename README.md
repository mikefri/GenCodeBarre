🏷️ GenCodeBarres v2.3 - Générateur de Planches d'Étiquettes
GenCodeBarres v2.3 est une solution web performante conçue pour la production rapide et massive de codes-barres et de QR Codes. L'outil organise vos données en planches d'étiquettes millimétrées prêtes à l'impression, idéal pour les inventaires et la gestion logistique.

[!IMPORTANT] Confidentialité totale : Aucune donnée n'est envoyée vers un serveur. Le traitement Excel et la génération de PDF se font exclusivement en local dans votre navigateur.

🚀 Workflow Utilisateur
Import : Glissez votre fichier .xlsx (les codes doivent être en colonne A).

Setup : Choisissez votre format de code et votre grille (Avery, Agipa, ou sur-mesure).

Export : Imprimez directement ou générez un PDF multi-pages optimisé.

📱 Utilisation Hors-ligne (PWA)
Ce projet est une Progressive Web App. Vous pouvez :

L'installer sur votre bureau (Chrome/Edge) ou écran d'accueil (iOS/Android).

L'utiliser sans connexion internet une fois la première visite effectuée, idéal pour les environnements de stockage ou entrepôts.

✨ Fonctionnalités Clés
Importation en Lot : Chargement massif via fichier Excel (.xlsx) ou saisie manuelle.

Types de Codes Supportés :

Code 128 : Standard universel pour la logistique.

EAN-13 : Pour la distribution (avec calcul automatique du chiffre de contrôle).

QR Code : Pour les liens URL ou informations complexes.

Configuration de Grille Avancée :

Presets intégrés pour planches standards (ex: 3x8, 4x10).

Marges (Haut/Gauche) et hauteur d'étiquette réglables au millimètre (mm).

Fonctionnalité d'Orientation : Option d'ajouter une flèche directionnelle pour faciliter la pose des étiquettes.

Exportation Pro : Aperçu temps réel, export PDF multi-pages et impression directe via CSS Media Queries.

🛠️ Stack Technique
Ce projet est une application web statique utilisant les bibliothèques suivantes :

| Composant | Description | Librairie Utilisée |
| :--- | :--- | :--- |
| **Génération Code-barres** | Code 128, EAN-13 | `JsBarcode` |
| **Génération QR Code** | QR Code | `qrcode.js` |
| **Lecture Excel** | Importation de données en masse | `xlsx.js` (SheetJS) |
| **Exportation PDF** | Conversion du HTML/SVG/Canvas en PDF | `html2canvas` et `jspdf` |
| **UI/UX** | Thème sombre (Slate) et mise en page réactive. | HTML / CSS / JavaScript |

📦 Installation et Démarrage
Le projet est entièrement client-side et ne nécessite pas de serveur :

Téléchargez les fichiers sources (index.html, plaquettes.js, plaquettes.css, manifest.json, sw.js).

Assurez-vous d'avoir une connexion pour le premier chargement des dépendances via CDN (ou téléchargez-les localement).

Ouvrez le fichier HTML dans votre navigateur ou cliquez sur "Installer" via la barre d'adresse pour le mode PWA.

✍️ Guide d'Utilisation
1. Préparation des Données
Listez vos codes dans la Colonne A d'un fichier Excel.

Glissez-déposez le fichier dans la zone "Import .xlsx". Le compteur affichera le nombre de codes détectés.

2. Configuration & Aperçu
Sélectionnez un Modèle prédéfini ou ajustez les dimensions manuellement pour correspondre à vos planches d'étiquettes vierges.

Utilisez le curseur de Zoom pour inspecter le rendu. Cela n'affecte en rien l'échelle réelle lors de l'impression.

3. Impression et Exportation
Télécharger le PDF : Génère un fichier multi-pages fidèle à votre configuration.

Imprimer : Ouvre le dialogue d'impression système. Le style CSS dédié masque automatiquement l'interface utilisateur pour ne laisser que les planches.

Développé pour l'efficacité logistique et le respect de la vie privée.
