function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

let books = [];
let sortMode = 'shelf';  // 'shelf' | 'az' | 'za'
let view = 'card';       // 'card' | 'list'
let currentPage = 1;
let pageItems = [];
const PAGE_SIZE = 18;

const tableEl = document.querySelector('table');
const tbody = document.getElementById('tbody');
const gridEl = document.getElementById('grid');
const search = document.getElementById('search');
const countEl = document.getElementById('count');
const paginationEl = document.getElementById('pagination');

function compareVolumes(a, b) {
  const na = parseFloat(a), nb = parseFloat(b);
  const aNum = !isNaN(na), bNum = !isNaN(nb);
  if (aNum && bNum) return na - nb;
  if (aNum) return -1;
  if (bNum) return 1;
  return a.localeCompare(b);
}

function bookCompare(a, b) {
  return a.title.localeCompare(b.title) || compareVolumes(a.volume, b.volume);
}

function creditButtons(names, type) {
  return names.map(n =>
    `<button type="button" class="credit-link credit-${type}" data-credit="${escapeHtml(n)}">${escapeHtml(n)}</button>`
  ).join('');
}

function detailSections(b) {
  const sections = [];
  if (b.publisher) {
    sections.push(`<div class="detail-section"><span class="detail-label">Publisher</span><span class="detail-value">${escapeHtml(b.publisher)}</span></div>`);
  }
  if (b.issues) {
    sections.push(`<div class="detail-section"><span class="detail-label">Collects</span><span class="detail-value">${escapeHtml(b.issues)}</span></div>`);
  }
  if (b.authors.length) {
    sections.push(`<div class="detail-section"><span class="detail-label">Author</span><span class="credit-list">${creditButtons(b.authors, 'author')}</span></div>`);
  }
  if (b.artists.length) {
    sections.push(`<div class="detail-section"><span class="detail-label">Artist</span><span class="credit-list">${creditButtons(b.artists, 'artist')}</span></div>`);
  }
  if (!sections.length) {
    sections.push('<div class="detail-section"><span class="detail-value detail-empty">No details for this volume yet.</span></div>');
  }
  return sections.join('');
}

function volChip(b) {
  return b.volume ? `<span class="vol-chip">Vol.&nbsp;${escapeHtml(b.volume)}</span>` : '';
}

function rowHtml(b, i) {
  const thumb = b.image
    ? `<img class="thumb thumb-clickable" src="${escapeHtml(b.image)}" alt="">`
    : `<div class="thumb thumb-placeholder"></div>`;
  return `<tr class="book-row" data-i="${i}"><td><div class="title-cell">${thumb}<div class="title-text"><h3>${escapeHtml(b.title)}</h3></div>${volChip(b)}</div></td></tr>` +
    `<tr class="detail-row"><td><div class="detail-inner"><div class="detail-content${b.image ? ' has-cover' : ''}"${b.image ? ` style="--cover: url('${escapeHtml(b.image)}')"` : ''}>${detailSections(b)}</div></div></td></tr>`;
}

function cardHtml(b, i) {
  const cover = b.image
    ? `<img class="card-cover" loading="lazy" src="${escapeHtml(b.image)}" alt="">`
    : `<div class="card-cover card-cover-placeholder"><span>${escapeHtml(b.title)}</span></div>`;
  return `<div class="card" data-i="${i}">${cover}<div class="card-meta"><span class="card-title">${escapeHtml(b.title)}</span>${volChip(b)}</div></div>`;
}

function render() {
  const q = search.value.trim().toLowerCase();
  let list = books;
  if (q) {
    list = books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.volume.toLowerCase().includes(q) ||
      b.issues.toLowerCase().includes(q) ||
      b.publisher.toLowerCase().includes(q) ||
      b.authors.some(n => n.toLowerCase().includes(q)) ||
      b.artists.some(n => n.toLowerCase().includes(q))
    );
  }
  if (sortMode === 'az') list = [...list].sort(bookCompare);
  else if (sortMode === 'za') list = [...list].sort((a, b) => -bookCompare(a, b));

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  const start = (currentPage - 1) * PAGE_SIZE;
  pageItems = list.slice(start, start + PAGE_SIZE);

  const showCards = view === 'card';
  tableEl.hidden = showCards;
  gridEl.hidden = !showCards;
  if (list.length === 0) {
    gridEl.innerHTML = showCards ? '<div class="empty">No matches.</div>' : '';
    tbody.innerHTML = showCards ? '' : '<tr><td class="empty">No matches.</td></tr>';
  } else if (showCards) {
    gridEl.innerHTML = pageItems.map(cardHtml).join('');
    tbody.innerHTML = '';
  } else {
    tbody.innerHTML = pageItems.map(rowHtml).join('');
    gridEl.innerHTML = '';
  }
  countEl.textContent = q
    ? `Displaying ${pageItems.length} of ${list.length} ${list.length === 1 ? 'match' : 'matches'}`
    : `Displaying ${pageItems.length} of ${books.length} books`;
  renderPagination(list.length, totalPages);
}

