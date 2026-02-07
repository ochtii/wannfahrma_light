# JavaScript Module Struktur

Dieses Projekt verwendet ES6 Module für eine saubere, wartbare Code-Organisation.

## Module Übersicht

### Kernmodule

#### **app.js** (336 Zeilen) - Haupteinstiegspunkt
- Importiert und orchestriert alle anderen Module
- Initialisiert die Anwendung
- Event Handler und Tab-Navigation
- Exponiert `window.appHandlers` für HTML onclick Events

#### **config.js** (29 Zeilen) - Konfiguration
- API URLs und CORS Proxies
- LocalStorage Keys
- Auto-Refresh Intervall
- Batch Loading Konfiguration

#### **state.js** (71 Zeilen) - Zustandsverwaltung
- Zentraler Application State
- Getter/Setter für alle State-Variablen
- Stations, Favorites, Recent Searches
- View Mode, Current Station, Map

### Daten & API

#### **stations.js** (46 Zeilen) - Stationsdaten
- Laden der Stations-JSON
- Station Search
- Nearby Stations Suche

#### **api.js** (128 Zeilen) - API Integration
- Wiener Linien API Calls
- Multi-Proxy Strategie mit Fallback
- Batch Loading von RBLs
- Error Handling

### UI Module

#### **ui-rendering.js** (295 Zeilen) - UI Darstellung
- `displayDepartures()` - Hauptansicht der Abfahrten
- `displaySuggestions()` - Autocomplete Vorschläge
- `displayNearbyStations()` - Umkreissuche Ergebnisse
- `updateFavoritesUI()` - Favoriten-Liste
- `updateRecentSearchesUI()` - Letzte Suchen

#### **map.js** (51 Zeilen) - Kartenintegration
- Leaflet Map Initialisierung
- Marker Clustering
- Click Handler für Stationen

### Hilfsfunktionen

#### **formatters.js** (123 Zeilen) - Formatierung
- Zeit-Formatierung (`formatTime`, `formatCountdown`, `formatCompactTime`)
- Linien-Badge Klassen und Icons
- Linientyp-Bestimmung (U-Bahn, Bus, Straßenbahn)

#### **utils.js** (86 Zeilen) - Utilities
- Distanzberechnung (Haversine)
- Debounce-Funktion
- Loading States
- Error Anzeige

### Feature Module

#### **favorites.js** (47 Zeilen) - Favoritenverwaltung
- Favoriten laden/speichern
- Hinzufügen/Entfernen
- isFavorite Check

#### **recent-searches.js** (35 Zeilen) - Letzte Suchen
- Recent Searches laden/speichern
- Hinzufügen mit Zeitstempel
- Maximum 5 Einträge

## Modulgrößen

| Modul | Zeilen | Zweck |
|-------|--------|-------|
| app.js | 336 | Hauptlogik & Initialisierung |
| ui-rendering.js | 295 | UI Darstellung |
| api.js | 128 | API Calls |
| formatters.js | 123 | Formatierungsfunktionen |
| utils.js | 86 | Hilfsfunktionen |
| state.js | 71 | Zustandsverwaltung |
| map.js | 51 | Kartenintegration |
| favorites.js | 47 | Favoriten |
| stations.js | 46 | Stationsdaten |
| recent-searches.js | 35 | Letzte Suchen |
| config.js | 29 | Konfiguration |
| **Gesamt** | **1247** | (vorher: 1111 in script.js) |

## Abhängigkeitsgraph

```
app.js
├── config.js
├── state.js
├── stations.js
│   ├── state.js
│   └── utils.js
├── favorites.js
│   └── state.js
├── recent-searches.js
│   └── state.js
├── api.js
│   ├── config.js
│   ├── state.js
│   └── utils.js
├── ui-rendering.js
│   ├── state.js
│   ├── favorites.js
│   ├── formatters.js
│   └── utils.js
├── map.js
│   └── state.js
└── utils.js
```

## Window API

Für HTML onclick Events werden folgende Funktionen global exponiert:

```javascript
window.appHandlers = {
    loadDeparturesForStation(station)
    toggleViewMode()
    toggleExpandLine(groupId)
    switchToStationTab(stationName)
    searchNearby(lat, lon, radius)
    toggleFavoriteAndUpdate(station, btnElement)
    toggleFavoriteAndUpdateFavorites(station)
    toggleFavoriteAndRefreshSuggestions(station)
}

window.appState = {
    favorites    // Getter für aktuelle Favoriten
    recentSearches  // Getter für letzte Suchen
}
```

## Vorteile der Modularisierung

✅ **Wartbarkeit**: Kleine, fokussierte Module (<300 Zeilen)  
✅ **Wiederverwendbarkeit**: Klare Schnittstellen durch Exports  
✅ **Testbarkeit**: Module können einzeln getestet werden  
✅ **Lesbarkeit**: Logische Gruppierung nach Funktion  
✅ **Entwicklung**: Paralleles Arbeiten an verschiedenen Features möglich  
✅ **Debugging**: Fehler leichter zu lokalisieren  

## Migration von script.js

Die alte `script.js` (1111 Zeilen) wurde aufgeteilt in:
- ✅ 11 fokussierte Module
- ✅ Durchschnittlich 113 Zeilen pro Modul
- ✅ Klare Verantwortlichkeiten
- ✅ ES6 Import/Export Syntax
- ✅ Keine globalen Variablen (außer window.appHandlers)

## Verwendung

Die Module werden über `app.js` als Entry Point geladen:

```html
<script type="module" src="js/app.js"></script>
```

Alle anderen Module werden automatisch importiert.
