// ---------- State ----------
const state = {
  favorites: new Set(),
  planning: new Map(), // showId -> dateIndex
  activeCategories: new Set(),
  searchTerm: ''
};

// ---------- Helpers ----------
function showById(id) {
  return SHOWS.find((s) => s.id === id);
}

function heartIcon(filled) {
  return `<img src="assets/heart-off.png" alt="" width="22" height="22" class="${filled ? 'icon-active' : ''}">`;
}

// ---------- Show card ----------
function representationsHTML(show) {
  return show.dates.map((d, i) => {
    const pinned = state.planning.get(show.id) === i;
    return `
      <div class="rep-card">
        <div class="rep-card__top">
          <span>${d.date} - ${d.time}</span>
          <button class="rep-pin" data-action="toggle-planning" data-show="${show.id}" data-date="${i}" aria-label="Ajouter au planning">
            <img src="assets/icon-rep-pin.png" alt="" width="16" height="16" class="${pinned ? 'icon-active' : ''}">
          </button>
        </div>
        <div class="rep-card__spot">
          <span class="pin-badge pin-badge--sm">${show.spot}</span>
          <span>${show.location}</span>
        </div>
        <button class="btn-outline" data-action="goto-carte" data-spot="${show.spot}">Voir sur la carte</button>
      </div>`;
  }).join('');
}

function showCardHTML(show) {
  const color = show.color;
  const isFav = state.favorites.has(show.id);
  return `
    <article class="show-card" data-show="${show.id}">
      <div class="show-card__banner" style="background:${color}">
        <h3 data-action="open-spectacle" data-show="${show.id}">${show.title}</h3>
        <button class="heart-btn" data-action="toggle-fav" data-show="${show.id}">${heartIcon(isFav)}</button>
      </div>
      <img src="${show.images[0]}" alt="${show.title}" class="show-card__img" data-action="open-spectacle" data-show="${show.id}">
      <div class="show-card__body">
        <p class="show-card__company">${show.company}</p>
        <div class="show-card__meta">
          <span class="meta-item"><img src="assets/icon-timer.png" alt="" width="16" height="16">${show.duration}</span>
          <span class="meta-item"><img src="assets/icon-age.png" alt="" width="16" height="16">${show.age}</span>
          <span class="show-card__loc meta-item"><img src="assets/icon-location.png" alt="" width="16" height="16"><em>${show.location}</em></span>
        </div>
        <div class="show-card__tags">
          <span class="tag-link" style="color:${color}">${show.category}</span>
          <span class="tag-prog meta-item"><img src="assets/icon-programme.png" alt="" width="16" height="16">Programmation ${show.programme}</span>
        </div>
        <p class="show-card__desc">${show.summary}</p>
        <button class="btn-pill" style="background:${color}" data-action="open-spectacle" data-show="${show.id}">Lire plus</button>
        <p class="reps-title">Représentations</p>
        <div class="reps-row">${representationsHTML(show)}</div>
      </div>
    </article>`;
}

// ---------- Empty states ----------
function emptyStateHTML({ tag, title, message, icon }) {
  return `
    <div class="empty-state">
      <span class="empty-state__badge">${title}</span>
      <p class="empty-state__msg">${message}</p>
      <img src="${icon}" alt="" class="empty-state__icon">
      <p class="empty-state__hint">${tag === 'planning' ? 'Cliquez simplement sur l’icône « épingle » d’un spectacle pour le voir apparaître ici.' : 'Cliquez simplement sur le petit cœur de la page d’un spectacle pour le voir apparaître ici.'}</p>
      <button class="btn-cta" data-action="goto-screen" data-target="carte"><img src="assets/binoculars.png" alt="" width="18" height="18">Retourner sur la carte</button>
      <button class="btn-cta" data-action="goto-screen" data-target="decouvrir"><img src="assets/megaphone.png" alt="" width="18" height="18">Découvrir des spectacles</button>
      <button class="btn-fill-demo" data-action="fill-${tag}">Remplir la page</button>
    </div>`;
}

// ---------- Screen renderers ----------
function renderDecouvrir() {
  const term = state.searchTerm.trim().toLowerCase();
  const list = SHOWS.filter((s) => {
    const matchesTerm = !term || s.title.toLowerCase().includes(term) || s.company.toLowerCase().includes(term);
    const matchesCategory = state.activeCategories.size === 0 || state.activeCategories.has(s.category);
    return matchesTerm && matchesCategory;
  });
  const body = document.getElementById('decouvrir-body');
  body.innerHTML = list.length
    ? list.map(showCardHTML).join('')
    : `<p class="no-results">Aucun spectacle ne correspond à ta recherche.</p>`;
}

