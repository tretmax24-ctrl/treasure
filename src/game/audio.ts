export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private muted = false;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.35;
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  isMuted() {
    return this.muted;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain = 0.12, freqEnd?: number) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  private noise(dur: number, gain = 0.18, hp = 400) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const n = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = n.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = n;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hp;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfx);
    src.start(t);
    src.stop(t + dur);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }

  click() {
    this.tone(880 + Math.random() * 80, 0.05, "square", 0.05);
  }
  lightning() {
    this.noise(0.28, 0.28, 200);
    this.tone(90, 0.2, "sawtooth", 0.1, 40);
  }
  meteor() {
    this.tone(220, 0.55, "sine", 0.16, 40);
    this.noise(0.4, 0.2, 120);
  }
  possess() {
    this.tone(140, 0.35, "sine", 0.1, 420);
  }
  unpossess() {
    this.tone(420, 0.25, "sine", 0.08, 120);
  }
  hit() {
    this.tone(180 + Math.random() * 40, 0.08, "square", 0.08, 70);
  }
  bless() {
    this.tone(520, 0.3, "sine", 0.08, 880);
  }
  spawn() {
    this.tone(320, 0.12, "triangle", 0.07, 540);
  }
  quake() {
    this.tone(50, 0.5, "sine", 0.18, 28);
  }
}
