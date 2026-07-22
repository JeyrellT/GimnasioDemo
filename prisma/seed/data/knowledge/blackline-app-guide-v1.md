# Manual del Producto Blackline Fitness — Arquitectura, Flujos, Reglas de Negocio y Capacidades del Asistente

> Documento de contexto para el asistente IA de Blackline Fitness. Complementa el corpus científico (`fitness-base-cr-v1`) con conocimiento operacional del producto: rutas, modelos, flujos, límites y dónde vive cada feature.

---

## TL;DR

Blackline Fitness es una PWA en español-CR para entrenadores personales: portal del coach (`/trainer/*`) + portal del cliente (`/client/*`) + sección admin. Stack: Next.js 15 + Prisma 6 + PostgreSQL + Auth.js 5 + Gemini 2.5 Flash. Tres tiers (SOLO 5 clientes / PRO 25 / STUDIO 60). El asistente IA expone 13 tools (6 lectura + 7 escritura con confirmation card). Los detalles cuantitativos viven en secciones específicas — buscar antes de citar.

## Key Findings

Hechos que el asistente debe interiorizar (cada uno tiene su sección dedicada con detalles):

1. **Snapshot frozen**: una `AssignedRoutine` congela el template al asignar — el cliente nunca ve ediciones posteriores hasta nueva asignación. Ver §14.4.
2. **Quota de mediciones**: 4/mes + 1/semana ISO. Ver §11.2.
3. **PAR-Q es prerequisito de programación**. `parqStatus = RED` bloquea carga; `REVIEW` requiere autorización médica documentada. Ver §12.4.
4. **Una sesión `IN_PROGRESS` por cliente**, máximo. Modo libre disponible (`isFreeWorkout: true`). Ver §5.1.
5. **El asistente NO usa los pipelines OCR validados** — usa visión nativa de Gemini. Para datos críticos, derivar a la UI dedicada (`/trainer/rutinas/importar`, `MeasurementSheet`). Ver §13.7.
6. **El `clientId` correcto antes de todo write**. Resolver con `list_my_clients` o usar sticky client. Ver §9.4.

---

## Details

### 1. Arquitectura general

#### 1.1 Stack técnico

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind v4 + Zustand para estado UI + shadcn/ui patterns.
- **Backend**: Server Actions de Next.js (no API routes) + Prisma 6.19 + PostgreSQL.
- **Auth**: Auth.js 5 beta con Credentials provider (email + scrypt password) + magic link soportado.
- **AI**: Gemini 2.5 Flash vía `@google/generative-ai` 0.21, browser-direct (API key en localStorage del trainer, no en server).
- **PWA**: Serwist 9 (workers + offline cache para sesiones del cliente).
- **Storage**: S3-compatible (MinIO local / Cloudflare R2 prod) para fotos y documentos.
- **Search**: PostgreSQL `tsvector` con triggers en español para Exercise y KnowledgeChunk.
- **Localización**: español-CR voseo, timezone `America/Costa_Rica`, moneda CRC, IVA 13%.

#### 1.2 Roles y portales

| Rol | Path raíz | Cómo se obtiene |
|---|---|---|
| `TRAINER` | `/trainer/*` | Sign-up directo (con trial 30 días) |
| `CLIENT` | `/client/*` | Solo por invitación de un trainer (`quick_add_client` o onboarding wizard) |
| `ADMIN` | `/admin/*` | Asignado manualmente; modera contenido y referrals |
| `SUPER_ADMIN` | `/admin/*` (con tabs extra) | Asignación manual; puede suspender usuarios |

El layout `src/app/(app)/layout.tsx` enruta según `session.user.role`. Coaches y clientes nunca comparten URL — si un cliente intenta `/trainer/*` recibe `403`.

#### 1.3 Rutas del trainer

```
/trainer/
├─ inicio (en /inicio, fuera de /trainer)  → Dashboard con KPIs
├─ clientes/
│   ├─ page                                 → Lista clientes, filtros
│   ├─ invitar                              → Inicia onboarding TRAINER_SIDE
│   ├─ onboarding/[draftId]                 → Wizard 9 pasos
│   └─ [clientId]/
│       ├─ page                             → Tabs: perfil, métricas, notas, rutinas, sesiones
│       ├─ metricas                         → Historial mediciones (tabla)
│       ├─ notas                            → Notas privadas trainer-client
│       ├─ rutinas                          → Rutinas asignadas al cliente
│       └─ sesiones                         → Historial de WorkoutSession del cliente
├─ rutinas/
│   ├─ page                                 → Catálogo: activas/archivadas
│   ├─ nueva                                → Crear template (goal, splitDays, weeks)
│   ├─ importar                             → OCR foto/screenshot → Gemini → preview editable
│   └─ [routineId]/
│       ├─ page                             → Editor de días y ejercicios
│       └─ asignar                          → Asignar a cliente con startsOn/endsOn
├─ ejercicios/
│   ├─ page                                 → Biblioteca pública + privados, FTS
│   ├─ nuevo                                → Crear ejercicio del trainer
│   └─ [exerciseId]/{page,editar}           → Detalle + edición
├─ calentamientos/                          → Igual que ejercicios pero category=WARMUP
├─ finanzas/
│   ├─ page                                 → Dashboard mensual
│   ├─ nuevo                                → Registrar movimiento manual
│   ├─ movimientos                          → Tabla filtrable
│   └─ ubicaciones                          → Locales (FLAT/PER_KM cost models)
├─ facturacion                              → Lista facturas Hacienda 4.4
├─ ajustes                                  → Perfil, branding, Gemini key, referrals
└─ asistente                                → Chat IA (esta página)
```

#### 1.4 Rutas del cliente

```
/client/
├─ bienvenida                               → Primer login, set password + name
├─ rutinas                                  → Rutinas asignadas (ACTIVE/COMPLETED/ARCHIVED)
├─ sesion/
│   ├─ page                                 → Preview del día sin grabar
│   └─ [sessionId]                          → Sesión en vivo (graba sets, PRs, offline-sync)
├─ mediciones/
│   ├─ page                                 → Historial + quota mensual/semanal
│   └─ nueva                                → Form registrar (peso, grasa, circunferencias)
├─ progreso                                 → Sesiones completadas, sets totales, minutos
├─ fotos                                    → Galería progreso (placeholder, pendiente cloud)
└─ entrenador                               → Info del coach (branding, contacto)
```

#### 1.5 Rutas del admin

Solo accesible para `ADMIN` y `SUPER_ADMIN`. El asistente IA NO tiene tools para esta área — el coach normal nunca la usa, pero el SUPER_ADMIN puede preguntar.

- `/admin` — dashboard con KPIs globales (usuarios totales, trainers activos, sesiones del último período).
- `/admin/users` — lista de todos los usuarios, búsqueda, badge de rol y estado. Click → detalle del usuario. Acciones: suspender (`User.suspendedAt`), des-suspender, promover/demover rol, e (solo SUPER_ADMIN) **impersonation** (`startImpersonation` / `stopImpersonation` para debuggear como otro usuario).
- `/admin/subscriptions` — todas las `TrainerSubscription`. Filtros por status (TRIAL, ACTIVE, PAST_DUE, READ_ONLY, CANCELLED). Acciones: extender trial, cancelar, marcar PAID.
- `/admin/referrals` — `Referral[]` para review/aprobar/rechazar. Stats globales del programa.
- `/admin/biblioteca`, `/admin/lpdp`, `/admin/usuarios` — **placeholders "Próximamente"**, no operativos en v1.x.

#### 1.6 Otras rutas globales

- `/inicio` — landing del usuario autenticado (dashboard según rol).
- `/perfil` — **perfil global accesible para TODOS los roles** (trainer / cliente / admin). Distinto de `/trainer/ajustes`: aquí el usuario edita avatar, contraseña, datos básicos, opt-in de push notifications, y hace sign-out. Es la **única ruta para cambiar contraseña** de cualquier rol.
- `/trainer/ajustes` — específico del trainer: branding, Gemini API key, referrals, perfil profesional (tradeName, specialty, bio, defaultMonthlyPriceCRC). NO incluye contraseña (eso vive en `/perfil`).

#### 1.7 Notificaciones

`Notification` es un modelo persistido para alertas in-app. Tipos: `ROUTINE_ASSIGNED` (cliente recibe), `SESSION_COMPLETED` (trainer recibe), `ROUTINE_COMMENT` (cualquiera de los dos), `SUBSCRIPTION_PAYMENT_DUE`, `PARQ_REVIEW_REQUIRED`. Actions: `getNotifications`, `markNotificationRead`, `markAllNotificationsRead`.

