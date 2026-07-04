import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalmAudioSynthesizer } from "@/lib/audio-synthesizer";

class FakeAudioNode {
  public disconnect = vi.fn();

  public connect(destination?: unknown): unknown {
    return destination;
  }
}

class FakeGainNode extends FakeAudioNode {
  public gain = { value: 1 };
}

class FakeOscillatorNode extends FakeAudioNode {
  public type: OscillatorType = "sine";
  public frequency = { value: 0 };
  public start = vi.fn();
  public stop = vi.fn();
}

class FakeBuffer {
  private channel = new Float32Array(2048);

  public getChannelData(_channelIndex: number): Float32Array {
    return this.channel;
  }
}

class FakeAudioBufferSourceNode extends FakeAudioNode {
  public buffer: FakeBuffer | null = null;
  public loop = false;
  public start = vi.fn();
  public stop = vi.fn();
}

class FakeBiquadFilterNode extends FakeAudioNode {
  public type: BiquadFilterType = "lowpass";
  public Q = { value: 0 };
  public frequency = { value: 0 };
}

class FakeAudioContext {
  public state: AudioContextState = "running";
  public sampleRate = 1024;
  public destination = new FakeAudioNode();
  public createdGains: FakeGainNode[] = [];
  public createdOscillators: FakeOscillatorNode[] = [];
  public createdBufferSources: FakeAudioBufferSourceNode[] = [];

  public resume = vi.fn();

  public createGain(): GainNode {
    const node = new FakeGainNode();
    this.createdGains.push(node);
    return node as unknown as GainNode;
  }

  public createBuffer(_channels: number, _length: number, _sampleRate: number): AudioBuffer {
    return new FakeBuffer() as unknown as AudioBuffer;
  }

  public createBufferSource(): AudioBufferSourceNode {
    const node = new FakeAudioBufferSourceNode();
    this.createdBufferSources.push(node);
    return node as unknown as AudioBufferSourceNode;
  }

  public createOscillator(): OscillatorNode {
    const node = new FakeOscillatorNode();
    this.createdOscillators.push(node);
    return node as unknown as OscillatorNode;
  }

  public createChannelMerger(_channels: number): ChannelMergerNode {
    return new FakeAudioNode() as unknown as ChannelMergerNode;
  }

  public createBiquadFilter(): BiquadFilterNode {
    return new FakeBiquadFilterNode() as unknown as BiquadFilterNode;
  }
}

let latestContext: FakeAudioContext | null = null;
let originalAudioContext: typeof window.AudioContext | undefined;
let originalWebkitAudioContext: (typeof window & { webkitAudioContext?: typeof AudioContext })["webkitAudioContext"];

beforeEach(() => {
  latestContext = null;
  originalAudioContext = window.AudioContext;
  originalWebkitAudioContext = (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  const ctor = vi.fn(() => {
    latestContext = new FakeAudioContext();
    return latestContext as unknown as AudioContext;
  });

  window.AudioContext = ctor as unknown as typeof AudioContext;
  (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext = ctor as unknown as typeof AudioContext;
});

afterEach(() => {
  if (originalAudioContext) {
    window.AudioContext = originalAudioContext;
  }

  if (originalWebkitAudioContext) {
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext = originalWebkitAudioContext;
  } else {
    delete (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  }
});

describe("CalmAudioSynthesizer", () => {
  it("initializes state and defaults properly", () => {
    const synth = new CalmAudioSynthesizer();
    expect(synth.getActiveType()).toBeNull();
  });

  it("handles stop cleanly when inactive", () => {
    const synth = new CalmAudioSynthesizer();
    expect(() => synth.stop()).not.toThrow();
    expect(synth.getActiveType()).toBeNull();
  });

  it("safely adjusts volume within bounds", () => {
    const synth = new CalmAudioSynthesizer();
    expect(() => synth.setVolume(0.8)).not.toThrow();
  });

  it("stops all drone oscillators when muted", () => {
    const synth = new CalmAudioSynthesizer();

    synth.play("drone", 0.4);
    expect(latestContext).toBeTruthy();
    expect(latestContext?.createdOscillators).toHaveLength(4);

    synth.stop();

    for (const osc of latestContext!.createdOscillators) {
      expect(osc.stop).toHaveBeenCalledTimes(1);
      expect(osc.disconnect).toHaveBeenCalled();
    }
  });

  it("updates and clamps master volume for active playback", () => {
    const synth = new CalmAudioSynthesizer();

    synth.play("brown", 0.4);
    expect(latestContext).toBeTruthy();

    const masterGain = latestContext!.createdGains[0];
    expect(masterGain.gain.value).toBe(0.4);

    synth.setVolume(0.9);
    expect(masterGain.gain.value).toBe(0.9);

    synth.setVolume(2);
    expect(masterGain.gain.value).toBe(1);

    synth.setVolume(-1);
    expect(masterGain.gain.value).toBe(0);
  });

  it("stops previous sources before starting another sound", () => {
    const synth = new CalmAudioSynthesizer();

    synth.play("drone", 0.5);
    const priorOscillators = [...(latestContext?.createdOscillators ?? [])];
    expect(priorOscillators).toHaveLength(4);

    synth.play("pink", 0.5);

    for (const osc of priorOscillators) {
      expect(osc.stop).toHaveBeenCalledTimes(1);
    }
  });
});
