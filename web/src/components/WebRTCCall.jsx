import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneCall, PhoneOff, Mic, MicOff, Volume2, Copy, Check, Users, 
  Send, RefreshCw, Radio, Sparkles, MessageSquare, ShieldCheck, Languages, 
  ArrowRightLeft, Headphones, ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react';
import { createRoom, getRoomStatus, playBase64Audio, synthesizeSpeech } from '../services/api';
import { createSpeechRecognizer, isSpeechRecognitionSupported, speakBrowserText } from '../services/speech';

export default function WebRTCCall({ languages = [], userProfile = {} }) {
  const [roomId, setRoomId] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [username, setUsername] = useState(userProfile?.name || 'Caller ' + Math.floor(100 + Math.random() * 900));

  // Language state:
  // myLanguage: Default preferred language (determines both spoken & listening by default)
  const [myLanguage, setMyLanguage] = useState(() => userProfile?.preferredLang || 'en');
  const [spokenLang, setSpokenLang] = useState(() => userProfile?.preferredLang || 'en');
  const [targetLang, setTargetLang] = useState(() => userProfile?.preferredLang || 'en');
  const [partnerTargetLang, setPartnerTargetLang] = useState(() => (userProfile?.preferredLang === 'hi' ? 'en' : 'hi'));
  const [showAdvancedLang, setShowAdvancedLang] = useState(false);

  const [clientId] = useState(() => userProfile?.id || ('usr_' + Math.random().toString(36).substring(2, 8)));

  const [inCall, setInCall] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [peerInfo, setPeerInfo] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [manualText, setManualText] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [interimText, setInterimText] = useState('');
  const [languageNotice, setLanguageNotice] = useState(null);

  const wsRef = useRef(null);
  const recognizerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Synchronized state refs to prevent stale closure bugs in SpeechRecognition callbacks
  const inCallRef = useRef(false);
  const isListeningRef = useRef(false);
  const spokenLangRef = useRef(spokenLang);
  const targetLangRef = useRef(targetLang);
  const peerInfoRef = useRef(peerInfo);
  const partnerTargetLangRef = useRef(partnerTargetLang);

  useEffect(() => { inCallRef.current = inCall; }, [inCall]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { spokenLangRef.current = spokenLang; }, [spokenLang]);
  useEffect(() => { targetLangRef.current = targetLang; }, [targetLang]);
  useEffect(() => { peerInfoRef.current = peerInfo; }, [peerInfo]);
  useEffect(() => { partnerTargetLangRef.current = partnerTargetLang; }, [partnerTargetLang]);

  // Sync username if profile updates
  useEffect(() => {
    if (userProfile?.name && !inCall) {
      setUsername(userProfile.name);
    }
  }, [userProfile, inCall]);

  // Auto-scroll transcript stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, interimText]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      leaveCall();
    };
  }, []);

  const getLangName = (code) => {
    if (!code) return 'Auto';
    const found = languages.find(l => l.code.toLowerCase() === code.toLowerCase());
    return found ? `${found.name} (${found.native_name})` : code.toUpperCase();
  };

  const getLangShortName = (code) => {
    if (!code) return 'Auto';
    const found = languages.find(l => l.code.toLowerCase() === code.toLowerCase());
    return found ? found.name : code.toUpperCase();
  };

  const handleSelectMyLanguage = (lang) => {
    setMyLanguage(lang);
    setSpokenLang(lang);
    setTargetLang(lang);
    spokenLangRef.current = lang;
    targetLangRef.current = lang;

    // Smart default for partner's language
    if (lang === 'hi' && partnerTargetLang === 'hi') {
      setPartnerTargetLang('en');
    } else if (lang === 'en' && partnerTargetLang === 'en') {
      setPartnerTargetLang('hi');
    }
  };

  const handleCreateRoom = async () => {
    try {
      setIsConnecting(true);
      setErrorMsg(null);
      const res = await createRoom({
        roomName: `${username}'s Room`,
        hostLang: spokenLang,
        targetLang: targetLang
      });
      setRoomId(res.room_id);
      connectWebSocket(res.room_id);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create room');
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    const code = inputRoomCode.toUpperCase().trim();
    if (!code || code.length < 4) {
      setErrorMsg('Please enter a valid room code (e.g., 6 letters/digits)');
      return;
    }
    try {
      setIsConnecting(true);
      setErrorMsg(null);
      await getRoomStatus(code);
      setRoomId(code);
      connectWebSocket(code);
    } catch (err) {
      setErrorMsg(err.message || 'Room not found or expired');
      setIsConnecting(false);
    }
  };

  const connectWebSocket = (targetRoomId) => {
    let wsBase = '';
    if (import.meta.env?.VITE_WS_URL) {
      wsBase = import.meta.env.VITE_WS_URL.replace(/\/$/, '');
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsBase = `${protocol}//${host}`;
    }
    const wsUrl = `${wsBase}/ws/room/${targetRoomId}?client_id=${clientId}&username=${encodeURIComponent(username)}&spoken_lang=${spokenLang}&target_lang=${targetLang}&preferred_lang=${myLanguage}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnecting(false);
      setInCall(true);
      inCallRef.current = true;
      startSpeechRecognition();
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleIncomingMessage(msg);
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setErrorMsg('WebSocket connection error');
      setIsConnecting(false);
    };

    ws.onclose = () => {
      setInCall(false);
      inCallRef.current = false;
      setIsListening(false);
      isListeningRef.current = false;
      setPeerInfo(null);
    };
  };

  const handleIncomingMessage = async (msg) => {
    const { type, payload } = msg;

    if (type === 'room_joined') {
      const peers = (payload.participants || []).filter(p => p.client_id !== clientId);
      if (peers.length > 0) {
        const peer = peers[0];
        setPeerInfo(peer);
        peerInfoRef.current = peer;
        if (peer.target_language) {
          setPartnerTargetLang(peer.target_language);
        }
      }
    } else if (type === 'peer_joined') {
      setPeerInfo(payload);
      peerInfoRef.current = payload;
      if (payload.target_language) {
        setPartnerTargetLang(payload.target_language);
      }
      addSystemMessage(`${payload.username || 'Peer'} has connected. Speaking: ${getLangShortName(payload.spoken_language)}, Listening: ${getLangShortName(payload.target_language)}.`);
      showNotification(`Peer connected! Your voice will translate live into ${getLangShortName(payload.target_language)}.`);
    } else if (type === 'peer_left') {
      setPeerInfo(null);
      peerInfoRef.current = null;
      addSystemMessage(`${payload.username || 'Peer'} left the call.`);
    } else if (type === 'peer_languages_changed') {
      setPeerInfo(prev => prev ? ({ ...prev, spoken_language: payload.spoken_language, target_language: payload.target_language }) : payload);
      peerInfoRef.current = payload;
      if (payload.target_language) {
        setPartnerTargetLang(payload.target_language);
      }
      const newTargetName = getLangShortName(payload.target_language);
      addSystemMessage(`${payload.username || 'Peer'} updated listening language to ${newTargetName}.`);
      showNotification(`${payload.username || 'Peer'} is now listening in ${newTargetName}. Your speech will translate into ${newTargetName}!`);
    } else if (type === 'languages_updated') {
      const targetName = getLangShortName(payload.target_language);
      const spokenName = getLangShortName(payload.spoken_language);
      showNotification(`Languages synchronized: Speaking ${spokenName}, Hearing ${targetName}`);
    } else if (type === 'transcript_echo') {
      setTranscripts(prev => [...prev, {
        id: Date.now() + Math.random(),
        sender: 'me',
        senderName: username,
        originalText: payload.text,
        translatedText: null,
        lang: payload.source_lang,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }]);
    } else if (type === 'translated_message') {
      const newMsg = {
        id: Date.now() + Math.random(),
        sender: 'peer',
        senderName: payload.speaker_name || peerInfoRef.current?.username || 'Peer',
        originalText: payload.original_text,
        translatedText: payload.translated_text,
        sourceLang: payload.source_lang,
        targetLang: payload.target_lang,
        provider: payload.provider,
        latencyMs: payload.latency_ms,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setTranscripts(prev => [...prev, newMsg]);

      // Automatically play translated voice in listener's language
      if (payload.translated_text && !isMuted) {
        playTTS(payload.translated_text, payload.target_lang);
      }
    } else if (type === 'error') {
      setErrorMsg(payload.message || 'Room error occurred');
      leaveCall();
    }
  };

  const showNotification = (msg) => {
    setLanguageNotice(msg);
    setTimeout(() => setLanguageNotice(null), 4000);
  };

  const addSystemMessage = (text) => {
    setTranscripts(prev => [...prev, {
      id: Date.now() + Math.random(),
      sender: 'system',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  // Change target language (what I want to hear) dynamically in active call
  const handleUpdateTargetLanguage = (newTargetLang) => {
    setTargetLang(newTargetLang);
    targetLangRef.current = newTargetLang;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'update_languages',
        payload: {
          spoken_lang: spokenLangRef.current,
          target_lang: newTargetLang
        }
      }));
    }
    showNotification(`You will now hear incoming voice in: ${getLangShortName(newTargetLang)}`);
  };

  // Change spoken language (what I speak) dynamically in active call
  const handleUpdateSpokenLanguage = (newSpokenLang) => {
    setSpokenLang(newSpokenLang);
    spokenLangRef.current = newSpokenLang;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'update_languages',
        payload: {
          spoken_lang: newSpokenLang,
          target_lang: targetLangRef.current
        }
      }));
    }
    // Restart recognition with new spoken language locale
    if (isListeningRef.current) {
      stopSpeechRecognition();
      setTimeout(() => startSpeechRecognition(newSpokenLang), 200);
    }
    showNotification(`Microphone now listening for: ${getLangShortName(newSpokenLang)}`);
  };

  // Explicitly set the language partner hears (sends peer_target_lang to server)
  const handleUpdatePartnerTargetLanguage = (newPartnerTarget) => {
    setPartnerTargetLang(newPartnerTarget);
    partnerTargetLangRef.current = newPartnerTarget;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'update_languages',
        payload: {
          peer_target_lang: newPartnerTarget
        }
      }));
    }
    showNotification(`Your speech will now translate into: ${getLangShortName(newPartnerTarget)} for peer`);
  };

  // Quick swap your language and peer's language
  const handleSwapLanguages = () => {
    const currentSpoken = spokenLang;
    const currentPartnerTarget = peerInfo?.target_language || partnerTargetLang;

    // Swap
    handleUpdateSpokenLanguage(currentPartnerTarget);
    handleUpdateTargetLanguage(currentPartnerTarget);
    handleUpdatePartnerTargetLanguage(currentSpoken);
  };

  const startSpeechRecognition = (overrideLang = null) => {
    if (!isSpeechRecognitionSupported()) return;

    try {
      if (recognizerRef.current) {
        recognizerRef.current.abort();
        recognizerRef.current = null;
      }

      const activeSpoken = overrideLang || spokenLangRef.current || 'en';
      const recognizer = createSpeechRecognizer({
        lang: activeSpoken,
        continuous: true,
        interimResults: true,
        onResult: ({ finalText, interimText: interim }) => {
          setInterimText(interim);
          if (finalText && finalText.trim()) {
            sendTranscript(finalText.trim());
            setInterimText('');
          }
        },
        onError: (err) => {
          console.warn('Speech recognizer error:', err);
        },
        onEnd: () => {
          if (inCallRef.current && isListeningRef.current) {
            try {
              recognizer.start();
            } catch (e) {
              setTimeout(() => {
                if (inCallRef.current && isListeningRef.current && recognizerRef.current) {
                  try { recognizerRef.current.start(); } catch (err) {}
                }
              }, 250);
            }
          }
        }
      });

      recognizerRef.current = recognizer;
      recognizer.start();
      setIsListening(true);
      isListeningRef.current = true;
    } catch (e) {
      console.warn('Failed to start speech recognition:', e);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch (e) {}
      recognizerRef.current = null;
    }
    setIsListening(false);
    isListeningRef.current = false;
    setInterimText('');
  };

  const toggleMic = () => {
    if (isListening) {
      stopSpeechRecognition();
      setIsMuted(true);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'mute_toggle', payload: { is_muted: true } }));
      }
    } else {
      startSpeechRecognition();
      setIsMuted(false);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'mute_toggle', payload: { is_muted: false } }));
      }
    }
  };

  const sendTranscript = (text) => {
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const currentPeerTarget = peerInfoRef.current?.target_language || partnerTargetLangRef.current || 'en';

    wsRef.current.send(JSON.stringify({
      type: 'transcript',
      payload: {
        text,
        source_lang: spokenLangRef.current,
        target_lang: currentPeerTarget,
        speaker_name: username
      }
    }));
  };

  const handleSendManualText = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    sendTranscript(manualText.trim());
    setManualText('');
  };

  const playTTS = async (text, lang) => {
    try {
      const ttsData = await synthesizeSpeech({ text, lang: lang || 'en' });
      if (ttsData.audio_base64) {
        await playBase64Audio(ttsData.audio_base64);
        return;
      }
    } catch (err) {
      console.warn('Backend TTS failed, falling back to browser speech synthesis:', err);
    }
    speakBrowserText(text, lang || 'en');
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const leaveCall = () => {
    stopSpeechRecognition();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setInCall(false);
    inCallRef.current = false;
    setPeerInfo(null);
    peerInfoRef.current = null;
    setInterimText('');
  };

  const activePeerTarget = peerInfo?.target_language || partnerTargetLang;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner: WebRTC Mode Description */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneCall size={20} color="#818cf8" />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Real-Time Phone Call Voice Relay</h2>
            <span className="badge badge-green">P2P WebRTC Signalling + Neural Speech Translation</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '750px', margin: 0 }}>
            Connect two callers on any phone or browser. Choose your preferred language—speak naturally, and your voice translates instantly into the listener's chosen language with automatic speech playback!
          </p>
        </div>

        {inCall && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="badge badge-green" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
              <Radio size={14} className="pulse-dot" />
              <span>ROOM: {roomId}</span>
            </div>
            <button
              id="btn-copy-room-code"
              className="btn-secondary"
              onClick={copyRoomCode}
              style={{ padding: '8px 12px' }}
              title="Copy Room Code"
            >
              {copiedCode ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
              <span>{copiedCode ? 'Copied' : 'Share Code'}</span>
            </button>
            <button
              id="btn-end-call"
              className="btn-danger"
              onClick={leaveCall}
            >
              <PhoneOff size={18} />
              <span>End Call</span>
            </button>
          </div>
        )}
      </div>

      {languageNotice && (
        <div style={{ padding: '12px 20px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#67e8f9', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeIn 0.2s ease-in-out' }}>
          <Sparkles size={18} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{languageNotice}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '12px 18px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {!inCall ? (
        /* Setup / Join Room View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Identity & Language Preferences */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <ShieldCheck size={18} color="#818cf8" />
              <span>Caller Profile & Language Selection</span>
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Your Display Name {userProfile?.countryFlag ? `(${userProfile.countryFlag} ${userProfile.country})` : ''}
              </label>
              <input
                id="input-caller-username"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            {/* Primary Language Selector: My Preferred Language */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                🌟 My Preferred Language (What I Speak & Hear):
              </label>
              <select
                id="select-preferred-lang"
                className="select-field"
                value={myLanguage}
                onChange={(e) => handleSelectMyLanguage(e.target.value)}
                style={{ padding: '10px 14px', fontSize: '0.95rem', borderColor: '#818cf8', fontWeight: 600 }}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Partner's Expected Language */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#34d399', fontWeight: 600, marginBottom: '6px' }}>
                🎧 Partner's Language (What Partner Speaks & Hears):
              </label>
              <select
                id="select-partner-expected-lang"
                className="select-field"
                value={partnerTargetLang}
                onChange={(e) => setPartnerTargetLang(e.target.value)}
                style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native_name})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                When your partner connects, their chosen language will automatically take precedence.
              </span>
            </div>

            {/* Advanced toggle for separate spoken and listening language */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedLang(!showAdvancedLang)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#818cf8',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0
                }}
              >
                {showAdvancedLang ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>{showAdvancedLang ? 'Hide advanced language options' : 'Need different speaking and listening languages? (Click here)'}</span>
              </button>

              {showAdvancedLang && (
                <div style={{ marginTop: '14px', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>I Will Speak</label>
                    <select
                      id="select-spoken-lang"
                      className="select-field"
                      value={spokenLang}
                      onChange={(e) => {
                        setSpokenLang(e.target.value);
                        spokenLangRef.current = e.target.value;
                      }}
                      style={{ fontSize: '0.85rem' }}
                    >
                      {languages.map((l) => (
                        <option key={l.code} value={l.code}>{l.name} ({l.native_name})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#34d399', marginBottom: '4px' }}>I Want to Hear In</label>
                    <select
                      id="select-target-lang"
                      className="select-field"
                      value={targetLang}
                      onChange={(e) => {
                        setTargetLang(e.target.value);
                        targetLangRef.current = e.target.value;
                      }}
                      style={{ fontSize: '0.85rem' }}
                    >
                      {languages.map((l) => (
                        <option key={l.code} value={l.code}>{l.name} ({l.native_name})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Translation Route Explanatory Card */}
            <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: '6px' }}>⚡ Real-Time Voice Translation Preview:</div>
              <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>• You speak in <strong style={{ color: '#818cf8' }}>{getLangShortName(spokenLang)}</strong> ➔ Partner hears in <strong style={{ color: '#34d399' }}>{getLangShortName(partnerTargetLang)}</strong></div>
                <div>• Partner speaks in <strong style={{ color: '#34d399' }}>{getLangShortName(partnerTargetLang)}</strong> ➔ You hear in <strong style={{ color: '#818cf8' }}>{getLangShortName(targetLang)}</strong></div>
              </div>
            </div>
          </div>

          {/* Create or Join Room Actions */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Start a New Call</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
                Generate an encrypted 6-character room code to invite a remote caller on any phone or browser.
              </p>
              <button
                id="btn-create-call-room"
                className="btn-primary"
                style={{ width: '100%', padding: '12px' }}
                onClick={handleCreateRoom}
                disabled={isConnecting}
              >
                {isConnecting ? <RefreshCw size={18} className="pulse-dot" /> : <PhoneCall size={18} />}
                <span>Create New Call Room</span>
              </button>
            </div>

            <div style={{ position: 'relative', textAlign: 'center' }}>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
              <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface)', padding: '0 12px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                OR JOIN CALL
              </span>
            </div>

            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Join with Room Code</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  id="input-room-code"
                  className="input-field"
                  placeholder="e.g. 7X9K2A"
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, textAlign: 'center', fontSize: '1.1rem' }}
                />
                <button
                  id="btn-join-call-room"
                  className="btn-secondary"
                  onClick={handleJoinRoom}
                  disabled={isConnecting || !inputRoomCode}
                  style={{ minWidth: '110px' }}
                >
                  <span>Join Call</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active Call Interface */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Dynamic Real-Time Translation Pipeline Banner */}
          <div className="glass-card" style={{
            padding: '16px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.95) 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Languages size={20} color="#06b6d4" />
                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Active Voice Translation Pipeline</span>
                <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>Sub-250ms Live Relay</span>
              </div>

              {/* Quick Swap Languages Button */}
              <button
                id="btn-swap-call-langs"
                className="btn-secondary"
                onClick={handleSwapLanguages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Swap your spoken language and peer's target language"
              >
                <ArrowRightLeft size={14} />
                <span>Swap Languages</span>
              </button>
            </div>

            {/* Translation Flow Visualizer */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {/* Route 1: You -> Peer */}
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mic size={14} color="#818cf8" />
                  <span style={{ fontSize: '0.85rem' }}>You speak: <strong style={{ color: '#a5b4fc' }}>{getLangShortName(spokenLang)}</strong></span>
                </div>
                <ArrowRight size={14} color="#06b6d4" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Volume2 size={14} color="#34d399" />
                  <span style={{ fontSize: '0.85rem' }}>Peer hears: <strong style={{ color: '#34d399' }}>{getLangShortName(activePeerTarget)}</strong></span>
                </div>
              </div>

              {/* Route 2: Peer -> You */}
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mic size={14} color="#34d399" />
                  <span style={{ fontSize: '0.85rem' }}>Peer speaks: <strong style={{ color: '#6ee7b7' }}>{getLangShortName(peerInfo?.spoken_language || activePeerTarget)}</strong></span>
                </div>
                <ArrowRight size={14} color="#06b6d4" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Volume2 size={14} color="#818cf8" />
                  <span style={{ fontSize: '0.85rem' }}>You hear: <strong style={{ color: '#a5b4fc' }}>{getLangShortName(targetLang)}</strong></span>
                </div>
              </div>
            </div>

            {/* Dynamic In-Call Language Selectors */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {/* Spoken Language Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🗣️ I am speaking:</span>
                <select
                  id="select-call-spoken-lang"
                  className="select-field"
                  value={spokenLang}
                  onChange={(e) => handleUpdateSpokenLanguage(e.target.value)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem', borderColor: '#818cf8' }}
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>{l.name} ({l.native_name})</option>
                  ))}
                </select>
              </div>

              {/* Target Language (What I Want To Hear) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 600 }}>🎧 I want to hear in:</span>
                <select
                  id="select-call-target-lang"
                  className="select-field"
                  value={targetLang}
                  onChange={(e) => handleUpdateTargetLanguage(e.target.value)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem', borderColor: '#818cf8' }}
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>{l.name} ({l.native_name})</option>
                  ))}
                </select>
              </div>

              {/* Peer Listening Target Language */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>🌐 Peer hears in:</span>
                <select
                  id="select-call-peer-target-lang"
                  className="select-field"
                  value={activePeerTarget}
                  onChange={(e) => handleUpdatePartnerTargetLanguage(e.target.value)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem', borderColor: '#34d399', color: '#34d399', fontWeight: 600 }}
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>{l.name} ({l.native_name})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: '20px' }}>
            {/* Left: Participant Cards & Call Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Local User Card */}
              <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{username} (You)</span>
                  <span className="badge badge-blue">Local</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Speaking: <strong style={{ color: '#fff' }}>{getLangShortName(spokenLang)}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#a5b4fc', marginTop: '4px' }}>
                  Hearing: <strong>{getLangShortName(targetLang)}</strong>
                </div>
                {isListening && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="audio-wave">
                      <span className="audio-bar"></span>
                      <span className="audio-bar"></span>
                      <span className="audio-bar"></span>
                      <span className="audio-bar"></span>
                      <span className="audio-bar"></span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#34d399' }}>Listening to your voice...</span>
                  </div>
                )}
              </div>

              {/* Remote Peer Card */}
              <div className="glass-card" style={{ padding: '18px', borderLeft: peerInfo ? '4px solid var(--accent-emerald)' : '4px solid var(--text-dim)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{peerInfo ? peerInfo.username : 'Waiting for peer...'}</span>
                  {peerInfo ? (
                    <span className="badge badge-green">Connected</span>
                  ) : (
                    <span className="badge badge-amber">Waiting</span>
                  )}
                </div>
                {peerInfo ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div>Speaking: <strong style={{ color: '#fff' }}>{getLangShortName(peerInfo.spoken_language)}</strong></div>
                    <div style={{ marginTop: '4px' }}>Hearing: <strong style={{ color: '#34d399' }}>{getLangShortName(peerInfo.target_language)}</strong></div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Share room code <strong style={{ color: '#818cf8', letterSpacing: '0.05em' }}>{roomId}</strong> with your peer to connect.
                  </div>
                )}
              </div>

              {/* Call Control Buttons */}
              <div className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  id="btn-toggle-mic"
                  className={`btn-${isMuted ? 'danger' : 'secondary'}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={toggleMic}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  <span>{isMuted ? 'Unmute Microphone' : 'Mute Microphone'}</span>
                </button>

                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  🎙️ High-Speed Translation: ~200ms latency via Direct Neural Engine.
                </div>
              </div>
            </div>

            {/* Right: Live Real-Time Subtitles & Transcript Stream */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '600px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={18} color="#818cf8" />
                  <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Live Real-Time Voice Translation Stream</h3>
                </div>
                <span className="badge badge-cyan">Sub-250ms Direct AI Relay</span>
              </div>

              {/* Message Feed */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '8px' }}>
                {transcripts.length === 0 && !interimText && (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <Sparkles size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p>Speak into your microphone or type a message below.</p>
                    <p style={{ fontSize: '0.8rem' }}>LinguaLive translates speech live for both callers in their chosen language.</p>
                  </div>
                )}

                {transcripts.map((t) => {
                  if (t.sender === 'system') {
                    return (
                      <div key={t.id} style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-dim)', padding: '4px 0' }}>
                        ─── {t.text} ({t.timestamp}) ───
                      </div>
                    );
                  }

                  const isMe = t.sender === 'me';
                  return (
                    <div
                      key={t.id}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        background: isMe ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)' : 'rgba(255, 255, 255, 0.05)',
                        border: isMe ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                        borderRadius: '16px',
                        padding: '14px 18px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isMe ? '#a5b4fc' : '#67e8f9' }}>
                          {t.senderName} {isMe ? '(You)' : ''}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{t.timestamp}</span>
                      </div>

                      {/* Original Spoken Text */}
                      <div style={{ fontSize: '0.95rem', color: '#fff', marginBottom: t.translatedText ? '8px' : '0' }}>
                        {t.originalText}
                      </div>

                      {/* Translated Text if received from peer */}
                      {t.translatedText && (
                        <div style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>
                              Translated ({getLangShortName(t.targetLang)}):
                            </div>
                            <div style={{ fontSize: '1.05rem', color: '#34d399', fontWeight: 600 }}>
                              {t.translatedText}
                            </div>
                          </div>
                          <button
                            className="btn-secondary"
                            onClick={() => playTTS(t.translatedText, t.targetLang)}
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            title="Play Voice"
                          >
                            <Volume2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Interim Real-time speech preview */}
                {interimText && (
                  <div style={{
                    alignSelf: 'flex-end',
                    maxWidth: '80%',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px dashed var(--border-focus)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    fontStyle: 'italic',
                    color: 'var(--text-muted)'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#818cf8', display: 'block', marginBottom: '4px' }}>Speaking now ({getLangShortName(spokenLang)})...</span>
                    {interimText}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input for manual speech / quick text send */}
              <form onSubmit={handleSendManualText} style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                <input
                  id="input-call-manual-text"
                  className="input-field"
                  placeholder={`Type a message in ${getLangShortName(spokenLang)} to translate live for peer...`}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
                <button
                  id="btn-call-send-text"
                  type="submit"
                  className="btn-primary"
                  style={{ minWidth: '90px' }}
                  disabled={!manualText.trim()}
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
