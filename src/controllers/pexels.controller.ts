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
    console.log(`🌍 [SUBTITLE GENERATION] Video ID: ${videoId}, Language: ${language}, Has Audio: ${hasAudio}`);
    
    if (!openaiClient) {
      console.log('🎭 OpenAI not configured, using simulated subtitles');
      return generateSimulatedSubtitles(videoTitle, duration, hasAudio, language);
    }

    // Expanded language support with OpenAI's multilingual capabilities
    const languageConfig = getLanguageConfig(language, hasAudio, duration, videoTitle);
    console.log(`📝 [OPENAI CONFIG] Language: ${language}, Config Name: ${languageConfig.name}`);

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: languageConfig.systemPrompt
        },
        {
          role: "user",
          content: languageConfig.userPrompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    // Parse OpenAI response and create segments
    let segments = [];
    const aiContent = completion.choices[0]?.message?.content || '';
    
    console.log(`🤖 [OPENAI RESPONSE] Length: ${aiContent.length}, Preview: ${aiContent.substring(0, 100)}...`);
    
    if (aiContent) {
      // Try to parse the AI response into segments
      segments = parseAIResponseToSegments(aiContent, duration);
    }
    
    // Fallback to template-based segments if AI parsing fails
    if (segments.length === 0) {
      console.log('⚠️ Falling back to template-based segments');
      segments = createSegmentsFromDuration(duration, videoTitle, hasAudio, language);
    }
    
    console.log(`✅ [SEGMENTS CREATED] Count: ${segments.length}, Language: ${language}, First segment: ${segments[0]?.text || 'N/A'}`);
    
    const srtContent = convertToSRT(segments);

    return {
      srt: srtContent,
      segments: segments,
      language: language,
      languageName: languageConfig.name,
      duration: duration,
      hasAudio: hasAudio,
      subtitleType: hasAudio ? 'transcription' : 'visual_description',
      generated: true,
      videoId: videoId,
      aiContent: completion.choices[0]?.message?.content,
      provider: 'openai-gpt-3.5-turbo'
    };

  } catch (error) {
    console.error('Error generating video subtitles:', error);
    return generateSimulatedSubtitles(videoTitle, duration, hasAudio, language);
  }
}

/**
 * Get language configuration for OpenAI subtitle generation
 * Supports multiple languages with OpenAI's multilingual capabilities
 * @param {string} language - Language code (es, en, fr, de, it, pt, etc.)
 * @param {boolean} hasAudio - Whether video has audio
 * @param {number} duration - Video duration in seconds
 * @param {string} videoTitle - Video title
 * @returns {Object} Language configuration for prompts
 */
