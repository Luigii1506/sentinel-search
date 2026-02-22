# AGENTS.md - Sentinel Search Frontend

## Descripción General

Sentinel Search es el frontend de demostración para la API de Compliance (Prevención de Lavado de Dinero - PLD). Es una aplicación React moderna que muestra las capacidades de búsqueda, screening y análisis de riesgo de la API.

**Stack Tecnológico:**
- React 19 + TypeScript 5
- Vite (build tool)
- Tailwind CSS (estilos)
- shadcn/ui (componentes UI)
- TanStack Query (data fetching)
- React Router (navegación)
- Framer Motion (animaciones)
- Recharts (gráficos)
- React Flow (gráfos de relaciones)

---

## Estructura del Proyecto

```
sentinel-search/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes shadcn/ui base
│   │   ├── search/          # Componentes de búsqueda
│   │   ├── entity/          # Componentes de perfil de entidad
│   │   ├── graph/           # Componentes de visualización de grafos
│   │   ├── risk/            # Componentes de análisis de riesgo
│   │   ├── Navigation.tsx   # Barra de navegación principal
│   │   ├── ProtectedRoute.tsx # Guard de rutas protegidas
│   │   └── NeuralNetworkBackground.tsx # Fondo animado 3D
│   ├── contexts/
│   │   └── AuthContext.tsx  # Contexto de autenticación
│   ├── hooks/
│   │   ├── useScreening.ts  # Hook para screening de entidades
│   │   ├── useSearch.ts     # Hook para búsqueda general
│   │   ├── useEntity.ts     # Hook para datos de entidad
│   │   ├── useGraph.ts      # Hook para datos de grafos
│   │   └── useDashboard.ts  # Hook para estadísticas
│   ├── pages/
│   │   ├── HomePage.tsx     # Página de inicio
│   │   ├── SearchPage.tsx   # Página de resultados de búsqueda
│   │   ├── EntityProfilePage.tsx # Perfil detallado de entidad
│   │   └── LoginPage.tsx    # Página de login
│   ├── services/
│   │   ├── api.ts           # Configuración de axios + interceptors
│   │   ├── auth.ts          # Servicios de autenticación
│   │   ├── entities.ts      # Servicios de entidades
│   │   ├── screening.ts     # Servicios de screening
│   │   ├── graph.ts         # Servicios de grafos
│   │   └── admin.ts         # Servicios de administración
│   ├── types/
│   │   ├── api.ts           # Tipos de la API
│   │   └── index.ts         # Tipos generales de la app
│   └── lib/
│       └── utils.ts         # Utilidades (cn, formatters, etc.)
├── components.json          # Configuración de shadcn/ui
├── tailwind.config.js       # Configuración de Tailwind
└── vite.config.ts           # Configuración de Vite
```

---

## Convenciones de Código

### 1. Imports

Usar alias `@/` para imports absolutos desde `src`:

```typescript
// ✅ Correcto
import { Button } from '@/components/ui/button';
import { useScreening } from '@/hooks/useScreening';

// ❌ Incorrecto
import { Button } from '../../../components/ui/button';
```

### 2. Componentes

Usar named exports para todos los componentes:

```typescript
// ✅ Correcto
export function MyComponent() { ... }

// ❌ Incorrecto
export default function MyComponent() { ... }
```

### 3. Tipos

Definir tipos en `src/types/` con prefijos descriptivos:

```typescript
// api.ts - Tipos que vienen del backend
export interface ScreeningRequest { ... }
export interface ScreeningMatch { ... }

// index.ts - Tipos de la aplicación
export type EntityType = 'person' | 'company' | 'vessel' | 'aircraft' | 'organization';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';
```

### 4. Hooks Personalizados

Todos los hooks deben empezar con `use` y retornar un objeto:

```typescript
export function useScreening() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScreeningMatch[]>([]);
  
  const executeSearch = useCallback(async () => {
    // lógica
  }, [query]);
  
  return {
    query,
    results,
    setQuery,
    executeSearch,
  };
}
```

---

## Sistema de Colores (Tailwind)

### Colores de Riesgo

```typescript
// Risk colors - usados consistentemente en toda la app
const riskColors = {
  critical: '#ef4444', // red-500
  high: '#f97316',     // orange-500
  medium: '#eab308',   // yellow-500
  low: '#22c55e',      // green-500
  none: '#6b7280',     // gray-500
};

// Uso en componentes
<div className="bg-red-500/20 text-red-500">Crítico</div>
<div className="bg-orange-500/20 text-orange-500">Alto</div>
```

### Tema Oscuro

La aplicación usa un tema oscuro por defecto con fondo negro:

```css
bg-[#0a0a0a]  /* Fondo principal */
bg-[#1a1a1a]  /* Cards/elevated surfaces */
border-white/10 /* Bordes sutiles */
```

---

## API Integration

### Configuración

La API base URL se configura via variable de entorno:

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_KEY=your-api-key
```

### Manejo de Errores

El interceptor de axios en `services/api.ts` maneja automáticamente:
- 401: Intenta refresh token, si falla redirige a login
- 403: Muestra toast de permisos insuficientes
- 422: Muestra errores de validación de FastAPI
- 429: Rate limiting
- 500+: Errores del servidor

### Ejemplo de llamada a API

```typescript
// services/screening.ts
import { api } from './api';
import type { ScreeningRequest, ScreeningResponse } from '@/types/api';

