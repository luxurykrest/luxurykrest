  /* ──────────────────────────────────────────────────────────
     2. HEADER — HAMBURGER MENU TOGGLE (DROPDOWN MENU)
     ────────────────────────────────────────────────────────── */

  if (menuBtn && dropdownMenu) {
    const isMenuOpen = () => {
      return dropdownMenu.classList.contains("dropdown-Menu--active");
    };

    const openMenu = () => {
      dropdownMenu.classList.add("dropdown-Menu--active");
      menuBtn.classList.add("active");
    };

    const closeMenu = () => {
      dropdownMenu.classList.remove("dropdown-Menu--active");
      menuBtn.classList.remove("active");
    };

    const toggleMenu = () => {
      if (isMenuOpen()) {
        closeMenu();
      } else {
        openMenu();
      }
    };

    // فتح وإغلاق القائمة
    menuBtn.addEventListener("click", toggleMenu);

    // زر الإغلاق
    if (dropdownClose) {
      dropdownClose.addEventListener("click", closeMenu);
    }

    // زر Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isMenuOpen()) {
        closeMenu();
      }
    });

    // إغلاق عند الضغط على أي رابط
    dropdownMenu.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    // إغلاق عند الضغط على أي كارت
    dropdownMenu.querySelectorAll(".product-card").forEach((card) => {
      card.addEventListener("click", closeMenu);
    });

    // إغلاق عند الضغط خارج القائمة
    document.addEventListener("click", (e) => {
      if (!isMenuOpen()) return;

      const clickedOutside = !menuBtn.contains(e.target) && !dropdownMenu.contains(e.target);

      if (clickedOutside) {
        closeMenu();
      }
    });
  }
  /* ──────────────────────────────────────────────────────────
       3. HEADER — SEARCH OVERLAY
       ────────────────────────────────────────────────────────── */
  const searchToggleBtn = document.getElementById("searchToggleBtn");
  const searchOverlay = document.getElementById("searchOverlay");
  const searchInput = document.querySelector(".search-overlay__input");

  function toggleSearchOverlay() {
    const isActive = searchOverlay.classList.toggle("search-overlay--active");
    searchToggleBtn.classList.toggle("active", isActive);
    searchToggleBtn.setAttribute("aria-label", isActive ? "Close search" : "Search");
    if (isActive) searchInput.focus();
  }
  searchToggleBtn?.addEventListener("click", toggleSearchOverlay);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchOverlay.classList.contains("search-overlay--active")) {
      toggleSearchOverlay();
    }
  });

  /* ── SEARCH OVERLAY 2 ── */

  const searchTrigger = document.getElementById("searchTrigger");
  const searchClose = document.getElementById("searchClose");
  const emptyState = document.getElementById("emptyState");
  const emptyQuery = document.getElementById("emptyQuery");
  const productGrid = document.getElementById("productGrid");
  const recentSearchesEl = document.getElementById("recentSearches");
  const productCards = document.querySelectorAll(".product-card");
  const ghostEl = document.getElementById("searchGhost");

  /* ── Suggested Terms ── */
  const suggestedTerms = ["New Website", "E-commerce", "work", "support", "brand", "Website"];

  const searchRoutes = {
    website: "#website",
    "New Website": "#New Website",
    "E-commerce": "#ecommerce",
    work: "#work",
    brand: "#brand",
    support: "#support"
  };

  let currentSuggestion = "";

  /* ── Measure text width with the input's actual font (canvas trick) ── */
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  function measureTextWidth(text) {
    measureCtx.font = getComputedStyle(searchInput).font;
    return measureCtx.measureText(text).width;
  }

  function alignInputAndGhost(query, match) {
    if (!match) {
      searchInput.style.textAlign = "center";
      searchInput.style.paddingLeft = "";
      ghostEl.style.textAlign = "center";
      ghostEl.style.paddingLeft = "";
      return;
    }
    const wrapWidth = searchInput.parentElement.clientWidth;
    const fullWidth = measureTextWidth(match);
    const offset = Math.max(0, (wrapWidth - fullWidth) / 2);
    searchInput.style.textAlign = "left";
    searchInput.style.paddingLeft = offset + "px";
    ghostEl.style.textAlign = "left";
    ghostEl.style.paddingLeft = offset + "px";
  }

  function openSearch() {
    searchOverlay.classList.add("search-overlay--active");
    document.body.style.overflow = "hidden";
    renderRecentSearches();
    setTimeout(() => searchInput.focus(), 300);
  }

  function closeSearch() {
    searchOverlay.classList.remove("search-overlay--active");
    document.body.style.overflow = "";
    searchInput.value = "";
    emptyState.classList.remove("search-overlay__empty--visible");
    currentSuggestion = "";
    ghostEl.innerHTML = "";
    alignInputAndGhost("", null);

    searchToggleBtn.classList.remove("active");
    searchToggleBtn.setAttribute("aria-label", "Search");
  }
  const overlayLinks = searchOverlay.querySelectorAll('a[href^="#"]');

  overlayLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeSearch();
    });
  });

  searchTrigger?.addEventListener("click", openSearch);
  searchClose?.addEventListener("click", closeSearch);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchOverlay.classList.contains("search-overlay--active")) {
      closeSearch();
    }
  });

  /* ── Recent Searches (localStorage) ── */
  function getRecentSearches() {
    return JSON.parse(localStorage.getItem("studio_recent_searches") || "[]");
  }

  function saveRecentSearch(term) {
    if (!term.trim()) return;
    let recent = getRecentSearches().filter((t) => t.toLowerCase() !== term.toLowerCase());
    recent.unshift(term);
    recent = recent.slice(0, 5);
    localStorage.setItem("studio_recent_searches", JSON.stringify(recent));
  }

  function removeRecentSearch(term) {
    const recent = getRecentSearches().filter((t) => t !== term);
    localStorage.setItem("studio_recent_searches", JSON.stringify(recent));
    renderRecentSearches();
  }

  function renderRecentSearches() {
    const recent = getRecentSearches();
    recentSearchesEl.innerHTML = "";
    if (recent.length === 0) {
      recentSearchesEl.classList.remove("recent-searches--visible");
      return;
    }
    recentSearchesEl.classList.add("recent-searches--visible");

    const title = document.createElement("p");
    title.className = "popular-searches__title";
    title.style.fontSize = "14px";
    title.style.letterSpacing = "3px";
    title.style.marginBottom = "6px";
    title.textContent = "Recent";
    recentSearchesEl.appendChild(title);

    recent.forEach((term) => {
      const item = document.createElement("div");
      item.className = "recent-searches__item";
      item.innerHTML = `<span>${term}</span><button aria-label="Remove">✕</button>`;
      item.querySelector("button").addEventListener("click", () => removeRecentSearch(term));
      item.querySelector("span").addEventListener("click", () => {
        searchInput.value = term;
        searchInput.dispatchEvent(new Event("input"));
      });
      recentSearchesEl.appendChild(item);
    });
  }

  /* ── Ghost-text autocomplete (suggestion rendered inline inside the field) ── */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderGhost(query) {
    if (!query) {
      currentSuggestion = "";
      ghostEl.innerHTML = "";
      alignInputAndGhost(query, null);
      return;
    }

    const q = query.toLowerCase();
    const match = suggestedTerms.find((term) => term.toLowerCase().startsWith(q) && term.length > query.length);

    if (!match) {
      currentSuggestion = "";
      ghostEl.innerHTML = "";
      alignInputAndGhost(query, null);
      return;
    }

    currentSuggestion = match;
    const typedPart = match.slice(0, query.length);
    const restPart = match.slice(query.length);
    ghostEl.innerHTML = `<span>${escapeHtml(typedPart)}</span><span>${escapeHtml(restPart)}</span>`;
    alignInputAndGhost(query, match);
  }

  function acceptGhostSuggestion() {
    if (!currentSuggestion) return false;
    searchInput.value = currentSuggestion;
    ghostEl.innerHTML = "";
    currentSuggestion = "";
    searchInput.dispatchEvent(new Event("input"));
    const len = searchInput.value.length;
    searchInput.setSelectionRange(len, len);
    return true;
  }

  /* ── Search Input -> Suggestions + Empty State + Save on Enter ── */
  searchInput.addEventListener("input", () => {
    const query = searchInput.value;
    renderGhost(query);
    const trimmedQuery = query.trim();

    if (trimmedQuery.length > 0) {
      const matches = Array.from(productCards).some((card) =>
        card.querySelector(".product-card__name").textContent.toLowerCase().includes(trimmedQuery.toLowerCase())
      );
      if (!matches) {
        emptyQuery.textContent = trimmedQuery;
        emptyState.classList.add("search-overlay__empty--visible");
      } else {
        emptyState.classList.remove("search-overlay__empty--visible");
      }
    } else {
      emptyState.classList.remove("search-overlay__empty--visible");
    }
  });

  searchInput.addEventListener("keydown", (e) => {
    const caretAtEnd = searchInput.selectionStart === searchInput.value.length;

    if (currentSuggestion && caretAtEnd && (e.key === "Tab" || e.key === "ArrowRight")) {
      e.preventDefault();
      acceptGhostSuggestion();
      return;
    }

    if (e.key === "Enter") {
      if (currentSuggestion) {
        acceptGhostSuggestion();
      }

      const target = searchInput.value.trim();

      if (target) {
        saveRecentSearch(target);
      }

      if (searchRoutes[target]) {
        closeSearch();
        document.querySelector(searchRoutes[target]).scrollIntoView({
          behavior: "smooth"
        });
      }
    }
  });

  /* ── Skeleton Loading Demo (simulates fetch delay) ── */
  function showSkeletonThenLoad() {
    productGrid.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const skeleton = document.createElement("div");
      skeleton.className = "product-card product-card--skeleton";
      skeleton.innerHTML = `
              <div class="product-card__image"></div>
              <div class="product-card__info">
                  <h4 class="product-card__name">Loading name</h4>
                  <span class="product-card__price">Loading</span>
              </div>
          `;
      productGrid.appendChild(skeleton);
    }
    // Simulated network delay — replace with real fetch in production
    setTimeout(() => {
      location.reload(); // demo only: reload to restore real cards
    }, 1200);
  }
  // Uncomment to test on page load:
  // showSkeletonThenLoad();