// Main Application Entry Point
import { STORAGE_KEYS, AUTO_REFRESH_INTERVAL } from './config.js';
import { 
    getViewMode, 
    setViewMode, 
    getCurrentStation, 
    setCurrentStation,
    getAutoRefreshInterval,
    setAutoRefreshInterval,
    getFavorites,
    getRecentSearches,
    getMap
} from './state.js';
import { loadStations, searchStations, searchNearbyStations } from './stations.js';
import { loadFavorites, toggleFavorite } from './favorites.js';
import { loadRecentSearches, addRecentSearch } from './recent-searches.js';
import { loadDeparturesFromAPI } from './api.js';
import { 
    displayDepartures, 
    displaySuggestions, 
    displayNearbyStations,
    updateFavoritesUI,
    updateRecentSearchesUI
} from './ui-rendering.js';
import { initMap } from './map.js';
import { showLoading, showError, updateLoadingStatus, debounce } from './utils.js';

// Initialize App
async function initializeApp() {
    await loadStations();
    loadFavorites();
    loadRecentSearches();
    
    // Load view mode from localStorage
    const savedViewMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    if (savedViewMode) {
        setViewMode(savedViewMode);
    }
    
    initTabs();
    initStationSearch();
    initNearbySearch();
    initMap();
    initThemeToggle();
    updateFavoritesUI();
    updateRecentSearchesUI();
    
    // Expose state for UI components
    window.appState = {
        get favorites() { return getFavorites(); },
        get recentSearches() { return getRecentSearches(); }
    };
}

// Theme Toggle
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
    }
    
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    });
}

// Tab Navigation
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    let previousTab = 'station';

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Skip if clicking already active tab
            if (tabName === previousTab) return;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');

            // ALWAYS stop auto-refresh and clear station on ANY tab change
            stopAutoRefresh();
            setCurrentStation(null);
            const results = document.getElementById('results');
            if (results) results.innerHTML = '';

            if (tabName === 'map') {
                const map = getMap();
                if (map) {
                    setTimeout(() => map.invalidateSize(), 100);
                }
            }
            
            previousTab = tabName;
        });
    });
}

function switchToStationTab(stationName) {
    // Switch to station tab without loading
    document.querySelector('[data-tab="station"]').click();
    // Pre-fill search with station name
    const input = document.getElementById('station-input');
    if (input) {
        input.value = stationName;
        input.focus();
    }
}

// Auto-refresh Management
function stopAutoRefresh() {
    const interval = getAutoRefreshInterval();
    if (interval) {
        clearInterval(interval);
        setAutoRefreshInterval(null);
        console.log('🛑 Auto-refresh stopped');
    }
}

function startAutoRefresh(station) {
    stopAutoRefresh(); // Clear any existing interval
    setCurrentStation(station);
    
    // Refresh every 10 seconds
    const interval = setInterval(() => {
        const currentStation = getCurrentStation();
        if (currentStation) {
            console.log('🔄 Auto-refreshing departures...');
            loadDepartures(currentStation, true); // true = silent refresh
        }
    }, AUTO_REFRESH_INTERVAL);
    
    setAutoRefreshInterval(interval);
    console.log('▶️ Auto-refresh started (10s interval)');
}

// Station Search
function initStationSearch() {
    const input = document.getElementById('station-input');
    const searchBtn = document.getElementById('search-btn');
    const suggestions = document.getElementById('suggestions');

    input.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            suggestions.innerHTML = '';
            return;
        }

        const stations = searchStations(query);
        displaySuggestions(stations);
    }, 300));

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    searchBtn.addEventListener('click', async () => {
        const query = input.value.trim();
        if (query.length < 2) return;

        const stations = searchStations(query);
        if (stations.length > 0) {
            loadDepartures(stations[0]);
        }
    });
}

