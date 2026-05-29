const TRACK_PATHS = [
  './soundtracks/Cat Cafe - Tsundere Twintails.mp3',
  './soundtracks/Head Empty - Tsundere Twintails.mp3'
];

export class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.tracks = [];
    this.activeIndex = 0;
    this.switchInterval = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.16;
    this.masterGain.connect(this.context.destination);
    this.tracks = TRACK_PATHS.map((path) => this._createMediaTrack(path));
    this.isInitialized = true;
  }

  async start() {
    this.init();
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    this.tracks.forEach((track, index) => {
      track.gain.gain.value = index === 0 ? 1 : 0;
      track.audio.loop = true;
      track.audio.play().catch(() => {
        // Playback may require user interaction; fallback handled in resume().
      });
    });

    this.activeIndex = 0;
    this._scheduleSwitch();
  }

  async resume() {
    if (!this.context) this.init();
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    this.tracks.forEach((track) => {
      track.audio.play().catch(() => {});
    });
  }

  stop() {
    if (this.switchInterval) {
      clearInterval(this.switchInterval);
      this.switchInterval = null;
    }
    this.tracks.forEach((track) => track.dispose());
    this.tracks = [];
    if (this.context) {
      this.context.close();
      this.context = null;
      this.isInitialized = false;
    }
  }

  _scheduleSwitch() {
    if (this.switchInterval) return;
    this.switchInterval = window.setInterval(() => {
      const next = (this.activeIndex + 1) % this.tracks.length;
      this._crossfade(this.activeIndex, next, 4);
      this.activeIndex = next;
    }, 30000);
  }

  _createMediaTrack(src) {
    const audio = new Audio(encodeURI(src));
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';

    const source = this.context.createMediaElementSource(audio);
    const gain = this.context.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(this.masterGain);

    return {
      audio,
      gain,
      dispose: () => {
        audio.pause();
        audio.src = '';
        audio.load();
        source.disconnect();
        gain.disconnect();
      }
    };
  }

  _setTrackGain(index, value) {
    if (!this.tracks[index]) return;
    const gainNode = this.tracks[index].gain.gain;
    gainNode.cancelScheduledValues(this.context.currentTime);
    gainNode.setValueAtTime(gainNode.value, this.context.currentTime);
    gainNode.linearRampToValueAtTime(value, this.context.currentTime + 3);
  }

  _crossfade(fromIndex, toIndex, duration) {
    if (!this.tracks[fromIndex] || !this.tracks[toIndex]) return;
    const now = this.context.currentTime;
    const fromGain = this.tracks[fromIndex].gain.gain;
    const toGain = this.tracks[toIndex].gain.gain;
    fromGain.cancelScheduledValues(now);
    toGain.cancelScheduledValues(now);
    fromGain.setValueAtTime(fromGain.value, now);
    toGain.setValueAtTime(toGain.value, now);
    fromGain.linearRampToValueAtTime(0, now + duration);
    toGain.linearRampToValueAtTime(1, now + duration);
  }
}
