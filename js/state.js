// Application State
export const state = {
    map: null,
    currentMarkers: [],
    stations: [],
    favorites: [],
    recentSearches: [],
    autoRefreshInterval: null,
    currentStation: null,
    viewMode: 'normal', // 'normal' or 'compact'
    currentProxyIndex: 0
};

// State getters
export function getStations() {
    return state.stations;
}

export function setStations(stations) {
    state.stations = stations;
}

export function getCurrentStation() {
    return state.currentStation;
}

export function setCurrentStation(station) {
    state.currentStation = station;
}

export function getViewMode() {
    return state.viewMode;
}

export function setViewMode(mode) {
    state.viewMode = mode;
}

export function getFavorites() {
    return state.favorites;
}

export function setFavorites(favorites) {
    state.favorites = favorites;
}

export function getRecentSearches() {
    return state.recentSearches;
}

export function setRecentSearches(searches) {
    state.recentSearches = searches;
}

export function getAutoRefreshInterval() {
    return state.autoRefreshInterval;
}

export function setAutoRefreshInterval(interval) {
    state.autoRefreshInterval = interval;
}

export function getCurrentProxyIndex() {
    return state.currentProxyIndex;
}

export function setCurrentProxyIndex(index) {
    state.currentProxyIndex = index;
}

export function getMap() {
    return state.map;
}

export function setMap(map) {
    state.map = map;
}
