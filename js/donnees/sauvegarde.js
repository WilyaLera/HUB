// =====================================================
// Sauvegarde et restauration de TOUTES les données de l'appli
// Le tiroir (localStorage) vit dans le navigateur : si on le vide,
// tout part. Une sauvegarde, c'est une copie du tiroir dans un fichier
// que tu gardes ailleurs (Drive, mails, dossier du téléphone…).
// =====================================================

// Les tiroirs de l'appli (ajoute ici les futurs modules : "journal", "envies"…)
const TIROIRS_A_SAUVEGARDER = ["budget", "taches", "prenom"];

// Fabrique le contenu de la sauvegarde
function preparerSauvegarde() {
  const donnees = {};
  TIROIRS_A_SAUVEGARDER.forEach((cle) => {
    const texte = localStorage.getItem(cle);
    if (texte !== null) donnees[cle] = JSON.parse(texte);
  });
  return {
    appli: "mon-hub", // pour reconnaître nos fichiers à la restauration
    version: 1,
    date: new Date().toISOString(),
    donnees: donnees,
  };
}

// Télécharge (ou partage, sur téléphone) le fichier de sauvegarde
async function telechargerSauvegarde() {
  const contenu = JSON.stringify(preparerSauvegarde(), null, 2);
  const nomFichier = `mon-hub-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  const fichier = new File([contenu], nomFichier, { type: "application/json" });

  // Sur téléphone : la fenêtre de partage (Drive, mail, Fichiers…)
  // « async / await » : on attend la réponse du téléphone avant de continuer
  if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: "Sauvegarde Mon Hub" });
      noterSauvegardeFaite();
      return;
    } catch (erreur) {
      // Partage annulé : on ne fait rien de plus
      if (erreur.name === "AbortError") return;
    }
  }

  // Sinon (ordinateur) : un téléchargement classique
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(fichier);
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(lien.href);
  noterSauvegardeFaite();
}

function noterSauvegardeFaite() {
  sauvegarder("derniereSauvegarde", Date.now());
  afficherEtatSauvegarde();
  montrerPetitMessage("Sauvegarde prête 🌱");
}

// Lit un fichier de sauvegarde et remet les données dans les tiroirs
function restaurerSauvegarde(fichier) {
  const lecteur = new FileReader();

  lecteur.addEventListener("load", () => {
    let sauvegarde;
    try {
      sauvegarde = JSON.parse(lecteur.result);
    } catch (erreur) {
      alert("Ce fichier n'est pas une sauvegarde de Mon Hub.");
      return;
    }
    if (sauvegarde.appli !== "mon-hub" || !sauvegarde.donnees) {
      alert("Ce fichier n'est pas une sauvegarde de Mon Hub.");
      return;
    }

    const date = new Date(sauvegarde.date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const ok = confirm(
      `Remettre la sauvegarde du ${date} ? Tes données actuelles seront remplacées.`,
    );
    if (!ok) return;

    Object.keys(sauvegarde.donnees).forEach((cle) => {
      sauvegarder(cle, sauvegarde.donnees[cle]);
    });
    sauvegarder("derniereSauvegarde", Date.now());
    // On recharge la page pour tout redessiner avec les données restaurées
    location.reload();
  });

  lecteur.readAsText(fichier);
}

// « Dernière sauvegarde : il y a 3 jours », et un petit rappel si ça fait longtemps
function afficherEtatSauvegarde() {
  const derniere = charger("derniereSauvegarde", null);
  const etat = document.getElementById("etat-sauvegarde");
  const rappel = document.getElementById("rappel-sauvegarde");

  let jours = null;
  if (derniere) {
    jours = Math.floor((Date.now() - derniere) / (24 * 60 * 60 * 1000));
    if (jours === 0) etat.textContent = "Dernière sauvegarde : aujourd'hui 🌱";
    else if (jours === 1) etat.textContent = "Dernière sauvegarde : hier";
    else etat.textContent = `Dernière sauvegarde : il y a ${jours} jours`;
  } else {
    etat.textContent = "Pas encore de sauvegarde.";
  }

  // Le rappel dans Mon mois : s'il y a des dépenses et pas de sauvegarde
  // depuis plus de 14 jours
  const aDesDonnees = budget.depenses.length > 0 || budget.revenus.length > 0;
  rappel.hidden = !aDesDonnees || (jours !== null && jours < 14);
}

document.getElementById("bouton-sauvegarder").addEventListener("click", telechargerSauvegarde);
document.getElementById("bouton-rappel-sauvegarder").addEventListener("click", telechargerSauvegarde);

// Le bouton « Restaurer » ouvre le choix de fichier (caché)
const champFichier = document.getElementById("champ-restaurer");
document.getElementById("bouton-restaurer").addEventListener("click", () => champFichier.click());
champFichier.addEventListener("change", () => {
  if (champFichier.files.length > 0) restaurerSauvegarde(champFichier.files[0]);
  champFichier.value = "";
});
