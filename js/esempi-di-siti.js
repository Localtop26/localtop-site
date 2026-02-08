(() => {
  "use strict";

  const DATA_URL = "/data/demos.json";

  const grid = document.getElementById("examplesGrid");
  const chips = Array.from(document.querySelectorAll(".examplesChips .chip"));

  if (!grid || chips.length === 0) return;

  const state = {
    all: [],
    category: chips[0].dataset.category || "",
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

    const mediaLink = document.createElement("a");
    mediaLink.className = "demoCard__mediaLink";
    mediaLink.href = demo.href;
    mediaLink.setAttribute("aria-label", `Vedi sito: ${demo.title}`);

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
    mediaLink.appendChild(media);

    const body = document.createElement("div");
    body.className = "demoCard__body";

    const title = document.createElement("h3");
    title.className = "demoCard__title";
    const titleLink = document.createElement("a");
    titleLink.className = "demoCard__titleLink";
    titleLink.href = demo.href;
    titleLink.textContent = demo.title;
    titleLink.setAttribute("aria-label", `Vedi sito: ${demo.title}`);
    title.appendChild(titleLink);

    const cat = document.createElement("div");
    cat.className = "demoCard__cat";
    cat.textContent = (demo.category || "").toUpperCase();

    const btnWrap = document.createElement("div");
    btnWrap.className = "demoCard__actions";

    const btnView = document.createElement("a");
    btnView.className = "btn demoCard__btn";
    btnView.href = demo.href;
    btnView.textContent = "Vedi sito";
    btnView.setAttribute("aria-label", `Vedi sito: ${demo.title}`);

    const btnActivate = document.createElement("a");
    btnActivate.className = "btn primary demoCard__btn";
    btnActivate.href = "https://localtop.it/checkout";
    btnActivate.textContent = "Attiva Servizio";
    btnActivate.setAttribute("aria-label", "Attiva Servizio");

    btnWrap.appendChild(btnView);
    btnWrap.appendChild(btnActivate);
    body.appendChild(title);
    body.appendChild(cat);
    body.appendChild(btnWrap);

    card.appendChild(mediaLink);
    card.appendChild(body);
    return card;
  }

  function render() {
    const filtered = getFiltered();

    grid.innerHTML = "";
    filtered.forEach((d) => grid.appendChild(createCard(d)));
  }

  function onChipClick(e) {
    const btn = e.currentTarget;
    const category = btn.dataset.category || "";
    state.category = category;
    setActiveChip(category);
    render();
  }

  chips.forEach((btn) => btn.addEventListener("click", onChipClick));

  fetch(DATA_URL, { cache: "no-store" })
    .then((r) => r.ok ? r.json() : Promise.reject(new Error("Failed to load demos.json")))
    .then((data) => {
      state.all = Array.isArray(data.demos) ? data.demos : [];
      setActiveChip(state.category);
      render();
    })
    .catch(() => {
      grid.innerHTML = "<div class=\"examplesError\">Impossibile caricare le demo in questo momento.</div>";
    });
})();