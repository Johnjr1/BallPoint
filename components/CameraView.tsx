import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { GeminiLiveService } from '../services/geminiService';
import { ShotResult, CourtPosition } from '../types';

interface CameraViewProps {
  onShotRecorded: (result: ShotResult, position: CourtPosition) => void;
  isActive: boolean;
  currentInstruction: string;
  activePosition?: CourtPosition;
}

const FRAME_RATE = 2; // Frames per second sent to AI
const JPEG_QUALITY = 0.5;

export const CameraView: React.FC<CameraViewProps> = ({ onShotRecorded, isActive, currentInstruction, activePosition }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const [geminiService, setGeminiService] = useState<GeminiLiveService | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  
  // Animation States
  const [flyingBall, setFlyingBall] = useState<{id: number, startX: string, result: ShotResult} | null>(null);
  const [lastShotFeedback, setLastShotFeedback] = useState<{result: string, position: string} | null>(null);

  // Helper to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setStatus("Camera Error");
    }
  };

  // Trigger visual ball simulation
  const simulateShot = (result: ShotResult, position: CourtPosition) => {
      // Determine start X based on position
      let startX = '50%';
      if (position === CourtPosition.LEFT) startX = '20%';
      if (position === CourtPosition.RIGHT) startX = '80%';
      
      setFlyingBall({ id: Date.now(), startX, result });
      
      // Clear ball after animation
      setTimeout(() => {
          setFlyingBall(null);
          // Show big feedback after ball hits hoop (approx 600ms)
          setLastShotFeedback({ result, position });
          setTimeout(() => setLastShotFeedback(null), 1500);
      }, 600);
  };

  // Initialize Gemini Service
  useEffect(() => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setStatus("Missing API Key");
      return;
    }

    const service = new GeminiLiveService(apiKey);
    setGeminiService(service);

    // Initial connection
    service.connect({
      apiKey,
      onStatusChange: setStatus,
      onShotDetected: (res, pos) => {
        // Map string to enum
        const result = res === 'MAKE' ? ShotResult.MAKE : ShotResult.MISS;
        const position = pos === 'LEFT' ? CourtPosition.LEFT : pos === 'RIGHT' ? CourtPosition.RIGHT : CourtPosition.CENTER;
        
        simulateShot(result, position);
        onShotRecorded(result, position);
      }
    });

    return () => {
      service.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard Simulation Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isActive || !activePosition) return;
        
        // Prevent repeated keys if needed, though rapid fire might be desired for testing
        
        if (e.key === 'ArrowUp') {
            simulateShot(ShotResult.MAKE, activePosition);
            // Delay the actual record slightly to match animation? 
            // Better to record immediately for app logic state, animation is visual only.
            // But if we want the "Result" sound to happen when ball hits, we might delay calling onShotRecorded.
            // Let's call it after 500ms to sync with "ball hitting hoop".
            setTimeout(() => onShotRecorded(ShotResult.MAKE, activePosition), 500);
        } else if (e.key === 'ArrowDown') {
            simulateShot(ShotResult.MISS, activePosition);
            setTimeout(() => onShotRecorded(ShotResult.MISS, activePosition), 500);
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, activePosition, onShotRecorded]);

  // Handle Video Streaming Loop
  useEffect(() => {
    if (!isActive || !stream || !geminiService || !videoRef.current || !canvasRef.current) {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    frameIntervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas && video.readyState === 4) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to Blob then Base64
        canvas.toBlob(async (blob) => {
          if (blob) {
            const base64 = await blobToBase64(blob);
            geminiService.sendFrame(base64);
          }
        }, 'image/jpeg', JPEG_QUALITY);
      }
    }, 1000 / FRAME_RATE);

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [isActive, stream, geminiService]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Real Court Overlay (SVG) */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Defs for gradients */}
            <defs>
                <linearGradient id="floorGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="transparent"/>
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8"/>
                </linearGradient>
            </defs>

            {/* Perspective Floor */}
            {/* We assume the camera is at the baseline looking out, or looking at the hoop? 
                Usually for tracking shots, camera points AT the hoop.
                So the 'Floor' is the bottom of the screen.
                Let's draw a perspective key and 3pt line.
            */}
            
            {/* Left Zone Highlight */}
            <path 
                d="M 0 100 L 30 100 L 40 50 L 0 50 Z" 
                fill={activePosition === CourtPosition.LEFT ? "rgba(234, 88, 12, 0.3)" : "rgba(255,255,255,0.05)"}
                stroke="white" strokeWidth="0.5"
            />
            {/* Center Zone Highlight (The Key area extended) */}
            <path 
                d="M 30 100 L 70 100 L 60 50 L 40 50 Z" 
                fill={activePosition === CourtPosition.CENTER ? "rgba(234, 88, 12, 0.3)" : "rgba(255,255,255,0.05)"}
                stroke="white" strokeWidth="0.5"
            />
            {/* Right Zone Highlight */}
            <path 
                d="M 70 100 L 100 100 L 100 50 L 60 50 Z" 
                fill={activePosition === CourtPosition.RIGHT ? "rgba(234, 88, 12, 0.3)" : "rgba(255,255,255,0.05)"}
                stroke="white" strokeWidth="0.5"
            />

            {/* The Key (Paint) */}
            <path d="M 35 100 L 65 100 L 58 60 L 42 60 Z" fill="none" stroke="white" strokeWidth="1" strokeDasharray="2,2"/>
            
            {/* Free Throw Circle (Top of key) */}
            <path d="M 42 60 Q 50 55 58 60" fill="none" stroke="white" strokeWidth="1" />
            
            {/* 3 Point Line (Approximate Arc) */}
            <path d="M 5 100 L 5 70 Q 50 35 95 70 L 95 100" fill="none" stroke="white" strokeWidth="1" />

            {/* Hoop Location Hint */}
            <circle cx="50" cy="30" r="3" stroke="orange" strokeWidth="1" fill="transparent" opacity="0.8" />
        </svg>
      </div>
      
      {/* Zone Labels */}
      <div className="absolute bottom-4 left-0 w-full flex justify-between px-8 pointer-events-none">
          <span className={`font-black text-2xl ${activePosition === CourtPosition.LEFT ? 'text-orange-500 scale-125' : 'text-white/20'}`}>LEFT</span>
          <span className={`font-black text-2xl ${activePosition === CourtPosition.CENTER ? 'text-orange-500 scale-125' : 'text-white/20'}`}>CENTER</span>
          <span className={`font-black text-2xl ${activePosition === CourtPosition.RIGHT ? 'text-orange-500 scale-125' : 'text-white/20'}`}>RIGHT</span>
      </div>

      {/* Overlay UI */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-4">
        
        {/* Status Bar */}
        <div className="flex justify-between items-center">
          <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-mono flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            {status}
          </div>
          <div className="bg-orange-600/90 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
            {currentInstruction}
          </div>
        </div>

        {/* Shot Feedback Overlay (Static Big Icon) */}
        {lastShotFeedback && (
          <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-300">
             <div className={`p-6 rounded-2xl backdrop-blur-xl border-4 shadow-2xl flex flex-col items-center ${
               lastShotFeedback.result === 'MAKE' ? 'bg-green-500/80 border-green-300' : 'bg-red-500/80 border-red-300'
             }`}>
                {lastShotFeedback.result === 'MAKE' ? <CheckCircle2 size={80} className="text-white mb-2" /> : <XCircle size={80} className="text-white mb-2" />}
                <h2 className="text-5xl font-black text-white tracking-wider">{lastShotFeedback.result}</h2>
             </div>
          </div>
        )}

        {/* Flying Ball Animation */}
        {flyingBall && (
             <div 
                key={flyingBall.id}
                className="absolute w-8 h-8 bg-orange-500 rounded-full shadow-lg border-2 border-orange-300 z-50"
                style={{
                    left: flyingBall.startX,
                    bottom: '0%',
                    transform: 'translate(-50%, 0)',
                    animation: 'throwBall 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'
                }}
             />
        )}
        
        <style>{`
            @keyframes throwBall {
                0% {
                    bottom: 0%;
                    transform: translate(-50%, 0) scale(1.5);
                }
                50% {
                   transform: translate(-50%, 0) scale(1);
                }
                100% {
                    bottom: 70%; /* Hoop height */
                    left: 50%;
                    transform: translate(-50%, 0) scale(0.6);
                }
            }
        `}</style>

        {/* Controls hint */}
        <div className="text-center text-white/50 text-xs mb-2 mt-auto">
          Align zones with court floor.
        </div>
      </div>
    </div>
  );
};
