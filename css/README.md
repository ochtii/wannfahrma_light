# CSS-Struktur

Die CSS-Dateien wurden in 8 modulare Dateien aufgeteilt für bessere Wartbarkeit und Übersicht.

## 📁 Datei-Übersicht

### 1. **base.css** (~65 Zeilen)
- CSS-Variablen (`:root`)
- Dark Mode Variablen
- Element-Resets (`*`, `body`)
- Container & grundlegende Styles
- Utility-Klassen (`.hidden`)

### 2. **layout.css** (~110 Zeilen)
- Header & h1
- Theme Toggle Button
- Search Container
- Footer & Legal Links
- Grundlegendes Seitenlayout

### 3. **navigation.css** (~110 Zeilen)
- Tabs (`.tab-btn`, `.tab-content`)
- Button-Styles
- Favorite Button
- View Toggle Button
- Location Button

### 4. **search.css** (~220 Zeilen)
- Search Box & Input
- Suggestions (Autocomplete)
- Recent Searches (kompakt & normal)
- Favorites Container
- Nearby Controls & Input Groups

### 5. **departures.css** (~300 Zeilen)
- Results Container
- Station Cards & Header
- **Compact View** (Grid-Layout)
- **Normal View** (Line Groups)
- Departure Times
- Auto-Refresh Indicator
- Station Actions

### 6. **badges.css** (~175 Zeilen)
- Line Badges (U-Bahn, Bus, Tram)
- **U-Bahn Linienfarben** (U1-U6)
- Compact Line Badges
- Time Info & Status
- Time Diff Colors (delayed, early, ontime)

### 7. **components.css** (~255 Zeilen)
- Map & Leaflet Styles
- Marker Cluster
- Loading Spinner & Progress Circle
- Info Tooltips (SVG mit CSS-Tooltip)
- Error & Empty Messages

### 8. **responsive.css** (~195 Zeilen)
- Mobile (≤768px)
- Small Mobile (≤480px)
- Tablet (769px-1024px)
- Large Screens (≥1400px)
- Alle Media Queries

---

## 📊 Statistik

| Datei | Zeilen | Zweck |
|-------|--------|-------|
| base.css | 65 | Variablen & Grundlagen |
| layout.css | 110 | Seitenlayout |
| navigation.css | 110 | Navigation & Buttons |
| search.css | 220 | Suche & Favoriten |
| departures.css | 300 | Abfahrten (Haupt-Feature) |
| badges.css | 175 | Linien-Badges & Farben |
| components.css | 255 | Karte, Loading, Tooltips |
| responsive.css | 195 | Media Queries |
| **GESAMT** | **~1430** | **8 Module** |

*Vorher: 1 Datei mit 1215 Zeilen*

---

## 🎯 Vorteile der Modularisierung

✅ **Übersichtlichkeit** - Jede Datei hat eine klare Verantwortlichkeit  
✅ **Wartbarkeit** - Änderungen sind schnell zu finden  
✅ **Performance** - Browser kann Dateien parallel laden  
✅ **Separation of Concerns** - Logische Trennung  
✅ **Skalierbarkeit** - Neue Features in eigene Module  
✅ **Lesbarkeit** - Keine 1000+ Zeilen Files mehr  

---

## 🔧 Einbindung in HTML

```html
<!-- CSS Modules -->
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/navigation.css">
<link rel="stylesheet" href="css/search.css">
<link rel="stylesheet" href="css/departures.css">
<link rel="stylesheet" href="css/badges.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/responsive.css">
```

**Wichtig:** Reihenfolge beachten! `base.css` muss zuerst geladen werden, `responsive.css` zuletzt.

---

## 📝 Konventionen

- **BEM-ähnlich** - Klare Klassennamen (`.station-header`, `.compact-line`)
- **CSS-Variablen** - Farben & Größen in `base.css`
- **Dark Mode** - Alle Farben via CSS-Variablen
- **Kommentare** - Jeder Abschnitt ist kommentiert
- **Mobile First** - Basis-Styles + Media Queries in `responsive.css`

---

Erstellt: Februar 2026
