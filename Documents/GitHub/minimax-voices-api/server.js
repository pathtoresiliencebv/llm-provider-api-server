/**
 * MiniMax Audio API Server - Production Grade
 * 
 * Features:
 * - Comprehensive logging
 * - Hash-based caching
 * - Rate limiting
 * - Retry logic with fallbacks
 * - Metrics tracking
 * - Cost estimation
 */

import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ===========================
// CONFIGURATION
// ===========================
const CONFIG = {
  // Rate limits
  rateLimit: {
    tts: { maxCalls: 100, windowMs: 60 * 1000 },      // 100 TTS calls per minute
    music: { maxCalls: 10, windowMs: 60 * 1000 },     // 10 music calls per minute
  },
  
  // Retry settings
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  },
  
  // Cache settings
  cache: {
    enabled: true,
    maxAgeMs: 24 * 60 * 60 * 1000,  // 24 hours
    directory: process.env.VERCEL ? "/tmp/cache" : "./cache",
  },
  
  // Cost estimation (approximate USD per 1000 chars)
  costs: {
    tts: {
      "speech-2.8-hd": 0.08,    // Latest HD model. Perfecting Tonal Nuances. Maximizing Timbre Similarity.
      "speech-2.8-turbo": 0.04,  // Latest Turbo model. Perfecting Tonal Nuances. Maximizing Timbre Similarity.
      "speech-2.6-hd": 0.06,     // HD model with outstanding prosody and excellent cloning similarity.
      "speech-2.6-turbo": 0.03,  // Turbo model with support for 40 languages.
      "speech-02-hd": 0.05,      // Superior rhythm and stability, with outstanding performance in replication similarity and sound quality.
      "speech-02-turbo": 0.025,  // Superior rhythm and stability, with enhanced multilingual capabilities and excellent performance.
    },
    music: {
      "music-2.5": 0.50,        // MiniMax Music 2.5 - $0.50 per generation
      "music-02": 0.30,         // MiniMax Music 2.0 - $0.30 per generation
      "sonauto-v2": 0.15,       // Sonauto v2 via FAL - ~$0.15 per track
    },
    // FAL.ai Image Generation
    image: {
      // FLUX models
      "flux-pro": 0.04,         // FLUX Pro - highest quality
      "flux-realism": 0.03,     // FLUX Realism - realistic images
      "flux-dev": 0.01,         // FLUX Dev - development/testing
      "flux-schnell": 0.02,     // FLUX Schnell - fast
      // GPT Image (OpenAI)
      "gpt-image-1": 0.10,      // GPT Image 1
      "gpt-image-1.5": 0.13,    // GPT Image 1.5
      "gpt-image-1-mini": 0.04, // GPT Image 1 Mini
      // Qwen Image (Alibaba)
      "qwen-image": 0.05,       // Qwen Image
      "qwen-image-2512": 0.06,  // Qwen Image 2512
      // Google
      "imagen-4": 0.08,         // Google Imagen 4
      "nano-banana-pro": 0.05,  // Nano Banana Pro
      // Grok (xAI)
      "grok-imagine-image": 0.04,
      // Other
      "sdxl": 0.02,
      "sdxl-turbo": 0.01,
      "anime-xl": 0.025,
      "kling-image": 0.03,
      "ideogram-v3": 0.04,
    },
    // Video Generation (per second)
    video: {
      // ============ KLING (FAL) ============
      // Kling 3.0
      "kling-3.0-pro-i2v": 0.30,
      "kling-3.0-pro-t2v": 0.30,
      "kling-3.0-standard-i2v": 0.17,
      "kling-3.0-standard-t2v": 0.17,
      "kling-o3-pro-i2v": 0.25,
      // Kling 2.6
      "kling-2.6-pro-i2v": 0.20,
      "kling-2.6-standard-i2v": 0.10,
      "kling-2.6-pro-t2v": 0.20,
      "kling-2.6-standard-t2v": 0.10,
      // ============ VEO (Google/FAL) ============
      "veo3": 0.40,            // Veo 3 with audio
      "veo3-i2v": 0.40,
      "veo3-fast": 0.20,       // Fast version
      "veo3.1": 0.35,
      // ============ SORA (OpenAI/FAL) ============
      "sora-2": 0.50,
      "sora-2-i2v": 0.50,
      "sora-2-pro": 0.80,
      "sora-2-pro-i2v": 0.80,
      // ============ HAILUO (MiniMax - via FAL) ============
      "hailuo-02-pro-t2v": 0.28,
      "hailuo-02-pro-i2v": 0.28,
      "hailuo-02-standard-t2v": 0.15,
      "hailuo-02-standard-i2v": 0.15,
      // ============ HAILUO 2.3 (MiniMax DIRECT) ============
      "hailuo-2.3": 0.25,           // MiniMax Hailuo 2.3 T2V - DIRECT
      "hailuo-2.3-i2v": 0.25,       // MiniMax Hailuo 2.3 I2V - DIRECT
      "hailuo-2.3-fast": 0.12,       // MiniMax Hailuo 2.3 Fast I2V - DIRECT
      // ============ GROK (xAI/FAL) ============
      "grok-imagine-video": 0.15,
      // ============ LTX / MINIMAX ============
      "ltx-video": 0.05,
      "minimax-video": 0.10,
    },
    // Voice/TTS
    voice: {
      "elevenlabs-v3": 0.10,        // $0.10 per 1000 chars
      "elevenlabs-multilingual-v2": 0.10,
      "elevenlabs-turbo-v2.5": 0.08,
      "resemble": 0.02,             // Estimated
    }
  },
  
  // Style Model Mapping - routes style to FAL model
  styleModelMap: {
    cinematic: {
      draft: "fal-ai/sdxl",
      production: "fal-ai/flux-pro"
    },
    cartoon: {
      draft: "fal-ai/sdxl",
      production: "fal-ai/sdxl"
    },
    anime: {
      draft: "fal-ai/sdxl",
      production: "fal-ai/flux-dev"
    },
    documentary: {
      draft: "fal-ai/sdxl",
      production: "fal-ai/flux-realism"
    },
    surreal: {
      draft: "fal-ai/sdxl",
      production: "fal-ai/flux-pro"
    },
    realistic: {
      draft: "fal-ai/sdxl",
      production: "fal-ai/flux-realism"
    }
  },
  
  // Prompt Templates per Style
  styleTemplates: {
    cinematic: {
      prefix: "Cinematic photorealistic frame,",
      lighting: "moody dramatic lighting, high contrast, rim light",
      camera: "35mm cinematic lens, shallow depth of field, film grain",
      suffix: "highly detailed, photorealistic, 4K, movie quality"
    },
    cartoon: {
      prefix: "High quality cartoon illustration,",
      lighting: "bright flat lighting, soft shadows",
      camera: "clean composition, bold framing",
      suffix: "bold outlines, vibrant colors, Pixar style, smooth gradients"
    },
    anime: {
      prefix: "Anime style illustration,",
      lighting: "dynamic lighting, dramatic shadows",
      camera: "dynamic angle, expressive pose",
      suffix: "anime art, manga style, cel shading, expressive eyes"
    },
    documentary: {
      prefix: "Documentary style photograph,",
      lighting: "natural daylight, realistic",
      camera: "handheld camera feel, candid",
      suffix: "real world setting, no artificial grading, authentic"
    },
    surreal: {
      prefix: "Surreal artistic composition,",
      lighting: "dreamlike ethereal lighting",
      camera: "unconventional perspective",
      suffix: "abstract, surreal, symbolic, thought-provoking"
    },
    realistic: {
      prefix: "Realistic photograph,",
      lighting: "natural lighting, balanced exposure",
      camera: "professional photography, sharp focus",
      suffix: "high detail, lifelike, true to life"
    }
  },
  
  // Available models
  models: {
    tts: [
      { id: "speech-2.8-hd", name: "Speech 2.8 HD", description: "Latest HD model. Perfecting Tonal Nuances. Maximizing Timbre Similarity." },
      { id: "speech-2.8-turbo", name: "Speech 2.8 Turbo", description: "Latest Turbo model. Perfecting Tonal Nuances. Maximizing Timbre Similarity." },
      { id: "speech-2.6-hd", name: "Speech 2.6 HD", description: "HD model with outstanding prosody and excellent cloning similarity." },
      { id: "speech-2.6-turbo", name: "Speech 2.6 Turbo", description: "Turbo model with support for 40 languages." },
      { id: "speech-02-hd", name: "Speech 02 HD", description: "Superior rhythm and stability, with outstanding performance in replication similarity and sound quality." },
      { id: "speech-02-turbo", name: "Speech 02 Turbo", description: "Superior rhythm and stability, with enhanced multilingual capabilities and excellent performance." }
    ],
    music: [
      { id: "music-2.5", name: "Music 2.5", description: "MiniMax Music 2.5 - Latest music generation model." },
      { id: "sonauto-v2", name: "Sonauto V2", description: "AI music generation via FAL - Superior vocals and instrumentation." }
    ],
    // TTS Voices (ElevenLabs via FAL)
    voices: [
      { id: "elevenlabs-v3", provider: "fal", name: "ElevenLabs V3", description: "Most expressive AI voice model. 29+ languages." },
      { id: "elevenlabs-multilingual-v2", provider: "fal", name: "ElevenLabs Multilingual V2", description: "29 languages with exceptional accent accuracy." },
      { id: "elevenlabs-turbo-v2.5", provider: "fal", name: "ElevenLabs Turbo V2.5", description: "Low latency for real-time applications. 32 languages." }
    ],
    image: [
      // FLUX
      { id: "flux-pro", name: "FLUX Pro", description: "Highest quality image generation.", style: ["cinematic", "realistic"] },
      { id: "flux-realism", name: "FLUX Realism", description: "Realistic images for documentary styles.", style: ["documentary", "realistic"] },
      { id: "flux-dev", name: "FLUX Dev", description: "Development model for fast iteration.", style: ["all"] },
      { id: "flux-schnell", name: "FLUX Schnell", description: "Fast generation." },
      // GPT Image
      { id: "gpt-image-1", name: "GPT Image 1", description: "OpenAI's latest image generation model." },
      { id: "gpt-image-1.5", name: "GPT Image 1.5", description: "High-fidelity with strong prompt adherence." },
      { id: "gpt-image-1-mini", name: "GPT Image 1 Mini", description: "Efficient, fast generation." },
      // Qwen Image
      { id: "qwen-image", name: "Qwen Image", description: "Excellent text rendering and style control." },
      { id: "qwen-image-2512", name: "Qwen Image 2512", description: "Improved text rendering, realistic humans." },
      // Google
      { id: "imagen-4", name: "Google Imagen 4", description: "Google's highest quality image generation." },
      { id: "nano-banana-pro", name: "Nano Banana Pro", description: "Google's state-of-the-art image editing." },
      // Grok
      { id: "grok-imagine-image", name: "Grok Imagine Image", description: "xAI's image generation." },
      // Other
      { id: "sdxl", name: "SDXL", description: "Stable Diffusion XL - balanced quality and speed." },
      { id: "anime-xl", name: "Anime XL", description: "Specialized anime style generation." },
      { id: "kling-image", name: "Kling Image", description: "AI image generation." },
      { id: "ideogram-v3", name: "Ideogram V3", description: "Text rendering specialist." }
    ]
  }
};

