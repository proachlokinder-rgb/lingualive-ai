/**
 * Speech Recognition and Audio utilities
 */

// Check browser Web Speech API support
export const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
};

export const isSpeechSynthesisSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

// Map ISO language code to Web Speech BCP-47 locale
export const getSpeechLocale = (langCode) => {
  const map = {
    'en': 'en-US',
    'hi': 'hi-IN',
    'doi': 'hi-IN', // Dogri Devanagari phonetic locale
    'pa': 'pa-Guru-IN',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'ja': 'ja-JP',
    'zh-cn': 'zh-CN',
    'ar': 'ar-SA',
    'ru': 'ru-RU',
    'bn': 'bn-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'mr': 'mr-IN',
    'gu': 'gu-IN',
    'ur': 'ur-PK'
  };
  return map[langCode] || langCode;
};

/**
 * Creates a SpeechRecognition instance with event callbacks
 */
export function createSpeechRecognizer({
  lang = 'en',
  continuous = true,
  interimResults = true,
  onResult,
  onError,
  onEnd
}) {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognizer = new SpeechRecognitionClass();

  recognizer.lang = getSpeechLocale(lang);
  recognizer.continuous = continuous;
  recognizer.interimResults = interimResults;
  recognizer.maxAlternatives = 1;

  recognizer.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (onResult) {
      onResult({
        finalText: finalTranscript.trim(),
        interimText: interimTranscript.trim()
      });
    }
  };

  recognizer.onerror = (event) => {
    if (onError) onError(event);
  };

  recognizer.onend = () => {
    if (onEnd) onEnd();
  };

  return recognizer;
}

/**
 * Browser Speech Synthesis fallback
 */
export function speakBrowserText(text, lang = 'en') {
  if (!isSpeechSynthesisSupported()) return Promise.resolve();

  return new Promise((resolve) => {
    window.speechSynthesis.cancel(); // Stop any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechLocale(lang);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * MediaRecorder Audio Capture helper for WAV/WebM
 */
export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
  }

  async start() {
    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
        }
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }
}
