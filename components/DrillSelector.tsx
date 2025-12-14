import React, { useState } from 'react';
import { Play, Plus, X, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { DrillStep, CourtPosition } from '../types';

interface DrillSelectorProps {
  onStartDrill: (steps: DrillStep[]) => void;
}

export const DrillSelector: React.FC<DrillSelectorProps> = ({ onStartDrill }) => {
  const [showCustom, setShowCustom] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<CourtPosition[]>([]);
  const [shotsPerPosition, setShotsPerPosition] = useState(5);
  const [isMakeBased, setIsMakeBased] = useState(false);
  const [targetMakes, setTargetMakes] = useState(3);

  const allPositions = [CourtPosition.LEFT, CourtPosition.CENTER, CourtPosition.RIGHT];

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

  const togglePosition = (pos: CourtPosition) => {
    if (selectedPositions.includes(pos)) {
      setSelectedPositions(selectedPositions.filter(p => p !== pos));
    } else {
      setSelectedPositions([...selectedPositions, pos]);
    }
  };

  const movePositionUp = (index: number) => {
    if (index > 0) {
      const newPositions = [...selectedPositions];
      [newPositions[index], newPositions[index - 1]] = [newPositions[index - 1], newPositions[index]];
      setSelectedPositions(newPositions);
    }
  };

  const movePositionDown = (index: number) => {
    if (index < selectedPositions.length - 1) {
      const newPositions = [...selectedPositions];
      [newPositions[index], newPositions[index + 1]] = [newPositions[index + 1], newPositions[index]];
      setSelectedPositions(newPositions);
    }
  };

  const removePosition = (index: number) => {
    setSelectedPositions(selectedPositions.filter((_, i) => i !== index));
  };

  const handleCreateCustom = () => {
    if (selectedPositions.length === 0) {
      alert('Please select at least one position');
      return;
    }

    const steps: DrillStep[] = selectedPositions.map(pos => ({
      position: pos,
      ...(isMakeBased 
        ? { targetMakes }
        : { targetAttempts: shotsPerPosition }
      )
    }));
    onStartDrill(steps);
    resetCustom();
  };

  const resetCustom = () => {
    setShowCustom(false);
    setSelectedPositions([]);
    setShotsPerPosition(5);
    setIsMakeBased(false);
    setTargetMakes(3);
  };

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
          onClick={() => setShowCustom(true)}
          className="border-2 border-dashed border-slate-700 hover:border-orange-500/50 rounded-xl p-5 flex items-center justify-center gap-3 text-slate-400 hover:text-orange-400 transition-all"
        >
          <Plus size={20} />
          <span className="font-semibold">Create Custom Program</span>
        </button>
      </div>

      {/* Custom Drill Modal */}
      {showCustom && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-md w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Create Custom Program</h3>
              <button
                onClick={resetCustom}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Position Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-300">
                Select Positions (click to add)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {allPositions.map(pos => (
                  <button
                    key={pos}
                    onClick={() => togglePosition(pos)}
                    className={`py-3 rounded-lg font-semibold transition-colors ${
                      selectedPositions.includes(pos)
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {pos.charAt(0)}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Positions Order */}
            {selectedPositions.length > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-300">
                  Order (drag to reorder or use arrows)
                </label>
                <div className="space-y-2">
                  {selectedPositions.map((pos, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-slate-800 p-3 rounded-lg border border-slate-700"
                    >
                      <span className="bg-orange-600 text-white font-bold px-3 py-1 rounded text-sm">
                        {idx + 1}
                      </span>
                      <span className="flex-1 font-semibold text-white">
                        {pos}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => movePositionUp(idx)}
                          disabled={idx === 0}
                          className={`p-1 rounded transition-colors ${
                            idx === 0
                              ? 'text-slate-600 cursor-not-allowed'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          <ChevronUp size={18} />
                        </button>
                        <button
                          onClick={() => movePositionDown(idx)}
                          disabled={idx === selectedPositions.length - 1}
                          className={`p-1 rounded transition-colors ${
                            idx === selectedPositions.length - 1
                              ? 'text-slate-600 cursor-not-allowed'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          <ChevronDown size={18} />
                        </button>
                        <button
                          onClick={() => removePosition(idx)}
                          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-300">
                Drill Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsMakeBased(false)}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                    !isMakeBased
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Total Shots
                </button>
                <button
                  onClick={() => setIsMakeBased(true)}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                    isMakeBased
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Makes Required
                </button>
              </div>
            </div>

            {/* Shots/Makes Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-300">
                {isMakeBased ? 'Makes Required Per Position' : 'Shots Per Position'}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={isMakeBased ? targetMakes : shotsPerPosition}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    if (isMakeBased) {
                      setTargetMakes(val);
                    } else {
                      setShotsPerPosition(val);
                    }
                  }}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-semibold text-center"
                />
              </div>
            </div>

            {/* Summary */}
            {selectedPositions.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Summary:</p>
                <p className="text-white font-semibold">
                  {selectedPositions.length} position{selectedPositions.length > 1 ? 's' : ''} × {' '}
                  {isMakeBased ? `${targetMakes} makes` : `${shotsPerPosition} shots`}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {selectedPositions.map((p, i) => `${i + 1}. ${p}`).join(' → ')}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={resetCustom}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustom}
                disabled={selectedPositions.length === 0}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Play size={18} />
                Start Program
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