export async function screenEntity(request: ScreeningRequest): Promise<ScreeningResponse> {
  const response = await api.post('/api/v2/screen', request);
  return response.data;
}

// Uso en componente
const { mutate, isPending } = useMutation({
  mutationFn: screenEntity,
  onSuccess: (data) => {
    setResults(data.matches);
  },
});
```

---

## Componentes UI (shadcn/ui)

### Agregar nuevos componentes

```bash
npx shadcn add button
npx shadcn add card
npx shadcn add dialog
```

### Componentes personalizados

Los componentes de negocio están en `src/components/`:

- `search/IntelligentSearch.tsx` - Búsqueda con autocomplete
- `entity/RiskSummaryHeader.tsx` - Header de perfil con score de riesgo
- `entity/InformationTabs.tsx` - Tabs de información detallada
- `graph/RelationshipGraph.tsx` - Visualización de relaciones
- `risk/RiskScoreGauge.tsx` - Medidor de riesgo circular
- `risk/RiskBreakdownChart.tsx` - Gráfico de desglose de riesgo

---

## Enrutamiento

```typescript
// App.tsx
<Route path="/" element={<HomePage />} />
<Route path="/search" element={<SearchPage />} />
<Route path="/entity/:id" element={<EntityProfilePage />} />
<Route path="/login" element={<LoginPage />} />

// Rutas protegidas (requieren auth)
<Route path="/monitoring" element={<ProtectedRoute><Monitoring /></ProtectedRoute>} />
<Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
```

---

## Autenticación

### Flujo JWT

1. Login obtiene `access_token` y `refresh_token`
2. Tokens guardados en localStorage
3. Axios interceptor añade Bearer token a cada request
4. En 401, intenta refresh automático
5. Si refresh falla, logout y redirección a login

### Uso del contexto

```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

---

## Data Fetching (TanStack Query)

### Configuración por defecto

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});
```

### Ejemplo de uso

```typescript
// Query para obtener datos
const { data, isLoading, error } = useQuery({
  queryKey: ['entity', id],
  queryFn: () => fetchEntity(id),
  enabled: !!id,
});

// Mutation para acciones
const mutation = useMutation({
  mutationFn: screenEntity,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['screenings'] });
    toast.success('Screening completado');
  },
});
```

---

## Animaciones (Framer Motion)

### Patrones comunes

```typescript
// Fade in
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>

// Slide up
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
>

// Stagger children
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

// Hover effects
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
```

---

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview de producción
npm run preview

# Lint
npm run lint
```

---

## Flujo de Trabajo para Nuevas Features

### 1. Crear tipos (si es necesario)

```typescript
// src/types/api.ts
export interface NewFeatureRequest { ... }
export interface NewFeatureResponse { ... }
```

### 2. Crear servicio API

```typescript
// src/services/newFeature.ts
import { api } from './api';

export async function fetchNewFeature() {
  const response = await api.get('/api/v2/new-feature');
  return response.data;
}
```

### 3. Crear hook

```typescript
// src/hooks/useNewFeature.ts
import { useQuery } from '@tanstack/react-query';

export function useNewFeature() {
  return useQuery({
    queryKey: ['newFeature'],
    queryFn: fetchNewFeature,
  });
}
```

### 4. Crear componente

```typescript
// src/components/feature/NewFeature.tsx
export function NewFeature() {
  const { data, isLoading } = useNewFeature();
  // ...
}
```

### 5. Agregar a página/ruta

```typescript
// src/pages/Page.tsx o App.tsx
import { NewFeature } from '@/components/feature/NewFeature';
```

---

## Testing

### Estrategia

- Componentes: Storybook (por implementar)
- Integración: Playwright (por implementar)
- Unit: Vitest (por implementar)

### Ejecutar tests

```bash
# Por implementar
npm run test
npm run test:e2e
```

---

## Deployment

### Build de producción

```bash
npm run build
```

Genera archivos estáticos en `dist/` para servir con cualquier servidor web.

### Variables de entorno para producción

```bash
VITE_API_BASE_URL=https://api.sentinel.com
VITE_API_KEY=production-api-key
```

---

## Troubleshooting

### Problemas comunes

**Error: Cannot find module '@/components/ui/button'**
- Verificar que `tsconfig.json` tenga el path alias configurado
- Reiniciar TypeScript server en VS Code

**Error de CORS en desarrollo**
- Verificar que el backend tenga CORS habilitado para `http://localhost:5173`
- Verificar `VITE_API_BASE_URL` en `.env`

**Tailwind no aplica estilos**
- Verificar que `tailwind.config.js` incluya los paths correctos
- Reiniciar servidor de desarrollo

---

## Recursos

- [React Documentation](https://react.dev)
- [TanStack Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Vite](https://vitejs.dev)

---

**Nota:** Este documento debe actualizarse cuando se agreguen nuevas convenciones, componentes o cambios arquitectónicos importantes.
