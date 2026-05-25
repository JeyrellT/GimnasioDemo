"use client";

import { BRANDING_MODULES } from "@/branding/data/modules";
import { useServicesSticky } from "@/branding/hooks/use-services-sticky";

export function ServicesSection() {
  const { sectionRef, trackRef, barRef } = useServicesSticky();

  return (
    <section
      className="services"
      id="services"
      data-screen-label="04 Servicios"
      ref={sectionRef}
    >
      <div className="services-sticky">
        <div className="services-head">
          <h2>
            <span className="num">/ 04</span>Producto
          </h2>
          <div className="services-progress">
            <div>Módulos del sistema</div>
            <div className="bar" ref={barRef} />
          </div>
        </div>
        <div className="services-track" ref={trackRef}>
          {BRANDING_MODULES.map((m) => (
            <article key={m.num} className="service-card" data-hover>
              <div className="service-num">{m.num}</div>
              <h3 className="service-title">{m.title}</h3>
              <p className="service-desc">{m.desc}</p>
              <div className="service-meta">
                <span>{m.metaLeft}</span>
                <span className="blue">{m.metaRight}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
