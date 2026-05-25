import { PREVIEW_EXERCISES } from "@/branding/data/preview-exercises";
import { BRANDING_LOGO_SRC, BRANDING_LOGO_ALT } from "@/branding/assets";

function StatusIcons() {
  return (
    <span className="status-icons">
      {/* signal */}
      <svg width="14" height="9" viewBox="0 0 14 9" fill="currentColor" aria-hidden="true">
        <rect x="0" y="6" width="2" height="3" rx=".4" />
        <rect x="3" y="4" width="2" height="5" rx=".4" />
        <rect x="6" y="2" width="2" height="7" rx=".4" />
        <rect x="9" y="0" width="2" height="9" rx=".4" />
      </svg>
      {/* wifi */}
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
        <path d="M1 4 L7 9 L13 4 C10 1 4 1 1 4Z" fill="currentColor" />
      </svg>
      {/* battery */}
      <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
        <rect x=".5" y=".5" width="18" height="9" rx="2" />
        <rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor" />
        <rect x="20" y="3.5" width="1.5" height="3" rx=".5" fill="currentColor" />
      </svg>
    </span>
  );
}

function NavIcon({ kind }: { kind: "home" | "clients" | "routines" | "exercises" | "finance" }) {
  switch (kind) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V11z" />
        </svg>
      );
    case "clients":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5" />
          <circle cx="17" cy="6" r="2.5" />
          <path d="M15 13c2.5 0 4 1.4 4.5 3.5" />
        </svg>
      );
    case "routines":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case "exercises":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M6 9v6M3 11v2M9 7v10M15 7v10M21 11v2M18 9v6" />
        </svg>
      );
    case "finance":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18M7 15h3" />
        </svg>
      );
  }
}

export function PreviewSection() {
  return (
    <section className="preview" id="preview" data-screen-label="03 Vista previa">
      <div className="preview-glow" />
      <div className="preview-inner">
        <div className="preview-head">
          <div className="section-label">
            <span className="num">/ 03</span>
            Producto en mano
          </div>
          <h2 className="preview-title">
            <span className="outline">VISTA PREVIA</span>
            <span>
              <span className="outline">DE</span>{" "}
              <span className="outline blue">ENTRENADORES</span>
            </span>
          </h2>
          <p className="preview-desc">
            Así se ve tu negocio en la palma de tu mano. Roster de ejercicios, videos,
            filtros por grupo muscular y nivel — todo organizado para que arranques una
            sesión en menos de <strong>10 segundos</strong>.
          </p>
          <div className="preview-meta">
            <span className="on">Ejercicios</span>
            <span>Rutinas</span>
            <span>Clientes</span>
            <span>Finanzas</span>
            <span>+ 12 módulos</span>
          </div>
        </div>

        <div className="phone-stage">
          <div className="phone">
            <div className="phone-island" />
            <div className="phone-screen">
              <div className="app-status">
                <span>9:41</span>
                <StatusIcons />
              </div>

              <div className="app-top">
                <div className="app-brand">
                  <img src={BRANDING_LOGO_SRC} alt={BRANDING_LOGO_ALT} />
                </div>
                <div className="app-avatar">AL</div>
              </div>

              <div className="app-header">
                <h3>Ejercicios</h3>
                <button type="button" className="app-add" aria-label="Agregar ejercicio">
                  +
                </button>
              </div>

              <div className="app-filters">
                <span className="chip on">Todos</span>
                <span className="chip">Bíceps</span>
                <span className="chip">Isquio</span>
                <span className="chip">Espalda</span>
              </div>

              <div className="app-grid">
                {PREVIEW_EXERCISES.map((ex) => (
                  <article key={ex.title} className="ex-card">
                    <div className="ex-thumb">
                      <img src={ex.image} alt={ex.title} />
                    </div>
                    <div className="ex-info">
                      <h4>{ex.title}</h4>
                      <div className="ex-tags">
                        <span className={`tag ${ex.tagClass}`}>{ex.tagLabel}</span>
                        <span className="tag tag-neutral">{ex.equipment}</span>
                      </div>
                      <div className="ex-level">
                        <span className={`dot${ex.dots >= 1 ? " on" : ""}`} />
                        <span className={`dot${ex.dots >= 2 ? " on" : ""}`} />
                        <span className={`dot${ex.dots >= 3 ? " on" : ""}`} />
                        {ex.level}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <nav className="app-nav">
                <button type="button">
                  <NavIcon kind="home" />
                  Inicio
                </button>
                <button type="button">
                  <NavIcon kind="clients" />
                  Clientes
                </button>
                <button type="button">
                  <NavIcon kind="routines" />
                  Rutinas
                </button>
                <button type="button" className="on">
                  <NavIcon kind="exercises" />
                  Ejercicios
                </button>
                <button type="button">
                  <NavIcon kind="finance" />
                  Finanzas
                </button>
              </nav>

              <div className="phone-home" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