**El asistente IA NO tiene tools para acceder a notifications** — son read-only en la UI (badge en el header del trainer + lista colapsable). Si el coach pregunta "¿qué notificaciones tengo?", el asistente debe derivar a esa UI, no inventar contenido.

#### 1.8 Diferencias clave coach vs cliente

| Capacidad | Coach | Cliente |
|---|---|---|
| Ver finanzas / facturación | ✔ | ✘ |
| Ver otros clientes | ✔ | ✘ (solo su propio coach) |
| CRUD ejercicios | ✔ | ✘ (solo lectura en la rutina) |
| Crear/editar/asignar rutinas | ✔ | ✘ (solo lectura del snapshot) |
| Ejecutar `WorkoutSession` | ✘ (puede modo libre) | ✔ (sobre su rutina asignada) |
| Registrar `BodyMetric` propio | ✘ | ✔ (con quota) |
| Recibir notificaciones del otro lado | ✔ (sesión completada) | ✔ (rutina asignada) |
| Editar/borrar `BodyMetric` ya registrado | ✘ | ✘ (inmutable post-creación) |

---

### 2. Módulo Clientes

#### 2.1 Lista y búsqueda

`/trainer/clientes` muestra una lista ordenada por status (ACTIVE → PENDING → PAUSED → ENDED) y luego por nombre. La búsqueda es por nombre/email vía `listMyClients(search, status)`. Cada fila trae:
- Avatar + nombre
- `parqStatus` como badge (verde / ámbar / rojo / sin completar)
- `Goal` del perfil
- `monthlyPriceCRC` formateado
- Última `WorkoutSession.completedAt`
- Adherencia 7d como porcentaje

#### 2.2 Onboarding wizard (9 pasos)

Acceso: botón "Nuevo cliente" → `/trainer/clientes/invitar` → "Empezar onboarding".
Crea un `OnboardingDraft` con `mode: TRAINER_SIDE` y redirige a `/trainer/clientes/onboarding/[draftId]`.

Los 9 steps (en orden real según los componentes `step-1` … `step-9` del wizard):
1. **Datos básicos**: nombre, email, fecha de nacimiento, género.
2. **Cédula (opcional)**: OCR de cédula CR vía Gemini. **STUB server-side** — `extractCedulaForOnboarding` retorna `OCR_NOT_IMPLEMENTED`; la integración está pendiente. El parser puro existe en `src/lib/ai/ocr-cedula.ts`.
3. **Fotos de bitácora previa (opcional)**: hasta 3 fotos de logs de entrenamiento del cliente para inferir nivel + frecuencia. Usa `extract-workout-photos`. **STUB server-side** (`PHOTO_ANALYSIS_NOT_IMPLEMENTED`).
4. **PAR-Q+**: cuestionario salud binario con follow-ups. Calcula `parqStatus` final (NOT_COMPLETED / GREEN / REVIEW / RED).
5. **Antropometría**: altura, peso, circunferencias completas (19 campos L/R) — se persisten via `BodyMetric` post-onboarding.
6. **Fotos de progreso inicial**: vistas FRONT / SIDE_LEFT / SIDE_RIGHT / BACK. Sube directo a S3 con presigned URL.
7. **Meta y notas**: `Goal` (FAT_LOSS / MUSCLE_GAIN / MAINTENANCE / PERFORMANCE / GENERAL_HEALTH) + free-text goalNotes. `monthlyPriceCRC` se setea acá también (no es step separado).
8. **Consentimientos LPDP**: 4 tipos obligatorios (TERMS_AND_PRIVACY, HEALTH_DATA, AI_PROCESSING, MARKETING). Aprobar AI_PROCESSING activa `aiConsentGranted = true` que es prerequisito para cualquier OCR/Gemini sobre datos del cliente.
9. **Review + submit**: `completeOnboarding()` crea User (rol CLIENT, password provisional), `ClientProfile`, `TrainerClient` (status PENDING → ACTIVE al primer login del cliente), todas las `Consent` rows y opcionalmente las `MedicalCondition` que el coach haya capturado en steps previos.

Alternativa rápida sin wizard: `quickAddClient({ email, name? })` solo necesita email; manda invitación por SMTP y devuelve `welcomeUrl` por si el envío falla.

#### 2.3 Perfil de cliente y tabs

`/trainer/clientes/[clientId]` carga vía `getClientProfileDetail()`. Tabs:
- **Perfil**: datos básicos, profile, PAR-Q status, condiciones médicas.
- **Métricas**: latest + history (12 semanas).
- **Notas**: campo único `TrainerClient.notesPrivate` (texto largo, solo trainer ve — enforced por API guards). La acción se llama `updateTrainerNotes` pero el campo en DB es `notesPrivate`. No confundir con `AssignedRoutine.trainerNotes` que es la nota específica al asignar UNA rutina.
- **Rutinas**: `AssignedRoutine[]` (todas las versiones, no solo ACTIVE).
- **Sesiones**: `WorkoutSession[]` últimas 50.

Stats que el asistente recibe vía `get_client_profile`: `totalSessions`, `currentStreak`, `alertsCount`, `weightDelta28d` (kg), `bodyFatDelta28d` (puntos %), `adherence7d` y `adherence30d` (0..1).

#### 2.4 Acciones disponibles sobre el cliente

Desde el perfil:
- Asignar rutina (lleva a `/trainer/rutinas/[routineId]/asignar` con `clientId` pre-poblado)
- Registrar medición (abre `MeasurementSheet` con `ScaleOcrUploader`)
- Actualizar precio mensual (`updateClientPrice`)
- Pausar / reanudar relación (`pauseClient` / `resumeClient`)
- Terminar relación (`endRelationship`) → status ENDED, no se borra historial
- Editar notas privadas (`updateTrainerNotes`)

---

### 3. Módulo Rutinas

#### 3.1 Catálogo y filtros

`/trainer/rutinas` lista plantillas (`RoutineTemplate[]`) del trainer activo. Filtros: por `goal`, por archivada/activa, por días de split. Cada tarjeta: nombre, goal con icono+color, splitDays, durationWeeks, días desde update.

#### 3.2 Crear rutina nueva

`/trainer/rutinas/nueva` → form: nombre (2-100 chars), `goal` (enum o custom), `splitDays` (1-6, `ROUTINE_MAX_DAYS_PER_WEEK`), `durationWeeks` (default 8). Click crear → `createRoutineTemplate()` genera el template + N `RoutineDay` vacíos con `name: "Día 1", "Día 2", …`.

#### 3.3 Importar desde imagen (OCR de rutina)

`/trainer/rutinas/importar` es el flujo OCR dedicado:
1. Upload foto/screenshot (JPG/PNG/WebP/HEIC ≤10MB — más permisivo que los otros OCR de 5MB).
2. `extractRoutineFromImage(file)` corre 100% client-side, llama Gemini con `ROUTINE_OCR_PROMPT v1` y schema estricto.
3. Output: `{ name, goal, splitDays 1-6, durationWeeks 1-52, days[].exercises[] }`. Soft fixes: silent swap si `targetRepsMin > targetRepsMax`, reconcile si `splitDays !== days.length`.
4. Preview editable: el coach edita nombres, sets, reps antes de confirmar.
5. Confirmar → `createRoutineFromOcr({...})` server action: crea template + días + matchea ejercicios contra catálogo (exact case-insensitive → fuzzy contains → inferencia por similitud → fallback con metadata inferida).

**Para rutinas de >2 días o con notación atípica**, recomendar este flujo en vez de la visión del asistente: el pipeline tiene validación tipada que el asistente no aplica.

#### 3.4 Editor de rutina

`/trainer/rutinas/[routineId]` muestra:
- Encabezado editable (nombre, goal, durationWeeks).
- Acordeón por `RoutineDay`: drag-drop para reordenar días.
- Dentro de cada día: lista de `RoutineExercise` con drag-drop, en cada uno: targetSets, targetRepsMin/Max, restSeconds, targetRpe, tempo, supersetGroup, notes.
- Botón "Agregar día" (hasta 6).
- Botón "Agregar ejercicio" → modal con búsqueda en catálogo + opción de crear privado in-line.

#### 3.5 Asignar a cliente

`/trainer/rutinas/[routineId]/asignar`: selecciona cliente (solo ACTIVE), `startsOn` (fecha futura o hoy), `trainerNotes` opcional. `endsOn` se calcula automático desde `durationWeeks`.

