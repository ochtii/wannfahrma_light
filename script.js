// Wiener Linien API Configuration
const API_BASE = 'https://www.wienerlinien.at';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// State
let map = null;
let currentMarkers = [];
let stations = [];

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await loadStations();
    initTabs();
    initStationSearch();
    initNearbySearch();
    initMap();
    initThemeToggle();
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
                rbl: Math.floor(parseFloat(s.rbls[0])) // Convert "2093.0" to 2093
            }))
            .filter(s => !isNaN(s.rbl) && s.rbl > 0); // Remove invalid RBLs
        
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

// Tab Navigation
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');

            if (tabName === 'map' && map) {
                setTimeout(() => map.invalidateSize(), 100);
            }
        });
    });
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
async function searchStations(query) {
    return getStations().filter(s => 
        s.name.toLowerCase().includes(query.toLowerCase())
    );
}

// Display Station Suggestions
function displaySuggestions(stations) {
    const suggestions = document.getElementById('suggestions');
    
    if (stations.length === 0) {
        suggestions.innerHTML = '<div class="empty-message">Keine Stationen gefunden</div>';
        return;
    }

    suggestions.innerHTML = stations.slice(0, 10).map(station => `
        <div class="suggestion-item" onclick="loadDepartures(${JSON.stringify(station).replace(/"/g, '&quot;')})">
            <strong>${station.name}</strong>
            <small>${station.municipality || ''}</small>
        </div>
    `).join('');
}

// Load Departures - Mit CORS-Proxy
async function loadDepartures(station) {
    showLoading(true);
    
    try {
        const apiUrl = `${API_BASE}/ogd_realtime/monitor?rbl=${station.rbl}`;
        const url = `${CORS_PROXY}${encodeURIComponent(apiUrl)}`;
        
        console.log('Fetching:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 200));
            throw new Error('Proxy-Fehler: Keine JSON-Antwort erhalten');
        }
        
        const data = await response.json();
        
        if (data.data && data.data.monitors) {
            displayDepartures(station, data.data.monitors);
        } else if (data.message && data.message.value && data.message.value.monitors) {
            displayDepartures(station, data.message.value.monitors);
        } else {
            showError('Keine Abfahrtsdaten verfügbar');
        }
    } catch (error) {
        console.error('API Error:', error);
        showError(`Fehler beim Laden der Abfahrten: ${error.message}`);
    } finally {
        showLoading(false);
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

    const departuresList = monitors.flatMap(monitor => 
        monitor.lines?.flatMap(line => 
            line.departures?.departure?.map(dep => ({
                line: line.name,
                towards: line.towards,
                platform: line.platform,
                countdown: dep.departureTime?.countdown,
                timeReal: dep.departureTime?.timeReal,
                timePlanned: dep.departureTime?.timePlanned,
                type: line.type,
                lineType: determineLineType(line.name, line.type)
            })) || []
        ) || []
    ).sort((a, b) => (a.countdown || 999) - (b.countdown || 999));

    results.innerHTML = `
        <div class="station-card">
            <div class="station-header">
                <h3>${station.name}</h3>
                <div class="station-info">${station.municipality || ''}</div>
            </div>
            <div class="departures">
                ${departuresList.length > 0 ? departuresList.map(dep => `
                    <div class="departure-item">
                        <div class="line-badge ${getLineBadgeClass(dep.line, dep.lineType)}">
                            <span class="line-icon">${getLineIcon(dep.lineType)}</span>
                            <span class="line-number">${dep.line}</span>
                        </div>
                        <div class="departure-info">
                            <div class="direction">${dep.towards || 'Unbekannt'}</div>
                            ${dep.platform ? `<div class="platform">Steig ${dep.platform}</div>` : ''}
                            ${formatDepartureTimes(dep.timePlanned, dep.timeReal)}
                        </div>
                        <div class="countdown ${dep.timeReal ? 'realtime' : ''}">
                            ${formatCountdown(dep.countdown)}
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
                    <h3>${station.name}</h3>
                    <div class="station-info">
                        ${Math.round(distance)}m entfernt
                        ${station.municipality ? ` • ${station.municipality}` : ''}
                    </div>
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

    const allStations = getStations();
    stations.forEach(station => {
        const marker = L.marker([station.lat, station.lon])
            .bindPopup(`
                <div class="popup-station">${station.name}</div>
                <small>${station.municipality || ''}</small><br>
                <button class="popup-btn" onclick="loadDepartures(${JSON.stringify(station).replace(/"/g, '&quot;')})">
                    Abfahrten anzeigen
                </button>
            `)
            .addTo(map);
        currentMarkers.push(marker);
    });

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
        return plannedTime ? `<div class="time-info">Plan: ${plannedTime}</div>` : '';
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
    } else {
        loading.classList.add('hidden');
        results.style.display = 'block';
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