function getLanguageConfig(language: string, hasAudio: boolean, duration: number, videoTitle: string) {
  // Comprehensive language support using OpenAI's capabilities
  const languages = {
    // Spanish
    es: {
      name: 'Español',
      systemPrompt: `Eres un experto en crear subtítulos para videos en español. Este video ${hasAudio ? 'TIENE audio' : 'NO TIENE audio (es silencioso)'}. Tu tarea es ${hasAudio ? "transcribir el audio" : "describir visualmente las escenas"}. Los subtítulos deben ser en español perfecto y coincidir con la duración del video.`,
      userPrompt: `Genera subtítulos en español para un video de ${duration} segundos titulado: "${videoTitle}". ${hasAudio ? 'Simula diálogos o narración naturales en español.' : 'Describe visualmente lo que se ve en cada momento.'} Crea ${Math.ceil(duration / 4)} segmentos de 3-4 segundos cada uno.`
    },
    
    // English
    en: {
      name: 'English',
      systemPrompt: `You are an expert in creating video subtitles in English. This video ${hasAudio ? 'HAS audio' : 'HAS NO audio (it is silent)'}. Your task is to ${hasAudio ? "transcribe the audio" : "visually describe the scenes"}. The subtitles should be in perfect English and match the video duration.`,
      userPrompt: `Generate English subtitles for a ${duration}-second video titled: "${videoTitle}". ${hasAudio ? 'Simulate natural dialogue or narration in English.' : 'Describe visually what is seen at each moment.'} Create ${Math.ceil(duration / 4)} segments of 3-4 seconds each.`
    },
    
    // French
    fr: {
      name: 'Français',
      systemPrompt: `Vous êtes un expert en création de sous-titres vidéo en français. Cette vidéo ${hasAudio ? 'A de l\'audio' : 'N\'A PAS d\'audio (elle est silencieuse)'}. Votre tâche est de ${hasAudio ? "transcrire l'audio" : "décrire visuellement les scènes"}. Les sous-titres doivent être en français parfait et correspondre à la durée de la vidéo.`,
      userPrompt: `Générez des sous-titres en français pour une vidéo de ${duration} secondes intitulée: "${videoTitle}". ${hasAudio ? 'Simulez des dialogues ou une narration naturels en français.' : 'Décrivez visuellement ce qui se voit à chaque moment.'} Créez ${Math.ceil(duration / 4)} segments de 3-4 secondes chacun.`
    },
    
    // German
    de: {
      name: 'Deutsch',
      systemPrompt: `Sie sind ein Experte für die Erstellung von Video-Untertiteln auf Deutsch. Dieses Video ${hasAudio ? 'HAT Audio' : 'HAT KEIN Audio (es ist stumm)'}. Ihre Aufgabe ist es, ${hasAudio ? "das Audio zu transkribieren" : "die Szenen visuell zu beschreiben"}. Die Untertitel sollten in perfektem Deutsch sein und der Videodauer entsprechen.`,
      userPrompt: `Erstellen Sie deutsche Untertitel für ein ${duration}-Sekunden-Video mit dem Titel: "${videoTitle}". ${hasAudio ? 'Simulieren Sie natürliche Dialoge oder Erzählungen auf Deutsch.' : 'Beschreiben Sie visuell, was in jedem Moment zu sehen ist.'} Erstellen Sie ${Math.ceil(duration / 4)} Segmente von jeweils 3-4 Sekunden.`
    },
    
    // Italian
    it: {
      name: 'Italiano',
      systemPrompt: `Sei un esperto nella creazione di sottotitoli video in italiano. Questo video ${hasAudio ? 'HA audio' : 'NON HA audio (è silenzioso)'}. Il tuo compito è ${hasAudio ? "trascrivere l'audio" : "descrivere visivamente le scene"}. I sottotitoli devono essere in italiano perfetto e corrispondere alla durata del video.`,
      userPrompt: `Genera sottotitoli in italiano per un video di ${duration} secondi intitolato: "${videoTitle}". ${hasAudio ? 'Simula dialoghi o narrazioni naturali in italiano.' : 'Descrivi visivamente ciò che si vede in ogni momento.'} Crea ${Math.ceil(duration / 4)} segmenti di 3-4 secondi ciascuno.`
    },
    
    // Portuguese
    pt: {
      name: 'Português',
      systemPrompt: `Você é um especialista em criar legendas de vídeo em português. Este vídeo ${hasAudio ? 'TEM áudio' : 'NÃO TEM áudio (é silencioso)'}. Sua tarefa é ${hasAudio ? "transcrever o áudio" : "descrever visualmente as cenas"}. As legendas devem estar em português perfeito e corresponder à duração do vídeo.`,
      userPrompt: `Gere legendas em português para um vídeo de ${duration} segundos intitulado: "${videoTitle}". ${hasAudio ? 'Simule diálogos ou narrações naturais em português.' : 'Descreva visualmente o que é visto em cada momento.'} Crie ${Math.ceil(duration / 4)} segmentos de 3-4 segundos cada.`
    },
    
    // Japanese
    ja: {
      name: '日本語',
      systemPrompt: `あなたは日本語での動画字幕作成の専門家です。この動画は${hasAudio ? '音声があります' : '音声がありません（無音です）'}。あなたの仕事は${hasAudio ? "音声を文字起こしすること" : "シーンを視覚的に説明すること"}です。字幕は完璧な日本語で、動画の長さに合わせる必要があります。`,
      userPrompt: `"${videoTitle}"というタイトルの${duration}秒の動画の日本語字幕を生成してください。${hasAudio ? '日本語で自然な対話やナレーションをシミュレートしてください。' : '各瞬間に見えるものを視覚的に説明してください。'} ${Math.ceil(duration / 4)}個の3-4秒のセグメントを作成してください。`
    },
    
    // Korean
    ko: {
      name: '한국어',
      systemPrompt: `당신은 한국어 비디오 자막 제작 전문가입니다. 이 비디오는 ${hasAudio ? '오디오가 있습니다' : '오디오가 없습니다 (무음입니다)'}. 당신의 임무는 ${hasAudio ? "오디오를 전사하는 것" : "장면을 시각적으로 설명하는 것"}입니다. 자막은 완벽한 한국어로 작성되어야 하며 비디오 길이와 일치해야 합니다.`,
      userPrompt: `"${videoTitle}"이라는 제목의 ${duration}초 비디오에 대한 한국어 자막을 생성하세요. ${hasAudio ? '한국어로 자연스러운 대화나 내레이션을 시뮬레이션하세요.' : '각 순간에 보이는 것을 시각적으로 설명하세요.'} ${Math.ceil(duration / 4)}개의 3-4초 세그먼트를 만드세요.`
    },
    
    // Chinese (Simplified)
    zh: {
      name: '中文',
      systemPrompt: `您是视频字幕制作的专家。这个视频${hasAudio ? '有音频' : '没有音频（是静音的）'}。您的任务是${hasAudio ? "转录音频" : "视觉描述场景"}。字幕应该是完美的中文，并与视频长度匹配。`,
      userPrompt: `为标题为"${videoTitle}"的${duration}秒视频生成中文字幕。${hasAudio ? '模拟自然的中文对话或旁白。' : '视觉描述每个时刻看到的内容。'} 创建${Math.ceil(duration / 4)}个3-4秒的片段。`
    },
    
    // Russian
    ru: {
      name: 'Русский',
      systemPrompt: `Вы эксперт по созданию субтитров для видео на русском языке. Это видео ${hasAudio ? 'ИМЕЕТ аудио' : 'НЕ ИМЕЕТ аудио (оно беззвучное)'}. Ваша задача ${hasAudio ? "транскрибировать аудио" : "визуально описывать сцены"}. Субтитры должны быть на идеальном русском языке и соответствовать продолжительности видео.`,
      userPrompt: `Создайте русские субтитры для ${duration}-секундного видео под названием: "${videoTitle}". ${hasAudio ? 'Имитируйте естественные диалоги или повествование на русском языке.' : 'Визуально описывайте то, что видно в каждый момент.'} Создайте ${Math.ceil(duration / 4)} сегментов по 3-4 секунды каждый.`
    },
    
    // Arabic
    ar: {
      name: 'العربية',
      systemPrompt: `أنت خبير في إنشاء ترجمات الفيديو باللغة العربية. هذا الفيديو ${hasAudio ? 'يحتوي على صوت' : 'لا يحتوي على صوت (صامت)'}. مهمتك هي ${hasAudio ? "نسخ الصوت" : "وصف المشاهد بصرياً"}. يجب أن تكون الترجمات باللغة العربية المثالية وتتطابق مع مدة الفيديو.`,
      userPrompt: `أنشئ ترجمات عربية لفيديو مدته ${duration} ثانية بعنوان: "${videoTitle}". ${hasAudio ? 'قم بمحاكاة حوارات أو سرد طبيعي باللغة العربية.' : 'صف بصرياً ما يُرى في كل لحظة.'} أنشئ ${Math.ceil(duration / 4)} مقطعاً من 3-4 ثوانٍ لكل منها.`
    }
  };

  // Return the language config, defaulting to Spanish if language not found
  return languages[language as keyof typeof languages] || languages.es;
}