Server action `assignRoutineToClient` hace en transacción:
1. Cancela cualquier `AssignedRoutine` ACTIVE previa del cliente (si existe).
2. Construye el **snapshot frozen** (`buildSnapshot()`) con todos los días y ejercicios resueltos a sus IDs + nombres.
3. Crea `AssignedRoutine` con `snapshotJson` y status ACTIVE.
4. Crea `Notification` tipo `ROUTINE_ASSIGNED` para el cliente.

Una vez creado, el snapshot es inmutable. Si el coach edita el `RoutineTemplate` después, el cliente sigue viendo la versión original hasta que se asigne uno nuevo.

#### 3.6 Límites de rutina

- `ROUTINE_MAX_DAYS_PER_WEEK`: 6
- `ROUTINE_MAX_EXERCISES_PER_DAY`: 20
- `ROUTINE_MAX_SETS_PER_EXERCISE`: 10
- `ROUTINE_DEFAULT_DURATION_WEEKS`: 8
- `RPE_MIN` / `RPE_MAX`: 1 / 10
- `FATIGUE_SCALE_MIN` / `FATIGUE_SCALE_MAX`: 1 / 10

---

### 4. Módulo Ejercicios

#### 4.1 Catálogo

`/trainer/ejercicios` carga `Exercise[]` con visibilidad: `isPublic = true` (catálogo global, sembrado de Free Exercise DB con ~870 ejercicios) + privados del trainer (`createdById = currentUser`). FTS por `searchVector` (español, pesos A/B/C en nameEs/nameEn/instructionsEs).

Filtros: `primaryMuscle` (enum 14 valores: CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, FOREARMS, ABS, OBLIQUES, GLUTES, QUADS, HAMSTRINGS, CALVES, NECK, FULL_BODY), `equipment` (8 valores), `difficulty` (BEGINNER / INTERMEDIATE / ADVANCED), `category` (STRENGTH / WARMUP).

#### 4.2 Ejercicios privados

Cuando un trainer crea un ejercicio que no existe en el catálogo (vía `/trainer/ejercicios/nuevo` o vía el asistente con `create_private_exercise`), se persiste con `isPublic: false` y `createdById: trainer.id`. Solo lo ve ese trainer.

Cuando `createRoutineFromOcr` no matchea un ejercicio del OCR contra el catálogo, también crea uno privado pero infiere metadata por similitud token-based con catálogo existente (no usa defaults genéricos `FULL_BODY/OTHER`).

#### 4.3 Calentamientos

`/trainer/calentamientos/*` es la misma UX de ejercicios filtrada por `category: "WARMUP"`. Se diferencian en el rendering (icono `Flame` en vez de `Dumbbell`) y en que los calentamientos no entran en los meta-cálculos de volumen/MAV/MRV. Sembrado tiene un set base de ~30 calentamientos (móvil articular, activación, etc.).

---

### 5. Módulo Sesiones

#### 5.1 Iniciar sesión (cliente)

Cliente en `/client/rutinas` → click día → `startSession({ assignedRoutineId, dayIndex })`. Server:
1. Verifica que no haya `WorkoutSession` con status `IN_PROGRESS` para este cliente — si existe, retorna `CONFLICT_ACTIVE_SESSION` con el `sessionId` actual.
2. Lee el snapshot del día desde `AssignedRoutine.snapshotJson.days[dayIndex]`.
3. Crea `WorkoutSession` con status `IN_PROGRESS`, `dayIndex`, `startedAt: now`.
4. Devuelve `{ sessionId, daySnapshot, isFreeWorkout: false }`.

**Modo libre**: cliente sin rutina activa puede empezar `WorkoutSession` sin `assignedRoutineId` ni `dayIndex`. Útil para sesiones improvisadas; se loguean sets pero no entran al cálculo de adherencia.

#### 5.2 Registrar sets en vivo

Cada set del cliente → `recordSet({ sessionId, exerciseId, setNumber, weightKg?, reps?, rpe?, restTakenSec?, isWarmup?, failed?, notes? })`:
1. Valida que la sesión sea suya y esté `IN_PROGRESS` (`assertSessionOwnerInProgress`).
2. Valida `rpe` en `[RPE_MIN, RPE_MAX]` = `[1, 10]`.
3. Si no es `isWarmup` y tiene `weightKg + reps`: detecta PR comparando contra historial del usuario para ese `exerciseId` (`isPersonalRecord()` pure function). `prType` puede ser `"weight"` / `"volume"` / `"reps_at_weight"`.
4. Persiste `PerformedSet` con `isPr: boolean`, `prType: string | null`.

#### 5.3 Sync offline

La UI del cliente en `/client/sesion/[sessionId]` mete cada set en una cola local (IndexedDB via `dexie`) **antes** de mandar al server. Si pierde red:
- Sigue grabando localmente sin bloquear UX.
- Cola persiste hasta reconexión.
- Al volver online, drena la cola en orden + `Promise.allSettled` para no bloquear si uno falla.
- Conflicts: si el set ya existe server-side (`setNumber` duplicado), el local se descarta.

Esta cola es transparente al asistente — desde su POV `recordSet` siempre "funciona", pero el coach NO debería intentar grabar sets via chat porque la cola offline solo está activa en `/client/sesion/[sessionId]`.

#### 5.4 Completar sesión

Cliente toca "Completar sesión" → `completeSession({ sessionId, subjectiveFatigue, bodyWeightKg?, notes? })`:
1. Valida ownership + status `IN_PROGRESS`.
2. Calcula `totalDurationSec = now - startedAt`.
3. Cambia status a `COMPLETED`, persiste `subjectiveFatigue (1-10)`, `bodyWeightKg`, `notes`.
4. Crea `Notification` tipo `SESSION_COMPLETED` para el trainer.
5. Recalcula `currentStreak` y adherencia 7d/30d del cliente.

Sesiones `COMPLETED` son inmutables. Para sesiones interrumpidas: `abortSession({ sessionId })` cambia a `ABORTED` (también inmutable, no cuenta para adherencia).

#### 5.5 Vista del trainer

`/trainer/clientes/[clientId]/sesiones` muestra las últimas N sesiones del cliente. Click una → detalle read-only: día, ejercicios, sets, PRs detectados, fatiga subjetiva, peso corporal del día, notas. El trainer **no puede editar** sets de sesión completada.

Si el trainer quiere comentar sobre la rutina/sesión, usa `addRoutineComment(assignedRoutineId, body)` que persiste un `RoutineComment` visible para ambos lados.

---

### 6. Módulo Métricas y Progreso

#### 6.1 BodyMetric — quota y fields

`BodyMetric` campos: `weightKg`, `bodyFatPct`, `muscleMassKg`, y circunferencias en cm (`waistCm`, `hipCm`, `neckCm`, `chestCm`, `armCm`, `thighCm`). `source` puede ser `MANUAL`, `OCR_SCALE` (cuando viene de `ocr-scale.ts`), `CONNECTED_DEVICE` (smartwatch / báscula bluetooth, planificado).

**Quota** (validada server-side en `recordBodyMetric` y replicada en el portal cliente):
- 4 mediciones por **mes calendario** por cliente
- 1 medición por **semana ISO** (lunes-domingo)

El asistente debe respetar — si propone una y excede, el server rechaza con `MEASUREMENT_QUOTA_EXCEEDED`. Recomendación: antes de proponer registro, llamar `get_client_profile` y revisar última `latestMetric.recordedAt`.

#### 6.2 Fotos de progreso

`ProgressPhoto` con `view` (FRONT / SIDE_LEFT / SIDE_RIGHT / BACK), `weightKg` al momento de la foto, `recordedAt`. Storage en S3 con presigned URLs TTL 5 min.

Flujo: `initProgressPhotoUpload({view, weightKg?})` → devuelve `{photoId, presignedUrl, presignedFields}`. Cliente sube directo a S3, luego `confirmProgressPhoto(photoId)` marca como verificada.

`MAX_PHOTO_SIZE_BYTES`: 10MB. `PHOTO_JPEG_QUALITY`: 80. `PHOTO_MAX_DIMENSION_PX`: 1920.

#### 6.3 Dashboard de progreso del cliente

`/client/progreso` muestra:
- Sesiones completadas (últimas 4 semanas, todo histórico)
- Sets totales y minutos acumulados
- Streak actual (días consecutivos con sesión)
- Delta peso 28d, delta %grasa 28d
- Latest metric con BMI calculado

#### 6.4 Métricas para el coach

`/trainer/clientes/[clientId]/metricas` muestra el mismo historial pero con capacidad de filtros por tipo de métrica y rango de fechas. El trainer puede registrar `BodyMetric` para el cliente (`recordBodyMetric({ clientUserId: ... })` — el server verifica ownership con `assertOwnsClient`).

