import React, { useState, useEffect } from 'react';
import { Camera, BarChart2, Home, Settings } from 'lucide-react';
import { DrillSelector } from './components/DrillSelector';
import { CameraView } from './components/CameraView';
import { StatsDashboard } from './components/StatsDashboard';
import { AppView, DrillSession, DrillStep, Shot, ShotResult, CourtPosition } from './types';
import { storageService } from './services/storageService';

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [session, setSession] = useState<DrillSession | null>(null);
  
  // Audio context for feedback sounds
  const vibrate = () => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]); // Distinct pattern for completion
    }
  };

  const playZoneChangeSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Success sound: Rising arpeggio to signal progress
      const now = ctx.currentTime;
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.linearRampToValueAtTime(1046.50, now + 0.3); // C6

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  const startDrill = (steps: DrillStep[]) => {
    const newSession: DrillSession = {
      id: Date.now().toString(),
      name: "Training Session",
      steps,
      currentStepIndex: 0,
      shots: [],
      isActive: true,
      completed: false
    };
    setSession(newSession);
    setCurrentView(AppView.ACTIVE_DRILL);
  };

  const handleShotRecorded = (result: ShotResult, position: CourtPosition) => {
    if (!session || !session.isActive) return;

    // 1. Record the shot
    const newShot: Shot = {
      id: Date.now().toString(),
      result,
      position,
      timestamp: Date.now()
    };

    // UPDATED LOGIC:
    setSession(prev => {
        if (!prev) return null;
        
        const nextShots = [...prev.shots, newShot];
        const step = prev.steps[prev.currentStepIndex];
        
        // Only count shots that match the current required position
        // If the user shoots from the wrong position, we record it but don't count it for drill progress
        if (newShot.position !== step.position) {
             return { ...prev, shots: nextShots };
        }

        // Count progress
        const relevantShots = nextShots.filter(s => s.position === step.position);
        const makes = relevantShots.filter(s => s.result === ShotResult.MAKE).length;
        const attempts = relevantShots.length;

        let stepComplete = false;
        // Prioritize targetAttempts: move to next zone after X shots regardless of makes/misses
        if (step.targetAttempts && attempts >= step.targetAttempts) {
            stepComplete = true;
        }
        // If no targetAttempts, check for targetMakes
        else if (step.targetMakes && makes >= step.targetMakes) {
            stepComplete = true;
        }

        if (stepComplete) {
            vibrate(); // Haptic Feedback
            playZoneChangeSound(); // Audio Feedback
            
            const nextIndex = prev.currentStepIndex + 1;
            if (nextIndex >= prev.steps.length) {
                // Drill Finished
                return {
                    ...prev,
                    shots: nextShots,
                    currentStepIndex: nextIndex,
                    isActive: false,
                    completed: true
                };
            } else {
                // Next Step
                return {
                    ...prev,
                    shots: nextShots,
                    currentStepIndex: nextIndex
                };
            }
        }

        return { ...prev, shots: nextShots };
    });
  };

  // Effect to handle session completion redirect
  useEffect(() => {
    if (session?.completed) {
        // Save the session to persistent storage
        storageService.saveSession(session.shots);
        
        setTimeout(() => {
            setCurrentView(AppView.STATS);
        }, 2000); // Give time to celebrate
    }
  }, [session?.completed]);


  // Helper to get instruction text
  const getInstruction = (): string => {
    if (!session) return "Select a drill";
    if (session.completed) return "Drill Complete!";
    const step = session.steps[session.currentStepIndex];
    if (!step) return "Loading...";
    
    // Calculate progress for display
    const relevantShots = session.shots.filter(s => s.position === step.position);
    const currentCount = step.targetMakes 
        ? relevantShots.filter(s => s.result === ShotResult.MAKE).length 
        : relevantShots.length;
    const target = step.targetMakes || step.targetAttempts;
    
    return `Move to ${step.position}: ${currentCount} / ${target}`;
  };

  // Helper to get current active position for the CameraView
  const getActivePosition = (): CourtPosition | undefined => {
     if (!session || session.completed) return undefined;
     return session.steps[session.currentStepIndex]?.position;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-50 font-sans">
      
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="bg-orange-600 p-2 rounded-lg">
            <Camera size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Ball<span className="text-orange-500">Point</span></h1>
        </div>
        
        {/* API Key Check (Simulated for UX) */}
        {!process.env.API_KEY ? (
             <div className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">No API Key</div>
        ) : (
             <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        {currentView === AppView.HOME && (
          <DrillSelector onStartDrill={startDrill} />
        )}

        {currentView === AppView.ACTIVE_DRILL && session && (
          <div className="h-full flex flex-col p-4">
             {session.completed ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                     <h2 className="text-4xl font-bold text-green-400 animate-bounce">Drill Complete!</h2>
                     <p className="text-slate-400">Analyzing your performance...</p>
                 </div>
             ) : (
                <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl relative">
                  <CameraView 
                    ref={/* camera ref set below */ null as any}
                    onShotRecorded={handleShotRecorded} 
                    isActive={!session.completed}
                    currentInstruction={getInstruction()}
                    activePosition={getActivePosition()}
                  />
                </div>
             )}
             
             {/* Simple visual progress bar for the drill */}
             <div className="mt-4 flex gap-1 h-2">
                 {session.steps.map((_, idx) => (
                     <div 
                        key={idx} 
                        className={`flex-1 rounded-full ${
                            idx < session.currentStepIndex ? 'bg-orange-500' : 
                            idx === session.currentStepIndex ? 'bg-orange-500/50 animate-pulse' : 'bg-slate-800'
                        }`}
                     />
                 ))}
             </div>
          </div>
        )}

        {currentView === AppView.STATS && (
          <StatsDashboard shots={session ? session.shots : []} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-slate-900 border-t border-slate-800 pb-safe">
        <div className="flex justify-around items-center h-16">
          <button 
            onClick={() => setCurrentView(AppView.HOME)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${currentView === AppView.HOME ? 'text-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Home size={24} />
            <span className="text-[10px] font-medium uppercase tracking-wide">Drills</span>
          </button>

          <button 
            onClick={() => {
              /* center camera button toggles camera facing when CameraView is mounted */
              window.dispatchEvent(new Event('camera-toggle'));
            }}
            className={`relative -top-6 bg-orange-600 text-white p-4 rounded-full shadow-[0_4px_14px_rgba(234,88,12,0.4)] transition-transform active:scale-95`}
          >
            <Camera size={28} />
          </button>

          <button 
            onClick={() => setCurrentView(AppView.STATS)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${currentView === AppView.STATS ? 'text-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <BarChart2 size={24} />
            <span className="text-[10px] font-medium uppercase tracking-wide">Stats</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;