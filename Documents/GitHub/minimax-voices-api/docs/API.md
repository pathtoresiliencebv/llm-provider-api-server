# MiniMax Voices API - Documentation

## Overzicht

Productie-grade API voor AI content generation met ondersteuning voor:
- **TTS**: MiniMax Speech (2.8, 2.6, 02) + ElevenLabs via FAL
- **Music**: MiniMax Music (2.5, 02) + Sonauto/Grok via FAL
- **Image**: FLUX, GPT Image, Qwen, Imagen, Grok via FAL
- **Video**: Veo3, Kling 3.0, Sora 2, Hailuo 2.3 via FAL + MiniMax DIRECT

**Base URL:** `https://minimax-voices-api.vercel.app/` (Vercel) of `http://localhost:3001` (lokaal)

---

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check + metrics |
| `/api/models` | GET | Alle beschikbare modellen |
| `/api/voices` | GET | Stemmen: profiles, MiniMax, ElevenLabs |
| `/api/metrics` | GET | Usage metrics + kosten |
| `/api/logs` | GET | Recente request logs |
| `/api/tts` | POST | MiniMax TTS (Speech 2.8/2.6/02) |
| `/api/tts/elevenlabs` | POST | ElevenLabs TTS via FAL |
| `/api/music` | POST | AI Music (MiniMax/SONOauto) |
| `/api/music/royalty-free` | GET/POST | Royalty-free muziek |
| `/api/image` | POST | Image generation |
| `/api/video` | POST | Video generation |
| `/api/script` | POST | Script Engine (GPT) |
| `/api/scenes/enrich` | POST | Scene enrichment |

---

## `/api/models` - Beschikbare Modellen

Geeft alle beschikbare modellen terug met beschrijvingen en kosten.

### Request

```bash
GET /api/models
```

### Response

