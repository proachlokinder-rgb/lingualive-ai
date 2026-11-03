import React, { useState, useEffect } from 'react';
import { Activity, Server, Radio, CheckCircle2, XCircle, RefreshCw, Cpu, Zap, Shield } from 'lucide-react';
import { fetchHealth, fetchProviderStatus, translateText, synthesizeSpeech, createRoom } from '../services/api';

export default function SystemDiagnostics() {
  const [healthData, setHealthData] = useState(null);
  const [providerData, setProviderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [h, p] = await Promise.all([fetchHealth(), fetchProviderStatus()]);
      setHealthData(h);
      setProviderData(p);
    } catch (e) {
      console.error('Failed to load system data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const runDiagnostics = async () => {
    setIsRunningTests(true);
    const results = {
      translation: { status: 'running', latency: 0, error: null },
      tts: { status: 'running', latency: 0, error: null },
      room: { status: 'running', latency: 0, error: null }
    };
    setTestResults({ ...results });

    // 1. Test Translation
    try {
      const t0 = performance.now();
      const res = await translateText({ text: 'Diagnostics ping', sourceLang: 'en', targetLang: 'hi' });
      const t1 = performance.now();
      results.translation = { status: 'passed', latency: Math.round(t1 - t0), output: res.translated_text };
    } catch (err) {
      results.translation = { status: 'failed', latency: 0, error: err.message };
    }
    setTestResults({ ...results });

    // 2. Test TTS
    try {
      const t0 = performance.now();
      const res = await synthesizeSpeech({ text: 'Online', lang: 'en' });
      const t1 = performance.now();
      results.tts = { status: 'passed', latency: Math.round(t1 - t0), size: res.audio_base64.length };
    } catch (err) {
      results.tts = { status: 'failed', latency: 0, error: err.message };
    }
    setTestResults({ ...results });

    // 3. Test Room Creation
    try {
      const t0 = performance.now();
      const res = await createRoom({ roomName: 'Test Diagnos Room' });
      const t1 = performance.now();
      results.room = { status: 'passed', latency: Math.round(t1 - t0), roomId: res.room_id };
    } catch (err) {
      results.room = { status: 'failed', latency: 0, error: err.message };
    }
    setTestResults({ ...results });
    setIsRunningTests(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Activity size={20} color="#34d399" />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>System Architecture & Provider Health</h2>
            <span className="badge badge-green">Production Ready</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '750px', margin: 0 }}>
            Real-time telemetry for WebRTC signaling gateways, translation engines (deep-translator / Google Translate), voice synthesizers (gTTS), and on-device ML Kit pipelines.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            id="btn-refresh-diagnostics"
            className="btn-secondary"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          <button
            id="btn-run-tests"
            className="btn-primary"
            onClick={runDiagnostics}
            disabled={isRunningTests}
          >
            <Zap size={16} />
            <span>{isRunningTests ? 'Running Benchmarks...' : 'Run Live Benchmark'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Backend Service</span>
            <Server size={18} color="#818cf8" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
            FastAPI Uvicorn
          </div>
          <div style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '6px' }}>
            Uptime: {healthData ? `${healthData.uptime_seconds}s` : 'Connecting...'}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Call Rooms</span>
            <Radio size={18} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
            {healthData ? `${healthData.active_rooms} Rooms` : '0 Rooms'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '6px' }}>
            Real-time WebRTC WebSocket Relay
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>STUN Gateway</span>
            <Shield size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
            Google STUN
          </div>
          <div style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '6px' }}>
            NAT Traversal Ready (Port 19302)
          </div>
        </div>
      </div>

      {/* Live Benchmark Test Results (if run) */}
      {testResults && (
        <div className="glass-card" style={{ padding: '24px', border: '1px solid var(--border-focus)' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#f59e0b" />
            <span>Live Endpoint Benchmark Results</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Translation Test */}
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>POST /api/translate</span>
                {testResults.translation.status === 'passed' && <CheckCircle2 size={16} color="#34d399" />}
                {testResults.translation.status === 'failed' && <XCircle size={16} color="#ef4444" />}
                {testResults.translation.status === 'running' && <span className="pulse-dot"></span>}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {testResults.translation.status === 'passed' ? (
                  <>Latency: <strong style={{ color: '#34d399' }}>{testResults.translation.latency}ms</strong> (Result: "{testResults.translation.output}")</>
                ) : testResults.translation.error ? (
                  <span style={{ color: '#ef4444' }}>{testResults.translation.error}</span>
                ) : 'Benchmarking...'}
              </div>
            </div>

            {/* TTS Test */}
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>POST /api/tts (gTTS)</span>
                {testResults.tts.status === 'passed' && <CheckCircle2 size={16} color="#34d399" />}
                {testResults.tts.status === 'failed' && <XCircle size={16} color="#ef4444" />}
                {testResults.tts.status === 'running' && <span className="pulse-dot"></span>}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {testResults.tts.status === 'passed' ? (
                  <>Latency: <strong style={{ color: '#34d399' }}>{testResults.tts.latency}ms</strong> (Audio stream: {testResults.tts.size} bytes base64)</>
                ) : testResults.tts.error ? (
                  <span style={{ color: '#ef4444' }}>{testResults.tts.error}</span>
                ) : 'Benchmarking...'}
              </div>
            </div>

            {/* Room Creation Test */}
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>POST /api/rooms/create</span>
                {testResults.room.status === 'passed' && <CheckCircle2 size={16} color="#34d399" />}
                {testResults.room.status === 'failed' && <XCircle size={16} color="#ef4444" />}
                {testResults.room.status === 'running' && <span className="pulse-dot"></span>}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {testResults.room.status === 'passed' ? (
                  <>Latency: <strong style={{ color: '#34d399' }}>{testResults.room.latency}ms</strong> (Generated Room Code: <strong>{testResults.room.roomId}</strong>)</>
                ) : testResults.room.error ? (
                  <span style={{ color: '#ef4444' }}>{testResults.room.error}</span>
                ) : 'Benchmarking...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provider Status Grid */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Service Providers & Engine Status</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(providerData?.providers || []).map((p, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{p.name}</span>
                  <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{p.service_type}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {p.details}
                </div>
              </div>

              <div>
                <span className={`badge ${p.status === 'active' ? 'badge-green' : p.status === 'configured' ? 'badge-cyan' : 'badge-amber'}`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