---

### 7. Módulo Finanzas

#### 7.1 Dashboard

`/trainer/finanzas` con selector de período (mes default). KPIs:
- Ingresos del mes (suma de `ClientCharge.amountCRC` PAID + `OneOffSale.amountCRC` PAID)
- Gastos del mes (`TrainerExpense.amountCRC` filtrado por mes)
- Margen (ingresos - gastos)
- Visitas a ubicaciones (`LocationVisit`)

#### 7.2 Movimientos

`/trainer/finanzas/movimientos` tabla unificada de ingresos + gastos. Filtros por categoría, fecha, monto.

**Categorías de gasto** (enum `ExpenseCategory`): TRANSPORTE, ALQUILER_ESPACIO, EQUIPO, MARKETING, EDUCACION, SOFTWARE, COMIDAS, IMPUESTOS, SERVICIOS_PROFESIONALES, OTROS.
**Categorías de ingreso** (enum `IncomeCategory`): SESION_PT, EVALUACION_INICIAL, PLAN_NUTRICIONAL, CLASE_GRUPAL, ASESORIA_ONLINE, PRODUCTO, OTROS.

#### 7.3 Ubicaciones

`/trainer/finanzas/ubicaciones` gestiona `TrainerLocation`. Cada una tiene `kind` (HOME / GYM / STUDIO / CLIENT_HOME / OUTDOOR / OTHER) y `costModel` (FLAT con `flatCostCRC`, o PER_KM con `costPerKmCRC`). HYBRID está reservado pero no implementado.

`LocationVisit` registra cuándo el coach fue a una ubicación (auto-genera `TrainerExpense` con categoría TRANSPORTE según `costModel`).

#### 7.4 Facturación electrónica

`/trainer/facturacion` lista `Invoice[]` emitidas vía integración Hacienda 4.4 (DGT Costa Rica). Estados: DRAFT, SIGNED, ACCEPTED, REJECTED, FAILED. Genera XML firmado + PDF para cada `ClientCharge` o `OneOffSale` PAID.

`CABYS_CODE_FITNESS_SERVICES`: 9000000000000. `PAIS_ISO_COSTA_RICA`: 506. `HACIENDA_DEFAULT_SUCURSAL`: 001. IVA 13% incluido en los montos.

---

### 8. Módulo Ajustes

#### 8.1 Perfil del trainer

`/trainer/ajustes` muestra y edita los datos del `TrainerProfile`: `tradeName` (nombre comercial que aparece en facturas y en el portal del cliente), `specialty` (texto libre), `bio`, `defaultMonthlyPriceCRC` (precio sugerido al onboard de nuevos clientes), `certifications` (lista de texto libre). El email del trainer se cambia desde `/perfil`, no acá. Para cambiar contraseña: `/perfil`. Para cambiar avatar: `/perfil`.

#### 8.2 Branding

Logo (URL en `TrainerProfile.logoUrl`) + color brand. Aparece en facturas, página `/client/entrenador` que ve el cliente, y en el header del portal cliente.

#### 8.3 API Key de Gemini

Campo dedicado en `/trainer/ajustes`. Se guarda **en localStorage del browser**, NO en el server. Razón: cada trainer paga su propia cuota a Google.

`hasGeminiKey()` y `getGeminiKey()` en `src/lib/demo/settings-store.ts` lo leen.

Sin key configurada, las features de OCR e IA tiran `GEMINI_KEY_MISSING` con un mensaje que apunta a `/trainer/ajustes`.

#### 8.4 Referrals

`/trainer/ajustes` también tiene la sección de Referidos. Un trainer comparte un link con su `Referral.code`. Otro trainer se registra con ese código → ambos reciben créditos o descuentos según política activa.

---

### 9. Módulo Asistente IA

#### 9.1 Cómo funciona

El asistente vive en `/trainer/asistente` (página dedicada) + un FAB flotante en cualquier página del trainer que es lanzador (navega a la página). Una sola conversación persistida en IndexedDB compartida entre las dos superficies.

Engine: `src/lib/ai/agent/agent-runtime.ts` con `runAgent()` y `resumeAgent()`. Gemini 2.5 Flash via `chatWithTools()` con function calling nativo. Cap de 5 iteraciones por turno.

#### 9.2 Tools de lectura (6, sin confirmación)

Las read tools se ejecutan inmediatamente cuando el modelo las invoca:

| Tool | Server action | Caso de uso |
|---|---|---|
| `list_my_clients` | `listMyClients` | Resolver nombre → clientId |
| `search_exercises` | `searchExercises` | Buscar en catálogo + privados |
| `list_my_routines` | `listMyRoutines` | Plantillas del trainer |
| `get_client_profile` | `getClientProfileDetail` | Datos completos cliente (PARQ, métricas recientes, adherencia) |
| `get_routine_detail` | `getRoutine` | Detalle con `routineDayId` de cada día |
| `search_knowledge` | `searchKnowledge` | RAG sobre corpus científico + este manual |

#### 9.3 Tools de escritura (7, con confirmación)

Cada write tool muestra una **ConfirmationCard** al coach antes de ejecutar. El runtime pausa el loop, espera click, y reanuda con `resumeAgent({ decision: "approve" | "reject" })`.

| Tool | Server action | Caso de uso |
|---|---|---|
| `create_routine` | `createRoutineTemplate` | Plantilla vacía con N días |
| `create_routine_from_ocr` | `createRoutineFromOcr` | Rutina completa en una llamada desde foto interpretada |
| `create_private_exercise` | `createPrivateExercise` | Ejercicio no catalogado |
| `add_exercise_to_day` | `addExerciseToDay` | Encadenar ejercicios a una rutina (necesita `routineDayId` + `exerciseId`) |
| `record_body_metric` | `recordBodyMetric` | Registrar peso/grasa/circunferencias |
| `assign_routine_to_client` | `assignRoutineToClient` | Asigna template con snapshot frozen |
| `quick_add_client` | `quickAddClient` | Alta exprés con email + nombre |

**Total: 13 tools (6 + 7).** Operaciones NO expuestas al asistente que el coach podría intentar pedir: ejecutar `WorkoutSession` y sus sets, leer/marcar `Notification`, crear/editar `MedicalCondition`, agregar `RoutineComment`, gestionar `TrainerExpense` / `Invoice` / `OneOffSale`, modificar branding o pricing, operaciones admin. Para todo eso → derivar a la UI dedicada.

#### 9.4 Sticky client

El coach puede fijar un cliente activo desde el badge en el header del asistente. Una vez fijado:
- Se persiste en IndexedDB.
- El runtime inyecta un sufijo al system prompt: `CONTEXTO ACTIVO DE LA SESIÓN: trabajando con "Juan Pérez" (clientId="...")` — Gemini lo usa como default cuando una tool necesita `clientId` y el coach no especificó otro.
- Si el coach menciona otro cliente por nombre, el modelo prioriza ese y NO usa el sticky.
- El badge tiene "cambiar" (abre picker) y ✕ (limpia).

#### 9.5 RAG y citas

`search_knowledge` recupera chunks desde dos corpora indexados en `KnowledgeChunk`:
- `fitness-base-cr-v1` — corpus científico (hipertrofia, fuerza, cardio, periodización, atletas CR).
- `blackline-app-guide-v1` — este manual (rutas, modelos, reglas).

El system prompt obliga al modelo a llamarlo antes de responder cualquier pregunta sobre cifras científicas, evidencia, banderas rojas, atletas o instituciones CR, y a citar autores entre paréntesis: "1.6 g/kg/día (Morton et al., 2018)".

Si retorna 0 hits, el modelo debe decirlo explícitamente y NO inventar la cifra.

#### 9.6 Multimodal

Coach puede dropear/pegar/seleccionar hasta 4 imágenes por turno (JPEG/PNG/WebP/HEIC, ≤10MB c/u). El cliente las comprime client-side a max 1500px / JPEG q0.85 antes de guardarlas.

Las imágenes van directo a Gemini como `inlineData`. El modelo las interpreta con visión nativa:
- Foto báscula → leer kg → proponer `record_body_metric`
- Foto cinta → proponer campo correcto (waist/hip/etc.)
- Foto hoja de rutina → proponer `create_routine_from_ocr` (o derivar a `/trainer/rutinas/importar` si es compleja)
- Foto ejecución → comentar mecánica visible (sin feedback sobre la persona, regla de privacidad del prompt)

#### 9.7 Persistencia en IndexedDB

