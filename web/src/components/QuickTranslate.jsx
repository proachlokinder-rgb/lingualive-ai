import React, { useState, useRef } from 'react';
import { 
  Languages, ArrowRightLeft, Volume2, Copy, Check, Trash2, 
  Mic, MicOff, Upload, Sparkles, Clock, Play, AudioWaveform
} from 'lucide-react';
import { translateText, synthesizeSpeech, transcribeAudio, playBase64Audio } from '../services/api';
import { createSpeechRecognizer, isSpeechRecognitionSupported, speakBrowserText } from '../services/speech';

export default function QuickTranslate({ languages = [] }) {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('hi');
  const [inputText, setInputText] = useState('Where is the nearest train station?');
  const [translatedText, setTranslatedText] = useState('निकटतम रेलवे स्टेशन कहाँ है?');
  const [detectedLang, setDetectedLang] = useState(null);
  const [latencyMs, setLatencyMs] = useState(128);
  const [provider, setProvider] = useState('Google Translate');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentHistory, setRecentHistory] = useState([
    { id: 1, from: 'en', to: 'hi', input: 'Hello, how can I help you?', output: 'नमस्ते, मैं आपकी क्या मदद कर सकता हूँ?' },
    { id: 2, from: 'en', to: 'pa', input: 'Welcome to our city', output: 'ਸਾਡੇ ਸ਼ਹਿਰ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ' }
  ]);

  const recognizerRef = useRef(null);
  const fileInputRef = useRef(null);

  const quickPhrases = [
    { label: 'Train Station', text: 'Where is the nearest train station?' },
    { label: 'Cost/Price', text: 'How much does this cost?' },
    { label: 'Doctor/Help', text: 'I need medical assistance immediately.' },
    { label: 'Hotel Booking', text: 'Do you have a room available for tonight?' },
    { label: 'Food Order', text: 'Can I see the vegetarian menu please?' }
  ];

  const handleTranslate = async (textToTranslate = inputText) => {
    if (!textToTranslate || !textToTranslate.trim()) return;

    setIsTranslating(true);
    try {
      const res = await translateText({
        text: textToTranslate,
        sourceLang,
        targetLang
      });

      setTranslatedText(res.translated_text);
      setDetectedLang(res.detected_source_lang);
      setLatencyMs(res.latency_ms);
      setProvider(res.provider);

      // Add to recent history
      setRecentHistory(prev => [
        {
          id: Date.now(),
          from: sourceLang,
          to: targetLang,
          input: textToTranslate,
          output: res.translated_text
        },
        ...prev.slice(0, 5)
      ]);
    } catch (err) {
      alert(`Translation error: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwap = () => {
    const tempLang = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(tempLang);

    const tempText = inputText;
    setInputText(translatedText);
    setTranslatedText(tempText);
  };

  const handleSpeakInput = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognizerRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognizer = createSpeechRecognizer({
        lang: sourceLang,
        continuous: false,
        interimResults: true,
        onResult: ({ finalText, interimText }) => {
          setInputText(finalText || interimText);
          if (finalText && finalText.trim()) {
            handleTranslate(finalText.trim());
          }
        },
        onError: () => setIsRecording(false),
        onEnd: () => setIsRecording(false)
      });

      recognizerRef.current = recognizer;
      recognizer.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Speech recognition error:', err);
      setIsRecording(false);
    }
  };

  const handleAudioFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsTranslating(true);
    try {
      const sttRes = await transcribeAudio(file, sourceLang);
      if (sttRes.text) {
        setInputText(sttRes.text);
        await handleTranslate(sttRes.text);
      } else {
        alert('Could not detect speech in the uploaded audio file.');
      }
    } catch (err) {
      alert(`Audio transcription error: ${err.message}`);
    } finally {
      setIsTranslating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePlayTTS = async (text, lang) => {
    if (!text) return;
    setIsPlayingAudio(true);
    try {
      const ttsData = await synthesizeSpeech({ text, lang });
      if (ttsData.audio_base64) {
        await playBase64Audio(ttsData.audio_base64);
        setIsPlayingAudio(false);
        return;
      }
    } catch (err) {
      console.warn('Backend TTS error, trying browser synthesis:', err);
    }
    await speakBrowserText(text, lang);
    setIsPlayingAudio(false);
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Language Selector Ribbon */}
      <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>SOURCE LANGUAGE</label>
            <select
              id="select-quick-source-lang"
              className="select-field"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.name} ({l.native_name})</option>
              ))}
            </select>
          </div>

          <button
            id="btn-swap-languages"
            className="btn-secondary"
            onClick={handleSwap}
            style={{ width: '42px', height: '42px', padding: 0, marginTop: '18px', borderRadius: '50%' }}
            title="Swap Languages"
          >
            <ArrowRightLeft size={18} />
          </button>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>TARGET LANGUAGE</label>
            <select
              id="select-quick-target-lang"
              className="select-field"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.name} ({l.native_name})</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="btn-trigger-translate"
            className="btn-primary"
            onClick={() => handleTranslate()}
            disabled={isTranslating || !inputText.trim()}
          >
            <Sparkles size={18} />
            <span>{isTranslating ? 'Translating...' : 'Translate'}</span>
          </button>
        </div>
      </div>

      {/* Main Translation Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Source Text Input Card */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Languages size={18} color="#818cf8" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Input Text & Audio</span>
            </div>
            {inputText && (
              <button
                id="btn-clear-input"
                className="btn-secondary"
                onClick={() => { setInputText(''); setTranslatedText(''); }}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                title="Clear input"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <textarea
            id="input-translate-text"
            className="textarea-field"
            rows={6}
            placeholder="Type, speak, or upload speech to translate..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{ resize: 'vertical', fontSize: '1.05rem', lineHeight: '1.6' }}
          />

          {/* Action Tools: Voice Dictation & Audio File Upload */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                id="btn-mic-dictation"
                className={`btn-${isRecording ? 'danger' : 'secondary'}`}
                onClick={handleSpeakInput}
                style={{ padding: '8px 14px' }}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                <span>{isRecording ? 'Recording Voice...' : 'Dictate'}</span>
              </button>

              <button
                id="btn-upload-audio"
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '8px 14px' }}
                title="Upload WAV/MP3 recording to transcribe"
              >
                <Upload size={16} />
                <span>Upload Audio</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={handleAudioFileUpload}
              />
            </div>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {inputText.length} characters
            </span>
          </div>

          {/* Quick Phrases */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick Travel & Conversation Phrases
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {quickPhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  id={`btn-quick-phrase-${idx}`}
                  onClick={() => {
                    setInputText(phrase.text);
                    handleTranslate(phrase.text);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    padding: '6px 12px',
                    color: '#e2e8f0',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {phrase.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Target Translated Text Output Card */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 27, 75, 0.3) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#34d399" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>AI Translation Output</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {latencyMs > 0 && (
                <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                  {latencyMs}ms
                </span>
              )}
              <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                {provider}
              </span>
            </div>
          </div>

          <div
            id="output-translated-text"
            style={{
              flex: 1,
              minHeight: '140px',
              fontSize: '1.35rem',
              fontWeight: 600,
              lineHeight: '1.6',
              color: '#34d399',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {isTranslating ? (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '1rem' }}>
                Translating with real AI pipeline...
              </span>
            ) : translatedText ? (
              translatedText
            ) : (
              <span style={{ color: 'var(--text-dim)', fontSize: '1rem' }}>
                Translation will appear here...
              </span>
            )}
          </div>

          {/* Action Bar for Translation Output */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                id="btn-listen-translation"
                className="btn-primary"
                onClick={() => handlePlayTTS(translatedText, targetLang)}
                disabled={!translatedText || isPlayingAudio}
                style={{ padding: '8px 16px' }}
              >
                {isPlayingAudio ? (
                  <div className="audio-wave">
                    <span className="audio-bar"></span>
                    <span className="audio-bar"></span>
                    <span className="audio-bar"></span>
                  </div>
                ) : (
                  <Volume2 size={18} />
                )}
                <span>{isPlayingAudio ? 'Playing Voice...' : 'Listen Pronunciation'}</span>
              </button>

              <button
                id="btn-copy-translation"
                className="btn-secondary"
                onClick={handleCopy}
                disabled={!translatedText}
                style={{ padding: '8px 14px' }}
                title="Copy to clipboard"
              >
                {copied ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {detectedLang && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Detected: <strong>{detectedLang.toUpperCase()}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Translation History Section */}
      {recentHistory.length > 0 && (
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Clock size={16} color="#818cf8" />
            <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Recent Translations</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentHistory.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                    {item.from.toUpperCase()} → {item.to.toUpperCase()}
                  </span>
                  <span style={{ color: '#fff' }}>"{item.input}"</span>
                  <span style={{ color: 'var(--text-dim)' }}>→</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>"{item.output}"</span>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => handlePlayTTS(item.output, item.to)}
                  style={{ padding: '4px 8px' }}
                  title="Pronounce"
                >
                  <Volume2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
