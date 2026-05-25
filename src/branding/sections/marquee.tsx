function MarqueeItem() {
  return (
    <div className="marquee-item">
      RUTINAS <span className="dot" /> SESIONES{" "}
      <span className="dot" /> <span className="outline">OFFLINE</span>{" "}
      <span className="dot" /> MÉTRICAS <span className="dot" />{" "}
      <span className="outline">CLIENTES</span> <span className="dot" /> FINANZAS{" "}
      <span className="dot" /> BRANDING <span className="dot" />{" "}
      <span className="outline">PRIVADO</span> <span className="dot" />
    </div>
  );
}

export function MarqueeSection() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        <MarqueeItem />
        <MarqueeItem />
      </div>
    </div>
  );
}
