import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Download, Pause, Play, RefreshCw } from "lucide-react";
import { refreshCatalog } from "@/lib/radio/catalog.functions";
import type { Catalog, StationView } from "@/lib/radio/catalog.server";
import { previewPathPrefix } from "@/lib/preview-path-prefix";

function prefixed(path: string): string {
  if (typeof window === "undefined") return path;
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
  return `${prefix}${path}`;
}

function usePrefixed(path: string): string {
  const [href, setHref] = useState(path);
  useEffect(() => {
    setHref(prefixed(path));
  }, [path]);
  return href;
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function layerName(layer: number): string {
  return layer === 3 ? "III" : layer === 2 ? "II" : "I";
}

function formatLine(station: StationView): string {
  const format = station.format;
  return `${format.version} Layer ${layerName(format.layer)} · ${format.bitrateKbps} kbps ${format.bitrateMode} · ${(format.sampleRate / 1000).toFixed(1)} kHz · ${format.channels}`;
}

function download(path: string) {
  const anchor = document.createElement("a");
  anchor.href = prefixed(path);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function Desk({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = catalog.stations.find((station) => station.key === activeKey) ?? null;
  const sharedFormat = new Set(catalog.stations.map(formatLine));
  const totalBytes = catalog.stations.reduce((sum, station) => sum + station.format.bytes, 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  async function toggle(station: StationView, at?: number) {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    try {
      if (activeKey === station.key && at === undefined) {
        if (audio.paused) await audio.play();
        else audio.pause();
        return;
      }
      if (audio.dataset.station !== station.key) {
        audio.dataset.station = station.key;
        audio.src = prefixed(`/api/audio?station=${encodeURIComponent(station.key)}`);
        await new Promise<void>((resolve, reject) => {
          const done = () => {
            cleanup();
            resolve();
          };
          const fail = () => {
            cleanup();
            reject(new Error("The station master did not load"));
          };
          const cleanup = () => {
            audio.removeEventListener("loadedmetadata", done);
            audio.removeEventListener("error", fail);
          };
          audio.addEventListener("loadedmetadata", done);
          audio.addEventListener("error", fail);
          audio.load();
        });
      }
      setActiveKey(station.key);
      const target = at ?? 0;
      if (Math.abs(audio.currentTime - target) > 0.05) audio.currentTime = target;
      setTime(target);
      await audio.play();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Playback failed");
    }
  }

  async function refresh() {
    setBusy("refresh");
    setError(null);
    try {
      await refreshCatalog();
      await router.invalidate();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Refresh failed");
    } finally {
      setBusy(null);
    }
  }

  function save(id: string, path: string) {
    setBusy(id);
    setError(null);
    try {
      download(path);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Download failed");
    } finally {
      window.setTimeout(() => setBusy(null), 400);
    }
  }

  function seek(next: number) {
    const audio = audioRef.current;
    if (!audio || !active) return;
    audio.currentTime = next;
    setTime(next);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
      <audio ref={audioRef} preload="none" className="hidden" />
      <header className="border-t-2 border-amber pt-5">
        <p className="font-display text-sm tracking-widest text-amber">NIGHT AIRCHECK</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-5xl font-semibold leading-none text-fg sm:text-6xl">Station Scope</h1>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={busy === "refresh"}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm text-fg disabled:opacity-50"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Read page again
          </button>
        </div>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Every radio preview on the Grand Theft Auto VI music page. Each station is one MPEG file
          with chapter cues, not a folder of songs. Masters are the original response bytes. Chapter
          files are those same frames, cut where a frame starts, with a new ID3 tag.
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Stations" value={String(catalog.stations.length)} />
          <Stat
            label="Chapters"
            value={String(catalog.stations.reduce((sum, station) => sum + station.chapters.length, 0))}
          />
          <Stat label="Masters" value={formatBytes(totalBytes)} />
          <Stat
            label="Encode"
            value={sharedFormat.size === 1 ? "One profile" : `${sharedFormat.size} profiles`}
          />
        </dl>
        {sharedFormat.size === 1 ? (
          <p className="mt-3 text-sm text-fg">{[...sharedFormat][0]}</p>
        ) : null}
        <p className="mt-1 text-sm text-muted">
          Read from the live page {catalog.fetchedAt.replace("T", " ").replace(/\.\d+Z$/, " UTC")}.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Action
            label="All masters"
            busy={busy === "masters"}
            onClick={() => save("masters", "/api/download?pack=masters")}
          />
          <Action
            label="All chapters"
            tone="ghost"
            busy={busy === "chapters"}
            onClick={() => save("chapters", "/api/download?pack=chapters")}
          />
          <Action
            label="Everything"
            tone="ghost"
            busy={busy === "everything"}
            onClick={() => save("everything", "/api/download?pack=everything")}
          />
        </div>
        {error ? <p className="mt-3 text-sm text-amber">{error}</p> : null}
      </header>

      <div className="mt-8 flex flex-col gap-4">
        {catalog.stations.map((station) => (
          <StationBlock
            key={station.key}
            station={station}
            playing={playing && activeKey === station.key}
            time={activeKey === station.key ? time : 0}
            busy={busy}
            onToggle={(at) => void toggle(station, at)}
            onSeek={seek}
            onSave={save}
            active={activeKey === station.key}
          />
        ))}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2">
      <dt className="text-xs tracking-wide text-muted">{label}</dt>
      <dd className="font-display text-2xl leading-tight text-fg">{value}</dd>
    </div>
  );
}

function Action({
  label,
  onClick,
  busy,
  tone = "solid",
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
  tone?: "solid" | "ghost";
}) {
  const toneClass =
    tone === "solid"
      ? "bg-amber text-bg"
      : "border border-line bg-surface text-fg";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold disabled:opacity-50 ${toneClass}`}
    >
      <Download className="size-4" aria-hidden="true" />
      {busy ? "Starting…" : label}
    </button>
  );
}

function StationBlock({
  station,
  playing,
  time,
  active,
  busy,
  onToggle,
  onSeek,
  onSave,
}: {
  station: StationView;
  playing: boolean;
  time: number;
  active: boolean;
  busy: string | null;
  onToggle: (at?: number) => void;
  onSeek: (time: number) => void;
  onSave: (id: string, path: string) => void;
}) {
  const art = usePrefixed(`/api/art?station=${encodeURIComponent(station.key)}`);
  const current = station.chapters.find((chapter, index) => {
    const last = index === station.chapters.length - 1;
    return time >= chapter.start && (last ? time <= chapter.end + 0.05 : time < chapter.end);
  });

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <div className="flex gap-3">
        {station.hasArt ? (
          <img
            src={art}
            alt=""
            width={1600}
            height={1600}
            className="size-20 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-md bg-surface-2 font-display text-2xl text-amber">
            {station.name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-3xl leading-none text-fg">{station.name}</h2>
          <p className="mt-1 text-sm text-muted">{station.host}</p>
          <p className="mt-2 text-sm leading-relaxed text-fg">{station.description}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">
        {formatClock(station.format.duration)} · {formatBytes(station.format.bytes)} ·{" "}
        {station.format.frames.toLocaleString("en-US")} frames · {formatLine(station)}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onToggle(active ? undefined : 0)}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-amber px-3 text-sm font-semibold text-bg"
          aria-pressed={playing}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? "Pause" : "Play master"}
        </button>
        <Action
          label="Master"
          tone="ghost"
          busy={busy === station.key}
          onClick={() => onSave(station.key, `/api/download?station=${encodeURIComponent(station.key)}`)}
        />
        {station.segmented ? (
          <Action
            label="Chapter zip"
            tone="ghost"
            busy={busy === `${station.key}-zip`}
            onClick={() =>
              onSave(
                `${station.key}-zip`,
                `/api/download?station=${encodeURIComponent(station.key)}&pack=station`,
              )
            }
          />
        ) : null}
      </div>

      {active ? (
        <label className="mt-3 block text-xs text-muted">
          Position {formatClock(time)}
          {current ? ` · ${current.title}` : ""}
          <input
            className="mt-1 block h-11 w-full"
            type="range"
            min={0}
            max={station.format.duration}
            step={0.01}
            value={Math.min(time, station.format.duration)}
            onChange={(event) => onSeek(Number(event.target.value))}
          />
        </label>
      ) : null}

      <ol className="mt-4 divide-y divide-line border-t border-line">
        {station.chapters.map((chapter) => {
          const on = active && current?.index === chapter.index;
          return (
            <li key={chapter.index} className={on ? "bg-surface-2" : undefined}>
              <div className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  onClick={() => onToggle(chapter.start)}
                  className="min-w-0 flex-1 rounded-md px-1 py-2 text-left"
                >
                  <span className="block text-xs text-amber">{formatClock(chapter.start)}</span>
                  <span className="block truncate text-sm font-semibold text-fg">{chapter.title}</span>
                  <span className="block truncate text-sm text-muted">{chapter.artists}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Download ${chapter.title}`}
                  onClick={() =>
                    onSave(
                      `${station.key}-${chapter.index}`,
                      `/api/download?station=${encodeURIComponent(station.key)}&chapter=${chapter.index}`,
                    )
                  }
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-line text-fg"
                >
                  <Download className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <details className="mt-2 text-sm text-muted">
        <summary className="cursor-pointer py-2 text-fg">File record</summary>
        <p className="break-all">Source {station.sourceUrl}</p>
        <p className="mt-1 break-all">SHA-256 {station.format.sha256}</p>
        {station.format.id3v1Title ? (
          <p className="mt-1">
            Upstream ID3v1 “{station.format.id3v1Title}”
            {station.format.id3v1Year ? ` · ${station.format.id3v1Year}` : ""}
          </p>
        ) : null}
        <p className="mt-1">
          Saved as {station.filename}. Chapter files keep whole MPEG frames (
          {station.format.samplesPerFrame} samples each). The audio is not re-encoded.
        </p>
      </details>
    </section>
  );
}
