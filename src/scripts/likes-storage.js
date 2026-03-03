// src/scripts/likes-storage.js
(() => {
  'use strict';

  const STORAGE_KEY = 'likedCards:likeId:v1';

  function loadIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (e) {
      console.warn('[likes] storage corrupted, resetting', e);
      return [];
    }
  }

  function saveIds(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  function getCardId(cardEl) {
    const id = cardEl?.dataset?.likeId;
    return id != null && id !== '' ? String(id) : null;
  }

  function setLikeButtonText(card, isLiked) {
    const btn = card.querySelector('.card__like-button');
    const textEl = btn?.querySelector('.button__text');
    if (!textEl) return;

    // Важно: при гидрации ставим сразу, без задержек,
    // чтобы не было состояния "сердце лайкнуто, а текст Like"
    textEl.textContent = isLiked ? 'Unlike' : 'Like';
  }

  // 1) Восстановление лайков при загрузке
  function hydrateFromStorage() {
    const liked = new Set(loadIds());

    document.querySelectorAll('.card[data-like-id]').forEach((card) => {
      const id = getCardId(card);
      const icon = card.querySelector('.like-icon');
      if (!id || !icon) return;

      const isLiked = liked.has(id);
      icon.classList.toggle('is-liked', isLiked);
      setLikeButtonText(card, isLiked);
    });
  }

  // 2) Сохранение после клика (НЕ переключаем класс сами!)
  // Слушаем клики и по сердцу, и по кнопке Like
  function onClickSync(evt) {
    const clickedControl = evt.target.closest(
      '.card__icon-button, .card__like-button'
    );
    if (!clickedControl) return;

    const card = clickedControl.closest('.card');
    if (!card) return;

    const id = getCardId(card);
    const icon = card.querySelector('.like-icon');
    if (!id || !icon) return;

    // Ждём, пока like.js отработает toggle + поставит текст с задержкой.
    // Класс 'is-liked' появляется/исчезает сразу, но на всякий случай читаем после тика.
    setTimeout(() => {
      const likedNow = icon.classList.contains('is-liked');

      const set = new Set(loadIds());
      if (likedNow) set.add(id);
      else set.delete(id);
      saveIds([...set]);

      // Текст у like.js меняется с задержкой 500ms.
      // Нам для консистентности после клика можно обновить текст сразу (без ожидания).
      setLikeButtonText(card, likedNow);
    }, 0);
  }

  hydrateFromStorage();
  document.addEventListener('click', onClickSync);
})();
