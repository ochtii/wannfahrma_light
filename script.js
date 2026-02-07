// Wiener Linien API Configuration
const API_BASE = 'https://www.wienerlinien.at';
// Multi-proxy strategy: Cloudflare Worker (reliable) with fallbacks
const CORS_PROXIES = [
    { url: 'https://wannfahrma-cors-proxy.stefan-radakovits.workers.dev/?url=', unwrap: false, name: 'Cloudflare Worker' },
    { url: 'https://api.allorigins.win/get?url=', unwrap: true, name: 'allorigins.win' },
    { url: 'https://corsproxy.io/?', unwrap: false, name: 'corsproxy.io' }
];
let currentProxyIndex = 0;

// State
let map = null;
let currentMarkers = [];
let stations = [];
let favorites = [];
let recentSearches = [];
let autoRefreshInterval = null;
let currentStation = null;

// LocalStorage Keys
const STORAGE_KEYS = {
    FAVORITES: 'wl_favorites',
    RECENT: 'wl_recent_searches'
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await loadStations();
    loadFavorites();
    loadRecentSearches();
    initTabs();
    initStationSearch();
    initNearbySearch();
    initMap();
    initThemeToggle();
    initFavorites();
    updateRecentSearchesUI();
});

// Load Stations from JSON
async function loadStations() {
    try {
        const response = await fetch('stations_full.json');
        if (!response.ok) throw new Error('Failed to load stations');
        const data = await response.json();
        
        // Transform data structure: longitude->lon, latitude->lat, rbls[0]->rbl
        stations = data.stations
            .filter(s => s.rbls && s.rbls.length > 0) // Only stations with RBL
            .map(s => ({
                name: s.name,
                municipality: s.municipality,
                lat: s.latitude,
                lon: s.longitude,
                rbl: Math.floor(parseFloat(s.rbls[0])), // Convert "2093.0" to 2093
                rbls: s.rbls.map(r => Math.floor(parseFloat(r))).filter(r => !isNaN(r) && r > 0) // All RBLs
            }))
            .filter(s => !isNaN(s.rbl) && s.rbl > 0 && s.rbls.length > 0); // Remove invalid RBLs
        
        console.log(`Loaded ${stations.length} stations from ${data.stations.length} total`);
    } catch (error) {
        console.error('Error loading stations:', error);
        stations = [];
    }
}

// Theme Toggle
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
    }
    
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// Favorites Management
function loadFavorites() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES);
        favorites = stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading favorites:', error);
        favorites = [];
    }
}

function saveFavorites() {
    try {
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

function addFavorite(station) {
    if (!isFavorite(station.rbl)) {
        favorites.push(station);
        saveFavorites();
        updateFavoritesUI();
    }
}

function removeFavorite(rbl) {
    favorites = favorites.filter(f => f.rbl !== rbl);
    saveFavorites();
    updateFavoritesUI();
}

function isFavorite(rbl) {
    return favorites.some(f => f.rbl === rbl);
}

function toggleFavorite(station) {
    if (isFavorite(station.rbl)) {
        removeFavorite(station.rbl);
    } else {
        addFavorite(station);
    }
}

function initFavorites() {
    updateFavoritesUI();
}

function updateFavoritesUI() {
    const favoritesList = document.getElementById('favorites-list');
    
    if (favorites.length === 0) {
        favoritesList.innerHTML = `
            <div class="empty-message">
                <h3>Keine Favoriten</h3>
                <p>Fügen Sie Stationen zu Ihren Favoriten hinzu, indem Sie auf den Stern ⭐ klicken.</p>
            </div>
        `;
        return;
    }
    
    favoritesList.innerHTML = favorites.map(station => `
        <div class="favorite-item">
            <div class="favorite-info" onclick="switchToStationTab('${station.name.replace(/'/g, "\\'")}')">
                <strong>${station.name}</strong>
                <small>${station.municipality || ''}</small>
            </div>
            <button class="favorite-btn active" onclick="event.stopPropagation(); toggleFavorite(${JSON.stringify(station).replace(/"/g, '&quot;')}); updateFavoritesUI();" title="Aus Favoriten entfernen">
                ⭐
            </button>
        </div>
    `).join('');
}

// Recent Searches Management
function loadRecentSearches() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.RECENT);
        recentSearches = stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading recent searches:', error);
        recentSearches = [];
    }
}

