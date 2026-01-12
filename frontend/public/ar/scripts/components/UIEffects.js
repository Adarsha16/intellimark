import {
  SIGNAL_THRESHOLDS,
  SIGNAL_BAR_COUNT,
  CONFETTI_COUNT,
  CONFETTI_COLORS,
  CONFETTI_DURATION_MIN,
  CONFETTI_DURATION_MAX,
  CONFETTI_DELAY_MAX,
  CONFETTI_REMOVAL_DELAY,
} from "../constants.js";

export class UIEffects {
  // Update signal bars based on distance
  static updateSignalStrength(distance) {
    let bars = 1;
    if (distance < SIGNAL_THRESHOLDS.EXCELLENT) bars = 5;
    else if (distance < SIGNAL_THRESHOLDS.GOOD) bars = 4;
    else if (distance < SIGNAL_THRESHOLDS.FAIR) bars = 3;
    else if (distance < SIGNAL_THRESHOLDS.POOR) bars = 2;

    for (let i = 1; i <= SIGNAL_BAR_COUNT; i++) {
      const bar = document.getElementById(`sig-${i}`);
      if (bar) {
        if (i <= bars) {
          bar.classList.add("active");
        } else {
          bar.classList.remove("active");
        }
      }
    }
  }

  // Confetti particles
  static createConfetti() {
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const confetti = document.createElement("div");
      confetti.classList.add("confetti");

      // Random properties
      const bg =
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const left = Math.random() * 100 + "vw";
      const animDuration =
        Math.random() * (CONFETTI_DURATION_MAX - CONFETTI_DURATION_MIN) +
        CONFETTI_DURATION_MIN +
        "s";
      const animDelay = Math.random() * CONFETTI_DELAY_MAX + "s";

      confetti.style.backgroundColor = bg;
      confetti.style.left = left;
      confetti.style.animationDuration = animDuration;
      confetti.style.animationDelay = animDelay;
      confetti.style.opacity = Math.random();

      document.body.appendChild(confetti);

      // Remove after animation
      setTimeout(() => {
        confetti.remove();
      }, CONFETTI_REMOVAL_DELAY);
    }
  }

  // Update one countdown
  static updateCountdown(element, eventDate) {
    if (!element) return;

    const now = new Date();
    const diff = eventDate - now;

    // Remove existing classes
    element.classList.remove("today", "past");

    if (diff < 0) {
      // Event has passed
      element.classList.add("past");
      element.innerHTML = "⏱️ Event Completed";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days === 0 && hours < 24) {
      // Event is today
      element.classList.add("today");
      if (hours === 0) {
        element.innerHTML = "🔴 Starting Soon!";
      } else {
        element.innerHTML = `🔴 Today • ${hours}h remaining`;
      }
    } else if (days === 0) {
      element.classList.add("today");
      element.innerHTML = "🔴 Today";
    } else if (days === 1) {
      element.innerHTML = `⏰ Tomorrow`;
    } else {
      element.innerHTML = `⏰ ${days} days remaining`;
    }
  }

  // Update all countdowns
  static updateAllCountdowns() {
    const countdowns = document.querySelectorAll(".card-countdown");
    countdowns.forEach((countdown) => {
      const eventDateStr = countdown.getAttribute("data-event-date");
      if (eventDateStr) {
        const eventDate = new Date(eventDateStr);
        UIEffects.updateCountdown(countdown, eventDate);
      }
    });
  }

  // Event status (upcoming/ongoing)
  static getEventStatus(startDate) {
    const now = new Date();
    const diff = startDate - now;

    if (diff < 0) {
      return {
        status: "ongoing",
        label: "Ongoing",
        message: "Event in progress!",
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days === 0 && hours < 24) {
      return {
        status: "upcoming",
        label: "Today",
        message: `Starts in ${hours}h`,
      };
    } else {
      return {
        status: "upcoming",
        label: "Upcoming",
        message: `Starts in ${days}d`,
      };
    }
  }
}
