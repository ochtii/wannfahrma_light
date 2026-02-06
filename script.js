// Wiener Linien API Configuration
// WICHTIG: Ersetzen Sie 'YOUR_API_KEY' mit Ihrem API-Schlüssel von https://www.wienerlinien.at/ogd_realtime
const API_KEY = 'YOUR_API_KEY';
const API_BASE = 'https://www.wienerlinien.at/ogd_realtime';

// State
let map = null;
let currentMarkers = [];
let allStations = [];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initStationSearch();
    initNearbySearch();
    initMap();
});

// Tab Navigation
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            // Update active states
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');

            // Initialize map when tab is opened
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

    // Load stations on input
    input.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            suggestions.innerHTML = '';
            return;
        }

        try {
            const stations = await searchStations(query);
            displaySuggestions(stations);
        } catch (error) {
            console.error('Fehler beim Laden der Stationen:', error);
        }
    }, 300));

    // Search on Enter
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    searchBtn.addEventListener('click', async () => {
        const query = input.value.trim();
        if (query.length < 2) return;

        try {
            const stations = await searchStations(query);
            if (stations.length > 0) {
                loadDepartures(stations[0]);
            }
        } catch (error) {
            showError('Fehler beim Laden der Abfahrten');
        }
    });
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

// Search Stations via API
async function searchStations(query) {
    const url = `${API_BASE}/monitor?activateTrafficInfo=stoerungkurz&sender=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.message && data.message.value && data.message.value.trafficInfos) {
            // Filter stations by query
            const stations = [];
            data.message.value.trafficInfos.forEach(info => {
                if (info.name && info.name.toLowerCase().includes(query.toLowerCase())) {
                    stations.push({
                        name: info.name,
                        diva: info.relatedLines?.[0]?.diva,
                        municipality: info.towards || ''
                    });
                }
            });
            return stations;
        }
        
        // Fallback: Use predefined stations
        return getHardcodedStations().filter(s => 
            s.name.toLowerCase().includes(query.toLowerCase())
        );
    } catch (error) {
        console.error('API Error:', error);
        // Fallback to hardcoded stations
        return getHardcodedStations().filter(s => 
            s.name.toLowerCase().includes(query.toLowerCase())
        );
    }
}

// Load Departures for a Station
async function loadDepartures(station) {
    showLoading(true);
    
    try {
        // Use RBL if available, otherwise try with station name
        let url = `${API_BASE}/monitor?sender=${API_KEY}`;
        
        if (station.rbl) {
            url += `&rbl=${station.rbl}`;
        } else if (station.diva) {
            url += `&diva=${station.diva}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.message && data.message.value && data.message.value.monitors) {
            displayDepartures(station, data.message.value.monitors);
        } else {
            showError('Keine Abfahrtsdaten verfügbar für ' + station.name);
        }
    } catch (error) {
        console.error('Error loading departures:', error);
        showError('Fehler beim Laden der Abfahrten. Bitte überprüfen Sie Ihren API-Schlüssel.');
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
                type: line.type
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
                        <div class="line-badge ${getLineClass(dep.type || dep.line)}">
                            ${dep.line}
                        </div>
                        <div class="departure-info">
                            <div class="direction">${dep.towards || 'Unbekannt'}</div>
                            ${dep.platform ? `<div class="platform">Steig ${dep.platform}</div>` : ''}
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
        const stations = getHardcodedStations().filter(station => {
            const distance = calculateDistance(lat, lon, station.lat, station.lon);
            return distance <= radius;
        }).sort((a, b) => {
            const distA = calculateDistance(lat, lon, a.lat, a.lon);
            const distB = calculateDistance(lat, lon, b.lat, b.lon);
            return distA - distB;
        });

        displayNearbyStations(stations, lat, lon);
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

    // Vienna center
    const vienna = [48.2082, 16.3738];
    
    map = L.map('map').setView(vienna, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add station markers
    const stations = getHardcodedStations();
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

    // Click on map to search nearby
    map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        document.getElementById('lat-input').value = lat.toFixed(6);
        document.getElementById('lon-input').value = lng.toFixed(6);
        
        await searchNearbyStations(lat, lng, 500);
        
        // Switch to results
        document.querySelector('[data-tab="station"]').click();
    });
}

// Helper Functions
function getLineClass(lineType) {
    const line = String(lineType).toLowerCase();
    if (line.includes('u') || line === 'ptmetro') return 'u-bahn';
    if (line.includes('tram') || line === 'pttramwayline') return 'tram';
    if (line.includes('bus') || line === 'ptbusline') return 'bus';
    return '';
}

function formatCountdown(minutes) {
    if (minutes === undefined || minutes === null) return '?';
    if (minutes === 0) return 'Jetzt';
    if (minutes === 1) return '1 Min';
    return `${minutes} Min`;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
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

// Hardcoded Stations (Fallback and for Map)
function getHardcodedStations() {
    return [
        { name: 'Stephansplatz', rbl: 4315, lat: 48.2085, lon: 16.3730, municipality: 'Wien 1' },
        { name: 'Karlsplatz', rbl: 4313, lat: 48.1985, lon: 16.3710, municipality: 'Wien 4' },
        { name: 'Westbahnhof', rbl: 4316, lat: 48.1970, lon: 16.3385, municipality: 'Wien 15' },
        { name: 'Praterstern', rbl: 4317, lat: 48.2185, lon: 16.3920, municipality: 'Wien 2' },
        { name: 'Schwedenplatz', rbl: 4306, lat: 48.2115, lon: 16.3785, municipality: 'Wien 1' },
        { name: 'Schottentor', rbl: 4318, lat: 48.2155, lon: 16.3610, municipality: 'Wien 1' },
        { name: 'Volkstheater', rbl: 4305, lat: 48.2055, lon: 16.3565, municipality: 'Wien 7' },
        { name: 'Landstraße', rbl: 4319, lat: 48.2000, lon: 16.3845, municipality: 'Wien 3' },
        { name: 'Hauptbahnhof', rbl: 4302, lat: 48.1850, lon: 16.3775, municipality: 'Wien 10' },
        { name: 'Meidling Hauptstraße', rbl: 4301, lat: 48.1785, lon: 16.3330, municipality: 'Wien 12' },
        { name: 'Längenfeldgasse', rbl: 4304, lat: 48.1865, lon: 16.3465, municipality: 'Wien 12' },
        { name: 'Kettenbrückengasse', rbl: 4308, lat: 48.1925, lon: 16.3585, municipality: 'Wien 5' },
        { name: 'Pilgramgasse', rbl: 4309, lat: 48.1925, lon: 16.3525, municipality: 'Wien 5' },
        { name: 'Museumsquartier', rbl: 4310, lat: 48.2035, lon: 16.3590, municipality: 'Wien 7' },
        { name: 'Herrengasse', rbl: 4311, lat: 48.2105, lon: 16.3655, municipality: 'Wien 1' },
        { name: 'Stubentor', rbl: 4312, lat: 48.2085, lon: 16.3795, municipality: 'Wien 1' },
        { name: 'Stadtpark', rbl: 4321, lat: 48.2050, lon: 16.3795, municipality: 'Wien 1' },
        { name: 'Rochusgasse', rbl: 4322, lat: 48.2020, lon: 16.3925, municipality: 'Wien 3' },
        { name: 'Kardinal-Nagl-Platz', rbl: 4323, lat: 48.2000, lon: 16.3985, municipality: 'Wien 3' },
        { name: 'Schlachthausgasse', rbl: 4324, lat: 48.1975, lon: 16.4030, municipality: 'Wien 3' }
    ];
}
