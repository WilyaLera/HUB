// =====================================================
// Écran Moi : mon prénom et l'apparence
// (les réglages de l'agenda et du budget sont aussi rangés sur cet écran,
// mais leur code reste dans leur module)
// =====================================================

// ---------- Mon prénom ----------

const champPrenom = document.getElementById("champ-prenom");
champPrenom.value = charger("prenom", "");

champPrenom.addEventListener("change", () => {
  const nouveau = champPrenom.value.trim();
  sauvegarder("prenom", nouveau);
  // La salutation de l'accueil change tout de suite (message : dans accueil.js)
  document.getElementById("salutation").textContent = nouveau ? `${message}, ${nouveau}` : message;
  montrerPetitMessage("C'est noté 🌱");
});

// ---------- L'apparence ----------
// Rangée dans le tiroir « apparence » : { theme, texte, calme }
// Elle s'applique sur la balise <html> : data-theme, data-texte, data-calme

const apparence = charger("apparence", { theme: "", texte: "", calme: false });

function appliquerApparence() {
  const racine = document.documentElement;
  racine.dataset.theme = apparence.theme;
  racine.dataset.texte = apparence.texte;
  racine.toggleAttribute("data-calme", apparence.calme);
}

function enregistrerApparence() {
  sauvegarder("apparence", apparence);
  appliquerApparence();
}

document.querySelectorAll('input[name="theme"]').forEach((bouton) => {
  bouton.checked = bouton.value === apparence.theme;
  bouton.addEventListener("change", () => {
    apparence.theme = bouton.value;
    enregistrerApparence();
  });
});

document.querySelectorAll('input[name="taille-texte"]').forEach((bouton) => {
  bouton.checked = bouton.value === apparence.texte;
  bouton.addEventListener("change", () => {
    apparence.texte = bouton.value;
    enregistrerApparence();
  });
});

const caseCalme = document.getElementById("reglage-calme");
caseCalme.checked = apparence.calme;
caseCalme.addEventListener("change", () => {
  apparence.calme = caseCalme.checked;
  enregistrerApparence();
});

appliquerApparence();

// ---------- Les petits liens « … dans Moi » en bas des modules ----------
// Chaque lien porte data-reglages="id de la carte" : on va sur Moi,
// on ouvre la carte et on la fait venir à l'écran.
document.querySelectorAll("[data-reglages]").forEach((lien) => {
  lien.addEventListener("click", () => {
    afficherEcran("moi"); // navigation.js
    const carte = document.getElementById(lien.dataset.reglages);
    carte.open = true;
    carte.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
