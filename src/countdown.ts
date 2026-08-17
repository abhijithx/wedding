/**
 * Wedding Countdown Timer
 * Target: September 7, 2026, 12:00 PM IST (UTC+5:30)
 * 
 * To change the event date, modify the EVENT_DATE constant below.
 */

// ---- EVENT CONFIGURATION ----
// IST is UTC+5:30, so 12:00 PM IST = 06:30 UTC
export const EVENT_DATE = new Date('2026-09-07T06:30:00Z');

interface CountdownElements {
  days: HTMLElement;
  hours: HTMLElement;
  minutes: HTMLElement;
  seconds: HTMLElement;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getTimeRemaining(): TimeRemaining {
  const total = EVENT_DATE.getTime() - Date.now();
  
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
  };
}

function padNumber(n: number): string {
  return n.toString().padStart(2, '0');
}

export function initCountdown(): (() => void) | undefined {
  const elements: CountdownElements = {
    days: document.getElementById('countdown-days')!,
    hours: document.getElementById('countdown-hours')!,
    minutes: document.getElementById('countdown-minutes')!,
    seconds: document.getElementById('countdown-seconds')!,
  };

  // Verify all elements exist
  if (!elements.days || !elements.hours || !elements.minutes || !elements.seconds) {
    console.warn('Countdown: Missing DOM elements');
    return undefined;
  }

  let lastValues = { days: '', hours: '', minutes: '', seconds: '' };
  let rafId: number | null = null;
  let lastTick = 0;

  function updateDisplay(): void {
    const time = getTimeRemaining();

    if (time.total <= 0) {
      // Event has arrived!
      elements.days.textContent = '🎉';
      elements.hours.textContent = '';
      elements.minutes.textContent = '';
      elements.seconds.textContent = '';
      
      // Update labels
      const labels = document.querySelectorAll('.countdown__label');
      labels.forEach((label, i) => {
        if (i === 0) label.textContent = 'Celebration Time!';
        else (label as HTMLElement).style.display = 'none';
      });
      
      // Hide other countdown items
      const items = document.querySelectorAll('.countdown__item');
      items.forEach((item, i) => {
        if (i > 0) (item as HTMLElement).style.display = 'none';
      });
      
      return;
    }

    const values = {
      days: padNumber(time.days),
      hours: padNumber(time.hours),
      minutes: padNumber(time.minutes),
      seconds: padNumber(time.seconds),
    };

    // Only update DOM when values actually change
    if (values.days !== lastValues.days) elements.days.textContent = values.days;
    if (values.hours !== lastValues.hours) elements.hours.textContent = values.hours;
    if (values.minutes !== lastValues.minutes) elements.minutes.textContent = values.minutes;
    if (values.seconds !== lastValues.seconds) elements.seconds.textContent = values.seconds;

    lastValues = values;
  }

  function tick(timestamp: number): void {
    // Throttle to ~1 update per second (not every frame)
    if (timestamp - lastTick >= 1000 || lastTick === 0) {
      lastTick = timestamp;
      updateDisplay();
    }
    rafId = requestAnimationFrame(tick);
  }

  // Initial update
  updateDisplay();
  rafId = requestAnimationFrame(tick);

  // Pause when tab is hidden
  function handleVisibility(): void {
    if (document.hidden) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else {
      lastTick = 0; // Force immediate update on resume
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    }
  }
  document.addEventListener('visibilitychange', handleVisibility);

  // Return cleanup function
  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
