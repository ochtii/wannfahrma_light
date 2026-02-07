// Recent Searches Management
import { STORAGE_KEYS } from './config.js';
import { getRecentSearches, setRecentSearches } from './state.js';

export function loadRecentSearches() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.RECENT);
        const searches = stored ? JSON.parse(stored) : [];
        setRecentSearches(searches);
    } catch (error) {
        console.error('Error loading recent searches:', error);
        setRecentSearches([]);
    }
}

export function saveRecentSearches() {
    try {
        localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(getRecentSearches()));
    } catch (error) {
        console.error('Error saving recent searches:', error);
    }
}

export function addRecentSearch(station) {
    let searches = getRecentSearches();
    
    // Remove if already exists
    searches = searches.filter(s => s.rbl !== station.rbl);
    
    // Add to beginning
    searches.unshift({
        ...station,
        timestamp: Date.now()
    });
    
    // Keep only last 5
    searches = searches.slice(0, 5);
    
    setRecentSearches(searches);
    saveRecentSearches();
}
