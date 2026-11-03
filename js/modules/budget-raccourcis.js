// =====================================================
// Module Budget — les raccourcis de saisie
// « Courses du samedi · 15 000 F » : un toucher remplit le montant
// et le bocal dans la feuille « Nouvelle dépense ».
//   1. dans la feuille : les pastilles de raccourcis
//   2. dans Mon budget : la carte « Mes raccourcis » (ajouter, modifier, supprimer)
// =====================================================

// ---------- 1. Dans la feuille « Nouvelle dépense » ----------

function afficherRaccourcisDansFeuille(visible) {
  const zone = document.getElementById("zone-raccourcis");
  zone.replaceChildren();
  zone.hidden = !visible || budget.raccourcis.length === 0;

  budget.raccourcis.forEach((raccourci) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.classList.add("pastille", "pastille-raccourci");
    bouton.textContent = `${raccourci.nom} · ${formaterMontant(raccourci.montant)}`;

    // Un toucher : le montant, le bocal, la note et « payé par » se remplissent
    bouton.addEventListener("click", () => {
      depenseMontant.value = raccourci.montant;
      if (budget.bocaux.some((b) => b.id === raccourci.bocalId)) {
        depenseBocal.value = raccourci.bocalId;
      }
      depenseNote.value = raccourci.nom;
      if (budget.reglages.aDeux && raccourci.payePar) {
        depensePayePar.value = raccourci.payePar;
      }
      // On montre quel raccourci est choisi
      zone.querySelectorAll(".pastille-raccourci").forEach((p) => p.classList.remove("choisi"));
      bouton.classList.add("choisi");
    });

    zone.appendChild(bouton);
  });
}

// ---------- 2. La carte « Mes raccourcis » ----------

const listeRaccourcis = document.getElementById("liste-raccourcis");
const formRaccourci = document.getElementById("form-raccourci");
const raccourciNom = document.getElementById("raccourci-nom");
const raccourciMontant = document.getElementById("raccourci-montant");
const raccourciBocal = document.getElementById("raccourci-bocal");
const raccourciPayePar = document.getElementById("raccourci-paye-par");

let raccourciEnModification = null;

function afficherRaccourcis() {
  rangerFormulaire(formRaccourci);
  listeRaccourcis.replaceChildren();

  budget.raccourcis.forEach((raccourci) => {
    let detail = nomBocal(raccourci.bocalId);
    if (budget.reglages.aDeux && raccourci.payePar === "commun") {
      detail = `${detail} · compte commun`;
    }

    const ligne = creerLigneBudget(
      raccourci.nom,
      detail,
      formaterMontant(raccourci.montant),
      () => modifierRaccourci(raccourci),
      () => {
        budget.raccourcis = budget.raccourcis.filter((r) => r.id !== raccourci.id);
        sauvegarderBudget();
        fermerRaccourci();
      },
    );
    listeRaccourcis.appendChild(ligne);

    if (raccourci.id === raccourciEnModification) {
      ligne.classList.add("en-cours");
      ligne.after(formRaccourci);
    }
  });

  if (budget.raccourcis.length === 0) {
    const vide = document.createElement("p");
    vide.classList.add("sous-titre");
    vide.textContent = "Pas encore de raccourci. Tes dépenses qui reviennent souvent ?";
    listeRaccourcis.appendChild(vide);
  }
}

// Les menus du formulaire (bocaux et « payé par »)
function remplirMenusRaccourci(bocalId, payePar) {
  remplirMenuBocaux(raccourciBocal, bocalId, null);
  remplirMenuPayePar(raccourciPayePar, payePar || (budget.reglages.aDeux ? "commun" : "moi"), false);
}

function modifierRaccourci(raccourci) {
  if (raccourciEnModification === raccourci.id) {
    fermerRaccourci();
    return;
  }
  raccourciEnModification = raccourci.id;
  raccourciNom.value = raccourci.nom;
  raccourciMontant.value = raccourci.montant;
  remplirMenusRaccourci(raccourci.bocalId, raccourci.payePar);
  ouvrirModification(formRaccourci, raccourci.nom);
  afficherRaccourcis();
}

function fermerRaccourci() {
  raccourciEnModification = null;
  fermerFormulaire(formRaccourci);
  afficherRaccourcis();
}

boutonAjoutDe(formRaccourci).addEventListener("click", () => {
  fermerRaccourci();
  ouvrirAjout(formRaccourci);
  remplirMenusRaccourci(budget.reglages.dernierBocal, null);
});
formRaccourci.querySelector(".bouton-annuler").addEventListener("click", fermerRaccourci);

formRaccourci.addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const nom = raccourciNom.value.trim();
  const montant = Number(raccourciMontant.value);
  if (!nom || montant <= 0) return;

  const valeurs = {
    nom: nom,
    montant: montant,
    bocalId: Number(raccourciBocal.value),
    payePar: budget.reglages.aDeux ? raccourciPayePar.value : "moi",
  };

  if (raccourciEnModification) {
    const raccourci = budget.raccourcis.find((r) => r.id === raccourciEnModification);
    Object.assign(raccourci, valeurs);
  } else {
    budget.raccourcis.push({ id: nouvelId(), ...valeurs });
  }
  sauvegarderBudget();
  fermerRaccourci();
});
