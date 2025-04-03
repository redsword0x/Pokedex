// Global variables
const pokeAPI = 'https://pokeapi.co/api/v2';
let currentOffset = 0;
const limit = 20;
let allPokemon = [];
let filteredPokemon = [];
let currentFilters = {
  search: '',
  type: '',
  generation: ''
};

// DOM elements
const pokemonGrid = document.getElementById('pokemon-grid');
const loadMoreBtn = document.getElementById('loadMore');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const generationFilter = document.getElementById('generationFilter');
const loadingContainer = document.querySelector('.loading-container');
const modal = document.getElementById('pokemon-modal');
const closeBtn = document.querySelector('.close-btn');

// Generation ranges (first and last Pokemon ID for each generation)
const generationRanges = {
  '1': [1, 151],
  '2': [152, 251],
  '3': [252, 386],
  '4': [387, 493],
  '5': [494, 649],
  '6': [650, 721],
  '7': [722, 809],
  '8': [810, 905],
  '9': [906, 1010]
};

// Event listeners
window.addEventListener('DOMContentLoaded', initPokedex);
loadMoreBtn.addEventListener('click', loadMorePokemon);
searchInput.addEventListener('input', handleSearchInput);
typeFilter.addEventListener('change', handleFilterChange);
generationFilter.addEventListener('change', handleFilterChange);
closeBtn.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// Initialize the Pokedex
async function initPokedex() {
  try {
    await fetchPokemon();
    hideLoading();
  } catch (error) {
    console.error('Failed to initialize Pokedex:', error);
    showErrorMessage('Failed to load Pokémon data. Please try again later.');
  }
}

// Fetch Pokemon data
async function fetchPokemon() {
  try {
    const response = await fetch(`${pokeAPI}/pokemon?limit=${limit}&offset=${currentOffset}`);
    const data = await response.json();
    
    const pokemonPromises = data.results.map(pokemon => fetchPokemonDetails(pokemon.url));
    const pokemonDetails = await Promise.all(pokemonPromises);
    
    allPokemon = [...allPokemon, ...pokemonDetails];
    filteredPokemon = applyFilters(allPokemon);
    
    renderPokemon(filteredPokemon);
    currentOffset += limit;
    
    return pokemonDetails;
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    throw error;
  }
}

// Fetch detailed information about a Pokemon
async function fetchPokemonDetails(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error fetching Pokemon details:', error);
    throw error;
  }
}

// Render Pokemon cards
function renderPokemon(pokemonList) {
  if (!pokemonList.length) {
    showEmptyState();
    return;
  }
  
  hideEmptyState();
  
  const newPokemonHTML = pokemonList.map(pokemon => {
    const types = pokemon.types.map(type => {
      return `<span class="pokemon-type type-${type.type.name}">${type.type.name}</span>`;
    }).join('');
    
    const id = formatPokemonId(pokemon.id);
    const name = pokemon.name;
    // Get official artwork if available, fallback to default sprite
    const imageUrl = pokemon.sprites.other['official-artwork'].front_default || 
                     pokemon.sprites.front_default;
    
    return `
      <div class="pokemon-card" data-id="${pokemon.id}">
        <div class="pokemon-card-header">
          <div class="pokemon-id">#${id}</div>
        </div>
        <div class="pokemon-image-container">
          <img src="${imageUrl}" alt="${name}" class="pokemon-image">
        </div>
        <div class="pokemon-info">
          <h3 class="pokemon-name">${name}</h3>
          <div class="pokemon-types">${types}</div>
        </div>
      </div>
    `;
  }).join('');
  
  if (currentOffset === limit) {
    // First load, replace content
    pokemonGrid.innerHTML = newPokemonHTML;
  } else {
    // Append to existing content
    pokemonGrid.innerHTML += newPokemonHTML;
  }
  
  // Add click event listeners to all cards
  document.querySelectorAll('.pokemon-card').forEach(card => {
    card.addEventListener('click', () => {
      const pokemonId = parseInt(card.getAttribute('data-id'));
      openPokemonDetails(pokemonId);
    });
  });
}

// Format Pokemon ID with leading zeros
function formatPokemonId(id) {
  return id.toString().padStart(3, '0');
}

// Load more Pokemon
async function loadMorePokemon() {
  try {
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
    
    await fetchPokemon();
    
    loadMoreBtn.textContent = 'Load More Pokémon';
    loadMoreBtn.disabled = false;
  } catch (error) {
    console.error('Error loading more Pokemon:', error);
    loadMoreBtn.textContent = 'Try Again';
    loadMoreBtn.disabled = false;
  }
}

// Handle search input
function handleSearchInput() {
  currentFilters.search = searchInput.value.toLowerCase();
  resetAndApplyFilters();
}

