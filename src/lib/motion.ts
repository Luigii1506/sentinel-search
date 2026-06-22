export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

// ───────────────────────── Sistema de movimiento "agua" ─────────────────────
//
// Curva de firma: deceleración larga y suave, sin rebote — todo "fluye" y se
// asienta despacio. Se usa en el morph home⇄búsqueda para que se sienta premium
// y casi adictivo. Sube las duraciones; baja la rigidez del spring.

/** Easing de firma (tween). Soft-expo-out: arranca con cuerpo y desacelera largo. */
export const easeWater = [0.22, 1, 0.36, 1] as const;

/** Spring fluido para rieles/tarjetas/reveal: lento, pesado, sin overshoot. */
export const springWater = {
  type: 'spring',
  stiffness: 52,
  damping: 20,
  mass: 1.15,
} as const;

/** Spring un poco más vivo para micro-interacciones (hover de tarjetas). */
export const springSoft = {
  type: 'spring',
  stiffness: 140,
  damping: 18,
  mass: 0.9,
} as const;

/**
 * Expansión del centro al entrar a búsqueda: MUY lenta, con un rebotecito
 * final mínimo y super suave (sensación "videojuego"). bounce bajo = apenas
 * sobrepasa y se asienta; duration alto = todo en cámara lenta.
 */
export const springExpand = {
  type: 'spring',
  duration: 2.9,
  bounce: 0.1,
} as const;

/**
 * Morph del riel (nav ⇄ historial): punto medio — ni tan lento como el
 * resto, ni un corte brusco. Sobreamortiguado (sin rebote) para que la
 * desaparición del menú se sienta limpia.
 */
export const springRail = {
  type: 'spring',
  stiffness: 100,
  damping: 21,
  mass: 0.8,
} as const;

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

export const fadeUpItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};
