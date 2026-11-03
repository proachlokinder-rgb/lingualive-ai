/**
 * LinguaLive AI API Client
 * Interfaces with the FastAPI backend for Translation, TTS, STT, and Rooms.
 */

import { translateOffline } from './offlineTranslator';

const rawApiBase = import.meta.env?.VITE_API_URL || '';
const API_BASE = rawApiBase ? `${rawApiBase.replace(/\/$/, '')}/api` : '/api';
const clientCache = new Map();

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return await res.json();
}

export async function fetchProviderStatus() {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error(`Provider status failed: ${res.statusText}`);
  return await res.json();
}

export async function fetchLanguages() {
  const res = await fetch(`${API_BASE}/languages`);
  if (!res.ok) throw new Error(`Language list failed: ${res.statusText}`);
  return await res.json();
}

export async function translateText({ text, sourceLang = 'auto', targetLang = 'hi', provider = null, forceOffline = false }) {
  if (!text || !text.trim()) {
    return {
      original_text: text,
      translated_text: '',
      source_lang: sourceLang,
      target_lang: targetLang,
      provider: 'None',
      latency_ms: 0
    };
  }

  const cleanText = text.trim();
  const cacheKey = `${cleanText}:::${sourceLang}:::${targetLang}`;

  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey);
  }

  // If forced offline or browser is offline
  if (forceOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    const offlineRes = translateOffline(cleanText, sourceLang, targetLang);
    const result = {
      original_text: cleanText,
      translated_text: offlineRes.translatedText,
      source_lang: sourceLang,
      target_lang: targetLang,
      provider: offlineRes.provider,
      latency_ms: offlineRes.latencyMs
    };
    clientCache.set(cacheKey, result);
    return result;
  }

  try {
    const res = await fetch(`${API_BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        source_lang: sourceLang,
        target_lang: targetLang,
        provider: provider || undefined
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    clientCache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.warn('Online translation unavailable, using On-Device ML Kit Offline Engine:', err);
    const offlineRes = translateOffline(cleanText, sourceLang, targetLang);
    const fallbackResult = {
      original_text: cleanText,
      translated_text: offlineRes.translatedText,
      source_lang: sourceLang,
      target_lang: targetLang,
      provider: offlineRes.provider,
      latency_ms: offlineRes.latencyMs
    };
    clientCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }
}

export async function synthesizeSpeech({ text, lang = 'en', slow = false }) {
  const res = await fetch(`${API_BASE}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      lang,
      slow
    })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Speech synthesis failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function transcribeAudio(audioBlob, language = 'en') {
  const formData = new FormData();
  formData.append('audio_file', audioBlob, 'recording.wav');
  formData.append('language', language);

  const res = await fetch(`${API_BASE}/stt`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Transcription failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function createRoom({ roomName = '', hostLang = 'en', targetLang = 'hi' } = {}) {
  const res = await fetch(`${API_BASE}/rooms/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      room_name: roomName || undefined,
      host_language: hostLang,
      target_language: targetLang
    })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Room creation failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function getRoomStatus(roomId) {
  const code = roomId.toUpperCase().trim();
  const res = await fetch(`${API_BASE}/rooms/${code}/status`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Room lookup failed: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Helper to play base64 mp3 audio returned by /api/tts
 */
export function playBase64Audio(base64Audio) {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.onended = () => resolve();
      audio.onerror = (e) => reject(e);
      audio.play().catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}
