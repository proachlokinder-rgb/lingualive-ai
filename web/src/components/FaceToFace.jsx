import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Volume2, RotateCcw, ArrowUpDown, Sparkles, Check, 
  Send, Zap, RefreshCw, Radio, Play, Pause, Layers
} from 'lucide-react';
import { translateText, synthesizeSpeech, playBase64Audio } from '../services/api';
import { createSpeechRecognizer, isSpeechRecognitionSupported, speakBrowserText } from '../services/speech';

export default function FaceToFace({ languages = [] }) {
  const [langA, setLangA] = useState('en'); // Person A language
  const [langB, setLangB] = useState('doi'); // Person B language (Default to Dogri as requested!)

  const [activeSpeaker, setActiveSpeaker] = useState(null); // 'A', 'B', or null
  const [textA, setTextA] = useState('Hello! How are you doing today?');
  const [translatedForB, setTranslatedForB] = useState('नमस्ते! अज तुस केह् हाल-चाल ऐ?');

  const [textB, setTextB] = useState('आऊं ठीक आं, धन्यवाद! तुस इत्थे कदूं आए?');
  const [translatedForA, setTranslatedForA] = useState('I am fine, thank you! When did you arrive here?');

  const [manualInputA, setManualInputA] = useState('');
  const [manualInputB, setManualInputB] = useState('');

  const [isTranslating, setIsTranslating] = useState(false);
  const [invertTop, setInvertTop] = useState(true); // 180 flip for top person facing across table
  const [autoTurnTaking, setAutoTurnTaking] = useState(true); // Ping-pong auto mic switch
  const [lastLatency, setLastLatency] = useState(195);
  const [turnNotice, setTurnNotice] = useState(null);

  const recognizerRef = useRef(null);
  const autoTurnTimerRef = useRef(null);
  const isComponentMounted = useRef(true);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      stopListening();
      if (autoTurnTimerRef.current) clearTimeout(autoTurnTimerRef.current);
    };
  }, []);

  const startListening = (speaker) => {
    if (autoTurnTimerRef.current) {
      clearTimeout(autoTurnTimerRef.current);
      autoTurnTimerRef.current = null;
    }

    if (!isSpeechRecognitionSupported()) {
      setTurnNotice('Speech recognition not supported in browser. Use quick text inputs below.');
      return;
    }

    if (recognizerRef.current) {
      try { recognizerRef.current.abort(); } catch (e) {}
    }

    const currentLang = speaker === 'A' ? langA : langB;
    const targetLang = speaker === 'A' ? langB : langA;

    setActiveSpeaker(speaker);
    setTurnNotice(`Listening to Person ${speaker} (${languages.find(l => l.code === currentLang)?.name || currentLang})...`);

    const recognizer = createSpeechRecognizer({
      lang: currentLang,
      continuous: false,
      interimResults: true,
      onResult: async ({ finalText, interimText }) => {
        if (speaker === 'A') {
          setTextA(finalText || interimText);
        } else {
          setTextB(finalText || interimText);
        }

        if (finalText && finalText.trim()) {
          stopListening();
          await handleTranslation(finalText.trim(), speaker, currentLang, targetLang);
        }
      },
      onError: (err) => {
        console.warn('Speech error:', err);
        setActiveSpeaker(null);
        setTurnNotice(null);
      },
      onEnd: () => {
        setActiveSpeaker(null);
      }
    });

    recognizerRef.current = recognizer;
    try {
      recognizer.start();
    } catch (e) {
      console.warn('Speech start error:', e);
      setActiveSpeaker(null);
      setTurnNotice(null);
    }
  };

  const stopListening = () => {
    if (recognizerRef.current) {
      try { recognizerRef.current.stop(); } catch (e) {}
      recognizerRef.current = null;
    }
    setActiveSpeaker(null);
  };

  const handleTranslation = async (text, speaker, fromLang, toLang) => {
    setIsTranslating(true);
    setTurnNotice(`Translating for Person ${speaker === 'A' ? 'B' : 'A'}...`);

    try {
      const res = await translateText({
        text,
        sourceLang: fromLang,
        targetLang: toLang
      });

      if (res.latency_ms) {
        setLastLatency(Math.round(res.latency_ms));
      }

      const translated = res.translated_text;

      if (speaker === 'A') {
        setTranslatedForB(translated);
        setTurnNotice(`Speaking translation to Person B...`);
        await playSpeech(translated, toLang);
        
        // After model finishes speaking, auto-turn on Person B's mic!
        if (autoTurnTaking && isComponentMounted.current) {
          setTurnNotice(`Person A finished. Opening Person B's microphone automatically...`);
          autoTurnTimerRef.current = setTimeout(() => {
            if (isComponentMounted.current) {
              startListening('B');
            }
          }, 600);
        } else {
          setTurnNotice(null);
        }
      } else {
        setTranslatedForA(translated);
        setTurnNotice(`Speaking translation to Person A...`);
        await playSpeech(translated, toLang);

        // After model finishes speaking, auto-turn on Person A's mic!
        if (autoTurnTaking && isComponentMounted.current) {
          setTurnNotice(`Person B finished. Opening Person A's microphone automatically...`);
          autoTurnTimerRef.current = setTimeout(() => {
            if (isComponentMounted.current) {
              startListening('A');
            }
          }, 600);
        } else {
          setTurnNotice(null);
        }
      }
    } catch (err) {
      console.error('Translation error:', err);
      setTurnNotice('Translation failed, please retry');
    } finally {
      setIsTranslating(false);
    }
  };

  const playSpeech = async (text, lang) => {
    if (!text) return Promise.resolve();
    try {
      const tts = await synthesizeSpeech({ text, lang });
      if (tts.audio_base64) {
        await playBase64Audio(tts.audio_base64);
        return;
      }
    } catch (e) {
      console.warn('Backend TTS failed, using browser speech:', e);
    }
    return speakBrowserText(text, lang);
  };

  const swapLanguages = () => {
    const tempLang = langA;
    setLangA(langB);
    setLangB(tempLang);

    const tempText = textA;
    setTextA(textB);
    setTextB(tempText);

    const tempTrans = translatedForA;
    setTranslatedForA(translatedForB);
    setTranslatedForB(tempTrans);
  };

  const handleManualSubmitA = (e) => {
    e.preventDefault();
    if (!manualInputA.trim()) return;
    const val = manualInputA.trim();
    setTextA(val);
    setManualInputA('');
    handleTranslation(val, 'A', langA, langB);
  };

  const handleManualSubmitB = (e) => {
    e.preventDefault();
    if (!manualInputB.trim()) return;
    const val = manualInputB.trim();
    setTextB(val);
    setManualInputB('');
    handleTranslation(val, 'B', langB, langA);
  };

  const langAName = languages.find(l => l.code === langA)?.name || langA.toUpperCase();
  const langBName = languages.find(l => l.code === langB)?.name || langB.toUpperCase();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Controls Bar */}
      <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Face-to-Face Split Conversation</h2>
          <span className="badge badge-cyan">In-Person Auto Ping-Pong</span>
          <span className="badge badge-green" style={{ fontSize: '0.75rem', gap: '4px' }}>
            <Zap size={12} />
            <span>{lastLatency}ms Latency</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Auto Turn-Taking Toggle */}
          <button
            id="btn-toggle-auto-turn"
            className={autoTurnTaking ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setAutoTurnTaking(!autoTurnTaking)}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            title="Automatically turns on the other person's mic after speech is finished"
          >
            <Radio size={15} className={autoTurnTaking ? 'pulse-dot' : ''} />
            <span>Auto Turn-Taking: {autoTurnTaking ? 'ON (Hands-Free)' : 'OFF'}</span>
          </button>

          <button
            id="btn-toggle-invert"
            className="btn-secondary"
            onClick={() => setInvertTop(!invertTop)}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <ArrowUpDown size={16} />
            <span>{invertTop ? 'Top Inverted (Across Table)' : 'Top Upright'}</span>
          </button>

          <button
            id="btn-swap-f2f-langs"
            className="btn-secondary"
            onClick={swapLanguages}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <RotateCcw size={16} />
            <span>Swap Roles</span>
          </button>
        </div>
      </div>

      {turnNotice && (
        <div style={{
          padding: '10px 18px',
          borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.15), rgba(99, 102, 241, 0.15))',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          color: '#67e8f9',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Sparkles size={16} />
          <span>{turnNotice}</span>
        </div>
      )}

      {/* Split-Screen Canvas */}
      <div style={{
        display: 'grid',
        gridTemplateRows: '1fr 1fr',
        gap: '16px',
        minHeight: '660px',
        position: 'relative'
      }}>
        {/* Person B Card (Top Half - Facing the person across the table) */}
        <div
          className={`glass-card ${activeSpeaker === 'B' ? 'turn-active' : ''}`}
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(30, 27, 75, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)',
            border: activeSpeaker === 'B' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
            transform: invertTop ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.4s ease, border-color 0.2s ease',
            borderRadius: '24px'
          }}
        >
          {/* Header for Person B */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                Person B ({langBName})
              </span>
              <select
                id="select-f2f-lang-b"
                className="select-field"
                value={langB}
                onChange={(e) => setLangB(e.target.value)}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native_name}) {l.code === 'doi' ? '⭐' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn-secondary"
              onClick={() => playSpeech(translatedForB, langB)}
              style={{ padding: '8px 12px' }}
              title="Pronounce Translation"
            >
              <Volume2 size={16} />
              <span>Listen</span>
            </button>
          </div>

          {/* Central Dialogue Area for Person B */}
          <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Heard from Person A (Translated to {langBName}):
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 600, color: '#67e8f9', minHeight: '44px' }}>
              {translatedForB || 'Waiting for Person A to speak...'}
            </div>
            {textB && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                Person B said: "{textB}"
              </div>
            )}
          </div>

          {/* Quick manual text input for Person B */}
          <form onSubmit={handleManualSubmitB} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              id="input-f2f-b"
              className="input-field"
              placeholder={`Type in ${langBName} (e.g., नमस्ते, केह् हाल-चाल ऐ?)...`}
              value={manualInputB}
              onChange={(e) => setManualInputB(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '8px 12px' }}
            />
            <button
              id="btn-f2f-send-b"
              type="submit"
              className="btn-secondary"
              style={{ padding: '8px 14px' }}
              disabled={!manualInputB.trim()}
            >
              <Send size={14} />
              <span>Send</span>
            </button>
          </form>

          {/* Person B Microphone Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <button
              id="btn-f2f-mic-b"
              onClick={() => activeSpeaker === 'B' ? stopListening() : startListening('B')}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: 'none',
                background: activeSpeaker === 'B' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: activeSpeaker === 'B' ? '0 0 30px rgba(239, 68, 68, 0.6)' : '0 6px 20px rgba(6, 182, 212, 0.4)',
                transition: 'all 0.2s ease',
                transform: activeSpeaker === 'B' ? 'scale(1.1)' : 'scale(1)'
              }}
            >
              {activeSpeaker === 'B' ? <MicOff size={32} /> : <Mic size={32} />}
            </button>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {activeSpeaker === 'B' ? 'Listening to Person B...' : `Tap or Auto-Turn (${langBName})`}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Auto-translates into {langAName}
              </div>
            </div>
          </div>
        </div>

        {/* Person A Card (Bottom Half - Facing Person A) */}
        <div
          className={`glass-card ${activeSpeaker === 'A' ? 'turn-active' : ''}`}
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.5) 100%)',
            border: activeSpeaker === 'A' ? '2px solid var(--primary-light)' : '1px solid var(--border-subtle)',
            transition: 'border-color 0.2s ease',
            borderRadius: '24px'
          }}
        >
          {/* Header for Person A */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-blue" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                Person A ({langAName})
              </span>
              <select
                id="select-f2f-lang-a"
                className="select-field"
                value={langA}
                onChange={(e) => setLangA(e.target.value)}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.name} ({l.native_name})</option>
                ))}
              </select>
            </div>

            <button
              className="btn-secondary"
              onClick={() => playSpeech(translatedForA, langA)}
              style={{ padding: '8px 12px' }}
              title="Pronounce Translation"
            >
              <Volume2 size={16} />
              <span>Listen</span>
            </button>
          </div>

          {/* Central Dialogue Area for Person A */}
          <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Heard from Person B (Translated to {langAName}):
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 600, color: '#a5b4fc', minHeight: '44px' }}>
              {translatedForA || 'Waiting for Person B to speak...'}
            </div>
            {textA && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                Person A said: "{textA}"
              </div>
            )}
          </div>

          {/* Quick manual text input for Person A */}
          <form onSubmit={handleManualSubmitA} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              id="input-f2f-a"
              className="input-field"
              placeholder={`Type in ${langAName} (e.g., Hello, how are you?)...`}
              value={manualInputA}
              onChange={(e) => setManualInputA(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '8px 12px' }}
            />
            <button
              id="btn-f2f-send-a"
              type="submit"
              className="btn-secondary"
              style={{ padding: '8px 14px' }}
              disabled={!manualInputA.trim()}
            >
              <Send size={14} />
              <span>Send</span>
            </button>
          </form>

          {/* Person A Microphone Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <button
              id="btn-f2f-mic-a"
              onClick={() => activeSpeaker === 'A' ? stopListening() : startListening('A')}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: 'none',
                background: activeSpeaker === 'A' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: activeSpeaker === 'A' ? '0 0 30px rgba(239, 68, 68, 0.6)' : '0 6px 20px rgba(99, 102, 241, 0.4)',
                transition: 'all 0.2s ease',
                transform: activeSpeaker === 'A' ? 'scale(1.1)' : 'scale(1)'
              }}
            >
              {activeSpeaker === 'A' ? <MicOff size={32} /> : <Mic size={32} />}
            </button>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {activeSpeaker === 'A' ? 'Listening to Person A...' : `Tap or Auto-Turn (${langAName})`}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Auto-translates into {langBName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
