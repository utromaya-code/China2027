/**
 * Проявление блоков при прокрутке.
 *
 * Одного IntersectionObserver мало: при быстрой прокрутке или переходе по якорю
 * элемент успевает пролететь экран между кадрами, и событие теряется. Поэтому
 * всё, что оказалось выше нижней границы экрана, показывается принудительно.
 * Контент важнее анимации.
 */
export function initReveal(selector = '.reveal'): void {
  const items = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (!items.length) return;
  const show = (el: HTMLElement) => el.classList.add('is-visible');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    items.forEach(show);
    return;
  }

  const pending = new Set(items);
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        show(el);
        pending.delete(el);
        observer.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  items.forEach((el) => observer.observe(el));

  const sweep = () => {
    for (const el of Array.from(pending)) {
      if (el.getBoundingClientRect().top < window.innerHeight) {
        show(el);
        pending.delete(el);
        observer.unobserve(el);
      }
    }
    if (!pending.size) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      sweep();
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', sweep);
  sweep();
}
