lucide.createIcons();
const onglets = document.querySelectorAll(".onglet");
const ecrans = document.querySelectorAll(".ecran");
console.log(onglets);

onglets.forEach((onglet) => {
    onglet.addEventListener("click", () => {
        onglets.forEach((o) => o.classList.remove("actif"));
        onglet.classList.add("actif");
        ecrans.forEach((e) => e.classList.remove("actif"));
        document.getElementById(onglet.dataset.ecran).classList.add("actif");
    });
});