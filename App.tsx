import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Archive, RefreshCcw, Wind } from 'lucide-react';
import { AppMode } from './types';
import { COMFORT_MESSAGES } from './constants';

// --- SOUND ENGINE ---
const useSound = () => {
  const ctxRef = useRef<AudioContext | null>(null);
  const burnSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const burnGainRef = useRef<GainNode | null>(null);

  const initCtx = () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) ctxRef.current = new Ctx();
    }
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume();
    }
  };

  const playStrike = () => {
    initCtx();
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  };

  const playIgnite = () => {
    initCtx();
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const toggleBurnLoop = (playing: boolean) => {
    initCtx();
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (playing) {
      if (burnSourceRef.current) return;

      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; 
      }

      burnSourceRef.current = ctx.createBufferSource();
      burnSourceRef.current.buffer = buffer;
      burnSourceRef.current.loop = true;

      burnGainRef.current = ctx.createGain();
      burnGainRef.current.gain.value = 0.8;

      burnSourceRef.current.connect(burnGainRef.current);
      burnGainRef.current.connect(ctx.destination);
      burnSourceRef.current.start();
    } else {
      if (burnSourceRef.current) {
        if (burnGainRef.current) {
             burnGainRef.current.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
        }
        setTimeout(() => {
             burnSourceRef.current?.stop();
             burnSourceRef.current = null;
        }, 500);
      }
    }
  };

  return { playStrike, playIgnite, toggleBurnLoop };
};

// --- COMPONENTS ---

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: 'flame' | 'ash' | 'ember';
  rotation?: number;
}

