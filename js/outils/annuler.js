// =====================================================
// Le petit message… et son bouton « Annuler »
// Au lieu de demander « Tu es sûre ? » avant de supprimer, on supprime
// tout de suite, et on propose d'annuler pendant quelques secondes.
// =====================================================

const petitMessage = document.getElementById("petit-message");
const petitMessageTexte = document.getElementById("petit-message-texte");
const petitMessageAnnuler = document.getElementById("petit-message-annuler");
let minuteurMessage = null;
let quandOnAnnule = null; // ce qu'il faut faire si on touche « Annuler »

// Montre un petit message en bas. Avec une fonction « annuler » :
// le bouton Annuler apparaît, et le message reste un peu plus longtemps.
function montrerPetitMessage(texte, annuler) {
  petitMessageTexte.textContent = texte;
  quandOnAnnule = annuler || null;
  petitMessageAnnuler.hidden = !annuler;
  petitMessage.hidden = false;

  // S'il y avait déjà un message, on repart de zéro
  clearTimeout(minuteurMessage);
  minuteurMessage = setTimeout(cacherPetitMessage, annuler ? 5000 : 2000);
}

function cacherPetitMessage() {
  petitMessage.hidden = true;
  quandOnAnnule = null;
}

petitMessageAnnuler.addEventListener("click", () => {
  if (quandOnAnnule) quandOnAnnule();
  cacherPetitMessage();
  montrerPetitMessage("C'est annulé 🌱");
});

// Remet un tiroir (budget, agenda…) exactement comme il était.
// On garde le même objet et on remplace son contenu : comme ça,
// ça marche même pour un « const ».
function remettreCommeAvant(tiroir, copie) {
  Object.keys(tiroir).forEach((cle) => delete tiroir[cle]);
  Object.assign(tiroir, JSON.parse(copie));
}

// Fait une action qu'on pourra annuler :
//   tiroir  : l'objet qui va changer (budget ou agenda)
//   message : le texte à afficher (« Supprimé »)
//   action  : ce qu'on fait
//   apres   : sauvegarder + réafficher (après l'action, et après l'annulation)
function agirAvecAnnuler({ tiroir, message, action, apres }) {
  const copie = JSON.stringify(tiroir); // une photo du tiroir avant
  action();
  apres();
  montrerPetitMessage(message, () => {
    remettreCommeAvant(tiroir, copie);
    apres();
  });
}
