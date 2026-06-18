import { Suspense, lazy } from 'react';

const NeuralNetworkBackground = lazy(() =>
  import('@/components/NeuralNetworkBackground').then((module) => ({
    default: module.NeuralNetworkBackground,
  })),
);

export function LazyNeuralBackground() {
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-background" aria-hidden="true" />}>
      <NeuralNetworkBackground />
    </Suspense>
  );
}

export default LazyNeuralBackground;
