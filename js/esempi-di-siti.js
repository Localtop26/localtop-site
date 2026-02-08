(() => {
  "use strict";

  const DATA_URL = "/data/demos.json";

  const grid = document.getElementById("examplesGrid");
  const moreBtn = document.getElementById("examplesMoreBtn");
  const chips = Array.from(document.querySelectorAll(".examplesChips .chip"));

  if (!grid || !moreBtn || chips.length === 0) return;

  const state = {
    all: [],
    category: "Tutti",
    perPage: 10,
    visible: 0
  };

  function setActiveChip(category) {
    chips.forEach((btn) => {
      const isActive = btn.dataset.category === category;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });
  }

  function getFiltered() {
    if (state.category === "Tutti") return state.all;
    return state.all.filter((d) => d.category === state.category);
  }

  function createCard(demo) {
    const card = document.createElement("article");
    card.className = "demoCard";

    const link = document.createElement("a");
    link.className = "demoCard__link";
    link.href = demo.href;
    link.setAttribute("aria-label", `Apri demo: ${demo.title}`);

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

    const body = document.createElement("div");
    body.className = "demoCard__body";

    const title = document.createElement("h3");
    title.className = "demoCard__title";
    title.textContent = demo.title;

    const cat = document.createElement("div");
    cat.className = "demoCard__cat";
    cat.textContent = (demo.category || "").toUpperCase();

    const btnWrap = document.createElement("div");
    btnWrap.className = "demoCard__actions";

    const btn = document.createElement("span");
    btn.className = "btn demoCard__btn";
    btn.textContent = "Apri demo";

    btnWrap.appendChild(btn);
    body.appendChild(title);
    body.appendChild(cat);
    body.appendChild(btnWrap);

    link.appendChild(media);
    link.appendChild(body);

    card.appendChild(link);
    return card;
  }

  function render(reset = false) {
    const filtered = getFiltered();

    if (reset) {
      state.visible = 0;
      grid.innerHTML = "";
    }

    const nextVisible = Math.min(state.visible + state.perPage, filtered.length);
    for (let i = state.visible; i < nextVisible; i++) {
      grid.appendChild(createCard(filtered[i]));
    }
    state.visible = nextVisible;

    moreBtn.hidden = state.visible >= filtered.length;
  }

  function onChipClick(e) {
    const btn = e.currentTarget;
    const category = btn.dataset.category || "Tutti";
    state.category = category;
    setActiveChip(category);
    render(true);
  }

  chips.forEach((btn) => btn.addEventListener("click", onChipClick));
  moreBtn.addEventListener("click", () => render(false));

  fetch(DATA_URL, { cache: "no-store" })
    .then((r) => r.ok ? r.json() : Promise.reject(new Error("Failed to load demos.json")))
    .then((data) => {
      state.all = Array.isArray(data.demos) ? data.demos : [];
      if (typeof data.perPage === "number" && data.perPage > 0) state.perPage = data.perPage;
      setActiveChip(state.category);
      render(true);
    })
    .catch(() => {
      grid.innerHTML = "<div class=\"examplesError\">Impossibile caricare le demo in questo momento.</div>";
      moreBtn.hidden = true;
    });
})();