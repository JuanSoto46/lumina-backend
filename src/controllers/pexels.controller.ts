/**
 * @fileoverview Pexels API controller for fetching videos from the Pexels platform.
 * Provides endpoints for searching videos, getting popular content, and retrieving specific videos by ID.
 * @module controllers/pexels.controller
 * @version 1.0.0
 * @requires express
 * @requires pexels
 * @requires dotenv
 */

import { Request, Response } from "express";
import { createClient } from "pexels";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

/**
 * Pexels API client instance.
 * Initialized with API key from environment variables.
 * @type {any|null} - Pexels client instance or null if not configured
 */
let client: any = null;

/**
 * OpenAI client instance for subtitle generation.
 * @type {OpenAI|null} - OpenAI client instance or null if not configured
 */
let openaiClient: OpenAI | null = null;



// Initialize Pexels client if API key is available
if (process.env.PEXELS_API_KEY) {
  client = createClient(process.env.PEXELS_API_KEY);
  console.log("✅ Pexels client initialized");
} else {
  console.warn("⚠️  PEXELS_API_KEY not configured - Pexels endpoints will return errors");
}

// Initialize OpenAI client if API key is available
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log("✅ OpenAI client initialized for subtitles");
} else {
  console.warn("⚠️  OPENAI_API_KEY not configured - OpenAI subtitles disabled");
}

if (!openaiClient) {
  console.warn("⚠️  No AI subtitle provider configured - Subtitles will be simulated");
}

/**
 * Generate automatic subtitles for a video
 * @param {string} videoId - Video ID from Pexels
 * @param {string} videoTitle - Title or description of the video
 * @param {number} duration - Duration of the video in seconds
 * @param {boolean} hasAudio - Whether the video has audio track
 * @param {string} language - Language for subtitles ('es' for Spanish, 'en' for English)
 * @returns {Promise<Object>} Generated subtitles object
 */
async function generateVideoSubtitles(videoId: string, videoTitle: string, duration: number, hasAudio: boolean = false, language: string = 'es') {
  try {
    if (!openaiClient) {
      console.log('🎭 OpenAI not configured, using simulated subtitles');
      return generateSimulatedSubtitles(videoTitle, duration, hasAudio, language);
    }

    const languageConfig = {
      es: {
        name: 'español',
        subtitleType: hasAudio ? "transcribir el audio" : "describir visualmente las escenas",
        contentGuide: hasAudio 
          ? "Simula una transcripción de audio realista" 
          : "Crea descripciones visuales descriptivas de lo que se ve en pantalla",
        systemPrompt: `Eres un experto en crear subtítulos para videos. Este video ${hasAudio ? 'TIENE audio' : 'NO TIENE audio (es silencioso)'}. Tu tarea es ${hasAudio ? "transcribir el audio" : "describir visualmente las escenas"}. ${hasAudio ? "Simula una transcripción de audio realista" : "Crea descripciones visuales descriptivas de lo que se ve en pantalla"}. Los subtítulos deben ser en español y coincidir con la duración del video.`,
        userPrompt: `Genera subtítulos en español para un video de ${duration} segundos titulado: "${videoTitle}". ${hasAudio ? 'Simula diálogos o narración apropiados.' : 'Describe visualmente lo que posiblemente se vea en cada momento.'} Crea ${Math.ceil(duration / 4)} segmentos de 3-4 segundos.`
      },
      en: {
        name: 'English',
        subtitleType: hasAudio ? "transcribe the audio" : "visually describe the scenes",
        contentGuide: hasAudio 
          ? "Simulate realistic audio transcription" 
          : "Create descriptive visual descriptions of what is seen on screen",
        systemPrompt: `You are an expert in creating video subtitles. This video ${hasAudio ? 'HAS audio' : 'HAS NO audio (it is silent)'}. Your task is to ${hasAudio ? "transcribe the audio" : "visually describe the scenes"}. ${hasAudio ? "Simulate realistic audio transcription" : "Create descriptive visual descriptions of what is seen on screen"}. The subtitles should be in English and match the video duration.`,
        userPrompt: `Generate English subtitles for a ${duration}-second video titled: "${videoTitle}". ${hasAudio ? 'Simulate appropriate dialogue or narration.' : 'Describe visually what would possibly be seen at each moment.'} Create ${Math.ceil(duration / 4)} segments of 3-4 seconds.`
      }
    };

    const config = languageConfig[language as keyof typeof languageConfig] || languageConfig.es;

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: config.systemPrompt
        },
        {
          role: "user",
          content: config.userPrompt
        }
      ],
      max_tokens: 400,
      temperature: 0.7
    });

    const segments = createSegmentsFromDuration(duration, videoTitle, hasAudio, language);
    const srtContent = convertToSRT(segments);

    return {
      srt: srtContent,
      segments: segments,
      language: language,
      duration: duration,
      hasAudio: hasAudio,
      subtitleType: hasAudio ? 'transcription' : 'visual_description',
      generated: true,
      videoId: videoId,
      aiContent: completion.choices[0]?.message?.content
    };

  } catch (error) {
    console.error('Error generating video subtitles:', error);
    return generateSimulatedSubtitles(videoTitle, duration, hasAudio, language);
  }
}

