const audioFiles = import.meta.glob<string>(
  [
    "../../assets/audio/wood.mp4",
    "../../assets/audio/Sign chain click.m4a",
    "../../assets/audio/login signup music.m4a",
    "../../assets/audio/winSound.m4a",
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
const damageHitUrl = new URL(
  "../../assets/audio/damage-hit.mp3",
  import.meta.url,
).href;
const impactThudUrl = new URL(
  "../../assets/audio/impact-thud.mp3",
  import.meta.url,
).href;
const fireGustUrl = new URL(
  "../../assets/audio/fire-gust.m4a",
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
const characterAttackUrls = {
  olan: new URL(
    "../../assets/audio/character-attack-sfx/olan-attack-sfx.m4a",
    import.meta.url,
  ).href,
  hannah: new URL(
    "../../assets/audio/character-attack-sfx/hannah-attack.m4a",
    import.meta.url,
  ).href,
};
const characterVoiceUrls = {
  hannah: new URL(
    "../../assets/audio/character-voices/hannah-voice-clip.m4a",
    import.meta.url,
  ).href,
  snarger: new URL(
    "../../assets/audio/character-voices/snarger-voice-clip.m4a",
    import.meta.url,
  ).href,
  nerdius: new URL(
    "../../assets/audio/character-voices/nerd-voice-clip.m4a",
    import.meta.url,
  ).href,
};
export type VoiceCharacter = keyof typeof characterVoiceUrls;

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

export function playCharacterAttackSound(
  character: keyof typeof characterAttackUrls,
  delayMs = 0,
) {
  const play = () => playOneShot(characterAttackUrls[character]);
  if (delayMs <= 0) {
    play();
    return;
  }
  window.setTimeout(play, delayMs);
}

export function startCharacterVoice(character: VoiceCharacter) {
  const voice = new Audio(characterVoiceUrls[character]);
  voice.preload = "auto";
  voice.loop = true;
  voice.preservesPitch = false;
  let stopped = false;
  let previousTime = 0;
  const play = () => {
    if (stopped) return;
    voice.playbackRate = 0.86 + Math.random() * 0.3;
    void voice.play().catch(reportPlaybackError);
  };
  const varyPitchAtLoop = () => {
    if (voice.currentTime < previousTime) play();
    previousTime = voice.currentTime;
  };
  voice.addEventListener("timeupdate", varyPitchAtLoop);
  play();
  return () => {
    stopped = true;
    voice.pause();
    voice.currentTime = 0;
    voice.removeEventListener("timeupdate", varyPitchAtLoop);
  };
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

export function playCoinPickupSound() {
  playOneShot(correctAnswerUrl);
}

export function playDamageHitSound() {
  playOneShot(damageHitUrl);
}

export function playImpactThudSound() {
  playOneShot(impactThudUrl);
}

export function playFireGustSound() {
  playOneShot(fireGustUrl);
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
