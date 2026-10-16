import React, { useEffect, useRef } from 'react';

interface DitherProps {
  waveColor?: string;
  backgroundColor?: string;
  ditherMode?: 'bayer' | 'noise';
  colorNum?: number;
  pixelSize?: number;
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  mouseEffect?: 'erase' | 'ripple';
  mouseRadius?: number;
  palette?: string[];
  scale?: number;
  contrast?: number;
  brightness?: number;
  mouseStrength?: number;
  trail?: number;
  enableMouseInteraction?: boolean;
  clickRipple?: boolean;
  intro?: boolean;
  disableAnimation?: boolean;
}

export const Dither: React.FC<DitherProps> = ({
  waveColor = '#bcbcbc',
  backgroundColor = '#120f17',
  ditherMode = 'bayer',
  colorNum = 4,
  pixelSize = 2,
  waveSpeed = 0.05,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  mouseEffect = 'erase',
  mouseRadius = 0.3,
  palette = [],
  scale = 1,
  contrast = 1,
  brightness = 0,
  mouseStrength = 1,
  trail = 0.5,
  enableMouseInteraction = true,
  clickRipple = true,
  intro = true,
  disableAnimation = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, ripples: [] as Array<{ x: number; y: number; r: number; a: number }> });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableMouseInteraction) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!enableMouseInteraction || e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.touches[0].clientX - rect.left;
      mouseRef.current.y = e.touches[0].clientY - rect.top;
    };

    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (!clickRipple) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as MouseEvent).clientY;
      if (clientX !== undefined && clientY !== undefined) {
        mouseRef.current.ripples.push({
          x: clientX - rect.left,
          y: clientY - rect.top,
          r: 10,
          a: 1.0,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('click', handleClick as EventListener);
    window.addEventListener('touchstart', handleClick as EventListener, { passive: true });

    const bayer4x4 = [
      [ 0,  8,  2, 10],
      [12,  4, 14,  6],
      [ 3, 11,  1,  9],
      [15,  7, 13,  5]
    ];

    const hexToRgb = (hex: string) => {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map((x) => x + x).join('');
      const num = parseInt(c, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    };

    const bgRgb = hexToRgb(backgroundColor);
    const waveRgb = hexToRgb(waveColor);

    let t = 0;
    const step = Math.max(2, pixelSize);

    const render = () => {
      if (!disableAnimation) {
        t += waveSpeed * 0.4;
      }

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Update ripples
      for (let i = mouseRef.current.ripples.length - 1; i >= 0; i--) {
        const rip = mouseRef.current.ripples[i];
        rip.r += 6;
        rip.a *= 0.94;
        if (rip.a < 0.05) {
          mouseRef.current.ripples.splice(i, 1);
        }
      }

      const cols = Math.ceil(width / step);
      const rows = Math.ceil(height / step);

      // Draw dithered waves
      for (let y = 0; y < rows; y += 2) {
        for (let x = 0; x < cols; x += 2) {
          const px = x * step;
          const py = y * step;

          // Normalized coords
          const nx = (px / width) * waveFrequency;
          const ny = (py / height) * waveFrequency;

          // Wave function
          let wave = Math.sin(nx + t) * Math.cos(ny + t * 0.7) * waveAmplitude;
          wave += Math.sin(nx * 0.5 - t * 0.8) * 0.2;

          // Mouse interaction (erase or repel)
          if (enableMouseInteraction) {
            const dx = px - mouseRef.current.x;
            const dy = py - mouseRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const mRadius = Math.min(width, height) * mouseRadius;

            if (dist < mRadius) {
              const factor = (1 - dist / mRadius) * mouseStrength;
              if (mouseEffect === 'erase') {
                wave -= factor * 0.6;
              } else {
                wave += factor * 0.6;
              }
            }
          }

          // Ripples
          for (const rip of mouseRef.current.ripples) {
            const rdx = px - rip.x;
            const rdy = py - rip.y;
            const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
            if (Math.abs(rdist - rip.r) < 30) {
              wave += Math.sin((rdist - rip.r) * 0.2) * rip.a * 0.4;
            }
          }

          // Bayer thresholding
          const lum = Math.max(0, Math.min(1, wave * contrast + 0.5 + brightness));
          const bayerVal = bayer4x4[(x / 2) % 4][(y / 2) % 4] / 16;

          if (lum > bayerVal) {
            const alpha = Math.min(1, lum * 1.2);
            ctx.fillStyle = `rgba(${waveRgb.r}, ${waveRgb.g}, ${waveRgb.b}, ${alpha * 0.8})`;
            ctx.fillRect(px, py, step * 2, step * 2);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('click', handleClick as EventListener);
      window.removeEventListener('touchstart', handleClick as EventListener);
    };
  }, [
    waveColor,
    backgroundColor,
    ditherMode,
    colorNum,
    pixelSize,
    waveSpeed,
    waveFrequency,
    waveAmplitude,
    mouseEffect,
    mouseRadius,
    scale,
    contrast,
    brightness,
    mouseStrength,
    trail,
    enableMouseInteraction,
    clickRipple,
    intro,
    disableAnimation,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none block z-0"
    />
  );
};

export default Dither;
