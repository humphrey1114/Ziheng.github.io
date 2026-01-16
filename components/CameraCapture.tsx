import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, X } from 'lucide-react';
import Button from './Button';

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError('');
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError('Unable to access camera. Please allow permissions.');
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Flip horizontally if using front camera for a mirror effect feeling
        if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(imageBase64);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="relative w-full h-full max-w-md bg-black flex flex-col">
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white p-6 text-center">
            <p className="mb-4 text-red-400">{error}</p>
            <Button onClick={onCancel} variant="secondary">Go Back</Button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className={`flex-1 w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Overlay Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
              <button 
                onClick={onCancel}
                className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
              >
                <X size={24} />
              </button>
              <button 
                onClick={toggleCamera}
                className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
              >
                <RefreshCw size={24} />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center bg-gradient-to-t from-black/70 to-transparent pb-12">
               <button 
                onClick={takePhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/40 transition-all active:scale-95"
               >
                 <div className="w-16 h-16 bg-white rounded-full"></div>
               </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;