import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  audioStream?: MediaStream | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, audioStream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  useEffect(() => {
    if (!audioStream || !isActive || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      return;
    }
    
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    
    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(analyser);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d')!;
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create a fancy glossy background
      const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(10, 10, 40, 0.8)');
      gradient.addColorStop(1, 'rgba(30, 30, 70, 0.4)');
      
      canvasCtx.fillStyle = gradient;
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add a subtle grid
      canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      canvasCtx.lineWidth = 1;
      
      for (let i = 0; i < canvas.width; i += 20) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(i, 0);
        canvasCtx.lineTo(i, canvas.height);
        canvasCtx.stroke();
      }
      
      for (let i = 0; i < canvas.height; i += 20) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, i);
        canvasCtx.lineTo(canvas.width, i);
        canvasCtx.stroke();
      }
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        const barGradient = canvasCtx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        barGradient.addColorStop(0, 'rgba(0, 180, 255, 0.9)');
        barGradient.addColorStop(0.5, 'rgba(70, 100, 255, 0.7)');
        barGradient.addColorStop(1, 'rgba(120, 0, 255, 0.5)');
        
        canvasCtx.fillStyle = barGradient;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        // Add glossy highlight
        canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, 2);
        
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
  }, [audioStream, isActive]);
  
  return (
    <div className="w-full h-20 rounded-md overflow-hidden shadow-lg border border-slate-700/20 backdrop-blur-sm">
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