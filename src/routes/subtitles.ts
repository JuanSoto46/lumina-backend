import { Router } from 'express';
import { 
  generateSubtitles, 
  generateSubtitlesFromURL, 
  getSubtitles,
  upload 
} from '../controllers/subtitles.controller.js';

const router = Router();

/**
 * POST /generate
 * 
 * Genera subtítulos desde un archivo de audio subido
 * Requiere: archivo de audio (mp3, wav, m4a, etc.)
 */
router.post('/generate', upload.single('audio'), generateSubtitles);

/**
 * POST /generate-from-url
 * 
 * Genera subtítulos desde una URL de video
 * Body: { videoUrl: string, language?: string }
 */
router.post('/generate-from-url', generateSubtitlesFromURL);

/**
 * GET /:videoId
 * 
 * Obtiene subtítulos existentes para un video específico
 */
router.get('/:videoId', getSubtitles);

/**
 * GET /info/audio-detection
 * 
 * Información sobre la detección de audio en videos
 */
router.get('/info/audio-detection', (req, res) => {
  res.json({
    message: "Sistema de detección de audio activado",
    features: {
      audioDetection: "Detecta automáticamente si videos tienen audio",
      visualSubtitles: "Genera descripciones visuales para videos silenciosos", 
      audioSubtitles: "Simula transcripciones para videos con audio",
      realTimeGeneration: "Subtítulos generados con IA en tiempo real"
    },
    supportedFormats: ["mp4", "mov", "avi", "webm"],
    maxFileSize: "25MB",
    languages: ["es", "en"]
  });
});

export default router;