const NotePaper = React.forwardRef<HTMLDivElement, { 
    content: string, 
    onChange?: (s: string) => void, 
    readOnly?: boolean,
    burnProgress: number 
}>(({ content, onChange, readOnly, burnProgress }, ref) => {
  
  const [clipPath, setClipPath] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  
  // Update burn visuals (Clip Path + Canvas Fire)
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;

    // Resize canvas to match container
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    if (burnProgress <= 0) {
      setClipPath('');
      particlesRef.current = []; // Reset particles
      return;
    }

    if (burnProgress >= 100) {
       setClipPath('polygon(0 0, 0 0, 0 0)'); // Fully gone
       return;
    }

    // --- 1. Calculate Burn Line (Edge) ---
    // Moves from height (bottom) to -50 (top)
    const baseLine = height - (burnProgress / 100) * (height + 150) + 50; 
    const points: [number, number][] = [];
    
    // Generate jagged edge
    const segment = 4; // Smaller segments for finer edge
    const noiseOffset = burnProgress * 1.2; 
    
    for (let x = 0; x <= width; x += segment) {
      // More complex noise for realistic jagged paper tear
      const n = Math.sin(x * 0.1 + noiseOffset) * 8 + 
                Math.cos(x * 0.3 - noiseOffset) * 4 + 
                (Math.random() - 0.5) * 8; 
      points.push([x, baseLine + n]);
    }

    // --- 2. Update Clip Path ---
    const polyPoints = [`0px 0px`, `${width}px 0px`]; // Top Left, Top Right
    const lastPoint = points[points.length - 1];
    polyPoints.push(`${width}px ${Math.min(height, lastPoint[1] + 30)}px`); 

    // Trace jagged line Right -> Left
    for (let i = points.length - 1; i >= 0; i--) {
        // We cut slightly below the visual burn line so the char rendering overlaps the paper
        polyPoints.push(`${points[i][0]}px ${points[i][1] + 1}px`);
    }

    polyPoints.push(`0px ${points[0][1] + 30}px`); // Close to left edge
    setClipPath(`polygon(${polyPoints.join(', ')})`);


    // --- 3. Particle System ---
    
    // Spawn new particles along the line
    points.forEach((pt, i) => {
        // Flame particles (Very Frequent, Small)
        if (Math.random() < 0.6) {
             particlesRef.current.push({
                 id: Math.random(),
                 x: pt[0] + (Math.random() - 0.5) * 6, 
                 y: pt[1] + 2,
                 vx: (Math.random() - 0.5) * 1.0,
                 vy: -Math.random() * 3 - 1, // Rise fast
                 life: Math.random() * 10 + 5, // Short life
                 maxLife: 20,
                 size: Math.random() * 8 + 2, // Small fine flames
                 type: 'flame'
             });
        }
        // Ash particles (Falling naturally)
        if (Math.random() < 0.15) {
             particlesRef.current.push({
                 id: Math.random(),
                 x: pt[0], 
                 y: pt[1],
                 vx: (Math.random() - 0.5) * 2,
                 vy: -1.5, // Initial updraft
                 life: Math.random() * 80 + 40,
                 maxLife: 120,
                 size: Math.random() * 3 + 1, // Small flakes
                 type: 'ash',
                 rotation: Math.random() * 360
             });
        }
        // Ember/Spark particles
        if (Math.random() < 0.05) {
             particlesRef.current.push({
                 id: Math.random(),
                 x: pt[0], y: pt[1],
                 vx: (Math.random() - 0.5) * 4,
                 vy: -Math.random() * 5 - 2,
                 life: Math.random() * 20 + 10,
                 maxLife: 30,
                 size: Math.random() * 1.5 + 0.5,
                 type: 'ember'
             });
        }
    });

    // Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life--;
        
        if (p.life <= 0) {
            particlesRef.current.splice(i, 1);
            continue;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.type === 'flame') {
            p.vy *= 1.05; // Accelerate up
            p.size *= 0.90; // Shrink fast
            p.x += Math.sin(Date.now() / 30 + p.id * 10) * 0.8; // Fast Flicker
        } else if (p.type === 'ash') {
            // Complex ash physics: Updraft then gravity
            if (p.life > p.maxLife * 0.8) {
                p.vy += 0.05; // Slowing down updraft
            } else {
                p.vy += 0.1; // Gravity kicks in
            }
            p.x += Math.sin(Date.now() / 100 + p.id * 5) * 1.5; // Flutter
            if (p.rotation !== undefined) p.rotation += p.vx * 5;
        } else if (p.type === 'ember') {
            p.vy *= 0.98; 
            p.x += (Math.random() - 0.5) * 2; // Chaotic spark
        }
    }

    // --- 4. Render Canvas ---

    // A. Draw Ash (Dark flakes)
    ctx.globalCompositeOperation = 'source-over';
    particlesRef.current.filter(p => p.type === 'ash').forEach(p => {
        const opacity = p.life / p.maxLife;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation || 0) * Math.PI / 180);
        ctx.fillStyle = `rgba(30, 30, 30, ${opacity})`; // Dark grey ash
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
    });

    // B. Draw Char / Burnt Edge
    // We draw a thick dark jagged line to cover the sharp clip edge
    ctx.beginPath();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    
    // 1. Black Char (The burnt paper)
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#0f0f0f'; 
    ctx.filter = 'blur(1px)';
    for (let i = 0; i < points.length; i++) {
        const [x, y] = points[i];
        if (i===0) ctx.moveTo(x, y + 4);
        else ctx.lineTo(x, y + 4);
    }
    ctx.stroke();
    
    // 2. Glowing Ember Edge (Where it meets the paper)
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ef4444'; // Red hot
    ctx.filter = 'blur(2px)';
    ctx.globalAlpha = 0.8;
    ctx.stroke();
    ctx.filter = 'none';
    ctx.globalAlpha = 1.0;


    // C. Draw Flames (Additive Blending)
    ctx.globalCompositeOperation = 'lighter'; // 'lighter' makes overlaps bright
    
    particlesRef.current.filter(p => p.type === 'flame').forEach(p => {
        const lifeRatio = p.life / p.maxLife;
        
        // Colors: White/Yellow core -> Orange -> Red tip
        let hue, lightness, alpha;
        
        if (lifeRatio > 0.8) {
            hue = 50; // Yellow
            lightness = 80;
            alpha = 0.9;
        } else if (lifeRatio > 0.4) {
            hue = 25; // Orange
            lightness = 60;
            alpha = 0.7;
        } else {
            hue = 0; // Red
            lightness = 40;
            alpha = 0.5;
        }

        ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // D. Draw Embers (Bright sparks)
    ctx.globalCompositeOperation = 'source-over';
    particlesRef.current.filter(p => p.type === 'ember').forEach(p => {
        ctx.fillStyle = `rgba(255, 220, 150, ${p.life / p.maxLife})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

  }, [burnProgress]);

  return (
    <div 
        ref={ref} 
        className="absolute top-12 left-1/2 -translate-x-1/2 w-[85vw] max-w-md aspect-[3/4] transition-transform duration-700"
        style={{
            transform: `translate(-50%, 0)`
        }}
    >
       {/* Inner container that gets clipped */}
       <div 
          ref={containerRef}
          className="w-full h-full bg-[#FDFBF7] shadow-2xl p-8 relative overflow-hidden"
          style={{ clipPath: clipPath, transition: 'clip-path 0.05s linear' }}
       >
          {/* Paper Texture */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>
          
          {/* Content */}
          <div className="relative h-full flex flex-col items-center z-10">
              {readOnly ? (
                  <div className="flex-1 w-full font-hand text-lg md:text-xl text-gray-800 leading-loose whitespace-pre-wrap flex items-center justify-center text-center opacity-80">
                      {content}
                  </div>
              ) : (
                  <textarea 
                      value={content}
                      onChange={(e) => onChange && onChange(e.target.value)}
                      placeholder="Write down what burns you..."
                      className="flex-1 w-full bg-transparent border-none outline-none font-hand text-lg md:text-xl text-gray-800 placeholder-gray-300 leading-loose text-center resize-none p-4"
                  />
              )}
              <div className="mt-4 border-t border-gray-100 w-16"></div>
          </div>
          
          {/* Striker Hint (Only visible when not burning) */}
          {burnProgress === 0 && (
             <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-100/50 to-transparent pointer-events-none"></div>
          )}
       </div>

       {/* Canvas Overlay for Fire (Not clipped!) */}
       <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
       />
    </div>
  );
});

// Enhanced lively match flame
const FireFlame = () => (
    <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-12 h-20 pointer-events-none origin-bottom z-50">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes flame-wave-1 {
            0%, 100% { transform: scale(1, 1) rotate(0deg); border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
            25% { transform: scale(1.1, 0.9) rotate(-3deg); border-radius: 40% 60% 70% 30% / 40% 80% 30% 60%; }
            50% { transform: scale(0.9, 1.1) rotate(3deg); border-radius: 70% 30% 30% 70% / 70% 30% 80% 20%; }
            75% { transform: scale(1.05, 0.95) rotate(-2deg); border-radius: 30% 70% 40% 60% / 30% 40% 70% 50%; }
          }
           @keyframes flame-wave-2 {
            0%, 100% { transform: translate(-50%, 0) scale(1) skewX(0deg); }
            33% { transform: translate(-52%, -2px) scale(1.1) skewX(-4deg); }
            66% { transform: translate(-48%, 2px) scale(0.95) skewX(4deg); }
          }
        `}} />
        
        {/* Outer Orange/Red Glow */}
        <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-red-600 via-orange-500 to-transparent opacity-80 blur-[6px]"
             style={{ animation: 'flame-wave-1 0.4s infinite linear alternate' }}></div>
        
        {/* Middle Orange Core */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-3/4 bg-gradient-to-t from-orange-400 to-yellow-500 opacity-90 blur-[4px] rounded-full"
             style={{ animation: 'flame-wave-2 0.3s infinite ease-in-out alternate-reverse' }}></div>

        {/* Inner White Hot Core */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1/2 bg-white rounded-full blur-[3px] opacity-95"
             style={{ animation: 'flame-wave-2 0.2s infinite ease-in-out' }}></div>
    </div>
);

// --- MAIN APP ---

function App() {
  const [mode, setMode] = useState<AppMode>('input');
  const [noteContent, setNoteContent] = useState('');
  const [finalQuote, setFinalQuote] = useState('');
  
  // Match Physics State
  const [matchPos, setMatchPos] = useState({ x: 0, y: 0 }); 
  const [isDragging, setIsDragging] = useState(false);
  const [isIgnited, setIsIgnited] = useState(false);
  const [burnProgress, setBurnProgress] = useState(0);
  
  const matchRef = useRef<HTMLDivElement>(null);
  const notePaperRef = useRef<HTMLDivElement>(null);
  const burnIntervalRef = useRef<number | null>(null);

  const { playStrike, playIgnite, toggleBurnLoop } = useSound();
  const lastPos = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    setMatchPos({ x: window.innerWidth / 2, y: window.innerHeight - 80 });
  }, []);

  useEffect(() => {
      return () => toggleBurnLoop(false);
  }, []);

  // --- INTERACTION HANDLERS ---

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (mode === 'finished') return;
    setIsDragging(true);
    lastPos.current = { 
        x: 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX,
        y: 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY,
        time: Date.now() 
    };
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    setMatchPos({ x: clientX, y: clientY });

    if (notePaperRef.current) {
        const paperRect = notePaperRef.current.getBoundingClientRect();
        
        // 1. Ignition Logic (Strike across bottom)
        if (!isIgnited) {
            const isBottomArea = 
                clientY > paperRect.bottom - 80 && 
                clientY < paperRect.bottom + 80 &&
                clientX > paperRect.left - 20 && 
                clientX < paperRect.right + 20;

            if (isBottomArea) {
                const now = Date.now();
                const dt = now - lastPos.current.time;
                const dx = Math.abs(clientX - lastPos.current.x);
                
                if (dt > 0) {
                    const velocity = dx / dt; 
                    if (velocity > 0.5) { 
                        playStrike();
                        if (navigator.vibrate) navigator.vibrate(5);
                    }
                    if (velocity > 0.8 && dx > 15) { 
                        igniteMatch();
                    }
                }
            }
        }

        // 2. Burning Logic
        // If ignited and touches paper, start burn
        if (isIgnited && mode !== 'finished' && mode !== 'burning') {
             const isTouchingPaper = 
                clientY < paperRect.bottom && 
                clientY > paperRect.top &&
                clientX > paperRect.left && 
                clientX < paperRect.right;
            
            if (isTouchingPaper) {
                startBurningProcess();
            }
        }
    }

    lastPos.current = { x: clientX, y: clientY, time: Date.now() };
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (!isIgnited && mode === 'input') {
        setMatchPos({ x: window.innerWidth / 2, y: window.innerHeight - 80 });
    }
  };

  const igniteMatch = () => {
    setIsIgnited(true);
    playIgnite();
    if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
    setMode('igniting'); 
  };

  const startBurningProcess = () => {
      if (burnIntervalRef.current) return;
      
      setMode('burning');
      toggleBurnLoop(true);
      
      let progress = 0;
      burnIntervalRef.current = window.setInterval(() => {
          progress += 0.4; // Slower burn
          setBurnProgress(progress);
          
          if (Math.random() > 0.8) {
             if (navigator.vibrate) navigator.vibrate(5); 
          }

          if (progress >= 110) { 
              finishBurning();
          }
      }, 16);
  };

  const finishBurning = () => {
      if (burnIntervalRef.current) {
          clearInterval(burnIntervalRef.current);
          burnIntervalRef.current = null;
      }
      toggleBurnLoop(false);
      setFinalQuote(COMFORT_MESSAGES[Math.floor(Math.random() * COMFORT_MESSAGES.length)]);
      setMode('finished');
      setNoteContent('');
  };

  const resetApp = () => {
      setMode('input');
      setIsIgnited(false);
      setBurnProgress(0);
      setMatchPos({ x: window.innerWidth / 2, y: window.innerHeight - 80 });
      setFinalQuote('');
  };

  // --- RENDER ---

  if (mode === 'history') {
      return (
          <div className="h-full w-full bg-[#0D0D0D] flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <Wind size={200} className="text-gray-500" />
               </div>
               <h2 className="text-gray-500 font-sans tracking-widest mb-8 z-10">THE ASH PILE</h2>
               <div className="z-10 text-center text-gray-700">
                   <p>Nothing here yet.</p>
                   <button onClick={() => setMode('input')} className="mt-8 text-[#FF5500] border border-[#FF5500] px-6 py-2 rounded-full">Back</button>
               </div>
          </div>
      );
  }

  return (
    <div 
        className="h-full w-full bg-[#0D0D0D] relative overflow-hidden touch-none"
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black pointer-events-none z-0"></div>

      {mode === 'finished' ? (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 animate-in fade-in duration-1000">
              <p className="text-gray-400 text-sm tracking-[0.2em] mb-8 uppercase">Burn Completed</p>
              <h1 className="text-2xl md:text-3xl font-hand text-white text-center leading-relaxed mb-12 max-w-lg">
                  "{finalQuote}"
              </h1>
              <button 
                onClick={resetApp}
                className="flex items-center gap-2 px-6 py-3 border border-gray-700 rounded-full text-gray-400 hover:text-white hover:border-white transition-all"
              >
                  <RefreshCcw size={16} />
                  <span>Burn Again</span>
              </button>
          </div>
      ) : (
        <>
            <NotePaper 
                ref={notePaperRef}
                content={noteContent} 
                onChange={setNoteContent} 
                readOnly={mode === 'burning' || mode === 'igniting'} 
                burnProgress={burnProgress}
            />

            {mode === 'input' && noteContent.length > 0 && !isDragging && (
                <div className="absolute bottom-32 left-0 right-0 text-center pointer-events-none animate-pulse">
                    <p className="text-gray-500 text-sm tracking-widest">STRIKE THE MATCH ACROSS THE BOTTOM</p>
                </div>
            )}
            {mode === 'igniting' && (
                 <div className="absolute bottom-32 left-0 right-0 text-center pointer-events-none animate-pulse">
                    <p className="text-[#FF5500] text-sm tracking-widest font-bold">BURN THE PAPER</p>
                </div>
            )}
        </>
      )}

      {mode !== 'finished' && (
          <div 
            ref={matchRef}
            className="absolute z-50 pointer-events-auto cursor-grab active:cursor-grabbing"
            style={{
                left: matchPos.x,
                top: matchPos.y,
                transform: `translate(-50%, -50%) rotate(${isDragging ? '45deg' : '0deg'})`,
                transition: isDragging ? 'none' : 'top 0.5s ease-out, left 0.5s ease-out, transform 0.3s'
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            {isIgnited && <FireFlame />}
            <div className={`w-4 h-6 rounded-t-full mx-auto relative ${isIgnited ? 'bg-black' : 'bg-red-700'}`}>
                {!isIgnited && <div className="absolute top-1 left-1 w-1.5 h-2 bg-white/20 rounded-full"></div>}
            </div>
            <div className={`w-2 h-32 mx-auto ${isIgnited ? 'bg-stone-900' : 'bg-[#EBCB98]'} shadow-lg`}></div>
          </div>
      )}

      <div className="absolute bottom-8 left-8 z-40">
        <button 
            onClick={() => setMode('history')}
            className="p-3 bg-white/5 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
            <Archive size={24} />
        </button>
      </div>
    </div>
  );
}

export default App;