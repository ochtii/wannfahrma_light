# 🚇 Wiener Linien Abfahrtsmonitor

Eine moderne Web-App zur Anzeige von Echtzeitinformationen für öffentliche Verkehrsmittel in Wien.

![Wiener Linien](https://img.shields.io/badge/Wiener%20Linien-API-E20613?style=flat-square)
![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-181717?style=flat-square&logo=github)

## ✨ Features

- 🔍 **Stationssuche** - Suchen Sie nach U-Bahn, Straßenbahn und Busstationen
- 📍 **Umkreissuche** - Finden Sie Stationen in Ihrer Nähe
- 🗺️ **Interaktive Karte** - Visualisierung aller Stationen auf einer Karte
- ⏱️ **Echtzeitdaten** - Aktuelle Abfahrtszeiten direkt von den Wiener Linien
- 🌙 **Dark Mode** - Dunkles Design standardmäßig aktiviert (umschaltbar)
- 📱 **Responsive Design** - Optimiert für Desktop, Tablet und Smartphone
- 🎨 **Modernes UI** - Klares, benutzerfreundliches Design

## 🚀 Live Demo

Die App ist live auf GitHub Pages verfügbar:
👉 [https://ochtii.github.io/wannfahrma_light/](https://ochtii.github.io/wannfahrma_light/)

## � API-Information

Die App nutzt die **öffentliche Wiener Linien OGD API**, die **keinen API-Schlüssel benötigt**. 

**⚠️ CORS-Einschränkungen:** Da die Wiener Linien API keine direkten Browser-Anfragen von externen Domains erlaubt (CORS-Policy), zeigt die App aktuell **Demo-Daten** an. Die Demo-Daten basieren auf typischen Linien und Abfahrtszeiten für die wichtigsten Wiener Stationen.

**Für echte Live-Daten gibt es folgende Optionen:**
- Besuchen Sie direkt [wienerlinien.at](https://www.wienerlinien.at)
- Hosten Sie einen eigenen CORS-Proxy
- Erstellen Sie ein Backend, das die API-Aufrufe durchführt

## 🛠️ Installation und Einrichtung

### Lokale Entwicklung

1. **Repository klonen:**
   ```bash
   git clone https://github.com/ochtii/wannfahrma_light.git
   cd wannfahrma_light
   ```

2. **App starten:**
   
   Öffnen Sie `index.html` in Ihrem Browser oder nutzen Sie einen lokalen Webserver:
   ```bash
   # Mit Python 3
   python -m http.server 8000
   
   # Mit Node.js (npx)
   npx serve
   
   # Mit VS Code Live Server Extension
   # Rechtsklick auf index.html → "Open with Live Server"
   ```

3. **Im Browser öffnen:**
   
   Navigieren Sie zu `http://localhost:8000` (oder dem entsprechenden Port)

### Deployment auf GitHub Pages

1. **Repository auf GitHub erstellen** und Code hochladen

2. **GitHub Pages aktivieren:**
   - Gehen Sie zu Repository Settings → Pages
   - Wählen Sie Branch: `main` und Folder: `/ (root)`
   - Klicken Sie auf "Save"

3. Nach wenigen Minuten ist Ihre App unter `https://[username].github.io/[repository-name]/` verfügbar

## 📖 Verwendung

### Stationssuche

1. Wählen Sie den Tab "Stationssuche"
2. Geben Sie einen Stationsnamen ein (z.B. "Stephansplatz", "Karlsplatz")
3. Wählen Sie eine Station aus den Vorschlägen
4. Sehen Sie die aktuellen Abfahrtszeiten in Echtzeit

### Umkreissuche

1. Wählen Sie den Tab "Umkreissuche"
2. Geben Sie Koordinaten ein oder klicken Sie auf "📍 Mein Standort"
3. Passen Sie den Suchradius an (100-2000 Meter)
4. Klicken Sie auf "Stationen suchen"
5. Wählen Sie eine Station aus den Ergebnissen

### Kartenansicht

1. Wählen Sie den Tab "Karte"
2. Erkunden Sie die Stationen auf der interaktiven Karte
3. Klicken Sie auf einen Marker für Stationsdetails
4. Klicken Sie auf einen Punkt auf der Karte, um nahegelegene Stationen zu finden

### Dark Mode

- Dark Mode ist standardmäßig aktiviert
- Klicken Sie auf das Theme-Symbol (☀️/🌙) oben rechts zum Umschalten
- Ihre Präferenz wird automatisch gespeichert

## 🔧 Technologien

- **HTML5** - Struktur und Semantik
- **CSS3** - Styling und Responsive Design
- **JavaScript (ES6+)** - Funktionalität und API-Integration
- **Leaflet.js** - Interaktive Kartendarstellung
- **Wiener Linien Echtzeitdaten API** - Verkehrsdaten

## 📱 Browser-Unterstützung

- ✅ Chrome/Edge (neueste Versionen)
- ✅ Firefox (neueste Versionen)
- ✅ Safari (neueste Versionen)
- ✅ Mobile Browser (iOS Safari, Chrome Mobile)

## 🎨 Screenshots & Design

- **Dark Mode:** Augenschonendes dunkles Design als Standard
- **Light Mode:** Heller Modus für Tageslicht verfügbar
- **Wiener Linien Farben:** Authentisches Corporate Design

## 🔐 Sicherheitshinweise

- Die öffentliche Wiener Linien API benötigt keine Authentifizierung
- Alle Daten sind frei zugänglich und Open Data

## 📚 API-Dokumentation

Die vollständige Dokumentation der Wiener Linien API finden Sie hier:
[Wiener Linien Echtzeitdaten Dokumentation (PDF)](https://www.wienerlinien.at/ogd_realtime/doku/ogd/wienerlinien-echtzeitdaten-dokumentation.pdf)

## 🤝 Beitragen

Beiträge sind willkommen! Bitte erstellen Sie ein Issue oder einen Pull Request.

## 📄 Lizenz

MIT License - Siehe [LICENSE](LICENSE) für Details

## 🙏 Danksagungen

- Daten bereitgestellt von [Wiener Linien](https://www.wienerlinien.at)
- Kartendaten von [OpenStreetMap](https://www.openstreetmap.org)
- Icons und Design inspiriert von Material Design

## 🐛 Bekannte Probleme

- Einige kleinere Stationen könnten nicht in den Fallback-Daten enthalten sein
- Echtzeitdaten können bei Störungen ungenau sein
- API-Rate-Limits können bei sehr häufigen Anfragen greifen

## 📞 Kontakt

Bei Fragen oder Problemen öffnen Sie bitte ein Issue auf GitHub.

---

Entwickelt mit ❤️ in Wien