// ===========================
// MIDDLEWARE
// ===========================
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// MiniMax API Configuration
const API_HOST = process.env.MINIMAX_API_HOST || "https://api.minimax.io";
const API_KEY = process.env.MINIMAX_API_KEY;

// OpenAI Configuration (for Script Engine)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// FAL.ai Configuration (for Image Generation)
const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_API_URL = "https://queue.fal.run";

// Royalty-free music/photo provider configuration
const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;
const JAMENDO_CLIENT_SECRET = process.env.JAMENDO_CLIENT_SECRET;
const JAMENDO_API_URL = "https://api.jamendo.com/v3.0";
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const PIXABAY_AUDIO_URL = "https://pixabay.com/api/audio/";
const PIXABAY_PHOTO_URL = "https://pixabay.com/api/";

// Resemble.ai Configuration (for Dutch TTS)
const RESEMBLE_API_KEY = process.env.RESEMBLE_API_KEY;
const RESEMBLE_SYNTHESIS_ENDPOINT = process.env.RESEMBLE_SYNTHESIS_ENDPOINT || "https://f.cluster.resemble.ai/synthesize";

// Resemble Voice UUIDs for Dutch
const RESEMBLE_VOICES = {
  // Dutch voices - UPDATE THESE UUIDs FROM RESEMBLE DASHBOARD
  "nl_anna": { uuid: "YOUR_DUTCH_VOICE_UUID_1", language: "Dutch", gender: "female", name: "Anna" },
  "nl_pieter": { uuid: "YOUR_DUTCH_VOICE_UUID_2", language: "Dutch", gender: "male", name: "Pieter" },
};

// ElevenLabs Configuration (via FAL)
const ELEVENLABS_VOICES = {
  // ElevenLabs V3 - Most expressive
  "elevenlabs-v3": { 
    provider: "fal", 
    fal_id: "fal-ai/elevenlabs/tts/eleven-v3",
    language: "multilingual",
    voices: [
      { id: "rachel", name: "Rachel", gender: "female" },
      { id: "cj", name: "CJ", gender: "male" },
      { id: "sam", name: "Sam", gender: "male" },
      { id: "bella", name: "Bella", gender: "female" },
      { id: "antonio", name: "Antonio", gender: "male" },
      { id: "arabella", name: "Arabella", gender: "female" },
      { id: "will", name: "Will", gender: "male" },
      { id: "dora", name: "Dora", gender: "female" },
      { id: "adam", name: "Adam", gender: "male" },
      { id: "sophie", name: "Sophie", gender: "female" },
      { id: "josh", name: "Josh", gender: "male" },
      { id: "emily", name: "Emily", gender: "female" },
      { id: "callum", name: "Callum", gender: "male" },
      { id: "serena", name: "Serena", gender: "female" },
      { id: "adam", name: "Adam", gender: "male" },
    ]
  },
  // ElevenLabs Multilingual v2 - 29 languages
  "elevenlabs-multilingual-v2": { 
    provider: "fal", 
    fal_id: "fal-ai/elevenlabs/tts/multilingual-v2",
    language: "multilingual",
    description: "29 languages with exceptional accent accuracy"
  },
  // ElevenLabs Turbo v2.5 - Low latency
  "elevenlabs-turbo-v2.5": { 
    provider: "fal", 
    fal_id: "fal-ai/elevenlabs/tts/turbo-v2.5",
    language: "multilingual",
    description: "32 languages, low latency for real-time apps"
  },
};

// Function to get ElevenLabs voice by ID
function getElevenLabsVoice(voiceId, modelType = "elevenlabs-v3") {
  const model = ELEVENLABS_VOICES[modelType];
  if (!model) return null;
  return model.voices?.find(v => v.id === voiceId) || model.voices?.[0];
}

// ===========================
// VIDEO & IMAGE API PROVIDER CONFIGURATION
// ===========================

// FAL API (Video Generation - primary)
// Note: AIML/Novita removed - using FAL for all video generation

// Video Model Registry - maps model IDs to FAL models
// Based on FAL Queue API: https://docs.fal.ai/model-apis/model-endpoints/queue
const VIDEO_MODELS = {
  // ============ KLING MODELS (via FAL) ============
  // Kling 3.0 Pro - Latest top-tier
  "kling-3.0-pro-i2v": { 
    provider: "fal", 
    fal_id: "fal-ai/kling-video/v3/pro/image-to-video", 
    type: "i2v", 
    supports_t2v: false,
    requires_image: true,
    has_audio: true,
    description: "Kling 3.0 Pro - Top-tier image-to-video with cinematic visuals, native audio"
  },
  "kling-3.0-pro-t2v": { 
    provider: "fal", 
    fal_id: "fal-ai/kling-video/v3/pro/text-to-video", 
    type: "t2v", 
    supports_i2v: false,
    requires_image: false,
    has_audio: true,
    description: "Kling 3.0 Pro - Top-tier text-to-video with native audio, multi-shot"
  },
  "kling-3.0-standard-i2v": { 
    provider: "fal", 
    fal_id: "fal-ai/kling-video/v3/standard/image-to-video", 
    type: "i2v", 
    supports_t2v: false,
    requires_image: true,
    has_audio: true
  },
  "kling-3.0-standard-t2v": { 
    provider: "fal", 
    fal_id: "fal-ai/kling-video/v3/standard/text-to-video", 
    type: "t2v", 
    supports_i2v: false,
    requires_image: false,
    has_audio: true
  },
  // Kling O3
  "kling-o3-pro-i2v": { 
    provider: "fal", 
    fal_id: "fal-ai/kling-video/o3/pro/image-to-video", 
    type: "i2v", 
    supports_t2v: false,
    requires_image: true,
    has_audio: true,
    description: "Kling O3 Pro - Generate video from start/end frames with style guidance"
  },
  // Legacy Kling 2.6 models
  "kling-2.6-pro-i2v": { 
    provider: "fal", 
    fal_id: "fal-ai/kling-video/v2.6/pro/image-to-video", 
    type: "i2v", 
    supports_t2v: false,
    requires_image: true
  },
  "kling-2.6-standard-i2v": { 
    provider: "fal", 
    fal_id: "fal-ai/kling-video/v2.6/standard/image-to-video", 
    type: "i2v", 
    supports_t2v: false,
    requires_image: true
  },
  "kling-2.6-pro-t2v": { 
    provider: "fal", 
    fal_id: "fal-ai/kling-video/v2.6/pro/text-to-video", 
    type: "t2v", 
    supports_i2v: false,
    requires_image: false
  },
  "kling-2.6-standard-t2v": { 
    provider: "fal", 
    fal_id: "fal-ai/kling-video/v2.6/standard/text-to-video", 
    type: "t2v", 
    supports_i2v: false,
    requires_image: false
  },
  // ============ VEO MODELS (Google - via FAL) ============
  "veo3": { 
    provider: "fal", 
    fal_id: "fal-ai/veo3", 
    type: "t2v", 
    supports_i2v: true,
    requires_image: false,
    has_audio: true,
    description: "Veo 3 - Google's most advanced AI video model with sound"
  },
  "veo3-i2v": { 
    provider: "fal", 
    fal_id: "fal-ai/veo3/image-to-video", 
    type: "i2v", 
    supports_t2v: false,
    requires_image: true,
    has_audio: true,
    description: "Veo 3 Image-to-Video"
  },
  "veo3-fast": { 
    provider: "fal", 
    fal_id: "fal-ai/veo3/fast", 
    type: "t2v", 
    supports_i2v: false,
    requires_image: false,
    has_audio: true,
    description: "Veo 3 Fast - Faster, cost-effective version"
  },
  "veo3.1": { 
    provider: "fal", 
    fal_id: "fal-ai/veo3.1", 
    type: "t2v", 
    supports_i2v: true,
    requires_image: false,
    has_audio: true,
    description: "Veo 3.1 - Latest Google video model"
  },
  // ============ SORA MODELS (OpenAI - via FAL) ============
  "sora-2": { 
    provider: "fal", 
    fal_id: "fal-ai/sora-2/text-to-video", 
    type: "t2v", 
    supports_i2v: true,
    requires_image: false,
    has_audio: true,
    description: "Sora 2 - OpenAI's state-of-the-art video model"
  },
  "sora-2-i2v": { 
    provider: "fal", 
    fal_id: "fal-ai/sora-2/image-to-video", 
    type: "i2v", 
    supports_t2v: false,
    requires_image: true,
    has_audio: true
  },
  "sora-2-pro": { 
    provider: "fal", 
    fal_id: "fal-ai/sora-2/text-to-video/pro", 
    type: "t2v", 
    supports_i2v: true,
    requires_image: false,
    has_audio: true,
    description: "Sora 2 Pro - High quality version"
  },
  "sora-2-pro-i2v": { 
    provider: "fal", 
    fal_id: "fal-ai/sora-2/image-to-video/pro", 
    type: "i2v", 
    supports_t2v: false,
    requires_image: true,
    has_audio: true
  },
  // ============ HAILUO MODELS (MiniMax - via FAL) ============
  "hailuo-02-pro-t2v": { 
    provider: "fal", 
    fal_id: "fal-ai/minimax/hailuo-02/pro/text-to-video", 
    type: "t2v", 
    supports_i2v: false,
    requires_image: false,
    description: "Hailuo 02 Pro - 1080p cinematic video"
  },
  "hailuo-02-pro-i2v": { 
    provider: "fal", 
    fal_id: "fal-ai/minimax/hailuo-02/pro/image-to-video", 
    type: "i2v", 
    supports_t2v: false,
    requires_image: true
  },
  "hailuo-02-standard-t2v": { 
    provider: "fal", 
    fal_id: "fal-ai/minimax/hailuo-02/standard/text-to-video", 
    type: "t2v", 
    supports_i2v: false,
    requires_image: false
  },
  "hailuo-02-standard-i2v": { 
    provider: "fal", 
    fal_id: "fal-ai/minimax/hailuo-02/standard/image-to-video", 
    type: "i2v", 
    supports_t2v: false,
    requires_image: true
  },
  // ============ HAILUO 2.3 (MiniMax DIRECT) ============
  "hailuo-2.3": { 
    provider: "minimax", 
    api_endpoint: "https://api.minimax.io/v1/video_generation",
    type: "t2v", 
    supports_i2v: true,
    requires_image: false,
    has_audio: false,
    description: "Hailuo 2.3 - Latest MiniMax video model with enhanced physics and expressions"
  },
  "hailuo-2.3-i2v": { 
    provider: "minimax", 
    api_endpoint: "https://api.minimax.io/v1/video_generation",
    type: "i2v", 
    supports_t2v: false,
    requires_image: true,
    has_audio: false,
    description: "Hailuo 2.3 Image-to-Video"
  },
  "hailuo-2.3-fast": { 
    provider: "minimax", 
    api_endpoint: "https://api.minimax.io/v1/video_generation",
    type: "i2v", 
    supports_t2v: false,
    requires_image: true,
    has_audio: false,
    description: "Hailuo 2.3 Fast - Faster, cost-effective I2V"
  },
  // ============ GROK VIDEO (xAI - via FAL) ============
  "grok-imagine-video": { 
    provider: "fal", 
    fal_id: "fal-ai/grok-imagine-video", 
    type: "t2v", 
    supports_i2v: true,
    requires_image: false,
    has_audio: true,
    description: "Grok Imagine Video - xAI's video generation"
  },
  // ============ LTX VIDEO ============
  "ltx-video": { 
    provider: "fal", 
    fal_id: "fal-ai/ltx-video-v097", 
    type: "t2v", 
    supports_i2v: true,
    requires_image: false
  },
  "minimax-video": { 
    provider: "fal", 
    fal_id: "fal-ai/minimax-video/image-to-video", 
    type: "i2v", 
    supports_t2v: false,
    requires_image: true
  },
};

