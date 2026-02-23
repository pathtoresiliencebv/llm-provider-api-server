# MiniMax Voices API - Complete Integration Guide

## API Overview

**Base URL:** `https://minimax-voices-api.vercel.app`

This API provides unified access to:
- **TTS**: MiniMax Speech (2.8, 2.6, 02) + ElevenLabs via FAL
- **Music**: MiniMax Music (2.5, 02) + Sonauto via FAL
- **Image**: FLUX, GPT Image, Qwen, Imagen, Grok via FAL
- **Video**: Veo3, Kling 3.0, Sora 2, Hailuo 2.3 via FAL + MiniMax DIRECT
- **Script Generation**: GPT-powered video scripts with Visual DNA

---

## Endpoints

| Endpoint | Method | Description |
|---------|--------|-------------|
| `/health` | GET | Server health check |
| `/api/models` | GET | List all available models |
| `/api/voices` | GET | Voice profiles, MiniMax & ElevenLabs voices |
| `/api/tts` | POST | MiniMax Text-to-Speech |
| `/api/tts/elevenlabs` | POST | ElevenLabs TTS via FAL |
| `/api/music` | POST | AI Music Generation |
| `/api/music/royalty-free` | GET/POST | Royalty-free music |
| `/api/image` | POST | Image Generation |
| `/api/video` | POST | Video Generation |
| `/api/script` | POST | Script Generation with Visual DNA |
| `/api/scenes/enrich` | POST | Scene enrichment |
| `/api/metrics` | GET | Usage statistics and costs |
| `/api/logs` | GET | Recent request logs |

---

## POST /api/tts - MiniMax Text-to-Speech

### Request
```json
POST /api/tts
Content-Type: application/json

{
  "text": "Your text here",
  "voice": "podcast_male",
  "model": "speech-2.8-hd",
  "speed": 1.0,
  "pitch": 0
}
```

### Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | - | Text to speak (max 10000 chars) |
| `voice` | string | No | radiant_girl | Voice ID or profile |
| `model` | string | No | speech-2.8-hd | TTS model |
| `speed` | number | No | 1.0 | Speed (0.5-2.0) |
| `pitch` | number | No | 0 | Pitch in cents (-12 to +12) |

### Available TTS Models
| Model ID | Description | Cost per 1K chars |
|----------|-------------|-------------------|
| `speech-2.8-hd` | Latest HD - Best quality | $0.08 |
| `speech-2.8-turbo` | Latest Turbo - Faster | $0.04 |
| `speech-2.6-hd` | HD - Prosody & cloning | $0.06 |
| `speech-2.6-turbo` | Turbo - 40 languages | $0.03 |
| `speech-02-hd` | HD - Stability | $0.05 |
| `speech-02-turbo` | Turbo - Multilingual | $0.025 |

### Response
```json
{
  "success": true,
  "model": "speech-2.8-hd",
  "voice": "English_podcast_male",
  "audio_url": "https://...",
  "audio_format": "mp3",
  "audio_length": 5.2,
  "latencyMs": 3500
}
```

---

## POST /api/tts/elevenlabs - ElevenLabs TTS (via FAL)

### Request
```json
POST /api/tts/elevenlabs
Content-Type: application/json

{
  "text": "Hello world!",
  "model": "elevenlabs-v3",
  "voice_id": "rachel"
}
```

### Available ElevenLabs Models
| Model ID | Languages | Cost per 1K chars |
|----------|-----------|-------------------|
| `elevenlabs-v3` | 29+ | $0.10 |
| `elevenlabs-multilingual-v2` | 29 | $0.10 |
| `elevenlabs-turbo-v2.5` | 32 | $0.08 |

### Available Voices (V3)
Rachel, CJ, Sam, Bella, Antonio, Arabella, Will, Dora, Adam, Sophie, Josh, Emily, Callum, Serena

---

## POST /api/music - AI Music Generation

### Request
```json
POST /api/music
Content-Type: application/json

{
  "lyrics": "[verse]\nWalking down the street\nFeeling so complete",
  "prompt": "Pop, upbeat, happy, 120 BPM",
  "model": "music-2.5"
}
```

### Available Music Models
| Model ID | Provider | Cost |
|----------|----------|------|
| `music-2.5` | MiniMax DIRECT | $0.50/generation |
| `music-02` | MiniMax DIRECT | $0.30/generation |
| `sonauto-v2` | FAL | $0.15/generation |

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

## POST /api/image - Image Generation

### Request
```json
POST /api/image
Content-Type: application/json

{
  "prompt": "A cinematic shot of a cyclist at sunrise",
  "model": "flux-pro",
  "aspect_ratio": "16:9"
}
```

### Available Image Models
| Model ID | Provider | Description |
|----------|----------|-------------|
| `flux-pro` | FAL | FLUX Pro - Highest quality |
| `flux-dev` | FAL | FLUX Dev - Development |
| `flux-realism` | FAL | FLUX Realism - Realistic |
| `flux-schnell` | FAL | FLUX Schnell - Fast |
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

### Response
```json
{
  "success": true,
  "provider": "fal",
  "model": "flux-pro",
  "image_url": "https://...",
  "latencyMs": 15000
}
```

---

## POST /api/video - Video Generation

### Text-to-Video Request
```json
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
POST /api/video
Content-Type: application/json

{
  "model": "kling-3.0-pro-i2v",
  "prompt": "Subtle camera push-in",
  "image_url": "https://example.com/frame.png",
  "duration": 5,
  "aspect_ratio": "16:9"
}
```