/**
 * Generate simulated subtitles based on video title and duration
 * @param {string} title - Video title
 * @param {number} duration - Video duration in seconds
 * @param {boolean} hasAudio - Whether video has audio
 * @param {string} language - Language for subtitles ('es' or 'en')
 */
function generateSimulatedSubtitles(title: string, duration: number, hasAudio: boolean = false, language: string = 'es') {
  const segmentDuration = Math.max(3, Math.floor(duration / 6)); // At least 3 seconds per segment
  const segments = [];
  
  const templates = {
    es: {
      audio: [
        "Bienvenidos a esta experiencia visual",
        "Música de fondo acompaña las imágenes",
        "Los sonidos ambientales se intensifican",
        "Una voz nos guía a través del contenido",
        "La banda sonora complementa perfectamente",
        "Efectos de sonido realzan la experiencia"
      ],
      visual: [
        "Observamos una escena cautivadora",
        "La imagen nos revela detalles únicos", 
        "Cada momento captura la esencia visual",
        "La composición visual es excepcional",
        "Los elementos se combinan armoniosamente",
        "Una perspectiva fascinante se despliega"
      ]
    },
    en: {
      audio: [
        "Welcome to this visual experience",
        "Background music accompanies the images",
        "Ambient sounds intensify",
        "A voice guides us through the content",
        "The soundtrack complements perfectly",
        "Sound effects enhance the experience"
      ],
      visual: [
        "We observe a captivating scene",
        "The image reveals unique details",
        "Each moment captures visual essence",
        "The visual composition is exceptional",
        "Elements combine harmoniously",
        "A fascinating perspective unfolds"
      ]
    }
  };

  const languageTemplates = templates[language as keyof typeof templates] || templates.es;
  const selectedTemplates = hasAudio ? languageTemplates.audio : languageTemplates.visual;
  
  let currentTime = 0;
  let templateIndex = 0;

  while (currentTime < duration && templateIndex < selectedTemplates.length) {
    const segmentEnd = Math.min(currentTime + segmentDuration, duration);
    
    const contentType = language === 'en' 
      ? (hasAudio ? 'audio' : 'visual') 
      : (hasAudio ? 'auditivo' : 'visual');
    
    segments.push({
      start: currentTime,
      end: segmentEnd,
      text: selectedTemplates[templateIndex] || `${language === 'en' ? 'Content' : 'Contenido'} ${contentType} ${language === 'en' ? 'from' : 'de'} ${title}`
    });

    currentTime = segmentEnd;
    templateIndex++;
  }

  return {
    srt: convertToSRT(segments),
    segments: segments,
    language: language,
    duration: duration,
    hasAudio: hasAudio,
    subtitleType: hasAudio ? 'transcription' : 'visual_description',
    generated: true,
    simulated: true
  };
}

/**
 * Create subtitle segments based on duration
 * @param {number} duration - Video duration in seconds
 * @param {string} title - Video title
 * @param {boolean} hasAudio - Whether video has audio
 * @param {string} language - Language for subtitles ('es' or 'en')
 */
