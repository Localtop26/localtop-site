/* LocalTop — Esempi di siti
   - Catalogo demo da /data/demos.json
   - Ricerca live su: title + category + slug + tags
   - Categoria (select)
   - Paginazione: 12 iniziali, "Mostra altri" (+12)
   - Se l'utente scrive nella ricerca e c'è una categoria selezionata, reset automatico a "Tutte le categorie"
*/

(() => {
  "use strict";

  const DATA_URL = "/data/demos.json";
  const PAGE_SIZE = 12;

  const grid = document.getElementById("examplesGrid");
  const searchEl = document.getElementById("examplesSearch");
  const categoryEl = document.getElementById("examplesCategory");

  if (!grid || !searchEl || !categoryEl) return;

  let all = [];
  let filtered = [];
  let visibleCount = PAGE_SIZE;

  let loadMoreWrap = null;
  let loadMoreBtn = null;

  function normalizeStr(s) {
    return (s || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (m) => {
      switch (m) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        case "'": return "&#39;";
        default: return m;
      }
    });
  }

  function getTitle(d) {
    return (d && d.title) ? d.title.toString() : "";
  }

  function getCategory(d) {
    return (d && d.category) ? d.category.toString().trim() : "";
  }

  function getHref(d) {
    return (d && (d.href || d.url)) ? (d.href || d.url).toString() : "#";
  }

  function getThumb(d) {
    return (d && (d.thumb || d.thumbnail)) ? (d.thumb || d.thumbnail).toString() : "";
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
    items.sort((a, b) => getTitle(a).localeCompare(getTitle(b), "it"));
  }

  function buildCard(demo) {
    const title = escapeHtml(getTitle(demo) || "Demo");
    const category = escapeHtml(getCategory(demo));
    const href = escapeHtml(getHref(demo));
    const thumb = getThumb(demo);

    const media = thumb
      ? `<img class="exampleCardThumb" src="${escapeHtml(thumb)}" alt="${title}" loading="lazy" decoding="async">`
      : `<div class="exampleCardThumb placeholder" aria-hidden="true"></div>`;

    return `
<a class="exampleCard" href="${href}" target="_blank" rel="noopener noreferrer">
  <div class="exampleCardMedia">${media}</div>
  <div class="exampleCardBody">
    <div class="exampleCardTitle">${title}</div>
    ${category ? `<div class="exampleCardMeta">${category}</div>` : ``}
    <div class="exampleCardCta">
      <span class="btn btn--small">Attiva il Servizio</span>
    </div>
  </div>
</a>`;
  }

  function renderGrid(items) {
    grid.innerHTML = items.map(buildCard).join("");
  }

  function ensureLoadMore() {
    if (loadMoreWrap && loadMoreBtn) return;

    loadMoreWrap = document.createElement("div");
    loadMoreWrap.className = "examplesLoadMoreWrap";

    loadMoreBtn = document.createElement("button");
    loadMoreBtn.type = "button";
    loadMoreBtn.className = "btn examplesLoadMoreBtn";
    loadMoreBtn.textContent = "Mostra altri";

    loadMoreBtn.addEventListener("click", () => {
      visibleCount = Math.min(visibleCount + PAGE_SIZE, filtered.length);
      renderVisible();
    });

    loadMoreWrap.appendChild(loadMoreBtn);
    grid.parentNode.appendChild(loadMoreWrap);
  }

  function updateLoadMore() {
    if (!loadMoreWrap) return;
    const show = filtered.length > visibleCount;
    loadMoreWrap.style.display = show ? "" : "none";
  }

  function renderVisible() {
    renderGrid(filtered.slice(0, visibleCount));
    updateLoadMore();
  }

  function applyFilters(fromSearchInput = false) {
    const q = normalizeStr(searchEl.value);
    const cat = categoryEl.value.trim();

    // Se l'utente sta scrivendo e c'è una categoria selezionata, resetta a "Tutte"
    if (fromSearchInput && q && cat) {
      categoryEl.value = "";
    }

    const effectiveCat = categoryEl.value.trim();
    const effectiveQ = normalizeStr(searchEl.value);

    let items = all.slice();

    if (effectiveCat) {
      items = items.filter((d) => getCategory(d) === effectiveCat);
    }

    if (effectiveQ) {
      items = items.filter((d) => (d.__hay || "").includes(effectiveQ));
    }

    sortAZ(items);
    filtered = items;
    visibleCount = PAGE_SIZE;
    renderVisible();
  }

  function fillCategories(items) {
    const cats = Array.from(new Set(items.map(getCategory).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, "it"));

    categoryEl.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "Tutte le categorie";
    categoryEl.appendChild(optAll);

    cats.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      categoryEl.appendChild(opt);
    });
  }

  async function init() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    const data = await res.json();
    all = Array.isArray(data.demos) ? data.demos.slice() : [];

    all.forEach((d) => { d.__hay = buildHaystack(d); });
    sortAZ(all);

    fillCategories(all);
    ensureLoadMore();

    searchEl.addEventListener("input", () => applyFilters(true));
    categoryEl.addEventListener("change", () => applyFilters(false));

    filtered = all.slice();
    visibleCount = PAGE_SIZE;
    renderVisible();
  }

  init().catch(() => {});
})();
