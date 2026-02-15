(() => {
  "use strict";

  const DATA_URL = "/data/demos.json";

  const grid = document.getElementById("examplesGrid");
  const searchInput = document.getElementById("examplesSearch");
  const categorySelect = document.getElementById("examplesCategory");

  if (!grid || !searchInput || !categorySelect) return;

  const PAGE_SIZE = 12;

  const state = {
    all: [],
    category: "",
    q: "",
    visible: PAGE_SIZE,
  };

  let loadMoreWrap = null;
  let loadMoreBtn = null;

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function buildHaystack(demo) {
    const parts = [
      demo.title,
      demo.category,
      demo.slug,
    ];

    if (Array.isArray(demo.tags)) {
      parts.push(demo.tags.join(" "));
    }

    return normalizeText(parts.join(" "));
  }

  function matchesQuery(demo, q) {
    if (!q) return true;
    return (demo.__hay || "").includes(q);
  }

  function getFiltered() {
    const q = state.q;
    const cat = state.category;

    return state.all
      .filter((d) => (cat ? d.category === cat : true))
      .filter((d) => matchesQuery(d, q));
  }

  function sortAZ(list) {
    return list.slice().sort((a, b) => {
      const at = String(a.title || "");
      const bt = String(b.title || "");
      return at.localeCompare(bt, "it", { sensitivity: "base" });
    });
  }

  function createCard(demo) {
    const card = document.createElement("article");
    card.className = "demoCard";

    const mediaLink = document.createElement("a");
    mediaLink.className = "demoCard__mediaLink";
    mediaLink.href = demo.href;
    mediaLink.target = "_self";
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
    title.textContent = demo.title;

    const btnWrap = document.createElement("div");
    btnWrap.className = "demoCard__actions";

    const btnView = document.createElement("a");
    btnView.className = "btn demoCard__btn";
    btnView.href = demo.href;
    btnView.target = "_self";
    btnView.textContent = "Vedi sito";
    btnView.setAttribute("aria-label", `Vedi sito: ${demo.title}`);

    const btnActivate = document.createElement("a");
    btnActivate.className = "btn primary demoCard__btn";
    btnActivate.href = "https://localtop.it/checkout";
    btnActivate.target = "_self";
    btnActivate.textContent = "Attiva il Servizio";
    btnActivate.setAttribute("aria-label", "Attiva il Servizio");

    btnWrap.appendChild(btnView);
    btnWrap.appendChild(btnActivate);
    body.appendChild(title);
    body.appendChild(btnWrap);

    card.appendChild(mediaLink);
    card.appendChild(body);
    return card;
  }

  function ensureLoadMore() {
    if (loadMoreWrap) return;

    loadMoreWrap = document.createElement("div");
    loadMoreWrap.className = "examplesLoadMoreWrap";

    loadMoreBtn = document.createElement("button");
    loadMoreBtn.type = "button";
    loadMoreBtn.className = "btn examplesLoadMoreBtn";
    loadMoreBtn.textContent = "Mostra altri";

    loadMoreBtn.addEventListener("click", () => {
      state.visible = Math.min(state.visible + PAGE_SIZE, state._filteredCount || state.visible + PAGE_SIZE);
      render();
    });

    loadMoreWrap.appendChild(loadMoreBtn);
    grid.parentNode.appendChild(loadMoreWrap);
  }

  function updateLoadMore(filteredCount) {
    state._filteredCount = filteredCount;

    if (!loadMoreWrap) return;
    const shouldShow = filteredCount > state.visible;
    loadMoreWrap.style.display = shouldShow ? "" : "none";
  }

  function render() {
    const filtered = sortAZ(getFiltered());
    const total = filtered.length;

    ensureLoadMore();

    grid.innerHTML = "";
    if (total === 0) {
      grid.innerHTML = "<div class=\"examplesError\">Nessuna demo trovata con i filtri selezionati.</div>";
      updateLoadMore(0);
      return;
    }

    const visibleItems = filtered.slice(0, state.visible);
    visibleItems.forEach((d) => grid.appendChild(createCard(d)));
    updateLoadMore(total);
  }

  function populateCategories() {
    const cats = Array.from(
      new Set(state.all.map((d) => d.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));

    categorySelect.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "Tutte le categorie";
    categorySelect.appendChild(optAll);

    cats.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });
  }

  function resetAndRender() {
    state.visible = PAGE_SIZE;
    render();
  }

  function onSearch() {
    state.q = normalizeText(searchInput.value);
    // Se l'utente cerca, evita combinazioni che possono portare a 0 risultati.
    // Forza "Tutte le categorie" mantenendo il testo di ricerca.
    if (state.q && categorySelect.value !== "") {
      categorySelect.value = "";
      state.category = "";
    }
    resetAndRender();
  }

  function onCategoryChange() {
    state.category = categorySelect.value || "";
    // Se l'utente seleziona una categoria specifica, usa solo il filtro categoria.
    // Pulisce la ricerca per prevenire risultati vuoti dovuti a filtri combinati.
    if (state.category && searchInput.value) {
      searchInput.value = "";
      state.q = "";
    }
    resetAndRender();
  }

  searchInput.addEventListener("input", onSearch);
  categorySelect.addEventListener("change", onCategoryChange);

  fetch(DATA_URL, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load demos.json"))))
    .then((data) => {
      state.all = Array.isArray(data.demos) ? data.demos : [];

      // Precompute haystack for fast search
      state.all.forEach((d) => {
        d.__hay = buildHaystack(d);
      });

      populateCategories();
      render();
    })
    .catch(() => {
      grid.innerHTML = "<div class=\"examplesError\">Impossibile caricare le demo in questo momento.</div>";
    });
})();