Store Zustand con middleware `persist` y adapter IDB custom. Persiste `messages` + `stickyClient`. NO persiste estado transient (`isThinking`, `pendingAttachments`, `pendingConfirmation`, `lastError`).

DB: `blackline-assistant` / store `state` / key `blackline-assistant-conv-v1`. Sobrevive a refresh, navegación, cierre del tab. Botón "Nueva conversación" limpia messages pero mantiene sticky (asunción razonable de continuidad).

---

### 10. Reglas de negocio: Suscripciones

#### 10.1 Tiers SOLO / PRO / STUDIO

| Tier | Clientes max | Precio CRC/mes | Features clave |
|---|---|---|---|
| `SOLO` | 5 | 8,900 | Biblioteca, rutinas, sesiones, métricas básicas, factura básica |
| `PRO` | 25 | 22,900 | + analytics avanzado, exports PDF, soporte prioritario |
| `STUDIO` | 60 | 44,900 | + co-administración, branding personalizado, asistente IA v1.1 |

Precios incluyen IVA 13%.

`requireActiveSubscription()` es un guard que corre antes de cualquier mutation (crear cliente, asignar rutina, registrar gasto). Si el trainer:
- Está en `TRIAL` (primeros 30 días desde signup): pasa sin chequear plan.
- Está en `ACTIVE`: pasa.
- Está en `PAST_DUE` o `CANCELLED`: rechaza con `SUBSCRIPTION_NOT_ACTIVE`.
- Está en `READ_ONLY` (grace de 14 días post-impago): rechaza writes, permite reads.

#### 10.2 Trial y grace period

- `TRIAL_DAYS`: 30
- `READ_ONLY_GRACE_DAYS`: 14
- `INVITATION_EXPIRY_DAYS`: 7 (links de invitación que un trainer manda a clientes)
- `MAGIC_LINK_EXPIRY_MIN`: 15

#### 10.3 Límite de clientes

`MAX_CLIENTS_BY_TIER`: SOLO=5, PRO=25, STUDIO=60. Cuenta solo clientes con `TrainerClientStatus = ACTIVE`. Pausados o terminados no cuentan.

Si el trainer alcanza el límite y trata de `quickAddClient` o `completeOnboarding`: rechaza con `CLIENT_LIMIT_REACHED` mencionando el tier actual.

---

### 11. Reglas de negocio: Límites operacionales

#### 11.1 Rutinas

- Días por semana: 1-6 (`ROUTINE_MAX_DAYS_PER_WEEK`).
- Ejercicios por día: hasta 20 (`ROUTINE_MAX_EXERCISES_PER_DAY`).
- Sets por ejercicio: hasta 10 (`ROUTINE_MAX_SETS_PER_EXERCISE`).
- Reps min/max por set: 1-100.
- Rest seconds: 0-600.
- RPE / RIR: 1-10.

#### 11.2 Mediciones

- Quota mensual: 4 (`getMonthlyMeasurementQuota`).
- Quota semanal: 1 (ISO week, lunes-domingo).
- Una `BodyMetric` ya creada es inmutable (no se edita, solo se borra con soft-delete).

#### 11.3 Sesiones

- Máximo 1 `WorkoutSession` con status `IN_PROGRESS` por cliente.
- `COMPLETED` y `ABORTED` son terminales.
- Modo libre (`isFreeWorkout: true`) permitido cuando no hay rutina ACTIVE.

#### 11.4 Archivos

- `MAX_PHOTO_SIZE_BYTES`: 10 MB.
- `MAX_DOCUMENT_SIZE_BYTES`: 25 MB (licencias trainer, exports LPDP).
- `PHOTO_MAX_DIMENSION_PX`: 1920.
- `PHOTO_JPEG_QUALITY`: 80.
- `PRESIGNED_URL_TTL_SEC`: 300 (5 min para uploads).
- `LPDP_EXPORT_URL_TTL_SEC`: 604800 (7 días para downloads de exports).

---

### 12. Validaciones y guards

#### 12.1 Auth guards

- `requireUser()`: usuario autenticado, cualquier rol.
- `requireTrainer()`: rol TRAINER.
- `requireAdmin()`: rol ADMIN o SUPER_ADMIN.
- `requireSuperAdmin()`: solo SUPER_ADMIN.

#### 12.2 Ownership guards

- `assertOwnsClient(trainerId, clientId)`: valida que exista una `TrainerClient` con esta combinación y status != ENDED. Lanza `FORBIDDEN` si no.
- `assertSessionOwnerInProgress(sessionId, userId)`: para mutations sobre sets durante una sesión activa.

#### 12.3 Suspended users

Si `User.suspendedAt` no es null, todos los guards rechazan con un mensaje que incluye `User.suspendedReason`. SUPER_ADMIN puede des-suspender desde `/admin/users/[userId]`.

#### 12.4 PAR-Q+ y derivación médica

`ClientProfile.parqStatus`:
- `NOT_COMPLETED`: cliente recién creado sin wizard completo. Bloquea registro de mediciones críticas y asignación de rutinas con carga.
- `GREEN`: sin respuestas afirmativas en PAR-Q. Cleared para programación normal.
- `REVIEW`: tiene al menos una respuesta afirmativa que requiere autorización médica. El coach debe documentar la autorización en notas antes de asignar.
- `RED`: contraindicación médica clara (cardiopatía descompensada, embarazo de alto riesgo, post-operatorio reciente). Bloquea programación de carga; solo permite adaptaciones pasivas.

El asistente debe **siempre** chequear `parqStatus` con `get_client_profile` antes de proponer rutinas o aumentos de carga.

#### 12.5 LPDP (Ley 8968 Costa Rica)

`LpdpRequest` con `type: EXPORT | DELETE` y `status: PENDING | IN_PROGRESS | COMPLETED | REJECTED`.

`LPDP_DELETE_GRACE_DAYS`: 30 — el cliente puede revocar el delete request dentro de ese plazo. Después se ejecuta hard-delete + tombstone.

`CONSENT_VERSIONS` controla qué versión de cada consentimiento aceptó el cliente. Si actualizamos una política, los consents quedan `OUTDATED` y el cliente debe reaceptar.

---

### 13. Pipelines OCR

#### 13.1 ocr-cedula

`src/lib/ai/ocr-cedula.ts:212`. Entry: `extractCedula({imageBuffer, mimeType, requestId?})`.
- Input: JPEG/PNG/WebP ≤5MB.
- Output: `{ isValidId, tipo: "cedula_cr_v2025", numeroCedula, primerApellido, segundoApellido, nombre, fechaNacimiento, fechaVencimiento, sexo: "M" | "F", confidence, warnings }`.
- Prompt: `CEDULA_PROMPT_VERSION v1`.
- UI: invocado desde `step-2-cedula.tsx` del onboarding (paso 1) cuando el coach sube foto de cédula.
- **Estado**: el wrapper server-side `extractCedulaForOnboarding` (`onboarding.actions.ts:910`) es STUB — retorna `OCR_NOT_IMPLEMENTED`. El parser server existe pero la integración con el wizard todavía no está cerrada.

#### 13.2 ocr-measurements

`src/lib/demo/ocr-measurements-browser.ts:203`. Entry: `extractMeasurementsBrowser(file)`.
- Input: cualquier mime de imagen via browser client.
- Output: 19 circunferencias L/R (`neckCm`, `shoulderLeftCm`, `shoulderRightCm`, `chestCm`, `abdomenCm`, `waistCm`, `hipCm`, `bicepLeftCm`, `bicepRightCm`, `forearmLeftCm`, `forearmRightCm`, `thighLeftCm`, `thighRightCm`, `hamstringLeftCm`, `hamstringRightCm`, `calfLeftCm`, `calfRightCm`, `gluteLeftCm`, `gluteRightCm`) + composición (`weightKg`, `bodyFatPct`, `muscleMassKg`, `visceralFat`, `basalMetabolicRate`) + confidence/warnings.
- UI: dialog `MeasurementSheet` invocado desde `/client/mediciones` y desde el perfil del cliente en `/trainer/clientes/[clientId]`.
- Prompt: `MEASUREMENTS_PROMPT_VERSION v1`.

#### 13.3 ocr-scale

`src/lib/ai/ocr-scale.ts:245`. Entry: `extractScale({imageBuffer, mimeType, cropRegion?, requestId?})` + wrapper `extractScaleBrowser`.
- Input: JPEG/PNG/WebP ≤5MB. Opcional `cropRegion` (bounding box normalizado 0..1).
- Output: bioimpedancia completa — `{ isValidScale, weightKg, bodyFatPct, muscleMassPct, muscleMassKg, waterPct, boneMassKg, metabolicAge, visceralFat, bmrKcal, bodyTypeRating, confidence, warnings }`.
- UI: `ScaleOcrUploader` dentro de `MeasurementSheet` (en `/client/mediciones` y trainer-side).
- Prompt: `SCALE_PROMPT_VERSION v1`.

