// Utility Functions

export function calculateDistance(lat1, lon1, lat2, lon2) {
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

export function debounce(func, wait) {
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

export function showLoading(show) {
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

export function updateLoadingStatus(message, current = 0, total = 100) {
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

export function showError(message) {
    const results = document.getElementById('results');
    results.innerHTML = `
        <div class="error-message">
            <h3>⚠️ Fehler</h3>
            <p>${message}</p>
        </div>
    `;
}
