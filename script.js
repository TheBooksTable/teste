// script.js (atualizado)
// Base original: uploaded files index.html + script.js. See filecite references in chat. :contentReference[oaicite:2]{index=2}

const $ = id => document.getElementById(id);
let currentShow = null;
let allEpisodes = [];
const SURPRISE_LIST = ['Breaking Bad','The Office','Friends','SpongeBob SquarePants','Rick and Morty','Stranger Things','The Simpsons','Archer','Seinfeld','Avatar: The Last Airbender'];

function loadFavorites(){
  try { return JSON.parse(localStorage.getItem('ref-favs')||'[]'); } catch(e){ return []; }
}
function saveFavorites(list){ localStorage.setItem('ref-favs', JSON.stringify(list)); }
function findFav(showId){
  return loadFavorites().find(f => f.id === showId);
}
function ensureFavExists(show){
  const favs = loadFavorites();
  if(!favs.find(f => f.id === show.id)){
    favs.push({ id: show.id, name: show.name, watched: [] });
    saveFavorites(favs);
    renderFavorites();
  }
}

function toggleWatched(showId, episodeId){
  const favs = loadFavorites();
  let fav = favs.find(f => f.id === showId);
  if(!fav){
    // if show not in favorites, add it so we keep the watched cache together with favorites
    fav = { id: showId, name: currentShow?.name || 'Unknown', watched: [] };
    favs.push(fav);
  }
  fav.watched = fav.watched || [];
  const idx = fav.watched.indexOf(episodeId);
  let added = false;
  if(idx === -1){
    fav.watched.push(episodeId);
    added = true;
  } else {
    fav.watched.splice(idx, 1);
  }
  saveFavorites(favs);
  renderFavorites();
  renderEpisodesList(); // refresh list UI
  // update result area button text if the episode shown is the one toggled
  const resBtn = document.getElementById('markWatchedBtn');
  if(resBtn){
    const curEpId = Number(resBtn.dataset.epid);
    if(curEpId === episodeId){
      resBtn.textContent = added ? 'Desmarcar como assistido' : 'Marcar como já assistido';
    }
  }
  return added;
}

function renderFavorites(){
  const list = loadFavorites();
  const ul = $('favoritesList');
  ul.innerHTML = '';
  if(list.length===0){ ul.innerHTML = '<li class="muted">No favorites yet</li>'; return; }
  list.forEach(s => {
    const li = document.createElement('li');
    const watchedCount = (s.watched && s.watched.length) ? ` — ${s.watched.length} assistido(s)` : '';
    li.innerHTML = `<span>${escapeHtml(s.name)}${watchedCount}</span> <button data-id="${s.id}" class="removeFav">✖</button>`;
    ul.appendChild(li);
  });
  document.querySelectorAll('.removeFav').forEach(b => b.addEventListener('click', e => {
    const id = Number(e.currentTarget.dataset.id);
    const newList = loadFavorites().filter(x => x.id !== id);
    saveFavorites(newList);
    renderFavorites();
    renderEpisodesList(); // if we removed a favorite, refresh episodes list UI
  }));
}

function escapeHtml(str){
  return (''+str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

async function searchShow(query){
  const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
  if(!res.ok) throw new Error('Search failed');
  return res.json();
}
async function getEpisodesForShow(showId){
  const res = await fetch(`https://api.tvmaze.com/shows/${showId}/episodes`);
  if(!res.ok) throw new Error('Episodes fetch failed');
  return res.json();
}

function populateSeasonSelectors(episodes){
  const seasons = [...new Set(episodes.map(e=>e.season))].sort((a,b)=>a-b);
  const from = $('fromSeason'); const to = $('toSeason');
  from.innerHTML = ''; to.innerHTML = '';
  seasons.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = `Season ${s}`;
    from.appendChild(opt);
    to.appendChild(opt.cloneNode(true));
  });
  from.value = seasons[0];
  to.value = seasons[seasons.length-1];
}

function filterEpisodesBySeasonRange(eps, fromS, toS){
  return eps.filter(e => e.season >= fromS && e.season <= toS);
}
function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function getWatchedForCurrentShow(){
  if(!currentShow) return [];
  const fav = findFav(currentShow.id);
  return (fav && fav.watched) ? fav.watched.slice() : [];
}

function renderResult(episode, show){
  const container = $('resultArea');
  container.classList.remove('hidden');
  const img = episode.image ? episode.image.medium : (show.image ? show.image.medium : 'https://via.placeholder.com/300x200?text=No+Image');
  const watchedIds = getWatchedForCurrentShow();
  const isWatched = watchedIds.includes(episode.id);
  container.innerHTML = `
    <div class="thumb"><img src="${img}" alt="thumb"/></div>
    <div class="meta">
      <div class="muted">${escapeHtml(show.name)} — S${episode.season}E${episode.number}</div>
      <h2>${escapeHtml(episode.name)}</h2>
      <p class="muted">Aired: ${episode.airdate || 'Unknown'}</p>
      <p>${episode.summary ? episode.summary.replace(/<[^>]+>/g,'') : 'No summary available.'}</p>
      <div style="display:flex;gap:10px;align-items:center;margin-top:8px">
        <button id="saveFav" class="btn btn-clear">♡ Save Show</button>
        <button id="markWatchedBtn" class="btn btn-fav" data-epid="${episode.id}">${isWatched ? 'Desmarcar como assistido' : 'Marcar como já assistido'}</button>
      </div>
    </div>
    <div class="rating">${episode.rating?.average || ''}</div>
  `;
  $('saveFav').addEventListener('click', () => {
    const favs = loadFavorites();
    if(!favs.find(f=>f.id===show.id)){
      favs.push({id: show.id, name: show.name, watched: []});
      saveFavorites(favs);
      renderFavorites();
      alert('Saved to favorites!');
    } else {
      alert('Already in favorites');
    }
  });
  $('markWatchedBtn').addEventListener('click', (e) => {
    const epId = Number(e.currentTarget.dataset.epid);
    const added = toggleWatched(show.id, epId);
    if(added && !findFav(show.id)){
      // ensure show saved if not already
      ensureFavExists(show);
      alert('Show was saved to favorites to keep watched cache.');
    }
    // update button text handled inside toggleWatched
  });
}