#### 13.4 ocr-routine

`src/lib/ai/ocr-routine.ts:244`. Entry: `extractRoutineFromImage(file, requestId?)` — **único que corre 100% client-side** (`"use client"`).
- Input: JPEG/PNG/WebP/HEIC ≤10MB.
- Output: `{ name, goal, splitDays 1-6, durationWeeks 1-52, days[].name + exercises[] }` con soft fixes (silent swap reps invertidos, reconcile splitDays).
- UI: `/trainer/rutinas/importar`.
- Prompt: `ROUTINE_OCR_PROMPT_VERSION v1`.

#### 13.5 extract-workout-photos

`src/lib/ai/extract-workout-photos.ts:386`. Entry: `extractWorkoutPhotos({images[], requestId?})`.
- Input: 1-3 buffers JPEG/PNG/WebP ≤5MB c/u.
- Output: `{ detectedExercises[].nameEs + weight/rep ranges + setCount + primaryMuscle + confidence, estimatedExperienceLevel: "beginner" | "intermediate" | "advanced", trainingFrequencyPerWeek, primaryMusclesObserved[], notes, warnings, isLikelyWorkoutLog }`.
- UI: `step-3-workout.tsx` del onboarding (paso 3) cuando el coach sube fotos de bitácora previa.
- Prompt: `WORKOUT_LOG_PROMPT_VERSION v1` — usa modelo `"reasoning"` (no `"ocr"`) por el razonamiento inferencial.
- **Estado**: server wrapper `extractWorkoutPhotosForOnboarding` (`onboarding.actions.ts:930`) es STUB. La función pura existe pero la integración con onboarding está pendiente.

#### 13.6 anonymizer

`src/lib/ai/anonymizer.ts:167`. Utility común consumida por ocr-cedula, ocr-scale, extract-workout-photos.
- Strip EXIF (geolocation, device info).
- Hard cap 5MB en server-side OCRs.
- `redactForLogs` masquea PII antes de loguear.
- `generateRequestId` para correlación.

#### 13.7 Decisión del asistente: pipeline vs visión nativa

**El asistente IA actual NO usa los pipelines OCR** — usa visión multimodal nativa de Gemini directamente. El único puente es `create_routine_from_ocr` que es atajo a la server action homónima.

Consecuencia: el asistente no se beneficia de las validaciones tipadas, soft fixes ni anonymizer de los pipelines. Para **datos críticos** de un cliente real (medición exacta, cédula identificable, bitácora completa con experience level), recomendá al coach derivar a la UI dedicada:
- Báscula → `MeasurementSheet` en `/client/mediciones` o desde el perfil del cliente
- Hoja de rutina compleja (>2 días) → `/trainer/rutinas/importar`
- Cédula durante onboarding → wizard en `/trainer/clientes/invitar`
- Bitácora previa del cliente → wizard de onboarding step 3

Para casos rápidos donde la precisión absoluta no es crítica (estimar visualmente un ejercicio, comentar mecánica, leer un número aproximado), la visión del asistente es suficiente.

---

### 14. Glosario y modelos clave

#### 14.1 User + roles

`User` es la fila base de identidad. Mismo modelo para coach, cliente y admin — el `role` los diferencia. Soft-deletable. Auth.js con scrypt password (campo `passwordHash` formato `scrypt|N|r|p|saltHex|hashHex`) + magic links.

#### 14.2 TrainerClient — la relación

`TrainerClient` es la **relación M:M** entre trainer y cliente. Tiene `monthlyPriceCRC`, `status` (PENDING / ACTIVE / PAUSED / ENDED), `notesPrivate` (texto privado del trainer sobre el cliente — el server action que lo modifica se llama `updateTrainerNotes`).

Un trainer puede tener N clientes. Un usuario CLIENT solo puede tener 1 trainer activo (los otros quedan ENDED).

#### 14.3 RoutineTemplate / RoutineDay / RoutineExercise

- `RoutineTemplate`: la plantilla — `name`, `goal`, `splitDays`, `durationWeeks`, `isArchived`, `isPublic`. La propiedad del `trainerId` la enforce.
- `RoutineDay`: un día dentro del template — `dayIndex` 0-based, `name` ("Día 1", "Empuje", etc.), `description` opcional.
- `RoutineExercise`: un ejercicio dentro del día — `order`, `targetSets`, `targetRepsMin/Max`, `targetRpe`, `restSeconds`, `tempo` (string libre tipo "2-1-2"), `supersetGroup` (number; ejercicios con el mismo número se ejecutan en superserie), `notes`.

#### 14.4 AssignedRoutine + snapshot frozen

`AssignedRoutine` es el **vínculo entre un cliente y una versión específica de un RoutineTemplate**.
- `clientUserId`, `routineTemplateId`, `startsOn`, `endsOn`, `status` (ACTIVE / COMPLETED / ARCHIVED / CANCELLED).
- `snapshotJson`: copia JSON completa del template al momento de la asignación. **Inmutable**.
- `trainerNotes`: nota personal del trainer al asignar.
- `assignedAt`: timestamp.

El cliente siempre ve el snapshot, no el template original. Cambios al template post-asignación NO afectan al cliente hasta que se asigne uno nuevo.

#### 14.5 WorkoutSession + PerformedSet

- `WorkoutSession`: ejecución de un día de rutina por el cliente. `clientUserId`, `assignedRoutineId` (nullable si `isFreeWorkout`), `dayIndex` (nullable si libre), `status` (IN_PROGRESS / COMPLETED / ABORTED), `startedAt`, `completedAt`, `totalDurationSec`, `subjectiveFatigue` 1-10, `bodyWeightKg`, `notes`.
- `PerformedSet`: cada set logueado durante la sesión. `sessionId`, `exerciseId`, `setNumber`, `weightKg`, `reps`, `rpe`, `restTakenSec`, `isWarmup`, `failed`, `notes`, `isPr` (PR detectado automáticamente), `prType`.

#### 14.6 BodyMetric

Medición corporal. Campos: `weightKg`, `bodyFatPct`, `muscleMassKg`, `waistCm`, `hipCm`, `neckCm`, `chestCm`, `armCm`, `thighCm`, `notes`, `source` (MANUAL / OCR_SCALE / CONNECTED_DEVICE), `recordedAt`.

Limitado: NO incluye las 19 circunferencias L/R que sí extrae `ocr-measurements`. Diferencia conocida entre el alcance del modelo de datos persistido vs el alcance del pipeline OCR.

#### 14.7 Modelos financieros

- `SubscriptionPlan`: catálogo SOLO/PRO/STUDIO.
- `TrainerSubscription`: la fila activa del trainer — `tier`, `status`, `currentPeriodEnd`.
- `ClientCharge`: cobro mensual recurrente a un cliente. `status` (PENDING / PAID / OVERDUE / WAIVED / CANCELLED).
- `Invoice`: factura electrónica Hacienda 4.4. Vinculada a un `ClientCharge` o `OneOffSale`.
- `OneOffSale`: venta única (evaluación inicial, producto, clase grupal, etc.).
- `TrainerExpense`: gasto del trainer.
- `TrainerLocation` + `LocationVisit`: ubicaciones de trabajo + visitas.
- `PaymentEvent`: webhook de pasarela (TILOPAY, RESEND, OTHER).

---

### 15. Enums críticos

#### 15.1 Goal vs RoutineGoal

- `Goal` (en `ClientProfile.goal`): FAT_LOSS / MUSCLE_GAIN / MAINTENANCE / PERFORMANCE / GENERAL_HEALTH. Objetivo del **cliente**.
- `RoutineGoal` (en `RoutineTemplate.goal`): HYPERTROPHY / STRENGTH / ENDURANCE / FAT_LOSS / GENERAL. Objetivo de **la rutina**. Distinto vocabulario, no son el mismo enum.
- `CustomGoal`: el trainer puede definir objetivos propios (texto libre) que conviven con `RoutineGoal` en el campo.

#### 15.2 ParqStatus

NOT_COMPLETED → GREEN → REVIEW → RED, donde el orden indica creciente riesgo. Ver sección 12.4.

#### 15.3 TrainerClientStatus