### Available Video Models
| Model ID | Type | Provider | Audio | Cost/sec |
|----------|------|----------|-------|----------|
| **Veo 3 (Google)** ||||
| `veo3` | T2V/I2V | FAL | ✅ | $0.40 |
| `veo3-fast` | T2V | FAL | ✅ | $0.20 |
| `veo3.1` | T2V | FAL | ✅ | $0.35 |
| **Kling (Kuaishou)** ||||
| `kling-3.0-pro-t2v` | T2V | FAL | ✅ | $0.30 |
| `kling-3.0-pro-i2v` | I2V | FAL | ✅ | $0.30 |
| `kling-3.0-standard-t2v` | T2V | FAL | ✅ | $0.17 |
| `kling-o3-pro-i2v` | I2V | FAL | ✅ | $0.25 |
| **Sora 2 (OpenAI)** ||||
| `sora-2` | T2V/I2V | FAL | ✅ | $0.50 |
| `sora-2-pro` | T2V/I2V | FAL | ✅ | $0.80 |
| **Hailuo (MiniMax)** ||||
| `hailuo-2.3` | T2V | **MINIMAX** | ❌ | $0.25 |
| `hailuo-2.3-i2v` | I2V | **MINIMAX** | ❌ | $0.25 |
| `hailuo-2.3-fast` | I2V | **MINIMAX** | ❌ | $0.12 |
| `hailuo-02-pro-t2v` | T2V | FAL | ❌ | $0.28 |
| `hailuo-02-pro-i2v` | I2V | FAL | ❌ | $0.28 |
| **Grok (xAI)** ||||
| `grok-imagine-video` | T2V/I2V | FAL | ✅ | $0.15 |
| **Other** ||||
| `ltx-video` | T2V/I2V | FAL | ❌ | $0.05 |

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

## POST /api/script - Script Generation with Visual DNA

### Request
```json
POST /api/script
Content-Type: application/json

{
  "topic": "discipline",
  "duration": 60,
  "tone": "motivational",
  "audience": "entrepreneurs"
}
```

### Response
```json
{
  "success": true,
  "title": "The Power of Discipline",
  "global_visual_dna": {
    "style": "cinematic",
    "color_grade": "teal-orange",
    "lighting_style": "moody",
    "camera_language": "35mm cinematic lens",
    "render_rules": "film grain, shallow depth of field",
    "negative_rules": "no text, no watermark"
  },
  "scenes": [
    {
      "text": "Every morning, successful people make a choice.",
      "emotion": "inspiring",
      "music_hint": "epic orchestral",
      "direction": {
        "environment": "modern office at sunrise",
        "subject_action": "person looking out window",
        "shot_type": "medium"
      }
    }
  ],
  "estimated_duration_seconds": 60,
  "latencyMs": 2500
}
```

### Visual DNA Usage
Pass `global_visual_dna` and `scene_direction` to the image endpoint for consistent style across all images.

---

## Voice Profiles

### Male Voices
| Profile ID | Description | Best For |
|------------|-------------|----------|
| `narrator_calm` | Deep, measured storytelling | Documentary |
| `narrator_authoritative` | Confident, commanding | Training |
| `podcast_male` | Friendly, engaging | Podcast |
| `corporate_male` | Professional, trustworthy | Corporate |
| `energetic_male` | High energy, motivational | Promo |

### Female Voices
| Profile ID | Description | Best For |
|------------|-------------|----------|
| `narrator_female` | Warm, engaging | Documentary |
| `podcast_female` | Friendly, conversational | Podcast |
| `corporate_female` | Professional, trustworthy | Corporate |
| `energetic_female` | High energy, enthusiastic | Promo |
| `calm_female` | Gentle, peaceful | Meditation |

---

## Complete Workflow Example

### Full Video Production
```
User: "Create a 60 second video about discipline"
```

**Step 1: Generate script**
```json
POST /api/script
{ "topic": "discipline", "duration": 60, "tone": "motivational" }
```

**Step 2: Generate images (using Visual DNA)**
```json
POST /api/image
{
  "prompt": "modern office at sunrise",
  "model": "flux-pro",
  "global_visual_dna": { "style": "cinematic", "color_grade": "teal-orange" },
  "scene_direction": { "environment": "modern office", "shot_type": "medium" }
}
```

**Step 3: Generate TTS for each scene**
```json
POST /api/tts
{ "text": "[scene text]", "voice": "podcast_male" }
```

**Step 4: Generate background music**
```json
POST /api/music
{ "prompt": "motivational background", "model": "music-2.5" }
```

**Step 5: Generate video (optional)**
```json
POST /api/video
{ "model": "veo3", "prompt": "[video description]", "duration": 5 }
```

---

## Environment Variables

```env
# Required
MINIMAX_API_KEY=your_minimax_api_key
FAL_KEY=your_fal_api_key

# Optional
AIML_API_KEY=your_aiml_api_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

---

## Quick Reference

```
API Base: https://minimax-voices-api.vercel.app

Get models:    GET  /api/models
Get voices:    GET  /api/voices

TTS:           POST /api/tts { text, voice, model }
TTS (ElevenLabs): POST /api/tts/elevenlabs { text, model, voice_id }
Music:         POST /api/music { lyrics, prompt, model }
Image:         POST /api/image { prompt, model, aspect_ratio }
Video:         POST /api/video { model, prompt, duration }
Script:        POST /api/script { topic, duration, tone }
```
