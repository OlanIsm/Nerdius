const doorCloseUrl = new URL(
  "../../assets/audio/whoosh.mp3",
  import.meta.url,
).href;
const doorOpenUrl = new URL(
  "../../assets/audio/whoosh2.mp3",
  import.meta.url,
).href;

function playDoorSound(source: string) {
  const audio = new Audio(source);
  audio.volume = 0.5;
  void audio.play().catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "NotAllowedError")
      return;
    console.error("Door sound could not play.", error);
  });
}

export function playDoorCloseSound() {
  playDoorSound(doorCloseUrl);
}

export function playDoorOpenSound() {
  playDoorSound(doorOpenUrl);
}