function saveRecentSearches() {
    try {
        localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(recentSearches));
    } catch (error) {
        console.error('Error saving recent searches:', error);
    }
}

function addRecentSearch(station) {
    // Remove if already exists
    recentSearches = recentSearches.filter(s => s.rbl !== station.rbl);
    
    // Add to beginning
    recentSearches.unshift({
        ...station,
        timestamp: Date.now()
    });
    
    // Keep only last 5
    recentSearches = recentSearches.slice(0, 5);
    
    saveRecentSearches();
    updateRecentSearchesUI();
}

function updateRecentSearchesUI() {
    const recentSearchesDiv = document.getElementById('recent-searches');
    const recentList = document.getElementById('recent-list');
    
    if (recentSearches.length === 0) {
        recentSearchesDiv.classList.add('hidden');
        return;
    }
    
    recentSearchesDiv.classList.remove('hidden');
    recentList.innerHTML = recentSearches.map(station => `
        <div class="recent-item-compact" onclick="switchToStationTab('${station.name.replace(/'/g, "\\'")}')">${station.name}</div>
    `).join('');
}

// Tab Navigation
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
            currentStation = null;
            const results = document.getElementById('results');
            if (results) results.innerHTML = '';

            if (tabName === 'map' && map) {
                setTimeout(() => map.invalidateSize(), 100);
            }
            
            previousTab = tabName;
        });
    });
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('🛑 Auto-refresh stopped');
    }
}

function startAutoRefresh(station) {
    stopAutoRefresh(); // Clear any existing interval
    currentStation = station;
    
    // Refresh every 10 seconds
    autoRefreshInterval = setInterval(() => {
        if (currentStation) {
            console.log('🔄 Auto-refreshing departures...');
            loadDepartures(currentStation, true); // true = silent refresh
        }
    }, 10000);
    
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

        const stations = await searchStations(query);
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

        const stations = await searchStations(query);
        if (stations.length > 0) {
            loadDepartures(stations[0]);
        }
    });
}

// Search Stations
function searchStations(query) {
    return getStations().filter(s => 
        s.name.toLowerCase().includes(query.toLowerCase())
    );
}

// Display Station Suggestions
function displaySuggestions(stations) {
    const suggestions = document.getElementById('suggestions');
    
    if (!stations || !Array.isArray(stations) || stations.length === 0) {
        suggestions.innerHTML = '<div class="empty-message">Keine Stationen gefunden</div>';
        return;
    }

    suggestions.innerHTML = stations.slice(0, 10).map(station => `
        <div class="suggestion-item">
            <div class="suggestion-info" onclick="loadDepartures(${JSON.stringify(station).replace(/"/g, '&quot;')})">
                <strong>${station.name}</strong>
                <small>${station.municipality || ''}</small>
            </div>
            <button class="favorite-btn ${isFavorite(station.rbl) ? 'active' : ''}" 
                    onclick="event.stopPropagation(); toggleFavorite(${JSON.stringify(station).replace(/"/g, '&quot;')}); const query = document.getElementById('station-input').value; if(query) displaySuggestions(searchStations(query));" 
                    title="${isFavorite(station.rbl) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}">
                ⭐
            </button>
        </div>
    `).join('');
}

