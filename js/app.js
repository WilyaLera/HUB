lucide.createIcons();
const onglets = document.querySelectorAll(".onglet");
console.log(onglets);

onglets.forEach((onglet) => {
    onglet.addEventListener("click", () => {
        onglets.forEach((o) => o.classList.remove("actif"));
        onglet.classList.add("actif");
    });
});