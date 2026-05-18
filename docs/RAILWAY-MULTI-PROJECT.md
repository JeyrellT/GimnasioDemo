# Railway Pro — Guía multi-proyecto

Guía operacional para hostear múltiples backends en Railway Pro de manera
ordenada y barata. Escrita para JC Analytics — adaptable a cualquier setup
similar.

---

## Modelo mental

Railway tiene 3 niveles de jerarquía:

```
Workspace (= tu cuenta Pro $20/mes, incluye $20 de uso)
└── Project   (= un dominio de negocio: Blackline Fitness, JC Analytics, BarberCR...)
    └── Service (= un proceso: web app, DB, worker, cron job)
```

Cada **Service** tiene su propio:
- Deploy independiente (puede apuntar a un repo o branch distinto)
- Variables de entorno
- Logs y métricas
- Dominio público (auto-generado, podés agregar custom)
- Política de restart

Cada **Project** comparte:
- Variables "shared" entre todos sus services
- Red privada interna (services se hablan por `<service>.railway.internal`)
- Métricas agregadas

---

## ¿Cuándo crear un Project nuevo vs un Service nuevo?

| Situación | Solución |
|---|---|
| Tu app web Next.js | 1 Service en el Project del producto |
| Necesitás Postgres para esa app | Otro Service (template "PostgreSQL") en el mismo Project |
| Querés un cron job que limpia datos viejos | Otro Service en el mismo Project (mismo repo, distinto Dockerfile/start command) |
| Otro producto totalmente distinto (BarberCR vs Blackline Fitness) | **Project separado** |
| Versión staging del producto | **Project separado** (blackline-fitness-staging) o un Environment en el mismo Project |
| API interna que sirve a varios productos | **Project separado** "shared-services" |

**Regla simple:** un Project por dominio de negocio. Services dentro = piezas que colaboran en ese dominio.

---

## Naming convention (importante para que escale)

Patrón: `<proyecto>-<rol>`

```
Workspace: JC Analytics

Project: blackline-fitness
├── blackline-fitness-web          (Next.js app)
├── blackline-fitness-postgres     (DB principal)
├── blackline-fitness-cron         (jobs programados)
└── blackline-fitness-worker       (procesamiento async, si hace falta)

Project: jc-analytics
├── jc-api              (FastAPI/Express API)
├── jc-postgres
└── jc-dashboard        (Next.js dashboard interno)

Project: barber-cr
├── barber-web
└── barber-postgres
```

**Beneficio:** cuando tenés 12 services activos y buscás logs, podés filtrar
por prefijo. Si todo se llama "web", "api", "db" → caos.

---

## Variables de entorno

Railway te deja definir variables en 3 niveles:

| Nivel | Scope | Cuándo usar |
|---|---|---|
| **Service** | Solo ese service | Secrets específicos de la app (NEXTAUTH_SECRET) |
| **Shared (Project)** | Todos los services del proyecto | DB URL, AWS keys, Resend API key, etc. |
| **Plugin reference** | Auto-inyectado de otro service (ej: Postgres URL) | Conectar services dentro del mismo project |

### Patrón recomendado: shared variables por proyecto

En el Project "blackline-fitness":

```
SHARED:
  DATABASE_URL (from blackline-fitness-postgres plugin)
  RESEND_API_KEY
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY

blackline-fitness-web SERVICE-SCOPED:
  NEXTAUTH_SECRET
  GMAIL_APP_PASSWORD
  PORT=3000

blackline-fitness-cron SERVICE-SCOPED:
  CRON_SECRET
```

Cuando cambiás `DATABASE_URL`, se actualiza para todos los services del project automáticamente.

---

## Bases de datos: ¿compartida o separada?

| Caso | ¿Compartir DB? |
|---|---|
| Múltiples services del MISMO producto | Sí (blackline-fitness-web + blackline-fitness-cron usan blackline-fitness-postgres) |
| Productos diferentes (Blackline Fitness vs JC Analytics) | **No** — cada uno su propia DB |
| Microservicios del mismo dominio | Generalmente sí (con buenas políticas de schema) |
| Necesitás aislamiento estricto (clientes B2B distintos) | No, una DB por cliente |

**Defecto:** una DB por Project. Solo separás si hay razón clara (escala, cliente, dominio diferente).

---

## Domains

Cada service en Railway recibe un dominio auto-generado:
```
blackline-fitness-web-production-XXXX.up.railway.app
```

Para producción querés custom:

