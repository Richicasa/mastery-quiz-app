import React, { useEffect, useRef } from 'react';

interface FluxLinesProps {
  colors?: string[];
  glow?: number;
  rimWidth?: number;
  lineWidth?: number;
  flowDirection?: 'down' | 'up' | 'left' | 'right';
  mouseInteraction?: boolean;
  clickSwirl?: boolean;
  speed?: number;
  scale?: number;
  turbulence?: number;
  fluidity?: number;
  sharpness?: number;
  shimmer?: number;
  mouseStrength?: number;
  mouseRadius?: number;
  intro?: boolean;
  lightMode?: boolean;
}

export const FluxLines: React.FC<FluxLinesProps> = ({
  colors = ['#ffffff', '#ffffff', '#ffffff'],
  glow = 2,
  rimWidth = 0.2,
  lineWidth = 1,
  flowDirection = 'down',
  mouseInteraction = true,
  clickSwirl = true,
  speed = 0.5,
  scale = 1.6,
  turbulence = 1,
  fluidity = 0.1,
  sharpness = 2.5,
  shimmer = 1.5,
  mouseStrength = 1,
  mouseRadius = 0.35,
  intro = true,
  lightMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000, swirl: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseInteraction) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = e.clientX - rect.left;
      mouseRef.current.targetY = e.clientY - rect.top;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!mouseInteraction || e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = e.touches[0].clientX - rect.left;
      mouseRef.current.targetY = e.touches[0].clientY - rect.top;
    };

    const handleClick = () => {
      if (!clickSwirl) return;
      mouseRef.current.swirl = 25;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handleClick, { passive: true });

    const lineCount = 42;
    let t = 0;

    const render = () => {
      t += 0.015 * speed;
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.1;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.1;
      if (mouseRef.current.swirl > 0) {
        mouseRef.current.swirl *= 0.94;
      }

      ctx.fillStyle = lightMode ? 'rgba(245, 245, 247, 0.25)' : 'rgba(7, 9, 14, 0.25)';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.shadowBlur = glow * 8;
      ctx.lineWidth = lineWidth * 1.2;

      for (let i = 0; i < lineCount; i++) {
        const p = i / lineCount;
        const color = colors[i % colors.length] || '#ffffff';
        ctx.strokeStyle = color;
        ctx.shadowColor = color;

        ctx.beginPath();
        const step = 15;
        const totalSteps = Math.ceil(height / step) + 4;

        for (let s = 0; s <= totalSteps; s++) {
          const y = (s * step);
          const phase = (p * Math.PI * 4) + t * (fluidity * 8 + 0.5);

          let x = (width * p) + Math.sin(phase + y * 0.005 * turbulence) * (40 * scale);
          x += Math.cos(phase * 0.5 + y * 0.01) * (20 * scale);

          // Mouse interaction and click swirl
          if (mouseInteraction) {
            const dx = x - mouseRef.current.x;
            const dy = y - mouseRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const radius = Math.min(width, height) * mouseRadius;

            if (dist < radius && dist > 0) {
              const force = (1 - dist / radius) * mouseStrength * 40;
              const angle = Math.atan2(dy, dx) + (mouseRef.current.swirl * 0.1);
              x += Math.cos(angle) * force;
            }
          }

          if (s === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handleClick);
    };
  }, [
    colors,
    glow,
    rimWidth,
    lineWidth,
    flowDirection,
    mouseInteraction,
    clickSwirl,
    speed,
    scale,
    turbulence,
    fluidity,
    sharpness,
    shimmer,
    mouseStrength,
    mouseRadius,
    intro,
    lightMode,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto block"
    />
  );
};

export default FluxLines;
