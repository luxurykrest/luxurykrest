 /* ──────────────────────────────────────────────────────────
      6. TRUST — ANIMATED STAT COUNTERS
      ────────────────────────────────────────────────────────── */
 (function () {
   const items = document.querySelectorAll(".trust [data-fade]");
   if (!items.length) return;

   const observer = new IntersectionObserver(
     (entries) => {
       entries.forEach((entry) => {
         if (entry.isIntersecting) {
           entry.target.classList.add("is-visible");
           observer.unobserve(entry.target);
         }
       });
     },
     { threshold: 0.2 }
   );

   items.forEach((el) => observer.observe(el));
 })();

 (function () {
   const counters = document.querySelectorAll(".trust__number");
   if (!counters.length) return;

   const animate = (el) => {
     const target = parseInt(el.dataset.count, 10) || 0;
     const duration = 1200;
     const start = performance.now();

     const step = (now) => {
       const progress = Math.min((now - start) / duration, 1);
       const eased = 1 - Math.pow(1 - progress, 3);
       el.textContent = Math.round(eased * target).toLocaleString();
       if (progress < 1) requestAnimationFrame(step);
     };
     requestAnimationFrame(step);
   };

   const observer = new IntersectionObserver(
     (entries) => {
       entries.forEach((entry) => {
         if (entry.isIntersecting) {
           animate(entry.target);
           observer.unobserve(entry.target);
         }
       });
     },
     { threshold: 0.4 }
   );

   counters.forEach((el) => observer.observe(el));
 })();