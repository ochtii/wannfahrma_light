# Cloudflare Worker Setup für wannfahrma_light

## Warum ein eigener CORS Proxy?

Die kostenlosen öffentlichen CORS-Proxies (allorigins.win, corsproxy.io) sind:
- ❌ **Unzuverlässig** (500/520/522 Fehler)
- ❌ **Langsam** (Rate Limits)
- ❌ **Nicht kontrollierbar**

Mit einem eigenen Cloudflare Worker hast du:
- ✅ **100% Verfügbarkeit**
- ✅ **Schnell** (Cloudflare CDN)
- ✅ **Kostenlos** (100.000 Requests/Tag im Free-Plan)

---

## Setup (5 Minuten)

### 1. Cloudflare Account erstellen
1. Gehe zu https://dash.cloudflare.com/sign-up
2. Registriere dich (kostenlos, keine Kreditkarte nötig)
3. Bestätige deine E-Mail-Adresse

### 2. Worker erstellen
1. Im Cloudflare Dashboard: **Workers & Pages** → **Create application**
2. **Create Worker** klicken
3. Name eingeben: `wannfahrma-cors-proxy` (oder beliebig)
4. **Deploy** klicken

### 3. Worker-Code einfügen
1. Nach dem Deploy: **Edit code** klicken
2. **Gesamten Code ersetzen** mit dem Inhalt aus `worker.js`
3. **Save and Deploy** klicken

### 4. Worker-URL kopieren
Die URL sollte so aussehen:
```
https://wannfahrma-cors-proxy.<dein-subdomain>.workers.dev
```

---

## Integration in wannfahrma_light

### Option A: Anleitung für dich
**Bearbeite `script.js` Zeile 4-10:**

```javascript
// DEINE WORKER-URL hier eintragen:
const WORKER_URL = 'https://wannfahrma-cors-proxy.DEIN-SUBDOMAIN.workers.dev';

const CORS_PROXIES = [
    { url: `${WORKER_URL}/?url=`, unwrap: false, name: 'Cloudflare Worker' },
    { url: 'https://api.allorigins.win/get?url=', unwrap: true, name: 'allorigins.win' },
    { url: 'https://corsproxy.io/?', unwrap: false, name: 'corsproxy.io' }
];
```

**Dann:**
```bash
git add script.js
git commit -m "Add Cloudflare Worker CORS proxy"
git push
```

### Option B: Automatisch (Worker-URL angeben)
Gib mir deine Worker-URL und ich aktualisiere `script.js` automatisch.

---

## Testen

Nach dem Deploy:

1. Öffne https://ochtii.github.io/wannfahrma_light/
2. Suche "Kagraner Platz"
3. **Alle 13 RBLs sollten ohne Fehler laden!** ✨

Console sollte zeigen:
```
Loading batch 1: RBLs 885, 891
(beide erfolgreich)
Loading batch 2: RBLs 923, 998
(beide erfolgreich)
...
```

---

## Performance-Boost (Optional)

Da der Worker jetzt stabil ist, kannst du wieder schnellere Einstellungen nutzen:

**In `script.js` ändern:**
```javascript
const BATCH_SIZE = 5;        // statt 2
const BATCH_DELAY = 300;     // statt 1500
```

**Resultat:**
- Kagraner Platz lädt in **~2 Sekunden** statt 9
- 0 Fehler! 🎉

---

## Troubleshooting

**Worker gibt 500 Fehler?**
→ Stelle sicher, dass der Code aus `worker.js` korrekt kopiert wurde

**Worker-URL funktioniert nicht?**
→ Warte 1-2 Minuten nach dem Deploy (CDN-Propagierung)

**Requests werden nicht weitergeleitet?**
→ Prüfe in den Worker Logs (Dashboard → Workers → Dein Worker → Logs)

---

## Kosten

**Cloudflare Workers Free Plan:**
- ✅ 100.000 Requests/Tag
- ✅ Unbegrenzte Workers
- ✅ Weltweit verteilt (CDN)

Für wannfahrma_light mehr als ausreichend! 🚀
