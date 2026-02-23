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
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from app.routers import script, enrich, tts, image, music, video


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("Starting AI Capability Server...")
    yield
    print("Shutting down AI Capability Server...")


app = FastAPI(
    title="AI Capability Server",
    description="Stateless AI generation service",
    version="1.0.0",
    lifespan=lifespan,
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
# These redirect to the new endpoints for backward compatibility
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
    topic: str,
    tone: str = "neutral",
    duration: int = 60,
    audience: str = "general",
    language: str = "English",
):
    """Backward compatible /api/script endpoint."""
    return await script.generate_script(topic, tone, duration, audience, language)


@app.post("/api/scenes/enrich")
async def api_scenes_enrich(scenes: list):
    """Backward compatible /api/scenes/enrich endpoint."""
    return await enrich.enrich_scenes(scenes)


@app.post("/api/tts")
async def api_tts(
    text: str,
    voice: str = "radiant_girl",
    model: str = "speech-2.8-hd",
    speed: float = 1.0,
    vol: float = 1.0,
    pitch: int = 0,
    output_format: str = "url",
):
    """Backward compatible /api/tts endpoint."""
    return await tts.generate_tts(text, voice, model, speed, vol, pitch, output_format)


@app.post("/api/image")
async def api_image(
    prompt: str,
    model: str = "flux-pro",
    style: str = "cinematic",
    aspect_ratio: str = "16:9",
    seed: int = None,
):
    """Backward compatible /api/image endpoint."""
    return await image.generate_image(prompt, model, style, aspect_ratio, seed)


@app.post("/api/music")
async def api_music(
    lyrics: str = None,
    prompt: str = None,
    model: str = "music-2.5",
    duration: int = 30,
    output_format: str = "url",
):
    """Backward compatible /api/music endpoint."""
    return await music.generate_music(lyrics, prompt, model, duration, output_format)


@app.post("/api/video")
async def api_video(
    prompt: str = None, image_url: str = None, model: str = "veo3", duration: int = 5
):
    """Backward compatible /api/video endpoint."""
    return await video.generate_video(prompt, image_url, model, duration)


@app.get("/api/voices")
async def api_voices():
    """Backward compatible /api/voices endpoint."""
    return await tts.list_voices()


@app.get("/api/models")
async def api_models():
    """Backward compatible /api/models endpoint."""
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