function createSegmentsFromDuration(duration: number, title: string, hasAudio: boolean = false, language: string = 'es') {
  const numSegments = Math.min(8, Math.max(3, Math.floor(duration / 4)));
  const segmentDuration = duration / numSegments;
  const segments = [];

  const descriptions = {
    es: {
      audio: [
        "Música suave de fondo",
        "Sonidos ambientales naturales", 
        "Narración descriptiva",
        "Efectos sonoros sutiles",
        "Melodía instrumental",
        "Audio ambiente relajante"
      ],
      visual: [
        "Plano panorámico revelador",
        "Enfoque en detalles únicos",
        "Transición visual fluida", 
        "Composición artística equilibrada",
        "Juego de luces y sombras",
        "Perspectiva cinematográfica"
      ]
    },
    en: {
      audio: [
        "Soft background music",
        "Natural ambient sounds",
        "Descriptive narration",
        "Subtle sound effects",
        "Instrumental melody",
        "Relaxing ambient audio"
      ],
      visual: [
        "Revealing panoramic shot",
        "Focus on unique details",
        "Smooth visual transition",
        "Balanced artistic composition",
        "Play of light and shadows",
        "Cinematographic perspective"
      ]
    }
  };

  const languageDescriptions = descriptions[language as keyof typeof descriptions] || descriptions.es;
  const selectedDescriptions = hasAudio ? languageDescriptions.audio : languageDescriptions.visual;

  for (let i = 0; i < numSegments; i++) {
    const start = i * segmentDuration;
    const end = Math.min((i + 1) * segmentDuration, duration);
    
    const description = selectedDescriptions[i % selectedDescriptions.length];
    const truncatedTitle = title.slice(0, 30) + (title.length > 30 ? '...' : '');
    
    segments.push({
      start: Math.round(start * 100) / 100,
      end: Math.round(end * 100) / 100,
      text: hasAudio 
        ? `${description} - ${truncatedTitle}`
        : `${description}: ${truncatedTitle}`
    });
  }

  return segments;
}

/**
 * Detect if a video likely has audio based on available metadata
 * @param {any} video - Video object from Pexels API
 * @returns {boolean} Whether video likely has audio
 */
function detectVideoHasAudio(video: any): boolean {
  // Check if any video file has audio indicators
  if (video.video_files && Array.isArray(video.video_files)) {
    for (const file of video.video_files) {
      // Look for audio indicators in file type or quality
      const fileType = file.file_type?.toLowerCase() || '';
      const link = file.link?.toLowerCase() || '';
      
      // Videos with these characteristics are more likely to have audio
      if (fileType.includes('mp4') || fileType.includes('mov')) {
        // Check if it's a high quality video (more likely to have audio)
        if (file.quality === 'hd' || file.quality === 'sd') {
          // Additional heuristics based on video dimensions and file size
          const hasGoodDimensions = file.width >= 1280 && file.height >= 720;
          return hasGoodDimensions;
        }
      }
    }
  }
  
  // Check video duration - very short videos (< 5s) often don't have meaningful audio
  const duration = video.duration || 0;
  if (duration < 5) {
    return false;
  }
  
  // Check if video has tags that suggest audio content
  const tags = video.tags || [];
  const audioIndicatorTags = ['music', 'speech', 'voice', 'sound', 'audio', 'singing', 'talking'];
  const hasAudioTags = tags.some((tag: string) => 
    audioIndicatorTags.some(indicator => tag.toLowerCase().includes(indicator))
  );
  
  if (hasAudioTags) {
    return true;
  }
  
  // Default assumption: most stock videos from Pexels are silent/ambient
  // This is conservative but realistic for Pexels content
  return false;
}
function convertToSRT(segments: any[]): string {
  return segments.map((segment, index) => {
    const startTime = formatTime(segment.start);
    const endTime = formatTime(segment.end);
    
    return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
  }).join('\n');
}

/**
 * Format time to SRT format (00:00:00,000)
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Retrieves popular videos from Pexels API.
 * 
 * @async
 * @function getPopularVideos
 * @param {Request} req - Express request object with optional language query parameter
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of popular video objects or error message
 * @throws {500} Pexels API not configured or failed to fetch videos
 * @throws {200} Successfully retrieved popular videos
 * 
 * @description
 * Fetches the most popular videos from Pexels with a limit of 3 videos per page.
 * Requires PEXELS_API_KEY environment variable to be set.
 * Supports language parameter for subtitle generation (es/en).
 * 
 * @example
 * // GET /pexels/popular?language=en
 * // Response: [{ id: 1, url: "...", video_files: [...], subtitles: {...}, ... }]
 */
