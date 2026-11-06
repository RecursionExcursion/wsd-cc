"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; r: number; speed: number; phase: number };

/**
 * Lightweight canvas starfield. Stars drift slowly and twinkle.
 * Respects prefers-reduced-motion (draws a single static frame).
 * Star color comes from the --star CSS variable so it follows the theme.
 */
export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stars: Star[] = [];
    let rgb = "255 255 255";
    let baseOpacity = 1;
    let frame = 0;
    let width = 0;
    let height = 0;

    const readColors = () => {
      const styles = getComputedStyle(document.documentElement);
      rgb = styles.getPropertyValue("--star").trim() || "255 255 255";
      baseOpacity = parseFloat(styles.getPropertyValue("--star-opacity")) || 1;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Density scales with screen area, capped for performance.
      const count = Math.min(Math.floor((width * height) / 5000), 350);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.3 + 0.2,
        speed: Math.random() * 0.15 + 0.02,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (t: number, animate: boolean) => {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        if (animate) {
          s.y += s.speed;
          if (s.y > height) {
            s.y = 0;
            s.x = Math.random() * width;
          }
        }
        const twinkle = animate ? 0.6 + 0.4 * Math.sin(t / 900 + s.phase) : 0.85;
        ctx.fillStyle = `rgb(${rgb} / ${twinkle * baseOpacity})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // An occasional shooting star (only when animating).
    let meteor: { x: number; y: number; vx: number; vy: number; born: number } | null = null;
    let nextMeteorAt = performance.now() + 4000 + Math.random() * 6000;
    const METEOR_LIFE = 900;

    const drawMeteor = (t: number) => {
      if (!meteor && t >= nextMeteorAt) {
        const speed = 0.9 + Math.random() * 0.5; // px per ms
        const angle = Math.PI * (0.15 + Math.random() * 0.1); // heading down-right
        meteor = {
          x: Math.random() * width * 0.7,
          y: Math.random() * height * 0.4,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          born: t,
        };
      }
      if (!meteor) return;
      const age = t - meteor.born;
      if (age > METEOR_LIFE) {
        meteor = null;
        nextMeteorAt = t + 7000 + Math.random() * 9000;
        return;
      }
      const headX = meteor.x + meteor.vx * age;
      const headY = meteor.y + meteor.vy * age;
      const tailX = headX - meteor.vx * 140;
      const tailY = headY - meteor.vy * 140;
      const fade = Math.sin((age / METEOR_LIFE) * Math.PI) * baseOpacity; // fade in, then out
      const gradient = ctx.createLinearGradient(tailX, tailY, headX, headY);
      gradient.addColorStop(0, `rgb(${rgb} / 0)`);
      gradient.addColorStop(1, `rgb(${rgb} / ${fade})`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();
    };

    const loop = (t: number) => {
      draw(t, true);
      drawMeteor(t);
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      if (motionQuery.matches) draw(0, false);
      else frame = requestAnimationFrame(loop);
    };

    readColors();
    resize();
    start();

    const onResize = () => {
      resize();
      if (motionQuery.matches) draw(0, false);
    };
    window.addEventListener("resize", onResize);
    motionQuery.addEventListener("change", start);

    // Re-read colors when the theme attribute changes.
    const observer = new MutationObserver(() => {
      readColors();
      if (motionQuery.matches) draw(0, false);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      motionQuery.removeEventListener("change", start);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