function renderPagination(total, totalPages) {
  if (total <= PAGE_SIZE) {
    paginationEl.hidden = true;
    paginationEl.innerHTML = '';
    return;
  }
  paginationEl.hidden = false;
  const prevDisabled = currentPage === 1 ? ' disabled' : '';
  const nextDisabled = currentPage === totalPages ? ' disabled' : '';
  const caret = (dir) => `<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="${dir === 'left' ? '15 6 9 12 15 18' : '9 6 15 12 9 18'}"/></svg>`;
  paginationEl.innerHTML =
    `<button type="button" class="page-btn" data-page="${currentPage - 1}" aria-label="Previous page"${prevDisabled}>${caret('left')}</button>` +
    `<span class="page-status">Page ${currentPage} of ${totalPages}</span>` +
    `<button type="button" class="page-btn" data-page="${currentPage + 1}" aria-label="Next page"${nextDisabled}>${caret('right')}</button>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const sortWrap = document.querySelector('.sort-wrap');
const sortBtn = document.getElementById('sort-btn');
const sortMenu = document.getElementById('sort-menu');
const sortLabel = document.getElementById('sort-label');
const SORT_LABELS = { shelf: 'Shelf Order', az: 'A to Z', za: 'Z to A' };

function closeSortMenu() {
  sortMenu.hidden = true;
  sortBtn.setAttribute('aria-expanded', 'false');
}
sortBtn.addEventListener('click', () => {
  const open = sortMenu.hidden;
  sortMenu.hidden = !open;
  sortBtn.setAttribute('aria-expanded', String(open));
});
sortMenu.addEventListener('click', (e) => {
  const opt = e.target.closest('button[data-sort]');
  if (!opt) return;
  sortMode = opt.dataset.sort;
  sortLabel.textContent = SORT_LABELS[sortMode];
  sortMenu.querySelectorAll('button').forEach(b => b.classList.toggle('selected', b === opt));
  closeSortMenu();
  currentPage = 1;
  render();
});
document.addEventListener('click', (e) => {
  if (!sortWrap.contains(e.target)) closeSortMenu();
});

const viewButtons = {
  card: document.getElementById('view-card'),
  list: document.getElementById('view-list')
};
Object.entries(viewButtons).forEach(([mode, btn]) => {
  btn.addEventListener('click', () => {
    if (view === mode) return;
    view = mode;
    viewButtons.card.classList.toggle('active', mode === 'card');
    viewButtons.list.classList.toggle('active', mode === 'list');
    render();
  });
});

paginationEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-page]');
  if (!btn || btn.disabled) return;
  currentPage = parseInt(btn.dataset.page, 10);
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

const searchBar = document.querySelector('.search-bar');
new IntersectionObserver(([entry]) => {
  searchBar.classList.toggle('stuck', !entry.isIntersecting);
}).observe(document.getElementById('search-sentinel'));

const searchWrapper = document.querySelector('.search-wrapper');
const clearBtn = document.getElementById('clear-search');
function updateClearVisibility() {
  searchWrapper.classList.toggle('has-text', search.value.length > 0);
}
search.addEventListener('input', () => { updateClearVisibility(); currentPage = 1; render(); });
clearBtn.addEventListener('click', () => {
  search.value = '';
  updateClearVisibility();
  search.focus();
  currentPage = 1;
  render();
});

function applyCreditSearch(name) {
  search.value = name;
  updateClearVisibility();
  currentPage = 1;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
const modalDetails = document.getElementById('modal-details');

function openModal(b) {
  if (b.image) {
    modalImg.src = b.image;
    modalImg.hidden = false;
  } else {
    modalImg.src = '';
    modalImg.hidden = true;
  }
  modalDetails.innerHTML =
    `<div class="modal-head"><h3 class="modal-title">${escapeHtml(b.title)}</h3>${volChip(b)}</div>` +
    detailSections(b);
  modal.hidden = false;
}
function closeModal() {
  modal.hidden = true;
  modalImg.src = '';
}
modal.addEventListener('click', (e) => {
  const credit = e.target.closest('.credit-link');
  if (credit) {
    applyCreditSearch(credit.dataset.credit);
    closeModal();
    return;
  }
  closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!modal.hidden) closeModal();
    else closeSortMenu();
  }
});

tbody.addEventListener('click', (e) => {
  const img = e.target.closest('.thumb-clickable');
  if (img) {
    const row = img.closest('tr.book-row');
    openModal(pageItems[row.dataset.i]);
    return;
  }
  const credit = e.target.closest('.credit-link');
  if (credit) {
    applyCreditSearch(credit.dataset.credit);
    return;
  }
  const row = e.target.closest('tr.book-row');
  if (row) row.classList.toggle('open');
});

gridEl.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) openModal(pageItems[card.dataset.i]);
});

fetch('tpb_collection.csv', { cache: 'no-cache' })
  .then(r => r.text())
  .then(text => {
    const rows = parseCSV(text);
    rows.shift(); // header
    books = rows
      .filter(r => r.some(c => c && c.trim()))
      .map(r => ({
        title: (r[0] || '').trim(),
        volume: (r[1] || '').trim(),
        issues: (r[2] || '').trim(),
        publisher: (r[3] || '').trim(),
        authors: [r[4], r[5]].map(s => (s || '').trim()).filter(Boolean),
        artists: [r[6], r[7]].map(s => (s || '').trim()).filter(Boolean),
        image: (r[8] || '').trim()
      }));
    render();
  })
  .catch(err => {
    const msg = 'Failed to load tpb_collection.csv. If opening this file directly (file://), run a local server instead — e.g. <code>python -m http.server</code> in this folder, then visit http://localhost:8000';
    gridEl.innerHTML = `<div class="empty">${msg}</div>`;
    tbody.innerHTML = `<tr><td class="empty">${msg}</td></tr>`;
    console.error(err);
  });