// Load Departures - Mit CORS-Proxy
async function loadDepartures(station, isSilentRefresh = false) {
    if (!isSilentRefresh) {
        showLoading(true);
        updateLoadingStatus('Initialisiere...');
        stopAutoRefresh(); // Stop old refresh
        currentStation = station; // Update current station
    }
    
    // Ensure we have the latest station data with all RBLs
    // This fixes issues with old favorites/recent searches that don't have rbls array
    const fullStation = stations.find(s => s.rbl === station.rbl) || station;
    
    // Add to recent searches with full data (only on initial load)
    if (!isSilentRefresh) {
        addRecentSearch(fullStation);
    }
    
    try {
        // Use all RBLs for the station (fallback to single rbl for backwards compatibility)
        const rbls = fullStation.rbls || [fullStation.rbl];
        
        if (!isSilentRefresh) {
            console.log(`Loading departures for ${fullStation.name} from ${rbls.length} RBL(s): ${rbls.join(', ')}`);
            updateLoadingStatus(`Lade ${rbls.length} Haltestellen...`);
        }
        
        // Batch loading to avoid overwhelming the CORS proxy
        // Load RBLs in batches of 5 with delay between batches
        const BATCH_SIZE = 5;
        const BATCH_DELAY = 300; // ms between batches
        
        const allResults = [];
        const totalBatches = Math.ceil(Math.min(rbls.length, 15) / BATCH_SIZE);
        
        for (let i = 0; i < Math.min(rbls.length, 15); i += BATCH_SIZE) {
            const batch = rbls.slice(i, i + BATCH_SIZE);
            const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
            
            if (!isSilentRefresh) {
                console.log(`Loading batch ${currentBatch}: RBLs ${batch.join(', ')}`);
                updateLoadingStatus(`Batch ${currentBatch}/${totalBatches}: RBL ${batch.join(', ')}...`, currentBatch, totalBatches);
            }
            
            const batchPromises = batch.map(async (rbl) => {
                // Try current proxy, fallback to next on failure
                for (let proxyIdx = currentProxyIndex; proxyIdx < CORS_PROXIES.length; proxyIdx++) {
                    try {
                        const proxy = CORS_PROXIES[proxyIdx];
                        const apiUrl = `${API_BASE}/ogd_realtime/monitor?rbl=${rbl}`;
                        const url = proxy.url ? `${proxy.url}${encodeURIComponent(apiUrl)}` : apiUrl;
                        
                        const response = await fetch(url);
                        
                        if (!response.ok) {
                            if (proxyIdx === CORS_PROXIES.length - 1) {
                                console.warn(`RBL ${rbl} failed on all proxies`);
                                return null;
                            }
                            continue; // Try next proxy
                        }
                        
                        const contentType = response.headers.get('content-type');
                        if (!contentType || !contentType.includes('application/json')) {
                            if (proxyIdx === CORS_PROXIES.length - 1) {
                                console.warn(`RBL ${rbl}: Non-JSON on all proxies`);
                                return null;
                            }
                            continue;
                        }
                        
                        let data;
                        if (proxy.unwrap) {
                            const wrapper = await response.json();
                            if (!wrapper.contents) {
                                if (proxyIdx === CORS_PROXIES.length - 1) return null;
                                continue;
                            }
                            data = JSON.parse(wrapper.contents);
                        } else {
                            data = await response.json();
                        }
                        
                        // Success! Update global proxy if this is not the current one
                        if (proxyIdx !== currentProxyIndex) {
                            console.log(`Switched to proxy: ${proxy.name}`);
                            currentProxyIndex = proxyIdx;
                        }
                        
                        return data.data?.monitors || data.message?.value?.monitors || [];
                    } catch (error) {
                        if (proxyIdx === CORS_PROXIES.length - 1) {
                            console.warn(`RBL ${rbl} error on all proxies:`, error.message);
                            return null;
                        }
                        // Try next proxy
                    }
                }
                return null;
            });
            
            const batchResults = await Promise.all(batchPromises);
            allResults.push(...batchResults);
            
            // Update progress
            if (!isSilentRefresh) {
                const loadedCount = allResults.filter(r => r !== null).length;
                updateLoadingStatus(`${i + batch.length}/${Math.min(rbls.length, 15)} RBLs (${loadedCount} erfolgreich)`, i + batch.length, Math.min(rbls.length, 15));
            }
            
            // Delay between batches (except for last batch)
            if (i + BATCH_SIZE < Math.min(rbls.length, 15)) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
        }
        
        const results = allResults;
        
        if (!isSilentRefresh) {
            const successfulLoads = results.filter(r => r !== null && r.length > 0).length;
            updateLoadingStatus(`Verarbeite ${successfulLoads} Haltestellen...`);
        }
        
        // Merge all monitors from all RBLs
        const allMonitors = results
            .filter(r => r !== null)
            .flat();
        
        if (allMonitors.length > 0) {
            if (!isSilentRefresh) {
                updateLoadingStatus('Erstelle Ansicht...');
            }
            displayDepartures(fullStation, allMonitors);
            
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

// Display Departures
function displayDepartures(station, monitors) {
    const results = document.getElementById('results');
    
    if (!monitors || monitors.length === 0) {
        results.innerHTML = `
            <div class="empty-message">
                <h3>Keine Abfahrten gefunden</h3>
                <p>Für die Station "${station.name}" sind aktuell keine Abfahrten verfügbar.</p>
            </div>
        `;
        return;
    }

    // Collect all departures
    const allDepartures = monitors.flatMap((monitor, monitorIndex) => 
        monitor.lines?.flatMap(line => 
            line.departures?.departure?.map(dep => {
                // Try to get the most specific destination
                // API structure: dep.vehicle?.towards or line.towards
                const rawDestination = dep.vehicle?.towards || 
                                       dep.vehicle?.direction?.value || 
                                       dep.vehicle?.destination || 
                                       line.towards;
                
                // Normalize destination: trim whitespace and convert to uppercase for consistency
                const finalDestination = rawDestination?.trim().toUpperCase() || 'UNBEKANNT';
                
                return {
                    line: line.name,
                    towards: line.towards,
                    destination: finalDestination,
                    platform: line.platform,
                    rblSource: monitor.locationStop?.properties?.name || monitorIndex,
                    countdown: dep.departureTime?.countdown,
                    timeReal: dep.departureTime?.timeReal,
                    timePlanned: dep.departureTime?.timePlanned,
                    type: line.type,
                    lineType: determineLineType(line.name, line.type)
                };
            }) || []
        ) || []
    );
    
    // Remove duplicates: stricter matching
    const deduped = [];
    const seenKeys = new Set();
    
    // Sort: entries with timeReal first, then by countdown
    allDepartures.sort((a, b) => {
        if (a.timeReal && !b.timeReal) return -1;
        if (!a.timeReal && b.timeReal) return 1;
        return (a.countdown || 999) - (b.countdown || 999);
    });
    
    allDepartures.forEach(dep => {
        // Stricter deduplication: check timeReal OR timePlanned OR countdown
        const normalizedDest = dep.destination?.trim().toUpperCase() || 'UNBEKANNT';
        const timeSignature = dep.timeReal || dep.timePlanned || `countdown-${dep.countdown}`;
        const platformKey = dep.platform || 'no-platform';
        const key = `${dep.line}|${platformKey}|${normalizedDest}|${timeSignature}`;
        
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            deduped.push(dep);
        } else {
            console.log(`Removed duplicate: ${dep.line} → ${normalizedDest} @ ${dep.countdown}min`);
        }
    });

    // Multi-level grouping: Category (U-Bahn/Bus/Tram) → Line → Platform+Destination
    const grouped = {};
    deduped.forEach(dep => {
        const normalizedDest = dep.destination?.trim().toUpperCase() || 'UNBEKANNT';
        const platformKey = dep.platform || '';
        
        // Group key: line + platform + destination
        const key = `${dep.line}|${platformKey}|${normalizedDest}`;
        
        if (!grouped[key]) {
            grouped[key] = {
                line: dep.line,
                destination: normalizedDest,
                lineType: dep.lineType,
                platform: platformKey,
                category: getCategoryFromLineType(dep.lineType),
                departures: []
            };
        }
        grouped[key].departures.push(dep);
    });

    // Debug: Analyze grouping
    if (station.name.includes('Kagraner') && !window._u1Analysis) {
        const u1Groups = Object.values(grouped).filter(g => g.line === 'U1');
        console.log(`✅ U1 at ${station.name}: ${u1Groups.length} groups`);
        u1Groups.forEach(g => console.log(`  - ${g.line} → ${g.destination} (Steig ${g.platform}): ${g.departures.map(d => d.countdown).join(', ')} min`));
        window._u1Analysis = true;
    }
    
    const groupStats = Object.values(grouped).reduce((acc, g) => {
        acc[g.category] = (acc[g.category] || 0) + 1;
        return acc;
    }, {});
    console.log(`📊 Groups at ${station.name}:`, groupStats, `(Total: ${Object.values(grouped).length})`);

    // Sort departures within each group and take first 3
    Object.values(grouped).forEach(group => {
        group.departures.sort((a, b) => (a.countdown || 999) - (b.countdown || 999));
        group.departures = group.departures.slice(0, 3);
    });

    // Sort groups: 1) Category (U-Bahn > Bus > Tram > Other), 2) Line number, 3) First departure
    const categoryOrder = { 'ubahn': 0, 'bus': 1, 'tram': 2, 'other': 3 };
    const sortedGroups = Object.values(grouped).sort((a, b) => {
        // 1. Category
        const catDiff = (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
        if (catDiff !== 0) return catDiff;
        
        // 2. Line number (natural sort: U1 < U2 < U11)
        const aLineNum = parseInt(a.line.replace(/\D/g, '')) || 0;
        const bLineNum = parseInt(b.line.replace(/\D/g, '')) || 0;
        if (aLineNum !== bLineNum) return aLineNum - bLineNum;
        if (a.line !== b.line) return a.line.localeCompare(b.line);
        
        // 3. Platform
        if (a.platform !== b.platform) return (a.platform || '').localeCompare(b.platform || '');
        
        // 4. First departure
        const aFirst = a.departures[0]?.countdown || 999;
        const bFirst = b.departures[0]?.countdown || 999;
        return aFirst - bFirst;
    });

    results.innerHTML = `
        <div class="station-card">
            <div class="station-header">
                <div class="station-header-content">
                    <h3>${station.name}</h3>
                    <div class="station-info">
                        ${station.municipality || ''} 
                        <span class="auto-refresh-indicator" title="Automatische Aktualisierung alle 10 Sekunden">🔄 Live</span>
                    </div>
                </div>
                <button class="favorite-btn ${isFavorite(station.rbl) ? 'active' : ''}" 
                        onclick="toggleFavorite(${JSON.stringify(station).replace(/"/g, '&quot;')}); this.classList.toggle('active');" 
                        title="${isFavorite(station.rbl) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}">
                    ⭐
                </button>
            </div>
            <div class="departures-grouped">
                ${sortedGroups.length > 0 ? sortedGroups.map(group => `
                    <div class="line-group">
                        <div class="line-group-header">
                            <div class="line-badge ${getLineBadgeClass(group.line, group.lineType)}">
                                <span class="line-icon">${getLineIcon(group.lineType)}</span>
                                <span class="line-number">${group.line}</span>
                            </div>
                            <div class="line-group-info">
                                <div class="direction">${group.destination || 'Unbekannt'}</div>
                                ${group.platform ? `<div class="platform">Steig ${group.platform}</div>` : ''}
                            </div>
                        </div>
                        <div class="departure-times">
                            ${group.departures.map(dep => `
                                <div class="departure-time-item">
                                    <div class="countdown ${dep.timeReal ? 'realtime' : ''}">
                                        ${formatCountdown(dep.countdown)}
                                    </div>
                                    ${formatDepartureTimes(dep.timePlanned, dep.timeReal)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('') : '<div class="empty-message">Keine Abfahrten in den nächsten Minuten</div>'}
            </div>
        </div>
    `;
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

        await searchNearbyStations(lat, lon, radius);
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
                    await searchNearbyStations(lat, lon, radius);
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

// Search Nearby Stations
async function searchNearbyStations(lat, lon, radius) {
    showLoading(true);
    
    try {
        const nearbyStations = getStations().filter(station => {
            const distance = calculateDistance(lat, lon, station.lat, station.lon);
            return distance <= radius;
        }).sort((a, b) => {
            const distA = calculateDistance(lat, lon, a.lat, a.lon);
            const distB = calculateDistance(lat, lon, b.lat, b.lon);
            return distA - distB;
        });

        displayNearbyStations(nearbyStations, lat, lon);
    } catch (error) {
        showError('Fehler bei der Umkreissuche');
    } finally {
        showLoading(false);
    }
}

// Display Nearby Stations
function displayNearbyStations(stations, userLat, userLon) {
    const results = document.getElementById('results');
    
    if (stations.length === 0) {
        results.innerHTML = '<div class="empty-message"><h3>Keine Stationen gefunden</h3><p>Versuchen Sie einen größeren Radius</p></div>';
        return;
    }

    results.innerHTML = stations.slice(0, 10).map(station => {
        const distance = calculateDistance(userLat, userLon, station.lat, station.lon);
        return `
            <div class="station-card">
                <div class="station-header">
                    <div class="station-header-content">
                        <h3>${station.name}</h3>
                        <div class="station-info">
                            ${Math.round(distance)}m entfernt
                            ${station.municipality ? ` • ${station.municipality}` : ''}
                        </div>
                    </div>
                    <button class="favorite-btn ${isFavorite(station.rbl) ? 'active' : ''}" 
                            onclick="event.stopPropagation(); toggleFavorite(${JSON.stringify(station).replace(/"/g, '&quot;')}); this.classList.toggle('active');" 
                            title="${isFavorite(station.rbl) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}">
                        ⭐
                    </button>
                </div>
                <div class="departures" style="padding: 20px; text-align: center;">
                    <button onclick="loadDepartures(${JSON.stringify(station).replace(/"/g, '&quot;')})">
                        Abfahrtszeiten anzeigen
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Initialize Map
function initMap() {
    if (map) return;

    const vienna = [48.2082, 16.3738];
    
    map = L.map('map').setView(vienna, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Create marker cluster group
    const markers = L.markerClusterGroup({
        chunkedLoading: true,
        chunkInterval: 200,
        chunkDelay: 50,
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        removeOutsideVisibleBounds: true
    });

    const allStations = getStations();
    
    // Add markers to cluster group
    allStations.forEach(station => {
        const marker = L.marker([station.lat, station.lon])
            .bindPopup(`
                <div class="popup-station">
                    <strong>${station.name}</strong><br>
                    <small>${station.municipality || ''}</small><br>
                    <button class="popup-btn" onclick="loadDepartures(${JSON.stringify(station).replace(/"/g, '&quot;')})">
                        Abfahrten anzeigen
                    </button>
                </div>
            `);
        markers.addLayer(marker);
    });

    // Add cluster group to map
    map.addLayer(markers);

    map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        document.getElementById('lat-input').value = lat.toFixed(6);
        document.getElementById('lon-input').value = lng.toFixed(6);
        
        await searchNearbyStations(lat, lng, 500);
        
        document.querySelector('[data-tab="station"]').click();
    });
}

// Helper Functions
function determineLineType(lineName, apiType) {
    const name = String(lineName).toUpperCase();
    if (/^U[1-6]$/.test(name)) return 'ubahn';
    if (name.includes('D') || name.includes('O') || /^\d+$/.test(name)) return 'tram';
    if (name.includes('A') || name.includes('B') || name.includes('N')) return 'bus';
    
    const type = String(apiType).toLowerCase();
    if (type.includes('metro') || type === 'ptmetro') return 'ubahn';
    if (type.includes('tram') || type === 'pttramwayline') return 'tram';
    if (type.includes('bus') || type === 'ptbusline') return 'bus';
    return 'bus';
}

function getCategoryFromLineType(lineType) {
    if (lineType === 'ubahn') return 'ubahn';
    if (lineType === 'tram') return 'tram';
    if (lineType === 'bus') return 'bus';
    return 'other';
}

function getLineBadgeClass(lineName, lineType) {
    const base = lineType;
    if (lineType === 'ubahn') {
        const match = String(lineName).match(/U([1-6])/);
        if (match) return `${base} u${match[1]}`;
    }
    return base;
}

function getLineIcon(lineType) {
    switch(lineType) {
        case 'ubahn': return '🚇';
        case 'tram': return '🚊';
        case 'bus': return '🚌';
        default: return '🚌';
    }
}

function formatCountdown(minutes) {
    if (minutes === undefined || minutes === null) return '?';
    if (minutes === 0) return 'Jetzt';
    if (minutes === 1) return '1 Min';
    return `${minutes} Min`;
}

function formatDepartureTimes(planned, real) {
    if (!planned && !real) return '';
    
    const formatTime = (timestamp) => {
        if (!timestamp) return null;
        const date = new Date(timestamp);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };
    
    const plannedTime = formatTime(planned);
    const realTime = formatTime(real);
    
    if (!realTime || !planned || !real) {
        return plannedTime ? `
            <div class="time-info time-info-planned-only">
                <span class="time-planned-center">${plannedTime}</span>
                <div class="info-tooltip">
                    <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <span class="tooltip-text">Planzeit - Keine bestätigten Echtzeit-Daten verfügbar. Diese Zeit basiert auf dem Fahrplan und wurde nicht durch Live-Daten von der Wiener Linien API verifiziert.</span>
                </div>
            </div>
        ` : '';
    }
    
    const diff = Math.round((new Date(real) - new Date(planned)) / 60000);
    const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '±0';
    const diffClass = diff > 0 ? 'delayed' : diff < 0 ? 'early' : 'ontime';
    
    return `
        <div class="time-info">
            <span class="time-planned">Plan: ${plannedTime}</span>
            <span class="time-real">Ist: ${realTime}</span>
            <span class="time-diff ${diffClass}">${diffStr} Min</span>
        </div>
    `;
}

function getLineClass(lineType) {
    const line = String(lineType).toLowerCase();
    if (line.includes('u') || line === 'ptmetro') return 'u-bahn';
    if (line.includes('tram') || line === 'pttramwayline') return 'tram';
    if (line.includes('bus') || line === 'ptbusline') return 'bus';
    return '';
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    
    if (show) {
        loading.classList.remove('hidden');
        results.style.display = 'none';
        // Reset progress circle
        updateLoadingStatus('Initialisiere...', 0, 100);
    } else {
        loading.classList.add('hidden');
        results.style.display = 'block';
        // Clear status when hiding
        updateLoadingStatus('', 0, 100);
    }
}

function updateLoadingStatus(message, current = 0, total = 100) {
    const statusEl = document.getElementById('loading-status');
    const progressText = document.getElementById('progress-text');
    const progressRing = document.getElementById('progress-ring');
    const loadingMessage = document.getElementById('loading-message');
    
    if (statusEl) {
        statusEl.textContent = message;
        if (message) {
            statusEl.style.display = 'block';
        } else {
            statusEl.style.display = 'none';
        }
    }
    
    // Update circular progress
    if (progressText && progressRing) {
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        const circumference = 339.292; // 2 * PI * 54 (radius)
        const offset = circumference - (percentage / 100) * circumference;
        
        progressRing.style.strokeDashoffset = offset;
        progressText.textContent = `${percentage}%`;
    }
    
    // Update main loading message
    if (loadingMessage && total > 0 && current > 0) {
        loadingMessage.textContent = `RBL ${current} von ${total} wird geladen...`;
    }
}

function showError(message) {
    const results = document.getElementById('results');
    results.innerHTML = `
        <div class="error-message">
            <h3>⚠️ Fehler</h3>
            <p>${message}</p>
        </div>
    `;
}

// Get Stations
function getStations() {
    return stations;
}
