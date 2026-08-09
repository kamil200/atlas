import { Music, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "chowk.music";
const TRACK_URL = "/audio/lofi.mp3";

/*
  An easter egg, off by default and remembered per browser. The track is not
  committed to the repo for licensing reasons, so if the file is missing this
  says so plainly instead of pretending to play.
*/
export function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const toggle = async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      localStorage.setItem(STORAGE_KEY, "off");
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(TRACK_URL);
      audio.loop = true;
      audio.volume = 0.35;
      audioRef.current = audio;
    }

    try {
      await audioRef.current.play();
      setPlaying(true);
      localStorage.setItem(STORAGE_KEY, "on");
    } catch {
      toast("No track loaded. Drop a CC0 loop at public/audio/lofi.mp3.");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      aria-label={playing ? "Stop the music" : "Play some lofi"}
      className="grid size-9 place-items-center rounded-full border border-line bg-paper text-ink-soft shadow-card transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-peepal-500"
    >
      {playing ? (
        <Volume2 className="size-4 text-peepal-600" aria-hidden="true" />
      ) : (
        <Music className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
