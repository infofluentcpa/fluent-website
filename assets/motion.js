// Quiet motion (2026-10-18): sections ease into view once, cards one after another; "What can we help with?" links
// open the matching service. Nothing moves for visitors whose device asks for reduced motion; without JavaScript
// everything is simply visible.
(function () {
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Reveal on scroll.
  if (!calm && 'IntersectionObserver' in window) {
    var groups = ['.section-head', '.pillars', '.chips', '.ahead', '.steps', '.about', '.quotes', '.faq', '.contact', '.hero-card'];
    var items = [];
    groups.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        var kids = el.matches('.pillars, .steps, .quotes, .faq, .chips, .ahead') ? el.children : [el];
        Array.prototype.forEach.call(kids, function (k, i) { k.classList.add('reveal'); k.style.transitionDelay = Math.min(i, 6) * 70 + 'ms'; items.push(k); });
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('in'); io.unobserve(el);
        setTimeout(function () { el.style.transitionDelay = ''; }, 1300);   // the hover lift should not wait for the stagger
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
    document.documentElement.classList.add('motion');
  }

  // 2. "What can we help with?": go to the service and open its details.
  document.querySelectorAll('[data-open-service]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var n = Number(a.getAttribute('data-open-service'));
      var card = document.querySelectorAll('#services .pillar')[n];
      if (!card) return;
      ev.preventDefault();
      var d = card.querySelector('details.more');
      if (d) d.open = true;
      card.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
      card.classList.add('flash');
      setTimeout(function () { card.classList.remove('flash'); }, 1600);
    });
  });
})();
