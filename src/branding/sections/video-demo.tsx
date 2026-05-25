"use client";
import { useEffect, useRef } from "react";

export function VideoDemoSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            video.muted = false;
            video.play().catch(() => {
              // Safari y browsers estrictos bloquean autoplay con audio —
              // fallback: silenciado pero reproduciendose
              video.muted = true;
              void video.play();
            });
          } else {
            video.muted = true;
            video.pause();
          }
        }
      },
      { threshold: [0, 0.5, 1] },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

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
            <video
              ref={videoRef}
              className="video-demo-video"
              src="/branding/demo.mp4"
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Demo del producto en loop con audio dinamico al entrar al viewport"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
