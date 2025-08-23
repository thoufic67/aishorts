"use client";

import { useEffect, useRef, useState } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  opacity: number;
}

export function AnimatedStars() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Initialize stars
  useEffect(() => {
    const generateStars = () => {
      const newStars: Star[] = [];
      for (let i = 0; i < 150; i++) {
        const star: Star = {
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          baseX: Math.random() * 100,
          baseY: Math.random() * 100,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.8 + 0.2,
        };
        star.x = star.baseX;
        star.y = star.baseY;
        newStars.push(star);
      }
      setStars(newStars);
    };

    generateStars();
  }, []);

  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setMousePosition({ x, y });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => container.removeEventListener("mousemove", handleMouseMove);
    }
  }, []);

  // Update star positions based on mouse movement
  useEffect(() => {
    setStars(prevStars =>
      prevStars.map(star => {
        const deltaX = mousePosition.x - star.baseX;
        const deltaY = mousePosition.y - star.baseY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Parallax effect - closer stars move more
        const maxDistance = 50;
        const influence = Math.max(0, 1 - distance / maxDistance);
        const moveStrength = influence * 3; // Adjust this value to control movement intensity
        
        return {
          ...star,
          x: star.baseX + deltaX * moveStrength * 0.01,
          y: star.baseY + deltaY * moveStrength * 0.01,
        };
      })
    );
  }, [mousePosition]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute bg-white rounded-full transition-all duration-100 ease-out"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}