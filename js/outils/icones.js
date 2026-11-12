// =====================================================
// Les icônes Lucide créées par le JavaScript
// Une icône Lucide, c'est une balise <i data-lucide="nom">. La bibliothèque
// la transforme en vrai dessin quand on appelle lucide.createIcons().
// Pour les icônes ajoutées par le JavaScript, il faut donc le rappeler :
// creerIcone() s'en occupe (une seule fois, juste avant que l'écran se dessine).
// =====================================================

let iconesPrevues = false;

function creerIcone(nom) {
  const icone = document.createElement("i");
  icone.dataset.lucide = nom;
  icone.classList.add("icone");
  if (!iconesPrevues) {
    iconesPrevues = true;
    requestAnimationFrame(() => {
      iconesPrevues = false;
      if (window.lucide) lucide.createIcons();
    });
  }
  return icone;
}