// Image Model Registry
const IMAGE_MODELS = {
  // ============ FLUX MODELS (via FAL) ============
  "flux-pro": { provider: "fal", model: "fal-ai/flux-pro", description: "FLUX Pro - Highest quality image generation" },
  "flux-dev": { provider: "fal", model: "fal-ai/flux-dev", description: "FLUX Dev - Development/testing" },
  "flux-realism": { provider: "fal", model: "fal-ai/flux-realism", description: "FLUX Realism - Realistic images" },
  "flux-schnell": { provider: "fal", model: "fal-ai/flux-pro/schnell", description: "FLUX Schnell - Fast generation" },
  
  // ============ GPT IMAGE (OpenAI - via FAL) ============
  "gpt-image-1": { 
    provider: "fal", 
    model: "fal-ai/gpt-image-1/text-to-image", 
    description: "GPT Image 1 - OpenAI's latest image generation"
  },
  "gpt-image-1.5": { 
    provider: "fal", 
    model: "fal-ai/gpt-image-1.5", 
    description: "GPT Image 1.5 - High-fidelity with strong prompt adherence"
  },
  "gpt-image-1-mini": { 
    provider: "fal", 
    model: "fal-ai/gpt-image-1-mini", 
    description: "GPT Image 1 Mini - Efficient, fast generation"
  },
  
  // ============ QWEN IMAGE (Alibaba - via FAL) ============
  "qwen-image": { 
    provider: "fal", 
    model: "fal-ai/qwen-image", 
    description: "Qwen Image - Excellent text rendering and style control"
  },
  "qwen-image-2512": { 
    provider: "fal", 
    model: "fal-ai/qwen-image-2512", 
    description: "Qwen Image 2512 - Improved version with better text rendering"
  },
  "qwen-image-edit": { 
    provider: "fal", 
    model: "fal-ai/qwen-image-edit", 
    description: "Qwen Image Edit - Image editing capabilities"
  },
  "qwen-image-edit-plus": { 
    provider: "fal", 
    model: "fal-ai/qwen-image-edit-plus", 
    description: "Qwen Image Edit Plus - Multi-image support, superior editing"
  },
  
  // ============ GROK IMAGINE (xAI - via FAL) ============
  "grok-imagine-image": { 
    provider: "fal", 
    model: "fal-ai/grok-imagine-image", 
    description: "Grok Imagine Image - xAI's image generation"
  },
  
  // ============ GOOGLE IMAGEN (via FAL) ============
  "imagen-4": { 
    provider: "fal", 
    model: "fal-ai/imagen-4", 
    description: "Google Imagen 4 - Highest quality Google image generation"
  },
  
  // ============ KLING IMAGE (via AIML) ============
  "kling-image": { provider: "aiml", model: "kling-image/v1", description: "Kling Image - AI image from AIML" },
  
  // ============ IDEOGRAM (via AIML) ============
  "ideogram-v3": { provider: "aiml", model: "ideogram-v3", description: "Ideogram V3 - Text rendering specialist" },
  
  // ============ NANO BANANA (Google - via FAL) ============
  "nano-banana-pro": { 
    provider: "fal", 
    model: "fal-ai/nano-banana-pro", 
    description: "Nano Banana Pro - Google's state-of-the-art image editing"
  },
};

// Music Model Registry
const MUSIC_MODELS = {
  // MiniMax Music DIRECT
  "music-2.5": {
    provider: "minimax",
    api_endpoint: "https://api.minimax.io/v1/music_generation",
    model_id: "music-2.5",
    description: "MiniMax Music 2.5"
  },
  "music-02": {
    provider: "minimax",
    api_endpoint: "https://api.minimax.io/v1/music_generation",
    model_id: "music-02",
    description: "MiniMax Music 2.0"
  },
  // Sonauto (via FAL)
  "sonauto-v2": {
    provider: "fal",
    fal_id: "sonauto/v2/text-to-music",
    description: "Sonauto V2"
  },
  // Grok Music (via FAL)
  "grok-music": {
    provider: "fal",
    fal_id: "fal-ai/grok-imagine/music",
    description: "Grok Music"
  }
};

// ===========================
// STATE: Logging, Metrics, Cache
// ===========================

// ===========================
// STATE: Logging, Metrics, Cache
// ===========================

// In-memory logs (keep last 1000)
const requestLogs = [];
const MAX_LOGS = 1000;

// Metrics
const metrics = {
  tts: { calls: 0, errors: 0, totalChars: 0, totalLatencyMs: 0 },
  music: { calls: 0, errors: 0, totalLatencyMs: 0 },
  image: { calls: 0, errors: 0, totalLatencyMs: 0 },
  cache: { hits: 0, misses: 0 },
};

// Rate limiting state
const rateLimitStore = new Map();

// Create cache directory
if (!fs.existsSync(CONFIG.cache.directory)) {
  fs.mkdirSync(CONFIG.cache.directory, { recursive: true });
}

// ===========================
// UTILITIES
// ===========================

/**
 * Generate hash for caching
 */
function generateHash(...inputs) {
  const data = inputs.join("|");
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 16);
}

/**
 * Log request with full details
 */
function logRequest(type, data) {
  const logEntry = {
    type,
    timestamp: new Date().toISOString(),
    ...data,
  };
  
  requestLogs.push(logEntry);
  if (requestLogs.length > MAX_LOGS) {
    requestLogs.shift();
  }
  
  // Console output for debugging
  console.log(`[${type.toUpperCase()}]`, data.message || "");
}

/**
 * Estimate cost
 */
function estimateCost(type, model, charCount = 0) {
  const modelCosts = CONFIG.costs[type];
  if (!modelCosts) return 0;
  
  const costPer1k = modelCosts[model] || 0;
  return (charCount / 1000) * costPer1k;
}

/**
 * Check rate limit
 */
function checkRateLimit(identifier, type) {
  const limit = CONFIG.rateLimit[type];
  const now = Date.now();
  
  const key = `${identifier}:${type}`;
  const record = rateLimitStore.get(key);
  
  if (!record) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit.maxCalls - 1 };
  }
  
  // Reset if window expired
  if (now - record.windowStart > limit.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit.maxCalls - 1 };
  }
  
  // Check limit
  if (record.count >= limit.maxCalls) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: limit.maxCalls - record.count };
}

/**
 * Get cached file if exists and valid
 */
function getCachedAudio(hash) {
  const filepath = path.join(CONFIG.cache.directory, `${hash}.json`);
  
  if (!fs.existsSync(filepath)) {
    return null;
  }
  
  try {
    const cached = JSON.parse(fs.readFileSync(filepath, "utf-8"));
    
    // Check if expired
    const cachedTime = new Date(cached.timestamp).getTime();
    if (Date.now() - cachedTime > CONFIG.cache.maxAgeMs) {
      fs.unlinkSync(filepath);
      return null;
    }
    
    return cached;
  } catch {
    return null;
  }
}

/**
 * Save to cache
 */
function saveToCache(hash, data) {
  if (!CONFIG.cache.enabled) return;
  
  const filepath = path.join(CONFIG.cache.directory, `${hash}.json`);
  
  try {
    fs.writeFileSync(filepath, JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
    }));
  } catch (err) {
    console.error("[CACHE] Write failed:", err.message);
  }
}

// ===========================
// AVAILABLE VOICES
// ===========================
const VOICES = {
  // English
  "radiant_girl": { id: "English_radiant_girl", language: "English", gender: "female" },
  "narrator": { id: "English_expressive_narrator", language: "English", gender: "male" },
  "magnetic_man": { id: "English_magnetic_voiced_man", language: "English", gender: "male" },
  "compelling_lady": { id: "English_compelling_lady1", language: "English", gender: "female" },
  "aussie_bloke": { id: "English_Aussie_Bloke", language: "English", gender: "male" },
  "calm_woman": { id: "English_CalmWoman", language: "English", gender: "female" },
  "upbeat_woman": { id: "English_Upbeat_Woman", language: "English", gender: "female" },
  "deep_voice_man": { id: "English_ManWithDeepVoice", language: "English", gender: "male" },
  
  // Dutch
  "nl_kindhearted_girl": { id: "Dutch_kindhearted_girl", language: "Dutch", gender: "female" },
  "nl_bossy_leader": { id: "Dutch_bossy_leader", language: "Dutch", gender: "female" },
  
  // Chinese
  "zh_crisp_girl": { id: "Chinese (Mandarin)_Crisp_Girl", language: "Chinese", gender: "female" },
  "zh_gentleman": { id: "Chinese (Mandarin)_Gentleman", language: "Chinese", gender: "male" },
};

// ===========================
// VOICE PROFILES (Voice Identity Layer)
// ===========================
// This is YOUR voice branding system - MiniMax is just the engine

