import React from 'react';
import { Play, Plus } from 'lucide-react';
import { DrillStep, CourtPosition } from '../types';

interface DrillSelectorProps {
  onStartDrill: (steps: DrillStep[]) => void;
}

export const DrillSelector: React.FC<DrillSelectorProps> = ({ onStartDrill }) => {
  const predefinedDrills = [
    {
      name: "Around the World (Standard)",
      description: "5 shots from Left, Center, and Right.",
      steps: [
        { position: CourtPosition.LEFT, targetAttempts: 5 },
        { position: CourtPosition.CENTER, targetAttempts: 5 },
        { position: CourtPosition.RIGHT, targetAttempts: 5 },
      ]
    },
    {
      name: "Sniper School",
      description: "Make 3 shots from each spot before moving on.",
      steps: [
        { position: CourtPosition.LEFT, targetMakes: 3 },
        { position: CourtPosition.CENTER, targetMakes: 3 },
        { position: CourtPosition.RIGHT, targetMakes: 3 },
      ]
    },
    {
      name: "Quick Warmup",
      description: "3 shots from Center only.",
      steps: [
        { position: CourtPosition.CENTER, targetAttempts: 3 },
      ]
    }
  ];

  return (
    <div className="p-6 pb-24 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Start Training</h2>
        <p className="text-gray-400">Select a program to begin tracking.</p>
      </div>

      <div className="grid gap-4">
        {predefinedDrills.map((drill, idx) => (
          <button
            key={idx}
            onClick={() => onStartDrill(drill.steps)}
            className="group relative overflow-hidden bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-xl p-5 text-left transition-all duration-200"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Play size={48} className="text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
              {drill.name}
            </h3>
            <p className="text-slate-400 text-sm mt-1">{drill.description}</p>
            <div className="mt-4 flex gap-2">
                {drill.steps.map((step, i) => (
                   <span key={i} className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-300 border border-slate-700">
                     {step.position.charAt(0)}: {step.targetMakes ? `${step.targetMakes} makes` : `${step.targetAttempts} shots`}
                   </span>
                ))}
            </div>
          </button>
        ))}

        <button 
          onClick={() => alert("Custom drill creator coming soon!")}
          className="border-2 border-dashed border-slate-700 hover:border-orange-500/50 rounded-xl p-5 flex items-center justify-center gap-3 text-slate-400 hover:text-orange-400 transition-all"
        >
          <Plus size={20} />
          <span className="font-semibold">Create Custom Program</span>
        </button>
      </div>
    </div>
  );
};
