const audioFiles = import.meta.glob<string>(
  [
    "../../assets/audio/wood.mp4",
    "../../assets/audio/Sign chain click.m4a",
    "../../assets/audio/login signup music.m4a",
    "../../assets/audio/winSound.m4a",
    "../../assets/audio/olan attack.m4a",
    "../../assets/audio/wood2.m4a",
    "../../assets/audio/pop.mp3",
  ],
  { eager: true, query: "?url", import: "default" },
);
const popUrl =
  audioFiles["../../assets/audio/pop.mp3"] ??
  new URL("../../assets/audio/pop.mp3", import.meta.url).href;
function audioAsset(fileName: string, fallback?: string) {
  return (
    audioFiles[`../../assets/audio/${fileName}`] ??
    (fallback ? audioFiles[`../../assets/audio/${fallback}`] : undefined)
  );
}
const woodUrl = audioAsset("wood.mp4", "pop.mp3") ?? popUrl;
const chirpingUrl = new URL(
  "../../assets/audio/chirping.mp3",
  import.meta.url,
).href;
const hitMarkerUrl = new URL(
  "../../assets/audio/hitmarker_2.mp3",
  import.meta.url,
).href;
const walkingUrl = new URL(
  "../../assets/audio/run_on_grass.mp3",
  import.meta.url,
).href;
const correctAnswerUrl = new URL(
  "../../assets/audio/ding.m4a",
  import.meta.url,
).href;
const wrongAnswerUrl = new URL(
  "../../assets/audio/wronganswer.m4a",
  import.meta.url,
).href;
const treasureUrl = new URL(
  "../../assets/audio/treasure.m4a",
  import.meta.url,
).href;
const authTextBoxUrl = audioAsset("Sign chain click.m4a", "wood2.m4a");
const authMusicUrl = audioAsset("login signup music.m4a");
const winUrl = audioAsset("winSound.m4a");
const attackUrl = audioAsset("olan attack.m4a");

const overworldAudio = new Audio(chirpingUrl);
overworldAudio.preload = "none";
overworldAudio.loop = true;
overworldAudio.volume = 0.3;

const walkingAudio = new Audio(walkingUrl);
walkingAudio.preload = "none";
walkingAudio.loop = true;
walkingAudio.volume = 0.35;

const authMusic = authMusicUrl ? new Audio(authMusicUrl) : undefined;
if (authMusic) {
  authMusic.preload = "auto";
  authMusic.loop = true;
  authMusic.volume = 0.35;
}

function reportPlaybackError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") return;
  console.error("Game sound could not play.", error);
}

function playOneShot(source: string, fallback?: string) {
  const audio = new Audio(source);
  audio.volume = 0.5;
  let fallbackPlayed = false;
  const playFallback = () => {
    if (!fallback || fallbackPlayed) return;
    fallbackPlayed = true;
    playOneShot(fallback);
  };
  audio.addEventListener("error", playFallback, { once: true });
  void audio.play().catch((error: unknown) => {
    if (fallback && error instanceof DOMException && error.name === "NotSupportedError") {
      playFallback();
      return;
    }
    reportPlaybackError(error);
  });
}

export function playButtonSound() {
  playOneShot(woodUrl, popUrl);
}

export function playAuthTextBoxSound() {
  if (authTextBoxUrl) playOneShot(authTextBoxUrl, popUrl);
}

export function playWinSound() {
  if (winUrl) playOneShot(winUrl, treasureUrl);
}

export function playAttackSound() {
  if (attackUrl) playOneShot(attackUrl, hitMarkerUrl);
}

export function setAuthMusic(active: boolean) {
  if (!authMusic) return;
  if (!active) {
    authMusic.pause();
    authMusic.currentTime = 0;
    return;
  }
  if (authMusic.paused) void authMusic.play().catch(reportPlaybackError);
}

export function setOverworldSound(active: boolean) {
  if (!active) {
    overworldAudio.pause();
    overworldAudio.currentTime = 0;
    return;
  }
  if (overworldAudio.paused) void overworldAudio.play().catch(reportPlaybackError);
}

export function setWalkingSound(active: boolean) {
  if (!active) {
    walkingAudio.pause();
    walkingAudio.currentTime = 0;
    return;
  }
  if (walkingAudio.paused) void walkingAudio.play().catch(reportPlaybackError);
}

export function playCorrectAnswerSound() {
  playOneShot(correctAnswerUrl);
}

export function playWrongAnswerSound() {
  playOneShot(wrongAnswerUrl);
}

export function playTreasureSound() {
  playOneShot(treasureUrl);
}

export function playDamageSound() {
  playOneShot(hitMarkerUrl);
}
