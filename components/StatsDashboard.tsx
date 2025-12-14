import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Shot, ShotResult, CourtPosition } from '../types';
import { Trophy, Target, Activity, Download, Trash2 } from 'lucide-react';
import { storageService } from '../services/storageService';

interface StatsDashboardProps {
  shots: Shot[];
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ shots }) => {
  const [overallStats, setOverallStats] = useState(storageService.getOverallStats());

  useEffect(() => {
    setOverallStats(storageService.getOverallStats());
  }, [shots]);

  const handleExport = () => {
    storageService.exportToJSON();
  };

  const handleClearStats = () => {
    if (window.confirm('Are you sure you want to clear all statistics? This cannot be undone.')) {
      storageService.clearAllStats();
      setOverallStats(storageService.getOverallStats());
    }
  };
  // Calculate aggregate stats
  const totalShots = shots.length;
  const madeShots = shots.filter(s => s.result === ShotResult.MAKE).length;
  const percentage = totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0;

  // Process data for charts by position
  const positions = [CourtPosition.LEFT, CourtPosition.CENTER, CourtPosition.RIGHT];
  const data = positions.map(pos => {
    const positionShots = shots.filter(s => s.position === pos);
    const attempts = positionShots.length;
    const makes = positionShots.filter(s => s.result === ShotResult.MAKE).length;
    const pct = attempts > 0 ? Math.round((makes / attempts) * 100) : 0;
    
    return {
      name: pos,
      makes,
      attempts,
      pct
    };
  });

  if (totalShots === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
        <Activity size={64} className="mb-4 opacity-50" />
        <h3 className="text-xl font-bold mb-2">No Data Yet</h3>
        <p>Complete a training drill to see your analytics.</p>
        
        {/* Show all-time stats even if no current session */}
        {overallStats.totalSessions > 0 && (
          <div className="mt-8 w-full max-w-md space-y-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <h4 className="text-sm font-bold text-slate-400 mb-4">All-Time Statistics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Sessions</p>
                  <p className="text-2xl font-bold text-orange-500">{overallStats.totalSessions}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Average %</p>
                  <p className="text-2xl font-bold text-orange-500">{overallStats.averagePercentage}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Shots</p>
                  <p className="text-2xl font-bold text-slate-300">{overallStats.totalShots}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Makes</p>
                  <p className="text-2xl font-bold text-green-400">{overallStats.totalMakes}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg transition-colors"
            >
              <Download size={18} />
              Export Stats
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-2xl font-bold text-white">Session Summary</h2>
           <p className="text-slate-400 text-sm">Today's Performance</p>
        </div>
        <div className="text-right">
            <span className="text-4xl font-black text-orange-500">{percentage}%</span>
            <span className="block text-xs text-slate-500 uppercase tracking-widest">Accuracy</span>
        </div>
      </div>

      {/* Hero Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-2 text-slate-400">
                <Target size={16} />
                <span className="text-xs uppercase font-bold">Makes</span>
            </div>
            <span className="text-3xl font-mono text-white">{madeShots}</span>
            <span className="text-slate-500 text-sm ml-1">/ {totalShots}</span>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-2 text-slate-400">
                <Trophy size={16} />
                <span className="text-xs uppercase font-bold">Best Zone</span>
            </div>
            <span className="text-xl font-bold text-white truncate">
                {data.reduce((prev, current) => (prev.pct > current.pct) ? prev : current).name}
            </span>
        </div>
      </div>

      {/* All-Time Stats Card */}
      {overallStats.totalSessions > 0 && (
        <div className="bg-gradient-to-br from-orange-900/30 to-orange-950/30 rounded-xl p-4 border border-orange-800">
          <h3 className="text-sm font-bold text-orange-300 mb-3">All-Time Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-orange-400">Sessions</p>
              <p className="text-2xl font-bold text-orange-500">{overallStats.totalSessions}</p>
            </div>
            <div>
              <p className="text-xs text-orange-400">Average %</p>
              <p className="text-2xl font-bold text-orange-500">{overallStats.averagePercentage}%</p>
            </div>
            <div>
              <p className="text-xs text-orange-400">Total Shots</p>
              <p className="text-lg font-mono text-slate-300">{overallStats.totalShots}</p>
            </div>
            <div>
              <p className="text-xs text-orange-400">Total Makes</p>
              <p className="text-lg font-mono text-green-400">{overallStats.totalMakes}</p>
            </div>
          </div>
        </div>
      )}

      {/* All-Time Position Stats */}
      {overallStats.totalSessions > 0 && overallStats.positionStats && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm font-bold text-slate-400 mb-4">All-Time Accuracy by Position</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(overallStats.positionStats).map(([position, stats]) => (
              <div key={position} className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{position}</p>
                <p className="text-2xl font-bold text-orange-500 mb-1">{stats.percentage}%</p>
                <p className="text-xs text-slate-400">{stats.makes}/{stats.attempts}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-inner">
        <h3 className="text-sm font-bold text-slate-400 mb-4">Accuracy by Zone (%)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis 
                dataKey="name" 
                tick={{fill: '#94a3b8', fontSize: 12}} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pct >= 50 ? '#f97316' : '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400">
                  <tr>
                      <th className="p-3 text-left">Zone</th>
                      <th className="p-3 text-center">Made</th>
                      <th className="p-3 text-center">Total</th>
                      <th className="p-3 text-right">PCT</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-slate-200">
                  {data.map((row) => (
                      <tr key={row.name}>
                          <td className="p-3 font-medium">{row.name}</td>
                          <td className="p-3 text-center text-green-400">{row.makes}</td>
                          <td className="p-3 text-center">{row.attempts}</td>
                          <td className="p-3 text-right font-mono">{row.pct}%</td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl transition-colors font-medium"
        >
          <Download size={18} />
          Export Stats
        </button>
        <button
          onClick={handleClearStats}
          className="flex-1 flex items-center justify-center gap-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-800 py-3 rounded-xl transition-colors font-medium"
        >
          <Trash2 size={18} />
          Clear Data
        </button>
      </div>
    </div>
  );
};
