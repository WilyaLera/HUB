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