/**
 * Generate simulated subtitles based on video title and duration
 * @param {string} title - Video title
 * @param {number} duration - Video duration in seconds
 * @param {boolean} hasAudio - Whether video has audio
 * @param {string} language - Language for subtitles (supports multiple languages)
 */
function generateSimulatedSubtitles(title: string, duration: number, hasAudio: boolean = false, language: string = 'es') {
  const segmentDuration = Math.max(3, Math.floor(duration / 6)); // At least 3 seconds per segment
  const segments = [];
  
  const templates = {
    es: {
      audio: ["Bienvenidos a esta experiencia visual", "Música de fondo acompaña las imágenes", "Los sonidos ambientales se intensifican", "Una voz nos guía a través del contenido", "La banda sonora complementa perfectamente", "Efectos de sonido realzan la experiencia"],
      visual: ["Observamos una escena cautivadora", "La imagen nos revela detalles únicos", "Cada momento captura la esencia visual", "La composición visual es excepcional", "Los elementos se combinan armoniosamente", "Una perspectiva fascinante se despliega"]
    },
    en: {
      audio: ["Welcome to this visual experience", "Background music accompanies the images", "Ambient sounds intensify", "A voice guides us through the content", "The soundtrack complements perfectly", "Sound effects enhance the experience"],
      visual: ["We observe a captivating scene", "The image reveals unique details", "Each moment captures visual essence", "The visual composition is exceptional", "Elements combine harmoniously", "A fascinating perspective unfolds"]
    },
    fr: {
      audio: ["Bienvenue dans cette expérience visuelle", "La musique de fond accompagne les images", "Les sons ambiants s'intensifient", "Une voix nous guide à travers le contenu", "La bande sonore complète parfaitement", "Les effets sonores améliorent l'expérience"],
      visual: ["Nous observons une scène captivante", "L'image révèle des détails uniques", "Chaque moment capture l'essence visuelle", "La composition visuelle est exceptionnelle", "Les éléments se combinent harmonieusement", "Une perspective fascinante se déploie"]
    },
    de: {
      audio: ["Willkommen zu diesem visuellen Erlebnis", "Hintergrundmusik begleitet die Bilder", "Umgebungsgeräusche verstärken sich", "Eine Stimme führt uns durch den Inhalt", "Der Soundtrack ergänzt perfekt", "Soundeffekte verbessern das Erlebnis"],
      visual: ["Wir beobachten eine fesselnde Szene", "Das Bild enthüllt einzigartige Details", "Jeder Moment erfasst die visuelle Essenz", "Die visuelle Komposition ist außergewöhnlich", "Elemente verbinden sich harmonisch", "Eine faszinierende Perspektive entfaltet sich"]
    },
    it: {
      audio: ["Benvenuti in questa esperienza visiva", "La musica di sottofondo accompagna le immagini", "I suoni ambientali si intensificano", "Una voce ci guida attraverso il contenuto", "La colonna sonora completa perfettamente", "Gli effetti sonori migliorano l'esperienza"],
      visual: ["Osserviamo una scena accattivante", "L'immagine rivela dettagli unici", "Ogni momento cattura l'essenza visiva", "La composizione visiva è eccezionale", "Gli elementi si combinano armoniosamente", "Una prospettiva affascinante si sviluppa"]
    },
    pt: {
      audio: ["Bem-vindos a esta experiência visual", "Música de fundo acompanha as imagens", "Os sons ambientais se intensificam", "Uma voz nos guia através do conteúdo", "A trilha sonora complementa perfeitamente", "Efeitos sonoros realçam a experiência"],
      visual: ["Observamos uma cena cativante", "A imagem nos revela detalhes únicos", "Cada momento captura a essência visual", "A composição visual é excepcional", "Os elementos se combinam harmoniosamente", "Uma perspectiva fascinante se desenrola"]
    },
    ja: {
      audio: ["この視覚的な体験へようこそ", "背景音楽が映像に寄り添います", "環境音が強まります", "声が私たちをコンテンツに導きます", "サウンドトラックが完璧に補完します", "音響効果が体験を高めます"],
      visual: ["魅力的なシーンを観察します", "映像がユニークな詳細を明かします", "各瞬間が視覚的本質を捉えます", "視覚構成は例外的です", "要素が調和よく組み合わさります", "魅力的な視点が展開されます"]
    },
    ko: {
      audio: ["이 시각적 경험에 오신 것을 환영합니다", "배경 음악이 이미지에 동반됩니다", "주변 소리가 강화됩니다", "목소리가 콘텐츠를 통해 우리를 안내합니다", "사운드트랙이 완벽하게 보완합니다", "음향 효과가 경험을 향상시킵니다"],
      visual: ["매혹적인 장면을 관찰합니다", "이미지가 독특한 세부사항을 드러냅니다", "각 순간이 시각적 본질을 포착합니다", "시각적 구성이 예외적입니다", "요소들이 조화롭게 결합됩니다", "매혹적인 관점이 펼쳐집니다"]
    },
    zh: {
      audio: ["欢迎来到这个视觉体验", "背景音乐伴随着图像", "环境声音增强", "声音引导我们浏览内容", "配乐完美地补充", "音效增强体验"],
      visual: ["我们观察到一个迷人的场景", "图像显示独特的细节", "每一刻都捕捉视觉精髓", "视觉构图是例外的", "元素和谐地结合", "迷人的视角展开"]
    },
    ru: {
      audio: ["Добро пожаловать в этот визуальный опыт", "Фоновая музыка сопровождает изображения", "Окружающие звуки усиливаются", "Голос ведет нас через контент", "Саундтрек идеально дополняет", "Звуковые эффекты улучшают опыт"],
      visual: ["Мы наблюдаем захватывающую сцену", "Изображение раскрывает уникальные детали", "Каждый момент захватывает визуальную суть", "Визуальная композиция исключительна", "Элементы гармонично сочетаются", "Захватывающая перспектива разворачивается"]
    },
    ar: {
      audio: ["مرحباً بكم في هذه التجربة البصرية", "الموسيقى الخلفية تصاحب الصور", "الأصوات المحيطة تتكثف", "صوت يرشدنا عبر المحتوى", "الموسيقى التصويرية تكمل بشكل مثالي", "المؤثرات الصوتية تعزز التجربة"],
      visual: ["نلاحظ مشهداً آسراً", "الصورة تكشف تفاصيل فريدة", "كل لحظة تلتقط الجوهر البصري", "التركيب البصري استثنائي", "العناصر تتحد بانسجام", "منظور رائع ينكشف"]
    }
  };

  const languageTemplates = templates[language as keyof typeof templates] || templates.es;
  const selectedTemplates = hasAudio ? languageTemplates.audio : languageTemplates.visual;
  
  let currentTime = 0;
  let templateIndex = 0;

  while (currentTime < duration && templateIndex < selectedTemplates.length) {
    const segmentEnd = Math.min(currentTime + segmentDuration, duration);
    
    const contentTypeMap = {
      es: { audio: 'auditivo', visual: 'visual', content: 'Contenido', from: 'de' },
      en: { audio: 'audio', visual: 'visual', content: 'Content', from: 'from' },
      fr: { audio: 'audio', visual: 'visuel', content: 'Contenu', from: 'de' },
      de: { audio: 'Audio', visual: 'visuell', content: 'Inhalt', from: 'von' },
      it: { audio: 'audio', visual: 'visivo', content: 'Contenuto', from: 'da' },
      pt: { audio: 'áudio', visual: 'visual', content: 'Conteúdo', from: 'de' },
      ja: { audio: 'オーディオ', visual: 'ビジュアル', content: 'コンテンツ', from: 'から' },
      ko: { audio: '오디오', visual: '시각적', content: '콘텐츠', from: '에서' },
      zh: { audio: '音频', visual: '视觉', content: '内容', from: '来自' },
      ru: { audio: 'аудио', visual: 'визуальный', content: 'Контент', from: 'из' },
      ar: { audio: 'صوتي', visual: 'بصري', content: 'محتوى', from: 'من' }
    };
    
    const langMap = contentTypeMap[language as keyof typeof contentTypeMap] || contentTypeMap.es;
    const contentType = hasAudio ? langMap.audio : langMap.visual;
    
    segments.push({
      start: currentTime,
      end: segmentEnd,
      text: selectedTemplates[templateIndex] || `${langMap.content} ${contentType} ${langMap.from} ${title}`
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
 * @param {string} language - Language for subtitles (supports multiple languages)
 */
function createSegmentsFromDuration(duration: number, title: string, hasAudio: boolean = false, language: string = 'es') {
  const numSegments = Math.min(8, Math.max(3, Math.floor(duration / 4)));
  const segmentDuration = duration / numSegments;
  const segments = [];

  const descriptions = {
    es: {
      audio: ["Música suave de fondo", "Sonidos ambientales naturales", "Narración descriptiva", "Efectos sonoros sutiles", "Melodía instrumental", "Audio ambiente relajante"],
      visual: ["Plano panorámico revelador", "Enfoque en detalles únicos", "Transición visual fluida", "Composición artística equilibrada", "Juego de luces y sombras", "Perspectiva cinematográfica"]
    },
    en: {
      audio: ["Soft background music", "Natural ambient sounds", "Descriptive narration", "Subtle sound effects", "Instrumental melody", "Relaxing ambient audio"],
      visual: ["Revealing panoramic shot", "Focus on unique details", "Smooth visual transition", "Balanced artistic composition", "Play of light and shadows", "Cinematographic perspective"]
    },
    fr: {
      audio: ["Musique douce en arrière-plan", "Sons ambiants naturels", "Narration descriptive", "Effets sonores subtils", "Mélodie instrumentale", "Audio ambiant relaxant"],
      visual: ["Plan panoramique révélateur", "Focus sur des détails uniques", "Transition visuelle fluide", "Composition artistique équilibrée", "Jeu de lumières et d'ombres", "Perspective cinématographique"]
    },
    de: {
      audio: ["Sanfte Hintergrundmusik", "Natürliche Umgebungsgeräusche", "Beschreibende Erzählung", "Subtile Soundeffekte", "Instrumentale Melodie", "Entspannende Umgebungsaudio"],
      visual: ["Enthüllender Panorama-Shot", "Fokus auf einzigartige Details", "Fließender visueller Übergang", "Ausgewogene künstlerische Komposition", "Spiel von Licht und Schatten", "Kinematographische Perspektive"]
    },
    it: {
      audio: ["Musica di sottofondo delicata", "Suoni ambientali naturali", "Narrazione descrittiva", "Effetti sonori sottili", "Melodia strumentale", "Audio ambientale rilassante"],
      visual: ["Inquadratura panoramica rivelatrice", "Focus su dettagli unici", "Transizione visiva fluida", "Composizione artistica equilibrata", "Gioco di luci e ombre", "Prospettiva cinematografica"]
    },
    pt: {
      audio: ["Música suave de fundo", "Sons ambientais naturais", "Narração descritiva", "Efeitos sonoros sutis", "Melodia instrumental", "Áudio ambiente relaxante"],
      visual: ["Plano panorâmico revelador", "Foco em detalhes únicos", "Transição visual fluida", "Composição artística equilibrada", "Jogo de luzes e sombras", "Perspectiva cinematográfica"]
    },
    ja: {
      audio: ["やわらかな背景音楽", "自然な環境音", "説明的なナレーション", "微細な効果音", "器楽メロディー", "リラックスできる環境音"],
      visual: ["印象的なパノラマショット", "ユニークな詳細に焦点", "滑らかな視覚的移行", "バランスの取れた芸術的構成", "光と影の演出", "映画的な視点"]
    },
    ko: {
      audio: ["부드러운 배경 음악", "자연스러운 환경 소리", "설명적인 내레이션", "미묘한 음향 효과", "기악 멜로디", "편안한 앰비언트 오디오"],
      visual: ["인상적인 파노라마 샷", "독특한 세부사항에 집중", "부드러운 시각적 전환", "균형 잡힌 예술적 구성", "빛과 그림자의 연출", "영화적 관점"]
    },
    zh: {
      audio: ["柔和的背景音乐", "自然环境声音", "描述性旁白", "微妙的音效", "器乐旋律", "轻松的环境音频"],
      visual: ["揭示性全景镜头", "聚焦独特细节", "流畅的视觉过渡", "平衡的艺术构图", "光影效果", "电影化视角"]
    },
    ru: {
      audio: ["Мягкая фоновая музыка", "Естественные окружающие звуки", "Описательное повествование", "Тонкие звуковые эффекты", "Инструментальная мелодия", "Расслабляющий окружающий звук"],
      visual: ["Раскрывающий панорамный кадр", "Фокус на уникальных деталях", "Плавный визуальный переход", "Сбалансированная художественная композиция", "Игра света и тени", "Кинематографическая перспектива"]
    },
    ar: {
      audio: ["موسيقى خلفية ناعمة", "أصوات بيئية طبيعية", "سرد وصفي", "مؤثرات صوتية خفيفة", "لحن آلات موسيقية", "صوت محيط مريح"],
      visual: ["لقطة بانورامية مكشوفة", "تركيز على تفاصيل فريدة", "انتقال بصري سلس", "تركيب فني متوازن", "لعب الضوء والظلال", "منظور سينمائي"]
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
 * Parse OpenAI response into subtitle segments
 * @param {string} aiContent - Raw content from OpenAI
 * @param {number} duration - Video duration in seconds
 * @returns {Array} Array of subtitle segments
 */
function parseAIResponseToSegments(aiContent: string, duration: number): any[] {
  const segments = [];
  
  try {
    // Split the AI response into meaningful chunks
    const lines = aiContent.split('\n').filter(line => line.trim().length > 0);
    const numSegments = Math.min(8, Math.max(3, Math.floor(duration / 4)));
    const segmentDuration = duration / numSegments;
    
    // Process each line as a potential subtitle
    for (let i = 0; i < numSegments && i < lines.length; i++) {
      const start = i * segmentDuration;
      const end = Math.min((i + 1) * segmentDuration, duration);
      
      let text = lines[i].trim();
      
      // Clean up common AI response artifacts
      text = text.replace(/^\d+\.\s*/, ''); // Remove numbered list markers
      text = text.replace(/^-\s*/, ''); // Remove dash markers
      text = text.replace(/^\*\s*/, ''); // Remove asterisk markers
      
      if (text.length > 0) {
        segments.push({
          start: Math.round(start * 100) / 100,
          end: Math.round(end * 100) / 100,
          text: text.substring(0, 100) // Limit length for readability
        });
      }
    }
    
    // If we don't have enough segments, pad with simple content
    while (segments.length < numSegments) {
      const segmentIndex: number = segments.length;
      const start: number = segmentIndex * segmentDuration;
      const end: number = Math.min((start + segmentDuration), duration);
      
      segments.push({
        start: Math.round(start * 100) / 100,
        end: Math.round(end * 100) / 100,
        text: '...'
      });
    }
    
    console.log(`✅ Parsed ${segments.length} segments from AI response`);
    return segments;
    
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return [];
  }
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
 * Convert SRT subtitle format to WebVTT format for HTML5 video compatibility
 * @param {string} srtContent - SRT formatted subtitle content
 * @returns {string} WebVTT formatted subtitle content
 */
function convertSRTtoWebVTT(srtContent: string): string {
  if (!srtContent) return '';
  
  // Start with WebVTT header
  let vttContent = 'WEBVTT\n\n';
  
  // Convert SRT timestamps to WebVTT format (replace comma with dot)
  const vttBody = srtContent.replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4');
  
  vttContent += vttBody;
  
  return vttContent;
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
    
    console.log(`🎬 [GET POPULAR VIDEOS] Language requested: ${language}`);
    console.log(`🎬 [GET POPULAR VIDEOS] Query params:`, req.query);
    
    const data = await client.videos.popular({ per_page: 3 });
    if ("videos" in data) {
      // Add subtitles to each video with audio detection
      const videosWithSubtitles = await Promise.all(
        data.videos.map(async (video: any) => {
          const hasAudio = detectVideoHasAudio(video);
          const videoTitle = language === 'en' 
            ? (video.user?.name ? `Video by ${video.user.name}` : 'Popular video')
            : (video.user?.name ? `Video por ${video.user.name}` : 'Video popular');
            
          console.log(`📹 [VIDEO ${video.id}] Processing with language: ${language}`);
          
          const subtitles = await generateVideoSubtitles(
            video.id.toString(),
            videoTitle,
            video.duration || 30,
            hasAudio,
            language
          );
          
          // Debug logging for subtitle generation
          console.log(`🎯 [VIDEO ${video.id} RESULT] Language: ${language}, Subtitle Language: ${subtitles?.language}`);
          console.log(`🎯 [VIDEO ${video.id} RESULT] Has Segments: ${subtitles?.segments?.length > 0}, Count: ${subtitles?.segments?.length}`);
          console.log(`🎯 [VIDEO ${video.id} RESULT] First subtitle: ${subtitles?.segments?.[0]?.text || 'N/A'}`);
          
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
      
      console.log(`🚀 [RESPONSE] Sending ${videosWithSubtitles.length} videos with ${language} subtitles`);
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
 * Get subtitles for a specific video in WebVTT format
 */
export const getVideoSubtitles = async (req: Request, res: Response) => {
  try {
    const videoId = req.params.videoId;
    const language = (req.query.language as string) || 'es';
    const hasAudio = req.query.hasAudio === 'true';
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    console.log(`🎬 [GET SUBTITLES] Video: ${videoId}, Language: ${language}, Has Audio: ${hasAudio}`);
    
    // Generate subtitles for the specific video
    const subtitles = await generateVideoSubtitles(
      videoId,
      `Video ${videoId}`,
      30, // Default duration, could be passed as parameter
      hasAudio,
      language
    );
    
    if (!subtitles || !subtitles.srt) {
      return res.status(404).json({ error: 'Subtitles not found' });
    }
    
    // Convert SRT to WebVTT for better browser compatibility
    const webVTTContent = convertSRTtoWebVTT(subtitles.srt);
    
    // Set appropriate headers for WebVTT content
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="subtitles_${videoId}_${language}.vtt"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    console.log(`✅ [SUBTITLES SERVED] Video: ${videoId}, Language: ${language}, Size: ${webVTTContent.length} chars`);
    
    res.send(webVTTContent);
    
  } catch (error) {
    console.error('Error serving video subtitles:', error);
    res.status(500).json({ 
      error: 'Failed to generate subtitles',
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
