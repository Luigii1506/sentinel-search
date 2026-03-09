# Sentinel PLD — Documentación Completa del Frontend

**Plataforma**: Sentinel PLD (Prevención de Lavado de Dinero)
**Stack**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui + TanStack Query + Framer Motion
**Última actualización**: 2026-03-07

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [Vista: Login (`/login`)](#2-vista-login)
3. [Vista: Home / Dashboard (`/`)](#3-vista-home--dashboard)
4. [Vista: Búsqueda (`/search`)](#4-vista-búsqueda)
5. [Vista: Perfil de Entidad (`/entity/:id`)](#5-vista-perfil-de-entidad)
6. [Vista: Bulk Screening (`/screening/bulk`)](#6-vista-bulk-screening)
7. [Vista: Compliance Dashboard (`/compliance`)](#7-vista-compliance-dashboard)
8. [Vista: Fuentes de Datos (`/admin/sources`)](#8-vista-fuentes-de-datos)
9. [Vista: Merge Review (`/admin/merges`)](#9-vista-merge-review)
10. [Vista: Monitoreo del Sistema (`/monitoring`)](#10-vista-monitoreo-del-sistema)
11. [Vista: Audit Trail (`/admin/audit`)](#11-vista-audit-trail)
12. [Vista: Reportes (`/reports`)](#12-vista-reportes)
13. [Vista: Configuración (`/settings`)](#13-vista-configuración)
14. [Navegación y Layout](#14-navegación-y-layout)
15. [Servicios (API Layer)](#15-servicios-api-layer)
16. [Componentes Reutilizables](#16-componentes-reutilizables)
17. [Indicadores Visuales de Riesgo](#17-indicadores-visuales-de-riesgo)

---

## 1. Arquitectura General

```
sentinel-search/
├── src/
│   ├── pages/                    # Vistas principales (una por ruta)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui (50+ componentes base)
│   │   ├── search/               # Componentes de búsqueda
│   │   ├── graph/                # Grafo de relaciones
│   │   ├── entity/               # Perfil de entidad
│   │   ├── risk/                 # Visualización de riesgo
│   │   ├── Navigation.tsx        # Barra de navegación global
│   │   └── ProtectedRoute.tsx    # Wrapper de autenticación
│   ├── services/                 # Capa de comunicación con API
│   │   ├── api.ts                # Axios instance (base URL, interceptors)
│   │   ├── screening.ts          # Búsqueda y screening
│   │   ├── compliance.ts         # Casos, alertas, whitelist, watchlist
│   │   ├── entities.ts           # Entidades y perfiles
│   │   ├── admin.ts              # Fuentes, jobs, health
│   │   ├── auth.ts               # Autenticación JWT
│   │   └── graph.ts              # Network/relaciones
│   ├── hooks/                    # React Query hooks
│   ├── contexts/                 # AuthContext (JWT + user state)
│   ├── types/                    # TypeScript interfaces
│   └── lib/                      # Utilidades (cn, formatters)
├── App.tsx                       # Router + QueryClient + Layout
└── tailwind.config.ts            # Tema dark-mode
```

### Flujo de datos

```
Usuario → Componente → Hook (TanStack Query) → Service (Axios) → API Backend
                                                                    ↓
Usuario ← Componente ← Hook (cache + state) ← Service ← Response JSON
```

- **Cache**: TanStack Query con `staleTime: 5min`, `retry: 2`
- **Auth**: JWT Bearer token + API Key (`X-API-Key`) en headers
- **API Base**: Configurable via `VITE_API_URL` (default: `http://localhost:8001`)

---

## 2. Vista: Login

**Ruta**: `/login`
**Archivo**: `src/pages/LoginPage.tsx`
**Acceso**: Público (única vista sin autenticación requerida)

### Descripción
Página de inicio de sesión con diseño minimalista sobre fondo animado de red neuronal. Permite a los usuarios autenticarse con email y contraseña.

### Funcionalidades
| Acción | Descripción |
|--------|-------------|
| Ingresar credenciales | Campos de email y contraseña con validación |
| Mostrar/ocultar contraseña | Toggle de visibilidad (icono de ojo) |
| Iniciar sesión | Autenticación via JWT, redirige a la página previa |
| Manejo de errores | Muestra mensaje "Credenciales inválidas" si falla |

### Elementos visuales
- Fondo: `NeuralNetworkBackground` — canvas animado con partículas conectadas
- Card central con logo Sentinel PLD
- Animación de entrada con Framer Motion (fade + slide up)
- Spinner de carga durante autenticación

### Notas técnicas
- Usa `AuthContext` para `login()` y gestión de estado del usuario
- Redirige a la ruta de origen (`location.state.from`) después del login
- Token JWT se almacena y se envía automáticamente en headers posteriores

---

## 3. Vista: Home / Dashboard

**Ruta**: `/`
**Archivo**: `src/pages/HomePage.tsx`
**Acceso**: Autenticado

### Descripción
Landing page principal que muestra estadísticas generales del sistema, barra de búsqueda rápida, y métricas de las bases de datos. Diseño tipo "hero section" con animaciones.

### Funcionalidades
| Acción | Descripción |
|--------|-------------|
| Búsqueda rápida | `IntelligentSearch` — barra de búsqueda con autocompletado integrada en el hero |
| Ver estadísticas | Contadores animados de entidades, fuentes, países, etc. |
| Navegación rápida | Botones de acceso directo a búsqueda, bulk screening, fuentes |

### Métricas mostradas
- **Total de entidades** en Gold Layer (ej. ~577K)
- **Fuentes activas** registradas en el sistema
- **Países cubiertos** por las fuentes de datos
- **Tipos de entidad**: personas, empresas, embarcaciones, etc.

### Elementos visuales
- Hero section con gradiente y fondo de red neuronal
- Contadores numéricos con animación de incremento al hacer scroll (IntersectionObserver)
- Cards de features con iconos descriptivos
- Badge de versión del sistema

### Datos consumidos
- Hook `useDashboard()` → `GET /api/v2/admin/dashboard`

---

## 4. Vista: Búsqueda

**Ruta**: `/search`
**Archivo**: `src/pages/SearchPage.tsx`
**Acceso**: Autenticado

### Descripción
**Vista principal de screening AML/PLD.** Permite buscar nombres contra todas las listas de sanciones, PEP, law enforcement, y más. Es la herramienta core del compliance officer.

### Funcionalidades
| Acción | Descripción |
|--------|-------------|
| Búsqueda por nombre | Input principal — busca contra Gold Layer de OpenSearch |
| Filtrar por confianza mínima | Slider de 0-100% para threshold de coincidencia |
| Filtrar por nivel de fuente | Selector de Source Level: Core AML (1), Extendido (2), Completo (3) |
| Ver resultados | Lista de entidades coincidentes con score, tipo, riesgo, fuentes |
| Expandir resultado | Click en un resultado muestra detalles completos |
| Navegar a perfil | Click en nombre o botón "Ver perfil" → `/entity/:id` |

### Información por cada resultado
| Campo | Descripción |
|-------|-------------|
| **Nombre** | Nombre canónico de la entidad |
| **Match Score** | Porcentaje de coincidencia (0-100) con barra de color |
| **Confianza** | Nivel de confianza del match (badge: alta/media/baja) |
| **Tipo de match** | `opensearch`, `phonetic`, `semantic`, `hybrid` |
| **Tipo de entidad** | Persona, Empresa, Embarcación, Aeronave, Organización (con icono) |
| **Nivel de riesgo** | Critical (rojo), High (naranja), Medium (amarillo), Low (verde) |
| **Risk Score** | Valor numérico 0-100 con RiskScoreGauge (gauge circular) |
| **Fuentes** | Lista de fuentes donde aparece (OFAC, UN, PEP_GABINETE, etc.) |
| **Países** | Nacionalidades y países asociados con banderas |
| **PEP** | Badge si es Persona Políticamente Expuesta + categoría + posiciones |
| **Adverse Media** | Badge naranja si tiene medios adversos + categorías + severidad |
| **Freshness** | Indicador de frescura de datos (verde >0.8, amarillo >0.5, rojo <0.3) |

### Sección expandida (por entidad)
Al hacer click en un resultado se muestra:

1. **Detalles de sanciones**: Programas activos, autoridades, fechas de listado
2. **Adverse Media** (si aplica): Card naranja con categorías (crime, terrorism, corruption, etc.) y nivel de severidad
3. **PEP Info** (si aplica): Posiciones políticas, categoría, si es PEP actual

### Indicadores especiales

#### Badge de Adverse Media
- Color naranja (`bg-orange-500/20`)
- Tooltip muestra categorías encontradas (ej. "corruption, financial_crime")
- Las categorías posibles son: `crime`, `wanted`, `terrorism`, `sanctions_evasion`, `corruption`, `financial_crime`, `human_rights`, `offshore`, `regulatory`

#### Badge de Freshness (Frescura)
- Indica qué tan recientes son los datos de esa entidad
- **Verde** (>0.8): Datos actualizados recientemente
- **Amarillo** (0.5-0.8): Datos con cierta antigüedad
- **Naranja** (0.3-0.5): Datos posiblemente desactualizados
- **Rojo** (<0.3): Datos muy antiguos, requieren verificación
- Tooltip muestra días desde última actualización

### Datos consumidos
- `screeningService.search()` → `POST /api/v2/screen/gold`
- `screeningService.optimizedSearch()` → `POST /api/v2/screen/gold` (con cache cliente)
- `screeningService.semanticSearch()` → `POST /api/v2/screen/gold/semantic`

---

## 5. Vista: Perfil de Entidad

**Ruta**: `/entity/:id`
**Archivo**: `src/pages/EntityProfilePage.tsx`
**Acceso**: Autenticado

### Descripción
Vista detallada de una entidad específica. Muestra toda la información disponible: datos básicos, sanciones, relaciones, documentos, y medios adversos.

### Header del perfil
| Campo | Descripción |
|-------|-------------|
| **Nombre canónico** | Nombre principal normalizado |
| **Tipo de entidad** | Icono + etiqueta (Persona, Empresa, etc.) |
| **Risk Score** | Gauge circular con score numérico y nivel |
| **Nivel de riesgo** | Badge de color (Critical/High/Medium/Low) |
| **Fuentes** | Conteo y lista de fuentes donde aparece |
| **Aliases** | Nombres alternativos conocidos |
| **Nacionalidades** | Países con banderas |

### Tabs (pestañas)
| Tab | Contenido |
|-----|-----------|
| **General** | Información básica, aliases, identificadores, países |
| **Sanciones** | Programas de sanciones, autoridades, fechas de listado, detalles |
| **Relaciones** | Grafo visual de relaciones con otras entidades (`RelationshipGraph`) |
| **Medios** | Perfil de adverse media con categorías y severidad |

### Tab: General
- Datos de identificación (pasaporte, ID nacional, etc.)
- Fecha de nacimiento
- Direcciones conocidas
- Metadata de fuentes

### Tab: Sanciones
- Lista de programas de sanciones activos
- Por cada sanción: autoridad, programa, fecha de listado, razón
- Detalles adicionales específicos por fuente

### Tab: Relaciones
- **Grafo interactivo** (`RelationshipGraph` con D3.js/force-layout)
- Nodos = entidades, aristas = relaciones
- Tipos de relación: familia, asociado, empresa relacionada, etc.
- Click en un nodo navega al perfil de esa entidad

### Tab: Medios
- Categorías de adverse media encontradas
- Severidad por categoría
- Detalles y contexto

### Datos consumidos
- `entityService.getEntity(id)` → `GET /api/v2/entities/:id`
- `graphService.getNetwork(id)` → `GET /api/v2/entities/:id/network`
- `graphService.getRelationships(id)` → `GET /api/v2/entities/:id/relationships`

---

## 6. Vista: Bulk Screening

**Ruta**: `/screening/bulk`
**Archivo**: `src/pages/BulkScreeningPage.tsx`
**Acceso**: Autenticado

### Descripción
Permite procesar múltiples nombres simultáneamente. Ideal para screening masivo de listas de clientes, proveedores, o contrapartes.

### Funcionalidades
| Acción | Descripción |
|--------|-------------|
| Subir archivo CSV | Drag & drop o click para seleccionar archivo |
| Ingresar nombres manual | Textarea para pegar lista de nombres (uno por línea) |
| Configurar confianza | Slider para umbral mínimo de confianza |
| Iniciar screening | Envía el batch para procesamiento asíncrono |
| Ver progreso | Barra de progreso con conteo (procesados/total) |
| Ver resultados | Tabla con resultados por nombre: matches, score, estado |
| Descargar resultados | Botón para exportar resultados en CSV |

### Estados del job
| Estado | Descripción | Visual |
|--------|-------------|--------|
| `queued` | En cola de procesamiento | Badge gris + spinner |
| `processing` | Procesando nombres | Barra de progreso animada |
| `completed` | Terminado exitosamente | Badge verde + link de descarga |
| `failed` | Error en procesamiento | Badge rojo + mensaje de error |

### Resultados por nombre
| Campo | Descripción |
|-------|-------------|
| Query | Nombre buscado |
| Status | `found` / `not_found` / `error` |
| Match count | Número de coincidencias |
| Top score | Score más alto encontrado |
| Top match | Nombre de la mejor coincidencia |

### Datos consumidos
- `screeningService.bulkScreen(file)` → `POST /api/v2/screen/bulk/csv`
- `screeningService.getBulkStatus(jobId)` → `GET /api/v2/screen/bulk/:jobId`

---

## 7. Vista: Compliance Dashboard

**Ruta**: `/compliance`
**Archivo**: `src/pages/ComplianceDashboardPage.tsx`
**Acceso**: Autenticado
**Nuevo**: Agregado en esta iteración

### Descripción
**Centro de comando para el equipo de compliance.** Gestión integral de casos, alertas, falsos positivos, y monitoreo continuo. Esta vista consolida todas las operaciones del día a día del compliance officer.

### Dashboard Superior (Stat Cards)
| Card | Métrica | Descripción |
|------|---------|-------------|
| **Casos Abiertos** | `cases.open_cases` | Casos activos que requieren atención |
| **Alertas Pendientes** | `alerts.total` (status=pending) | Alertas sin revisar |
| **Tasa FP** | `false_positives.fp_rate` | Porcentaje de falsos positivos en últimos 30 días |
| **Entidades Monitoreadas** | `monitoring.total_watched` | Total de entidades en watchlist |

### Fila de Estadísticas FP
| Métrica | Descripción |
|---------|-------------|
| Total decisiones | Decisiones tomadas en el período |
| True Positives | Coincidencias confirmadas como verdaderas |
| False Positives | Coincidencias descartadas como falsas |
| FP Rate | Tasa de falsos positivos (%) |
| Whitelist activas | Entradas de whitelist vigentes |
| Top FP Entities | Entidades que más FP generan |

### Tab 1: Casos (`CasesTab`)

Los **casos** son la unidad de trabajo del compliance officer. Cada caso agrupa alertas relacionadas y permite hacer seguimiento de la investigación.

| Acción | Descripción |
|--------|-------------|
| Ver lista de casos | Tabla con todos los casos, filtrables por estado |
| Ver prioridad | Badge de color: critical (rojo), high (naranja), medium (amarillo), low (verde) |
| Ver estado | Badge: open (azul), investigating (amarillo), escalated (naranja), closed (gris) |
| Identificar SLA breach | Badge rojo "SLA BREACH" si se venció el plazo |
| Ver SAR filed | Indicador si se reportó SAR (Suspicious Activity Report) |
| Ver tags | Etiquetas del caso (ej. "high-risk", "pep", "sanctions") |
| Ver alertas asociadas | Conteo de alertas vinculadas al caso |

#### Campos por caso
| Campo | Descripción |
|-------|-------------|
| `case_number` | Número único del caso (ej. CASE-2026-0001) |
| `title` | Título descriptivo del caso |
| `priority` | critical / high / medium / low |
| `status` | open / investigating / escalated / closed |
| `entity_name` | Nombre de la entidad bajo investigación |
| `risk_level` | Nivel de riesgo de la entidad |
| `sla_breached` | Si se excedió el tiempo SLA |
| `sar_filed` | Si se reportó actividad sospechosa |
| `alerts_count` | Número de alertas asociadas |
| `tags` | Etiquetas categóricas |
| `created_at` | Fecha de creación |

### Tab 2: Alertas (`AlertsTab`)

Las **alertas** son generadas automáticamente cuando el screening detecta una coincidencia que requiere revisión humana.

| Acción | Descripción |
|--------|-------------|
| Ver alertas | Lista de alertas con severidad y estado |
| Filtrar por estado | Pending, Reviewed, Dismissed |
| Ver decisión | Si fue clasificada como TP/FP/Escalated |
| Ver confianza | Porcentaje de confianza del match |

#### Campos por alerta
| Campo | Descripción |
|-------|-------------|
| `severity` | critical / high / medium / low (con color) |
| `status` | pending (amarillo), reviewed (verde), dismissed (gris) |
| `query_name` | Nombre buscado que generó la alerta |
| `matched_entity_name` | Entidad que coincidió |
| `match_confidence` | % de confianza (barra visual) |
| `match_type` | Tipo de match (opensearch, phonetic, etc.) |
| `decision` | true_positive (rojo), false_positive (verde), escalate (amarillo) |
| `matched_sources` | Fuentes donde se encontró la coincidencia |
| `created_at` | Fecha de generación |

### Tab 3: Whitelist (`WhitelistTab`)

El **whitelist** suprime futuras alertas para pares (nombre_query, entidad) que ya fueron revisados y clasificados como falsos positivos.

| Acción | Descripción |
|--------|-------------|
| Ver whitelist | Lista de entradas activas con razón y expiración |
| Eliminar entrada | Botón para remover una entrada del whitelist (soft delete) |
| Ver expiración | Fecha de vencimiento o "Permanente" |
| Ver cliente | Cliente asociado (multi-tenancy) o global |

#### Campos por entrada
| Campo | Descripción |
|-------|-------------|
| `query_name_normalized` | Nombre normalizado que generó el FP |
| `suppressed_entity_name` | Entidad suprimida |
| `reason` | Razón por la que se clasificó como FP |
| `client_name` | Cliente específico o null (global) |
| `expires_at` | Fecha de expiración o "Permanente" |
| `is_permanent` | Si la supresión es permanente |

#### ¿Cómo funciona el whitelist?
1. Un analyst revisa una alerta y la clasifica como **False Positive**
2. Se crea una entrada en whitelist: `(query_normalizado, entity_id)`
3. En futuras búsquedas, si el mismo query genera match con la misma entidad, el resultado se filtra automáticamente
4. Las entradas expiran por defecto a los 365 días (configurable)
5. Se puede crear whitelist permanente para pares bien conocidos

### Tab 4: Watchlist (`WatchlistTab`)

La **watchlist** permite monitoreo continuo de entidades de interés. El sistema re-evalúa periódicamente si hay nuevas coincidencias.

| Acción | Descripción |
|--------|-------------|
| Ver watchlist | Lista de entidades monitoreadas |
| Eliminar entrada | Botón para dejar de monitorear una entidad |
| Ver frecuencia | Cada cuánto se re-evalúa (realtime/daily/weekly/monthly) |
| Ver screenings | Conteo total de screenings realizados |
| Ver estado de alertas | Si tiene alertas activas actualmente |

#### Campos por entrada
| Campo | Descripción |
|-------|-------------|
| `entity_name` | Nombre de la entidad monitoreada |
| `entity_type` | Tipo (persona, empresa, etc.) |
| `monitoring_frequency` | realtime / daily / weekly / monthly |
| `min_confidence` | Umbral mínimo de confianza para generar alerta |
| `last_screened_at` | Última vez que se ejecutó screening |
| `total_screenings` | Total de screenings ejecutados |
| `last_match_count` | Matches en el último screening |
| `last_risk_level` | Nivel de riesgo más reciente |
| `has_active_alerts` | Si tiene alertas pendientes |

### Datos consumidos
- `complianceService.getDashboard()` → `GET /api/v2/compliance/dashboard`
- `complianceService.listCases()` → `GET /api/v2/compliance/cases`
- `complianceService.listAlerts()` → `GET /api/v2/compliance/alerts`
- `complianceService.listWhitelist()` → `GET /api/v2/compliance/whitelist`
- `complianceService.listWatchlist()` → `GET /api/v2/compliance/watchlist`
- `complianceService.getFPStats()` → `GET /api/v2/compliance/whitelist/stats`
- `complianceService.removeFromWhitelist(id)` → `DELETE /api/v2/compliance/whitelist/:id`
- `complianceService.removeFromWatchlist(id)` → `DELETE /api/v2/compliance/watchlist/:id`

---

## 8. Vista: Fuentes de Datos

**Ruta**: `/admin/sources`
**Archivo**: `src/pages/SourcesDashboardPage.tsx`
**Acceso**: Autenticado (menú Admin)

### Descripción
Panel de administración de todas las fuentes de datos registradas en el sistema. Muestra estado, conteos, y permite ejecutar sincronizaciones.

### Funcionalidades
| Acción | Descripción |
|--------|-------------|
| Ver todas las fuentes | Lista completa de fuentes con estadísticas |
| Buscar fuente | Input de búsqueda por nombre de fuente |
| Filtrar por categoría | Selector: Sanctions, PEP, Law Enforcement, etc. |
| Filtrar por estado | Activas, inactivas, con errores |
| Ver detalle de fuente | Click para expandir: conteos por capa, última sincronización |
| Ejecutar sync | Botón para disparar sincronización de una fuente específica |
| Ver freshness | Indicador de qué tan recientes son los datos |

### Información por fuente
| Campo | Descripción |
|-------|-------------|
| Nombre | ID y nombre de display de la fuente |
| Categoría | SANCTIONS, PEP, LAW_ENFORCEMENT, DEBARMENT, etc. |
| País | Bandera + código de país |
| Conteos | Bronze / Silver / Gold records |
| Última sync | Fecha de última sincronización exitosa |
| Freshness | Indicador visual de antigüedad de datos |
| Estado | OK (verde), Warning (amarillo), Error (rojo) |
| Risk Score | Score de riesgo base de la fuente |

### Datos consumidos
- `adminService.getSources()` → `GET /api/v2/admin/sources`
- `adminService.getSourceDetail(id)` → `GET /api/v2/admin/sources/:id`
- `adminService.triggerSync(id)` → `POST /api/v2/sync/:source_id`

---

## 9. Vista: Merge Review

**Ruta**: `/admin/merges`
**Archivo**: `src/pages/MergeReviewPage.tsx`
**Acceso**: Autenticado (menú Admin)

### Descripción
Vista de revisión de las fusiones de entidades realizadas por el Entity Resolution v4/v5. Permite auditar qué entidades fueron unificadas y con qué confianza.

### Funcionalidades
| Acción | Descripción |
|--------|-------------|
| Ver merges | Lista paginada de entidades fusionadas |
| Buscar por nombre | Input de búsqueda en entidades fusionadas |
| Filtrar por método | Cross-Source, Gold Dedup, ER v4, Single Record |
| Expandir merge | Ver children (entidades originales) que se fusionaron |
| Ver confianza | Score de confianza de la fusión (color-coded) |
| Navegar a perfil | Link directo al perfil de la entidad fusionada |

### Información por merge
| Campo | Descripción |
|-------|-------------|
| Nombre canónico | Nombre unificado de la entidad resultante |
| Método | Algoritmo usado para la fusión |
| Confianza | Score de 0-1 (verde >0.95, amarillo >0.88, rojo <0.88) |
| Children count | Número de registros originales fusionados |
| Fuentes | Fuentes de las que provienen los children |
| Fecha | Cuándo se realizó la fusión |

### Detalle expandido (children)
Por cada child se muestra:
- Nombre original
- Fuente de origen
- Score de similitud con el canonical
- Fecha de creación en esa fuente

### Datos consumidos
- `adminService.getMerges()` → `GET /api/v2/admin/merges`
- `adminService.getMergeDetail(id)` → `GET /api/v2/admin/merges/:id`

---

## 10. Vista: Monitoreo del Sistema

**Ruta**: `/monitoring`
**Archivo**: `src/pages/MonitoringPage.tsx`
**Acceso**: Autenticado (menú Admin)

### Descripción
Panel de salud del sistema. Muestra el estado de todos los servicios (API, PostgreSQL, OpenSearch, Redis, Celery) y los jobs de sincronización en ejecución.

### Funcionalidades
| Acción | Descripción |
|--------|-------------|
| Ver health check | Estado de cada servicio: healthy/degraded/down |
| Ver jobs activos | Lista de tareas Celery en ejecución con progreso |
| Ver jobs recientes | Historial de jobs completados/fallidos |
| Refresh manual | Botón para actualizar estado del sistema |

### Servicios monitoreados
| Servicio | Descripción |
|----------|-------------|
| API | FastAPI application server |
| PostgreSQL | Base de datos principal |
| OpenSearch | Motor de búsqueda para screening |
| Redis | Message broker + cache |
| Celery Worker | Worker de tareas default |
| Celery Worker Heavy | Worker para tareas pesadas (SAM, SAT) |

### Información por job
| Campo | Descripción |
|-------|-------------|
| Tipo | full_sync, refresh, reindex |
| Fuente | Source ID de la fuente siendo procesada |
| Estado | queued, running, completed, failed |
| Progreso | Porcentaje completado |
| Duración | Tiempo transcurrido |
| Inicio | Timestamp de inicio |

### Datos consumidos
- `adminService.getHealth()` → `GET /api/v2/admin/health`
- `adminService.getJobs()` → `GET /api/v2/admin/jobs`

---

## 11. Vista: Audit Trail

**Ruta**: `/admin/audit`
**Archivo**: `src/pages/AuditPage.tsx`
**Acceso**: Autenticado (menú Admin)

### Descripción
Registro de auditoría de todas las operaciones del sistema. Muestra sincronizaciones, cambios de datos, y acciones administrativas con línea de tiempo.

### Funcionalidades
| Acción | Descripción |
|--------|-------------|
| Ver historial de syncs | Por fuente: última sync, estado, conteos |
| Buscar fuente | Filtro por nombre de fuente |
| Expandir detalle | Ver estadísticas de cada sincronización |
| Ver freshness | Indicador de antigüedad de datos por fuente |
| Filtrar por estado | Exitosas, fallidas, en progreso |

### Información mostrada
- Lista de fuentes con su historial de sincronización
- Por cada sync: fecha, duración, registros procesados, errores
- Indicadores de freshness por fuente
- Estadísticas aggregadas

### Datos consumidos
- `adminService.getSources()` → `GET /api/v2/admin/sources`
- `adminService.getJobs()` → `GET /api/v2/admin/jobs`

---

## 12. Vista: Reportes

**Ruta**: `/reports`
**Archivo**: Inline en `App.tsx` (placeholder)
**Estado**: Próximamente

### Descripción
Generación de reportes de cumplimiento. Actualmente muestra un placeholder indicando que la funcionalidad está en desarrollo.

### Funcionalidades planeadas
- Generación de reportes SAR (Suspicious Activity Report)
- Reportes de screening masivo
- Estadísticas de casos y decisiones
- Exportación en PDF/Excel

---

## 13. Vista: Configuración

**Ruta**: `/settings`
**Archivo**: Inline en `App.tsx` (placeholder)
**Estado**: Próximamente

### Descripción
Configuración del sistema y perfil de usuario. Actualmente muestra un placeholder.

### Funcionalidades planeadas
- Configuración de umbrales de riesgo
- Gestión de usuarios y roles
- Configuración de SLA para casos
- Preferencias de notificaciones

---

## 14. Navegación y Layout

**Archivo**: `src/components/Navigation.tsx`

### Estructura de navegación

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Sentinel PLD   Dashboard  Búsqueda  Bulk  Compliance  [Admin ▼]  [Avatar]  │
└─────────────────────────────────────────────────────────────┘
```

### Links principales (barra superior)
| Link | Ruta | Icono |
|------|------|-------|
| Dashboard | `/` | LayoutDashboard |
| Búsqueda | `/search` | Search |
| Bulk Screening | `/screening/bulk` | Upload |
| Compliance | `/compliance` | Shield |

### Menú Admin (dropdown)
| Link | Ruta | Icono |
|------|------|-------|
| Fuentes de Datos | `/admin/sources` | Database |
| Merge Review | `/admin/merges` | GitMerge |
| Monitoreo | `/monitoring` | Activity |
| Audit Trail | `/admin/audit` | ClipboardList |
| Reportes | `/reports` | BarChart3 |
| Configuración | `/settings` | Settings |

### Comportamiento
- **Desktop**: Barra horizontal fija con links principales + dropdown Admin
- **Mobile**: Menú hamburguesa con todos los links en lista vertical
- **Scroll**: Se oculta al hacer scroll hacia abajo, reaparece al subir
- **Active state**: Indicador animado (spring animation) en el link activo
- **User menu**: Avatar con dropdown (perfil, cerrar sesión)

---

## 15. Servicios (API Layer)

### `api.ts` — Configuración base
- Axios instance con `baseURL` configurable
- Interceptor: agrega `Authorization: Bearer <token>` y `X-API-Key`
- Manejo global de errores 401 (redirect a login)

### `screening.ts` — Búsqueda y Screening
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `optimizedSearch()` | `POST /api/v2/screen/gold` | Búsqueda optimizada con cache cliente |
| `semanticSearch()` | `POST /api/v2/screen/gold/semantic` | Búsqueda semántica con embeddings |
| `search()` | `POST /api/v2/screen/gold` | Búsqueda estándar con mapeo completo |
| `getSuggestions()` | (usa optimizedSearch) | Autocompletado rápido |
| `bulkScreen()` | `POST /api/v2/screen/bulk/csv` | Screening masivo por CSV |
| `getBulkStatus()` | `GET /api/v2/screen/bulk/:id` | Estado de job de bulk |

**Cache cliente**: Map en memoria, TTL 5 min, máx 100 entradas. Key = `query_minConfidence_sourceLevel`.

### `compliance.ts` — Gestión de Compliance
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `getDashboard()` | `GET /api/v2/compliance/dashboard` | Estadísticas generales |
| `listCases()` | `GET /api/v2/compliance/cases` | Lista de casos |
| `getCase()` | `GET /api/v2/compliance/cases/:id` | Detalle de caso + alertas + timeline |
| `createCase()` | `POST /api/v2/compliance/cases` | Crear nuevo caso |
| `updateCaseStatus()` | `PATCH /api/v2/compliance/cases/:id/status` | Cambiar estado |
| `makeDecision()` | `POST /api/v2/compliance/cases/:id/decisions` | TP/FP/Escalate |
| `addNote()` | `POST /api/v2/compliance/cases/:id/notes` | Agregar nota al caso |
| `listAlerts()` | `GET /api/v2/compliance/alerts` | Lista de alertas |
| `listWhitelist()` | `GET /api/v2/compliance/whitelist` | Lista de whitelist |
| `addToWhitelist()` | `POST /api/v2/compliance/whitelist` | Agregar al whitelist |
| `removeFromWhitelist()` | `DELETE /api/v2/compliance/whitelist/:id` | Eliminar del whitelist |
| `getFPStats()` | `GET /api/v2/compliance/whitelist/stats` | Estadísticas FP |
| `listWatchlist()` | `GET /api/v2/compliance/watchlist` | Lista de watchlist |
| `addToWatchlist()` | `POST /api/v2/compliance/watchlist` | Agregar al watchlist |
| `removeFromWatchlist()` | `DELETE /api/v2/compliance/watchlist/:id` | Eliminar del watchlist |
| `getAdverseMediaProfile()` | `GET /api/v2/compliance/adverse-media/:id` | Perfil de medios adversos |
| `searchAdverseMedia()` | `GET /api/v2/compliance/adverse-media` | Búsqueda de medios adversos |
| `getNetworkRisk()` | `GET /api/v2/compliance/network-risk/:id` | Riesgo de red |
| `getUBOAnalysis()` | `GET /api/v2/compliance/ubo/:id` | Análisis UBO |

### `entities.ts` — Entidades
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `getEntity()` | `GET /api/v2/entities/:id` | Perfil completo de entidad |
| `getEntitySanctions()` | `GET /api/v2/entities/:id/sanctions` | Sanciones de la entidad |

### `admin.ts` — Administración
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `getSources()` | `GET /api/v2/admin/sources` | Lista de fuentes |
| `getSourceDetail()` | `GET /api/v2/admin/sources/:id` | Detalle de fuente |
| `getHealth()` | `GET /api/v2/admin/health` | Health check del sistema |
| `getJobs()` | `GET /api/v2/admin/jobs` | Lista de jobs Celery |
| `getDashboard()` | `GET /api/v2/admin/dashboard` | Stats para HomePage |
| `getMerges()` | `GET /api/v2/admin/merges` | Entidades fusionadas |
| `triggerSync()` | `POST /api/v2/sync/:source_id` | Disparar sincronización |

### `graph.ts` — Relaciones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `getNetwork()` | `GET /api/v2/entities/:id/network` | Red de relaciones |
| `getRelationships()` | `GET /api/v2/entities/:id/relationships` | Lista de relaciones |

---

## 16. Componentes Reutilizables

### Componentes de búsqueda (`src/components/search/`)
| Componente | Descripción |
|------------|-------------|
| `IntelligentSearch` | Barra de búsqueda con autocompletado y sugerencias |
| `OptimizedSearch` | Búsqueda con selector de source level (Core/Extended/Full) |
| `SemanticSearchToggle` | Toggle para activar búsqueda semántica |
| `SemanticResults` | Visualización de resultados semánticos |
| `PerformanceMonitor` | Métricas de performance de búsqueda (tiempo, cache hits) |

### Componentes de riesgo (`src/components/risk/`)
| Componente | Descripción |
|------------|-------------|
| `RiskScoreGauge` | Gauge circular SVG con score numérico y color por nivel |
| `RiskBreakdownChart` | Gráfico de desglose de riesgo por categoría |

### Componentes de entidad (`src/components/entity/`)
| Componente | Descripción |
|------------|-------------|
| `RiskSummaryHeader` | Header compacto con score, nivel y fuentes |
| `InformationTabs` | Tabs de información de entidad |

### Componentes de grafo (`src/components/graph/`)
| Componente | Descripción |
|------------|-------------|
| `RelationshipGraph` | Grafo interactivo de relaciones (D3 force layout) |

### Componentes UI (`src/components/ui/`)
50+ componentes base de shadcn/ui: Button, Card, Badge, Dialog, DropdownMenu, Input, Select, Slider, Tabs, Tooltip, Avatar, Skeleton, Textarea, etc.

---

## 17. Indicadores Visuales de Riesgo

### Código de colores por nivel de riesgo
| Nivel | Color | Clase CSS |
|-------|-------|-----------|
| Critical | Rojo | `bg-red-500/20 text-red-400 border-red-500/30` |
| High | Naranja | `bg-orange-500/20 text-orange-400 border-orange-500/30` |
| Medium | Amarillo | `bg-yellow-500/20 text-yellow-400 border-yellow-500/30` |
| Low | Verde | `bg-green-500/20 text-green-400 border-green-500/30` |

### Código de colores por prioridad de caso
| Prioridad | Color | Borde izquierdo |
|-----------|-------|-----------------|
| Critical | Rojo | `border-l-red-500` |
| High | Naranja | `border-l-orange-500` |
| Medium | Amarillo | `border-l-yellow-500` |
| Low | Verde | `border-l-green-500` |

### Badges especiales
| Badge | Color | Significado |
|-------|-------|-------------|
| PEP | Púrpura | Persona Políticamente Expuesta |
| Adverse Media | Naranja | Tiene medios adversos negativos |
| Freshness (stale) | Rojo/Amarillo | Datos posiblemente desactualizados |
| SLA BREACH | Rojo | Caso excedió el tiempo SLA |
| SAR Filed | Azul | Reporte de actividad sospechosa presentado |
| True Positive | Rojo | Alerta confirmada como positivo verdadero |
| False Positive | Verde | Alerta descartada como falso positivo |

---

## Resumen de Rutas

| Ruta | Vista | Propósito |
|------|-------|-----------|
| `/login` | Login | Autenticación |
| `/` | Home | Dashboard principal con stats y búsqueda rápida |
| `/search` | Búsqueda | Screening AML/PLD contra todas las fuentes |
| `/entity/:id` | Perfil | Detalle completo de una entidad |
| `/screening/bulk` | Bulk | Screening masivo por CSV o lista |
| `/compliance` | Compliance | Gestión de casos, alertas, whitelist, watchlist |
| `/admin/sources` | Fuentes | Administración de fuentes de datos |
| `/admin/merges` | Merges | Revisión de fusiones de entidades |
| `/monitoring` | Monitoreo | Salud del sistema y jobs activos |
| `/admin/audit` | Audit | Historial de operaciones |
| `/reports` | Reportes | (Próximamente) |
| `/settings` | Config | (Próximamente) |

---

*Documentación generada el 2026-03-07 — Sentinel PLD v2.0*
