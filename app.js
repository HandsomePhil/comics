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
let sortKey = null;       // null | 'title' | 'volume'
let sortDir = 'asc';      // 'asc' | 'desc'
let currentPage = 1;
const PAGE_SIZE = 25;

const tbody = document.getElementById('tbody');
const search = document.getElementById('search');
const countEl = document.getElementById('count');
const paginationEl = document.getElementById('pagination');

function compareValues(a, b, key) {
  if (key === 'volume') {
    const na = parseFloat(a), nb = parseFloat(b);
    const aNum = !isNaN(na), bNum = !isNaN(nb);
    if (aNum && bNum) return na - nb;
    if (aNum) return -1;
    if (bNum) return 1;
  }
  return a.localeCompare(b);
}

function creditButtons(names) {
  return names.map(n =>
    `<button type="button" class="credit-link" data-credit="${escapeHtml(n)}">${escapeHtml(n)}</button>`
  ).join('');
}

function detailSections(b) {
  const sections = [];
  if (b.issues) {
    sections.push(`<div class="detail-section"><span class="detail-label">Collects</span><span class="detail-value">${escapeHtml(b.issues)}</span></div>`);
  }
  if (b.authors.length) {
    sections.push(`<div class="detail-section"><span class="detail-label">Author</span><span class="credit-list">${creditButtons(b.authors)}</span></div>`);
  }
  if (b.artists.length) {
    sections.push(`<div class="detail-section"><span class="detail-label">Artist</span><span class="credit-list">${creditButtons(b.artists)}</span></div>`);
  }
  if (!sections.length) {
    sections.push('<div class="detail-section"><span class="detail-value detail-empty">No details for this volume yet.</span></div>');
  }
  return sections.join('');
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
  if (sortKey) {
    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => dir * compareValues(a[sortKey], b[sortKey], sortKey));
  }
  document.querySelectorAll('th[data-sort]').forEach(th => {
    const a = th.querySelector('.arrow');
    a.textContent = th.dataset.sort === sortKey ? (sortDir === 'asc' ? '▲' : '▼') : '';
  });

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" class="empty">No matches.</td></tr>';
  } else {
    tbody.innerHTML = pageItems.map(b => {
      const thumb = b.image
        ? `<img class="thumb" src="${escapeHtml(b.image)}" alt="">`
        : `<div class="thumb thumb-placeholder"></div>`;
      const pubSlug = b.publisher.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `<tr class="book-row"><td><div class="title-cell">${thumb}<div class="title-text"><h2 data-publisher="${escapeHtml(pubSlug)}">${escapeHtml(b.publisher)}</h2><h3>${escapeHtml(b.title)}</h3></div></div></td><td class="vol">${b.volume ? `<span class="vol-badge">${escapeHtml(b.volume)}</span>` : ''}</td></tr>` +
        `<tr class="detail-row"><td colspan="2"><div class="detail-inner"><div class="detail-content${b.image ? ' has-cover' : ''}"${b.image ? ` style="--cover: url('${escapeHtml(b.image)}')"` : ''}>${detailSections(b)}</div></div></td></tr>`;
    }).join('');
  }
  countEl.textContent = `Displaying ${pageItems.length} of ${books.length} books`;
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

document.querySelectorAll('th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (sortKey !== key) {
      sortKey = key;
      sortDir = 'asc';
    } else if (sortDir === 'asc') {
      sortDir = 'desc';
    } else {
      sortKey = null;
      sortDir = 'asc';
    }
    currentPage = 1;
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

tbody.addEventListener('click', (e) => {
  const credit = e.target.closest('.credit-link');
  if (credit) {
    search.value = credit.dataset.credit;
    updateClearVisibility();
    currentPage = 1;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const row = e.target.closest('tr.book-row');
  if (row) row.classList.toggle('open');
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
    tbody.innerHTML = `<tr><td colspan="2" class="empty">Failed to load tpb_collection.csv. If opening this file directly (file://), run a local server instead — e.g. <code>python -m http.server</code> in this folder, then visit http://localhost:8000</td></tr>`;
    console.error(err);
  });
