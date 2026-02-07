// Favorites Management
import { STORAGE_KEYS } from './config.js';
import { getFavorites, setFavorites } from './state.js';

export function loadFavorites() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES);
        const favorites = stored ? JSON.parse(stored) : [];
        setFavorites(favorites);
    } catch (error) {
        console.error('Error loading favorites:', error);
        setFavorites([]);
    }
}

export function saveFavorites() {
    try {
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(getFavorites()));
    } catch (error) {
        console.error('Error saving favorites:', error);
    }
}

export function addFavorite(station) {
    if (!isFavorite(station.rbl)) {
        const favorites = getFavorites();
        favorites.push(station);
        setFavorites(favorites);
        saveFavorites();
    }
}

export function removeFavorite(rbl) {
    const favorites = getFavorites().filter(f => f.rbl !== rbl);
    setFavorites(favorites);
    saveFavorites();
}

export function isFavorite(rbl) {
    return getFavorites().some(f => f.rbl === rbl);
}

export function toggleFavorite(station) {
    if (isFavorite(station.rbl)) {
        removeFavorite(station.rbl);
    } else {
        addFavorite(station);
    }
}
