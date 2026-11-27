function sauvegarder(cle, valeur) {
  localStorage.setItem(cle, JSON.stringify(valeur));
}

function charger(cle, valeurParDefaut) {
  const texte = localStorage.getItem(cle);
  if (texte === null) {
    return valeurParDefaut;
  }
  return JSON.parse(texte);
}

// Une nouvelle personne ? On le sait avant que les modules ne créent leurs tiroirs.
// (Quelqu'un qui a déjà des données n'est pas « nouveau », même sans tiroir « bienvenue ».)
const PREMIERE_VISITE =
  localStorage.getItem("bienvenue") === null &&
  !["agenda", "budget", "repas", "courses", "taches", "prenom", "apparence"].some((cle) => localStorage.getItem(cle) !== null);
if (localStorage.getItem("bienvenue") === null) {
  localStorage.setItem("bienvenue", JSON.stringify({ etat: PREMIERE_VISITE ? "a-faire" : "fait" }));
}
