(() => {
  'use strict';

  const STORAGE_KEY = 'theme'; // theme-light | theme-dark | theme-auto
  const ROOT = document.documentElement;

  const THEMES = new Set(['theme-light', 'theme-dark', 'theme-auto']);

  function setThemeClass(themeClass) {
    // убрать все theme-* и повесить нужный
    [...ROOT.classList]
      .filter((c) => c.startsWith('theme-'))
      .forEach((c) => ROOT.classList.remove(c));

    ROOT.classList.add(themeClass);
  }

  function getSavedTheme() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return THEMES.has(raw) ? raw : null;
  }

  function saveTheme(themeClass) {
    localStorage.setItem(STORAGE_KEY, themeClass);
  }

  function normalizeLabelToTheme(text) {
    const t = String(text).trim().toLowerCase();
    if (t === 'светлая') return 'theme-light';
    if (t === 'темная' || t === 'тёмная') return 'theme-dark';
    if (t === 'авто') return 'theme-auto';
    return null;
  }

  function markActive(buttons, activeThemeClass) {
    buttons.forEach((btn) => {
      btn.removeAttribute('aria-current');
      btn.classList.remove('theme-block__toggle_active');
    });

    const activeBtn = buttons.find(
      (btn) => normalizeLabelToTheme(btn.textContent) === activeThemeClass
    );

    if (activeBtn) {
      activeBtn.setAttribute('aria-current', 'true');
      activeBtn.classList.add('theme-block__toggle_active');
    }
  }

  // 1) применяем сохранённую тему как можно раньше
  const saved = getSavedTheme();
  setThemeClass(saved ?? 'theme-auto');

  // 2) после загрузки навесим обработчики
  document.addEventListener('DOMContentLoaded', () => {
    const detail = document.querySelector('.theme-block');
    const buttons = [...document.querySelectorAll('.theme-block__toggle')];

    markActive(buttons, saved ?? 'theme-auto');

    document.addEventListener('click', (evt) => {
      const btn = evt.target.closest('.theme-block__toggle');
      if (!btn) return;

      const themeClass = normalizeLabelToTheme(btn.textContent);
      if (!themeClass) return;

      setThemeClass(themeClass);
      saveTheme(themeClass);
      markActive(buttons, themeClass);

      // закрываем details после выбора (приятнее)
      if (detail && detail.open) detail.open = false;
    });
  });
})();