const VOICE_PROFILES = {
  // === MALE VOICES ===
  "narrator_calm": {
    label: "Calm Narrator",
    description: "Deep, measured storytelling voice",
    gender: "male",
    energy: "low",
    speed: 0.95,
    pitch: 0.98,
    recommended_for: ["documentary", "storytelling", "meditation"]
  },
  "narrator_authoritative": {
    label: "Authoritative Narrator",
    description: "Confident, commanding storyteller",
    gender: "male",
    energy: "medium",
    speed: 1.0,
    pitch: 1.02,
    recommended_for: ["documentary", "training", "presentation"]
  },
  "podcast_male": {
    label: "Podcast Host (Male)",
    description: "Friendly, engaging conversational tone",
    gender: "male",
    energy: "medium",
    speed: 1.0,
    pitch: 1.0,
    recommended_for: ["podcast", "interview", "casual"]
  },
  "corporate_male": {
    label: "Corporate Professional",
    description: "Professional, trustworthy business voice",
    gender: "male",
    energy: "medium",
    speed: 0.95,
    pitch: 0.99,
    recommended_for: ["corporate", "training", "presentation"]
  },
  "energetic_male": {
    label: "Energetic Male",
    description: "High energy, motivational",
    gender: "male",
    energy: "high",
    speed: 1.1,
    pitch: 1.05,
    recommended_for: ["promo", "commercial", "motivation"]
  },
  
  // === FEMALE VOICES ===
  "narrator_female": {
    label: "Narrator (Female)",
    description: "Warm, engaging storytelling",
    gender: "female",
    energy: "medium",
    speed: 1.0,
    pitch: 1.0,
    recommended_for: ["documentary", "storytelling", "audiobook"]
  },
  "podcast_female": {
    label: "Podcast Host (Female)",
    description: "Friendly, conversational female voice",
    gender: "female",
    energy: "medium",
    speed: 1.02,
    pitch: 1.01,
    recommended_for: ["podcast", "interview", "casual"]
  },
  "corporate_female": {
    label: "Corporate Professional (Female)",
    description: "Professional, trustworthy business voice",
    gender: "female",
    energy: "medium",
    speed: 0.95,
    pitch: 1.0,
    recommended_for: ["corporate", "training", "presentation"]
  },
  "energetic_female": {
    label: "Energetic Female",
    description: "High energy, enthusiastic",
    gender: "female",
    energy: "high",
    speed: 1.1,
    pitch: 1.03,
    recommended_for: ["promo", "commercial", "motivation"]
  },
  "calm_female": {
    label: "Calm & Soothing",
    description: "Gentle, peaceful, relaxing",
    gender: "female",
    energy: "low",
    speed: 0.92,
    pitch: 0.98,
    recommended_for: ["meditation", "sleep", "wellness"]
  },
  "teen_female": {
    label: "Teen / Youth",
    description: "Young, modern, relatable",
    gender: "female",
    energy: "medium",
    speed: 1.05,
    pitch: 1.04,
    recommended_for: ["social", "tiktok", "youth"]
  },
  
  // === SPECIALTY VOICES ===
  "news_anchor": {
    label: "News Anchor",
    description: "Professional news delivery",
    gender: "male",
    energy: "medium",
    speed: 0.98,
    pitch: 1.0,
    recommended_for: ["news", "update", "briefing"]
  },
  "radio_host": {
    label: "Radio DJ",
    description: "Upbeat radio personality",
    gender: "male",
    energy: "high",
    speed: 1.08,
    pitch: 1.02,
    recommended_for: ["radio", "promo", "entertainment"]
  },
  "audiobook_fantasy": {
    label: "Fantasy Narrator",
    description: "Epic, immersive storytelling",
    gender: "male",
    energy: "medium",
    speed: 0.9,
    pitch: 0.97,
    recommended_for: ["fantasy", "audiobook", "storytelling"]
  },
  
  // === DUTCH VOICES ===
  "dutch_calm": {
    label: "Dutch - Calm",
    description: "Rustige Nederlandse stem",
    gender: "female",
    energy: "low",
    speed: 0.95,
    pitch: 1.0,
    language: "Dutch",
    recommended_for: ["dutch", "corporate", "narration"]
  },
  "dutch_energetic": {
    label: "Dutch - Energetic",
    description: "Energieke Nederlandse stem",
    gender: "female",
    energy: "high",
    speed: 1.05,
    pitch: 1.02,
    language: "Dutch",
    recommended_for: ["dutch", "promo", "commercial"]
  }
};

// Get voice parameters for a profile
function getProfileParams(profileId) {
  const profile = VOICE_PROFILES[profileId];
  if (!profile) return null;
  
  // Map to MiniMax voice based on gender
  let voiceId;
  if (profile.language === "Dutch") {
    voiceId = "Dutch_kindhearted_girl";
  } else {
    voiceId = profile.gender === "female" ? "English_radiant_girl" : "English_magnetic_voiced_man";
  }
  
  // Convert pitch from ratio (0.9-1.1) to cents (-12 to 12)
  // MiniMax expects pitch as integer cents offset
  const pitchCents = Math.round((profile.pitch - 1.0) * 100);
  
  return {
    voice_id: voiceId,
    speed: profile.speed,
    pitch: pitchCents,
    vol: 1.0,
    profile: profile
  };
}

/**
 * Build style-enhanced prompt for image generation
 */
function buildStylePrompt(prompt, style) {
  const template = CONFIG.styleTemplates[style];
  if (!template) return prompt;
  
  return `${template.prefix} ${prompt}, ${template.lighting}, ${template.camera}. ${template.suffix}`;
}

/**
 * Select FAL model based on style and quality
 */
function selectFalModel(style, quality = "production") {
  const styleMap = CONFIG.styleModelMap[style];
  if (!styleMap) return "fal-ai/flux-pro";
  return styleMap[quality] || styleMap.production || "fal-ai/flux-pro";
}

/**
 * Poll FAL queue for result
 */
async function pollFalQueue(requestId, maxAttempts = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await axios.get(
      `${FAL_API_URL}/${requestId}/status`,
      { headers: { "Authorization": `Key ${FAL_API_KEY}` } }
    );
    
    const { status, completion } = response.data;
    
    if (status === "COMPLETED") {
      return completion;
    }
    
    if (status === "FAILED") {
      throw new Error("FAL image generation failed");
    }
    
    await new Promise(r => setTimeout(r, delayMs));
  }
  
  throw new Error("FAL queue polling timeout");
}

// ===========================
// RESEMBLE TTS SERVICE
// ===========================

/**
 * Determine which TTS provider to use based on voice/language
 * Dutch voices → Resemble
 * English/other → MiniMax (with OpenAI fallback)
 */
function getTTSProvider(voice) {
  // Check if voice is a Resemble Dutch voice
  if (RESEMBLE_VOICES[voice]) {
    return { provider: "resemble", voiceConfig: RESEMBLE_VOICES[voice] };
  }
  // Check if voice starts with nl_ or dutch_
  if (voice?.startsWith("nl_") || voice?.startsWith("dutch_")) {
    // Default Dutch voice if not in RESEMBLE_VOICES
    return { provider: "resemble", voiceConfig: RESEMBLE_VOICES["nl_anna"] };
  }
  // Default to MiniMax
  return { provider: "minimax", voiceConfig: null };
}

/**
 * Call Resemble.ai TTS API
 * Returns: { audio_url, duration }
 */
