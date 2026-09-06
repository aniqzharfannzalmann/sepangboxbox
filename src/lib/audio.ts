/**
 * Zero-cost, zero-dependency Web Audio API synthesizer for F1 Team Radio sound effects.
 *
 * Emulates the iconic high-pitched F1 team radio preamble beep, radio frequency
 * static crackle, and closing beep, with optional SpeechSynthesis radio filter.
 */

class F1RadioAudio {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Play the iconic two-tone F1 team radio activation beep:
   * 1750 Hz short burst -> 2200 Hz burst
   */
  public playRadioIntroBeep(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First tone (1750Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1750, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.085);

    // Second higher tone (2150Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(2150, now + 0.09);
    gain2.gain.setValueAtTime(0, now + 0.09);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.2);

    // Add subtle background static hiss
    this.startRadioStatic(0.2, 0.4);
  }

  /**
   * Play closing radio beep (single tone ~1600Hz)
   */
  public playRadioOutroBeep(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1600, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    this.stopRadioStatic();
  }

  /**
   * Generate gentle bandpassed white noise (radio static crackle)
   */
  private startRadioStatic(startTimeOffset: number, duration: number): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const bufferSize = ctx.sampleRate * Math.min(duration, 2);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.04;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      // Bandpass filter to simulate walkie-talkie / telemetry radio
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1800;
      filter.Q.value = 2.5;

      const gain = ctx.createGain();
      const start = ctx.currentTime + startTimeOffset;
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.linearRampToValueAtTime(0.02, start + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(start);
      whiteNoise.stop(start + duration);
    } catch {
      // Ignore if audio buffer fails
    }
  }

  public stopRadioStatic(): void {
    if (this.noiseNode) {
      try {
        this.noiseNode.disconnect();
      } catch {
        // Safe disconnect
      }
      this.noiseNode = null;
    }
  }

  /**
   * Optional SpeechSynthesis playback with radio beep framing
   */
  public speakRadioQuote(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
  ): void {
    if (typeof window === "undefined") return;

    this.playRadioIntroBeep();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      // Wait for radio intro beep to finish (220ms)
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 0.95;
        utterance.volume = 0.9;
        utterance.lang = "en-GB";

        utterance.onstart = () => {
          onStart?.();
        };

        utterance.onend = () => {
          this.playRadioOutroBeep();
          onEnd?.();
        };

        utterance.onerror = () => {
          this.playRadioOutroBeep();
          onEnd?.();
        };

        window.speechSynthesis.speak(utterance);
      }, 250);
    } else {
      onStart?.();
      setTimeout(() => {
        this.playRadioOutroBeep();
        onEnd?.();
      }, 1500);
    }
  }

  public stopPlayback(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.stopRadioStatic();
  }
}

export const f1Audio = new F1RadioAudio();