function renderEpisodesList(){
  const container = $('episodesList');
  container.innerHTML = '';
  if(!currentShow || allEpisodes.length===0) return;
  const h = document.createElement('div');
  h.className = 'card';
  h.style.padding = '12px';
  h.innerHTML = `<h3>Episodes — ${escapeHtml(currentShow.name)}</h3>`;
  container.appendChild(h);

  const listWrap = document.createElement('div');
  listWrap.className = 'card';
  listWrap.style.padding = '12px';
  // group by season
  const seasons = [...new Set(allEpisodes.map(e=>e.season))].sort((a,b)=>a-b);
  const watchedIds = getWatchedForCurrentShow();
  seasons.forEach(season => {
    const seasonHeader = document.createElement('div');
    seasonHeader.className = 'muted';
    seasonHeader.style.marginTop = '8px';
    seasonHeader.textContent = `Season ${season}`;
    listWrap.appendChild(seasonHeader);

    allEpisodes.filter(e => e.season === season).forEach(ep => {
      

      if(watchedIds.includes(ep.id)){
        epDiv.classList.add('watched');
        // também ajustar o texto do botão markEp se quiser — seu código já faz isso
      }
      const epDiv = document.createElement('div');
      epDiv.style.display = 'flex';
      epDiv.style.justifyContent = 'space-between';
      epDiv.style.alignItems = 'center';
      epDiv.style.padding = '6px 0';
      epDiv.innerHTML = `<div><strong>S${ep.season}E${ep.number}</strong> — ${escapeHtml(ep.name)}</div>
                         <div style="display:flex;gap:8px;align-items:center">
                           <button class="btn btn-clear playEp" data-epid="${ep.id}">Mostrar</button>
                           <button class="btn btn-fav markEp" data-epid="${ep.id}">${watchedIds.includes(ep.id) ? 'Desmarcar' : 'Já assistido'}</button>
                         </div>
                        `;
      listWrap.appendChild(epDiv);
    });
  });

  container.appendChild(listWrap);

  // bind buttons
  container.querySelectorAll('.markEp').forEach(b => {
    b.addEventListener('click', e => {
      const epId = Number(e.currentTarget.dataset.epid);
      const added = toggleWatched(currentShow.id, epId);
      alert(added ? 'Marcado como assistido' : 'Desmarcado como assistido');
    });
  });
  container.querySelectorAll('.playEp').forEach(b => {
    b.addEventListener('click', e => {
      const epId = Number(e.currentTarget.dataset.epid);
      const ep = allEpisodes.find(x => x.id === epId);
      if(ep) renderResult(ep, currentShow);
    });
  });
}

// Events
$('searchBtn').addEventListener('click', async () => {
  const q = $('searchInput').value.trim();
  if(!q){ alert('Type a show name'); return; }
  try {
    const data = await searchShow(q);
    if(data.length===0){ alert('No shows found'); return; }
    currentShow = data[0].show;
    allEpisodes = await getEpisodesForShow(currentShow.id);
    populateSeasonSelectors(allEpisodes);
    // when picking random for initial search, exclude watched episodes
    const watchedIds = getWatchedForCurrentShow();
    const available = allEpisodes.filter(e => !watchedIds.includes(e.id));
    const pick = (available.length>0) ? pickRandom(available) : pickRandom(allEpisodes);
    renderResult(pick, currentShow);
    renderEpisodesList();
  } catch(err) { console.error(err); alert('Error: '+err.message); }
});

$('findBtn').addEventListener('click', () => {
  if(!currentShow || allEpisodes.length===0){ alert('Search a show first'); return; }
  const fromS = Number($('fromSeason').value);
  const toS = Number($('toSeason').value);
  let filtered = filterEpisodesBySeasonRange(allEpisodes, fromS, toS);
  // exclude watched episodes
  const watchedIds = getWatchedForCurrentShow();
  filtered = filtered.filter(e => !watchedIds.includes(e.id));
  if(filtered.length===0){
    alert('No unseen episodes in that range (all marked as watched).');
    return;
  }
  renderResult(pickRandom(filtered), currentShow);
});

$('surpriseBtn').addEventListener('click', () => {
  const showName = pickRandom(SURPRISE_LIST);
  $('searchInput').value = showName;
  $('searchBtn').click();
});

$('clearBtn').addEventListener('click', () => {
  if(confirm('Clear all favorites?')){
    localStorage.removeItem('ref-favs');
    renderFavorites();
    renderEpisodesList();
  }
});

$('searchInput').addEventListener('keydown', e => {
  if(e.key==='Enter') $('searchBtn').click();
});

renderFavorites();
