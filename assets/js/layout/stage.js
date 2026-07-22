/* ──────────────────────────────────────────────────────────
   4. STAGE — SCROLL-TO-WORK (CTA BUTTON)
   ────────────────────────────────────────────────────────── */
function scrollToWork(e) {
  if (!stageCta || !workSection) return;
  e.preventDefault();
  const headerOffset = header?.offsetHeight || 0;
  const elementPosition = workSection.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.scrollY - headerOffset;
  window.scrollTo({ top: offsetPosition, behavior: "smooth" });
}
stageCta?.addEventListener("click", scrollToWork);

/* ──────────────────────────────────────────────────────────
   5. STAGE — VIDEO SWITCHER + SLIDER + AUTO-ADVANCE
   ────────────────────────────────────────────────────────── */
let stageCurrentIndex = 0;
let stageAutoTimer = null;
let stageIsScrolling = false;

stageCards.forEach((_, i) => {
  const dot = document.createElement("button");
  dot.className = "stage__dot" + (i === 0 ? " is-active" : "");
  dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
  dot.addEventListener("click", () => goToStageCard(i));
  stageDotsWrap?.appendChild(dot);
});
const stageDots = document.querySelectorAll(".stage__dot");

function loadStageVideo(index) {
  const video = stageVideos[index];
  if (!video) return;
  const source = video.querySelector("source[data-src]");
  if (source) {
    source.src = source.dataset.src;
    video.load();
    source.removeAttribute("data-src");
  }
}

function goToStageCard(index) {
  if (index === stageCurrentIndex) return;

  loadStageVideo(index);
  loadStageVideo((index + 1) % stageVideos.length);

  const nextVideo = stageVideos[index];
  if (!nextVideo) return;

  const switchNow = () => {
    stageCards[stageCurrentIndex]?.classList.remove("is-active");
    stageCards[index]?.classList.add("is-active");

    stageVideos[stageCurrentIndex]?.classList.remove("is-active");
    nextVideo.classList.add("is-active");
    nextVideo.play().catch(() => {});

    stageDots[stageCurrentIndex]?.classList.remove("is-active");
    stageDots[index]?.classList.add("is-active");

    stageCurrentIndex = index;
    centerStageCard(index);
  };

  if (nextVideo.readyState >= 3) {
    nextVideo.currentTime = 0;
    switchNow();
  } else {
    nextVideo.addEventListener(
      "canplay",
      () => {
        nextVideo.currentTime = 0;
        switchNow();
      },
      { once: true }
    );
  }
}

function centerStageCard(index) {
  if (!stageCardsTrack || !stageCards[index]) return;
  stageIsScrolling = true;
  const card = stageCards[index];
  const offset = card.offsetLeft - stageCardsTrack.offsetWidth / 2 + card.offsetWidth / 2;
  stageCardsTrack.scrollTo({ left: offset, behavior: "smooth" });
  setTimeout(() => {
    stageIsScrolling = false;
  }, 600);
}

function startStageAuto() {
  stageAutoTimer = setInterval(() => {
    const next = (stageCurrentIndex + 1) % stageCards.length;
    goToStageCard(next);
  }, 3000);
}
function stopStageAuto() {
  clearInterval(stageAutoTimer);
}

function getCardInCenter() {
  if (!stageCardsTrack) return 0;
  const trackCenter = stageCardsTrack.scrollLeft + stageCardsTrack.offsetWidth / 2;
  let closest = 0;
  let minDistance = Infinity;
  stageCards.forEach((card, i) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const distance = Math.abs(trackCenter - cardCenter);
    if (distance < minDistance) {
      minDistance = distance;
      closest = i;
    }
  });
  return closest;
}

stageCardsTrack?.addEventListener("scroll", () => {
  if (stageIsScrolling) return;
  clearTimeout(stageCardsTrack._scrollEndTimer);
  stageCardsTrack._scrollEndTimer = setTimeout(() => {
    const centered = getCardInCenter();
    if (centered !== stageCurrentIndex) {
      loadStageVideo(centered);

      stageCards[stageCurrentIndex]?.classList.remove("is-active");
      stageVideos[stageCurrentIndex]?.classList.remove("is-active");
      stageDots[stageCurrentIndex]?.classList.remove("is-active");

      stageCurrentIndex = centered;

      stageCards[stageCurrentIndex]?.classList.add("is-active");
      stageDots[stageCurrentIndex]?.classList.add("is-active");

      const video = stageVideos[stageCurrentIndex];
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
        video.classList.add("is-active");
      }
    }
  }, 150);
});

stageCardsTrack?.addEventListener("mouseenter", stopStageAuto);
stageCardsTrack?.addEventListener("mouseleave", startStageAuto);
stageCardsTrack?.addEventListener("touchstart", stopStageAuto, { passive: true });
stageCardsTrack?.addEventListener("touchend", startStageAuto, { passive: true });

window.addEventListener("load", () => {
  if (!stageCards.length) return;

  stageCards[0]?.classList.add("is-active");
  const firstVideo = stageVideos[0];
  if (firstVideo) {
    firstVideo.classList.add("is-active");
    firstVideo.play().catch(() => {});
  }

  loadStageVideo(1);

  centerStageCard(0);
  startStageAuto();
});