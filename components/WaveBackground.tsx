import React, { useEffect, useRef } from 'react';

const WaveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let animationFrameId: number;
    let tick = 0;

    // Generate more lines with wider spacing and variations
    const lines: any[] = [];
    const lineCount = 12; // Increased quantity
    const baseColors = [
      '99, 102, 241', // Indigo-500
      '139, 92, 246', // Violet-500
      '59, 130, 246', // Blue-500
      '167, 139, 250', // Violet-400
      '56, 189, 248', // Sky-400
    ];

    for (let i = 0; i < lineCount; i++) {
      lines.push({
        color: `rgba(${baseColors[i % baseColors.length]}, 0.2)`, // Reduced opacity to 0.2
        glowColor: `rgba(${baseColors[i % baseColors.length]}, 0.4)`, // Reduced glow opacity
        speed: 0.001 + Math.random() * 0.002,
        amplitude: 50 + Math.random() * 80, // Varied amplitude
        period: 0.001 + Math.random() * 0.002,
        // Spread lines across a wider vertical area, centered
        yOffset: (i - lineCount / 2) * 40 + (Math.random() * 20 - 10), 
        phase: Math.random() * Math.PI * 2,
      });
    }

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);

    const animate = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);
      
      // Use "lighter" composite operation for glowing effect overlap
      ctx.globalCompositeOperation = 'screen'; 

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      lines.forEach((line) => {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
        
        // Add Glow Effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = line.glowColor;

        // Draw curve
        for (let x = 0; x <= width; x += 5) {
          const y = height / 2 + line.yOffset + 
            Math.sin(x * line.period + tick * line.speed + line.phase) * line.amplitude +
            Math.sin(x * line.period * 2 + tick * line.speed * 1.5) * (line.amplitude * 0.2);
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        
        // Reset shadow for next iteration (though we set it every time, good practice)
        ctx.shadowBlur = 0;
      });

      // Reset composite operation for other potential draws (if any)
      ctx.globalCompositeOperation = 'source-over';

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' }} 
    />
  );
};

export default WaveBackground;
