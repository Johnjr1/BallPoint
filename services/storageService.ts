import { Shot, ShotResult, CourtPosition } from '../types';

export interface SessionStats {
  id: string;
  date: number;
  totalShots: number;
  makes: number;
  percentage: number;
  shots: Shot[];
}

const STORAGE_KEY = 'ballpoint_sessions';

export const storageService = {
  // Save a completed session
  saveSession: (shots: Shot[]): SessionStats => {
    const stats: SessionStats = {
      id: Date.now().toString(),
      date: Date.now(),
      totalShots: shots.length,
      makes: shots.filter(s => s.result === ShotResult.MAKE).length,
      percentage: shots.length > 0 ? Math.round((shots.filter(s => s.result === ShotResult.MAKE).length / shots.length) * 100) : 0,
      shots
    };

    const existingSessions = storageService.getAllSessions();
    existingSessions.push(stats);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingSessions));
    
    return stats;
  },

  // Get all saved sessions
  getAllSessions: (): SessionStats[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  // Calculate overall stats from all sessions
  getOverallStats: () => {
    const sessions = storageService.getAllSessions();
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalShots: 0,
        totalMakes: 0,
        averagePercentage: 0,
        bestSession: null,
        positionStats: {
          [CourtPosition.LEFT]: { attempts: 0, makes: 0, percentage: 0 },
          [CourtPosition.CENTER]: { attempts: 0, makes: 0, percentage: 0 },
          [CourtPosition.RIGHT]: { attempts: 0, makes: 0, percentage: 0 }
        }
      };
    }

    const totalShots = sessions.reduce((sum, s) => sum + s.totalShots, 0);
    const totalMakes = sessions.reduce((sum, s) => sum + s.makes, 0);
    const averagePercentage = totalShots > 0 ? Math.round((totalMakes / totalShots) * 100) : 0;
    const bestSession = sessions.reduce((prev, current) => (prev.percentage > current.percentage) ? prev : current);

    // Calculate position-specific stats across all sessions
    const positionStats = {
      [CourtPosition.LEFT]: { attempts: 0, makes: 0, percentage: 0 },
      [CourtPosition.CENTER]: { attempts: 0, makes: 0, percentage: 0 },
      [CourtPosition.RIGHT]: { attempts: 0, makes: 0, percentage: 0 }
    };

    // Aggregate shots by position across all sessions
    sessions.forEach(session => {
      session.shots.forEach(shot => {
        const pos = shot.position;
        positionStats[pos].attempts++;
        if (shot.result === ShotResult.MAKE) {
          positionStats[pos].makes++;
        }
      });
    });

    // Calculate percentages for each position
    Object.keys(positionStats).forEach(pos => {
      const stats = positionStats[pos as CourtPosition];
      stats.percentage = stats.attempts > 0 ? Math.round((stats.makes / stats.attempts) * 100) : 0;
    });

    return {
      totalSessions: sessions.length,
      totalShots,
      totalMakes,
      averagePercentage,
      bestSession,
      positionStats
    };
  },

  // Export stats as JSON file
  exportToJSON: () => {
    const sessions = storageService.getAllSessions();
    const overall = storageService.getOverallStats();
    
    const data = {
      exportDate: new Date().toISOString(),
      overall,
      sessions
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ballpoint-stats-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  // Clear all data
  clearAllStats: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