// Load Departures
async function loadDepartures(station, isSilentRefresh = false) {
    if (!isSilentRefresh) {
        // Switch to station tab to show results
        const stationTabBtn = document.querySelector('[data-tab="station"]');
        if (stationTabBtn && !stationTabBtn.classList.contains('active')) {
            stationTabBtn.click();
        }
        
        showLoading(true);
        updateLoadingStatus('Initialisiere...');
        stopAutoRefresh(); // Stop old refresh
        setCurrentStation(station); // Update current station
        
        // Clear suggestions when loading departures
        const suggestions = document.getElementById('suggestions');
        if (suggestions) {
            suggestions.innerHTML = '';
        }
    }
    
    try {
        const { station: fullStation, monitors } = await loadDeparturesFromAPI(station, isSilentRefresh);
        
        // Add to recent searches with full data (only on initial load)
        if (!isSilentRefresh) {
            addRecentSearch(fullStation);
            updateRecentSearchesUI();
        }
        
        if (monitors.length > 0) {
            if (!isSilentRefresh) {
                updateLoadingStatus('Erstelle Ansicht...');
            }
            displayDepartures(fullStation, monitors);
            
            // Start auto-refresh only on initial load (not silent refresh)
            if (!isSilentRefresh) {
                startAutoRefresh(fullStation);
            }
        } else {
            showError('Keine Abfahrtsdaten verfügbar');
        }
    } catch (error) {
        console.error('API Error:', error);
        showError(`Fehler beim Laden der Abfahrten: ${error.message}`);
        stopAutoRefresh(); // Stop refresh on error
    } finally {
        if (!isSilentRefresh) {
            showLoading(false);
        }
    }
}

// Toggle View Mode
function toggleViewMode() {
    const currentViewMode = getViewMode();
    const newViewMode = currentViewMode === 'normal' ? 'compact' : 'normal';
    setViewMode(newViewMode);
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, newViewMode);
    
    // Re-render if a station is currently displayed
    const currentStation = getCurrentStation();
    if (currentStation) {
        const resultsDiv = document.getElementById('results');
        if (resultsDiv.querySelector('.station-card')) {
            // Trigger a silent refresh to re-render with new view
            loadDepartures(currentStation, false);
        }
    }
}

// Toggle Expand Line (for compact view)
function toggleExpandLine(groupId) {
    const expandedRows = document.querySelectorAll(`[data-group-id="${groupId}"].compact-extra`);
    const toggleBtn = document.querySelector(`[data-group-id="${groupId}"].expand-btn`);
    
    expandedRows.forEach(row => {
        row.classList.toggle('hidden');
    });
    
    if (toggleBtn) {
        const isExpanded = !expandedRows[0]?.classList.contains('hidden');
        toggleBtn.textContent = isExpanded ? '−' : '+';
        toggleBtn.setAttribute('title', isExpanded ? 'Weniger anzeigen' : 'Weitere Abfahrten anzeigen');
    }
}

// Nearby Search
function initNearbySearch() {
    const nearbyBtn = document.getElementById('nearby-btn');
    const locationBtn = document.getElementById('location-btn');

    nearbyBtn.addEventListener('click', async () => {
        const lat = parseFloat(document.getElementById('lat-input').value);
        const lon = parseFloat(document.getElementById('lon-input').value);
        const radius = parseInt(document.getElementById('radius-input').value);

        if (isNaN(lat) || isNaN(lon)) {
            alert('Bitte geben Sie gültige Koordinaten ein');
            return;
        }

        await searchNearby(lat, lon, radius);
    });

    locationBtn.addEventListener('click', () => {
        if ('geolocation' in navigator) {
            showLoading(true);
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    
                    document.getElementById('lat-input').value = lat.toFixed(6);
                    document.getElementById('lon-input').value = lon.toFixed(6);
                    
                    const radius = parseInt(document.getElementById('radius-input').value);
                    await searchNearby(lat, lon, radius);
                },
                (error) => {
                    showLoading(false);
                    alert('Standort konnte nicht ermittelt werden: ' + error.message);
                }
            );
        } else {
            alert('Geolokalisierung wird von Ihrem Browser nicht unterstützt');
        }
    });
}

async function searchNearby(lat, lon, radius) {
    showLoading(true);
    
    try {
        const nearbyStations = searchNearbyStations(lat, lon, radius);
        displayNearbyStations(nearbyStations, lat, lon);
    } catch (error) {
        showError('Fehler bei der Umkreissuche');
    } finally {
        showLoading(false);
    }
}

// Public handlers for inline onclick events in HTML
window.appHandlers = {
    loadDeparturesForStation: loadDepartures,
    toggleViewMode,
    toggleExpandLine,
    switchToStationTab,
    searchNearby,
    toggleFavoriteAndUpdate: (station, btnElement) => {
        toggleFavorite(station);
        btnElement.classList.toggle('active');
    },
    toggleFavoriteAndUpdateFavorites: (station) => {
        toggleFavorite(station);
        updateFavoritesUI();
    },
    toggleFavoriteAndRefreshSuggestions: (station) => {
        toggleFavorite(station);
        const query = document.getElementById('station-input').value;
        if (query) {
            const stations = searchStations(query);
            displaySuggestions(stations);
        }
    }
};

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