- `PENDING`: invitación enviada, cliente no completó primer login.
- `ACTIVE`: relación operativa.
- `PAUSED`: temporalmente suspendida (vacaciones del cliente, atraso de pago). No cuenta contra el límite de tier.
- `ENDED`: terminada. Datos históricos preservados (sesiones, métricas) pero no se pueden agregar nuevos.

#### 15.4 AssignedRoutineStatus

- `ACTIVE`: la rutina en curso del cliente. Solo puede haber UNA activa por cliente.
- `COMPLETED`: cliente terminó las `durationWeeks` o el trainer la marcó completa.
- `ARCHIVED`: vieja, no relevante. Asignar una nueva archiva la anterior automáticamente.
- `CANCELLED`: terminada antes de tiempo (cambio de objetivos, lesión, etc.).

#### 15.5 BodyMetricSource

- `MANUAL`: ingresada a mano.
- `OCR_SCALE`: leída desde `ocr-scale`.
- `CONNECTED_DEVICE`: smartwatch / báscula bluetooth (planificado, no implementado aún).

---

### 16. Capacidades del asistente vs UI directa

#### 16.1 Lo que el asistente puede hacer hoy

- Buscar y describir ejercicios del catálogo.
- Resolver nombre → cliente.
- Cargar perfil completo del cliente (incluyendo PARQ, métricas recientes, adherencia).
- Listar rutinas del trainer.
- Cargar detalle de una rutina con todos los `routineDayId`.
- Buscar en la base de conocimiento (RAG) sobre ciencia, atletas CR, instituciones.
- **Con confirmación**: crear rutina vacía, crear rutina completa desde foto (`create_routine_from_ocr`), crear ejercicio privado, agregar ejercicio a un día, registrar medición, asignar rutina a cliente, agregar cliente exprés.
- Interpretar imágenes con visión multimodal nativa (báscula, cinta, hoja de rutina, ejecución).

#### 16.2 Lo que requiere UI directa (NO tiene tool)

- Ejecutar `WorkoutSession` (sets, PRs, sync offline) — debe abrir `/client/sesion/[sessionId]`.
- OCR de cédula validado con anonymizer — solo en wizard onboarding.
- Antropometría completa con 19 circunferencias L/R — solo en `MeasurementSheet`.
- Bioimpedancia completa (water, bone, visceral, BMR) — `record_body_metric` solo persiste un subset.
- Editar rutina ejercicio por ejercicio con drag-drop — abrir `/trainer/rutinas/[routineId]`.
- Subir fotos de progreso al S3 — solo `/client/fotos` o wizard.
- Gestión de finanzas (locations, visitas, expenses, invoices) — `/trainer/finanzas/*`.
- Modificar branding o API key — `/trainer/ajustes`.
- Pausar/reanudar/terminar relación con cliente — perfil del cliente.

#### 16.3 Cuándo derivar al coach a una UI específica

| Pregunta del coach | Derivá a |
|---|---|
| "Quiero importar esta hoja de rutina completa" (foto compleja >2 días) | `/trainer/rutinas/importar` |
| "Mi cliente Pedro quiere registrar su peso desde su casa" | El cliente lo hace desde `/client/mediciones/nueva` |
| "Necesito ver el detalle de la sesión que María hizo ayer" | `/trainer/clientes/[mariaId]/sesiones` |
| "Quiero subir foto de cédula para crear cliente" | Wizard onboarding `/trainer/clientes/invitar` |
| "Tengo que registrar 19 circunferencias con foto" | `MeasurementSheet` en `/client/mediciones` o perfil del cliente |
| "Mostrame mi flujo de caja del mes" | `/trainer/finanzas` |
| "Quiero cambiar mi precio mensual default" | `/trainer/ajustes` |
| "Editar ejercicio X del día Y de la rutina Z" | El editor visual en `/trainer/rutinas/[routineId]` |

#### 16.4 Modo agéntico — cómo iterás en un mismo turno

El asistente NO está limitado a 1 tool call por turno del coach. Para tareas multi-step (ej: "asignale esta rutina a todos mis clientes activos") el runtime te deja encadenar hasta **15 vueltas tool→respuesta→tool** en un solo turno del coach.

Reglas del modo agéntico (definidas en el system prompt):
- **Planificá la secuencia entera antes de emitir el primer call** — no la publiques al coach, ejecutala.
- **Ejecutá hasta terminar antes de responder texto** — el coach ve cada tool card en vivo en pantalla mientras corrés; no necesita un "voy a hacer X" intermedio.
- **Nunca narrés intención sin acción**. Si decís "ahora voy a buscar tus clientes", el call a `list_my_clients` tiene que salir en el mismo turno. Sin excepciones.
- **Auto-recuperación en errores de validación**: si una tool falla con enum inválido, faltante o rango fuera de bounds, reintentá la MISMA tool con params corregidos. No molestés al coach con cosas que podés deducir.
- **Batch sequential**: para N items, llamá la misma tool N veces seguidas. El runtime es secuencial; el coach ve aparecer cada tool card una por una.
- **Cap duro de 15 calls por turno** — si vas a >10 sin estar cerca de terminar, pausá y pedile al coach que acote el alcance.

#### 16.5 Casos típicos de modo agéntico

| Pedido del coach | Secuencia esperada |
|---|---|
| "Asignale la rutina X a Pedro, María y Luis con fecha 2026-06-01" | `assign_routine_to_client` × 3 (sequential, una card por cliente) → texto final con resumen |
| "Creá una rutina PPL hipertrofia 6 días y asignásela a mi último cliente" | `create_routine` → `list_my_clients` → `assign_routine_to_client` → texto |
| "Listame mis clientes con peso registrado en el último mes" | `list_my_clients` → loop interno: `get_client_profile` para cada uno → filtro mental → texto con tabla |
| "Importé esta rutina por foto, ahora asignala a todos mis clientes activos" | `create_routine_from_ocr` (1) → `list_my_clients` (2) → `assign_routine_to_client` × N (3..N+2) → texto |

#### 16.6 Lo que NO debe hacer el modo agéntico

- Pedir confirmación al coach EN TEXTO antes de un write — la confirmation card del runtime ya lo hace.
- Pausar para "confirmarte que voy bien" cuando todavía hay pasos pendientes — solo se pausa por (a) flujo completo, (b) dato faltante real, (c) decisión sensible.
- Encadenar más de 3 writes destructivos consecutivos (delete, end_relationship) sin chequear con el coach — esos sí requieren confirmación de bloque.
- Inventar resultados de pasos que NO ejecutaste. Si pensaste hacer X pero no lo hiciste, no le digas al coach que lo hiciste.

---

### 17. Constantes y referencias rápidas

#### 17.1 Constantes en `src/lib/consts.ts`

| Constante | Valor | Contexto |
|---|---|---|
| `APP_NAME` | "Blackline Fitness" | Branding |
| `DEFAULT_LOCALE` | "es-CR" | Idioma |
| `DEFAULT_TZ` | "America/Costa_Rica" | Timezone |
| `DEFAULT_CURRENCY` | "CRC" | Moneda |
| `IVA_PCT` | 0.13 | IVA Costa Rica |
| `TRIAL_DAYS` | 30 | Trial de trainers |
| `READ_ONLY_GRACE_DAYS` | 14 | Grace post-impago |
| `INVITATION_EXPIRY_DAYS` | 7 | Links invitación |
| `MAGIC_LINK_EXPIRY_MIN` | 15 | Auth magic links |
| `MAX_PHOTO_SIZE_BYTES` | 10MB | Fotos progreso |
| `MAX_DOCUMENT_SIZE_BYTES` | 25MB | Licencias, exports |
| `PHOTO_JPEG_QUALITY` | 80 | Compresión |
| `PHOTO_MAX_DIMENSION_PX` | 1920 | Resize |
| `PRESIGNED_URL_TTL_SEC` | 300 | Upload tokens |
| `LPDP_EXPORT_URL_TTL_SEC` | 604800 | Export downloads |
| `ROUTINE_MAX_DAYS_PER_WEEK` | 6 | Rutinas |
| `ROUTINE_DEFAULT_DURATION_WEEKS` | 8 | Rutinas |
| `ROUTINE_MAX_SETS_PER_EXERCISE` | 10 | Rutinas |
| `ROUTINE_MAX_EXERCISES_PER_DAY` | 20 | Rutinas |
| `RPE_MIN` / `RPE_MAX` | 1 / 10 | Sesiones |
| `FATIGUE_SCALE_MIN` / `FATIGUE_SCALE_MAX` | 1 / 10 | Post-sesión |
| `LPDP_DELETE_GRACE_DAYS` | 30 | Revocar delete |
| `CABYS_CODE_FITNESS_SERVICES` | "9000000000000" | Hacienda |
| `PAIS_ISO_COSTA_RICA` | "506" | Hacienda |

