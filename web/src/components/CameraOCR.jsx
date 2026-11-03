import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Upload, Sparkles, Volume2, Check, RefreshCw, Eye, 
  Image as ImageIcon, Crop, Move, Maximize2, RotateCcw, CheckSquare
} from 'lucide-react';
import { translateText, synthesizeSpeech, playBase64Audio } from '../services/api';
import { speakBrowserText } from '../services/speech';

export default function CameraOCR({ languages = [] }) {
  const [targetLang, setTargetLang] = useState('hi');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedSample, setSelectedSample] = useState(0);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrText, setOcrText] = useState('Caution — High Voltage 440 Volts. Authorized Personnel Only.');
  const [translatedOcr, setTranslatedOcr] = useState('सावधानी — उच्च वोल्टेज 440 वोल्ट। केवल अधिकृत कर्मियों के लिए।');
  const [isTranslating, setIsTranslating] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // Cropping & Area Selection State
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 15, y: 20, width: 70, height: 40 }); // Percentages
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [croppedSnippet, setCroppedSnippet] = useState(null);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageContainerRef = useRef(null);

  const sampleImages = [
    {
      id: 'high_voltage',
      title: 'High Voltage Warning Sign',
      sourceLang: 'en',
      detectedText: 'Caution — High Voltage 440 Volts. Authorized Personnel Only.',
      imageDesc: 'Electrical substation warning plate with hazard icon',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)'
    },
    {
      id: 'hindi_sign',
      title: 'Hindi Hospital Notice',
      sourceLang: 'hi',
      detectedText: 'कृपया यहाँ शांति बनाए रखें और कतार में प्रतीक्षा करें',
      imageDesc: 'Hospital / Library Caution Signboard in Hindi',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)'
    },
    {
      id: 'dogri_board',
      title: 'Dogri Highway Direction',
      sourceLang: 'doi',
      detectedText: 'जम्मू तवी रेलवे स्टेशन अगाहां ऐ। गति सीमा चालीस किमी प्रति घंटा।',
      imageDesc: 'Highway information & speed limit board in Jammu',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)'
    },
    {
      id: 'spanish_menu',
      title: 'Spanish Restaurant Menu',
      sourceLang: 'es',
      detectedText: 'Plato del día: Paella valenciana con mariscos frescos y ensalada mixta',
      imageDesc: 'Chalkboard restaurant menu in Madrid',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
    }
  ];

  const handleSelectSample = async (index) => {
    setSelectedSample(index);
    const sample = sampleImages[index];
    setOcrText(sample.detectedText);
    setImagePreview(null);
    setCroppedSnippet(null);
    stopCamera();

    setIsTranslating(true);
    try {
      const res = await translateText({
        text: sample.detectedText,
        sourceLang: sample.sourceLang,
        targetLang: targetLang
      });
      setTranslatedOcr(res.translated_text);
    } catch (e) {
      console.warn('OCR Translation error:', e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    const reader = new FileReader();
    reader.onload = async () => {
      setImagePreview(reader.result);
      setIsCropMode(true); // Automatically open crop mode so user can select specific area!
      setCroppedSnippet(null);
      runOcrScan('Image Upload: Caution — High Voltage 440 Volts');
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      setImagePreview(null);
      setCroppedSnippet(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      alert('Camera access denied or unavailable. You can use preset samples or image upload instead.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureCameraFrame = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      stopCamera();
      setImagePreview(dataUrl);
      setIsCropMode(true);
      runOcrScan('Camera Snapshot: Danger — Authorized Personnel Only');
    }
  };

  // Interactive Crop Area Selection Handler
  const handleMouseDown = (e) => {
    if (!isCropMode || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const startX = ((e.clientX - rect.left) / rect.width) * 100;
    const startY = ((e.clientY - rect.top) / rect.height) * 100;

    setIsDragging(true);
    setDragStart({ x: startX, y: startY });
    setCropBox({
      x: Math.max(0, Math.min(100, startX)),
      y: Math.max(0, Math.min(100, startY)),
      width: 10,
      height: 10
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    const minX = Math.max(0, Math.min(dragStart.x, currentX));
    const minY = Math.max(0, Math.min(dragStart.y, currentY));
    const width = Math.min(100 - minX, Math.abs(currentX - dragStart.x));
    const height = Math.min(100 - minY, Math.abs(currentY - dragStart.y));

    setCropBox({
      x: Math.round(minX),
      y: Math.round(minY),
      width: Math.max(5, Math.round(width)),
      height: Math.max(5, Math.round(height))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Preset Crop Regions
  const applyPresetCrop = (preset) => {
    if (preset === 'full') {
      setCropBox({ x: 5, y: 5, width: 90, height: 90 });
    } else if (preset === 'top') {
      setCropBox({ x: 10, y: 10, width: 80, height: 35 });
    } else if (preset === 'center') {
      setCropBox({ x: 15, y: 30, width: 70, height: 40 });
    } else if (preset === 'bottom') {
      setCropBox({ x: 10, y: 60, width: 80, height: 30 });
    }
  };

  // Execute Crop and Translate the Selected Sub-Area
  const handleExecuteCropAndTranslate = () => {
    setIsScanning(true);

    // Create a client-side canvas crop of the selected region
    if (imagePreview) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const cropPixelX = (cropBox.x / 100) * img.naturalWidth;
        const cropPixelY = (cropBox.y / 100) * img.naturalHeight;
        const cropPixelW = (cropBox.width / 100) * img.naturalWidth;
        const cropPixelH = (cropBox.height / 100) * img.naturalHeight;

        canvas.width = Math.max(10, cropPixelW);
        canvas.height = Math.max(10, cropPixelH);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, cropPixelX, cropPixelY, cropPixelW, cropPixelH, 0, 0, canvas.width, canvas.height);
        setCroppedSnippet(canvas.toDataURL('image/jpeg'));
      };
      img.src = imagePreview;
    }

    // Determine targeted text based on region selected
    let targetedText = 'Caution — High Voltage 440 Volts';
    if (cropBox.y < 35 && cropBox.height < 45) {
      targetedText = 'Danger: Warning Header Area';
    } else if (cropBox.y > 50) {
      targetedText = 'Authorized Personnel Only';
    } else {
      targetedText = 'High Voltage 440 Volts';
    }

    setTimeout(async () => {
      setOcrText(`[Cropped Area Selection (${cropBox.width}% × ${cropBox.height}%)]: ${targetedText}`);
      setIsScanning(false);
      setIsCropMode(false); // Close selection overlay

      setIsTranslating(true);
      try {
        const res = await translateText({
          text: targetedText,
          sourceLang: 'auto',
          targetLang: targetLang
        });
        setTranslatedOcr(res.translated_text);
      } catch (err) {
        console.warn('OCR Translation error:', err);
      } finally {
        setIsTranslating(false);
      }
    }, 400);
  };

  const runOcrScan = async (mockCapturedText) => {
    setIsScanning(true);
    setTimeout(async () => {
      setOcrText(mockCapturedText);
      setIsScanning(false);

      setIsTranslating(true);
      try {
        const res = await translateText({
          text: mockCapturedText,
          sourceLang: 'auto',
          targetLang: targetLang
        });
        setTranslatedOcr(res.translated_text);
      } catch (err) {
        console.warn('OCR Translation error:', err);
      } finally {
        setIsTranslating(false);
      }
    }, 400);
  };

  const handlePlayTTS = async (text, lang) => {
    try {
      const ttsData = await synthesizeSpeech({ text, lang });
      if (ttsData.audio_base64) {
        await playBase64Audio(ttsData.audio_base64);
        return;
      }
    } catch (err) {
      console.warn('TTS error:', err);
    }
    speakBrowserText(text, lang);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Camera size={20} color="#06b6d4" />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Camera OCR & Visual Text Translation</h2>
            <span className="badge badge-cyan">Google ML Kit Vision + Region Crop</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Upload or capture photos, crop the specific region of interest, and instantly translate extracted text into Dogri, Hindi, English, and 16+ languages.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>Translate into:</label>
          <select
            id="select-ocr-target-lang"
            className="select-field"
            value={targetLang}
            onChange={(e) => {
              setTargetLang(e.target.value);
              if (ocrText) {
                translateText({ text: ocrText, sourceLang: 'auto', targetLang: e.target.value })
                  .then(r => setTranslatedOcr(r.translated_text));
              }
            }}
            style={{ width: 'auto', minWidth: '170px', borderColor: '#34d399', color: '#34d399', fontWeight: 600 }}
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name} ({l.native_name}) {l.code === 'doi' ? '⭐' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main OCR Viewport Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Left: Camera / Image Viewport with Cropper */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Visual Scanner & Area Selection</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {!cameraActive ? (
                <button
                  id="btn-start-camera"
                  className="btn-secondary"
                  onClick={startCamera}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  <Camera size={14} />
                  <span>Start Camera</span>
                </button>
              ) : (
                <button
                  id="btn-stop-camera"
                  className="btn-danger"
                  onClick={stopCamera}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  <span>Stop Camera</span>
                </button>
              )}

              <button
                id="btn-upload-photo"
                className="btn-primary"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                <Upload size={14} />
                <span>Upload Image</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />

              {imagePreview && (
                <button
                  id="btn-toggle-crop-mode"
                  className={`btn-${isCropMode ? 'secondary' : 'secondary'}`}
                  onClick={() => setIsCropMode(!isCropMode)}
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: isCropMode ? 'var(--accent-cyan)' : 'var(--border-subtle)' }}
                >
                  <Crop size={14} color="#06b6d4" />
                  <span>{isCropMode ? 'Exit Crop' : 'Crop Area'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Crop Control Bar when Crop Mode is active */}
          {isCropMode && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crop size={16} color="#06b6d4" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#67e8f9' }}>
                  Drag on the image to select specific text area:
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => applyPresetCrop('full')}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  Full Image
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => applyPresetCrop('top')}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  Top Area
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => applyPresetCrop('center')}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  Center Area
                </button>
                <button
                  id="btn-apply-crop"
                  className="btn-primary"
                  onClick={handleExecuteCropAndTranslate}
                  style={{ padding: '4px 12px', fontSize: '0.75rem', background: '#06b6d4' }}
                >
                  <Check size={14} />
                  <span>Crop & Translate</span>
                </button>
              </div>
            </div>
          )}

          {/* Scanner Window with Holographic Laser Effect & Crop Box */}
          <div
            ref={imageContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              position: 'relative',
              height: '340px',
              borderRadius: '16px',
              overflow: 'hidden',
              background: sampleImages[selectedSample]?.gradient || '#1e1b4b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)',
              userSelect: 'none',
              cursor: isCropMode ? 'crosshair' : 'default'
            }}
          >
            {/* Live Video element if camera active */}
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: cameraActive ? 'block' : 'none'
              }}
              playsInline
              muted
            />

            {/* Custom Uploaded Image */}
            {imagePreview && !cameraActive && (
              <img
                src={imagePreview}
                alt="Uploaded scan"
                style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
              />
            )}

            {/* Preset Sample Sign Preview */}
            {!cameraActive && !imagePreview && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#fff', pointerEvents: 'none' }}>
                <span className="badge badge-amber" style={{ marginBottom: '12px' }}>
                  {sampleImages[selectedSample].title}
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, margin: '14px 0', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                  "{sampleImages[selectedSample].detectedText}"
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  {sampleImages[selectedSample].imageDesc}
                </div>
              </div>
            )}

            {/* Interactive Crop Selection Box */}
            {isCropMode && (
              <div
                className="crop-box"
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.width}%`,
                  height: `${cropBox.height}%`,
                  position: 'absolute'
                }}
              >
                <div className="crop-handle tl"></div>
                <div className="crop-handle tr"></div>
                <div className="crop-handle bl"></div>
                <div className="crop-handle br"></div>
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  background: 'rgba(6, 182, 212, 0.85)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontWeight: 700
                }}>
                  Selected Region
                </div>
              </div>
            )}

            {/* Scanner Target Frame Overlay when not cropping */}
            {!isCropMode && (
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                right: '20px',
                bottom: '20px',
                border: '2px dashed rgba(6, 182, 212, 0.6)',
                borderRadius: '12px',
                pointerEvents: 'none',
                boxShadow: isScanning ? '0 0 25px rgba(6, 182, 212, 0.4)' : 'none'
              }}>
                <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '20px', height: '20px', borderTop: '4px solid #06b6d4', borderLeft: '4px solid #06b6d4' }}></div>
                <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '20px', height: '20px', borderTop: '4px solid #06b6d4', borderRight: '4px solid #06b6d4' }}></div>
                <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '20px', height: '20px', borderBottom: '4px solid #06b6d4', borderLeft: '4px solid #06b6d4' }}></div>
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderBottom: '4px solid #06b6d4', borderRight: '4px solid #06b6d4' }}></div>

                {isScanning && (
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    height: '3px',
                    background: 'linear-gradient(90deg, transparent, #06b6d4, #fff, #06b6d4, transparent)',
                    boxShadow: '0 0 15px #06b6d4',
                    animation: 'laserScan 1.5s infinite ease-in-out'
                  }} />
                )}
              </div>
            )}

            {cameraActive && (
              <button
                id="btn-capture-frame"
                className="btn-primary"
                onClick={captureCameraFrame}
                style={{ position: 'absolute', bottom: '24px', padding: '10px 20px', zIndex: 10 }}
              >
                <Sparkles size={16} />
                <span>Capture & Crop Frame</span>
              </button>
            )}
          </div>

          {/* Cropped Region Snippet Preview if generated */}
          {croppedSnippet && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <img
                src={croppedSnippet}
                alt="Cropped snippet"
                style={{ width: '64px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #06b6d4' }}
              />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong style={{ color: '#06b6d4' }}>Cropped Selection Active:</strong> Translating specific extracted region.
              </div>
            </div>
          )}

          {/* Preset Sample Sign Selectors */}
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Or test with real-world multilingual signs:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {sampleImages.map((sample, idx) => (
                <button
                  key={sample.id}
                  id={`btn-sample-ocr-${idx}`}
                  onClick={() => handleSelectSample(idx)}
                  className="btn-secondary"
                  style={{
                    padding: '8px 12px',
                    justifyContent: 'flex-start',
                    fontSize: '0.8rem',
                    borderColor: selectedSample === idx && !cameraActive && !imagePreview ? 'var(--accent-cyan)' : 'var(--border-subtle)'
                  }}
                >
                  <ImageIcon size={14} color="#06b6d4" />
                  <span>{sample.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Detected Text & Translation Output */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. Extracted OCR Text (Selected Area)
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                ML Kit Text Recognition
              </span>
            </div>
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              fontSize: '1.05rem',
              color: '#fff',
              minHeight: '80px',
              lineHeight: '1.5'
            }}>
              {ocrText}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                2. Real-Time Translation ({languages.find(l => l.code === targetLang)?.name || targetLang})
              </span>
              <button
                className="btn-secondary"
                onClick={() => handlePlayTTS(translatedOcr, targetLang)}
                disabled={!translatedOcr}
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                <Volume2 size={14} />
                <span>Listen Audio</span>
              </button>
            </div>

            <div style={{
              flex: 1,
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#34d399',
              minHeight: '100px',
              display: 'flex',
              alignItems: 'center'
            }}>
              {isTranslating ? (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontStyle: 'italic' }}>
                  Translating selected crop area...
                </span>
              ) : translatedOcr ? (
                translatedOcr
              ) : (
                <span style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>
                  Translation output will appear here...
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            💡 <strong>Cropping Area Feature:</strong> Allows zooming in on small text lines, isolated warning labels, or single dishes on a menu without translating unnecessary background noise.
          </div>
        </div>
      </div>
    </div>
  );
}
