import { Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';

type EntityLazyTabPanelProps = {
  entityId: string;
  component: ComponentType<{ entityId: string }> | LazyExoticComponent<ComponentType<any>>;
  fallback: ReactNode;
};

export function EntityLazyTabPanel({ entityId, component: Component, fallback }: EntityLazyTabPanelProps) {
  return (
    <Suspense fallback={fallback}>
      <Component entityId={entityId} />
    </Suspense>
  );
}