async function callResembleTTS(text, voiceUuid, options = {}) {
  if (!RESEMBLE_API_KEY) {
    throw new Error("Resemble API key not configured");
  }

  const { output_format = "mp3", sample_rate = 22050 } = options;

  const response = await axios.post(
    RESEMBLE_SYNTHESIS_ENDPOINT,
    {
      voice_uuid: voiceUuid,
      data: text,
      output_format: output_format,
      sample_rate: sample_rate
    },
    {
      headers: {
        "Authorization": `Bearer ${RESEMBLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 30000
    }
  );

  if (!response.data?.success) {
    throw new Error(response.data?.error || "Resemble TTS failed");
  }

  const { audio_content, duration } = response.data;

  // Decode base64 to buffer and save to cache/file
  const audioBuffer = Buffer.from(audio_content, "base64");
  const filename = `resemble_${Date.now()}.${output_format}`;
  const filepath = path.join(CONFIG.cache.directory, filename);
  
  fs.writeFileSync(filepath, audioBuffer);

  return {
    audio_url: filepath,
    audio_buffer: audioBuffer,
    duration: duration,
    output_format
  };
}

/**
 * Call OpenAI TTS API (fallback)
 * Returns: { audio_url, duration }
 */
async function callOpenAITTS(text, voice = "alloy", options = {}) {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const { speed = 1.0, output_format = "mp3" } = options;

  const response = await openai.audio.speech.create({
    model: "tts-1-hd",
    voice: voice,
    input: text,
    speed: speed,
    response_format: output_format
  });

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const filename = `openai_${Date.now()}.${output_format}`;
  const filepath = path.join(CONFIG.cache.directory, filename);
  
  fs.writeFileSync(filepath, audioBuffer);

  return {
    audio_url: filepath,
    audio_buffer: audioBuffer,
    duration: 0, // OpenAI doesn't return duration
    output_format
  };
}

// ===========================
// ROYALTY-FREE MUSIC PROVIDER SERVICE
// ===========================

/**
 * Music Provider - Unified interface for royalty-free music
 * Providers: minimax (primary), jamendo, pixabay
 */

/**
 * Get track from Jamendo
 */
async function fetchJamendoTrack(options = {}) {
  const { mood, genre, duration, limit = 10 } = options;
  
  if (!JAMENDO_CLIENT_ID) {
    throw new Error("Jamendo API key not configured");
  }

  const params = new URLSearchParams({
    client_id: JAMENDO_CLIENT_ID,
    format: "json",
    limit: limit.toString(),
    order: "popularity_total",
    include: "musicinfo"
  });

  if (mood) params.append("mood", mood);
  if (genre) params.append("genre", genre);
  if (duration) params.append("duration", duration);

  const response = await axios.get(`${JAMENDO_API_URL}/tracks/?${params}`);
  
  if (!response.data?.results?.length) {
    throw new Error("No tracks found on Jamendo");
  }

  const track = response.data.results[0];
  
  return {
    trackId: `jamendo_${track.id}`,
    provider: "jamendo",
    trackUrl: track.audio,
    duration: track.duration,
    license: track.license || "CC-BY",
    title: track.name,
    artist: track.artist_name,
    genre: track.musicinfo?.genre?.[0] || genre,
    mood: track.musicinfo?.mood?.[0] || mood
  };
}

/**
 * Get track from Pixabay
 */
async function fetchPixabayTrack(options = {}) {
  const { query = "background music", duration, limit = 10 } = options;
  if (!PIXABAY_API_KEY) {
    throw new Error("Pixabay API key not configured");
  }

  const params = new URLSearchParams({
    key: PIXABAY_API_KEY,
    q: options.query,
    category: "music",
    per_page: limit.toString()
  });

  if (options.duration) params.append("duration", options.duration.toString());

  const response = await axios.get(`${PIXABAY_AUDIO_URL}?${params}`);
  
  if (!response.data?.hits?.length) {
    throw new Error("No tracks found on Pixabay");
  }

  const track = response.data.hits[0];
  
  return {
    trackId: `pixabay_${track.id}`,
    provider: "pixabay",
    trackUrl: track.audio,
    duration: Math.round(track.duration),
    license: "Pixabay License (free, commercial allowed)",
    title: track.tags?.split(",")?.[0] || options.query,
    tags: track.tags
  };
}

/**
 * Unified music provider - returns track from preferred provider
 * with fallback support
 */
async function getRoyaltyFreeMusic(options = {}) {
  const { 
    provider = "minimax",  // minimax, jamendo, pixabay
    mood,
    genre,
    duration,
    fallback = true 
  } = options;

  const providers = provider === "minimax" 
    ? ["jamendo", "pixabay"]  // minimax = use external providers
    : [provider];

  let lastError = null;

  for (const prov of providers) {
    try {
      switch (prov) {
        case "jamendo":
          return await fetchJamendoTrack({ mood, genre, duration });
        case "pixabay":
          return await fetchPixabayTrack({ query: mood || genre || "background music", duration });
        default:
          throw new Error(`Unknown provider: ${prov}`);
      }
    } catch (error) {
      lastError = error;
      logRequest("music", { 
        message: `Provider ${prov} failed, trying next`, 
        error: error.message 
      });
    }
  }

  if (fallback && lastError) {
    // Final fallback to Pixabay
    try {
      return await fetchPixabayTrack({ query: "ambient background", duration });
    } catch (fallbackError) {
      throw new Error("All music providers failed");
    }
  }

  throw lastError || new Error("No music providers available");
}

/**
 * Get multiple tracks for selection
 */
async function listRoyaltyFreeMusic(options = {}) {
  const { 
    provider = "jamendo",
    mood,
    genre,
    duration,
    limit = 5 
  } = options;

  if (!JAMENDO_CLIENT_ID) {
    throw new Error("Jamendo API key not configured");
  }

  const params = new URLSearchParams({
    client_id: JAMENDO_CLIENT_ID,
    format: "json",
    limit: limit.toString(),
    order: "popularity_total"
  });

  if (mood) params.append("mood", mood);
  if (genre) params.append("genre", genre);

  const response = await axios.get(`${JAMENDO_API_URL}/tracks/?${params}`);
  
  return (response.data?.results || []).map(track => ({
    trackId: `jamendo_${track.id}`,
    provider: "jamendo",
    trackUrl: track.audio,
    duration: track.duration,
    license: track.license || "CC-BY",
    title: track.name,
    artist: track.artist_name,
    genre: track.musicinfo?.genre?.[0]
  }));
}

/**
 * CENTRAL PROMPT BUILDER SERVICE
 * Combines global_visual_dna, scene_direction, character_lock, and style_template
 * into an optimized FAL prompt string.
 * 
 * @param {Object} globalDNA - Global visual DNA (style, color_grade, lighting_style, etc.)
 * @param {Object} sceneDirection - Per-scene direction (environment, shot_type, etc.)
 * @param {Object} characterLock - Character lock object {id, seed, profile}
 * @param {string} style - Style key for template lookup
 * @returns {string} Optimized FAL prompt
 */
function buildImagePrompt(globalDNA, sceneDirection, characterLock = null, style = "cinematic") {
  // Get style template from CONFIG
  const styleTemplate = CONFIG.styleTemplates[style] || CONFIG.styleTemplates.cinematic;
  
  // Build prompt components
  const components = [];

  // 1. Character lock injection (if provided)
  if (characterLock && characterLock.profile) {
    components.push(`Character: ${characterLock.profile}`);
  }

  // 2. Environment and subject action
  if (sceneDirection.environment) {
    components.push(`Scene: ${sceneDirection.environment}`);
  }
  if (sceneDirection.subject_action) {
    components.push(`Action: ${sceneDirection.subject_action}`);
  }

  // 3. Shot type and composition
  if (sceneDirection.shot_type) {
    components.push(`Shot: ${sceneDirection.shot_type} shot`);
  }
  if (sceneDirection.composition) {
    components.push(`Composition: ${sceneDirection.composition}`);
  }

  // 4. Mood and props
  if (sceneDirection.mood) {
    components.push(`Mood: ${sceneDirection.mood}`);
  }
  if (sceneDirection.props_or_symbols && sceneDirection.props_or_symbols !== "none") {
    components.push(`Props: ${sceneDirection.props_or_symbols}`);
  }

  // 5. Global DNA - Style and color grade
  if (globalDNA.style) {
    const stylePrefix = styleTemplate?.prefix || `${globalDNA.style} style`;
    components.push(stylePrefix);
  }
  if (globalDNA.color_grade) {
    components.push(`Color grade: ${globalDNA.color_grade}`);
  }

  // 6. Lighting
  if (globalDNA.lighting_style) {
    const lighting = styleTemplate?.lighting || globalDNA.lighting_style;
    components.push(`Lighting: ${lighting}`);
  }

  // 7. Camera language
  if (globalDNA.camera_language) {
    const camera = styleTemplate?.camera || globalDNA.camera_language;
    components.push(`Camera: ${camera}`);
  }

  // 8. Render rules
  if (globalDNA.render_rules) {
    components.push(`Render: ${globalDNA.render_rules}`);
  }

  // 9. Negative rules (global constraints)
  if (globalDNA.negative_rules) {
    components.push(`Avoid: ${globalDNA.negative_rules}`);
  }

  // Join all components with commas for FAL
  return components.join(", ");
}

// ===========================
// ENDPOINTS
// ===========================

/**
 * GET /health - Health check with basic metrics
 */
app.get("/health", (req, res) => {
  // Calculate daily cost estimate
  const todayLogs = requestLogs.filter(log => {
    const logDate = new Date(log.timestamp).toDateString();
    return logDate === new Date().toDateString();
  });
  
  const estimatedDailyCost = todayLogs.reduce((sum, log) => {
    if (log.estimatedCost) return sum + log.estimatedCost;
    return sum;
  }, 0);
  
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    metrics: {
      tts: { ...metrics.tts, avgLatencyMs: metrics.tts.calls > 0 ? Math.round(metrics.tts.totalLatencyMs / metrics.tts.calls) : 0 },
      music: { ...metrics.music, avgLatencyMs: metrics.music.calls > 0 ? Math.round(metrics.music.totalLatencyMs / metrics.music.calls) : 0 },
      cache: { hitRate: metrics.cache.hits + metrics.cache.misses > 0 ? Math.round((metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses)) * 100) + "%" : "0%" },
    },
    estimatedDailyCost: `$${estimatedDailyCost.toFixed(4)}`,
  });
});

/**
 * GET /api/logs - Get recent logs (for debugging)
 */
app.get("/api/logs", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    logs: requestLogs.slice(-limit),
    total: requestLogs.length,
  });
});

/**
 * GET /api/metrics - Get detailed metrics
 */
app.get("/api/metrics", (req, res) => {
  // Calculate daily costs
  const todayLogs = requestLogs.filter(log => {
    const logDate = new Date(log.timestamp).toDateString();
    return logDate === new Date().toDateString();
  });
  
  const dailyCosts = todayLogs.reduce((sum, log) => sum + (log.estimatedCost || 0), 0);
  
  res.json({
    totalRequests: metrics.tts.calls + metrics.music.calls + metrics.image.calls,
    totalErrors: metrics.tts.errors + metrics.music.errors + metrics.image.errors,
    tts: metrics.tts,
    music: metrics.music,
    image: metrics.image,
    cache: metrics.cache,
    dailyCosts: `${dailyCosts.toFixed(4)}`,
    logs: requestLogs.length,
  });
});

/**
 * GET /api/voices - List available voices (Voice Identity Layer)
 * 
 * Returns TWO types of voices:
 * 1. profiles - Your custom voice profiles (recommended)
 * 2. voices - Raw MiniMax voice IDs
 */
app.get("/api/voices", (req, res) => {
  const { filter, energy, gender, type } = req.query;
  
  // Return ElevenLabs voices (via FAL)
  if (type === 'elevenlabs') {
    const elevenLabsVoices = Object.entries(ELEVENLABS_VOICES).map(([id, config]) => ({
      id,
      provider: config.provider,
      fal_id: config.fal_id,
      language: config.language,
      description: config.description,
      voices: config.voices || []
    }));
    return res.json({
      type: "elevenlabs",
      voices: elevenLabsVoices,
      note: "Use in TTS: { voice: 'elevenlabs-v3', voice_id: 'rachel' }"
    });
  }
  
  // Return voice profiles (your branding layer)
  if (!type || type === 'profiles') {
    let profiles = Object.entries(VOICE_PROFILES).map(([id, profile]) => ({
      id,
      ...profile
    }));
    
    // Filter by gender
    if (gender) {
      profiles = profiles.filter(p => p.gender === gender);
    }
    
    // Filter by energy
    if (energy) {
      profiles = profiles.filter(p => p.energy === energy);
    }
    
    // Filter by use case
    if (filter) {
      profiles = profiles.filter(p => 
        p.recommended_for?.some(r => r.toLowerCase().includes(filter.toLowerCase()))
      );
    }
    
    // Return profiles only if requested or default
    if (!type || type === 'profiles') {
      return res.json({
        type: "profiles",
        profiles,
        total: profiles.length,
        default: "narrator_calm",
        note: "Use profile ID in TTS call: { voice: 'narrator_calm' }"
      });
    }
  }
  
  // Return raw MiniMax voices
  const voiceList = Object.entries(VOICES).map(([key, voice]) => ({
    id: key,
    voice_id: voice.id,
    language: voice.language,
    gender: voice.gender,
  }));
  
  res.json({ 
    type: "minimax_voices",
    voices: voiceList, 
    default: "radiant_girl" 
  });
});

/**
 * GET /api/voices/:id - Get specific voice profile details
 */
app.get("/api/voices/profile/:id", (req, res) => {
  const { id } = req.params;
  const profile = VOICE_PROFILES[id];
  
  if (!profile) {
    return res.status(404).json({ 
      error: "Voice profile not found",
      available: Object.keys(VOICE_PROFILES)
    });
  }
  
  // Return full profile with MiniMax mapping
  const params = getProfileParams(id);
  
  res.json({
    id,
    ...profile,
    minimax_params: {
      voice_id: params.voice_id,
      speed: params.speed,
      pitch: params.pitch
    }
  });
});

/**
 * GET /api/models - List all available models
 */
app.get("/api/models", (req, res) => {
  // Convert VIDEO_MODELS to array format
  const videoModels = Object.entries(VIDEO_MODELS).map(([id, config]) => ({
    id,
    name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    provider: config.provider,
    type: config.type,
    fal_id: config.fal_id,
    has_audio: config.has_audio || false,
    description: config.description || (config.type === 'i2v' ? 'Image-to-Video' : 'Text-to-Video')
  }));
  
  // Convert MUSIC_MODELS to array format
  const musicModels = Object.entries(MUSIC_MODELS).map(([id, config]) => ({
    id,
    name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    provider: config.provider,
    fal_id: config.fal_id,
    description: config.description
  }));

  res.json({
    tts: CONFIG.models.tts,
    voices: CONFIG.models.voices,
    music: musicModels,
    image: CONFIG.models.image,
    video: videoModels,
    style_routes: CONFIG.styleModelMap,
    default_tts: "speech-2.8-hd",
    default_voice: "elevenlabs-v3",
    default_music: "music-2.5",
    default_video: "veo3",
    default_image: "flux-pro",
    costs: CONFIG.costs
  });
});

/**
 * POST /api/script - Script Engine (GPT-powered)
 * 
 * Generates structured video scripts with scenes, emotions, and music hints.
 */
app.post("/api/script", async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress || "unknown";
  
  const { 
    topic, 
    duration = 60, 
    tone = "neutral", 
    audience = "general",
    language = "English"
  } = req.body;

  // Validation
  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }
  
  if (!openai) {
    return res.status(500).json({ error: "OpenAI API key not configured" });
  }

  // Rate limit check (script uses TTS rate limit)
  const rateCheck = checkRateLimit(clientIp, "tts");
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: "Rate limit exceeded", remaining: 0 });
  }

  // Build prompt for script generation
  const systemPrompt = `You are a professional cinematic video script writer with visual directing expertise.
Generate structured scripts for voice-over videos WITH FULL VISUAL DIRECTION.

Rules:
- Keep natural spoken language.
- Break into logical scenes (5-12 max).
- Each scene must be 1-3 sentences.
- Avoid filler phrases.
- Match tone and audience precisely.
- Estimate duration realistically (150 words ≈ 60 seconds).
- Generate visual direction that creates a cohesive filmic experience.

Return strictly valid JSON with this exact structure:
{
  "title": "...",
  "global_visual_dna": {
    "style": "cinematic",
    "color_grade": "teal-orange",
    "lighting_style": "moody",
    "camera_language": "35mm cinematic lens",
    "render_rules": "film grain, shallow depth of field",
    "negative_rules": "no text, no watermark, no distorted hands"
  },
  "scenes": [
    {
      "text": "...",
      "emotion": "...",
      "music_hint": "...",
      "direction": {
        "environment": "...",
        "subject_action": "...",
        "shot_type": "wide/medium/close",
        "composition": "rule of thirds/centered",
        "mood": "...",
        "props_or_symbols": "..."
      }
    }
  ],
  "estimated_duration_seconds": number
}`;

  const userPrompt = `Generate a ${duration}-second video script.
- Topic: ${topic}
- Tone: ${tone}
- Target audience: ${audience}
- Language: ${language}

Make it engaging, natural, and optimized for voice-over.`;

  try {
    logRequest("script", { 
      message: "Generating script", 
      topic, 
      duration, 
      tone,
      audience 
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",  // Fast and cheap
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Parse JSON response
    let script;
    try {
      script = JSON.parse(content);
    } catch {
      throw new Error("Failed to parse script JSON");
    }

    // Validate response structure
    if (!script.scenes || !Array.isArray(script.scenes)) {
      throw new Error("Invalid script structure");
    }

    // SCHEMA VALIDATION + FALLBACK DEFAULTS
    // Ensure global_visual_dna exists with all required fields
    const DEFAULT_VISUAL_DNA = {
      style: "cinematic",
      color_grade: "natural",
      lighting_style: "balanced",
      camera_language: "35mm cinematic",
      render_rules: "high detail, realistic",
      negative_rules: "no text, no watermark, no distorted hands"
    };

    const DEFAULT_DIRECTION = {
      environment: "neutral",
      subject_action: "static",
      shot_type: "medium",
      composition: "centered",
      mood: "neutral",
      props_or_symbols: "none"
    };

    // Apply defaults if global_visual_dna is missing or incomplete
    if (!script.global_visual_dna) {
      script.global_visual_dna = { ...DEFAULT_VISUAL_DNA };
    } else {
      script.global_visual_dna = {
        ...DEFAULT_VISUAL_DNA,
        ...script.global_visual_dna
      };
    }

    // Apply defaults to each scene's direction
    script.scenes = script.scenes.map(scene => {
      if (!scene.direction) {
        scene.direction = { ...DEFAULT_DIRECTION };
      } else {
        scene.direction = {
          ...DEFAULT_DIRECTION,
          ...scene.direction
        };
      }
      return scene;
    });

    // Calculate total words and adjust duration estimate
    const totalWords = script.scenes.reduce((sum, scene) => {
      return sum + (scene.text?.split(/\s+/).filter(w => w).length || 0);
    }, 0);
    
    // Override duration estimate if provided
    if (duration && script.estimated_duration_seconds !== duration) {
      script.estimated_duration_seconds = duration;
    }

    const latencyMs = Date.now() - startTime;
    
    // Update metrics
    metrics.script = metrics.script || { calls: 0, errors: 0, totalLatencyMs: 0 };
    metrics.script.calls++;
    metrics.script.totalLatencyMs += latencyMs;

    logRequest("script", { 
      message: "Script generated", 
      topic,
      sceneCount: script.scenes.length,
      wordCount: totalWords,
      latencyMs,
      statusCode: 200
    });

    return res.json({
      success: true,
      ...script,
      metadata: {
        topic,
        duration,
        tone,
        audience,
        language,
        wordCount: totalWords,
        sceneCount: script.scenes.length
      },
      latencyMs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    metrics.script = metrics.script || { calls: 0, errors: 0, totalLatencyMs: 0 };
    metrics.script.errors++;
    
    logRequest("script", { 
      message: "Script generation failed", 
      error: error.message,
      topic,
      statusCode: 500
    });

    return res.status(500).json({ 
      error: "Script generation failed", 
      details: error.message 
    });
  }
});

/**
 * POST /api/tts - Text-to-Speech with full defensive layer
 */
app.post("/api/tts", async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress || "unknown";
  
  // Extract params
  const { 
    text, 
    voice = "radiant_girl", 
    model = "speech-2.8-hd",
    speed = 1.0,
    vol = 1.0,
    pitch = 0,
    language_boost = "auto",
    output_format = "url"
  } = req.body;

  // Validation
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }
  if (text.length > 10000) {
    return res.status(400).json({ error: "Text must be less than 10000 characters" });
  }
  if (!API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  // Rate limit check
  const rateCheck = checkRateLimit(clientIp, "tts");
  if (!rateCheck.allowed) {
    metrics.tts.errors++;
    logRequest("tts", { 
      message: "Rate limit exceeded", 
      clientIp, 
      statusCode: 429,
      latencyMs: Date.now() - startTime 
    });
    return res.status(429).json({ error: "Rate limit exceeded", remaining: 0 });
  }

  // Check cache
  const cacheHash = generateHash(text, voice, model, speed, vol, pitch, language_boost);
  const cached = getCachedAudio(cacheHash);
  
  if (cached) {
    metrics.cache.hits++;
    const latencyMs = Date.now() - startTime;
    metrics.tts.totalLatencyMs += latencyMs;
    
    logRequest("tts", { 
      message: "Cache hit", 
      cacheHash,
      latencyMs,
      statusCode: 200 
    });
    
    return res.json({
      ...cached,
      cached: true,
      latencyMs,
    });
  }
  
  metrics.cache.misses++;

  // Check voice profile first, then fall back to raw voice ID
  const profileParams = getProfileParams(voice);
  let voiceId, finalSpeed, finalPitch, finalVol;
  
  if (profileParams) {
    // Voice is a profile - use profile parameters
    voiceId = profileParams.voice_id;
    finalSpeed = profileParams.speed;
    finalPitch = profileParams.pitch;
    finalVol = profileParams.vol;
  } else {
    // Voice is a raw MiniMax voice ID
    voiceId = VOICES[voice]?.id || voice;
    finalSpeed = speed;
    finalPitch = pitch;
    finalVol = vol;
  }

  // ============================================
  // PROVIDER ROUTING: Resemble vs MiniMax/OpenAI
  // ============================================
  const ttsProvider = getTTSProvider(voice);
  
  // Handle Resemble (Dutch) TTS
  if (ttsProvider.provider === "resemble") {
    try {
      logRequest("tts", { 
        message: "Using Resemble TTS for Dutch voice", 
        voice,
        textLength: text.length
      });

      const resembleResult = await callResembleTTS(
        text, 
        ttsProvider.voiceConfig?.uuid,
        { output_format: "mp3" }
      );

      const latencyMs = Date.now() - startTime;
      const estimatedCost = 0.02; // Resemble pricing estimate

      metrics.tts.calls++;
      metrics.tts.totalChars += text.length;
      metrics.tts.totalLatencyMs += latencyMs;

      // Save to cache
      const cacheData = {
        success: true,
        provider: "resemble",
        voice: ttsProvider.voiceConfig?.name || voice,
        model: "resemble-tts",
        audio_format: resembleResult.output_format,
        audio_url: resembleResult.audio_url,
        duration: resembleResult.duration,
        estimatedCost
      };
      saveToCache(cacheHash, cacheData);

      logRequest("tts", { 
        message: "Resemble TTS success", 
        provider: "resemble",
        latencyMs,
        estimatedCost,
        statusCode: 200
      });

      return res.json({
        ...cacheData,
        latencyMs,
        timestamp: new Date().toISOString()
      });


    } catch (resembleError) {
      // Check for specific error codes
      const isPaymentError = resembleError.response?.status === 402 || resembleError.message?.includes("402") || resembleError.message?.includes("payment");
      const isTimeoutError = resembleError.response?.status === 504 || resembleError.code === "ETIMEDOUT" || resembleError.code === "ECONNABORTED" || resembleError.message?.includes("timeout");
      
      logRequest("tts", { 
        message: isPaymentError ? "Resemble payment required (402)" : isTimeoutError ? "Resemble timeout (504)" : "Resemble TTS failed", 
        error: resembleError.message,
        statusCode: resembleError.response?.status || 500
      });

      // If 402 or 504, skip retry and go directly to fallback
      if (isPaymentError || isTimeoutError) {
        logRequest("tts", { message: "Skipping retry due to 402/504, using fallback" });
      }


      // Fallback to OpenAI TTS
      try {
        logRequest("tts", { 
          message: "Using OpenAI TTS as fallback", 
          voice,
          textLength: text.length
        });

        const openaiResult = await callOpenAITTS(text, "alloy", { speed: finalSpeed });


        const latencyMs = Date.now() - startTime;
        const estimatedCost = 0.015; // OpenAI TTS pricing

        metrics.tts.calls++;
        metrics.tts.totalChars += text.length;
        metrics.tts.totalLatencyMs += latencyMs;


        const cacheData = {
          success: true,
          provider: "openai",
          voice: "alloy",
          model: "tts-1-hd",
          audio_format: openaiResult.output_format,
          audio_url: openaiResult.audio_url,
          duration: openaiResult.duration,
          estimatedCost
        };
        saveToCache(cacheHash, cacheData);


        logRequest("tts", { 
          message: "OpenAI TTS fallback success", 
          provider: "openai",
          latencyMs,
          estimatedCost,
          statusCode: 200
        });

        return res.json({
          ...cacheData,
          latencyMs,
          timestamp: new Date().toISOString()
        });

      } catch (openaiError) {
        // Both Resemble and OpenAI failed
        metrics.tts.errors++;
        logRequest("tts", { 
          message: "All TTS providers failed", 
          resembleError: resembleError.message,
          openaiError: openaiError.message,
          statusCode: 500
        });

        return res.status(500).json({ 
          error: "TTS generation failed",
          details: "Both Resemble and OpenAI TTS failed",
          errors: {
            resemble: resembleError.message,
            openai: openaiError.message
          }
        });
      }
    }
  }

  // Continue with MiniMax TTS for non-Dutch voices
  // Build request
  const payload = {
    model,
    text,
    stream: false,
    voice_setting: {
      voice_id: voiceId,
      speed: Math.max(0.5, Math.min(2.0, finalSpeed)),
      vol: Math.max(0.1, Math.min(2.0, finalVol)),
      pitch: Math.max(-12, Math.min(12, finalPitch))
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1
    },
    language_boost,
    output_format
  };

  // Retry logic
  let lastError = null;
  
  for (let attempt = 1; attempt <= CONFIG.retry.maxAttempts; attempt++) {
    try {
      logRequest("tts", { 
        message: `Attempt ${attempt}/${CONFIG.retry.maxAttempts}`, 
        model, 
        voice: voiceId, 
        textLength: text.length,
        attempt 
      });

      const response = await axios.post(
        `${API_HOST}/v1/t2a_v2`,
        payload,
        {
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 60000
        }
      );

      // Success
      if (response.data.base_resp?.status_code !== 0) {
        throw new Error(response.data.base_resp?.status_msg || "API error");
      }

      // Build result
      const latencyMs = Date.now() - startTime;
      const estimatedCost = estimateCost("tts", model, text.length);
      
      const result = {
        success: true,
        model: response.data.extra_info?.model || model,
        voice: voiceId,
        audio_format: response.data.extra_info?.audio_format || "mp3",
        audio_length: response.data.extra_info?.audio_length || 0,
        word_count: response.data.extra_info?.word_count || 0,
        usage_characters: response.data.extra_info?.usage_characters || text.length,
        trace_id: response.data.trace_id,
        latencyMs,
        estimatedCost,
        timestamp: new Date().toISOString()
      };

      if (output_format === "url") {
        result.audio_url = response.data.data?.audio;
      } else {
        result.audio_hex = response.data.data?.audio;
      }

      // Update metrics
      metrics.tts.calls++;
      metrics.tts.totalChars += text.length;
      metrics.tts.totalLatencyMs += latencyMs;

      // Cache result
      const cacheData = { ...result, cached: false };
      delete cacheData.cached;
      delete cacheData.latencyMs;
      saveToCache(cacheHash, cacheData);

      // Log success
      logRequest("tts", { 
        message: "Success", 
        model, 
        voice: voiceId, 
        textLength: text.length,
        latencyMs,
        estimatedCost,
        statusCode: 200,
        cacheHit: false
      });

      return res.json(result);

    } catch (error) {
      lastError = error;
      metrics.tts.errors++;
      
      // Check for specific error codes
      const isPaymentError = error.response?.status === 402 || error.message?.includes("402") || error.message?.includes("payment");
      const isTimeoutError = error.response?.status === 504 || error.code === "ETIMEDOUT" || error.code === "ECONNABORTED" || error.message?.includes("timeout");
      
      logRequest("tts", { 
        message: isPaymentError ? `Payment required (402) on attempt ${attempt}` : isTimeoutError ? `Gateway timeout (504) on attempt ${attempt}` : `Error on attempt ${attempt}`, 
        error: error.message,
        statusCode: error.response?.status || 500,
        attempt 
      });

      // Don't retry on final attempt OR on 402/504
      if (attempt === CONFIG.retry.maxAttempts || isPaymentError || isTimeoutError) {
        break;
      }
      
      // Wait before retry
      const delay = CONFIG.retry.delayMs * Math.pow(CONFIG.retry.backoffMultiplier, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  // All retries failed - return appropriate status code
  const latencyMs = Date.now() - startTime;
  
  // Determine error type for proper HTTP status code
  const isPaymentError = lastError?.response?.status === 402 || lastError?.message?.includes("402");
  const isTimeoutError = lastError?.response?.status === 504 || lastError?.code === "ETIMEDOUT";
  
  const statusCode = isPaymentError ? 402 : isTimeoutError ? 504 : 500;
  const errorMessage = isPaymentError ? "Payment required" : isTimeoutError ? "Gateway timeout" : "TTS generation failed after retries";
  
  logRequest("tts", { 
    message: errorMessage, 
    error: lastError?.message,
    latencyMs,
    statusCode 
  });

  return res.status(statusCode).json({ 
    error: errorMessage, 
    details: lastError?.response?.data || lastError?.message,
    retryAttempts: CONFIG.retry.maxAttempts,
    latencyMs
  });
});

/**
 * POST /api/music - Music Generation (async-friendly)
 */
app.post("/api/music", async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress || "unknown";

  const { 
    prompt,
    lyrics,
    model = "music-2.5",
    output_format = "url"
  } = req.body;

  // Validation
  if (!lyrics) {
    return res.status(400).json({ error: "Lyrics are required" });
  }
  if (lyrics.length < 1 || lyrics.length > 3500) {
    return res.status(400).json({ error: "Lyrics must be between 1 and 3500 characters" });
  }
  if (!API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  // Rate limit check
  const rateCheck = checkRateLimit(clientIp, "music");
  if (!rateCheck.allowed) {
    metrics.music.errors++;
    logRequest("music", { 
      message: "Rate limit exceeded", 
      clientIp, 
      statusCode: 429 
    });
    return res.status(429).json({ error: "Rate limit exceeded", remaining: 0 });
  }

  // Check cache
  const cacheHash = generateHash(prompt || "", lyrics, model);
  const cached = getCachedAudio(cacheHash);
  
  if (cached) {
    metrics.cache.hits++;
    const latencyMs = Date.now() - startTime;
    metrics.music.totalLatencyMs += latencyMs;
    
    logRequest("music", { 
      message: "Cache hit", 
      cacheHash,
      latencyMs,
      statusCode: 200 
    });
    
    return res.json({
      ...cached,
      cached: true,
      latencyMs,
    });
  }
  
  metrics.cache.misses++;

  const payload = {
    model,
    prompt: prompt || "",
    lyrics,
    stream: false,
    audio_setting: {
      sample_rate: 44100,
      bitrate: 256000,
      format: "mp3"
    },
    output_format
  };

  // Retry logic
  let lastError = null;
  
  for (let attempt = 1; attempt <= CONFIG.retry.maxAttempts; attempt++) {
    try {
      logRequest("music", { 
        message: `Attempt ${attempt}/${CONFIG.retry.maxAttempts}`, 
        model, 
        lyricsLength: lyrics.length,
        attempt 
      });

      const response = await axios.post(
        `${API_HOST}/v1/music_generation`,
        payload,
        {
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 180000
        }
      );

      if (response.data.base_resp?.status_code !== 0) {
        throw new Error(response.data.base_resp?.status_msg || "API error");
      }

      const latencyMs = Date.now() - startTime;
      const estimatedCost = CONFIG.costs.music[model] || 0.50;
      
      const result = {
        success: true,
        model: response.data.extra_info?.model || model,
        audio_format: "mp3",
        music_duration: response.data.extra_info?.music_duration || 0,
        music_sample_rate: response.data.extra_info?.music_sample_rate || 44100,
        trace_id: response.data.trace_id,
        latencyMs,
        estimatedCost,
        timestamp: new Date().toISOString()
      };

      if (output_format === "url") {
        result.audio_url = response.data.data?.audio;
      } else {
        result.audio_hex = response.data.data?.audio;
      }

      // Update metrics
      metrics.music.calls++;
      metrics.music.totalLatencyMs += latencyMs;

      // Cache
      const cacheData = { ...result, cached: false };
      delete cacheData.latencyMs;
      saveToCache(cacheHash, cacheData);

      logRequest("music", { 
        message: "Success", 
        model, 
        lyricsLength: lyrics.length,
        latencyMs,
        estimatedCost,
        statusCode: 200 
      });

      return res.json(result);

    } catch (error) {
      lastError = error;
      metrics.music.errors++;
      
      logRequest("music", { 
        message: `Error on attempt ${attempt}`, 
        error: error.message,
        attempt 
      });

      if (attempt === CONFIG.retry.maxAttempts) break;
      
      const delay = CONFIG.retry.delayMs * Math.pow(CONFIG.retry.backoffMultiplier, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  const latencyMs = Date.now() - startTime;
  
  logRequest("music", { 
    message: "All retries failed", 
    error: lastError?.message,
    latencyMs,
    statusCode: 500 
  });

  return res.status(500).json({ 
    error: "Music generation failed after retries", 
    details: lastError?.response?.data || lastError?.message,
    retryAttempts: CONFIG.retry.maxAttempts,
    latencyMs
  });
});

/**
 * GET /api/music/royalty-free - List royalty-free music tracks
 * 
 * Query params:
 *   provider: jamendo | pixabay (default: jamendo)
 *   mood: mood filter (e.g., upbeat, calm, epic)
 *   genre: genre filter (e.g., pop, rock, ambient)
 *   limit: number of results (default: 5, max: 20)
 */
app.get("/api/music/royalty-free", async (req, res) => {
  const { provider = "jamendo", mood, genre, limit = 5 } = req.query;
  
  const parsedLimit = Math.min(parseInt(limit) || 5, 20);
  
  try {
    if (provider === "jamendo") {
      const tracks = await listRoyaltyFreeMusic({ provider, mood, genre, limit: parsedLimit });
      return res.json({
        success: true,
        provider: "jamendo",
        count: tracks.length,
        tracks
      });
    } else {
      return res.status(400).json({ 
        error: "Provider not supported for listing",
        supported: ["jamendo"]
      });
    }
  } catch (error) {
    logRequest("music", { 
      message: "Royalty-free list failed", 
      error: error.message 
    });
    return res.status(500).json({ 
      error: "Failed to list royalty-free music", 
      details: error.message 
    });
  }
});

/**
 * POST /api/music/royalty-free - Get a royalty-free track
 * 
 * Body:
 *   provider: jamendo | pixabay | minimax (default: minimax = use external)
 *   mood: mood/genre description (e.g., "upbeat", "calm")
 *   genre: specific genre
 *   duration: preferred duration in seconds
 */
app.post("/api/music/royalty-free", async (req, res) => {
  const { provider = "minimax", mood, genre, duration } = req.body;
  
  try {
    const track = await getRoyaltyFreeMusic({ provider, mood, genre, duration });
    
    logRequest("music", { 
      message: "Royalty-free track fetched", 
      provider: track.provider,
      trackId: track.trackId
    });
    
    return res.json({
      success: true,
      ...track,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logRequest("music", { 
      message: "Royalty-free track fetch failed", 
      error: error.message 
    });
    return res.status(500).json({ 
      error: "Failed to get royalty-free track", 
      details: error.message 
    });
  }
});

/**
 * POST /api/image - FAL.ai Image Generation with style-based routing
 */
app.post("/api/image", async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress || "unknown";

  const {
    prompt,
    style = "cinematic",
    quality = "production",
    seed,
    aspect_ratio = "16:9",
    // Visual DNA from script generation
    global_visual_dna = null,
    scene_direction = null,
    // Character locking
    character_lock = null
  } = req.body;

  // Build character lock object
  const characterLockObj = character_lock ? {
    id: character_lock.id || null,
    seed: character_lock.seed || seed || Math.floor(Math.random() * 1000000),
    profile: character_lock.profile || null
  } : null;

  // Validation
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }
  if (prompt.length > 1000) {
    return res.status(400).json({ error: "Prompt must be less than 1000 characters" });
  }
  if (!FAL_API_KEY) {
    return res.status(500).json({ error: "FAL API key not configured" });
  }

  // Validate style
  const validStyles = ["cinematic", "cartoon", "anime", "documentary", "surreal", "realistic"];
  if (!validStyles.includes(style)) {
    return res.status(400).json({ 
      error: `Invalid style. Choose from: ${validStyles.join(", ")}` 
    });
  }

  // Validate quality
  const validQualities = ["production", "draft"];
  if (!validQualities.includes(quality)) {
    return res.status(400).json({ 
      error: `Invalid quality. Choose from: ${validQualities.join(", ")}` 
    });
  }

  // Build enhanced prompt using Visual DNA system
  const enhancedPrompt = buildImagePrompt(
    global_visual_dna,
    scene_direction,
    characterLockObj,
    style
  );
  
  // Select model
  const falModel = selectFalModel(style, quality);
  
  // Map aspect ratio
  const aspectMap = {
    "16:9": { width: 1280, height: 720 },
    "1:1": { width: 1024, height: 1024 },
    "9:16": { width: 720, height: 1280 }
  };
  const aspect = aspectMap[aspect_ratio] || aspectMap["16:9"];

  logRequest("image", {
    message: "Generating image",
    style,
    quality,
    falModel,
    prompt: prompt.substring(0, 50)
  });

  try {
    // Submit to FAL queue
    const submitResponse = await axios.post(
      `${FAL_API_URL}/fal-ai/${falModel}`,
      {
        prompt: enhancedPrompt,
        image_size: aspect,
        seed: seed || Math.floor(Math.random() * 1000000),
        num_images: 1
      },
      {
        headers: {
          "Authorization": `Key ${FAL_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    const requestId = submitResponse.data.request_id;
    if (!requestId) {
      throw new Error("Failed to get request ID from FAL");
    }

    // Poll for result
    const completion = await pollFalQueue(requestId);
    
    const latencyMs = Date.now() - startTime;
    const estimatedCost = CONFIG.costs.image[falModel.split("/").pop()] || 0.03;

    // Update metrics
    metrics.image.calls++;
    metrics.image.totalLatencyMs += latencyMs;

    const result = {
      success: true,
      model: falModel,
      style,
      quality,
      prompt: enhancedPrompt,
      image_url: completion?.images?.[0]?.url || completion?.image?.url,
      seed: seed || completion?.seed,
      aspect_ratio,
      estimatedCost,
      latencyMs,
      timestamp: new Date().toISOString()
    };

    logRequest("image", {
      message: "Image generated",
      style,
      falModel,
      latencyMs,
      estimatedCost,
      statusCode: 200
    });

    return res.json(result);

  } catch (error) {
    metrics.image.errors++;

    logRequest("image", {
      message: "Image generation failed",
      error: error.message,
      style,
      statusCode: 500
    });

    return res.status(500).json({
      error: "Image generation failed",
      details: error.message
    });
  }
});

/**
 * POST /api/scenes/enrich - Enrich scenes with background music
 * 
 * Body: { scenes: [], global_music: { enabled, provider, mood, genre, duration } }
 */
app.post("/api/scenes/enrich", async (req, res) => {
  const startTime = Date.now();
  const { scenes = [], global_music = null } = req.body;
  
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return res.status(400).json({ error: "Scenes must be a non-empty array" });
  }
  
  try {
    const enrichedScenes = await Promise.all(
      scenes.map(async (scene) => {
        const enrichedScene = { ...scene };
        const musicConfig = scene.bgMusic ?? global_music;
        
        if (!musicConfig || musicConfig.enabled === false) {
          enrichedScene.music = null;
          return enrichedScene;
        }
        
        try {
          const track = await getRoyaltyFreeMusic({
            provider: musicConfig.provider || "minimax",
            mood: musicConfig.mood,
            genre: musicConfig.genre,
            duration: musicConfig.duration,
            fallback: true
          });
          
          enrichedScene.music = {
            enabled: true,
            provider: track.provider,
            trackId: track.trackId,
            trackUrl: track.trackUrl,
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            license: track.license
          };
        } catch (musicError) {
          enrichedScene.music = { enabled: true, error: musicError.message };
        }
        return enrichedScene;
      })
    );
    
    const latencyMs = Date.now() - startTime;
    const musicResolved = enrichedScenes.filter(s => s.music?.trackUrl).length;
    
    return res.json({
      success: true,
      scenes: enrichedScenes,
      summary: { total: enrichedScenes.length, withMusic: musicResolved, withoutMusic: enrichedScenes.length - musicResolved },
      latencyMs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: "Scene enrichment failed", details: error.message });
  }
});

/**
 * POST /api/video - Unified Video Generation via FAL.ai
 * 
 * Body: { model, prompt, image_url, duration, aspect_ratio }
 * 
 * Supported models: kling-2.6-pro, kling-2.6-standard, kling-o1, ltx-video, minimax-video
 */
app.post("/api/video", async (req, res) => {
  const startTime = Date.now();
  const { model = "kling-2.6-pro", prompt, image_url, duration = 5, aspect_ratio = "16:9" } = req.body;
  
  if (!model || !VIDEO_MODELS[model]) {
    return res.status(400).json({ error: "Invalid model", available: Object.keys(VIDEO_MODELS) });
  }
  
  const modelConfig = VIDEO_MODELS[model];
  
  if (!FAL_API_KEY) {
    return res.status(500).json({ error: "FAL_API_KEY not configured" });
  }

  // Determine if this is image-to-video or text-to-video
  const useImageToVideo = image_url && (modelConfig.type === "i2v" || modelConfig.supports_i2v);
  
  // Validation based on model capabilities
  if (modelConfig.requires_image && !image_url) {
    return res.status(400).json({ error: "image_url required for this model" });
  }
  if (!modelConfig.requires_image && !prompt) {
    return res.status(400).json({ error: "prompt required for text-to-video" });
  }

  // FAL Queue API endpoint
  const FAL_QUEUE_URL = "https://queue.fal.run";
  const modelPath = modelConfig.fal_id;
  const fullUrl = `${FAL_QUEUE_URL}/${modelPath}`;
  
  console.log(`[VIDEO] Using model: ${model}`);
  console.log(`[VIDEO] FAL ID: ${modelPath}`);
  console.log(`[VIDEO] Full URL: ${fullUrl}`);
  console.log(`[VIDEO] FAL_KEY set: ${!!FAL_API_KEY}`);

  try {
    // Build request body based on model type
    const requestBody = useImageToVideo 
      ? { prompt: prompt || "", image_url }
      : { prompt };
    
    // Add duration if supported
    if (duration) {
      requestBody.duration = duration;
    }
    
    console.log(`[VIDEO] Request body:`, JSON.stringify(requestBody));
    
    const submitResponse = await axios.post(
      fullUrl,
      requestBody,
      {
        headers: { "Authorization": `Key ${FAL_API_KEY}` },
        timeout: 60000
      }
    ).catch(e => {
      console.log(`[VIDEO] axios error:`, e.response?.status, e.response?.data || e.message);
      throw e;
    });
    
    const requestId = submitResponse.data.request_id;
    
    // Poll for completion (video generation takes longer)
    let result;
    for (let i = 0; i < 180; i++) {  // 180 * 2s = 6 minutes max
      await new Promise(r => setTimeout(r, 2000));
      const statusResponse = await axios.get(
        `${FAL_QUEUE_URL}/${modelPath}/requests/${requestId}/status`,
        { headers: { "Authorization": `Key ${FAL_API_KEY}` } }
      );
      
      const status = statusResponse.data.status;
      if (status === "COMPLETED") {
        const resultData = statusResponse.data.response;
        // FAL video response structure varies by model - extract video URL
        const videoUrl = resultData?.video?.url || 
                        resultData?.videos?.[0]?.url || 
                        resultData?.[0]?.url ||
                        resultData?.url;
        result = { 
          success: true, 
          provider: "fal", 
          model, 
          video_url: videoUrl, 
          duration: duration, 
          request_id: requestId 
        };
        break;
      } else if (status === "FAILED") {
        throw new Error("Video generation failed: " + (statusResponse.data.error || "Unknown error"));
      }
    }
    
    if (!result) throw new Error("Video generation timeout (exceeded 6 minutes)");
    
    return res.json({ ...result, latencyMs: Date.now() - startTime, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ error: "Video generation failed", details: error.message });
  }
});

// ===========================
// ERROR HANDLING
// ===========================
app.use((err, req, res, next) => {
  console.error("[SERVER] Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal server error", 
    details: err.message 
  });
});

