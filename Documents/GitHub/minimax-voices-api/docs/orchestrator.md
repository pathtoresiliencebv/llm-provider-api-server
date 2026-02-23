# Orchestrator Integration Guide

This document explains how the orchestrator should interact with the MiniMax Voices API server.

---

## Overview

The orchestrator manages the complete video production workflow. This API provides all the AI generation capabilities needed:
- Text-to-Speech (TTS)
- Music Generation
- Image Generation
- Video Generation
- Script Generation

---

## Base Configuration

```javascript
const API_BASE = "https://minimax-voices-api.vercel.app";
// Or for local development:
// const API_BASE = "http://localhost:3001";
```

---

## API Response Format

All endpoints return responses in this format:

```javascript
{
  success: boolean,
  // For TTS/Music:
  audio_url?: string,
  audio_format?: string,
  audio_length?: number,
  
  // For Images:
  image_url?: string,
  
  // For Video:
  video_url?: string,
  duration?: number,
  
  // For Scripts:
  title?: string,
  global_visual_dna?: object,
  scenes?: array,
  
  // Common:
  model: string,
  latencyMs: number,
  estimatedCost: number,
  timestamp: string
}
```

### Error Response
```javascript
{
  error: string,
  details?: string,
  // For rate limits:
  remaining?: number,
  retryAttempts?: number
}
```

---

## Complete Workflow

### Step 1: Get Available Models (Optional)
```javascript
const response = await fetch(`${API_BASE}/api/models`);
const { tts, music, image, video, defaults } = await response.json();
```

### Step 2: Generate Script
```javascript
const scriptResponse = await fetch(`${API_BASE}/api/script`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    topic: "discipline",
    duration: 60,
    tone: "motivational",
    audience: "entrepreneurs"
  })
});

const script = await scriptResponse.json();
// Returns: { title, global_visual_dna, scenes: [{ text, emotion, direction, music_hint }] }
```

### Step 3: Generate Images
For each scene, generate an image using Visual DNA:
```javascript
for (const scene of script.scenes) {
  const imageResponse = await fetch(`${API_BASE}/api/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: scene.direction.environment,
      model: "flux-pro",  // or "gpt-image-1.5", "qwen-image", etc.
      aspect_ratio: "16:9",
      global_visual_dna: script.global_visual_dna,
      scene_direction: scene.direction
    })
  });
  
  const image = await imageResponse.json();
  // image.image_url contains the generated image
}
```

### Step 4: Generate TTS
For each scene, generate speech:
```javascript
for (const scene of script.scenes) {
  const ttsResponse = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: scene.text,
      voice: "podcast_male",  // or use voice profiles
      model: "speech-2.8-hd",
      speed: 1.0,
      pitch: 0
    })
  });
  
  const audio = await ttsResponse.json();
  // audio.audio_url contains the generated speech
}
```

### Step 5: Generate Background Music
```javascript
const musicResponse = await fetch(`${API_BASE}/api/music`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "motivational background music",
    lyrics: "",  // Optional: add custom lyrics
    model: "music-2.5"  // or "music-02", "sonauto-v2"
  })
});

const music = await musicResponse.json();
// music.audio_url contains the generated music
```

### Step 6: Generate Video (Optional)
Instead of using static images, you can generate video:
```javascript
const videoResponse = await fetch(`${API_BASE}/api/video`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "veo3",  // or "kling-3.0-pro-t2v", "sora-2", "hailuo-2.3"
    prompt: "A person walking in a modern office at sunrise",
    duration: 5,
    aspect_ratio: "16:9"
  })
});

const video = await videoResponse.json();
// video.video_url contains the generated video
```

---

## Model Selection Guide

### TTS Models
| Use Case | Recommended Model |
|----------|-------------------|
| Highest quality | `speech-2.8-hd` |
| Fast/general | `speech-2.8-turbo` |
| Voice cloning | `speech-2.6-hd` |
| Multilingual | `speech-2.6-turbo` |

### Music Models
| Use Case | Recommended Model |
|----------|-------------------|
| Best quality | `music-2.5` ($0.50) |
| Budget | `music-02` ($0.30) |
| Fast generation | `sonauto-v2` ($0.15) |

### Image Models
| Use Case | Recommended Model |
|----------|-------------------|
| Photorealistic | `flux-pro` |
| Realistic | `flux-realism` |
| Fast | `flux-schnell` |
| Text rendering | `qwen-image` |
| General purpose | `gpt-image-1.5` |

### Video Models
| Use Case | Recommended Model | Audio |
|----------|-------------------|-------|
| Best quality | `veo3` | ✅ |
| Best value | `kling-3.0-standard-t2v` | ✅ |
| Budget | `ltx-video` | ❌ |
| Fast I2V | `hailuo-2.3-fast` | ❌ |

---

## ElevenLabs Integration

For premium voice synthesis:
```javascript
const elevenlabsResponse = await fetch(`${API_BASE}/api/tts/elevenlabs`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "Hello world!",
    model: "elevenlabs-v3",
    voice_id: "rachel"  // Rachel, CJ, Sam, Bella, etc.
  })
});
```

---

## Visual DNA System

The script endpoint returns a `global_visual_dna` object that ensures consistent style across all images:

```javascript
{
  style: "cinematic",
  color_grade: "teal-orange",
  lighting_style: "moody",
  camera_language: "35mm cinematic lens",
  render_rules: "film grain, shallow depth of field",
  negative_rules: "no text, no watermark"
}
```

**Always pass this to the image endpoint** for consistent visual style.

---

## Cost Estimation

| Operation | Cost |
|-----------|------|
| TTS (1K chars) | $0.03 - $0.08 |
| Music (per track) | $0.15 - $0.50 |
| Image (per image) | $0.01 - $0.13 |
| Video (per second) | $0.05 - $0.80 |

---

## Rate Limits

- TTS: 30 requests/minute
- Music: 10 requests/minute
- Images: 20 requests/minute

Check remaining limits in response headers or `/api/metrics` endpoint.

---

## Complete Example: Full Video Production

```javascript
async function produceVideo(topic, duration, tone) {
  // 1. Generate script
  const script = await callAPI("/api/script", {
    topic, duration, tone
  });
  
  // 2. Generate all assets in parallel
  const [images, tts, music] = await Promise.all([
    // Generate images for all scenes
    Promise.all(script.scenes.map(scene => 
      callAPI("/api/image", {
        prompt: scene.direction.environment,
        model: "flux-pro",
        global_visual_dna: script.global_visual_dna,
        scene_direction: scene.direction
      })
    )),
    
    // Generate TTS for all scenes
    Promise.all(script.scenes.map(scene =>
      callAPI("/api/tts", {
        text: scene.text,
        voice: "podcast_male"
      })
    )),
    
    // Generate background music
    callAPI("/api/music", {
      prompt: `${tone} background music`,
      model: "music-2.5"
    })
  ]);
  
  return { script, images, tts, music };
}

async function callAPI(endpoint, payload) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(await response.text());
  }
  
  return response.json();
}
```

---

## Health Check

Before starting production, verify the server is healthy:

```javascript
const health = await fetch(`${API_BASE}/health`).then(r => r.json());
// Returns: { status: "healthy", uptime, timestamp, metrics }
```

---

## Questions?

- Check `/api/models` for all available models
- Check `/api/voices` for all voice options
- Check `/api/metrics` for usage and costs
