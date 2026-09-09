// ---------- configurazione tab ----------
const TABS = [
  { key: 'corse-outdoor',    label: 'Corse',     tipo: 'Corse',     ambiente: 'outdoor', sheet: 'CORSE' },
  { key: 'concorsi-outdoor', label: 'Concorsi',  tipo: 'Concorsi',  ambiente: 'outdoor', sheet: 'CONCORSI' },
  { key: 'corse-indoor',     label: 'Corse Indoor',    tipo: 'Corse',    ambiente: 'indoor', sheet: 'CORSE_Indoor' },
  { key: 'concorsi-indoor',  label: 'Concorsi Indoor', tipo: 'Concorsi', ambiente: 'indoor', sheet: 'CONCORSI_Indoor' },
];

let state = {
  tab: TABS[0].key,
  sex: 'ALL',
  search: '',
  showTransferred: false,
  sortKey: 'idx',
  sortDir: 'asc',
};

// ---------- utilità ----------
function parseWind(raw){
  if(!raw) return { display:'', mp:false };
  const hasMP = /mp/i.test(raw);
  if(!hasMP) return { display: raw, mp:false };
  let cleaned = raw.replace(/mp/i,'').replace(/[()]/g,'').trim();
  return { display: cleaned, mp:true };
}

function currentTabConfig(){
  return TABS.find(t => t.key === state.tab);
}

function filteredRecords(){
  const cfg = currentTabConfig();
  const q = state.search.trim().toLowerCase();
  return RECORDS.filter(r => {
    if(r.tipo !== cfg.tipo || r.ambiente !== cfg.ambiente) return false;
    if(!state.showTransferred && r.sezione === 'trasferito') return false;
    if(state.sex !== 'ALL' && r.sex !== state.sex) return false;
    if(q){
      const hay = (r.atleta+' '+r.cat+' '+r.gara+' '+r.societa+' '+r.luogo).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

function sortRecords(list){
  const { sortKey, sortDir } = state;
  const dir = sortDir === 'asc' ? 1 : -1;
  return list.slice().sort((a,b) => {
    let av = a[sortKey], bv = b[sortKey];
    if(sortKey === 'idx'){ return (av-bv)*dir; }
    av = (av||'').toString().toLowerCase();
    bv = (bv||'').toString().toLowerCase();
    if(av < bv) return -1*dir;
    if(av > bv) return 1*dir;
    return (a.idx-b.idx);
  });
}

// ---------- rendering ----------
function renderTabs(){
  const wrap = document.getElementById('tabs');
  wrap.innerHTML = '';
  TABS.forEach(t => {
    const count = RECORDS.filter(r => r.tipo===t.tipo && r.ambiente===t.ambiente && (state.showTransferred || r.sezione==='attivo')).length;
    const btn = document.createElement('button');
    btn.className = 'tab' + (t.key===state.tab ? ' active' : '');
    btn.innerHTML = t.label + '<span class="tab-count">' + count + '</span>';
    btn.addEventListener('click', () => { state.tab = t.key; render(); });
    wrap.appendChild(btn);
  });
}

function renderUpdated(){
  const cfg = currentTabConfig();
  const d = UPDATED[cfg.sheet] || '—';
  document.getElementById('updated-date').textContent = d;
}

function renderHeaderArrows(){
  document.querySelectorAll('#records-table thead th').forEach(th => {
    const arrow = th.querySelector('.arrow');
    if(th.dataset.key === state.sortKey){
      arrow.textContent = state.sortDir === 'asc' ? '▲' : '▼';
    } else {
      arrow.textContent = '';
    }
  });
}

function renderTable(){
  const tbody = document.getElementById('tbody');
  const emptyState = document.getElementById('empty-state');
  const list = sortRecords(filteredRecords());

  document.getElementById('result-count').textContent =
    list.length + (list.length === 1 ? ' record' : ' record trovati');

  if(list.length === 0){
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  const rows = list.map(r => {
    const wind = parseWind(r.wind);
    const mpBadge = wind.mp ? '<span class="badge-mp">MP</span>' : '';
    const cipBadge = r.sezione === 'trasferito' ? '<span class="badge-cip">CIP</span> ' : '';
    const trClass = r.sezione === 'trasferito' ? ' class="transferred"' : '';
    return `<tr${trClass}>
      <td>${r.sex}</td>
      <td>${cipBadge}${r.cat}</td>
      <td>${r.gara}</td>
      <td class="atleta wrap">${r.atleta}</td>
      <td class="prest">${r.prest}${mpBadge}</td>
      <td>${wind.display}</td>
      <td>${r.data}</td>
      <td class="wrap">${r.luogo}</td>
      <td class="wrap">${r.societa}</td>
    </tr>`;
  }).join('');
  tbody.innerHTML = rows;
}

function render(){
  renderTabs();
  renderUpdated();
  renderHeaderArrows();
  renderTable();
}

// ---------- eventi ----------
document.querySelectorAll('#sesso-filter button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#sesso-filter button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.sex = btn.dataset.sex;
    renderTable();
  });
});

document.getElementById('search').addEventListener('input', (e) => {
  state.search = e.target.value;
  renderTable();
});

document.getElementById('show-transferred').addEventListener('change', (e) => {
  state.showTransferred = e.target.checked;
  render();
});

document.querySelectorAll('#records-table thead th').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.key;
    if(state.sortKey === key){
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortKey = key;
      state.sortDir = 'asc';
    }
    renderHeaderArrows();
    renderTable();
  });
});

render();