1. **Service Settings → Networking → Custom Domains** → poné `app.blacklinefitness.io`
2. Railway te da un CNAME → lo apuntás en tu DNS (Cloudflare, Namecheap, etc.)
3. Railway emite cert SSL automático (Let's Encrypt)
4. ~5 min después está activo

Para multi-proyecto típico:
```
blacklinefitness.io           → blackline-fitness-web
app.blacklinefitness.io       → blackline-fitness-web (subdomain)
api.jcanalytics.com → jc-api
barbercr.com        → barber-web
```

---

## Deploys

Railway lo más común: **auto-deploy on push** a una branch.

### Setup recomendado por service

```
blackline-fitness-web:
  Watch path: main branch
  Build: pnpm install && pnpm exec prisma generate && pnpm build
  Start: sh scripts/start.sh
  Healthcheck: /api/health (200 OK)

blackline-fitness-cron:
  Watch path: main branch
  Build: pnpm install
  Start: node scripts/cron.js
  Healthcheck: ninguno (es un proceso background)
```

### Environments / staging

Railway Pro te deja crear "Environments" dentro de un Project (ej: `production` y `staging`). Cada environment tiene sus propias env vars pero comparte la config de los services.

Recomendado:
- `production` → branch `main`
- `staging` → branch `staging`
- Para previews de PRs: PR Environments (auto-creados, se destruyen al cerrar el PR)

---

## Costos: dónde mirar para no llevarte sorpresas

Railway Pro: $20/mes incluyen $20 de uso. Después es pay-as-you-go.

**Consumo típico mensual** (estimaciones):

| Service | Uso aprox/mes |
|---|---|
| Next.js app con tráfico bajo | $2-5 |
| Postgres pequeño (1GB) | $1-3 |
| Cron job que corre cada hora | <$1 |
| Worker async (siempre on) | $3-8 |

3-5 services chicos → cabe dentro de los $20 incluidos.

### Dónde monitorear

1. **Workspace → Usage** → ves el uso del mes en tiempo real
2. **Project → Metrics** → CPU/RAM/network por service
3. **Settings → Usage Alerts** → setear alerta cuando llegues al 75% / 90% del cap

**Configurá una alerta a $18** para tener margen antes de pasar del límite incluido.

---

## Migration playbook (mover un proyecto existente a Railway)

Para mover, por ejemplo, BarberCR desde otro hosting a Railway:

### Checklist

```
[ ] 1. Crear Project nuevo en Railway: "barber-cr"
[ ] 2. Click "+ Add Service" → "GitHub Repo" → conectar el repo
[ ] 3. Railway detecta el stack y arma el build automáticamente
[ ] 4. Agregar Postgres: "+ Add Service" → "Database" → "PostgreSQL"
[ ] 5. Copiar env vars del hosting anterior:
        - Project → Shared Variables → Raw Editor → pegás todas
[ ] 6. Setear DATABASE_URL = ${{ Postgres.DATABASE_URL }} (referencia al plugin)
[ ] 7. Migrar la DB:
        - Si es un dump SQL: `psql ${RAILWAY_DB_URL} < dump.sql`
        - Si es Prisma: `pnpm exec prisma migrate deploy`
[ ] 8. Validar el deploy: ver logs, hacer requests a /api/health
[ ] 9. Conectar dominio custom (si aplica)
[ ] 10. Apagar el hosting anterior
```

Tiempo total para un proyecto chico-mediano: 1-2 horas.

---

## Errores comunes a evitar

| Error | Consecuencia | Cómo evitar |
|---|---|---|
| Hardcodear DB URLs en código | No podés rotar credenciales | Usar `process.env.DATABASE_URL` |
| Skip de healthchecks | Railway no sabe si tu app está viva → no auto-restart | Siempre exponer `/api/health` |
| Migraciones en build, no en start | Build se cachea → migraciones no corren en re-deploys | Correr migrate en start.sh |
| Todo en un Service gigante | Si un componente falla, se cae todo | Separar web / cron / worker en services distintos |
| Hardcodear el PORT | Railway asigna PORT dinámico | Usar `process.env.PORT \|\| 3000` |
| No setear restartPolicy | App se cae y queda muerta | `restartPolicyType = "ON_FAILURE"` en railway.toml |
| Compartir DB entre productos distintos | Acoplamiento, riesgo cross-tenant | DB separada por dominio de negocio |
| No usar Environments (production/staging) | Probás en producción 😱 | Crear environment "staging" antes |

---

## Stack recomendado para nuevos proyectos en Railway

Para que cada proyecto nuevo siga el mismo patrón (consistencia ahorra horas):

```
Stack base por proyecto:
- Next.js 15 (App Router) — frontend + API routes
- Prisma + PostgreSQL — DB con migraciones
- NextAuth v5 — auth
- Resend — email transaccional (UNA cuenta para TODOS los proyectos, $0)
- Cloudflare R2 — storage de archivos
- Sentry — error tracking
- pino — logs estructurados (JSON)
- Railway healthcheck en /api/health
- start.sh con prisma migrate deploy + retries
```

Esto es lo que ya tenés en blackline-fitness. Replicarlo en otros proyectos = ramp-up cero.

---

## Roadmap inmediato (próximos pasos sugeridos)

### Esta semana
1. ✅ Upgrade Railway Pro
2. ✅ Validar email SMTP con `/api/health/email`
3. Crear alerta de uso a $18 en Workspace settings

### Próximas 2 semanas
4. Agregar `staging` environment al proyecto blackline-fitness
5. Documentar tu propio runbook de deploys (qué hacer si algo falla)

### Cuando agregues el próximo proyecto
6. Crear Project nuevo (no Service nuevo en blackline-fitness)
7. Seguir el naming convention de arriba
8. Cuenta de Resend = la misma (verificás dominio nuevo para el remitente)
9. Postgres = uno nuevo por proyecto

---

## Comandos útiles del Railway CLI

```bash
# Instalar
npm i -g @railway/cli

# Login
railway login

# Linkear repo local a un service de Railway
railway link

# Ver logs en vivo
railway logs

# Correr un comando con las env vars del service
railway run pnpm exec prisma migrate deploy

# Conectarse al Postgres de Railway desde tu PC
railway connect postgres

# Ver variables (sin valores)
railway variables
```

Útil para debugging local con datos reales.

---

## Recursos

- Doc oficial: https://docs.railway.com/
- Status: https://status.railway.app/
- Discord (soporte comunidad): https://discord.gg/railway
- Templates oficiales: https://railway.com/templates

---

_Última actualización: 2026-05-18. Documento mantenido por backend-api._
