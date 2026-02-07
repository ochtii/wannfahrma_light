// Map Initialization and Handling
import { getStations, setMap, getMap } from './state.js';

export function initMap() {
    if (getMap()) return;

    const vienna = [48.2082, 16.3738];
    
    const map = L.map('map').setView(vienna, 13);
    setMap(map);
    
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
                    <button class="popup-btn" onclick="window.appHandlers.loadDeparturesForStation(${JSON.stringify(station).replace(/"/g, '&quot;')})">
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
        
        await window.appHandlers.searchNearby(lat, lng, 500);
        
        document.querySelector('[data-tab="station"]').click();
    });
}