function renderFavoris() {
  const body = document.getElementById('favoris-body');
  if (state.favorites.size === 0) {
    body.innerHTML = emptyStateHTML({
      tag: 'favoris',
      title: 'Oh non !',
      message: 'Vous n’avez pas encore de favoris, et ça rend petit cœur tout triste.',
      icon: 'assets/heart.png'
    });
    return;
  }
  body.innerHTML = [...state.favorites].map((id) => showCardHTML(showById(id))).join('');
}

function renderPlanning() {
  const body = document.getElementById('planning-body');
  if (state.planning.size === 0) {
    body.innerHTML = emptyStateHTML({
      tag: 'planning',
      title: 'Ah !?',
      message: 'Il semblerait que vous n’avez pas encore mis de spectacle de côté.',
      icon: 'assets/pin.png'
    });
    return;
  }
  body.innerHTML = [...state.planning.entries()].map(([id, dateIndex]) => {
    const show = showById(id);
    const d = show.dates[dateIndex];
    return `
      <div class="planning-slot">
        <div class="planning-slot__top">
          <span>${d.date} - ${d.time}</span>
          <img src="assets/icon-rep-pin.png" alt="" width="16" height="16" class="icon-active">
        </div>
        <div class="planning-slot__spot">
          <span class="pin-badge pin-badge--sm">${show.spot}</span>
          <span>${show.location}</span>
        </div>
        <button class="btn-outline" data-action="goto-carte" data-spot="${show.spot}">Voir sur la carte</button>
        <button class="link-row link-row--tight" data-action="cycle-planning" data-show="${id}">Changer le créneau</button>
      </div>
      ${showCardHTML(show)}`;
  }).join('');
}

function renderMenu() {
  const body = document.getElementById('menu-body');
  const items = MENU_ITEMS.map((item) => `
    <div class="menu-row">
      <img src="${item.icon}" alt="" class="menu-row__icon">
      <span>${item.label}</span>
    </div>`).join('');

  const settingsHeader = `
    <div class="menu-row menu-row--section">
      <img src="assets/parametres.png" alt="" class="menu-row__icon">
      <span>Paramètres</span>
    </div>`;

  const settings = SETTINGS_ITEMS.map((label) => `
    <div class="menu-row menu-row--settings">
      <span>${label}</span>
      <img src="assets/chevron.png" alt="" width="14" height="14">
    </div>`).join('');

  const footer = `
    <div class="menu-row">
      <img src="assets/conditions.png" alt="" class="menu-row__icon">
      <span>Conditions générales d’utilisations</span>
    </div>
    <div class="menu-row">
      <img src="assets/doc-legal.png" alt="" class="menu-row__icon">
      <span>Mentions légales</span>
    </div>
    <div class="menu-row">
      <img src="assets/discuter.png" alt="" class="menu-row__icon">
      <span>Envoyez vos commentaires</span>
    </div>
    <p class="menu-version">Version 0.0.1-a383.564</p>`;

  body.innerHTML = items + settingsHeader + settings + footer;
}

function renderFiltresSheet() {
  const body = document.getElementById('filtres-body');
  const dateChips = ['mer. 10/07', 'jeu. 11/07', 'ven. 12/07', 'sam. 13/07'].map((d) => `<button class="chip">${d}</button>`).join('');
  const progChips = ['IN', 'OFF'].map((p) => `<button class="chip chip--prog">${p}</button>`).join('');
  const catChips = FILTER_CATEGORIES.map((cat) => {
    const color = FILTER_CATEGORY_COLORS[cat];
    const active = state.activeCategories.has(cat);
    return `<button class="chip chip--cat ${active ? 'is-active' : ''}" data-action="toggle-category" data-cat="${cat}"><span class="dot" style="background:${color}"></span>${cat}</button>`;
  }).join('');
  const zoneChips = ['Place de l’Hôtel de Ville', 'Place du châtelet', 'Conservatoire', 'Espace des Arts', 'École de l’Est'].map((z) => `<button class="chip">${z}</button>`).join('');

  body.innerHTML = `
    <div class="filter-block">
      <p class="filter-block__title">Horaire</p>
      <div class="time-row">
        <select><option>9h</option><option>10h</option><option>12h</option></select>
        <span>à</span>
        <select><option>19h</option><option>21h</option><option>23h</option></select>
      </div>
    </div>
    <div class="filter-block">
      <p class="filter-block__title">Date</p>
      <div class="chip-row chip-row--wrap">${dateChips}</div>
    </div>
    <div class="filter-block">
      <p class="filter-block__title">Programmation IN/OFF</p>
      <div class="chip-row">${progChips}</div>
    </div>
    <div class="filter-block">
      <p class="filter-block__title">Catégorie</p>
      <div class="chip-row chip-row--wrap">${catChips}</div>
    </div>
    <div class="filter-block filter-block--switch">
      <p class="filter-block__title">Compagnies émergentes</p>
      <label class="switch"><input type="checkbox"><span class="switch__track"></span></label>
    </div>
    <div class="filter-block">
      <p class="filter-block__title">Zone (autour de)</p>
      <div class="chip-row chip-row--wrap">${zoneChips}</div>
    </div>`;

  body.querySelectorAll('.chip:not([data-action])').forEach((chip) => {
    chip.addEventListener('click', () => chip.classList.toggle('is-active'));
  });
}