// ===========================
// START SERVER
// ===========================
// Vercel: export as serverless handler
// Local: listen on port
if (process.env.VERCEL === "true") {
  console.log("[VERCEL] Running as serverless function");
} else {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║         MiniMax Audio API Server - Production Grade             ║
╠═══════════════════════════════════════════════════════════════════╣
║  🚀 Server running on http://localhost:${PORT}                       ║
║                                                                   ║
║  📖 Endpoints:                                                   ║
║  • GET  /health          → Health + basic metrics                ║
║  • GET  /api/logs       → Recent request logs                   ║
║  • GET  /api/metrics     → Detailed metrics + daily costs        ║
║  • GET  /api/voices      → List available voices                ║
║  • GET  /api/models      → List available models                ║
║  • POST /api/tts         → Text-to-Speech (2.8)                ║
║  • POST /api/music       → Music Generation (2.5)               ║
║  • POST /api/script      → Script Engine (GPT)                 ║
║                                                                   ║
║  🛡️  Defensive Features:                                         ║
║  • Hash-based caching (60-80% cost savings)                     ║
║  • Rate limiting (100 TTS/min, 10 music/min)                    ║
║  • Retry logic (3 attempts with exponential backoff)            ║
║  • Full request logging                                          ║
║  • Cost estimation                                              ║
║                                                                   ║
║  💰 Cost Estimate (per 1000 chars):                               ║
║  • speech-2.8-hd: $0.08                                         ║
║  • speech-2.8-turbo: $0.04                                      ║
║  • speech-2.6-hd: $0.06                                         ║
║  • speech-2.6-turbo: $0.03                                      ║
║  • speech-02-hd: $0.05                                          ║
║  • speech-02-turbo: $0.025                                      ║
║  • music-2.5: $0.50 per generation                              ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
  });
}

export default app;
