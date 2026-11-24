/**
 * Keyflow - LocalStorage Data Manager
 * Persists personal bests, lifetime analytics, recent test history, and preferences.
 */

const STORAGE_KEYS = {
  PERSONAL_BESTS: 'keyflow_personal_bests',
  HISTORY: 'keyflow_test_history',
  LIFETIME: 'keyflow_lifetime_stats',
  THEME: 'keyflow_theme',
  SOUND: 'keyflow_sound_pref',
  LAST_MODE: 'keyflow_last_mode'
};

class StorageManager {
  constructor() {
    this.personalBests = this.loadJSON(STORAGE_KEYS.PERSONAL_BESTS, {
      15: { wpm: 0, accuracy: 0, date: null },
      30: { wpm: 0, accuracy: 0, date: null },
      60: { wpm: 0, accuracy: 0, date: null }
    });

    this.history = this.loadJSON(STORAGE_KEYS.HISTORY, []);

    this.lifetime = this.loadJSON(STORAGE_KEYS.LIFETIME, {
      totalTests: 0,
      totalKeystrokes: 0,
      totalSeconds: 0,
      averageWpm: 0,
      topWpm: 0
    });
  }

  loadJSON(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn(`Keyflow: Error loading from localStorage [${key}]`, e);
      return fallback;
    }
  }

  saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Keyflow: Error saving to localStorage [${key}]`, e);
    }
  }

  getPersonalBest(mode) {
    return this.personalBests[mode] || { wpm: 0, accuracy: 0, date: null };
  }

  getAllPersonalBests() {
    return this.personalBests;
  }

  /**
   * Checks if current score beats personal best for mode and saves it.
   * Returns { isNewPB: boolean, previousPB: object }
   */
  checkAndSavePersonalBest(mode, wpm, accuracy) {
    const currentPB = this.getPersonalBest(mode);
    const previousPB = { ...currentPB };
    let isNewPB = false;

    // A score is a new personal best if WPM is strictly higher,
    // or same WPM with better accuracy
    if (wpm > currentPB.wpm || (wpm === currentPB.wpm && accuracy > currentPB.accuracy)) {
      if (wpm > 0) {
        isNewPB = true;
        this.personalBests[mode] = {
          wpm,
          accuracy,
          date: new Date().toISOString()
        };
        this.saveJSON(STORAGE_KEYS.PERSONAL_BESTS, this.personalBests);
      }
    }

    return { isNewPB, previousPB };
  }

  /**
   * Record completed test into history and update lifetime stats
   */
  recordCompletedTest(testResult) {
    const { mode, wpm, rawWpm, accuracy, errors, timeTaken, correctChars } = testResult;

    // Check PB
    const pbResult = this.checkAndSavePersonalBest(mode, wpm, accuracy);

    // Save to history (keep last 30 entries)
    const historyEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      mode,
      wpm,
      rawWpm,
      accuracy,
      errors,
      timeTaken
    };

    this.history.unshift(historyEntry);
    if (this.history.length > 30) {
      this.history = this.history.slice(0, 30);
    }
    this.saveJSON(STORAGE_KEYS.HISTORY, this.history);

    // Update lifetime stats
    this.lifetime.totalTests += 1;
    this.lifetime.totalKeystrokes += (correctChars + errors);
    this.lifetime.totalSeconds += Math.round(timeTaken);

    if (wpm > this.lifetime.topWpm) {
      this.lifetime.topWpm = wpm;
    }

    // Cumulative average WPM calculation
    const allWpms = this.history.map(h => h.wpm);
    const sumWpm = allWpms.reduce((a, b) => a + b, 0);
    this.lifetime.averageWpm = Math.round(sumWpm / allWpms.length);

    this.saveJSON(STORAGE_KEYS.LIFETIME, this.lifetime);

    return {
      isNewPB: pbResult.isNewPB,
      previousPB: pbResult.previousPB,
      currentPB: this.getPersonalBest(mode)
    };
  }

  getLifetimeStats() {
    return {
      ...this.lifetime,
      history: this.history
    };
  }

  // Theme preference
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  }

  setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  // Sound preference
  getSoundPref() {
    return localStorage.getItem(STORAGE_KEYS.SOUND) || 'thock';
  }

  setSoundPref(sound) {
    localStorage.setItem(STORAGE_KEYS.SOUND, sound);
  }

  // Mode preference
  getLastMode() {
    const mode = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_MODE), 10);
    return [15, 30, 60].includes(mode) ? mode : 30;
  }

  setLastMode(mode) {
    localStorage.setItem(STORAGE_KEYS.LAST_MODE, mode);
  }

  // Clear data
  clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.PERSONAL_BESTS);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    localStorage.removeItem(STORAGE_KEYS.LIFETIME);
    this.personalBests = {
      15: { wpm: 0, accuracy: 0, date: null },
      30: { wpm: 0, accuracy: 0, date: null },
      60: { wpm: 0, accuracy: 0, date: null }
    };
    this.history = [];
    this.lifetime = {
      totalTests: 0,
      totalKeystrokes: 0,
      totalSeconds: 0,
      averageWpm: 0,
      topWpm: 0
    };
  }
}

window.KeyflowStorage = new StorageManager();
