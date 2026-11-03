import React, { useState } from 'react';
import { 
  HardDrive, Download, Trash2, CheckCircle2, Wifi, WifiOff, 
  AlertTriangle, Sparkles, Database, Users, Languages, Volume2, 
  ArrowUpDown, Play, Check, ShieldCheck, Zap
} from 'lucide-react';
import { translateOffline } from '../services/offlineTranslator';
import { speakBrowserText } from '../services/speech';

export default function OfflineManager({ languages = [], isGlobalOffline = false, setIsGlobalOffline = () => {} }) {
  const [downloadedModels, setDownloadedModels] = useState({
    en: true,
    hi: true,
    doi: true, // Dogri offline model enabled
    pa: true,
    es: false,
    fr: false,
    de: false,
    ja: false
  });

  const [downloadingLang, setDownloadingLang] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Offline Face-to-Face Playground State
  const [offlineF2FPersonA, setOfflineF2FPersonA] = useState('Hello, how are you?');
  const [offlineF2FPersonB, setOfflineF2FPersonB] = useState('नमस्ते, केह् हाल-चाल ऐ?');
  const [offlineLangA, setOfflineLangA] = useState('en');
  const [offlineLangB, setOfflineLangB] = useState('doi'); // Dogri
  const [activeF2FSpeaker, setActiveF2FSpeaker] = useState(null);
  const [offlineF2FLatency, setOfflineF2FLatency] = useState(2);

  // Offline Quick Text Translate State
  const [offlineInputText, setOfflineInputText] = useState('What is your name?');
  const [offlineTranslatedText, setOfflineTranslatedText] = useState('थुआढ़ा केह् नांऽ ऐ?');
  const [offlineQuickSource, setOfflineQuickSource] = useState('en');
  const [offlineQuickTarget, setOfflineQuickTarget] = useState('doi');

  const handleDownload = (code) => {
    setDownloadingLang(code);
    setDownloadProgress(0);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloadedModels((d) => ({ ...d, [code]: true }));
          setDownloadingLang(null);
          return 0;
        }
        return prev + 25;
      });
    }, 200);
  };

  const handleDelete = (code) => {
    setDownloadedModels((d) => ({ ...d, [code]: false }));
  };

  // Perform instant offline Face-to-Face translation
  const handleOfflineF2FTranslate = (speaker) => {
    setActiveF2FSpeaker(speaker);
    const text = speaker === 'A' ? offlineF2FPersonA : offlineF2FPersonB;
    const fromLang = speaker === 'A' ? offlineLangA : offlineLangB;
    const toLang = speaker === 'A' ? offlineLangB : offlineLangA;

    const res = translateOffline(text, fromLang, toLang);
    setOfflineF2FLatency(res.latencyMs || 2);

    if (speaker === 'A') {
      setOfflineF2FPersonB(res.translatedText);
      speakBrowserText(res.translatedText, toLang);
    } else {
      setOfflineF2FPersonA(res.translatedText);
      speakBrowserText(res.translatedText, toLang);
    }

    setTimeout(() => setActiveF2FSpeaker(null), 800);
  };

  // Perform instant offline quick translation
  const handleOfflineQuickTranslate = () => {
    const res = translateOffline(offlineInputText, offlineQuickSource, offlineQuickTarget);
    setOfflineTranslatedText(res.translatedText);
    speakBrowserText(res.translatedText, offlineQuickTarget);
  };

  // Calculate storage metrics
  const totalMb = Object.entries(downloadedModels).reduce((acc, [code, downloaded]) => {
    if (!downloaded) return acc;
    const lang = languages.find((l) => l.code === code);
    return acc + (lang?.download_size_mb || 30);
  }, 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Offline Simulation Toggle */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <HardDrive size={22} color="#8b5cf6" />
            <h2 style={{ fontSize: '1.3rem', margin: 0 }}>On-Device Offline Mode & Google ML Kit</h2>
            <span className="badge badge-green">100% Offline • Zero Latency</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '780px', margin: 0 }}>
            Run face-to-face and text translations completely offline even when Wi-Fi and mobile data are disconnected. No internet access, server queries, or roaming charges required.
          </p>
        </div>

        {/* Global Offline Mode Switch */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          {isGlobalOffline ? <WifiOff size={22} color="#f59e0b" /> : <Wifi size={22} color="#34d399" />}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              {isGlobalOffline ? 'Full Offline Mode Active' : 'Online Cloud Mode'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              {isGlobalOffline ? 'Internet disconnected • On-device rules running' : 'Connected to cloud services'}
            </div>
          </div>
          <button
            id="btn-toggle-offline-simulation"
            className={`btn-${isGlobalOffline ? 'danger' : 'secondary'}`}
            onClick={() => setIsGlobalOffline(!isGlobalOffline)}
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
          >
            {isGlobalOffline ? 'Disable Offline Mode' : 'Simulate Offline Mode'}
          </button>
        </div>
      </div>

      {/* Explanatory Section: When Does Offline ML Kit Work? */}
      <div className="glass-card" style={{
        padding: '20px 24px',
        borderLeft: '4px solid #8b5cf6',
        background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)'
      }}>
        <h3 style={{ fontSize: '1.05rem', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc' }}>
          <ShieldCheck size={18} />
          <span>When Does the Offline ML Kit Work?</span>
        </h3>
        <div style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 6px 0' }}>
            <strong>1. On Android Device:</strong> Google ML Kit downloads neural model weights (~30 MB per language) once into internal device storage via <code>downloadModelIfNeeded()</code>. After downloading, ML Kit executes 100% locally on the phone's CPU/NPU without making any network requests. It works perfectly on airplanes, in remote areas, and with Wi-Fi / Mobile Data turned off.
          </p>
          <p style={{ margin: 0 }}>
            <strong>2. On Web & Browser:</strong> LiveLingo incorporates a client-side neural phrasebook & dictionary engine that handles face-to-face and text translations entirely in local memory with ~2ms response time even when the internet is completely turned off.
          </p>
        </div>
      </div>

      {/* Dedicated Offline Face-to-Face Translation Feature */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color="#34d399" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Offline Face-to-Face Conversation Mode</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Zero latency conversation across the table with internet turned OFF
              </p>
            </div>
          </div>

          <div className="badge badge-green">
            <Zap size={14} />
            <span>{offlineF2FLatency}ms Local Engine</span>
          </div>
        </div>

        {/* Dual Split Cards for Offline Face-to-Face */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Person A Offline Box */}
          <div style={{
            padding: '20px',
            borderRadius: '16px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-blue">Person A</span>
              <select
                className="select-field"
                value={offlineLangA}
                onChange={(e) => setOfflineLangA(e.target.value)}
                style={{ width: 'auto', padding: '4px 10px', fontSize: '0.8rem' }}
              >
                <option value="en">English (English)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="doi">Dogri (डोगरी) ⭐</option>
                <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Person A Speaks:
              </label>
              <input
                id="input-offline-f2f-a"
                className="input-field"
                value={offlineF2FPersonA}
                onChange={(e) => setOfflineF2FPersonA(e.target.value)}
                placeholder="Type in Person A language..."
              />
            </div>

            <button
              id="btn-offline-f2f-a"
              className="btn-primary"
              onClick={() => handleOfflineF2FTranslate('A')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Zap size={16} />
              <span>Translate for Person B (Instant Offline)</span>
            </button>
          </div>

          {/* Person B Offline Box */}
          <div style={{
            padding: '20px',
            borderRadius: '16px',
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-cyan">Person B</span>
              <select
                className="select-field"
                value={offlineLangB}
                onChange={(e) => setOfflineLangB(e.target.value)}
                style={{ width: 'auto', padding: '4px 10px', fontSize: '0.8rem' }}
              >
                <option value="doi">Dogri (डोगरी) ⭐</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="en">English (English)</option>
                <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Person B Speaks:
              </label>
              <input
                id="input-offline-f2f-b"
                className="input-field"
                value={offlineF2FPersonB}
                onChange={(e) => setOfflineF2FPersonB(e.target.value)}
                placeholder="Type in Person B language..."
              />
            </div>

            <button
              id="btn-offline-f2f-b"
              className="btn-secondary"
              onClick={() => handleOfflineF2FTranslate('B')}
              style={{ width: '100%', justifyContent: 'center', borderColor: '#06b6d4', color: '#06b6d4' }}
            >
              <Zap size={16} />
              <span>Translate for Person A (Instant Offline)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Storage Dashboard Widget */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Total Offline Storage Used</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span>{totalMb} MB</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>/ 1.5 GB allocated</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${(totalMb / 1500) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}></div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Active Offline Languages</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#34d399' }}>
            {Object.values(downloadedModels).filter(Boolean).length} Models Installed
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '8px' }}>
            Including English, Hindi, Dogri (डोगरी), & Punjabi
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Android ML Kit Engine</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#67e8f9' }}>
            Ready (On-Device)
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '8px' }}>
            Google ML Kit Native On-Device Translator (API 26+)
          </div>
        </div>
      </div>

      {/* Language Pack List Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Available On-Device Language Packs</h3>
          <span className="badge badge-cyan">{languages.length} Languages in Matrix</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {languages.map((lang) => {
            const isDownloaded = downloadedModels[lang.code];
            const isDownloading = downloadingLang === lang.code;

            return (
              <div
                key={lang.code}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: isDownloaded ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: isDownloaded ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: isDownloaded ? '#34d399' : '#fff'
                  }}>
                    {lang.code.toUpperCase()}
                  </div>

                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{lang.name}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>({lang.native_name})</span>
                      {isDownloaded && <CheckCircle2 size={16} color="#34d399" />}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {lang.notes || (lang.offline_mlkit_supported ? 'Supports offline on-device translation' : 'Offline phrasebook & rule engine')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {lang.download_size_mb ? `${lang.download_size_mb} MB` : '30 MB (Pack)'}
                  </span>

                  {isDownloading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                      <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${downloadProgress}%`, height: '100%', background: '#8b5cf6', transition: 'width 0.2s' }}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>{downloadProgress}%</span>
                    </div>
                  ) : isDownloaded ? (
                    <button
                      id={`btn-delete-model-${lang.code}`}
                      className="btn-secondary"
                      onClick={() => handleDelete(lang.code)}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#fca5a5' }}
                      title="Remove from device"
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  ) : (
                    <button
                      id={`btn-download-model-${lang.code}`}
                      className="btn-primary"
                      onClick={() => handleDownload(lang.code)}
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      <Download size={14} />
                      <span>Download Pack</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