#### 17.2 Server actions: Onboarding

`createOnboardingDraft`, `updateOnboardingStep`, `completeOnboarding`, `grantAiConsent` (activa `aiConsentGranted` prerequisito de OCR/Gemini), `getOnboardingDraft`, `listOnboardingDrafts`, `abandonOnboardingDraft`, `checkEmailAvailable`, `uploadOnboardingImage`. **Stubs**: `extractCedulaForOnboarding` (`OCR_NOT_IMPLEMENTED`), `extractWorkoutPhotosForOnboarding` (`PHOTO_ANALYSIS_NOT_IMPLEMENTED`).

#### 17.3 Server actions: Clientes

`listMyClients`, `getClientDetail`, `getClientProfileDetail`, `quickAddClient`, `createInvitation`, `validateInvitationToken`, `acceptInvitation`, `updateClientPrice`, `updateTrainerNotes` (escribe `TrainerClient.notesPrivate`), `pauseClient`, `resumeClient`, `endRelationship`, `saveClientGoal`, `completeFirstLogin`, `recordTrainerNoteUpdate`.

#### 17.4 Server actions: Rutinas

`listMyRoutines`, `getRoutine`, `createRoutine` / `createRoutineTemplate`, `updateRoutine` / `updateRoutineTemplate`, `deleteRoutine`, `archiveRoutine`, `duplicateRoutine`, `addDayToRoutine` / `addRoutineDay`, `updateDay` / `updateRoutineDay`, `removeDay` / `deleteRoutineDay`, `addExerciseToDay`, `updateExerciseInDay`, `removeExerciseFromDay`, `reorderExercisesInDay` / `reorderExercises`, `assignRoutine` / `assignRoutineToClient`, `cancelAssignedRoutine`, `deleteAssignedRoutine`, `addRoutineComment`, `getClientRoutines`, `getClientAssignedRoutines`, `createRoutineFromOcr`, `createCustomGoal`, `listCustomGoals`, `getActiveRoutineForClient`.

#### 17.5 Server actions: Ejercicios

`searchExercises`, `getExercise`, `getExerciseDetail`, `createExercise`, `updateExercise`, `updateExerciseInstructions`, `updateExerciseFromForm`, `deleteExercise`, `createPrivateExercise`.

#### 17.6 Server actions: Métricas + fotos

`recordBodyMetric`, `listMetrics`, `getLatestMetric`, `initProgressPhotoUpload`, `confirmProgressPhoto`, `deleteProgressPhoto`, `listProgressPhotos`.

#### 17.7 Server actions: Sesiones

`startSession`, `recordSet`, `updateSet`, `deleteSet`, `completeSession`, `abortSession`, `getSession`, `listClientSessions`, `getActiveSession`, `getMyTodaySession`, `getMySessionHistory`.

#### 17.8 Server actions: Finanzas + billing

`listLocations`, `createLocation`, `updateLocation`, `deleteLocation`, `recordVisit`, `listVisits`, `createExpense`, `updateExpense`, `deleteExpense`, `getFinanceDashboardData`, `generateMonthlyCharges`, `markChargeAsPaid`, `recordOneOffSale`, `generateInvoice`.

#### 17.9 Server actions: Auxiliares

- **Knowledge / RAG**: `searchKnowledge`, `listKnowledgeSections`.
- **Branding**: `updateBranding`, `getBranding`, `getClientTrainerBranding` (consumida por `/client/entrenador`).
- **Dashboard**: `getDashboardKPIs`, `getDashboardAlerts`, `getDashboardAggregates`, `getNotifications`, `markNotificationRead`, `markAllNotificationsRead`.
- **Auth**: `searchTrainersByName` (para clientes que se registran sin invitación directa).
- **Medical conditions**: `saveMyMedicalConditions`, `listClientMedicalConditions`.
- **Admin (solo ADMIN/SUPER_ADMIN)**: `listAllUsers`, `suspendUser`, `unsuspendUser`, `startImpersonation`, `stopImpersonation`, `getCurrentImpersonation`, `listAllSubscriptions`, `extendTrial`, `listAllReferrals`, `reviewReferral`, `getReferralStats`.
- **LPDP**: `getLpdpRequests`, `createLpdpRequest`, `cancelLpdpRequest`.

**Nota**: la quota de mediciones (4/mes + 1/semana ISO) está hardcodeada en `client-portal.actions.ts`, NO en `src/lib/consts.ts`. Si querés cambiarla, ese es el lugar.

---

## Recommendations

**Lo que el asistente DEBERÍA hacer siempre antes de operar sobre un cliente**:

1. Si el coach mencionó un nombre, llamá `list_my_clients` para resolverlo (o usá el sticky client si está fijado).
2. Antes de proponer cualquier carga de entrenamiento, llamá `get_client_profile` y revisá `parqStatus`. Si es `RED`, declíná y derivá a profesional médico. Si es `REVIEW`, pedí al coach que confirme la autorización médica documentada.
3. Antes de proponer `record_body_metric`, revisá `latestMetric.recordedAt`. Si fue hace <7 días, el registro va a fallar con `MEASUREMENT_QUOTA_EXCEEDED` — comunicá la regla al coach.
4. Antes de asignar una rutina, revisá si el cliente ya tiene una `AssignedRoutine` ACTIVE. Si sí, anticipá al coach que la actual se va a cancelar.

**Lo que el asistente NO debería intentar hacer**:

- Loguear sets de una sesión del cliente. Aunque `record_set` no es un tool expuesto, ni siquiera lo intentes — la sesión vive en `/client/sesion/[sessionId]` con sync offline propio.
- Editar ejercicios dentro de una `AssignedRoutine.snapshotJson`. Es inmutable por diseño. Si el coach quiere ajustar, sugerí asignar una rutina nueva.
- Operar sobre finanzas. Las server actions de gastos / facturas / invoices NO están expuestas como tools y deberían quedar en la UI dedicada.
- Cambiar branding, API key o configuración del trainer. Solo desde `/trainer/ajustes`.

**Umbrales que cambian las recomendaciones**:

- Si el coach pregunta sobre cifras científicas o referentes (CR atletas / instituciones): llamá `search_knowledge` ANTES de responder, con tags relevantes. Cita autor+año.
- Si el coach pregunta sobre flujos del producto, límites o "dónde está X feature": llamá `search_knowledge` con tag `rutas-app` o `flujo-onboarding` o `reglas-negocio`. Este manual es el corpus.
- Si una tool falla con un error 4xx, NO reintentés ciegamente. Explicá al coach qué pasó y qué tiene que arreglar.

---

## Caveats

- Este manual refleja el código de `claude/gracious-shockley-e31245` al merge `a852eab`. Cambios posteriores (nuevas tools, nuevos flujos, cambios de límites) requieren actualizar este documento. La versión del corpus es `blackline-app-guide-v1` — bumpear a v2 cuando haya cambios significativos.
- Los pipelines OCR de cédula y workout-photos están en STUB server-side (`OCR_NOT_IMPLEMENTED` y `PHOTO_ANALYSIS_NOT_IMPLEMENTED`). Si el coach intenta usar esas features durante el onboarding, la respuesta del asistente debe reconocer la limitación.
- El asistente actual NO usa los pipelines OCR para extraer datos críticos — usa visión multimodal nativa. Eso significa que NO se beneficia de los validators (rangos plausibles), soft fixes (silent swap reps invertidos) ni del anonymizer. Para datos críticos de un cliente real, derivar a la UI dedicada sigue siendo lo correcto.
- `record_body_metric` persiste solo un subset de las 19 circunferencias que extrae `ocr-measurements`. Si el coach quiere registrar antropometría completa, debe usar `MeasurementSheet` en la UI, no el chat.
- Cuotas de mediciones (`MEASUREMENT_QUOTA_EXCEEDED`) cuentan tanto las mediciones del cliente como las que el trainer registró por él. El asistente no las puede bypasear.
- El asistente actualmente no maneja sesiones (`WorkoutSession`) — ni iniciar, ni grabar sets, ni completar. Es un límite arquitectónico: las sesiones tienen sync offline + PR detection + adherencia que viven en `/client/sesion/[sessionId]`.
- Para clientes en `TrainerClient.status = PAUSED` o `ENDED`, las server actions de assign / record / etc. rechazan con `RELATION_NOT_ACTIVE`. El asistente debe avisar antes de proponer una acción sobre un cliente pausado.
