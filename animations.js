/* =========================================================
   CYBER AI — animations.js
   Small motion helpers used across the app
   ========================================================= */

const Anim = (() => {

  function scrollToBottom(el, smooth = true) {
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }

  function pulseModelPill() {
    const pill = document.getElementById('btn-model-pill');
    if (!pill) return;
    pill.animate(
      [
        { boxShadow: '0 0 0 0 rgba(199,199,199,0)' },
        { boxShadow: '0 0 0 4px rgba(199,199,199,0.12)' },
        { boxShadow: '0 0 0 0 rgba(199,199,199,0)' }
      ],
      { duration: 500, easing: 'ease-out' }
    );
  }

  function flashElement(el) {
    if (!el) return;
    el.animate(
      [{ opacity: 0.4 }, { opacity: 1 }],
      { duration: 220, easing: 'ease-out' }
    );
  }

  /* Grow/shrink textarea smoothly as content changes */
  function autoGrowTextarea(el, maxPx = 200) {
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, maxPx);
    el.style.height = next + 'px';
  }

  return {
    scrollToBottom,
    pulseModelPill,
    flashElement,
    autoGrowTextarea
  };
})();
