import React, { useEffect, useState } from 'react';
import { PhoneCall, Users, Languages, Camera, HardDrive, Activity, Wifi, Sparkles, User, Shield } from 'lucide-react';
import { fetchHealth } from '../services/api';

export default function Navbar({ activeTab, setActiveTab, userProfile, onOpenProfile }) {
  const [serverHealth, setServerHealth] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkServer = async () => {
      try {
        const health = await fetchHealth();
        if (isMounted) {
          setServerHealth(health);
          setIsOnline(true);
        }
      } catch (err) {
        if (isMounted) {
          setIsOnline(false);
        }
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { id: 'call', label: 'WebRTC Call', icon: PhoneCall, badge: 'Live Voice' },
    { id: 'facetoface', label: 'Face-to-Face', icon: Users, badge: 'Split-Screen' },
    { id: 'translate', label: 'Instant Translate', icon: Languages, badge: 'Voice + Text' },
    { id: 'ocr', label: 'Camera OCR', icon: Camera, badge: 'Vision' },
    { id: 'offline', label: 'Offline Mode & ML Kit', icon: HardDrive, badge: 'On-Device' },
    { id: 'diagnostics', label: 'System Status', icon: Activity, badge: 'API' },
  ];

  return (
    <header className="header-container" id="main-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
        }}>
          <Sparkles size={24} color="#fff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 800, letterSpacing: '-0.03em' }}>
              LinguaLive <span style={{ background: 'linear-gradient(90deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI</span>
            </h1>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
              v1.2.0
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-Time Voice & Offline Text Translation Engine
          </p>
        </div>
      </div>

      <nav className="nav-tabs" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* User Profile Badge */}
        {userProfile && (
          <button
            id="btn-user-profile-header"
            onClick={onOpenProfile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
              border: '1px solid var(--border-focus)',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
            title="Click to view & edit your LiveLingo User Profile"
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{userProfile.name}</span>
                <span>{userProfile.countryFlag || '🇮🇳'}</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
                {userProfile.id} • {userProfile.country || 'India'}
              </div>
            </div>
          </button>
        )}

        <div className={`badge ${isOnline ? 'badge-green' : 'badge-amber'}`} id="server-status-pill">
          <span className="pulse-dot"></span>
          <span>{isOnline ? 'Online' : 'Reconnecting'}</span>
          {serverHealth && (
            <span style={{ opacity: 0.75, fontSize: '0.7rem', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '6px' }}>
              {serverHealth.active_rooms} Rooms
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
