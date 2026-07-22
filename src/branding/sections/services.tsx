"use client";

import { BRANDING_MODULES } from "@/branding/data/modules";
import { useServicesCarousel } from "@/branding/hooks/use-services-carousel";

export function ServicesSection() {
  const { wrapperRef, barRef } = useServicesCarousel();

  return (
    <section className="services" id="services" data-screen-label="04 Servicios">
      <div className="services-head">
        <h2>
          <span className="num">/ 04</span>Producto
        </h2>
        <div className="services-progress">
          <div>Módulos del sistema</div>
          <div className="bar" ref={barRef} />
        </div>
      </div>
      <div className="services-carousel-frame">
        <div className="services-carousel" ref={wrapperRef}>
          <div className="services-track">
            {BRANDING_MODULES.map((m) => (
              <article
                key={m.num}
                className="service-card"
                data-hover
                data-with-bg={m.bgImage ? "true" : undefined}
                style={
                  m.bgImage
                    ? { backgroundImage: `url(${m.bgImage})` }
                    : undefined
                }
              >
                <div className="service-card-content">
                  <div className="service-num">{m.num}</div>
                  <h3 className="service-title">{m.title}</h3>
                  <p className="service-desc">{m.desc}</p>
                  <div className="service-meta">
                    <span>{m.metaLeft}</span>
                    <span className="blue">{m.metaRight}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        {/* Invisible hover edges — hook targets these for auto-scroll */}
        <div className="services-edge services-edge-left" aria-hidden="true" />
        <div className="services-edge services-edge-right" aria-hidden="true" />
      </div>
    </section>
  );
}
