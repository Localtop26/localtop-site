(() => {
  "use strict";

  const DATA_URL = "/data/demos.json";
  const CHECKOUT_URL = "https://localtop.it/checkout";

  const grid = document.getElementById("examplesGrid");
  const chips = Array.from(document.querySelectorAll(".examplesChips .chip"));

  if (!grid || chips.length === 0) return;

  const initialCategory = (chips[0].dataset.category || "").trim();
  const state = {
    all: [],
    category: initialCategory
  };

  function setActiveChip(category) {
    chips.forEach((btn) => {
      const isActive = btn.dataset.category === category;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });
  }

  function getFiltered() {
    return state.all.filter((d) => d.category === state.category);
  }

  function createCard(demo) {
    const card = document.createElement("article");
    card.className = "demoCard";

    const cover = document.createElement("a");
    cover.className = "demoCard__cover";
    cover.href = demo.href;
    cover.target = "_blank";
    cover.rel = "noopener";
    cover.setAttribute("aria-label", `Vedi sito: ${demo.title}`);

    const media = document.createElement("div");
    media.className = "demoCard__media";

    const img = document.createElement("img");
    img.className = "demoCard__img";
    img.loading = "lazy";
    img.alt = `Anteprima ${demo.title}`;
    img.src = demo.thumb;

    img.addEventListener("error", () => {
      img.remove();
      media.classList.add("is-missing");
    });

    media.appendChild(img);
    cover.appendChild(media);

    const body = document.createElement("div");
    body.className = "demoCard__body";

    const title = document.createElement("h3");
    title.className = "demoCard__title";

    const titleLink = document.createElement("a");
    titleLink.className = "demoCard__titleLink";
    titleLink.href = demo.href;
    titleLink.target = "_blank";
    titleLink.rel = "noopener";
    titleLink.textContent = demo.title;

    title.appendChild(titleLink);

    const cat = document.createElement("div");
    cat.className = "demoCard__cat";
    cat.textContent = (demo.category || "").toUpperCase();

    const actions = document.createElement("div");
    actions.className = "demoCard__actions";

    const viewBtn = document.createElement("a");
    viewBtn.className = "btn demoCard__btn";
    viewBtn.href = demo.href;
    viewBtn.target = "_blank";
    viewBtn.rel = "noopener";
    viewBtn.textContent = "Vedi sito";

    const activateBtn = document.createElement("a");
    activateBtn.className = "btn primary demoCard__btn";
    activateBtn.href = CHECKOUT_URL;
    activateBtn.target = "_blank";
    activateBtn.rel = "noopener";
    activateBtn.textContent = "Attiva Servizio";

    actions.appendChild(viewBtn);
    actions.appendChild(activateBtn);

    body.appendChild(title);
    body.appendChild(cat);
    body.appendChild(actions);

    card.appendChild(cover);
    card.appendChild(body);

    return card;
  }

  function render() {
    const filtered = getFiltered();
    grid.innerHTML = "";
    filtered.forEach((demo) => grid.appendChild(createCard(demo)));
  }

  function onChipClick(e) {
    const btn = e.currentTarget;
    const category = (btn.dataset.category || "").trim();
    if (!category || category === state.category) return;

    state.category = category;
    setActiveChip(category);
    render();
  }

  chips.forEach((btn) => btn.addEventListener("click", onChipClick));

  fetch(DATA_URL, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load demos.json"))))
    .then((data) => {
      state.all = Array.isArray(data.demos) ? data.demos : [];
      setActiveChip(state.category);
      render();
    })
    .catch(() => {
      grid.innerHTML = '<div class="examplesError">Impossibile caricare le demo in questo momento.</div>';
    });
})();