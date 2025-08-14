/* Manga Manager PWA (iOS-tuned) - app.js */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const { set, get } = idbKeyval;
const DB_KEY = 'manga-db';

let state = {
  items: [],
  filter: { q: '', status: '', sortBy: 'updatedAt_desc' },
  editing: null,
  deferredPrompt: null
};

// Install prompt on supported browsers (Android/desktop)
// On iOS, user installs via Safari share sheet; this button stays hidden
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.deferredPrompt = e;
  $('#installBtn').classList.remove('hidden');
});
$('#installBtn').addEventListener('click', async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  $('#installBtn').classList.add('hidden');
  state.deferredPrompt = null;
});

async function loadAll() {
  const data = await get(DB_KEY);
  state.items = Array.isArray(data) ? data : [];
  render();
}
async function saveAll() { await set(DB_KEY, state.items); }
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(16).slice(2)));

function upsertItem(item) {
  const idx = state.items.findIndex(i => i.id === item.id);
  if (idx >= 0) state.items[idx] = item; else state.items.unshift(item);
  return saveAll().then(render);
}
function removeItem(id) {
  state.items = state.items.filter(i => i.id !== id);
  return saveAll().then(render);
}

function badgeForStatus(s) {
  const map = { reading:{text:'読書中'}, completed:{text:'読了'}, onhold:{text:'中断中'}, wishlist:{text:'欲しい'} };
  return map[s] || { text: s || '' };
}

function applyFilters(items) {
  let arr = items.slice();
  const { q, status, sortBy } = state.filter;
  if (q) {
    const n = q.toLowerCase();
    arr = arr.filter(i => (i.title + ' ' + (i.author||'')).toLowerCase().includes(n));
  }
  if (status) arr = arr.filter(i => i.status === status);
  switch (sortBy) {
    case 'title_asc': arr.sort((a,b) => a.title.localeCompare(b.title)); break;
    case 'author_asc': arr.sort((a,b) => (a.author||'').localeCompare(b.author||'')); break;
    case 'volumes_desc': arr.sort((a,b) => (b.totalVolumes||0) - (a.totalVolumes||0)); break;
    default: arr.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
  }
  return arr;
}

function render() {
  const grid = $('#grid'); grid.innerHTML = '';
  const items = applyFilters(state.items);
  $('#emptyState').classList.toggle('hidden', items.length !== 0);
  const tpl = $('#cardTpl');
  for (const item of items) {
    const node = tpl.content.cloneNode(true);
    const cover = node.querySelector('.cover');
    cover.src = item.coverDataUrl || '/assets/cover-placeholder.png';
    cover.alt = item.title || '表紙';
    node.querySelector('.title').textContent = item.title || '';
    node.querySelector('.author').textContent = item.author || '';
    node.querySelector('.volumes').textContent = `巻数: ${(item.totalVolumes ?? '-')}/${(item.ownedVolumes ?? '-')}`;
    const st = node.querySelector('.status'); st.textContent = badgeForStatus(item.status).text; st.classList.add('border-slate-300');
    node.children[0].addEventListener('click', () => openDrawer(item));
    grid.appendChild(node);
  }
}

function resetForm() {
  $('#coverPreview').src = '/assets/cover-placeholder.png';
  $('#title').value = ''; $('#author').value = '';
  $('#totalVolumes').value = ''; $('#ownedVolumes').value = '';
  $('#status').value = 'reading'; $('#tags').value = ''; $('#notes').value = ''; $('#coverFile').value = '';
}
function fillForm(item) {
  $('#coverPreview').src = item.coverDataUrl || '/assets/cover-placeholder.png';
  $('#title').value = item.title || ''; $('#author').value = item.author || '';
  $('#totalVolumes').value = item.totalVolumes ?? ''; $('#ownedVolumes').value = item.ownedVolumes ?? '';
  $('#status').value = item.status || 'reading'; $('#tags').value = (item.tags || []).join(', '); $('#notes').value = item.notes || '';
}

function openDrawer(item=null) {
  state.editing = item ? { ...item } : { id: uid(), createdAt: Date.now() };
  $('#drawerTitle').textContent = item ? '漫画を編集' : '漫画を追加';
  $('#deleteBtn').classList.toggle('hidden', !item);
  if (item) fillForm(item); else resetForm();
  $('#drawer').showModal();
}
function closeDrawer(){ $('#drawer').close(); state.editing = null; }

$('#addBtn').addEventListener('click', () => openDrawer());
$('#closeBtn').addEventListener('click', (e) => { e.preventDefault(); closeDrawer(); });
$('#deleteBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  if (!state.editing) return;
  if (confirm('削除してよろしいですか？')) { await removeItem(state.editing.id); closeDrawer(); }
});

$('#coverFile').addEventListener('change', async (e) => {
  const file = e.target.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { $('#coverPreview').src = reader.result; if (state.editing) state.editing.coverDataUrl = reader.result; };
  reader.readAsDataURL(file);
});

$('#saveBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  const item = state.editing || { id: uid(), createdAt: Date.now() };
  item.title = $('#title').value.trim(); if (!item.title) return alert('タイトルは必須です。');
  item.author = $('#author').value.trim();
  item.totalVolumes = Number($('#totalVolumes').value) || 0;
  item.ownedVolumes = Number($('#ownedVolumes').value) || 0;
  item.status = $('#status').value;
  item.tags = $('#tags').value.split(',').map(s => s.trim()).filter(Boolean);
  item.notes = $('#notes').value.trim();
  item.updatedAt = Date.now();
  await upsertItem(item); closeDrawer();
});

$('#search').addEventListener('input', (e) => { state.filter.q = e.target.value; render(); });
$('#statusFilter').addEventListener('change', (e) => { state.filter.status = e.target.value; render(); });
$('#sortBy').addEventListener('change', (e) => { state.filter.sortBy = e.target.value; render(); });

$('#exportBtn').addEventListener('click', () => {
  const data = JSON.stringify({ exportedAt: new Date().toISOString(), items: state.items }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'manga-export.json'; a.click(); URL.revokeObjectURL(url);
});
$('#importInput').addEventListener('change', async (e) => {
  const file = e.target.files?.[0]; if (!file) return;
  try {
    const text = await file.text(); const data = JSON.parse(text);
    if (!Array.isArray(data.items)) throw new Error('フォーマット不正');
    state.items = data.items; await saveAll(); render(); alert('インポートしました。');
  } catch { alert('インポートに失敗しました。'); }
  finally { e.target.value = ''; }
});

async function boot(){ await loadAll(); }
boot();