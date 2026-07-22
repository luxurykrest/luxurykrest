  /* ──────────────────────────────────────────────────────────
       1. ELEMENT REFERENCES
       ────────────────────────────────────────────────────────── */
  // Header
  const menuBtn = document.getElementById("navbarMenuBtn") || document.querySelector(".navbar__menu-btn");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const dropdownClose = document.getElementById("dropdownClose");
  const header = document.querySelector(".site-header");

  // Stage
  const stageCta = document.getElementById("stage-cta");
  const stageSection = document.getElementById("stage");
  const workSection = document.getElementById("work");
  const stageCardsTrack = document.getElementById("stage-cards-track");
  const stageCards = document.querySelectorAll(".stage__card");
  const stageVideos = document.querySelectorAll(".stage__video");
  const stageDotsWrap = document.getElementById("stage-dots");

  // Trust
  const trustSection = document.querySelector(".trust");
  const trustNumbers = document.querySelectorAll(".trust__number");

  // Work
  const workSlider = document.getElementById("work-slider");
  const workProgress = document.getElementById("work-progress");
  const workFilters = document.querySelectorAll(".work__filter");
  const workCards = document.querySelectorAll(".work__card");
  const newWebsiteBtn = document.querySelector(".work__cta-btn");

  // Wizard
  const wizardOverlay = document.getElementById("wizard-overlay");
  const wizardCloseBtn = document.getElementById("wizard-close");
  const ctaCard = document.querySelector(".work__card--cta");
  const wizardTypeButtons = document.querySelectorAll(".wizard__type");
  const next1 = document.getElementById("next-1");
  const next2 = document.getElementById("next-2");
  const inputName = document.getElementById("input-name");
  const inputProject = document.getElementById("input-project");
  const inputContact = document.getElementById("input-contact");