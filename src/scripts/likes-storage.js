// src/scripts/likes-storage.js
(() => {
  "use strict";

  // новый ключ, чтобы не конфликтовать со старой (index) схемой
  const STORAGE_KEY = "likedCards:likeId:v1";

  function loadIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (e) {
      console.warn("[likes] storage corrupted, resetting", e);
      return [];
    }
  }

  function saveIds(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  function getCardId(cardEl) {
    const id = cardEl?.dataset?.likeId;
    return id != null && id !== "" ? String(id) : null;
  }

  // 1) Восстановление лайков при загрузке
  function hydrateFromStorage() {
    const liked = new Set(loadIds());

    document.querySelectorAll(".card[data-like-id]").forEach((card) => {
      const id = getCardId(card);
      const icon = card.querySelector(".like-icon");
      if (!id || !icon) return;

      icon.classList.toggle("is-liked", liked.has(id));
    });
  }

  // 2) Сохранение после клика (НЕ переключаем класс сами!)
  // Ждём, пока like.js поменяет DOM, и только потом читаем итоговое состояние.
  function onClickSync(evt) {
    const iconBtn = evt.target.closest(".card__icon-button");
    if (!iconBtn) return;

    const card = iconBtn.closest(".card");
    if (!card) return;

    const id = getCardId(card);
    const icon = card.querySelector(".like-icon");
    if (!id || !icon) return;

    setTimeout(() => {
      const likedNow = icon.classList.contains("is-liked");
      const set = new Set(loadIds());

      if (likedNow) set.add(id);
      else set.delete(id);

      saveIds([...set]);
    }, 0);
  }

  hydrateFromStorage();
  document.addEventListener("click", onClickSync);
})();