import React, { useEffect, useRef } from 'react';

interface DitherVeilProps {
  src: string;
  pattern?: 'floyd' | 'bayer';
  pixelSize?: number;
  inkColor?: string;
  paperColor?: string;
  revealRadius?: number;
  softness?: number;
  linger?: number;
  fit?: 'contain' | 'cover';
  rimColor?: string;
  palette?: 'duotone';
  levels?: number;
  contrast?: number;
  brightness?: number;
  rim?: number;
  reverse?: boolean;
  wander?: boolean;
  clickBurst?: boolean;
}

export const DitherVeil: React.FC<DitherVeilProps> = ({
  src,
  pattern = 'floyd',
  pixelSize = 2,
  inkColor = '#120f17',
  paperColor = '#f4f1ea',
  revealRadius = 200,
  softness = 0.6,
  linger = 1,
  fit = 'contain',
  rimColor = '#a78bfa',
  palette = 'duotone',
  levels = 2,
  contrast = 1.15,
  brightness = 0,
  rim = 0,
  reverse = false,
  wander = false,
  clickBurst = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, burst: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    let animId: number;
    let isLoaded = false;

    img.onload = () => {
      isLoaded = true;
      resizeAndRender();
    };

    const resizeAndRender = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.max(rect.width, 300);
      canvas.height = Math.max(rect.height, 400);
    };

    window.addEventListener('resize', resizeAndRender);

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!canvas || e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.touches[0].clientX - rect.left;
      mouseRef.current.y = e.touches[0].clientY - rect.top;
    };

    const handleClick = () => {
      if (!clickBurst) return;
      mouseRef.current.burst = 100;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('touchmove', handleTouchMove, { passive: true });
      container.addEventListener('click', handleClick);
      container.addEventListener('touchstart', handleClick, { passive: true });
    }

    const bayer4x4 = [
      [ 0,  8,  2, 10],
      [12,  4, 14,  6],
      [ 3, 11,  1,  9],
      [15,  7, 13,  5]
    ];

    // Helper to parse hex color to RGB
    const hexToRgb = (hex: string) => {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map((x) => x + x).join('');
      const num = parseInt(c, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    };

    const ink = hexToRgb(inkColor);
    const paper = hexToRgb(paperColor);
    const rimRgb = hexToRgb(rimColor);

    const render = () => {
      if (mouseRef.current.burst > 0) {
        mouseRef.current.burst *= 0.92;
      }

      if (isLoaded && ctx) {
        const w = canvas.width;
        const h = canvas.height;

        // Clear
        ctx.fillStyle = inkColor;
        ctx.fillRect(0, 0, w, h);

        // Draw image fitted
        const imgRatio = img.width / img.height;
        const canvasRatio = w / h;
        let dw = w;
        let dh = h;
        let dx = 0;
        let dy = 0;

        if (fit === 'contain') {
          if (imgRatio > canvasRatio) {
            dh = w / imgRatio;
            dy = (h - dh) / 2;
          } else {
            dw = h * imgRatio;
            dx = (w - dw) / 2;
          }
        } else {
          // cover
          if (imgRatio > canvasRatio) {
            dw = h * imgRatio;
            dx = (w - dw) / 2;
          } else {
            dh = w / imgRatio;
            dy = (h - dh) / 2;
          }
        }

        ctx.drawImage(img, dx, dy, dw, dh);

        // Process pixel data for DitherVeil effect
        const step = Math.max(1, pixelSize);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const effectiveRadius = revealRadius + mouseRef.current.burst * 1.5;

        for (let y = 0; y < h; y += step) {
          for (let x = 0; x < w; x += step) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Greyscale luminance
            let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            lum = (lum - 0.5) * contrast + 0.5 + brightness;
            lum = Math.max(0, Math.min(1, lum));

            // Mouse reveal circle distance
            const mdx = x - mouseRef.current.x;
            const mdy = y - mouseRef.current.y;
            const dist = Math.sqrt(mdx * mdx + mdy * mdy);
            const inReveal = dist < effectiveRadius;

            // Bayer threshold
            const bayerVal = bayer4x4[(y / step) % 4][(x / step) % 4] / 16;
            const isDot = lum > bayerVal;

            let finalR = ink.r;
            let finalG = ink.g;
            let finalB = ink.b;

            if (isDot) {
              if (inReveal) {
                // Rim accent glow inside reveal circle
                const rimFactor = Math.pow(dist / effectiveRadius, 2);
                finalR = paper.r * (1 - rimFactor * 0.4) + rimRgb.r * (rimFactor * 0.4);
                finalG = paper.g * (1 - rimFactor * 0.4) + rimRgb.g * (rimFactor * 0.4);
                finalB = paper.b * (1 - rimFactor * 0.4) + rimRgb.b * (rimFactor * 0.4);
              } else {
                finalR = paper.r * 0.75;
                finalG = paper.g * 0.75;
                finalB = paper.b * 0.75;
              }
            }

            // Fill pixel block
            for (let py = 0; py < step && y + py < h; py++) {
              for (let px = 0; px < step && x + px < w; px++) {
                const pidx = ((y + py) * w + (x + px)) * 4;
                data[pidx] = finalR;
                data[pidx + 1] = finalG;
                data[pidx + 2] = finalB;
                data[pidx + 3] = 255;
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeAndRender);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('click', handleClick);
        container.removeEventListener('touchstart', handleClick);
      }
    };
  }, [
    src,
    pattern,
    pixelSize,
    inkColor,
    paperColor,
    revealRadius,
    softness,
    linger,
    fit,
    rimColor,
    palette,
    levels,
    contrast,
    brightness,
    rim,
    reverse,
    wander,
    clickBurst,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-3xl cursor-crosshair select-none bg-[#120f17] shadow-2xl"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export default DitherVeil;
