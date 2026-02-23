"""
FastAPI AI Capability Server
==========================

Stateless AI generation service.
Input → Output. No retries, no queue, no database.

Endpoints:
- POST /script - Generate video script
- POST /scenes/enrich - Enrich scenes with background music
- POST /tts - Text-to-Speech
- POST /image - Image generation
- POST /music - Music generation
- POST /video - Video generation
"""

import os
from typing import Optional, List, Any, Dict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Body
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.routers import script, enrich, tts, image, music, video


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("Starting AI Capability Server...")
    yield
    print("Shutting down AI Capability Server...")


app = FastAPI(
    title="AI Capability Server",
    description="Stateless AI generation service - Input → Output",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers - NEW endpoints (without /api prefix)
app.include_router(script.router, prefix="/script", tags=["Script"])
app.include_router(enrich.router, prefix="/scenes", tags=["Scenes"])
app.include_router(tts.router, prefix="/tts", tags=["TTS"])
app.include_router(image.router, prefix="/image", tags=["Image"])
app.include_router(music.router, prefix="/music", tags=["Music"])
app.include_router(video.router, prefix="/video", tags=["Video"])


@app.get("/", response_class=HTMLResponse)
async def root():
    """Root page with links to docs."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>AI Capability Server</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            h1 { color: #333; }
            .endpoints { background: #f5f5f5; padding: 20px; border-radius: 8px; }
            .endpoint { margin: 10px 0; }
            a { color: #0066cc; text-decoration: none; }
            a:hover { text-decoration: underline; }
            code { background: #e0e0e0; padding: 2px 6px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <h1>AI Capability Server</h1>
        <p>Stateless AI generation service. Input → Output.</p>
        
        <div class="endpoints">
            <h2>Available Endpoints</h2>
            <div class="endpoint"><a href="/docs">/docs</a> - API Documentation (Swagger UI)</div>
            <div class="endpoint"><a href="/redoc">/redoc</a> - ReDoc Documentation</div>
            <div class="endpoint"><a href="/health">/health</a> - Health Check</div>
            <div class="endpoint"><a href="/models">/models</a> - Available Models</div>
            <hr>
            <div class="endpoint"><code>POST /script</code> - Generate video script</div>
            <div class="endpoint"><code>POST /scenes/enrich</code> - Enrich scenes with music</div>
            <div class="endpoint"><code>POST /tts</code> - Text-to-Speech</div>
            <div class="endpoint"><code>POST /image</code> - Image generation</div>
            <div class="endpoint"><code>POST /music</code> - Music generation</div>
            <div class="endpoint"><code>POST /video</code> - Video generation</div>
        </div>
    </body>
    </html>
    """


# BACKWARDS COMPATIBLE ENDPOINTS (with /api prefix)


@app.get("/api")
async def api_root():
    """Redirect /api to /"""
    return RedirectResponse(url="/")


@app.get("/api/")
async def api_root_slash():
    """Redirect /api/ to /"""
    return RedirectResponse(url="/")


@app.post("/api/script")
async def api_script(
    topic: str = Body(..., description="Video topic"),
    tone: str = Body(
        default="neutral", description="Tone: neutral, inspiring, dramatic"
    ),
    duration: int = Body(default=60, description="Video duration in seconds"),
    audience: str = Body(default="general", description="Target audience"),
    language: str = Body(default="English", description="Language"),
):
    """[BACKWARD COMPATIBLE] Generate a video script with scenes and visual direction.

    Parameters:
    - topic: Video topic (required)
    - tone: neutral, inspiring, dramatic, etc. (default: neutral)
    - duration: Video duration in seconds (default: 60)
    - audience: Target audience (default: general)
    - language: Language (default: English)
    """
    return await script.generate_script(topic, tone, duration, audience, language)


@app.post("/api/scenes/enrich")
async def api_scenes_enrich(
    scenes: List[Dict[str, Any]] = Body(
        ...,
        example=[
            {
                "text": "Scene text here",
                "bgMusic": {"enabled": True, "mood": "upbeat", "genre": "pop"},
            }
        ],
    ),
):
    """[BACKWARD COMPATIBLE] Enrich scenes with background music.

    Request body format:
    ```json
    {
      "scenes": [
        {
          "text": "Scene text here",
          "bgMusic": {
            "enabled": true,
            "mood": "upbeat",
            "genre": "pop"
          }
        }
      ]
    }
    ```

    Scene fields:
    - text: Scene text/voiceover (required)
    - bgMusic.enabled: Enable background music (default: true)
    - bgMusic.mood: Music mood (upbeat, calm, dramatic, etc.)
    - bgMusic.genre: Music genre (pop, rock, ambient, etc.)
    - bgMusic.duration: Music duration in seconds
    """
    return await enrich.enrich_scenes(scenes)


@app.post("/api/tts")
async def api_tts(
    text: str = Body(..., description="Text to speak"),
    voice: str = Body(default="radiant_girl", description="Voice profile ID"),
    model: str = Body(default="speech-2.8-hd", description="TTS model"),
    speed: float = Body(default=1.0, description="Speech speed (0.5-2.0)"),
    vol: float = Body(default=1.0, description="Volume (0.1-2.0)"),
    pitch: int = Body(default=0, description="Pitch adjustment (-12 to 12)"),
    output_format: str = Body(
        default="url", description="Output format: url or base64"
    ),
):
    """[BACKWARD COMPATIBLE] Text-to-Speech generation.

    Parameters:
    - text: Text to speak (required, max 10000 chars)
    - voice: Voice profile (default: radiant_girl)
      - Options: radiant_girl, narrator, magnetic_man, nl_kindhearted_girl
      - Profiles: narrator_calm, narrator_female, podcast_male, podcast_female, energetic_male, energetic_female, calm_female, dutch_calm
    - model: TTS model (default: speech-2.8-hd)
      - Options: speech-2.8-hd, speech-2.8-turbo, speech-2.6-hd, speech-2.6-turbo
    - speed: Speech speed 0.5-2.0 (default: 1.0)
    - vol: Volume 0.1-2.0 (default: 1.0)
    - pitch: Pitch -12 to 12 (default: 0)
    - output_format: url or base64 (default: url)
    """
    return await tts.generate_tts(text, voice, model, speed, vol, pitch, output_format)


@app.post("/api/image")
async def api_image(
    prompt: str = Body(..., description="Image description"),
    model: str = Body(default="flux-pro", description="Image model"),
    style: str = Body(
        default="cinematic", description="Style: cinematic, realistic, anime"
    ),
    aspect_ratio: str = Body(
        default="16:9", description="Aspect ratio: 16:9, 1:1, 9:16"
    ),
    seed: int = Body(default=None, description="Random seed for reproducibility"),
):
    """[BACKWARD COMPATIBLE] Image generation via FAL.ai.

    Parameters:
    - prompt: Image description (required)
    - model: Image model (default: flux-pro)
      - Options: flux-pro, flux-dev, flux-schnell, gpt-image-1, gpt-image-1.5, qwen-image, imagen-4
    - style: Style (default: cinematic)
    - aspect_ratio: 16:9, 1:1, 9:16 (default: 16:9)
    - seed: Random seed (optional)
    """
    return await image.generate_image(prompt, model, style, aspect_ratio, seed)


@app.post("/api/music")
async def api_music(
    lyrics: str = Body(default=None, description="Song lyrics"),
    prompt: str = Body(default=None, description="Music description/prompt"),
    model: str = Body(default="music-2.5", description="Music model"),
    duration: int = Body(default=30, description="Music duration in seconds"),
    output_format: str = Body(
        default="url", description="Output format: url or base64"
    ),
):
    """[BACKWARD COMPATIBLE] Music generation.

    Parameters:
    - lyrics: Song lyrics (optional, max 3500 chars)
    - prompt: Music description (optional)
    - model: Music model (default: music-2.5)
      - Options: music-2.5, music-02, sonauto-v2
    - duration: Duration in seconds (default: 30)
    - output_format: url or base64 (default: url)
    """
    return await music.generate_music(lyrics, prompt, model, duration, output_format)


@app.post("/api/video")
async def api_video(
    prompt: str = Body(
        default=None, description="Video description (for text-to-video)"
    ),
    image_url: str = Body(
        default=None, description="Input image URL (for image-to-video)"
    ),
    model: str = Body(default="veo3", description="Video model"),
    duration: int = Body(default=5, description="Video duration in seconds"),
):
    """[BACKWARD COMPATIBLE] Video generation.

    Parameters:
    - prompt: Video description (required for text-to-video)
    - image_url: Input image URL (required for image-to-video)
    - model: Video model (default: veo3)
      - Text-to-Video: veo3, veo3-fast, kling-3.0-pro-t2v, kling-2.6-pro-t2v, sora-2, sora-2-pro, hailuo-02, ltx-video, hailuo-2.3
      - Image-to-Video: veo3-i2v, kling-3.0-pro-i2v, kling-2.6-pro-i2v, hailuo-2.3-i2v, hailuo-2.3-fast
    - duration: Duration in seconds (default: 5)
    """
    return await video.generate_video(prompt, image_url, model, duration)


@app.get("/api/voices")
async def api_voices():
    """[BACKWARD COMPATIBLE] List available voices."""
    return await tts.list_voices()


@app.get("/api/models")
async def api_models():
    """[BACKWARD COMPATIBLE] List all available models."""
    return await list_models()


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "ai-capability-server"}


@app.get("/models")
async def list_models():
    """List all available models."""
    from app.routers import tts, image, music, video

    return {
        "tts": tts.MODELS,
        "image": image.MODELS,
        "music": music.MODELS,
        "video": video.MODELS,
    }