// Handle filter changes
function handleFilterChange() {
  currentFilters.type = typeFilter.value.toLowerCase();
  currentFilters.generation = generationFilter.value;
  resetAndApplyFilters();
}

// Reset filters and apply them
function resetAndApplyFilters() {
  filteredPokemon = applyFilters(allPokemon);
  pokemonGrid.innerHTML = '';
  renderPokemon(filteredPokemon);
}

// Apply filters to the Pokemon list
function applyFilters(pokemonList) {
  return pokemonList.filter(pokemon => {
    // Filter by search term
    const matchesSearch = currentFilters.search === '' || 
      pokemon.name.toLowerCase().includes(currentFilters.search) || 
      pokemon.id.toString() === currentFilters.search;
    
    // Filter by type
    const matchesType = currentFilters.type === '' || 
      pokemon.types.some(type => type.type.name === currentFilters.type);
    
    // Filter by generation
    let matchesGeneration = true;
    if (currentFilters.generation !== '') {
      const range = generationRanges[currentFilters.generation];
      matchesGeneration = pokemon.id >= range[0] && pokemon.id <= range[1];
    }
    
    return matchesSearch && matchesType && matchesGeneration;
  });
}

// Open Pokemon details modal
async function openPokemonDetails(pokemonId) {
  try {
    // Show loading state in modal
    document.getElementById('pokemon-details').innerHTML = `
      <div class="loading-container">
        <div class="loading-pokeball">
          <div class="pokeball">
            <div class="pokeball-top"></div>
            <div class="pokeball-center">
              <div class="pokeball-button"></div>
            </div>
            <div class="pokeball-bottom"></div>
          </div>
        </div>
        <p>Loading Pokémon details...</p>
      </div>
    `;
    
    // Show the modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    
    // Fetch detailed Pokemon data
    const pokemonData = await fetchPokemonDetails(`${pokeAPI}/pokemon/${pokemonId}`);
    
    // Fetch species data for additional information
    const speciesResponse = await fetch(pokemonData.species.url);
    const speciesData = await speciesResponse.json();
    
    // Get English flavor text
    const englishFlavorText = speciesData.flavor_text_entries
      .find(entry => entry.language.name === 'en')?.flavor_text || 'No description available.';
    
    // Get evolution chain
    let evolutionChainHTML = '<p>Evolution data not available.</p>';
    if (speciesData.evolution_chain) {
      try {
        const evolutionResponse = await fetch(speciesData.evolution_chain.url);
        const evolutionData = await evolutionResponse.json();
        evolutionChainHTML = await buildEvolutionChain(evolutionData.chain);
      } catch (error) {
        console.error('Error fetching evolution data:', error);
      }
    }
    
    // Determine background color based on primary type
    const primaryType = pokemonData.types[0].type.name;
    const typeColor = `var(--type-${primaryType})`;
    
    // Build stats
    const statsHTML = pokemonData.stats.map(stat => {
      const statName = stat.stat.name.replace('-', ' ');
      const statValue = stat.base_stat;
      const statPercentage = Math.min(100, (statValue / 255) * 100);
      
      return `
        <div class="stat-row">
          <div class="stat-name">${formatStatName(statName)}</div>
          <div class="stat-container">
            <div class="stat-bar-container">
              <div class="stat-bar" style="width: ${statPercentage}%; background-color: ${typeColor};"></div>
            </div>
          </div>
          <div class="stat-value">${statValue}</div>
        </div>
      `;
    }).join('');
    
    // Generate types HTML
    const typesHTML = pokemonData.types.map(type => {
      return `<span class="pokemon-detail-type type-${type.type.name}">${type.type.name}</span>`;
    }).join('');
    
    // Render modal content
    document.getElementById('pokemon-details').innerHTML = `
      <div class="detail-header" style="background: linear-gradient(135deg, ${typeColor} 0%, var(--pokedex-light) 100%);">
        <div class="pokemon-detail-id">#${formatPokemonId(pokemonData.id)}</div>
        <h2 class="pokemon-detail-name">${pokemonData.name}</h2>
        <div class="pokemon-detail-types">
          ${typesHTML}
        </div>
        <div class="pokemon-detail-image-container">
          <img src="${pokemonData.sprites.other['official-artwork'].front_default || pokemonData.sprites.front_default}" 
               alt="${pokemonData.name}" 
               class="pokemon-detail-image">
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-section">
          <h3 class="section-title">About</h3>
          <p>${englishFlavorText.replace(/\f/g, ' ')}</p>
          <div class="detail-info">
            <div class="info-group">
              <p class="info-label">Height</p>
              <p class="info-value">${(pokemonData.height / 10).toFixed(1)} m</p>
            </div>
            <div class="info-group">
              <p class="info-label">Weight</p>
              <p class="info-value">${(pokemonData.weight / 10).toFixed(1)} kg</p>
            </div>
            <div class="info-group">
              <p class="info-label">Abilities</p>
              <p class="info-value">${pokemonData.abilities.map(ability => 
                ability.ability.name.replace('-', ' ')
              ).join(', ')}</p>
            </div>
            <div class="info-group">
              <p class="info-label">Base Experience</p>
              <p class="info-value">${pokemonData.base_experience || 'Unknown'}</p>
            </div>
          </div>
        </div>
        <div class="detail-section">
          <h3 class="section-title">Base Stats</h3>
          <div class="stats-container">
            ${statsHTML}
          </div>
        </div>
        <div class="detail-section">
          <h3 class="section-title">Evolution Chain</h3>
          <div class="evolution-chain">
            ${evolutionChainHTML}
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners to evolution images
    document.querySelectorAll('.evolution-image').forEach(img => {
      img.addEventListener('click', () => {
        const pokemonId = img.getAttribute('data-id');
        openPokemonDetails(pokemonId);
      });
    });
    
  } catch (error) {
    console.error('Error opening Pokemon details:', error);
    document.getElementById('pokemon-details').innerHTML = `
      <div class="detail-body">
        <div class="detail-section">
          <h3 class="section-title">Error</h3>
          <p>Failed to load Pokémon details. Please try again later.</p>
        </div>
      </div>
    `;
  }
}

// Build the evolution chain HTML
async function buildEvolutionChain(chain) {
  try {
    let evolutionHTML = '';
    let currentChain = chain;
    let evolutionData = [];
    
    // Process the first Pokemon in the chain
    const firstPokemonSpecies = currentChain.species.name;
    const firstPokemonDetails = await fetchPokemonSpeciesDetails(currentChain.species.url);
    evolutionData.push({
      name: firstPokemonSpecies,
      id: firstPokemonDetails.id,
      image: await getPokemonImage(firstPokemonDetails.id)
    });
    
    // Process the rest of the chain
    while (currentChain.evolves_to.length > 0) {
      const evolutionDetails = currentChain.evolves_to[0].evolution_details[0];
      currentChain = currentChain.evolves_to[0];
      
      const pokemonSpecies = currentChain.species.name;
      const pokemonDetails = await fetchPokemonSpeciesDetails(currentChain.species.url);
      
      evolutionData.push({
        name: pokemonSpecies,
        id: pokemonDetails.id,
        image: await getPokemonImage(pokemonDetails.id),
        evolutionDetails: evolutionDetails
      });
    }
    
    // Build the HTML
    evolutionData.forEach((pokemon, index) => {
      evolutionHTML += `
        <div class="evolution-item">
          <img src="${pokemon.image}" alt="${pokemon.name}" class="evolution-image" data-id="${pokemon.id}">
          <p class="evolution-name">${pokemon.name}</p>
        </div>
      `;
      
      if (index < evolutionData.length - 1) {
        evolutionHTML += `<div class="evolution-arrow">→</div>`;
      }
    });
    
    return evolutionHTML || '<p>No evolution data available.</p>';
  } catch (error) {
    console.error('Error building evolution chain:', error);
    return '<p>Error loading evolution data.</p>';
  }
}

// Get Pokemon image by ID
async function getPokemonImage(id) {
  try {
    const response = await fetch(`${pokeAPI}/pokemon/${id}`);
    const data = await response.json();
    return data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
  } catch (error) {
    console.error('Error fetching Pokemon image:', error);
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'; // Fallback image
  }
}

// Fetch Pokemon species details
async function fetchPokemonSpeciesDetails(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error fetching Pokemon species details:', error);
    throw error;
  }
}

// Format stat name for display
function formatStatName(statName) {
  const statMap = {
    'hp': 'HP',
    'attack': 'Attack',
    'defense': 'Defense',
    'special attack': 'Sp. Atk',
    'special defense': 'Sp. Def',
    'speed': 'Speed'
  };
  
  return statMap[statName] || statName;
}

// Close the modal
function closeModal() {
  modal.classList.remove('active');
  document.body.style.overflow = 'auto'; // Restore scrolling
}

// Hide loading container
function hideLoading() {
  loadingContainer.style.display = 'none';
  pokemonGrid.style.display = 'grid';
  loadMoreBtn.style.display = 'block';
}

// Show error message
function showErrorMessage(message) {
  loadingContainer.innerHTML = `
    <div class="error-message">
      <p>${message}</p>
      <button class="load-more-btn" onclick="location.reload()">Retry</button>
    </div>
  `;
}

// Show empty state
function showEmptyState() {
  pokemonGrid.innerHTML = `
    <div class="empty-state">
      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="Pokeball">
      <h3>No Pokémon Found</h3>
      <p>Try adjusting your search or filters</p>
    </div>
  `;
  loadMoreBtn.style.display = 'none';
}

// Hide empty state
function hideEmptyState() {
  loadMoreBtn.style.display = 'block';
}
