Простая компонентная структура
Цель: практика
Все стили написаны с помощью scss
Цель: исключительно практика

Место для ваших воспоминаний:
Выложился на полную. Выжал максимум мз своих знаний по html И css на момент создания проекта, и даже больше.


project/
  dist/                      # результат (генерируется)
    index.html
    css/
      style.css
    js/
      like.js
    assets/
      images/
      icons/
      fonts/

  src/                       # исходники
    pages/
      index/
        index.html

    blocks/                  # БЭМ-блоки (как ты начал делать)
      page/
            page.scss
      header/
            header.scss
      heading/
            heading.scss
      main/
            main.scss
      card-feed/
            card-feed.scss
      card/
            card.scss
      label/
            label.scss
      button/
            button.scss
      like-icon/
            like-icon.scss

    styles/                  # глобальные стили (не блоки)
      variables.scss
      globals.scss
      animations.scss
      style.scss             # входная точка, собирает всё вместе

    scripts/
      like.js

    assets/
      images/
      icons/
      fonts/

  gulpfile.js
  package.json
  README.md


/* =========================
   Base (глобальные вещи)
========================= */

@import url("./variables.css");
@import url("./globals.css");
@import url("./animations.css");

/* =========================
   Blocks
========================= */

@import url("../blocks/page/page.css");
@import url("../blocks/header/header.css");
@import url("../blocks/heading/heading.css");
@import url("../blocks/main/main.css");
@import url("../blocks/card-feed/card-feed.css");
@import url("../blocks/card/card.css");
@import url("../blocks/label/label.css");
@import url("../blocks/button/button.css");
@import url("../blocks/like-icon/like-icon.css");


<!-- 
  блок:
  0. page
  1. header
  2. heading
  3. label
  4. main
  4.1 card-feed
  5. card
  6. 
  7. like-icon
  8. button
  9. 


  элемент: 
  1.
  2. heading__accent
  3.
  4.1 card-feed__list
      card-feed__item

  5. card__title
     card__media
     card__image
     card__body
     card__description
     card__my-story
     card__actions
     card__icon-button
     card__like-button
  модификатор: 
  5.  card--color-state
      card__media--color-state
  7. is-liked
  8. button__text
  -->