
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  isActive: boolean;
  audioStream?: MediaStream | null;
}

const AudioVisualizer = ({ isActive, audioStream }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  useEffect(() => {
    if (!isActive || !audioStream) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    dataArrayRef.current = dataArray;
    
    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(analyser);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    
    const draw = () => {
      if (!canvasCtx || !analyserRef.current || !dataArrayRef.current) return;
      
      animationRef.current = requestAnimationFrame(draw);
      
      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
      
      const barWidth = (WIDTH / dataArrayRef.current.length) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        barHeight = dataArrayRef.current[i] / 2;
        
        const r = barHeight + 25;
        const g = 250;
        const b = 100;
        
        canvasCtx.fillStyle = `rgb(${r},${g},${b})`;
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [isActive, audioStream]);
  
  return (
    <div className={cn(
      "w-full h-20 rounded-lg overflow-hidden bg-black/5",
      isActive ? "opacity-100" : "opacity-30"
    )}>
      <canvas 
        ref={canvasRef}
        width={300}
        height={80}
        className="w-full h-full"
      />
    </div>
  );
};

export default AudioVisualizer;