```json
{
  "tts": [
    { "id": "speech-2.8-hd", "name": "Speech 2.8 HD" },
    { "id": "speech-2.8-turbo", "name": "Speech 2.8 Turbo" },
    { "id": "speech-2.6-hd", "name": "Speech 2.6 HD" },
    { "id": "speech-2.6-turbo", "name": "Speech 2.6 Turbo" },
    { "id": "speech-02-hd", "name": "Speech 02 HD" },
    { "id": "speech-02-turbo", "name": "Speech 02 Turbo" }
  ],
  "voices": [
    { "id": "elevenlabs-v3", "provider": "fal", "name": "ElevenLabs V3" },
    { "id": "elevenlabs-multilingual-v2", "provider": "fal", "name": "Multilingual V2" },
    { "id": "elevenlabs-turbo-v2.5", "provider": "fal", "name": "Turbo V2.5" }
  ],
  "music": [
    { "id": "music-2.5", "provider": "minimax", "name": "Music 2.5" },
    { "id": "music-02", "provider": "minimax", "name": "Music 2.0" },
    { "id": "sonauto-v2", "provider": "fal", "name": "Sonauto V2" }
  ],
  "image": [
    { "id": "flux-pro", "provider": "fal", "name": "FLUX Pro" },
    { "id": "flux-dev", "provider": "fal", "name": "FLUX Dev" },
    { "id": "flux-realism", "provider": "fal", "name": "FLUX Realism" },
    { "id": "flux-schnell", "provider": "fal", "name": "FLUX Schnell" },
    { "id": "gpt-image-1", "provider": "fal", "name": "GPT Image 1" },
    { "id": "gpt-image-1.5", "provider": "fal", "name": "GPT Image 1.5" },
    { "id": "gpt-image-1-mini", "provider": "fal", "name": "GPT Image 1 Mini" },
    { "id": "qwen-image", "provider": "fal", "name": "Qwen Image" },
    { "id": "qwen-image-2512", "provider": "fal", "name": "Qwen Image 2512" },
    { "id": "imagen-4", "provider": "fal", "name": "Google Imagen 4" },
    { "id": "nano-banana-pro", "provider": "fal", "name": "Nano Banana Pro" },
    { "id": "grok-imagine-image", "provider": "fal", "name": "Grok Imagine Image" },
    { "id": "kling-image", "provider": "aiml", "name": "Kling Image" },
    { "id": "ideogram-v3", "provider": "aiml", "name": "Ideogram V3" }
  ],
  "video": [
    { "id": "veo3", "provider": "fal", "type": "t2v", "has_audio": true },
    { "id": "veo3-i2v", "provider": "fal", "type": "i2v", "has_audio": true },
    { "id": "veo3-fast", "provider": "fal", "type": "t2v", "has_audio": true },
    { "id": "veo3.1", "provider": "fal", "type": "t2v", "has_audio": true },
    { "id": "kling-3.0-pro-t2v", "provider": "fal", "type": "t2v", "has_audio": true },
    { "id": "kling-3.0-pro-i2v", "provider": "fal", "type": "i2v", "has_audio": true },
    { "id": "kling-3.0-standard-t2v", "provider": "fal", "type": "t2v", "has_audio": true },
    { "id": "kling-3.0-standard-i2v", "provider": "fal", "type": "i2v", "has_audio": true },
    { "id": "kling-o3-pro-i2v", "provider": "fal", "type": "i2v", "has_audio": true },
    { "id": "sora-2", "provider": "fal", "type": "t2v", "has_audio": true },
    { "id": "sora-2-i2v", "provider": "fal", "type": "i2v", "has_audio": true },
    { "id": "sora-2-pro", "provider": "fal", "type": "t2v", "has_audio": true },
    { "id": "sora-2-pro-i2v", "provider": "fal", "type": "i2v", "has_audio": true },
    { "id": "hailuo-2.3", "provider": "minimax", "type": "t2v", "has_audio": false },
    { "id": "hailuo-2.3-i2v", "provider": "minimax", "type": "i2v", "has_audio": false },
    { "id": "hailuo-2.3-fast", "provider": "minimax", "type": "i2v", "has_audio": false },
    { "id": "hailuo-02-pro-t2v", "provider": "fal", "type": "t2v", "has_audio": false },
    { "id": "hailuo-02-pro-i2v", "provider": "fal", "type": "i2v", "has_audio": false },
    { "id": "grok-imagine-video", "provider": "fal", "type": "t2v", "has_audio": true },
    { "id": "ltx-video", "provider": "fal", "type": "t2v", "has_audio": false }
  ],
  "defaults": {
    "tts": "speech-2.8-hd",
    "voice": "elevenlabs-v3",
    "music": "music-2.5",
    "image": "flux-pro",
    "video": "veo3"
  }
}
```

---

## `/api/tts` - Text-to-Speech (MiniMax)

Converteer tekst naar spraak met MiniMax Speech modellen.

### Beschikbare Modellen

| Model | Description | Kosten |
|-------|-------------|-------|
| `speech-2.8-hd` | HD - Hoogste kwaliteit | $0.08/1k chars |
| `speech-2.8-turbo` | Turbo - Sneller | $0.04/1k chars |
| `speech-2.6-hd` | HD - Prosody & cloning | $0.06/1k chars |
| `speech-2.6-turbo` | Turbo - 40 talen | $0.03/1k chars |
| `speech-02-hd` | HD - Stability | $0.05/1k chars |
| `speech-02-turbo` | Turbo - Multilingual | $0.025/1k chars |

### Request

```bash
POST /api/tts
Content-Type: application/json

{
  "text": "Hello world!",
  "voice": "radiant_girl",
  "model": "speech-2.8-hd",
  "speed": 1.0,
  "pitch": 0
}
```

### Response

```json
{
  "success": true,
  "model": "speech-2.8-hd",
  "voice": "English_radiant_girl",
  "audio_url": "https://...",
  "audio_format": "mp3",
  "audio_length": 2.5,
  "latencyMs": 3500
}
```

---

## `/api/tts/elevenlabs` - ElevenLabs TTS (via FAL)

ElevenLabs stemmen via FAL API.

### Beschikbare Modellen

