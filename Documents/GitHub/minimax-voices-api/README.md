# MiniMax Audio API - Production Grade

Defensive, production-ready API voor MiniMax TTS en Music generation.

## 🚀 Quick Start

```bash
npm install
npm start
```

Server draait op `https://minimax-voices-api.vercel.app/` (Vercel) of `http://localhost:3001` (lokaal)

## 📖 Documentatie

- **[API Documentation](./docs/API.md)** - Complete API referentie
- **[MCP Server](./docs/MCP.md)** - AI integratie guide

## 📡 Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check + basis metrics |
| `/api/metrics` | GET | Gedetailleerde metrics + dagkosten |
| `/api/logs` | GET | Recente request logs |
| `/api/voices` | GET | Beschikbare stemmen |
| `/api/tts` | POST | Text-to-Speech (Speech 2.8) |
| `/api/music` | POST | Music Generation (Music 2.5) |

## 🎯 TTS Usage

```bash
curl -X POST http://localhost:3001/api/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world!",
    "voice": "radiant_girl",
    "model": "speech-2.8-hd"
  }'
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | string | required | Tekst om te spreken (max 10000 chars) |
| `voice` | string | radiant_girl | Stem ID |
| `model` | string | speech-2.8-hd | Model: speech-2.8-hd, speech-2.8-turbo, speech-2.6-hd, speech-2.6-turbo |
| `speed` | number | 1.0 | Snelheid (0.5-2.0) |
| `vol` | number | 1.0 | Volume (0.1-2.0) |
| `pitch` | number | 0 | Toonhoogte (-12 tot 12) |
| `language_boost` | string | auto | Taal: auto, English, Chinese, Dutch, etc. |
| `output_format` | string | url | Output: url (aanbevolen) of hex |

## 🎵 Music Usage

```bash
curl -X POST http://localhost:3001/api/music \
  -H "Content-Type: application/json" \
  -d '{
    "lyrics": "[verse]\nWalking down the street\nFeeling so complete",
    "prompt": "Pop, upbeat, happy"
  }'
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `lyrics` | string | required | Song lyrics (max 3500 chars) |
| `prompt` | string | "" | Music description (max 2000 chars) |
| `model` | string | music-2.5 | Model versie |
| `output_format` | string | url | Output: url of hex |

## 🛡️ Defensive Features

### 1. Caching (60-80% kostenbesparing)
- Hash-based cache: `SHA256(text + voice + model + params)`
- 24 uur cache duur
- Automatische cache hits

### 2. Rate Limiting
- **TTS**: 100 calls/minute per IP
- **Music**: 10 calls/minute per IP

### 3. Retry Logic
- 3 pogingen met exponential backoff
- 1s → 2s → 4s vertraging
- Volledige logging van elke poging

### 4. Logging
Elke request wordt gelogd met:
```json
{
  "type": "tts",
  "timestamp": "2026-02-22T05:16:42.042Z",
  "message": "Success",
  "model": "speech-2.8-hd",
  "voice": "English_radiant_girl",
  "textLength": 45,
  "latencyMs": 1823,
  "estimatedCost": 0.0036,
  "statusCode": 200,
  "cacheHit": false
}
```

### 5. Cost Estimation
- **speech-2.8-hd**: $0.08 per 1000 chars
- **speech-2.8-turbo**: $0.04 per 1000 chars
- **music-2.5**: $0.50 per generatie

## 📊 Metrics

```bash
# Dagelijkse kosten + metrics
curl http://localhost:3001/api/metrics
```

Response:
```json
{
  "totalRequests": 150,
  "totalErrors": 2,
  "tts": {
    "calls": 145,
    "errors": 2,
    "totalChars": 32500,
    "avgLatencyMs": 1850
  },
  "music": {
    "calls": 5,
    "errors": 0,
    "avgLatencyMs": 45000
  },
  "cache": {
    "hits": 89,
    "misses": 61
  },
  "dailyCosts": "$4.25"
}
```

## 💾 Beschikbare Stemmen

### English
- `radiant_girl` - Vrouwelijke, stralend
- `narrator` - Mannelijke verteller
- `magnetic_man` - Mannelijke, krachtig
- `compelling_lady` - Vrouwelijke, overtuigend
- `aussie_bloke` - Australische man
- `calm_woman` - Vrouwelijke, rustig
- `upbeat_woman` - Vrouwelijke, vrolijk
- `deep_voice_man` - Mannelijke, diepe stem

### Dutch
- `nl_kindhearted_girl` - Nederlands meisje
- `nl_bossy_leader` - Nederlands leider

### Chinese
- `zh_crisp_girl` - Chinese vrouw
- `zh_gentleman` - Chinese heer

## 🔧 Configuration

Maak `.env` bestand:

```env
MINIMAX_API_HOST=https://api.minimax.io
MINIMAX_API_KEY=jouw_api_key_hier
PORT=3001
```

## ⚠️ Kostencontrole

**BELANGRIJK**: 

1. **Monitor dagelijks** - Check `/api/metrics` dagelijks
2. **Cache inschakelen** - Bespaart 60-80%
3. **Rate limits** - Voorkomt ongelimiteerde kosten
4. **Logging** - Altijd weten wat er gebeurt

## 📝 Cache Locatie

Cached bestanden worden opgeslagen in:
```
./cache/
```

Elk bestand is een JSON met de API response.

## 🔄 Restart Server

```bash
# Find process
netstat -ano | findstr :3001

# Kill (vervang PID)
taskkill /PID [PID] /F

# Restart
npm start
```
