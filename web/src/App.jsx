import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import WebRTCCall from './components/WebRTCCall';
import FaceToFace from './components/FaceToFace';
import QuickTranslate from './components/QuickTranslate';
import CameraOCR from './components/CameraOCR';
import OfflineManager from './components/OfflineManager';
import SystemDiagnostics from './components/SystemDiagnostics';
import UserProfileModal from './components/UserProfileModal';
import { fetchLanguages } from './services/api';

// Fallback languages in case backend is initialising
const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English', native_name: 'English', download_size_mb: 30, offline_mlkit_supported: true },
  { code: 'hi', name: 'Hindi', native_name: 'हिन्दी', download_size_mb: 32, offline_mlkit_supported: true },
  { code: 'doi', name: 'Dogri', native_name: 'डोगरी', download_size_mb: 30, offline_mlkit_supported: true, notes: 'Jammu & Kashmir Devanagari Script' },
  { code: 'pa', name: 'Punjabi', native_name: 'ਪੰਜਾਬੀ', download_size_mb: 32, offline_mlkit_supported: true },
  { code: 'es', name: 'Spanish', native_name: 'Español', download_size_mb: 28, offline_mlkit_supported: true },
  { code: 'fr', name: 'French', native_name: 'Français', download_size_mb: 29, offline_mlkit_supported: true },
  { code: 'de', name: 'German', native_name: 'Deutsch', download_size_mb: 31, offline_mlkit_supported: true },
  { code: 'ja', name: 'Japanese', native_name: '日本語', download_size_mb: 34, offline_mlkit_supported: true },
  { code: 'zh-cn', name: 'Chinese (Simplified)', native_name: '简体中文', download_size_mb: 35, offline_mlkit_supported: true },
  { code: 'ar', name: 'Arabic', native_name: 'العربية', download_size_mb: 31, offline_mlkit_supported: true },
  { code: 'ru', name: 'Russian', native_name: 'Русский', download_size_mb: 32, offline_mlkit_supported: true },
  { code: 'bn', name: 'Bengali', native_name: 'বাংলা', download_size_mb: 33, offline_mlkit_supported: true },
  { code: 'ta', name: 'Tamil', native_name: 'தமிழ்', download_size_mb: 33, offline_mlkit_supported: true },
  { code: 'te', name: 'Telugu', native_name: 'తెలుగు', download_size_mb: 32, offline_mlkit_supported: true },
  { code: 'mr', name: 'Marathi', native_name: 'मराठी', download_size_mb: 31, offline_mlkit_supported: true },
  { code: 'gu', name: 'Gujarati', native_name: 'ગુજરાતી', download_size_mb: 32, offline_mlkit_supported: true },
  { code: 'ur', name: 'Urdu', native_name: 'اردو', download_size_mb: 30, offline_mlkit_supported: true }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('call');
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGlobalOffline, setIsGlobalOffline] = useState(false);

  // Persistent User Profile State
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('livelingo_user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved profile:', e);
    }
    const defaultId = 'LL-' + Math.floor(100000 + Math.random() * 900000);
    return {
      id: defaultId,
      name: 'Rahul Sharma',
      country: 'India',
      countryCode: 'IN',
      countryFlag: '🇮🇳'
    };
  });

  const handleSaveProfile = (newProfile) => {
    setUserProfile(newProfile);
    try {
      localStorage.setItem('livelingo_user_profile', JSON.stringify(newProfile));
    } catch (e) {
      console.warn('Failed to save profile to storage:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadLanguages = async () => {
      try {
        const data = await fetchLanguages();
        if (isMounted && data.languages && data.languages.length > 0) {
          setLanguages(data.languages);
        }
      } catch (err) {
        console.warn('Using default language matrix:', err);
      }
    };
    loadLanguages();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app-container">
      {/* Navigation Header with User Profile Badge */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userProfile={userProfile}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Main Tab Content */}
      <main style={{ minHeight: '650px' }}>
        {activeTab === 'call' && (
          <WebRTCCall languages={languages} userProfile={userProfile} />
        )}
        {activeTab === 'facetoface' && (
          <FaceToFace languages={languages} />
        )}
        {activeTab === 'translate' && (
          <QuickTranslate languages={languages} />
        )}
        {activeTab === 'ocr' && (
          <CameraOCR languages={languages} />
        )}
        {activeTab === 'offline' && (
          <OfflineManager
            languages={languages}
            isGlobalOffline={isGlobalOffline}
            setIsGlobalOffline={setIsGlobalOffline}
          />
        )}
        {activeTab === 'diagnostics' && (
          <SystemDiagnostics />
        )}
      </main>

      {/* Global User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={userProfile}
        onSave={handleSaveProfile}
      />

      {/* Footer */}
      <footer style={{
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.8rem',
        color: 'var(--text-dim)'
      }}>
        <div>
          <strong>LinguaLive AI</strong> — Real-Time Voice and Offline Text Translator
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>FastAPI Backend</span>
          <span>•</span>
          <span>WebRTC P2P</span>
          <span>•</span>
          <span>Google ML Kit</span>
          <span>•</span>
          <span>Dogri & Multi-lingual Neural Engine</span>
          <span>•</span>
          <span>gTTS</span>
        </div>
      </footer>
    </div>
  );
}
