(() => {
  "use strict";

  const DATA_URL = "/data/demos.json";

  const grid = document.getElementById("examplesGrid");
  const searchInput = document.getElementById("examplesSearch");
  const categorySelect = document.getElementById("examplesCategory");
  const loadMoreWrap = document.getElementById("examplesLoadMoreWrap");
  const loadMoreBtn = document.getElementById("examplesLoadMoreBtn");

  if (!grid || !searchInput || !categorySelect) return;

  const state = {
    all: [],
    filtered: [],
    perPage: 12,
    visible: 12,
    query: "",
    category: "",
  };

  function normalizeStr(s) {
    return (s || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function buildHaystack(d) {
    const parts = [];
    if (d.title) parts.push(d.title);
    if (d.category) parts.push(d.category);
    if (d.slug) parts.push(d.slug);
    if (Array.isArray(d.tags)) parts.push(d.tags.join(" "));
    return normalizeStr(parts.join(" "));
  }

  function sortAZ(items) {
    items.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "it"));
  }

  function fillCategories(items) {
    const cats = Array.from(
      new Set(items.map((d) => d.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "it"));

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

  function render(items) {
    grid.innerHTML = "";
    items.forEach((d) => grid.appendChild(createCard(d)));
  }

  function updateLoadMoreVisibility() {
    if (!loadMoreWrap || !loadMoreBtn) return;

    const hasFilters = state.query.length > 0 || state.category.length > 0;
    if (hasFilters) {
      loadMoreWrap.hidden = true;
      return;
    }

    loadMoreWrap.hidden = state.visible >= state.filtered.length;
  }

  function applyFilters() {
    const q = normalizeStr(state.query);
    const cat = state.category;

    let items = state.all;

    if (cat) {
      items = items.filter((d) => d.category === cat);
    }

    if (q) {
      items = items.filter((d) => (d.__hay || "").includes(q));
    }

    items = items.slice();
    sortAZ(items);

    state.filtered = items;

    // Se l'utente sta cercando o filtrando, mostra tutto (niente paginazione)
    const hasFilters = q.length > 0 || cat.length > 0;
    state.visible = hasFilters ? items.length : state.perPage;

    render(items.slice(0, state.visible));
    updateLoadMoreVisibility();
  }

  function onLoadMore() {
    state.visible = Math.min(state.visible + state.perPage, state.filtered.length);
    render(state.filtered.slice(0, state.visible));
    updateLoadMoreVisibility();
  }

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value || "";
    applyFilters();
  });

  categorySelect.addEventListener("change", () => {
    state.category = categorySelect.value || "";
    applyFilters();
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", onLoadMore);
  }

  fetch(DATA_URL, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load demos.json"))))
    .then((data) => {
      const demos = Array.isArray(data.demos) ? data.demos : [];
      const perPage = Number(data.perPage);

      state.perPage = Number.isFinite(perPage) && perPage > 0 ? perPage : 12;

      state.all = demos.map((d) => ({
        title: d.title || "",
        category: d.category || "",
        slug: d.slug || "",
        href: d.href || "#",
        thumb: d.thumb || "",
        tags: Array.isArray(d.tags) ? d.tags : [],
        __hay: buildHaystack(d),
      }));

      sortAZ(state.all);
      fillCategories(state.all);

      state.filtered = state.all.slice();
      state.visible = state.perPage;

      render(state.filtered.slice(0, state.visible));
      updateLoadMoreVisibility();
    })
    .catch(() => {
      grid.innerHTML = "<div class=\"examplesError\">Impossibile caricare le demo in questo momento.</div>";
      if (loadMoreWrap) loadMoreWrap.hidden = true;
    });
})();
