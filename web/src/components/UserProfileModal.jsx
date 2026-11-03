import React, { useState } from 'react';
import { User, Globe, Copy, Check, X, Shield, Sparkles } from 'lucide-react';

export const COUNTRIES = [
  { name: 'India', code: 'IN', flag: '🇮🇳' },
  { name: 'United States', code: 'US', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺' },
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪' },
  { name: 'France', code: 'FR', flag: '🇫🇷' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸' },
  { name: 'Russia', code: 'RU', flag: '🇷🇺' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹' }
];

export default function UserProfileModal({ isOpen, onClose, profile, onSave }) {
  const [name, setName] = useState(profile.name || 'Rahul Sharma');
  const [country, setCountry] = useState(profile.country || 'India');
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  const currentCountry = COUNTRIES.find(c => c.name === country) || COUNTRIES[0];

  const handleCopyId = () => {
    navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave({
      ...profile,
      name: name.trim() || 'User',
      country: currentCountry.name,
      countryFlag: currentCountry.flag,
      countryCode: currentCountry.code
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <User size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>LiveLingo User Profile</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Your global caller identity & country badge
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User ID Box */}
          <div style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your LiveLingo User ID
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#818cf8', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                {profile.id}
              </div>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleCopyId}
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              title="Copy LiveLingo ID"
            >
              {copiedId ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copiedId ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* User Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Full Name / Display Name
            </label>
            <input
              id="input-profile-name"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              required
            />
          </div>

          {/* Country Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Country
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>{currentCountry.flag}</span>
              <select
                id="select-profile-country"
                className="select-field"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{ flex: 1 }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Preview Card */}
          <div style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1rem',
              color: '#fff'
            }}>
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{name || 'Your Name'}</span>
                <span>{currentCountry.flag}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {currentCountry.name} • ID: {profile.id}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ padding: '10px 18px' }}
            >
              Cancel
            </button>
            <button
              id="btn-save-profile"
              type="submit"
              className="btn-primary"
              style={{ padding: '10px 22px' }}
            >
              <Check size={16} />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
