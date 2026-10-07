const woodUrl = new URL("../../assets/audio/Wood.m4a", import.meta.url).href;
const chirpingUrl = new URL(
  "../../assets/audio/chirping.mp3",
  import.meta.url,
).href;
const hitMarkerUrl = new URL(
  "../../assets/audio/hitmarker_2.mp3",
  import.meta.url,
).href;

const overworldAudio = new Audio(chirpingUrl);
overworldAudio.preload = "none";
overworldAudio.loop = true;
overworldAudio.volume = 0.3;

function reportPlaybackError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") return;
  console.error("Game sound could not play.", error);
}

function playOneShot(source: string) {
  const audio = new Audio(source);
  audio.volume = 0.5;
  void audio.play().catch(reportPlaybackError);
}

export function playButtonSound() {
  playOneShot(woodUrl);
}

export function setOverworldSound(active: boolean) {
  if (!active) {
    overworldAudio.pause();
    overworldAudio.currentTime = 0;
    return;
  }
  if (overworldAudio.paused) void overworldAudio.play().catch(reportPlaybackError);
}

export function playDamageSound() {
  playOneShot(hitMarkerUrl);
}
