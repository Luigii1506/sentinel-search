# Componentes de Búsqueda Optimizada - Smart Search v3

## Componentes Disponibles

### 1. OptimizedSearch
Componente principal de búsqueda con métricas de performance integradas.

```tsx
import { OptimizedSearch } from '@/components/search/OptimizedSearch';

function MyPage() {
  return (
    <OptimizedSearch
      onResultSelect={(result) => console.log(result)}
      placeholder="Buscar..."
      showMetrics={true}
    />
  );
}
```

**Props:**
- `onResultSelect?: (result: OptimizedSearchResult) => void` - Callback cuando se selecciona un resultado
- `placeholder?: string` - Placeholder del input
- `showMetrics?: boolean` - Mostrar métricas de performance
- `className?: string` - Clases CSS adicionales

### 2. SearchModeToggle
Toggle para cambiar entre modos de búsqueda (Auto, Nombres, Conceptos).

```tsx
import { SearchModeToggle } from '@/components/search/SearchModeToggle';

function MyPage() {
  const [mode, setMode] = useState('auto');
  
  return (
    <SearchModeToggle
      mode={mode}
      onChange={setMode}
    />
  );
}
```

### 3. PerformanceMonitor
Panel de monitoreo de performance en tiempo real.

```tsx
import { PerformanceMonitor } from '@/components/search/PerformanceMonitor';

function MyPage() {
  return <PerformanceMonitor />;
}
```

## Hooks

### useOptimizedSearch
Hook principal para manejar búsquedas optimizadas.

```tsx
import { useOptimizedSearch } from '@/hooks/useOptimizedSearch';

function MyComponent() {
  const {
    query,
    setQuery,
    results,
    performance,
    searchMode,
    setSearchMode,
    isSearching,
    executeSearch,
    clearSearch,
    cacheStats,
    searchHistory,
  } = useOptimizedSearch();

  return (
    <div>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
      />
      <button onClick={() => executeSearch()}>Buscar</button>
      
      {performance && (
        <div>
          Tiempo: {performance.executionTimeMs}ms
          Estrategia: {performance.strategy}
        </div>
      )}
    </div>
  );
}
```

## Integración en Router

Agregar la nueva página al router:

```tsx
// src/App.tsx o router config
import { OptimizedSearchPage } from '@/pages/OptimizedSearchPage';

<Route path="/search-optimized" element={<OptimizedSearchPage />} />
```

## Actualizar Componente Existente

Para actualizar el componente `IntelligentSearch` existente para usar el endpoint optimizado:

```tsx
// En IntelligentSearch.tsx
import { useOptimizedSearch } from '@/hooks/useOptimizedSearch';

// Reemplazar useScreening con useOptimizedSearch
const { 
  query, 
  setQuery, 
  results, 
  executeSearch,
  performance 
} = useOptimizedSearch();

// Los resultados ahora incluyen métricas de performance
```

## Mejoras de Performance

Las optimizaciones implementadas incluyen:

1. **Cache de embeddings**: Evita regenerar embeddings para queries repetidas
2. **Búsqueda paralela**: OpenSearch + Smart Search en paralelo
3. **Cache de resultados**: Redis + caché cliente
4. **Timeouts agresivos**: Evita esperas largas
5. **Model warmup**: Precarga del modelo en startup

**Resultados esperados:**
- Primera búsqueda: ~5x más rápida
- Búsquedas cacheadas: ~33x más rápidas
- Latencia media: ~200-300ms

## Modos de Búsqueda

### Auto (Recomendado)
El sistema detecta automáticamente el tipo de query:
- Nombres propios → OpenSearch + Phonetic
- Conceptos abstractos → Smart Search (embeddings)
- Mixtos → Combinación híbrida

### Nombres (Traditional)
Fuerza búsqueda por OpenSearch:
- Mejor para: "Juan García", "Empresa XYZ"
- Usa: Fuzzy matching + fonético

### Conceptos (Semantic)
Fuerza búsqueda semántica:
- Mejor para: "terrorismo financiero", "alto riesgo"
- Usa: Embeddings vectoriales

## Métricas Visibles

El componente muestra:
- **Tiempo de respuesta**: Color-coded (<100ms verde, <300ms amarillo, >300ms naranja)
- **Estrategia usada**: Auto, Nombres, o Conceptos
- **Cache hit**: Indicador si vino de caché
- **Fuentes**: Qué servicios se usaron (OpenSearch, Smart Search, Phonetic)
- **Total de resultados**: Número de matches encontrados
