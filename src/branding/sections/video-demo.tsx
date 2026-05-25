"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "blackline-fitness:video-demo-url";

/**
 * Extrae el file ID de varios formatos de URL de Google Drive:
 *  - https://drive.google.com/file/d/{ID}/view?usp=sharing
 *  - https://drive.google.com/file/d/{ID}/preview
 *  - https://drive.google.com/open?id={ID}
 *  - https://drive.google.com/uc?id={ID}&export=download
 *  - Solo el ID pegado solo
 */
function extractDriveFileId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Caso 1: /file/d/{ID}/...
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch) return fileDMatch[1];

  // Caso 2: ?id={ID} o &id={ID}
  const idQueryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idQueryMatch) return idQueryMatch[1];

  // Caso 3: /d/{ID}
  const shortDMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (shortDMatch) return shortDMatch[1];

  // Caso 4: solo el ID (alfanumérico + _ -, mínimo 20 chars típicamente)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;

  return null;
}

/**
 * Construye una URL directa para reproducir como <video src>.
 * Drive a veces bloquea hotlinking de videos; en ese caso cae al iframe.
 */
function buildDirectVideoUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function buildIframeUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function VideoDemoSection() {
  const [storedUrl, setStoredUrl] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [videoFailed, setVideoFailed] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Hidratar desde localStorage tras montar (evita SSR mismatch)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) ?? "";
      setStoredUrl(saved);
      setInputValue(saved);
      setIsEditing(!saved);
    } catch {
      // localStorage bloqueado (modo incógnito estricto, etc.)
    }
    setHydrated(true);
  }, []);

  const fileId = useMemo(() => extractDriveFileId(storedUrl), [storedUrl]);
  const directUrl = fileId ? buildDirectVideoUrl(fileId) : null;
  const iframeUrl = fileId ? buildIframeUrl(fileId) : null;

  const handleSave = useCallback(() => {
    const id = extractDriveFileId(inputValue);
    if (!id) return;
    const clean = inputValue.trim();
    setStoredUrl(clean);
    setVideoFailed(false);
    setIsEditing(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, clean);
    } catch {
      // ignore
    }
  }, [inputValue]);

  const handleClear = useCallback(() => {
    setStoredUrl("");
    setInputValue("");
    setVideoFailed(false);
    setIsEditing(true);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  // Cuando el src del video cambia, re-load para que respete autoplay
  useEffect(() => {
    if (videoRef.current && directUrl && !videoFailed) {
      videoRef.current.load();
    }
  }, [directUrl, videoFailed]);

  const inputIsValid = extractDriveFileId(inputValue) !== null;

  return (
    <section
      className="video-demo"
      id="video-demo"
      data-screen-label="04b Video demo"
    >
      <div className="video-demo-inner">
        <div className="section-label">
          <span className="num">/ 04b</span>
          Demo en accion
        </div>

        <div className="video-demo-content">
          <h2 className="video-demo-title">
            <span className="outline">UN VISTAZO</span>{" "}
            <span className="blue">REAL.</span>
          </h2>

          <div className="video-demo-frame">
            {hydrated && fileId ? (
              videoFailed ? (
                <iframe
                  src={iframeUrl ?? ""}
                  className="video-demo-iframe"
                  title="Demo del producto"
                  allow="autoplay"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  className="video-demo-video"
                  src={directUrl ?? undefined}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  onError={() => setVideoFailed(true)}
                  aria-label="Demo del producto en loop"
                />
              )
            ) : (
              <div className="video-demo-placeholder">
                <span>Pega una URL de Google Drive para mostrar tu video</span>
              </div>
            )}
          </div>

          {(isEditing || !fileId) && (
            <div className="video-demo-input-row">
              <input
                type="url"
                className="video-demo-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://drive.google.com/file/d/..."
                aria-label="URL del video de Drive"
                spellCheck={false}
              />
              <button
                type="button"
                className="video-demo-btn"
                onClick={handleSave}
                disabled={!inputIsValid}
              >
                Cargar
              </button>
            </div>
          )}

          {!isEditing && fileId && (
            <div className="video-demo-actions">
              {videoFailed && (
                <span className="video-demo-hint">
                  Drive bloqueo el hotlinking — usando reproductor embebido.
                </span>
              )}
              <button
                type="button"
                className="video-demo-btn ghost"
                onClick={() => setIsEditing(true)}
              >
                Cambiar URL
              </button>
              <button
                type="button"
                className="video-demo-btn ghost"
                onClick={handleClear}
              >
                Quitar
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
