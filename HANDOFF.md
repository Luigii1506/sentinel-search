# HANDOFF — Sentinel PLD UI Standardization + Auth

**Última actualización:** 2026-06-14 (sesión Claude → handoff a Codex)
**Branch activa:** `LGER/main` en ambos repos
**Repos relevantes:**
- Frontend: [sentinel-search](https://github.com/Luigii1506/sentinel-search) — React 19 + Vite + Tailwind + shadcn/ui
- Backend: [python-service](https://github.com/Luigii1506/python-service) — FastAPI + SQLAlchemy + Rust (`compliance_scoring`)

Este documento es el punto de entrada para retomar el trabajo sin contexto previo. Lee la sección "Estado actual" primero, después "Qué falta", después la referencia técnica si necesitas profundidad.

---

## 1. Estado actual (lo que está mergeado y funcionando)

### Auth — completado en esta sesión

| Pieza | Commit | Notas |
|---|---|---|
| Bootstrap-admin + VALID_ROLES (backend) | BE `fd65eb5` | Primer signup = admin si aún no existe ninguno |
| `<UsersPage>` con role management | FE `98db282` | Self-service en `/admin/users` |
| `/me` enriquecido (id, email, role, is_active, …) | BE `8a60fee` | Endpoint que el SPA necesita para hidratar `AuthContext` |
| Fix login → fetch `/me` después de obtener token | FE `f83fa2e` | El bug previo: AuthContext leía `response.user` que no existía → "Credenciales inválidas" pese a 200 OK |
| `<PublicOnlyRoute>` para `/login` y `/signup` | FE `34448a1` | Si ya estás autenticado, redirige a `/` o a `location.state.from` |
| Google OAuth 2.0 end-to-end | BE `f4e530a` · FE `7067473` | Authlib-style con httpx puro; sin sidecar Node |

#### Cómo activar Google OAuth (no está activado por defecto)

1. Crear OAuth client en https://console.cloud.google.com/apis/credentials
2. **Authorized redirect URI** debe ser idéntica a `GOOGLE_REDIRECT_URI` (scheme + host + port + path)
3. Agregar a `python-service/compliance-api/.env`:
   ```bash
   GOOGLE_CLIENT_ID=…apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=…
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
   FRONTEND_URL=http://localhost:5173
   ```
4. `docker compose restart api`
5. El SPA detecta el cambio vía `GET /api/v1/auth/google/config` y muestra el botón solo.

**Comportamiento clave del flow**:
- Lookup user por `(auth_provider='google', provider_user_id=sub)` ANTES que por email — `sub` de Google es estable de por vida, email puede reciclarse
- Si existe cuenta local con mismo email → **enlaza** ambos métodos (password local sigue funcionando)
- Bootstrap-admin aplica también a OAuth signups
- Email no verificado en Google → 403 (anti-spam básico)
- Tokens viajan al SPA en URL **fragment** (`#access_token=…`), no query — fragments nunca cruzan la red, no aparecen en nginx logs/Sentry/referers

### UI Standardization — 3 sprints completados

Auditoría inicial encontró: 6 páginas canónicas (con `<AppPage>` + `<PageHeader>`), 14 legacy (sin shell), 3 intencionalmente fuera (auth), patrones duplicados en 8+ pages (status pills hand-rolled, filter bars, AlertDialog re-implementados, etc.).

| Sprint | Commit | Entregable | Métricas |
|---|---|---|---|
| **A** | `34c1d22` | 4 átomos nuevos en [src/components/foundation/](src/components/foundation/) | +635 líneas (atoms + tests virtuales) |
| **B** | `0762d85` | Adopción de átomos en 5 páginas existentes | **−221 / +115** netas, **bug fix** (double-click race en destructive actions) |
| **C tier 1+2** | `5afe302` | 11 páginas legacy migradas a `<AppPage>` + `<PageHeader>` | **−299 / +245** netas, 0 regresiones TS |

#### Átomos nuevos creados en Sprint A (toda esta sesión)

| Componente | Ubicación | Propósito | Reemplaza |
|---|---|---|---|
| `<StatusPill kind>` | [src/components/foundation/StatusPill.tsx](src/components/foundation/StatusPill.tsx) | Indicador genérico de status operacional (no riesgo). Variants: `success` `warning` `error` `info` `neutral` `pending` `running`. Triple redundancia (color + icono + label) para WCAG 2.2 §1.4.1. | 8+ copias hand-rolled de `bg-X-500/10 text-X-400 rounded-full` |
| `<FilterBar>` + .Search/.Select/.Spacer/.Actions | [src/components/foundation/FilterBar.tsx](src/components/foundation/FilterBar.tsx) | Composable toolbar para list pages — composición de subcomponentes en lugar de mega-props para que cada call site use solo lo que necesita. | 5 toolbars distintas en ActivityLog, Reports, Audit, MergeReview, Sources |
| `<DetailList>` + `<DetailRow label value copyable mono wrap>` | [src/components/foundation/DetailList.tsx](src/components/foundation/DetailList.tsx) | Key-value semántico (`<dl>`/`<dt>`/`<dd>`) — 2-col grid en md+, stack en mobile. Optional copy-to-clipboard, mono mode, truncate-with-tooltip default. | ~30 líneas inline en EntityProfile + CaseDetail (TODAVÍA NO MIGRADAS — ver Sprint C tier 3) |
| `<ConfirmAction>` | [src/components/foundation/ConfirmAction.tsx](src/components/foundation/ConfirmAction.tsx) | Wrapper opinionado sobre AlertDialog. Variants: `destructive` `warning` `neutral`. **Maneja onConfirm async transparente**: si devuelve Promise → spinner + bloquea dismissal hasta que se resuelva. Throwing keeps dialog open. | 3 implementaciones distintas en Users, ApiKeys, Webhooks |

`statusKindFromString(s)` ayuda a mapear status del backend ("failed" → 'error', "queued" → 'info', …) — usarla siempre que el status venga del backend en string para que toda la app mapee igual.

Re-export desde [src/components/foundation/index.ts](src/components/foundation/index.ts) — siempre `import { ... } from '@/components/foundation'`.

#### Páginas migradas en Sprints B + C

**Sprint B (adopción de átomos)**: `ApiKeysPage`, `WebhooksPage`, `MonitoringPage`, `AuditPage`, `SourcesDashboardPage`.

**Sprint C tier 1+2 (migración a shell canónico)**: `ReportsPage`, `MonitoringPage`, `OperationsPage`, `AuditPage`, `SourcesDashboardPage`, `YenteCatalogPage`, `MergeReviewPage`, `ResolverReviewPage`, `ValidationReviewPage`, `FederatedSearchPage`, `OptimizedSearchPage`.

**Páginas que ya estaban canónicas (no se tocaron)**: `SearchPage`, `BulkScreeningPage`, `ComplianceDashboardPage`, `AdverseMediaPage`, `ActivityLogPage`, `UsersPage`.

#### Total páginas con shell canónico hoy: 17 / ~25

---

## 2. Qué falta (lo accionable para codex)

### 2.1 Validación en browser (debería ser lo PRIMERO)

Antes de meterse a más código, abrir cada página y verificar:

- [ ] `/admin/api-keys` — double-click en "Revocar" ya no dispara 2 mutations (ConfirmAction bloquea durante async)
- [ ] `/admin/webhooks` — mismo test con "Eliminar"
- [ ] `/monitoring` — StatusPills en tabla de jobs uniformes
- [ ] `/admin/audit` — StatusBadge ahora envuelve StatusPill, debería verse igual o mejor
- [ ] `/admin/sources` — 5 MetricCard tiles (Gold con accent="success")
- [ ] `/reports`, `/operations`, `/data/yente-catalog`, `/admin/merges`, `/admin/resolver-review`, `/admin/validation-review`, `/federated`, `/search/optimized` — todas con mismo header pattern (icon-pill + h1 + description + actions a la derecha)

**Cosas específicas a buscar**:
- Icon-pill: mismo tamaño + gradient en todas
- Loading skeletons en el mismo lugar que el contenido cargado (sin layout shift al landing data)
- Mobile (< lg): header colapsa, actions van debajo del título
- Baseline del h1 idéntica en todas las páginas (lo más importante — la inconsistencia previa se sentía de inmediato al navegar)

### 2.2 Sprint C tier 3 — Heavy redesigns (PRIORIDAD ALTA)

Solo 2 páginas pero son **las más importantes del producto**.

#### A. `EntityProfile` ([src/pages/entity/EntityProfilePage.tsx](src/pages/entity/EntityProfilePage.tsx))

Estado actual: `p-12` (96px de padding sin razón), `max-w-7xl`, sin AppPage, sin PageHeader, ~30 líneas de divs flex inline para mostrar key-value pairs de identidad de la entidad. No usa `<RiskScoreGauge>` que ya existe en `foundation/` desde Sprint 1.

**Plan de migración**:
1. Wrap en `<AppPage width="wide">` (perfil necesita espacio para el panel de evidencia)
2. `<PageHeader>` con:
   - title = `entity.canonical_name`
   - description = país + categoría + n fuentes
   - icon = User/Building2 según `entity.schema_type`
   - actions = botones de Watchlist + Export + Compartir
3. **Layout master-detail-detail (Sayari/ComplyAdvantage pattern)**:
   - Columna izquierda (1/3): `<RiskScoreGauge>` en variant=hero + `<DetailList>` con los datos de identidad principales (id, birth date, country, identifiers — con `copyable mono` en IDs)
   - Columna derecha (2/3): tabs (`<Tabs>` shadcn — ver cómo ValidationReview lo usa) con: Overview, Sources, Aliases, Relations, Sanctions, Adverse Media, Timeline
4. Replace cualquier `bg-X-500/10 rounded-full` con `<StatusPill>` o `<RiskBadge>` según corresponda
5. Confirm dialogs (add to watchlist, export to PDF) usar `<ConfirmAction>`

**Cosas importantes**:
- `RiskScoreGauge` ya existe en [src/components/foundation/RiskScoreGauge.tsx](src/components/foundation/RiskScoreGauge.tsx) con `compact` y `hero` variants
- La data del entity viene de `useEntity(id)` hook (revisar [src/hooks/useEntity.ts](src/hooks/useEntity.ts) si existe; si no, está en services/entities)
- Mantener el `EvidencePanel` que ya existe — solo asegurarse que viva dentro del nuevo layout, no fuera

#### B. `CaseDetail` ([src/pages/compliance/CaseDetailPage.tsx](src/pages/compliance/CaseDetailPage.tsx))

Estado actual: `max-w-4xl`, sin AppPage, sin PageHeader, mismo pattern de key-value inline.

**Plan**:
1. `<AppPage width="default">` (case detail es lectura/edición, no necesita wide)
2. `<PageHeader>` con: case ID + status pill al lado del título, actions = Asignar + Cerrar caso + Print
3. Header secundario con `<DetailList dense>` para los metadatos del caso (creado por, fecha, alerta origen, etc.)
4. Tabs: Decisiones, Timeline, Notas, Evidencia, Alertas relacionadas
5. Botones destructivos (cerrar caso, eliminar nota) → `<ConfirmAction variant="warning">` o `"destructive"`
6. **Timeline**: hoy es ad-hoc. **Decidir si vale extraer un `<TimelineItem>` átomo** — solo si CaseDetail + EntityProfile + ActivityLog comparten el patrón. Si no, dejarlo inline.

### 2.3 Átomos nuevos pendientes (PRIORIDAD MEDIA)

Identificados durante Sprint B/C pero NO construidos porque no había suficiente call sites para justificarlos en ese momento. Construir ANTES de migrar la página que los necesite:

#### `<HealthDot>` — service health indicator con icono de servicio

**Para**: `OperationsPage` líneas ~1100-1140 (PG/Redis/OS + snapshots) y `MonitoringPage` líneas ~243-280 (cards de servicios).

**Diferencia con StatusPill**: HealthDot pairs un status dot pequeño con un **icono de servicio** (Database, HardDrive, Server) + un label corto. StatusPill no acepta icon override y forzarlo perdería el icono del servicio.

**API sugerida**:
```tsx
<HealthDot
  status="ok" | "degraded" | "error"
  icon={Database}    // lucide icon
  label="PG"
  latencyMs={12}     // opcional
  title="Snapshot: 2026-06-14T..."  // tooltip
/>
```

Variants: outline minimal (para barras densas de Operations) y card-mounted (para Monitoring's grid).

#### `<CategoryBadge>` — domain category indicator

**Para**: `SourcesDashboardPage` línea ~73-92 (SANCTIONS=red, TAX=orange, DEBARMENT=amber, …). Hoy es un `Record<string, string>` que mapea category → tailwind classes.

**Diferencia con StatusPill**: estos son **categorías de dominio**, no status. SANCTIONS no es "error", es una categoría. Codificarlas como status sería conceptualmente incorrecto.

**API sugerida**:
```tsx
<CategoryBadge category="SANCTIONS" />       // mapping interno a color + label
<CategoryBadge category="custom" color="purple" label="Internal" />  // escape hatch
```

Mapping debería vivir centralizado para que la página de Audit, Sources, Operations, etc. todas pinten "SANCTIONS" del mismo rojo.

### 2.4 Pendientes operacionales/backend (PRIORIDAD BAJA — ya cubre el flujo crítico)

Estos son tareas que aparecen en notas previas y NO se trabajaron en esta sesión:

- **PDF receipt endpoint** — backend devuelve un PDF firmado tras un screening (para audit trail físico). Documentado en notas de Sprint 3 originales.
- **ZIP audit export endpoint** — descarga completa de un caso con todos los archivos relacionados.
- **HomePage** sigue siendo marketing landing (intencional — no migrar a `<AppPage>` salvo que cambies el modelo de homepage)

---

## 3. Referencia técnica (cómo usar el sistema)

### Shell canónico — siempre así

```tsx
import { AppPage, PageHeader, Section } from '@/components/foundation';

export function MyPage() {
  return (
    <AppPage width="default" spacing="default">     // default | wide | narrow
      <PageHeader
        title="Mi página"
        description="Una línea de contexto"
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-blue-500/30">
            <MyIcon className="w-6 h-6 text-blue-400" />
          </div>
        }
        actions={
          <>
            <Button variant="outline" onClick={refetch}>Refresh</Button>
          </>
        }
      />

      <Section title="Sección 1">
        {/* contenido */}
      </Section>
    </AppPage>
  );
}
```

**REGLAS DURAS**:
- NUNCA `pt-24` / `pt-20` en una página — el sidebar ya reserva su columna, lg+ empieza en `top:0`
- NUNCA `max-w-Xxl` raw — usar `<AppPage width="…">` 
- NUNCA `min-h-screen bg-brand-carbon px-…` raw — eso es trabajo de `<AppPage>`
- Una página = un `<PageHeader>` arriba, todo lo demás en `<Section>` o componentes específicos

### Confirm destructive action — siempre así

```tsx
const [target, setTarget] = useState<Item | null>(null);

const deleteMutation = useMutation({
  mutationFn: (id: string) => api.delete(id),
  onSuccess: () => queryClient.invalidateQueries(...),
});

// ...
<Button onClick={() => setTarget(item)}>Eliminar</Button>

<ConfirmAction
  open={!!target}
  onOpenChange={(o) => !o && setTarget(null)}
  variant="destructive"        // | "warning" | "neutral"
  title="¿Eliminar este item?"
  description={<><strong>{target?.name}</strong> se perderá. No se puede deshacer.</>}
  confirmLabel="Eliminar"      // optional — auto-derives from variant
  onConfirm={() => target && deleteMutation.mutateAsync(target.id)}
/>
```

**Importante**: pasar `mutateAsync` (no `mutate`) para que ConfirmAction pueda await el Promise y mostrar el spinner. `mutate` es fire-and-forget.

### Status indicator — siempre así

```tsx
import { StatusPill, statusKindFromString } from '@/components/foundation';

// Status que viene del backend como string:
<StatusPill kind={statusKindFromString(job.status)} label={prettyLabel(job.status)} size="sm" />

// Status conocido en frontend:
<StatusPill kind="success" label="Activo" size="sm" />

// Con tooltip de error:
<StatusPill kind="error" label="Fallido" title={job.error_message} size="sm" />
```

### Key-value display — siempre así

```tsx
import { DetailList, DetailRow } from '@/components/foundation';

<DetailList>
  <DetailRow label="ID interno" value={entity.id} copyable mono />
  <DetailRow label="País" value={entity.country} />
  <DetailRow label="Fecha de nacimiento" value={entity.birth_date} emptyText="No registrada" />
  <DetailRow label="Riesgo">
    {/* sin `value` cuando necesitas composición */}
    <RiskBadge level={entity.risk_level} size="sm" />
  </DetailRow>
  <DetailRow label="Notas" value={entity.notes} wrap />
</DetailList>
```

### List page toolbar — siempre así

```tsx
import { FilterBar } from '@/components/foundation';

<FilterBar>
  <FilterBar.Search value={q} onChange={setQ} placeholder="Buscar entidad…" />
  <FilterBar.Select
    label="Estado"
    value={status}
    onChange={setStatus}
    options={[
      { value: 'open', label: 'Abierto' },
      { value: 'closed', label: 'Cerrado' },
    ]}
  />
  <FilterBar.Spacer />
  <FilterBar.Actions>
    <Button variant="outline" onClick={reset}>Limpiar</Button>
    <Button onClick={apply}>Aplicar</Button>
  </FilterBar.Actions>
</FilterBar>
```

---

## 4. Decisiones arquitectónicas (el porqué)

### Google OAuth: no Better Auth

**Decisión**: Authlib-style con httpx + jose puro en Python.
**Por qué no Better Auth**: agregar un sidecar Node implica nuevo container, health checks, sincronización de tabla `user`, deploy aparte. Para un solo provider (Google) no se justifica. **Si en V2 necesitamos**: magic links + 2FA + passkeys + SSO empresarial — ahí sí Better Auth gana clarísimo y se migra.

### Status pills tienen icono Y label

**Decisión**: triple redundancia (color + icono + label) por defecto en todos los status indicators.
**Por qué**: WCAG 2.2 §1.4.1 forbids using color as the only indicator. Un usuario daltónico viendo "rojo" vs "verde" no tiene info; viendo `<X> Fallido` vs `<✓> Activo` sí. También: screen readers anuncian el label, no el color.

### Subcomponentes en FilterBar, no mega-props

**Decisión**: `<FilterBar.Search>` `<FilterBar.Select>` en lugar de `<FilterBar search selects=[…]>`.
**Por qué**: el orden y presencia de controles varía wildly per page (algunas tienen search + 2 selects + date range, otras solo search). Composición lo escala sin pagar por una API de N knobs.

### `auth_provider` es VARCHAR, no ENUM

**Decisión**: `users.auth_provider VARCHAR(20)` con default `'local'`, valores: `local | google | github | microsoft | …`.
**Por qué**: agregar un provider nuevo (github, etc.) es **no migration**, solo agregar valor. ENUM requeriría migration con `ALTER TYPE`.

### URL fragment para entregar OAuth tokens al SPA

**Decisión**: backend 302 a `${FRONTEND_URL}/auth/callback#access_token=…&refresh_token=…`
**Por qué**: fragments **nunca cruzan la red** — no aparecen en nginx logs, Sentry breadcrumbs, GA referers, ni proxies upstream. Query params sí leakean por todos esos caminos.

### Lookup OAuth user por `(provider, sub)` antes que por email

**Decisión**: ver código en [oauth_google.py](../python-service/compliance-api/app/api/v1/oauth_google.py) función `google_callback`.
**Por qué**: el `sub` claim de Google es estable de por vida. Email puede cambiar (work → personal) o ser reciclado en Google Workspace. Lookup por email primero abriría la puerta a takeover si alguien reclama una dirección reciclada.

### No migrar HomePage

**Decisión**: dejar HomePage marketing landing con AnimatedCounter + NeuralNetworkBackground, NO usar `<AppPage>`.
**Por qué**: HomePage es la landing pública (puede haber usuarios anónimos viéndola). AnimatedCounter es animación intencional de marketing, MetricCard la mataría sin ganancia.

---

## 5. Quirks / gotchas

### `tokenManager` vs `localStorage` directo

NUNCA leer/escribir tokens de localStorage directo. Siempre vía `tokenManager.getToken()` / `setToken()` / `clearTokens()` en [src/services/api.ts](src/services/api.ts). Hay logic de cleanup + refresh interceptor que se rompe si vas raw.

### `AuthContext.login()` vs signup vs OAuth callback

Tres paths entran a "user autenticado":
1. `login()` — POST /login → tokens → fetch /me → setUser
2. `signup()` — POST /signup → tokens → fetch /me → setUser
3. OAuth callback — fragment tokens → tokenManager.setToken → `refreshUser()` → setUser

Los 3 deben terminar con `setUser(userData)` y `navigate(intended)`. Si agregas un 4° path (magic link), seguir el mismo patrón.

### Backend `/me` puede devolver user_id null

Si el caller usa API key pura (sin JWT), `/me` devuelve shape mínimo con `id: null`. El frontend debería manejarlo sin crashear (renderizar avatar genérico). Hoy `usePermissions` deriva permisos de `role`, así que un user con id null + role válido funciona.

### `PublicOnlyRoute` NO debe envolver `/auth/callback`

OAuthCallbackPage existe para **transicionar de anónimo a autenticado**. Si la wrappeas en `<PublicOnlyRoute>`, la guard race con el `tokenManager.setToken` y te boota a `/` antes de que `refreshUser` termine. Mirar `App.tsx` — está documentado el porqué.

### Migrations en Python pasan por alembic adentro del container

```bash
docker compose exec -T api alembic upgrade head
```

NO `alembic upgrade head` directo en host — la conexión DB difiere.

### Frontend dev server

Si `VITE_API_BASE_URL` no está seteado, el SPA asume `http://localhost:8000`. Asegúrate que docker compose levantó api en `8000` (default).

---

## 6. Trazabilidad de commits

```
Backend (python-service):
  fd65eb5 — VALID_ROLES + bootstrap admin
  a902f7b — /me minimal (will be replaced)
  8a60fee — /me enriquecido
  f4e530a — Google OAuth end-to-end

Frontend (sentinel-search):
  98db282 — UsersPage + service + nav
  cf6599f — authService.login posts JSON instead of form
  f83fa2e — AuthContext fetches /me after login (bug fix)
  34448a1 — PublicOnlyRoute
  7067473 — Google OAuth UI (button + callback page)
  34c1d22 — Sprint A: 4 atoms
  0762d85 — Sprint B: adopt in 5 pages
  5afe302 — Sprint C tier 1+2: 11 legacy pages migrated
```

Todo en branch `LGER/main`, pushed.

---

## 7. Próximo paso recomendado para codex

1. **PRIMERO**: levantar el stack (`docker compose up -d` en `python-service/`, `npm run dev` en `sentinel-search/`), loguearse con la cuenta admin, y hacer la **validación browser** del checklist en §2.1. Si algo se ve raro, ajustar ANTES de meterse a los heavy redesigns.

2. **SEGUNDO**: construir los 2 átomos pendientes (`<HealthDot>` y `<CategoryBadge>` en §2.3). Son ~30 min cada uno y desbloquean limpiezas en Operations + Sources + Monitoring que hoy tienen colores hand-rolled.

3. **TERCERO**: Sprint C tier 3 — `EntityProfile` primero (es el output principal de una búsqueda, más impacto visible), `CaseDetail` después. Ambos en §2.2 con planes detallados.

4. **CUARTO (cuando el usuario lo pida)**: activar Google OAuth en producción (§1) y/o atacar los pendientes operacionales de §2.4.

Cuando termines un sprint, commitear con mensaje detallado (mirar el formato de los commits ya hechos — incluyen el _por qué_ del cambio, no solo el _qué_), push a `LGER/main`, y actualizar este HANDOFF con lo nuevo.

---

**Si tienes dudas sobre por qué algo está como está, casi siempre la respuesta vive en el mensaje del commit que lo introdujo.** Los commits de esta sesión están escritos para explicar las decisiones, no solo listar archivos.
