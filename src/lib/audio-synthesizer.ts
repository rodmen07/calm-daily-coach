export type CalmSoundType = "brown" | "pink" | "binaural" | "drone";

export class CalmAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private currentSource: AudioScheduledSourceNode | null = null;
  private leftOscStatus: OscillatorNode | null = null;
  private rightOscStatus: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private activeType: CalmSoundType | null = null;

  constructor() {
    // Lazy instantation inside user interaction
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getActiveType(): CalmSoundType | null {
    return this.activeType;
  }

  public stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Safe ignore
      }
      this.currentSource = null;
    }

    if (this.leftOscStatus) {
      try { this.leftOscStatus.stop(); } catch { /* ignore */ }
      this.leftOscStatus = null;
    }
    if (this.rightOscStatus) {
      try { this.rightOscStatus.stop(); } catch { /* ignore */ }
      this.rightOscStatus = null;
    }

    this.activeType = null;
  }

  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  public play(type: CalmSoundType, volume: number = 0.5): void {
    this.stop();
    const context = this.initContext();

    this.gainNode = context.createGain();
    this.gainNode.gain.value = volume;
    this.gainNode.connect(context.destination);

    this.activeType = type;

    if (type === "brown") {
      this.playBrownianNoise(context, this.gainNode);
    } else if (type === "pink") {
      this.playPinkNoise(context, this.gainNode);
    } else if (type === "binaural") {
      this.playBinauralBeats(context, this.gainNode);
    } else if (type === "drone") {
      this.playCelestialDrone(context, this.gainNode);
    }
  }

  private playBrownianNoise(context: AudioContext, destination: AudioNode): void {
    const bufferSize = 2 * context.sampleRate;
    const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Compensate loss of amplitude
    }

    const whiteNoise = context.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    whiteNoise.connect(destination);
    whiteNoise.start(0);

    this.currentSource = whiteNoise;
  }

  private playPinkNoise(context: AudioContext, destination: AudioNode): void {
    const bufferSize = 2 * context.sampleRate;
    const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0.0, b1 = 0.0, b2 = 0.0, b3 = 0.0, b4 = 0.0, b5 = 0.0, b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.153852;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 * 0.5362;
      output[i] *= 0.11; // normalise
      b6 = white * 0.115926;
    }

    const pinkSource = context.createBufferSource();
    pinkSource.buffer = noiseBuffer;
    pinkSource.loop = true;
    pinkSource.connect(destination);
    pinkSource.start(0);

    this.currentSource = pinkSource;
  }

  private playBinauralBeats(context: AudioContext, destination: AudioNode): void {
    const carrierFrequency = 140; // Hz (cozy low frequency carrier)
    const beatFrequency = 10; // Hz (Alpha waves - focus / flow)

    // Left channel oscillator (Carrier - Beat/2)
    const leftOsc = context.createOscillator();
    leftOsc.type = "sine";
    leftOsc.frequency.value = carrierFrequency - beatFrequency / 2;

    // Right channel oscillator (Carrier + Beat/2)
    const rightOsc = context.createOscillator();
    rightOsc.type = "sine";
    rightOsc.frequency.value = carrierFrequency + beatFrequency / 2;

    // Channel merger to separate signals in stereo
    const merger = context.createChannelMerger(2);

    const leftGain = context.createGain();
    const rightGain = context.createGain();
    leftGain.gain.value = 0.5;
    rightGain.gain.value = 0.5;

    leftOsc.connect(leftGain);
    leftGain.connect(merger, 0, 0);

    rightOsc.connect(rightGain);
    rightGain.connect(merger, 0, 1);

    merger.connect(destination);

    leftOsc.start(0);
    rightOsc.start(0);

    this.leftOscStatus = leftOsc;
    this.rightOscStatus = rightOsc;
  }

  private playCelestialDrone(context: AudioContext, destination: AudioNode): void {
    // 3 parallel oscillators tuned close in standard Pythagorean intervals (perfect fifths)
    const rootFreq = 95; // G2 (highly grounding note)

    const osc1 = context.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.value = rootFreq - 0.5;

    const osc2 = context.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = rootFreq * 1.5 + 0.5; // Perfect fifth

    const osc3 = context.createOscillator();
    osc3.type = "sine";
    osc3.frequency.value = rootFreq * 2.0; // Octave

    // High cut-off lowpass filter to warm things up and slice raw harmonics
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 3;

    // Slowly pulse filter frequency (LFO style)
    const lfo = context.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.12; // 0.12 Hz (very slow breath envelope)

    const lfoGain = context.createGain();
    lfoGain.gain.value = 250; // offset amount

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    // Initial cutoff set to be centered around LFO
    filter.frequency.value = 450;

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);

    filter.connect(destination);

    lfo.start(0);
    osc1.start(0);
    osc2.start(0);
    osc3.start(0);

    this.leftOscStatus = osc1;
    this.rightOscStatus = osc2;
  }
}