function renderFiltresCarteSheet() {
  const body = document.getElementById('filtres-carte-body');
  body.innerHTML = MAP_LAYERS.map((layer, i) => `
    <label class="layer-row">
      <input type="checkbox" ${layer.checked ? 'checked' : ''}>
      ${layer.icon
        ? `<img src="${layer.icon}" alt="" class="layer-row__icon">`
        : `<span class="layer-row__dot" style="background:${layer.color}"></span>`}
      <span>${layer.label}</span>
    </label>`).join('');
}

function openPastille(spot) {
  const shows = SHOWS.filter((s) => String(s.spot) === String(spot));
  document.getElementById('pastille-title').textContent = shows[0] ? shows[0].location : `Emplacement ${spot}`;
  document.getElementById('pastille-badge').textContent = spot;
  document.getElementById('pastille-body').innerHTML = shows.map(showCardHTML).join('');
  openSheet('sheet-pastille');
}

function openSpectacle(id) {
  const show = showById(id);
  const color = show.color;
  document.getElementById('overlay-title').textContent = show.title;
  const isFav = state.favorites.has(show.id);

  const carousel = show.images.length > 1 ? `
    <div class="carousel" data-index="0">
      <img src="${show.images[0]}" alt="${show.title}">
      <span class="carousel__count">1 / ${show.images.length}</span>
      <button class="carousel__prev" data-action="carousel-prev" aria-label="Image précédente">‹</button>
      <button class="carousel__next" data-action="carousel-next" aria-label="Image suivante">›</button>
    </div>` : `<img src="${show.images[0]}" alt="${show.title}" class="carousel__single">`;

  const extra = ['distribution', 'technique', 'soutiens'].filter((k) => show[k]).map((k) => `
    <div class="detail-block">
      <p class="detail-block__title">${k === 'distribution' ? 'Distribution' : k === 'technique' ? 'Technique' : 'Soutiens'}</p>
      <p class="detail-block__text">${show[k].replace(/\n/g, '<br>')}</p>
    </div>`).join('');

  const links = (show.siteShow || show.siteCompany) ? `
    <div class="link-buttons">
      ${show.siteShow ? `<a class="btn-outline-pill" style="border-color:${color};color:${color}" href="${show.siteShow}" target="_blank" rel="noopener">Site du spectacle</a>` : ''}
      ${show.siteCompany ? `<a class="btn-outline-pill" style="border-color:${color};color:${color}" href="${show.siteCompany}" target="_blank" rel="noopener">Site de la compagnie</a>` : ''}
    </div>` : '';

  document.getElementById('overlay-body').innerHTML = `
    ${carousel}
    <div class="show-card__banner" style="background:${color}">
      <h3>${show.title}</h3>
      <button class="heart-btn" data-action="toggle-fav" data-show="${show.id}">${heartIcon(isFav)}</button>
    </div>
    <div class="show-card__body">
      <p class="show-card__company">${show.company}</p>
      <div class="show-card__meta">
        <span class="meta-item"><img src="assets/icon-timer.png" alt="" width="16" height="16">${show.duration}</span>
        <span class="meta-item"><img src="assets/icon-age.png" alt="" width="16" height="16">${show.age}</span>
        <span class="show-card__loc meta-item"><img src="assets/icon-location.png" alt="" width="16" height="16"><em>${show.location}</em></span>
      </div>
      <div class="show-card__tags">
        <span class="tag-link" style="color:${color}">${show.category}</span>
        <span class="tag-prog meta-item"><img src="assets/icon-programme.png" alt="" width="16" height="16">Programmation ${show.programme}</span>
      </div>
      <p class="show-card__desc show-card__desc--full">${show.description.replace(/\n/g, '<br>')}</p>
      <p class="reps-title">Représentations</p>
      <div class="reps-row">${representationsHTML(show)}</div>
      ${links}
      ${extra}
    </div>`;

  document.getElementById('overlay-spectacle').classList.add('is-active');
}