| Model | Talen | Kosten |
|-------|-------|--------|
| `elevenlabs-v3` | 29+ | $0.10/1k chars |
| `elevenlabs-multilingual-v2` | 29 | $0.10/1k chars |
| `elevenlabs-turbo-v2.5` | 32 | $0.08/1k chars |

### Beschikbare Stemmen (V3)

Rachel, CJ, Sam, Bella, Antonio, Arabella, Will, Dora, Adam, Sophie, Josh, Emily, Callum, Serena

### Request

```bash
POST /api/tts/elevenlabs
Content-Type: application/json

{
  "text": "Hello world!",
  "model": "elevenlabs-v3",
  "voice_id": "rachel"
}
```

---

## `/api/music` - AI Music Generation

### Beschikbare Modellen

| Model | Provider | Kosten |
|-------|----------|--------|
| `music-2.5` | MiniMax DIRECT | $0.50/generatie |
| `music-02` | MiniMax DIRECT | $0.30/generatie |
| `sonauto-v2` | FAL | $0.15/generatie |

### Request

```bash
POST /api/music
Content-Type: application/json

{
  "lyrics": "[verse]\nWalking down the street\nFeeling so complete",
  "prompt": "Pop, upbeat, happy, 120 BPM",
  "model": "music-2.5"
}
```

### Response

```json
{
  "success": true,
  "model": "music-2.5",
  "audio_url": "https://...",
  "duration": 180,
  "latencyMs": 45000,
  "estimatedCost": 0.50
}
```

---

## `/api/image` - Image Generation

### Beschikbare Modellen

| Model | Provider | Description |
|-------|----------|-------------|
| `flux-pro` | FAL | FLUX Pro - Hoogste kwaliteit |
| `flux-realism` | FAL | FLUX Realism - Realistisch |
| `flux-dev` | FAL | FLUX Dev - Development |
| `flux-schnell` | FAL | FLUX Schnell - Snel |
| `gpt-image-1` | FAL/OpenAI | GPT Image 1 |
| `gpt-image-1.5` | FAL/OpenAI | GPT Image 1.5 |
| `gpt-image-1-mini` | FAL/OpenAI | GPT Image 1 Mini |
| `qwen-image` | FAL/Alibaba | Qwen Image |
| `qwen-image-2512` | FAL/Alibaba | Qwen Image 2512 |
| `imagen-4` | FAL/Google | Google Imagen 4 |
| `nano-banana-pro` | FAL/Google | Nano Banana Pro |
| `grok-imagine-image` | FAL/xAI | Grok Imagine |
| `kling-image` | AIML | Kling Image |
| `ideogram-v3` | AIML | Ideogram V3 |

### Request

```bash
POST /api/image
Content-Type: application/json

{
  "prompt": "A cinematic shot of a cyclist at sunrise",
  "model": "flux-pro",
  "aspect_ratio": "16:9"
}
```

---

## `/api/video` - Video Generation

### Beschikbare Modellen

| Model | Type | Provider | Audio | Kosten |
|-------|------|----------|-------|--------|
| **Veo 3 (Google)** ||||
| `veo3` | T2V/I2V | FAL | ✅ | $0.40/sec |
| `veo3-fast` | T2V | FAL | ✅ | $0.20/sec |
| `veo3.1` | T2V | FAL | ✅ | $0.35/sec |
| **Kling (Kuaishou)** ||||
| `kling-3.0-pro-t2v` | T2V | FAL | ✅ | $0.30/sec |
| `kling-3.0-pro-i2v` | I2V | FAL | ✅ | $0.30/sec |
| `kling-3.0-standard-t2v` | T2V | FAL | ✅ | $0.17/sec |
| `kling-o3-pro-i2v` | I2V | FAL | ✅ | $0.25/sec |
| **Sora 2 (OpenAI)** ||||
| `sora-2` | T2V/I2V | FAL | ✅ | $0.50/sec |
| `sora-2-pro` | T2V/I2V | FAL | ✅ | $0.80/sec |
| **Hailuo (MiniMax)** ||||
| `hailuo-2.3` | T2V | **MINIMAX** | ❌ | $0.25/sec |
| `hailuo-2.3-i2v` | I2V | **MINIMAX** | ❌ | $0.25/sec |
| `hailuo-2.3-fast` | I2V | **MINIMAX** | ❌ | $0.12/sec |
| `hailuo-02-pro-t2v` | T2V | FAL | ❌ | $0.28/sec |
| `hailuo-02-pro-i2v` | I2V | FAL | ❌ | $0.28/sec |
| **Grok (xAI)** ||||
| `grok-imagine-video` | T2V/I2V | FAL | ✅ | $0.15/sec |
| **Overige** ||||
| `ltx-video` | T2V/I2V | FAL | ❌ | $0.05/sec |

