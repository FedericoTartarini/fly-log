/**
 * A decorative barcode pattern, unique per badge but stable across renders.
 *
 * Derived from the badge id rather than randomised, so a badge keeps the same
 * stripes every time it is drawn — a barcode that changed on each render would
 * read as a glitch.
 */
export const barcodePattern = (id: string, bars = 24): string => {
  let seed = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    seed = Math.imul(seed ^ id.charCodeAt(i), 16777619) >>> 0;
  }

  const next = (range: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % range;
  };

  const stops: string[] = [];
  let x = 0;
  for (let i = 0; i < bars; i += 1) {
    const width = 1 + next(3);
    const gap = 1 + next(3);
    stops.push(`currentColor ${x}px ${x + width}px`);
    x += width;
    stops.push(`transparent ${x}px ${x + gap}px`);
    x += gap;
  }

  return `repeating-linear-gradient(to right, ${stops.join(", ")})`;
};