// ---------- Navigation ----------
function goToScreen(target) {
  closeSheets();
  closeOverlay();
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('is-active', screen.dataset.screen === target);
  });
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.target === target);
  });
  renderAll();
}

function openSheet(id) {
  document.querySelectorAll('.sheet').forEach((s) => s.classList.remove('is-open'));
  document.getElementById(id).classList.add('is-open');
  document.getElementById('sheet-backdrop').classList.add('is-open');
}

function closeSheets() {
  document.querySelectorAll('.sheet').forEach((s) => s.classList.remove('is-open'));
  document.getElementById('sheet-backdrop').classList.remove('is-open');
}

function closeOverlay() {
  document.getElementById('overlay-spectacle').classList.remove('is-active');
}

function renderAll() {
  renderDecouvrir();
  renderFavoris();
  renderPlanning();
  renderMenu();
}

// ---------- Event delegation ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if (action === 'toggle-fav') {
    const id = el.dataset.show;
    state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
    renderAll();
    if (document.getElementById('overlay-spectacle').classList.contains('is-active')) openSpectacle(id);
    return;
  }

  if (action === 'toggle-planning') {
    const id = el.dataset.show;
    const dateIndex = Number(el.dataset.date);
    state.planning.get(id) === dateIndex ? state.planning.delete(id) : state.planning.set(id, dateIndex);
    renderAll();
    return;
  }

  if (action === 'cycle-planning') {
    const id = el.dataset.show;
    const show = showById(id);
    const current = state.planning.get(id) || 0;
    state.planning.set(id, (current + 1) % show.dates.length);
    renderPlanning();
    return;
  }

  if (action === 'open-spectacle') {
    openSpectacle(el.dataset.show);
    return;
  }

  if (action === 'close-overlay') {
    closeOverlay();
    return;
  }

  if (action === 'goto-screen') {
    goToScreen(el.dataset.target);
    return;
  }

  if (action === 'goto-carte') {
    closeSheets();
    goToScreen('carte');
    return;
  }

  if (action === 'open-filtres-carte') {
    renderFiltresCarteSheet();
    openSheet('sheet-filtres-carte');
    return;
  }

  if (action === 'open-filtres') {
    renderFiltresSheet();
    openSheet('sheet-filtres');
    return;
  }

  if (action === 'close-sheets') {
    closeSheets();
    renderDecouvrir();
    return;
  }

  if (action === 'toggle-category') {
    const cat = el.dataset.cat;
    state.activeCategories.has(cat) ? state.activeCategories.delete(cat) : state.activeCategories.add(cat);
    renderFiltresSheet();
    return;
  }

  if (action === 'fill-favoris') {
    state.favorites.add('fidji');
    state.favorites.add('clap');
    renderFavoris();
    return;
  }

  if (action === 'fill-planning') {
    state.planning.set('hypothese', 0);
    state.planning.set('lepd', 0);
    renderPlanning();
    return;
  }

  if (action === 'carousel-prev' || action === 'carousel-next') {
    const carousel = el.closest('.carousel');
    const img = carousel.querySelector('img');
    const countEl = carousel.querySelector('.carousel__count');
    const showId = document.getElementById('overlay-title').textContent;
    const show = SHOWS.find((s) => s.title === showId);
    let index = Number(carousel.dataset.index);
    index = action === 'carousel-next' ? (index + 1) % show.images.length : (index - 1 + show.images.length) % show.images.length;
    carousel.dataset.index = index;
    img.src = show.images[index];
    countEl.textContent = `${index + 1} / ${show.images.length}`;
    return;
  }

  if (action === 'open-pastille') {
    openPastille(el.dataset.spot);
    return;
  }
});

document.getElementById('sheet-backdrop').addEventListener('click', () => {
  closeSheets();
  renderDecouvrir();
});

document.getElementById('filtres-reset').addEventListener('click', () => {
  state.activeCategories.clear();
  renderFiltresSheet();
});

document.getElementById('decouvrir-search').addEventListener('input', (e) => {
  state.searchTerm = e.target.value;
  renderDecouvrir();
});

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => goToScreen(item.dataset.target));
});

goToScreen('carte');
