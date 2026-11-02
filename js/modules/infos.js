// =====================================================
// Les boutons ⓘ
// Les explications utiles une fois, mais encombrantes au quotidien,
// sont cachées. Le petit « i » les montre ou les cache.
//
// Dans le HTML, il suffit d'écrire :
//   <button class="bouton-info" data-info="mon-info">i</button>
//   <p id="mon-info" class="info" hidden>Le texte d'explication</p>
// =====================================================

document.querySelectorAll(".bouton-info").forEach((bouton) => {
  const info = document.getElementById(bouton.dataset.info);
  bouton.setAttribute("aria-expanded", "false");

  bouton.addEventListener("click", () => {
    // Si c'est caché, on montre ; si c'est montré, on cache
    info.hidden = !info.hidden;
    bouton.classList.toggle("ouvert", !info.hidden);
    bouton.setAttribute("aria-expanded", String(!info.hidden));
  });
});
