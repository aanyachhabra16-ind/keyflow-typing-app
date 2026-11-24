/**
 * KEYFLOW - Core Typing Application Engine
 * Handles typing logic, character highlighting, smooth caret sliding,
 * real-time telemetry, accuracy & WPM math, SVG graphs, and UI interactions.
 */

(function () {
  'use strict';

  // --- State ---
  const state = {
    mode: 30, // 15, 30, 60 seconds
    category: 'all',
    currentPassage: null,
    targetWords: [],
    
    // Typing Progress
    currentWordIdx: 0,
    currentCharIdx: 0,
    isTyping: false,
    isFinished: false,
    
    // Keystroke Metrics
    startTime: null,
    endTime: null,
    totalKeystrokes: 0,
    correctKeystrokes: 0,
    errorKeystrokes: 0,
    correctCharsCount: 0,
    
    // Timer
    timerId: null,
    wpmSampleIntervalId: null,
    timeRemaining: 30,
    elapsedSeconds: 0,
    wpmHistory: [], // sampled each second for SVG chart
    
    // Caret Idle Timer
    caretIdleTimeout: null
  };

  // --- DOM Elements ---
  const elements = {
    // Stage & Inputs
    typingStage: document.getElementById('typingStage'),
    wordsContainer: document.getElementById('wordsContainer'),
    wordsWrapper: document.getElementById('wordsWrapper'),
    caret: document.getElementById('caret'),
    hiddenInput: document.getElementById('hiddenInput'),
    focusOverlay: document.getElementById('focusOverlay'),
    passageTitle: document.getElementById('passageTitle'),
    passageCategory: document.getElementById('passageCategory'),
    
    // Live HUD
    liveTime: document.getElementById('liveTime'),
    liveWpm: document.getElementById('liveWpm'),
    liveAccuracy: document.getElementById('liveAccuracy'),
    timeHudCard: document.getElementById('timeHudCard'),
    progressFill: document.getElementById('progressFill'),
    
    // Controls
    modeButtons: document.querySelectorAll('.mode-btn'),
    categorySelect: document.getElementById('categorySelect'),
    restartBtn: document.getElementById('restartBtn'),
    refreshPassageBtn: document.getElementById('refreshPassageBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    soundDot: document.getElementById('soundDot'),
    statsModalBtn: document.getElementById('statsModalBtn'),
    headerPbValue: document.getElementById('headerPbValue'),
    
    // Results Modal
    resultsModal: document.getElementById('resultsModal'),
    closeResultsBtn: document.getElementById('closeResultsBtn'),
    tryAgainBtn: document.getElementById('tryAgainBtn'),
    nextPassageBtn: document.getElementById('nextPassageBtn'),
    shareResultBtn: document.getElementById('shareResultBtn'),
    resultWpm: document.getElementById('resultWpm'),
    resultAccuracy: document.getElementById('resultAccuracy'),
    resultRawWpm: document.getElementById('resultRawWpm'),
    resultErrors: document.getElementById('resultErrors'),
    resultTime: document.getElementById('resultTime'),
    resultCharsDetail: document.getElementById('resultCharsDetail'),
    tierPill: document.getElementById('tierPill'),
    tierMessage: document.getElementById('tierMessage'),
    pbBanner: document.getElementById('pbBanner'),
    chartSvg: document.getElementById('chartSvg'),
    chartPeak: document.getElementById('chartPeak'),
    
    // Stats Modal
    statsModal: document.getElementById('statsModal'),
    closeStatsBtn: document.getElementById('closeStatsBtn'),
    pb15Wpm: document.getElementById('pb15Wpm'),
    pb15Acc: document.getElementById('pb15Acc'),
    pb30Wpm: document.getElementById('pb30Wpm'),
    pb30Acc: document.getElementById('pb30Acc'),
    pb60Wpm: document.getElementById('pb60Wpm'),
    pb60Acc: document.getElementById('pb60Acc'),
    lifetimeTotalTests: document.getElementById('lifetimeTotalTests'),
    lifetimeAvgWpm: document.getElementById('lifetimeAvgWpm'),
    lifetimeTopWpm: document.getElementById('lifetimeTopWpm'),
    historyList: document.getElementById('historyList'),
    clearStatsBtn: document.getElementById('clearStatsBtn'),
    
    // Toast & Canvas
    toast: document.getElementById('toast'),
    toastText: document.getElementById('toastText'),
    confettiCanvas: document.getElementById('confettiCanvas')
  };

  // ========================================================================
  // INITIALIZATION
  // ========================================================================
  function init() {
    setupTheme();
    setupSound();
    setupSavedMode();
    updateHeaderPB();
    loadNewPassage();
    attachEventListeners();
    focusTypingArea();
  }

  // --- Theme Setup ---
  function setupTheme() {
    const savedTheme = window.KeyflowStorage.getTheme();
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    window.KeyflowStorage.setTheme(newTheme);
    showToast(`Switched to ${newTheme} theme`);
  }

  // --- Sound Setup ---
  function setupSound() {
    const soundPref = window.KeyflowStorage.getSoundPref();
    window.KeyflowSound.setSoundType(soundPref);
    updateSoundUI(soundPref);
  }

  function toggleSound() {
    window.KeyflowSound.init();
    const current = window.KeyflowSound.soundType;
    let next = 'thock';
    if (current === 'thock') next = 'click';
    else if (current === 'click') next = 'off';
    else next = 'thock';

    window.KeyflowSound.setSoundType(next);
    window.KeyflowStorage.setSoundPref(next);
    updateSoundUI(next);

    const labels = { thock: 'Thock (Mechanical)', click: 'Click (Typewriter)', off: 'Muted' };
    showToast(`Sound FX: ${labels[next]}`);
  }

  function updateSoundUI(type) {
    if (elements.soundDot) {
      if (type === 'off') {
        elements.soundDot.classList.add('sound-muted');
      } else {
        elements.soundDot.classList.remove('sound-muted');
      }
    }
  }

  // --- Mode Setup ---
  function setupSavedMode() {
    const savedMode = window.KeyflowStorage.getLastMode();
    state.mode = savedMode;
    state.timeRemaining = savedMode;
    elements.liveTime.textContent = savedMode;

    elements.modeButtons.forEach(btn => {
      const btnMode = parseInt(btn.dataset.mode, 10);
      btn.classList.toggle('active', btnMode === savedMode);
    });
  }

  function setMode(newMode) {
    if (state.mode === newMode && !state.isTyping) return;
    state.mode = newMode;
    state.timeRemaining = newMode;
    window.KeyflowStorage.setLastMode(newMode);

    elements.modeButtons.forEach(btn => {
      const btnMode = parseInt(btn.dataset.mode, 10);
      btn.classList.toggle('active', btnMode === newMode);
    });

    updateHeaderPB();
    resetTest();
  }

  function updateHeaderPB() {
    const pb = window.KeyflowStorage.getPersonalBest(state.mode);
    elements.headerPbValue.textContent = pb.wpm > 0 ? `${pb.wpm} WPM` : '--';
  }

  // ========================================================================
  // PASSAGE MANAGEMENT & RENDERING
  // ========================================================================
  function loadNewPassage() {
    const currentId = state.currentPassage ? state.currentPassage.id : null;
    const passage = window.KeyflowPassages.getRandomPassage(currentId, state.category);
    state.currentPassage = passage;
    state.targetWords = passage.text.trim().split(/\s+/);

    elements.passageTitle.textContent = passage.title;
    elements.passageCategory.textContent = passage.category.toUpperCase();

    renderPassageDOM();
    resetTest();
  }

  function renderPassageDOM() {
    elements.wordsContainer.innerHTML = '';
    elements.wordsContainer.style.transform = 'translateY(0px)';

    state.targetWords.forEach((wordText, wordIdx) => {
      const wordDiv = document.createElement('div');
      wordDiv.className = 'word' + (wordIdx === 0 ? ' current-word' : '');
      wordDiv.dataset.wordIdx = wordIdx;

      for (let i = 0; i < wordText.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.className = 'char';
        charSpan.textContent = wordText[i];
        charSpan.dataset.charIdx = i;
        wordDiv.appendChild(charSpan);
      }

      elements.wordsContainer.appendChild(wordDiv);
    });

    // Ensure caret element exists
    if (!elements.wordsContainer.contains(elements.caret)) {
      elements.wordsContainer.appendChild(elements.caret);
    }

    // Schedule initial caret alignment once layout finishes
    requestAnimationFrame(() => {
      updateCaretPosition();
    });
  }

  // ========================================================================
  // TEST CYCLE (RESET, START, FINISH)
  // ========================================================================
  function resetTest() {
    // Clear Timers
    if (state.timerId) clearInterval(state.timerId);
    if (state.wpmSampleIntervalId) clearInterval(state.wpmSampleIntervalId);
    state.timerId = null;
    state.wpmSampleIntervalId = null;

    // Reset Progress State
    state.isTyping = false;
    state.isFinished = false;
    state.currentWordIdx = 0;
    state.currentCharIdx = 0;
    state.startTime = null;
    state.endTime = null;
    state.elapsedSeconds = 0;
    state.timeRemaining = state.mode;
    state.totalKeystrokes = 0;
    state.correctKeystrokes = 0;
    state.errorKeystrokes = 0;
    state.correctCharsCount = 0;
    state.wpmHistory = [];

    // Reset HUD
    elements.liveTime.textContent = state.mode;
    elements.liveWpm.textContent = '0';
    elements.liveAccuracy.textContent = '100';
    elements.progressFill.style.width = '0%';
    elements.timeHudCard.classList.remove('time-critical');

    // Reset DOM word/char classes
    const wordElements = elements.wordsContainer.querySelectorAll('.word');
    wordElements.forEach((wordDiv, idx) => {
      wordDiv.className = 'word' + (idx === 0 ? ' current-word' : '');
      
      // Remove any extra characters from previous runs
      const extraChars = wordDiv.querySelectorAll('.char.extra');
      extraChars.forEach(c => c.remove());

      const charSpans = wordDiv.querySelectorAll('.char');
      charSpans.forEach(charSpan => {
        charSpan.className = 'char';
      });
    });

    elements.wordsContainer.style.transform = 'translateY(0px)';
    elements.hiddenInput.value = '';

    requestAnimationFrame(() => {
      updateCaretPosition();
      setCaretIdleBlink();
    });
  }

  function startTest() {
    if (state.isTyping) return;
    window.KeyflowSound.init();

    state.isTyping = true;
    state.startTime = Date.now();
    state.wpmHistory = [0];

    // High precision countdown timer
    state.timerId = setInterval(() => {
      const now = Date.now();
      state.elapsedSeconds = (now - state.startTime) / 1000;
      state.timeRemaining = Math.max(0, state.mode - state.elapsedSeconds);

      // Update HUD
      const displayTime = Math.ceil(state.timeRemaining);
      elements.liveTime.textContent = displayTime;

      const progressPercent = Math.min(100, (state.elapsedSeconds / state.mode) * 100);
      elements.progressFill.style.width = `${progressPercent}%`;

      // Warning pulse when <= 5 seconds remaining
      if (state.timeRemaining <= 5 && !elements.timeHudCard.classList.contains('time-critical')) {
        elements.timeHudCard.classList.add('time-critical');
      }

      // Check if time expired
      if (state.timeRemaining <= 0) {
        finishTest('timer');
      }
    }, 100);

    // Sample WPM every second for the results speed curve
    state.wpmSampleIntervalId = setInterval(() => {
      if (!state.isTyping) return;
      const currentStats = calculateCurrentMetrics();
      state.wpmHistory.push(currentStats.netWpm);
    }, 1000);
  }

  function finishTest(reason = 'timer') {
    if (state.isFinished) return;
    state.isFinished = true;
    state.isTyping = false;

    if (state.timerId) clearInterval(state.timerId);
    if (state.wpmSampleIntervalId) clearInterval(state.wpmSampleIntervalId);

    state.endTime = Date.now();
    const actualElapsed = Math.max(1, (state.endTime - state.startTime) / 1000);
    state.elapsedSeconds = actualElapsed;

    // Final metrics calculation
    const finalMetrics = calculateCurrentMetrics(true);

    // Record completed test and retrieve Personal Best status
    const recordResult = window.KeyflowStorage.recordCompletedTest({
      mode: state.mode,
      wpm: finalMetrics.netWpm,
      rawWpm: finalMetrics.rawWpm,
      accuracy: finalMetrics.accuracy,
      errors: state.errorKeystrokes,
      timeTaken: actualElapsed,
      correctChars: state.correctCharsCount
    });

    updateHeaderPB();
    window.KeyflowSound.playCompletionChime();

    // Show Results Screen
    showResultsModal(finalMetrics, recordResult);
  }

  // ========================================================================
  // WPM & ACCURACY MATHEMATICS
  // ========================================================================
  function calculateCurrentMetrics(isFinal = false) {
    const elapsedMinutes = isFinal 
      ? state.elapsedSeconds / 60 
      : Math.max(0.015, ((Date.now() - (state.startTime || Date.now())) / 1000) / 60);

    // Standard formula: 1 word = 5 characters
    // Gross WPM = (Total Keystrokes / 5) / time_in_minutes
    const rawWpm = Math.max(0, Math.round((state.totalKeystrokes / 5) / elapsedMinutes));

    // Net WPM = (Correct Characters / 5) / time_in_minutes
    const netWpm = Math.max(0, Math.round((state.correctCharsCount / 5) / elapsedMinutes));

    // Accuracy = (Correct Keystrokes / Total Keystrokes) * 100
    const accuracy = state.totalKeystrokes > 0
      ? Math.max(0, Math.min(100, Math.round((state.correctKeystrokes / state.totalKeystrokes) * 100)))
      : 100;

    return { netWpm, rawWpm, accuracy };
  }

  function updateLiveMetrics() {
    const metrics = calculateCurrentMetrics();
    elements.liveWpm.textContent = metrics.netWpm;
    elements.liveAccuracy.textContent = metrics.accuracy;
  }

  // ========================================================================
  // KEYBOARD INPUT & TYPING ENGINE
  // ========================================================================
  function handleKeyDown(e) {
    // If modal is open, ignore typing keystrokes (let hotkeys handle modals)
    if (elements.resultsModal.classList.contains('active') || elements.statsModal.classList.contains('active')) {
      if (e.key === 'Escape') {
        closeModals();
      }
      return;
    }

    // Hotkey: Tab + Enter or Alt + R or Escape to quick restart
    if (e.key === 'Tab') {
      e.preventDefault();
      resetTest();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      resetTest();
      return;
    }

    // Ignore non-printable keys like Shift, Control, Alt, Meta, CapsLock
    if (e.ctrlKey || e.altKey || e.metaKey) {
      // Allow Ctrl+Backspace for deleting current word
      if (e.key === 'Backspace' && e.ctrlKey) {
        e.preventDefault();
        handleCtrlBackspace();
        return;
      }
      return;
    }

    if (e.key.length > 1 && e.key !== 'Backspace' && e.key !== ' ') {
      return;
    }

    e.preventDefault();

    // Prevent input if test already completed
    if (state.isFinished) return;

    // Auto-start on first typing keystroke!
    if (!state.isTyping) {
      startTest();
    }

    // Reset caret blink while actively typing
    resetCaretActive();

    if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key === ' ') {
      handleSpace();
    } else {
      handleCharacter(e.key);
    }

    updateLiveMetrics();
    updateCaretPosition();
  }

  // Regular Character Input
  function handleCharacter(char) {
    const currentWordDiv = elements.wordsContainer.children[state.currentWordIdx];
    if (!currentWordDiv) return;

    const targetWord = state.targetWords[state.currentWordIdx];
    const expectedChar = targetWord[state.currentCharIdx];

    state.totalKeystrokes++;

    if (state.currentCharIdx < targetWord.length) {
      // Typing within the length of the target word
      const charSpan = currentWordDiv.querySelector(`[data-char-idx="${state.currentCharIdx}"]`);
      if (charSpan) {
        if (char === expectedChar) {
          charSpan.className = 'char correct';
          state.correctKeystrokes++;
          state.correctCharsCount++;
          window.KeyflowSound.playKey(false, false);
        } else {
          charSpan.className = 'char incorrect';
          state.errorKeystrokes++;
          currentWordDiv.classList.add('word-error');
          window.KeyflowSound.playKey(true, false);
        }
      }
      state.currentCharIdx++;
    } else {
      // User typed beyond target word: append extra char
      const extraSpan = document.createElement('span');
      extraSpan.className = 'char extra';
      extraSpan.textContent = char;
      currentWordDiv.appendChild(extraSpan);
      currentWordDiv.classList.add('word-error');

      state.errorKeystrokes++;
      window.KeyflowSound.playKey(true, false);
      state.currentCharIdx++;
    }

    // Check if passage completed on last character of last word
    const isLastWord = state.currentWordIdx === state.targetWords.length - 1;
    if (isLastWord && state.currentCharIdx >= targetWord.length) {
      finishTest('completed');
    }
  }

  // Backspace Input
  function handleBackspace() {
    const currentWordDiv = elements.wordsContainer.children[state.currentWordIdx];
    if (!currentWordDiv) return;

    const targetWord = state.targetWords[state.currentWordIdx];

    if (state.currentCharIdx > 0) {
      state.currentCharIdx--;

      if (state.currentCharIdx >= targetWord.length) {
        // Remove extra character
        const extraChars = currentWordDiv.querySelectorAll('.char.extra');
        if (extraChars.length > 0) {
          extraChars[extraChars.length - 1].remove();
        }
      } else {
        // Reset standard character to untyped
        const charSpan = currentWordDiv.querySelector(`[data-char-idx="${state.currentCharIdx}"]`);
        if (charSpan) {
          if (charSpan.classList.contains('correct')) {
            state.correctCharsCount = Math.max(0, state.correctCharsCount - 1);
          }
          charSpan.className = 'char';
        }
      }

      // Check if word still has errors
      const hasErrors = currentWordDiv.querySelector('.char.incorrect, .char.extra');
      if (!hasErrors) {
        currentWordDiv.classList.remove('word-error');
      }

      window.KeyflowSound.playKey(false, false);
    } else if (state.currentCharIdx === 0 && state.currentWordIdx > 0) {
      // Backspace to previous word if previous word contained mistakes
      const prevWordDiv = elements.wordsContainer.children[state.currentWordIdx - 1];
      if (prevWordDiv && prevWordDiv.classList.contains('word-error')) {
        currentWordDiv.classList.remove('current-word');
        state.currentWordIdx--;
        prevWordDiv.classList.add('current-word');

        // Position caret at end of previous word
        const allChars = prevWordDiv.querySelectorAll('.char');
        state.currentCharIdx = allChars.length;
        window.KeyflowSound.playKey(false, false);
        adjustScrollOffset();
      }
    }
  }

  // Ctrl + Backspace (Delete word)
  function handleCtrlBackspace() {
    const currentWordDiv = elements.wordsContainer.children[state.currentWordIdx];
    if (!currentWordDiv) return;

    if (state.currentCharIdx > 0) {
      // Reset all typed characters in current word
      const extraChars = currentWordDiv.querySelectorAll('.char.extra');
      extraChars.forEach(c => c.remove());

      const charSpans = currentWordDiv.querySelectorAll('.char');
      charSpans.forEach(charSpan => {
        if (charSpan.classList.contains('correct')) {
          state.correctCharsCount = Math.max(0, state.correctCharsCount - 1);
        }
        charSpan.className = 'char';
      });

      currentWordDiv.classList.remove('word-error');
      state.currentCharIdx = 0;
      window.KeyflowSound.playKey(false, false);
      updateCaretPosition();
    }
  }

  // Spacebar Input (Move to next word)
  function handleSpace() {
    const currentWordDiv = elements.wordsContainer.children[state.currentWordIdx];
    if (!currentWordDiv) return;

    // Prevent multiple spaces at the start of a word
    if (state.currentCharIdx === 0) return;

    const targetWord = state.targetWords[state.currentWordIdx];

    // If user skipped remaining characters in the word, mark as errors
    if (state.currentCharIdx < targetWord.length) {
      currentWordDiv.classList.add('word-error');
      for (let i = state.currentCharIdx; i < targetWord.length; i++) {
        const charSpan = currentWordDiv.querySelector(`[data-char-idx="${i}"]`);
        if (charSpan) {
          charSpan.className = 'char incorrect';
        }
      }
      state.errorKeystrokes += (targetWord.length - state.currentCharIdx);
    }

    state.totalKeystrokes++;
    state.correctKeystrokes++; // counting space as valid input

    // Move to next word
    currentWordDiv.classList.remove('current-word');
    state.currentWordIdx++;
    state.currentCharIdx = 0;

    if (state.currentWordIdx >= state.targetWords.length) {
      // Reached the end of passage!
      finishTest('completed');
      return;
    }

    const nextWordDiv = elements.wordsContainer.children[state.currentWordIdx];
    if (nextWordDiv) {
      nextWordDiv.classList.add('current-word');
    }

    window.KeyflowSound.playKey(false, true);
    adjustScrollOffset();
  }

  // ========================================================================
  // SMOOTH CARET & AUTO-SCROLL
  // ========================================================================
  function updateCaretPosition() {
    const currentWordDiv = elements.wordsContainer.children[state.currentWordIdx];
    if (!currentWordDiv) return;

    const containerRect = elements.wordsContainer.getBoundingClientRect();
    let targetRect;

    const targetWord = state.targetWords[state.currentWordIdx] || '';
    const charElements = currentWordDiv.querySelectorAll('.char');

    if (state.currentCharIdx < charElements.length) {
      const charEl = charElements[state.currentCharIdx];
      targetRect = charEl.getBoundingClientRect();
      const left = targetRect.left - containerRect.left;
      const top = targetRect.top - containerRect.top;
      elements.caret.style.left = `${left}px`;
      elements.caret.style.top = `${top + 4}px`;
    } else {
      // Caret is at the end of the word
      const lastCharEl = charElements[charElements.length - 1];
      if (lastCharEl) {
        targetRect = lastCharEl.getBoundingClientRect();
        const left = targetRect.right - containerRect.left;
        const top = targetRect.top - containerRect.top;
        elements.caret.style.left = `${left}px`;
        elements.caret.style.top = `${top + 4}px`;
      }
    }
  }

  function adjustScrollOffset() {
    const currentWordDiv = elements.wordsContainer.children[state.currentWordIdx];
    if (!currentWordDiv) return;

    const containerTop = elements.wordsWrapper.getBoundingClientRect().top;
    const wordTop = currentWordDiv.getBoundingClientRect().top;
    const diff = wordTop - containerTop;

    // If current line moves below line 1 (diff > 50px), scroll up
    if (diff > 50) {
      const currentTransform = elements.wordsContainer.style.transform;
      const match = currentTransform.match(/translateY\((-?\d+)px\)/);
      const currentY = match ? parseInt(match[1], 10) : 0;
      elements.wordsContainer.style.transform = `translateY(${currentY - 48}px)`;
    }
  }

  function setCaretIdleBlink() {
    elements.caret.classList.add('blinking');
  }

  function resetCaretActive() {
    elements.caret.classList.remove('blinking');
    if (state.caretIdleTimeout) clearTimeout(state.caretIdleTimeout);
    state.caretIdleTimeout = setTimeout(() => {
      elements.caret.classList.add('blinking');
    }, 500);
  }

  // ========================================================================
  // FOCUS & OVERLAY MANAGEMENT
  // ========================================================================
  function focusTypingArea() {
    elements.hiddenInput.focus();
    elements.typingStage.classList.add('focused');
    elements.focusOverlay.classList.remove('visible');
  }

  function handleBlur() {
    // Only show focus overlay if test is in progress or ready
    if (!state.isFinished && !elements.resultsModal.classList.contains('active')) {
      elements.focusOverlay.classList.add('visible');
      elements.typingStage.classList.remove('focused');
    }
  }

  // ========================================================================
  // RESULTS SCREEN & SPEED GRAPH
  // ========================================================================
  function showResultsModal(metrics, recordResult) {
    // Fill metrics
    animateCounter(elements.resultWpm, metrics.netWpm);
    elements.resultAccuracy.textContent = `${metrics.accuracy}%`;
    elements.resultRawWpm.textContent = metrics.rawWpm;
    elements.resultErrors.textContent = state.errorKeystrokes;
    elements.resultTime.textContent = `${Math.round(state.elapsedSeconds)}s`;
    elements.resultCharsDetail.textContent = `${state.correctCharsCount} / ${state.errorKeystrokes}`;

    // Performance tier & message
    const tier = getPerformanceTier(metrics.netWpm, metrics.accuracy);
    elements.tierPill.textContent = tier.badge;
    elements.tierMessage.textContent = tier.message;

    // Personal Best Banner
    if (recordResult.isNewPB) {
      elements.pbBanner.classList.add('show');
      elements.pbBanner.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        New Personal Best for ${state.mode}s! (Previous: ${recordResult.previousPB.wpm} WPM)
      `;
      launchConfetti();
    } else {
      elements.pbBanner.classList.remove('show');
    }

    // Render Speed Curve SVG
    renderSpeedChart(state.wpmHistory, metrics.netWpm);

    // Show modal
    elements.resultsModal.classList.add('active');
  }

  function getPerformanceTier(wpm, accuracy) {
    if (wpm >= 100) return { badge: '⚡ Flow Deity', message: 'Extraordinary speed and godlike precision!' };
    if (wpm >= 85) return { badge: '🚀 Grandmaster', message: 'Blistering pace! Your fingers barely touch the ground.' };
    if (wpm >= 65) return { badge: '✨ Flow Master', message: 'Effortless rhythm. You are truly in the zone.' };
    if (wpm >= 45) return { badge: '🎯 Swift Scribe', message: 'Solid velocity with consistent control. Great job!' };
    if (wpm >= 30) return { badge: '🌱 Steady Typist', message: 'A steady stream of keystrokes. Keep building your flow.' };
    return { badge: '🌊 Finding Flow', message: 'Smoothness precedes speed. Focus on rhythm and posture!' };
  }

  // Smooth Count-Up Animation for Hero WPM
  function animateCounter(element, targetValue) {
    let start = 0;
    const duration = 900;
    const startTime = performance.now();

    function updateNumber(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out expo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentNumber = Math.round(easeProgress * targetValue);
      element.textContent = currentNumber;

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      }
    }

    requestAnimationFrame(updateNumber);
  }

  // Dynamic SVG Speed Chart
  function renderSpeedChart(history, finalWpm) {
    const data = [...history];
    if (data.length <= 1) {
      data.push(finalWpm);
    } else {
      data[data.length - 1] = finalWpm;
    }

    const peakWpm = Math.max(...data, 10);
    elements.chartPeak.textContent = `Peak: ${peakWpm} WPM`;

    const width = 600;
    const height = 90;
    const padding = 8;

    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - (val / peakWpm) * (height - padding * 2);
      return { x, y };
    });

    // Generate smooth SVG path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      pathD += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    // Fill area below path
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    elements.chartSvg.innerHTML = `
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="var(--accent-lavender)" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="var(--accent-lavender)" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#chartGradient)" />
      <path d="${pathD}" fill="none" stroke="var(--accent-lavender)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map((p, idx) => idx === 0 || idx === points.length - 1 ? 
        `<circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--accent-lavender)" stroke="var(--bg-card-solid)" stroke-width="2"/>` : ''
      ).join('')}
    `;
  }

  // ========================================================================
  // STATS & HISTORY MODAL
  // ========================================================================
  function showStatsModal() {
    const stats = window.KeyflowStorage.getLifetimeStats();
    const pbs = window.KeyflowStorage.getAllPersonalBests();

    // Personal Bests
    elements.pb15Wpm.textContent = pbs[15].wpm > 0 ? pbs[15].wpm : '--';
    elements.pb15Acc.textContent = pbs[15].wpm > 0 ? `${pbs[15].accuracy}% accuracy` : 'No score yet';

    elements.pb30Wpm.textContent = pbs[30].wpm > 0 ? pbs[30].wpm : '--';
    elements.pb30Acc.textContent = pbs[30].wpm > 0 ? `${pbs[30].accuracy}% accuracy` : 'No score yet';

    elements.pb60Wpm.textContent = pbs[60].wpm > 0 ? pbs[60].wpm : '--';
    elements.pb60Acc.textContent = pbs[60].wpm > 0 ? `${pbs[60].accuracy}% accuracy` : 'No score yet';

    // Lifetime
    elements.lifetimeTotalTests.textContent = stats.totalTests;
    elements.lifetimeAvgWpm.textContent = stats.averageWpm > 0 ? `${stats.averageWpm} WPM` : '--';
    elements.lifetimeTopWpm.textContent = stats.topWpm > 0 ? `${stats.topWpm} WPM` : '--';

    // History List
    elements.historyList.innerHTML = '';
    if (stats.history.length === 0) {
      elements.historyList.innerHTML = '<div class="empty-history-text">No test history yet. Complete a test to see results here!</div>';
    } else {
      stats.history.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        itemDiv.innerHTML = `
          <div>
            <span class="history-item-wpm">${item.wpm} WPM</span>
            <span style="color: var(--text-muted); margin-left: 0.5rem;">(${item.accuracy}% acc · ${item.mode}s)</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${item.timestamp}</div>
        `;
        elements.historyList.appendChild(itemDiv);
      });
    }

    elements.statsModal.classList.add('active');
  }

  function closeModals() {
    elements.resultsModal.classList.remove('active');
    elements.statsModal.classList.remove('active');
    focusTypingArea();
  }

  // ========================================================================
  // SHARE RESULTS & TOAST NOTIFICATION
  // ========================================================================
  function copyShareResults() {
    const wpm = elements.resultWpm.textContent;
    const acc = elements.resultAccuracy.textContent;
    const mode = state.mode;
    const tier = elements.tierPill.textContent;

    const shareText = `⚡ KEYFLOW Typing Speed: ${wpm} WPM | ${acc} Accuracy | ${mode}s Mode\nTier: ${tier}\n"Type faster. Find your flow."`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast('Result copied to clipboard!');
      }).catch(() => {
        fallbackCopyText(shareText);
      });
    } else {
      fallbackCopyText(shareText);
    }
  }

  function fallbackCopyText(text) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast('Result copied to clipboard!');
  }

  function showToast(message) {
    elements.toastText.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 2400);
  }

  // ========================================================================
  // CELEBRATION CONFETTI
  // ========================================================================
  function launchConfetti() {
    const canvas = elements.confettiCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#8B5CF6', '#A78BFA', '#EDE9FE', '#F59E0B', '#10B981', '#6366F1'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    let animationFrame;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeParticles = 0;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98; // air resistance
        p.rotation += p.rotationSpeed;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          activeParticles++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (activeParticles > 0) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationFrame);
      }
    }

    render();
  }

  // ========================================================================
  // EVENT LISTENERS
  // ========================================================================
  function attachEventListeners() {
    // Stage & Input focus
    elements.typingStage.addEventListener('click', focusTypingArea);
    elements.focusOverlay.addEventListener('click', focusTypingArea);
    elements.hiddenInput.addEventListener('blur', handleBlur);
    elements.hiddenInput.addEventListener('focus', () => {
      elements.typingStage.classList.add('focused');
      elements.focusOverlay.classList.remove('visible');
    });

    // Global Keydown
    window.addEventListener('keydown', (e) => {
      // If user starts typing anywhere while not focused on input, focus it
      if (document.activeElement !== elements.hiddenInput && 
          !elements.resultsModal.classList.contains('active') && 
          !elements.statsModal.classList.contains('active') &&
          e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        focusTypingArea();
      }
      handleKeyDown(e);
    });

    // Mode Selector Buttons
    elements.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = parseInt(btn.dataset.mode, 10);
        setMode(mode);
        focusTypingArea();
      });
    });

    // Category Selector
    elements.categorySelect.addEventListener('change', (e) => {
      state.category = e.target.value;
      loadNewPassage();
      focusTypingArea();
    });

    // Restart & Refresh Buttons
    elements.restartBtn.addEventListener('click', () => {
      resetTest();
      focusTypingArea();
    });

    elements.refreshPassageBtn.addEventListener('click', () => {
      loadNewPassage();
      focusTypingArea();
    });

    // Theme & Sound Toggles
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    elements.soundToggleBtn.addEventListener('click', toggleSound);

    // Stats Modal
    elements.statsModalBtn.addEventListener('click', showStatsModal);
    elements.closeStatsBtn.addEventListener('click', closeModals);
    elements.clearStatsBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all your test history and personal bests?')) {
        window.KeyflowStorage.clearAllData();
        updateHeaderPB();
        showStatsModal();
        showToast('Personal data cleared');
      }
    });

    // Results Modal Actions
    elements.closeResultsBtn.addEventListener('click', closeModals);
    elements.tryAgainBtn.addEventListener('click', () => {
      closeModals();
      resetTest();
    });

    elements.nextPassageBtn.addEventListener('click', () => {
      closeModals();
      loadNewPassage();
    });

    elements.shareResultBtn.addEventListener('click', copyShareResults);

    // Window Resize (Recalculate caret position)
    window.addEventListener('resize', () => {
      updateCaretPosition();
      if (elements.confettiCanvas) {
        elements.confettiCanvas.width = window.innerWidth;
        elements.confettiCanvas.height = window.innerHeight;
      }
    });
  }

  // Run on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
