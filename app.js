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
let sortKey = null;       // null | 'title' | 'volume' | 'issues'
let sortDir = 'asc';      // 'asc' | 'desc'

const tbody = document.getElementById('tbody');
const search = document.getElementById('search');
const countEl = document.getElementById('count');

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

function render() {
  const q = search.value.trim().toLowerCase();
  let list = books;
  if (q) {
    list = books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.volume.toLowerCase().includes(q) ||
      b.issues.toLowerCase().includes(q) ||
      b.publisher.toLowerCase().includes(q)
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

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">No matches.</td></tr>';
  } else {
    tbody.innerHTML = list.map(b => {
      const thumb = b.image
        ? `<img class="thumb thumb-clickable" src="${escapeHtml(b.image)}" alt="" data-full="${escapeHtml(b.image)}">`
        : `<div class="thumb thumb-placeholder"></div>`;
      return `<tr><td><div class="title-cell">${thumb}<div class="title-text"><h2>${escapeHtml(b.publisher)}</h2><h3>${escapeHtml(b.title)}</h3></div></div></td><td class="vol">${escapeHtml(b.volume)}</td><td class="issues">${escapeHtml(b.issues)}</td></tr>`;
    }).join('');
  }
  countEl.textContent = `${list.length} of ${books.length} books`;
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
    render();
  });
});

const searchWrapper = document.querySelector('.search-wrapper');
const clearBtn = document.getElementById('clear-search');
function updateClearVisibility() {
  searchWrapper.classList.toggle('has-text', search.value.length > 0);
}
search.addEventListener('input', () => { updateClearVisibility(); render(); });
clearBtn.addEventListener('click', () => {
  search.value = '';
  updateClearVisibility();
  search.focus();
  render();
});

const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
tbody.addEventListener('click', (e) => {
  const img = e.target.closest('.thumb-clickable');
  if (!img) return;
  modalImg.src = img.dataset.full;
  modal.hidden = false;
});
modal.addEventListener('click', () => { modal.hidden = true; modalImg.src = ''; });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.hidden) { modal.hidden = true; modalImg.src = ''; }
});

fetch('collection.csv')
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
        image: (r[4] || '').trim()
      }));
    render();
  })
  .catch(err => {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Failed to load collection.csv. If opening this file directly (file://), run a local server instead — e.g. <code>python -m http.server</code> in this folder, then visit http://localhost:8000</td></tr>`;
    console.error(err);
  });
