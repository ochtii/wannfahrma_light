// Station Data Loading and Search
import { getStations, setStations } from './state.js';
import { calculateDistance } from './utils.js';

export async function loadStations() {
    try {
        const response = await fetch('data/stations_full.json');
        if (!response.ok) throw new Error('Failed to load stations');
        const data = await response.json();
        
        // Transform data structure: longitude->lon, latitude->lat, rbls[0]->rbl
        const stations = data.stations
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
        
        setStations(stations);
        console.log(`Loaded ${stations.length} stations from ${data.stations.length} total`);
    } catch (error) {
        console.error('Error loading stations:', error);
        setStations([]);
    }
}

export function searchStations(query) {
    return getStations().filter(s => 
        s.name.toLowerCase().includes(query.toLowerCase())
    );
}

export function searchNearbyStations(lat, lon, radius) {
    return getStations().filter(station => {
        const distance = calculateDistance(lat, lon, station.lat, station.lon);
        return distance <= radius;
    }).sort((a, b) => {
        const distA = calculateDistance(lat, lon, a.lat, a.lon);
        const distB = calculateDistance(lat, lon, b.lat, b.lon);
        return distA - distB;
    });
}
