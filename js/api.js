// API Calls to Wiener Linien
import { API_BASE, CORS_PROXIES, BATCH_CONFIG } from './config.js';
import { getCurrentProxyIndex, setCurrentProxyIndex, getStations } from './state.js';
import { updateLoadingStatus } from './utils.js';

export async function loadDeparturesFromAPI(station, isSilentRefresh = false) {
    // Ensure we have the latest station data with all RBLs
    const fullStation = getStations().find(s => s.rbl === station.rbl) || station;
    
    // Use all RBLs for the station (fallback to single rbl for backwards compatibility)
    const rbls = fullStation.rbls || [fullStation.rbl];
    
    if (!isSilentRefresh) {
        console.log(`Loading departures for ${fullStation.name} from ${rbls.length} RBL(s): ${rbls.join(', ')}`);
        updateLoadingStatus(`Lade ${rbls.length} Haltestellen...`);
    }
    
    // Batch loading to avoid overwhelming the CORS proxy
    const allResults = [];
    const totalBatches = Math.ceil(Math.min(rbls.length, BATCH_CONFIG.MAX_RBLS) / BATCH_CONFIG.SIZE);
    
    for (let i = 0; i < Math.min(rbls.length, BATCH_CONFIG.MAX_RBLS); i += BATCH_CONFIG.SIZE) {
        const batch = rbls.slice(i, i + BATCH_CONFIG.SIZE);
        const currentBatch = Math.floor(i / BATCH_CONFIG.SIZE) + 1;
        
        if (!isSilentRefresh) {
            console.log(`Loading batch ${currentBatch}: RBLs ${batch.join(', ')}`);
            updateLoadingStatus(`Batch ${currentBatch}/${totalBatches}: RBL ${batch.join(', ')}...`, currentBatch, totalBatches);
        }
        
        const batchPromises = batch.map(async (rbl) => {
            // Try current proxy, fallback to next on failure
            for (let proxyIdx = getCurrentProxyIndex(); proxyIdx < CORS_PROXIES.length; proxyIdx++) {
                try {
                    const proxy = CORS_PROXIES[proxyIdx];
                    const apiUrl = `${API_BASE}/ogd_realtime/monitor?rbl=${rbl}`;
                    const url = proxy.url ? `${proxy.url}${encodeURIComponent(apiUrl)}` : apiUrl;
                    
                    const response = await fetch(url);
                    
                    if (!response.ok) {
                        if (proxyIdx === CORS_PROXIES.length - 1) {
                            console.warn(`RBL ${rbl} failed on all proxies`);
                            return null;
                        }
                        continue; // Try next proxy
                    }
                    
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        if (proxyIdx === CORS_PROXIES.length - 1) {
                            console.warn(`RBL ${rbl}: Non-JSON on all proxies`);
                            return null;
                        }
                        continue;
                    }
                    
                    let data;
                    if (proxy.unwrap) {
                        const wrapper = await response.json();
                        if (!wrapper.contents) {
                            if (proxyIdx === CORS_PROXIES.length - 1) return null;
                            continue;
                        }
                        data = JSON.parse(wrapper.contents);
                    } else {
                        data = await response.json();
                    }
                    
                    // Success! Update global proxy if this is not the current one
                    if (proxyIdx !== getCurrentProxyIndex()) {
                        console.log(`Switched to proxy: ${proxy.name}`);
                        setCurrentProxyIndex(proxyIdx);
                    }
                    
                    return data.data?.monitors || data.message?.value?.monitors || [];
                } catch (error) {
                    if (proxyIdx === CORS_PROXIES.length - 1) {
                        console.warn(`RBL ${rbl} error on all proxies:`, error.message);
                        return null;
                    }
                    // Try next proxy
                }
            }
            return null;
        });
        
        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults);
        
        // Update progress
        if (!isSilentRefresh) {
            const loadedCount = allResults.filter(r => r !== null).length;
            updateLoadingStatus(`${i + batch.length}/${Math.min(rbls.length, BATCH_CONFIG.MAX_RBLS)} RBLs (${loadedCount} erfolgreich)`, i + batch.length, Math.min(rbls.length, BATCH_CONFIG.MAX_RBLS));
        }
        
        // Delay between batches (except for last batch)
        if (i + BATCH_CONFIG.SIZE < Math.min(rbls.length, BATCH_CONFIG.MAX_RBLS)) {
            await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.DELAY));
        }
    }
    
    if (!isSilentRefresh) {
        const successfulLoads = allResults.filter(r => r !== null && r.length > 0).length;
        updateLoadingStatus(`Verarbeite ${successfulLoads} Haltestellen...`);
    }
    
    // Merge all monitors from all RBLs
    const allMonitors = allResults
        .filter(r => r !== null)
        .flat();
    
    return { station: fullStation, monitors: allMonitors };
}
