export type GameSound = "hover" | "click" | "openPack" | "cardReveal" | "legendaryReveal" | "playCard" | "attack" | "damage" | "heal" | "draw" | "turnStart" | "victory" | "defeat";

export interface AudioManager {
  play(sound: GameSound): void;
  setMuted(muted: boolean): void;
}

class SilentAudioManager implements AudioManager {
  private muted = false;
  play(_sound: GameSound): void {
    if (this.muted) return;
    // v0.4 intentionally ships without copyrighted or placeholder audio files.
  }
  setMuted(muted: boolean): void { this.muted = muted; }
}

export const audioManager: AudioManager = new SilentAudioManager();
export const UIAudioManager = audioManager;
