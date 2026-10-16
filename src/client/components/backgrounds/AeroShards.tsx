import React, { useEffect, useRef } from 'react';

interface AeroShardsProps {
  shardColor?: string;
  accentColor?: string;
  placement?: 'full' | 'center';
  material?: 'glass';
  markers?: 'plus';
  count?: number;
  depthOfField?: number;
  vignette?: number;
  mouseInteraction?: boolean;
  pulseOnClick?: boolean;
  holdToGather?: boolean;
  lightMode?: boolean;
  shardSize?: number;
  spread?: number;
  twist?: number;
  billow?: number;
  speed?: number;
  scale?: number;
  glow?: number;
  grain?: number;
  intro?: boolean;
  mouseStrength?: number;
  parallax?: number;
  paused?: boolean;
}

interface Shard {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  isMarker: boolean;
  color: string;
  alpha: number;
}

export const AeroShards: React.FC<AeroShardsProps> = ({
  shardColor = '#896ABD',
  accentColor = '#A855F7',
  placement = 'full',
  material = 'glass',
  markers = 'plus',
  count = 1300,
  depthOfField = 0.75,
  vignette = 0.3,
  mouseInteraction = true,
  pulseOnClick = true,
  holdToGather = true,
  lightMode = false,
  shardSize = 1,
  spread = 1,
  twist = 1,
  billow = 1,
  speed = 1,
  scale = 1,
  glow = 0.35,
  grain = 0.06,
  intro = true,
  mouseStrength = 0.6,
  parallax = 0.5,
  paused = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isDown: false, pulse: 0 });

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
      if (!mouseInteraction) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = (e.clientX - rect.left - width / 2) / (width / 2);
      mouseRef.current.targetY = (e.clientY - rect.top - height / 2) / (height / 2);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!mouseInteraction || e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = (e.touches[0].clientX - rect.left - width / 2) / (width / 2);
      mouseRef.current.targetY = (e.touches[0].clientY - rect.top - height / 2) / (height / 2);
    };

    const handleMouseDown = () => {
      if (holdToGather) mouseRef.current.isDown = true;
      if (pulseOnClick) mouseRef.current.pulse = 1.0;
    };

    const handleMouseUp = () => {
      mouseRef.current.isDown = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('touchstart', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp, { passive: true });

    // Initialize shards (reduced count for optimal 60fps on all devices)
    const activeCount = Math.min(count, 450);
    const shards: Shard[] = [];

    for (let i = 0; i < activeCount; i++) {
      const isAccent = Math.random() < 0.25;
      const isPlus = markers === 'plus' && Math.random() < 0.15;
      shards.push({
        x: (Math.random() - 0.5) * width * 1.5 * spread,
        y: (Math.random() - 0.5) * height * 1.5 * spread,
        z: Math.random() * 800 + 50,
        vx: (Math.random() - 0.5) * 0.4 * speed,
        vy: (Math.random() - 0.5) * 0.4 * speed,
        vz: (Math.random() - 0.5) * 0.3 * speed,
        size: (Math.random() * 6 + 3) * shardSize * scale,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        vRotX: (Math.random() - 0.5) * 0.02 * speed,
        vRotY: (Math.random() - 0.5) * 0.02 * speed,
        vRotZ: (Math.random() - 0.5) * 0.02 * speed,
        isMarker: isPlus,
        color: isAccent ? accentColor : shardColor,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    const render = () => {
      if (paused) return;

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      if (mouseRef.current.pulse > 0) {
        mouseRef.current.pulse *= 0.95;
      }

      ctx.clearRect(0, 0, width, height);

      // Vignette background
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.2,
        width / 2,
        height / 2,
        width * 0.8
      );
      grad.addColorStop(0, 'rgba(11, 15, 25, 0.4)');
      grad.addColorStop(1, `rgba(7, 9, 14, ${0.85 + vignette * 0.15})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const fov = 400;
      const cx = width / 2 + mouseRef.current.x * 60 * parallax;
      const cy = height / 2 + mouseRef.current.y * 60 * parallax;

      // Draw shards
      ctx.save();
      for (const shard of shards) {
        // Dynamics
        shard.x += shard.vx;
        shard.y += shard.vy;
        shard.z += shard.vz;
        shard.rotX += shard.vRotX;
        shard.rotY += shard.vRotY;
        shard.rotZ += shard.vRotZ;

        // Wrap around bounds
        if (shard.z < 50) shard.z = 850;
        if (shard.z > 850) shard.z = 50;

        // Hold to gather
        if (mouseRef.current.isDown) {
          shard.x += -shard.x * 0.02;
          shard.y += -shard.y * 0.02;
        }

        // Pulse on click
        if (mouseRef.current.pulse > 0.05) {
          shard.x += shard.vx * mouseRef.current.pulse * 15;
          shard.y += shard.vy * mouseRef.current.pulse * 15;
        }

        // Perspective projection
        const scaleFactor = fov / (fov + shard.z);
        const px = cx + shard.x * scaleFactor;
        const py = cy + shard.y * scaleFactor;

        if (px < -50 || px > width + 50 || py < -50 || py > height + 50) continue;

        const renderedSize = shard.size * scaleFactor;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(shard.rotZ);

        ctx.globalAlpha = shard.alpha * (scaleFactor * 1.2);

        if (shard.isMarker) {
          // Plus marker
          ctx.strokeStyle = shard.color;
          ctx.lineWidth = 1.2;
          const s = renderedSize * 0.7;
          ctx.beginPath();
          ctx.moveTo(-s, 0);
          ctx.lineTo(s, 0);
          ctx.moveTo(0, -s);
          ctx.lineTo(0, s);
          ctx.stroke();
        } else {
          // Glass shard triangle
          ctx.fillStyle = shard.color;
          ctx.shadowBlur = glow * 10;
          ctx.shadowColor = shard.color;
          ctx.beginPath();
          ctx.moveTo(0, -renderedSize);
          ctx.lineTo(renderedSize * 0.7, renderedSize * 0.7);
          ctx.lineTo(-renderedSize * 0.7, renderedSize * 0.5);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('touchstart', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [
    shardColor,
    accentColor,
    placement,
    material,
    markers,
    count,
    depthOfField,
    vignette,
    mouseInteraction,
    pulseOnClick,
    holdToGather,
    lightMode,
    shardSize,
    spread,
    twist,
    billow,
    speed,
    scale,
    glow,
    grain,
    intro,
    mouseStrength,
    parallax,
    paused,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none block z-0"
    />
  );
};

export default AeroShards;
