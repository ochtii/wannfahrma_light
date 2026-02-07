// UI Rendering Functions
import { getViewMode } from './state.js';
import { isFavorite } from './favorites.js';
import { 
    formatCountdown, 
    formatTime, 
    formatCompactTime,
    formatDepartureTimes,
    determineLineType,
    getCategoryFromLineType, 
    getLineBadgeClass, 
    getLineIcon 
} from './formatters.js';
import { calculateDistance } from './utils.js';

export function displayDepartures(station, monitors) {
    const results = document.getElementById('results');
    const viewMode = getViewMode();
    
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
                <div class="station-actions">
                    <button class="view-toggle-btn" onclick="window.appHandlers.toggleViewMode()" title="${viewMode === 'normal' ? 'Kompakte Ansicht' : 'Normale Ansicht'}">
                        ${viewMode === 'normal' ? '📋' : '📊'}
                    </button>
                    <button class="favorite-btn ${isFavorite(station.rbl) ? 'active' : ''}" 
                            onclick="window.appHandlers.toggleFavoriteAndUpdate(${JSON.stringify(station).replace(/"/g, '&quot;')}, this);" 
                            title="${isFavorite(station.rbl) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}">
                        ⭐
                    </button>
                </div>
            </div>
            <div class="departures-grouped ${viewMode === 'compact' ? 'compact-view' : ''}">
                ${sortedGroups.length > 0 ? (viewMode === 'compact' ? 
                    // Ultra-Compact View: Only show first departure with expand button
                    sortedGroups.map((group, groupIndex) => {
                        const groupId = `group-${groupIndex}`;
                        const firstDep = group.departures[0];
                        const hasMore = group.departures.length > 1;
                        
                        return `
                            <div class="departure-compact">
                                <div class="compact-line ${getLineBadgeClass(group.line, group.lineType)}">
                                    <span class="compact-icon">${getLineIcon(group.lineType)}</span>
                                    <span class="compact-number">${group.line}</span>
                                </div>
                                <div class="compact-destination">
                                    <div class="compact-dest-name">${group.destination}</div>
                                    ${group.platform ? `<div class="compact-platform">Stg. ${group.platform}</div>` : ''}
                                </div>
                                <div class="compact-time-full ${firstDep.timeReal ? 'realtime' : ''}">
                                    ${formatCompactTime(firstDep.countdown, firstDep.timePlanned, firstDep.timeReal)}
                                </div>
                                ${hasMore ? `
                                    <button class="expand-btn" data-group-id="${groupId}" onclick="window.appHandlers.toggleExpandLine('${groupId}')" title="Weitere Abfahrten anzeigen">+</button>
                                ` : '<div class="expand-btn-spacer"></div>'}
                            </div>
                            ${group.departures.slice(1).map(dep => `
                                <div class="departure-compact compact-extra hidden" data-group-id="${groupId}">
                                    <div class="compact-line-placeholder"></div>
                                    <div class="compact-destination-placeholder"></div>
                                    <div class="compact-time-full ${dep.timeReal ? 'realtime' : ''}">
                                        ${formatCompactTime(dep.countdown, dep.timePlanned, dep.timeReal)}
                                    </div>
                                    <div class="expand-btn-spacer"></div>
                                </div>
                            `).join('')}
                        `;
                    }).join('') :
                    // Normal View: Current grouped layout
                    sortedGroups.map(group => `
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
                    `).join('')) : '<div class="empty-message">Keine Abfahrten in den nächsten Minuten</div>'}
            </div>
        </div>
    `;
}

export function displaySuggestions(stations) {
    const suggestions = document.getElementById('suggestions');
    
    if (!stations || !Array.isArray(stations) || stations.length === 0) {
        suggestions.innerHTML = '<div class="empty-message">Keine Stationen gefunden</div>';
        return;
    }

    suggestions.innerHTML = stations.slice(0, 10).map(station => `
        <div class="suggestion-item">
            <div class="suggestion-info" onclick="window.appHandlers.loadDeparturesForStation(${JSON.stringify(station).replace(/"/g, '&quot;')})">
                <strong>${station.name}</strong>
                <small>${station.municipality || ''}</small>
            </div>
            <button class="favorite-btn ${isFavorite(station.rbl) ? 'active' : ''}" 
                    onclick="event.stopPropagation(); window.appHandlers.toggleFavoriteAndRefreshSuggestions(${JSON.stringify(station).replace(/"/g, '&quot;')});" 
                    title="${isFavorite(station.rbl) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}">
                ⭐
            </button>
        </div>
    `).join('');
}

export function displayNearbyStations(stations, userLat, userLon) {
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
                            onclick="event.stopPropagation(); window.appHandlers.toggleFavoriteAndUpdate(${JSON.stringify(station).replace(/"/g, '&quot;')}, this);" 
                            title="${isFavorite(station.rbl) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}">
                        ⭐
                    </button>
                </div>
                <div class="departures" style="padding: 20px; text-align: center;">
                    <button onclick="window.appHandlers.loadDeparturesForStation(${JSON.stringify(station).replace(/"/g, '&quot;')})">
                        Abfahrtszeiten anzeigen
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

export function updateFavoritesUI() {
    const favoritesList = document.getElementById('favorites-list');
    const favorites = window.appState?.favorites || [];
    
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
            <div class="favorite-info" onclick="window.appHandlers.loadDeparturesForStation(${JSON.stringify(station).replace(/"/g, '&quot;')})">
                <strong>${station.name}</strong>
                <small>${station.municipality || ''}</small>
            </div>
            <button class="favorite-btn active" onclick="event.stopPropagation(); window.appHandlers.toggleFavoriteAndUpdateFavorites(${JSON.stringify(station).replace(/"/g, '&quot;')});" title="Aus Favoriten entfernen">
                ⭐
            </button>
        </div>
    `).join('');
}

export function updateRecentSearchesUI() {
    const recentSearchesDiv = document.getElementById('recent-searches');
    const recentList = document.getElementById('recent-list');
    const recentSearches = window.appState?.recentSearches || [];
    
    if (recentSearches.length === 0) {
        recentSearchesDiv.classList.add('hidden');
        return;
    }
    
    recentSearchesDiv.classList.remove('hidden');
    recentList.innerHTML = recentSearches.map(station => `
        <div class="recent-item-compact" onclick="window.appHandlers.loadDeparturesForStation(${JSON.stringify(station).replace(/"/g, '&quot;')})">${station.name}</div>
    `).join('');
}
