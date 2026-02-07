// Time and Badge Formatting Functions

export function formatCountdown(minutes) {
    if (minutes === undefined || minutes === null) return '?';
    if (minutes === 0) return 'Jetzt';
    if (minutes === 1) return '1 Min';
    return `${minutes} Min`;
}

export function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatCompactTime(countdown, planned, real) {
    const countdownStr = formatCountdown(countdown);
    
    if (!planned && !real) return countdownStr;
    
    const plannedTime = formatTime(planned);
    const realTime = formatTime(real);
    
    // Nur Planzeit
    if (!realTime || !planned || !real) {
        return `${countdownStr} <span class="compact-time-detail">(${plannedTime})</span>`;
    }
    
    // Mit Echtzeit
    const diff = Math.round((new Date(real) - new Date(planned)) / 60000);
    const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '±0';
    const diffClass = diff > 0 ? 'delayed' : diff < 0 ? 'early' : 'ontime';
    
    return `${countdownStr} <span class="compact-time-detail">(${realTime} <span class="time-diff-inline ${diffClass}">${diffStr}</span>)</span>`;
}

export function formatDepartureTimes(planned, real) {
    if (!planned && !real) return '';
    
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

export function determineLineType(lineName, apiType) {
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

export function getCategoryFromLineType(lineType) {
    if (lineType === 'ubahn') return 'ubahn';
    if (lineType === 'tram') return 'tram';
    if (lineType === 'bus') return 'bus';
    return 'other';
}

export function getLineBadgeClass(lineName, lineType) {
    const base = lineType;
    if (lineType === 'ubahn') {
        const match = String(lineName).match(/U([1-6])/);
        if (match) return `${base} u${match[1]}`;
    }
    return base;
}

export function getLineIcon(lineType) {
    switch(lineType) {
        case 'ubahn': return '🚇';
        case 'tram': return '🚊';
        case 'bus': return '🚌';
        default: return '🚌';
    }
}

export function getLineClass(lineType) {
    const line = String(lineType).toLowerCase();
    if (line.includes('u') || line === 'ptmetro') return 'u-bahn';
    if (line.includes('tram') || line === 'pttramwayline') return 'tram';
    if (line.includes('bus') || line === 'ptbusline') return 'bus';
    return '';
}
