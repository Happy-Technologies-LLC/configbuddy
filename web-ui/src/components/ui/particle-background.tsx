import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  velocityX: number;
  velocityY: number;
  glowSize: number;
  update(): void;
  draw(context: CanvasRenderingContext2D): void;
}

interface ParticleBackgroundProps {
  opacity?: number;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ opacity = 0.5 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    // Get theme-aware colors
    const getColors = () => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        // Dark mode: blues and accent colors
        return ['#3b82f6', '#60a5fa', '#ef4444', '#f87171', '#dc2626'];
      } else {
        // Light mode: slightly muted versions
        return ['#2563eb', '#3b82f6', '#dc2626', '#ef4444', '#f87171'];
      }
    };

    class ParticleClass implements Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      velocityX: number;
      velocityY: number;
      glowSize: number;

      constructor(x: number, y: number, size: number, color: string, velocityX: number, velocityY: number) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.glowSize = Math.random() * 30 + 20; // Increased glow
      }

      draw(context: CanvasRenderingContext2D) {
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fillStyle = this.color;
        context.shadowColor = this.color;
        context.shadowBlur = this.glowSize;
        context.fill();
        context.shadowBlur = 0;
      }

      update() {
        this.x += this.velocityX;
        this.y += this.velocityY;

        if (!canvas) return;
        if (this.x < 0 || this.x > canvas.width) this.velocityX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.velocityY *= -1;
      }
    }

    const initParticles = (count: number) => {
      particlesRef.current = [];
      const colors = getColors();

      for (let i = 0; i < count; i++) {
        const size = Math.random() * 4 + 3; // Larger particles (3-7px instead of 2-5px)
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const velocityX = (Math.random() - 0.5) * 0.5;
        const velocityY = (Math.random() - 0.5) * 0.5;
        particlesRef.current.push(new ParticleClass(x, y, size, color, velocityX, velocityY));
      }
    };

    const connectParticles = (context: CanvasRenderingContext2D) => {
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            const gradient = context.createLinearGradient(
              particles[i].x,
              particles[i].y,
              particles[j].x,
              particles[j].y
            );
            gradient.addColorStop(0, particles[i].color);
            gradient.addColorStop(1, particles[j].color);

            context.beginPath();
            context.strokeStyle = gradient;
            context.lineWidth = 0.8;
            context.moveTo(particles[i].x, particles[i].y);
            context.lineTo(particles[j].x, particles[j].y);
            context.stroke();
          }
        }
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((particle) => {
        particle.update();
        particle.draw(ctx);
      });
      connectParticles(ctx);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Initialize and start animation
    initParticles(100);
    animate();

    // Handle window resize - keep particles, just update canvas size
    const handleResize = () => {
      resizeCanvas();
      // Don't reinitialize particles - they'll adjust to new boundaries automatically
      // Particles that are out of bounds will bounce back in
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [theme]);

  // Use different blend mode for light vs dark
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const blendMode = isDark ? 'screen' : 'darken';

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: blendMode, opacity }}
    />
  );
};

ParticleBackground.displayName = 'ParticleBackground';