### Text-to-Video Request

```bash
POST /api/video
Content-Type: application/json

{
  "model": "veo3",
  "prompt": "A futuristic city at dusk, cinematic",
  "duration": 5,
  "aspect_ratio": "16:9"
}
```

### Image-to-Video Request

```json
{
  "model": "kling-3.0-pro-i2v",
  "prompt": "Subtle camera push-in",
  "image_url": "https://example.com/frame.png",
  "duration": 5,
  "aspect_ratio": "16:9"
}
```

### MiniMax Hailuo 2.3 Request (DIRECT)

```json
{
  "model": "hailuo-2.3",
  "prompt": "A dramatic sunset over mountains",
  "duration": 6,
  "resolution": "1080p"
}
```

### Response

```json
{
  "success": true,
  "provider": "fal",
  "model": "veo3",
  "video_url": "https://...",
  "duration": 5,
  "latencyMs": 120000
}
```

---

## `/api/voices` - Stemmen & Profielen

### Request

```bash
GET /api/voices                                    # Alle stemmen
GET /api/voices?type=profiles                     # Alleen profielen
GET /api/voices?type=elevenlabs                    # ElevenLabs
GET /api/voices?gender=male                        # Filter op gender
GET /api/voices?filter=podcast                      # Filter op use case
```

---

## `/api/music/royalty-free` - Royalty-Free Music

### GET

```bash
GET /api/music/royalty-free?query=lofi&providers=pixabay,jamendo&limit=5
```

### POST

```bash
POST /api/music/royalty-free
Content-Type: application/json

{
  "query": "lofi",
  "providers": ["pixabay", "jamendo"],
  "limit": 5
}
```

---

## Kosten Overzicht

### TTS (per 1000 karakters)

| Model | Kosten |
|-------|--------|
| speech-2.8-hd | $0.08 |
| speech-2.8-turbo | $0.04 |
| speech-2.6-hd | $0.06 |
| speech-2.6-turbo | $0.03 |
| speech-02-hd | $0.05 |
| speech-02-turbo | $0.025 |
| elevenlabs-v3 | $0.10 |

### Music (per generatie)

| Model | Kosten |
|-------|--------|
| music-2.5 | $0.50 |
| music-02 | $0.30 |
| sonauto-v2 | $0.15 |

### Video (per seconde)

| Model | Kosten |
|-------|--------|
| hailuo-2.3 | $0.25 |
| hailuo-2.3-fast | $0.12 |
| veo3 | $0.40 |
| veo3-fast | $0.20 |
| sora-2 | $0.50 |
| sora-2-pro | $0.80 |
| kling-3.0-pro | $0.30 |
| kling-3.0-standard | $0.17 |
| grok-imagine-video | $0.15 |
| ltx-video | $0.05 |

---

## Environment Variabeles

```env
# MiniMax API (REQUIRED)
MINIMAX_API_KEY=your_minimax_api_key

# FAL API (REQUIRED)
FAL_KEY=your_fal_api_key

# Optional: AIML for extra models
AIML_API_KEY=your_aiml_api_key

# Optional: ElevenLabs (via FAL)
ELEVENLABS_API_KEY=your_elevenlabs_key
```

---

## Support

- GitHub: https://github.com/pathtoresiliencebv/llm-provider-api-server
- API Base: `https://minimax-voices-api.vercel.app/`
