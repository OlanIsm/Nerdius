const audioFiles = import.meta.glob<string>(
  [
    "../../assets/audio/wood click 21.m4a",
    "../../assets/audio/Sign chain click.m4a",
    "../../assets/audio/login signup music.m4a",
    "../../assets/audio/winSound.m4a",
    "../../assets/audio/wood2.m4a",
    "../../assets/audio/pop.mp3",
    "../../assets/audio/chapter complete.m4a",
    "../../assets/audio/cash.mp3",
    "../../assets/audio/gems.m4a",
    "../../assets/audio/xp.m4a",
    "../../assets/audio/sparkle.mp3",
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
const woodUrl = audioAsset("wood click 21.m4a");
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
const dingUrl = new URL(
  "../../assets/audio/ding.m4a",
  import.meta.url,
).href;
const correctAnswerUrl = new URL(
  "../../assets/audio/correct-kalimba.m4a",
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
  "../../assets/audio/wrong-brass.m4a",
  import.meta.url,
).href;
const treasureUrl = new URL(
  "../../assets/audio/treasure.m4a",
  import.meta.url,
).href;
const authTextBoxUrl = audioAsset("Sign chain click.m4a", "wood2.m4a");
const authMusicUrl = audioAsset("login signup music.m4a");
const winUrl = audioAsset("winSound.m4a");
const chapterCompleteUrl = audioAsset("chapter complete.m4a");
const rewardAudioUrls = {
  coins: audioAsset("cash.mp3"),
  gems: audioAsset("gems.m4a"),
  xp: audioAsset("xp.m4a"),
};
const sparkleUrl = audioAsset("sparkle.mp3");
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
  authMusic.loop = false;
  authMusic.volume = 0.35;
}

let authMusicActive = false;
let authMusicRestart: number | undefined;
let authMusicStartedAt: number | undefined;
let authMusicCycle = 1;
let overworldSoundActive = false;
let walkingSoundActive = false;
const characterVoices = new Set<HTMLAudioElement>();
const authMusicCycleMs = 33_600;

function preferenceEnabled(key: "nerdungeon.sfx" | "nerdungeon.music") {
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return true;
  }
}

function syncMusicPreferences() {
  if (!preferenceEnabled("nerdungeon.music")) {
    if (authMusicRestart !== undefined) window.clearTimeout(authMusicRestart);
    authMusicRestart = undefined;
    authMusicStartedAt = undefined;
    authMusic?.pause();
    if (authMusic) authMusic.currentTime = 0;
    overworldAudio.pause();
    return;
  }
  if (authMusicActive && authMusic?.paused) void playAuthMusicCycle();
  if (overworldSoundActive && overworldAudio.paused)
    void overworldAudio.play().catch(reportPlaybackError);
}

function syncSfxPreferences() {
  if (!preferenceEnabled("nerdungeon.sfx")) {
    walkingAudio.pause();
    characterVoices.forEach((voice) => voice.pause());
    return;
  }
  if (walkingSoundActive && walkingAudio.paused)
    void walkingAudio.play().catch(reportPlaybackError);
  characterVoices.forEach((voice) => {
    if (voice.paused) void voice.play().catch(reportPlaybackError);
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("nerdungeon.preferencesChanged", () => {
    syncMusicPreferences();
    syncSfxPreferences();
  });
  window.addEventListener("storage", () => {
    syncMusicPreferences();
    syncSfxPreferences();
  });
}

function reportPlaybackError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") return;
  console.error("Game sound could not play.", error);
}

function playOneShot(source: string, fallback?: string) {
  if (!preferenceEnabled("nerdungeon.sfx")) return;
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

export function playChapterCompleteSound() {
  if (chapterCompleteUrl) playOneShot(chapterCompleteUrl);
}

export function playRewardSound(reward: keyof typeof rewardAudioUrls) {
  const source = rewardAudioUrls[reward];
  if (source) playOneShot(source);
}

export function playSparkleSound() {
  if (sparkleUrl) playOneShot(sparkleUrl);
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
  voice.preservesPitch = true;
  let stopped = false;
  const play = () => {
    if (stopped || !preferenceEnabled("nerdungeon.sfx")) return;
    voice.playbackRate = 1;
    void voice.play().catch(reportPlaybackError);
  };
  characterVoices.add(voice);
  play();
  return () => {
    stopped = true;
    characterVoices.delete(voice);
    voice.pause();
    voice.currentTime = 0;
  };
}

function playAuthMusicCycle(): Promise<void> {
  if (!authMusic || !authMusicActive || !preferenceEnabled("nerdungeon.music"))
    return Promise.resolve();
  return authMusic.play().then(() => {
    if (authMusicStartedAt === undefined) {
      authMusicStartedAt = performance.now();
      authMusicCycle = 1;
    }
    if (authMusicRestart !== undefined) window.clearTimeout(authMusicRestart);
    const nextRestart = authMusicStartedAt + authMusicCycle * authMusicCycleMs;
    authMusicRestart = window.setTimeout(() => {
      if (!authMusicActive || !preferenceEnabled("nerdungeon.music")) return;
      authMusicCycle++;
      authMusic.currentTime = 0;
      void playAuthMusicCycle().catch(reportPlaybackError);
    }, Math.max(0, nextRestart - performance.now()));
  });
}

export function setAuthMusic(active: boolean) {
  if (!authMusic) return;
  authMusicActive = active;
  if (!active) {
    if (authMusicRestart !== undefined) window.clearTimeout(authMusicRestart);
    authMusicRestart = undefined;
    authMusicStartedAt = undefined;
    authMusicCycle = 1;
    authMusic.pause();
    authMusic.currentTime = 0;
    return;
  }
  if (authMusic.paused && preferenceEnabled("nerdungeon.music"))
    void playAuthMusicCycle().catch(reportPlaybackError);
}

export function setOverworldSound(active: boolean) {
  overworldSoundActive = active;
  if (!active) {
    overworldAudio.pause();
    overworldAudio.currentTime = 0;
    return;
  }
  if (overworldAudio.paused && preferenceEnabled("nerdungeon.music"))
    void overworldAudio.play().catch(reportPlaybackError);
}

export function setWalkingSound(active: boolean) {
  walkingSoundActive = active;
  if (!active) {
    walkingAudio.pause();
    walkingAudio.currentTime = 0;
    return;
  }
  if (walkingAudio.paused && preferenceEnabled("nerdungeon.sfx"))
    void walkingAudio.play().catch(reportPlaybackError);
}

export function playCorrectAnswerSound() {
  playOneShot(correctAnswerUrl);
}

export function playCoinPickupSound() {
  playOneShot(dingUrl);
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
