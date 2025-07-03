const searchInput = document.getElementById('search');
const gamesContainer = document.getElementById('games');
const ratedContainer = document.getElementById('rated-games');
const tabSearch = document.getElementById('tab-search');
const tabRated = document.getElementById('tab-rated');
const searchSection = document.getElementById('search-section');
const ratedSection = document.getElementById('rated-section');

const filterYear = document.getElementById('filter-year');
const sortRated = document.getElementById('sort-rated');

tabSearch.addEventListener('click', () => {
  tabSearch.classList.add('active');
  tabRated.classList.remove('active');
  searchSection.style.display = 'block';
  ratedSection.style.display = 'none';
});

tabRated.addEventListener('click', () => {
  tabRated.classList.add('active');
  tabSearch.classList.remove('active');
  searchSection.style.display = 'none';
  ratedSection.style.display = 'block';
  updateFilters();
  renderRatedGames();
});

filterYear.addEventListener('change', renderRatedGames);
sortRated.addEventListener('change', renderRatedGames);

searchInput.addEventListener('input', debounce(async () => {
  const query = searchInput.value.trim();
  if (query.length < 2) {
    gamesContainer.innerHTML = '';
    return;
  }
  const games = await fetchGames(query);
  renderGames(games);
}, 400));

async function fetchGames(query) {
  try {
    const res = await fetch(`/api/games?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Chyba při získávání dat');
    const data = await res.json();
    return data;
  } catch (e) {
    console.error(e);
    return [];
  }
}

function renderGames(games) {
  gamesContainer.innerHTML = '';
  if (games.length === 0) {
    gamesContainer.innerHTML = '<p>No games found.</p>';
    return;
  }
  games.forEach(game => {
    const div = document.createElement('div');
    div.className = 'card';
    const coverUrl = game.cover?.url?.replace('t_thumb', 't_cover_big') || '';
    div.innerHTML = `
      <img src="${coverUrl}" alt="${game.name}">
      <div class="info">
        <h3>${game.name}</h3>
        <p>${game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : ''}</p>
      </div>
      <div class="stars">${generateStarsHTML(getRating(game.id))}</div>
    `;
    gamesContainer.appendChild(div);

    div.querySelectorAll('.star').forEach((star, i) => {
      star.addEventListener('click', () => {
        saveRating(game, i + 1);
        renderGames(games);
      });
    });
  });
}

function renderRatedGames() {
  ratedContainer.innerHTML = '';
  const ratedGames = JSON.parse(localStorage.getItem('ratedGames') || '{}');
  let gamesArr = Object.values(ratedGames).filter(entry => entry && entry.game);

  if (gamesArr.length === 0) {
    ratedContainer.innerHTML = '<p>You have no reviews yet.</p>';
    return;
  }

  // --- Filtrování podle roku vydání ---
  const selectedYear = filterYear.value;
  if (selectedYear) {
    gamesArr = gamesArr.filter(({ game }) => {
      if (!game.first_release_date) return false;
      const year = new Date(game.first_release_date * 1000).getFullYear().toString();
      return year === selectedYear;
    });
  }

  // --- Filtrování podle hledaného textu ---
  const searchTerm = searchRatedInput.value.trim().toLowerCase();
  if (searchTerm.length > 0) {
    gamesArr = gamesArr.filter(({ game }) => {
      return game.name?.toLowerCase().includes(searchTerm);
    });
  }

  // --- Řazení ---
  const sort = sortRated.value;
  gamesArr.sort((a, b) => {
    switch (sort) {
      case 'newest':
        return (b.timestamp || 0) - (a.timestamp || 0);
      case 'oldest':
        return (a.timestamp || 0) - (b.timestamp || 0);
      case 'rating-desc':
        return b.rating - a.rating;
      case 'rating-asc':
        return a.rating - b.rating;
      case 'year-desc':
        return (b.game.first_release_date || 0) - (a.game.first_release_date || 0);
      case 'year-asc':
        return (a.game.first_release_date || 0) - (b.game.first_release_date || 0);
      default:
        return 0;
    }
  });

  if (gamesArr.length === 0) {
    ratedContainer.innerHTML = '<p>No games match the selected filters.</p>';
    return;
  }

  // --- Renderování ---
  gamesArr.forEach(({ game, rating }) => {
    const div = document.createElement('div');
    div.className = 'card';
    const coverUrl = game.cover?.url?.replace('t_thumb', 't_cover_big') || '';
    div.innerHTML = `
      <img src="${coverUrl}" alt="${game.name}">
      <div class="info">
        <h3>${game.name}</h3>
        <p>${game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : ''}</p>
      </div>
      <div class="stars">${generateStarsHTML(rating)}</div>
      <button class="remove-btn">🗑️</button>
    `;
    ratedContainer.appendChild(div);

    div.querySelectorAll('.star').forEach((star, i) => {
      star.addEventListener('click', () => {
        saveRating(game, i + 1);
        renderRatedGames();
      });
    });

    div.querySelector('.remove-btn').addEventListener('click', () => {
      const allRated = JSON.parse(localStorage.getItem('ratedGames') || '{}');
      delete allRated[game.id];
      localStorage.setItem('ratedGames', JSON.stringify(allRated));
      updateFilters();
      renderRatedGames();
    });
  });
}


function updateFilters() {
  const ratedGames = JSON.parse(localStorage.getItem('ratedGames') || '{}');
  const gamesArr = Object.values(ratedGames);

  // --- Roky ---
  const yearsSet = new Set();
  gamesArr.forEach(({ game }) => {
    if (game.first_release_date) {
      const year = new Date(game.first_release_date * 1000).getFullYear();
      yearsSet.add(year);
    }
  });

  // Naplnění selectu let
  filterYear.innerHTML = '<option value="">Release date</option>';
  Array.from(yearsSet).sort((a,b) => b - a).forEach(year => {
    const opt = document.createElement('option');
    opt.value = year.toString();
    opt.textContent = year;
    filterYear.appendChild(opt);
  });
}

function generateStarsHTML(rating) {
  let starsHTML = '';
  for (let i = 1; i <= 5; i++) {
    starsHTML += `<span class="star${i <= rating ? ' selected' : ''}">&#9733;</span>`;
  }
  return starsHTML;
}

function saveRating(game, rating) {
  const ratedGames = JSON.parse(localStorage.getItem('ratedGames') || '{}');
  ratedGames[game.id] = {
    rating,
    game,
    timestamp: Date.now() // Ukládáme čas hodnocení
  };
  localStorage.setItem('ratedGames', JSON.stringify(ratedGames));
}

function getRating(gameId) {
  const ratedGames = JSON.parse(localStorage.getItem('ratedGames') || '{}');
  return ratedGames[gameId]?.rating || 0;
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

const searchRatedInput = document.getElementById('search-rated');

searchRatedInput.addEventListener('input', debounce(() => {
  renderRatedGames();
}, 300));
