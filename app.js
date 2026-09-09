// ---------- classificazione per l'ordinamento predefinito ----------
const GARA_ORDER = ['100','200','400','800','1500','5000','10000','10KM','1/2MARATONA','MARATONA','4X100','4X400'];
function normalizeGara(g){
  return (g || '').toUpperCase().replace(/\s+/g, '').replace(/INDOOR$/, '');
}
function garaRank(g){
  const idx = GARA_ORDER.indexOf(normalizeGara(g));
  return idx === -1 ? 1000 : idx;
}
function catSortKey(cat){
  const m = (cat || '').match(/([A-Za-z]+)\s*[-/]?\s*(\d+)/);
  return {
    letter: m ? m[1].toUpperCase() : (cat || '').toUpperCase(),
    num: m ? parseInt(m[2], 10) : 0,
  };
}
RECORDS.forEach(r => {
  r.sexOrder = r.sex === 'F' ? 0 : 1;
  r.garaRank = garaRank(r.gara);
  const k = catSortKey(r.cat);
  r.catLetter = k.letter;
  r.catNum = k.num;
});
function defaultCompare(a, b){
  if(a.sexOrder !== b.sexOrder) return a.sexOrder - b.sexOrder;
  if(a.garaRank !== b.garaRank) return a.garaRank - b.garaRank;
  if(a.garaRank === 1000){ // gara non elencata: ordine alfabetico tra loro
    const ga = (a.gara||'').toLowerCase(), gb = (b.gara||'').toLowerCase();
    if(ga !== gb) return ga < gb ? -1 : 1;
  }
  if(a.catLetter !== b.catLetter) return a.catLetter < b.catLetter ? -1 : 1;
  if(a.catNum !== b.catNum) return a.catNum - b.catNum;
  return a.idx - b.idx;
}

// ---------- configurazione tab ----------
const TABS = [
  { key: 'outdoor', label: 'Outdoor', ambiente: 'outdoor', sheets: ['CORSE', 'CONCORSI'] },
  { key: 'indoor',  label: 'Indoor',  ambiente: 'indoor',  sheets: ['CORSE_Indoor', 'CONCORSI_Indoor'] },
];

let state = {
  tab: TABS[0].key,
  sex: 'ALL',
  search: '',
  sortKey: 'idx',
  sortDir: 'asc',
};

// ---------- utilità ----------
function parseWind(raw){
  if(!raw) return { display:'', mp:false };
  const hasMP = /mp/i.test(raw);
  const rest = hasMP ? raw.replace(/mp/i,'').replace(/[()]/g,'').trim() : raw.trim();
  const isNumeric = /^[+-]?\d+([.,]\d+)?$/.test(rest);
  let display;
  if(isNumeric){
    const num = parseFloat(rest.replace(',', '.'));
    display = (num > 0 ? '+' : '') + num.toFixed(1);
  } else {
    display = rest; // es. 'nd' o altro testo non numerico
  }
  return { display, mp: hasMP };
}

function currentTabConfig(){
  return TABS.find(t => t.key === state.tab);
}

function filteredRecords(){
  const cfg = currentTabConfig();
  const q = state.search.trim().toLowerCase();
  return RECORDS.filter(r => {
    if(r.ambiente !== cfg.ambiente) return false;
    if(r.sezione === 'trasferito') return false;
    if(state.sex !== 'ALL' && r.sex !== state.sex) return false;
    if(q){
      const hay = (r.atleta+' '+r.cat+' '+r.gara+' '+r.societa+' '+r.luogo).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

function dateSortValue(str){
  if(!str) return -1;
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m) return -1; // date non standard (es. testo libero) vanno in fondo
  const [, gg, mm, yyyy] = m;
  return parseInt(yyyy,10)*10000 + parseInt(mm,10)*100 + parseInt(gg,10);
}

function sortRecords(list){
  const { sortKey, sortDir } = state;
  const dir = sortDir === 'asc' ? 1 : -1;
  if(sortKey === 'idx'){
    return list.slice().sort((a,b) => defaultCompare(a,b) * dir);
  }
  if(sortKey === 'data'){
    return list.slice().sort((a,b) => {
      const av = dateSortValue(a.data), bv = dateSortValue(b.data);
      if(av !== bv) return (av-bv)*dir;
      return a.idx-b.idx;
    });
  }
  return list.slice().sort((a,b) => {
    let av = a[sortKey], bv = b[sortKey];
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
    const count = RECORDS.filter(r => r.ambiente===t.ambiente && r.sezione==='attivo').length;
    const btn = document.createElement('button');
    btn.className = 'tab' + (t.key===state.tab ? ' active' : '');
    btn.innerHTML = t.label + '<span class="tab-count">' + count + '</span>';
    btn.addEventListener('click', () => { state.tab = t.key; render(); });
    wrap.appendChild(btn);
  });
}

function renderUpdated(){
  const cfg = currentTabConfig();
  const dates = cfg.sheets.map(s => UPDATED[s] || '—');
  const uniq = [...new Set(dates)];
  let label;
  if(uniq.length === 1){
    label = uniq[0];
  } else {
    label = cfg.sheets.map((s,i) => (s.includes('CONCORSI') ? 'Concorsi' : 'Corse') + ' ' + dates[i]).join(' · ');
  }
  document.getElementById('updated-date').textContent = label;
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
    return `<tr>
      <td>${r.sex}</td>
      <td>${r.cat}</td>
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