export const getPopularVideos = async (req: Request, res: Response) => {
  if (!client) {
    return res.status(500).json({ 
      error: "Pexels API not configured", 
      message: "PEXELS_API_KEY environment variable is required" 
    });
  }
  
  try {
    const language = (req.query.language as string) || 'es'; // Default to Spanish
    
    console.log(`=== POPULAR VIDEOS REQUEST (Language: ${language}) ===`);
    const data = await client.videos.popular({ per_page: 3 });
    if ("videos" in data) {
      // Add subtitles to each video with audio detection
      const videosWithSubtitles = await Promise.all(
        data.videos.map(async (video: any) => {
          const hasAudio = detectVideoHasAudio(video);
          const videoTitle = language === 'en' 
            ? (video.user?.name ? `Video by ${video.user.name}` : 'Popular video')
            : (video.user?.name ? `Video por ${video.user.name}` : 'Video popular');
            
          const subtitles = await generateVideoSubtitles(
            video.id.toString(),
            videoTitle,
            video.duration || 30,
            hasAudio,
            language
          );
          
          // Debug logging for subtitle generation
          console.log(`Video ${video.id}: ${language === 'en' ? 'Generating subtitles' : 'Generando subtítulos'} (${language})`);
          console.log(`- Has Audio: ${hasAudio}`);
          console.log(`- Language: ${language}`);
          console.log(`- ${language === 'en' ? 'Generated subtitles' : 'Subtítulos generados'}:`, {
            hasSegments: subtitles?.segments?.length > 0,
            segmentCount: subtitles?.segments?.length || 0,
            hasSrt: !!subtitles?.srt,
            srtLength: subtitles?.srt?.length || 0,
            language: subtitles?.language
          });
          
          const videoWithSubtitles = {
            ...video,
            subtitles: subtitles,
            hasSubtitles: true,
            hasAudio: hasAudio,
            audioStatus: hasAudio ? 'detected' : 'silent',
            subtitleLanguage: language
          };
          
          return videoWithSubtitles;
        })
      );
      
      res.json(videosWithSubtitles);
    } else {
      res.status(500).json({ error: "Failed to fetch popular videos" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch popular videos" });
  }
};

/**
 * Alternative endpoint for retrieving popular videos (Spanish naming convention).
 * 
 * @async
 * @function getPeliculas
 * @param {Request} _req - Express request object (unused)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Complete Pexels API response object with videos array or error message
 * @throws {500} Failed to fetch popular videos
 * @throws {200} Successfully retrieved popular videos with full response metadata
 * 
 * @description
 * Similar to getPopularVideos but returns the complete API response object 
 * instead of just the videos array. Fetches 3 popular videos per page.
 * Note: This function doesn't check if client is initialized (potential bug).
 * 
 * @example
 * // GET /pexels/peliculas  
 * // Response: { videos: [...], page: 1, per_page: 3, total_results: 1000, ... }
 */
export const getPeliculas = async (_req: Request, res: Response) => {
  if (!client) {
    return res.status(500).json({ 
      error: "Pexels API not configured", 
      message: "PEXELS_API_KEY environment variable is required" 
    });
  }
  
  try {
    const data = await client.videos.popular({ per_page: 3 });
    if ("videos" in data) {
      // Add subtitles to each video with audio detection
      const videosWithSubtitles = await Promise.all(
        data.videos.map(async (video: any) => {
          const hasAudio = detectVideoHasAudio(video);
          const subtitles = await generateVideoSubtitles(
            video.id.toString(),
            video.user?.name ? `Video por ${video.user.name}` : 'Película popular',
            video.duration || 30,
            hasAudio
          );
          
          return {
            ...video,
            subtitles: subtitles,
            hasSubtitles: true,
            hasAudio: hasAudio,
            audioStatus: hasAudio ? 'detected' : 'silent'
          };
        })
      );
      
      // Return the complete response with subtitle-enhanced videos
      res.json({
        ...data,
        videos: videosWithSubtitles
      });
    } else {
      res.status(500).json({ error: "Failed to fetch popular videos" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch popular videos" });
  }
};

/**
 * Searches for videos on Pexels based on query parameters.
 * 
 * @async
 * @function getVideos
 * @param {Request} req - Express request object containing search parameters
 * @param {string} [req.query.query] - Single search query string
 * @param {string} [req.query.terms] - Comma-separated search terms
 * @param {string|number} [req.query.per_page=3] - Number of videos per page (max 80)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Pexels search results with videos array or error message
 * @throws {400} Neither query nor terms parameter provided, or invalid terms format
 * @throws {500} Failed to search videos
 * @throws {200} Successfully retrieved search results
 * 
 * @description
 * Flexible video search endpoint supporting multiple search modes:
 * 1. Simple query: ?query=nature
 * 2. Multiple terms: ?terms=ocean,waves,sunset  
 * 3. Combined: ?query=nature&terms=forest,trees
 * 
 * The function combines query and terms intelligently and enforces Pexels' 80 video limit.
 * 
 * @example
 * // GET /pexels/videos?query=ocean&per_page=5
 * // GET /pexels/videos?terms=nature,forest,mountains
 * // Response: { videos: [...], page: 1, per_page: 5, ... }
 */
export const getVideos = async (req: Request, res: Response) => {
  const query = req.query.query as string;
  const terms = req.query.terms as string;
  const per_page = Number(req.query.per_page) || 3;

  if (!client) {
    return res.status(500).json({ 
      error: "Pexels API not configured", 
      message: "PEXELS_API_KEY environment variable is required" 
    });
  }

  if (!query && !terms) {
    return res.status(400).json({ 
      error: "Either 'query' or 'terms' parameter is required" 
    });
  }

  try {
    let searchQuery = "";

    if (query && terms) {
      const termsArray = terms.split(",").map(term => term.trim()).filter(Boolean);
      searchQuery = `${query} ${termsArray.join(" ")}`;
    } else if (terms) {
      const termsArray = terms.split(",").map(term => term.trim()).filter(Boolean);
      if (termsArray.length === 0) {
        return res.status(400).json({ error: "Invalid terms format" });
      }
      searchQuery = termsArray.join(" ");
    } else {
      searchQuery = query;
    }

    const data = await client.videos.search({ 
      query: searchQuery, 
      per_page: Math.min(per_page, 80)
    });
    
    if ("videos" in data) {
      // Add subtitles to each video with audio detection
      const videosWithSubtitles = await Promise.all(
        data.videos.map(async (video: any) => {
          const hasAudio = detectVideoHasAudio(video);
          const subtitles = await generateVideoSubtitles(
            video.id.toString(),
            `${searchQuery} - ${video.user?.name || 'Video'}`,
            video.duration || 30,
            hasAudio
          );
          
          return {
            ...video,
            subtitles: subtitles,
            hasSubtitles: true,
            hasAudio: hasAudio,
            audioStatus: hasAudio ? 'detected' : 'silent',
            searchQuery: searchQuery
          };
        })
      );
      
      res.json({
        ...data,
        videos: videosWithSubtitles
      });
    } else {
      res.status(500).json({ error: "Failed to search videos" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search videos" });
  }
};

/**
 * Retrieves a specific video by its ID from Pexels API.
 * 
 * @async
 * @function getVideoById
 * @param {Request} req - Express request object containing video ID parameter
 * @param {string} req.params.id - Video ID (will be converted to number)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Single video object or error message
 * @throws {400} Invalid video ID (non-numeric or falsy)
 * @throws {404} Video not found
 * @throws {500} Failed to fetch video by ID
 * @throws {200} Successfully retrieved video details
 * 
 * @description
 * Fetches detailed information about a specific video using its unique Pexels ID.
 * The ID parameter is validated and converted to a number before making the API call.
 * 
 * @example
 * // GET /videos/123456
 * // Response: { id: 123456, url: "...", video_files: [...], user: {...}, ... }
 */
export const getVideoById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid video ID" });

  if (!client) {
    return res.status(500).json({ 
      error: "Pexels API not configured", 
      message: "PEXELS_API_KEY environment variable is required" 
    });
  }

  try {
    const video = await client.videos.show({ id });
    if ("id" in video) {
      // Add subtitles to the individual video
      const hasAudio = detectVideoHasAudio(video);
      const subtitles = await generateVideoSubtitles(
        video.id.toString(),
        video.user?.name ? `Video por ${video.user.name}` : `Video ${id}`,
        video.duration || 30,
        hasAudio
      );
      
      res.json({
        ...video,
        subtitles: subtitles,
        hasSubtitles: true,
        hasAudio: hasAudio,
        audioStatus: hasAudio ? 'detected' : 'silent'
      });
    } else {
      res.status(404).json({ error: "Video not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch video by ID" });
  }
};

/**
 * Health check endpoint for Pexels API service status.
 * 
 * @async
 * @function healthCheck
 * @param {Request} _req - Express request object (unused)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Simple text response indicating service status
 * @throws {200} Service is running normally
 * 
 * @description
 * Basic health check endpoint that confirms the Pexels API endpoints are operational.
 * Returns a simple text message without performing actual API calls.
 * Useful for monitoring and load balancer health checks.
 * 
 * @example
 * // GET /pexels/health
 * // Response: "Pexels API endpoints are running"
 */
export const healthCheck = async (_req: Request, res: Response) => {
  res.send("Pexels API endpoints are running");
};

/**
 * Test endpoint to verify subtitle generation with detailed logging
 */
export const testSubtitles = async (req: Request, res: Response) => {
  try {
    const testVideo = {
      id: 'test-123',
      title: 'Video de prueba',
      duration: 15
    };
    
    const hasAudio = req.query.hasAudio === 'true';
    const language = (req.query.language as string) || 'es'; // Default to Spanish
    
    console.log('=== SUBTITLE GENERATION TEST ===');
    console.log('Test Video:', testVideo);
    console.log('Has Audio:', hasAudio);
    console.log('Language:', language);
    console.log('OpenAI Client Configured:', !!openaiClient);
    
    const subtitles = await generateVideoSubtitles(
      testVideo.id,
      testVideo.title,
      testVideo.duration,
      hasAudio,
      language
    );
    
    console.log('Generated Subtitles:', {
      hasSubtitles: !!subtitles,
      segments: subtitles?.segments?.length || 0,
      srtLength: subtitles?.srt?.length || 0,
      language: subtitles?.language,
      subtitleType: subtitles?.subtitleType
    });
    
    const response = {
      message: language === 'en' ? "Subtitles generated successfully" : "Subtítulos generados correctamente",
      testVideo: testVideo,
      subtitles: subtitles,
      hasAudio: hasAudio,
      language: language,
      hasSubtitles: !!subtitles && !!subtitles.segments && subtitles.segments.length > 0,
      openaiConfigured: !!openaiClient,
      timestamp: new Date().toISOString(),
      debug: {
        segmentCount: subtitles?.segments?.length || 0,
        srtPreview: subtitles?.srt?.substring(0, 200) || 'No SRT content'
      }
    };
    
    console.log('Response being sent:', JSON.stringify(response, null, 2));
    
    res.json(response);
  } catch (error) {
    console.error('Error in testSubtitles:', error);
    res.status(500).json({ 
      error: 'Error generating test subtitles',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Frontend-optimized endpoint for popular videos with guaranteed subtitle format
 */
export const getVideosForFrontend = async (req: Request, res: Response) => {
  if (!client) {
    return res.status(500).json({ 
      error: "Pexels API not configured", 
      message: "PEXELS_API_KEY environment variable is required" 
    });
  }
  
  try {
    const language = (req.query.language as string) || 'es'; // Default to Spanish
    
    console.log(`=== FRONTEND VIDEOS REQUEST (Language: ${language}) ===`);
    const data = await client.videos.popular({ per_page: 3 });
    
    if ("videos" in data) {
      const videosWithSubtitles = await Promise.all(
        data.videos.map(async (video: any) => {
          const hasAudio = detectVideoHasAudio(video);
          const videoTitle = language === 'en' 
            ? (video.user?.name ? `Video by ${video.user.name}` : 'Popular video')
            : (video.user?.name ? `Video por ${video.user.name}` : 'Video popular');
            
          const subtitles = await generateVideoSubtitles(
            video.id.toString(),
            videoTitle,
            video.duration || 30,
            hasAudio,
            language
          );
          
          console.log(`Video ${video.id} - Frontend Format (${language})`);
          console.log(`- Has Audio: ${hasAudio}`);
          console.log(`- Subtitles generated: ${!!subtitles}`);
          console.log(`- Segments: ${subtitles?.segments?.length || 0}`);
          console.log(`- SRT length: ${subtitles?.srt?.length || 0}`);
          
          return {
            id: video.id,
            width: video.width,
            height: video.height,
            duration: video.duration,
            image: video.image,
            video_files: video.video_files,
            user: video.user,
            url: video.url,
            // Guaranteed subtitle structure
            subtitles: {
              srt: subtitles?.srt || '',
              segments: subtitles?.segments || [],
              language: subtitles?.language || 'es',
              duration: subtitles?.duration || video.duration,
              hasAudio: hasAudio,
              subtitleType: subtitles?.subtitleType || (hasAudio ? 'transcription' : 'visual_description'),
              generated: true,
              simulated: (subtitles as any)?.simulated || false
            },
            hasSubtitles: !!(subtitles?.segments && subtitles.segments.length > 0),
            hasAudio: hasAudio,
            audioStatus: hasAudio ? 'detected' : 'silent'
          };
        })
      );
      
      console.log(`Sending ${videosWithSubtitles.length} videos with subtitles to frontend`);
      res.json(videosWithSubtitles);
    } else {
      res.status(500).json({ error: "Failed to fetch popular videos" });
    }
  } catch (err) {
    console.error('Frontend videos error:', err);
    res.status(500).json({ error: "Failed to fetch popular videos" });
  }
};
