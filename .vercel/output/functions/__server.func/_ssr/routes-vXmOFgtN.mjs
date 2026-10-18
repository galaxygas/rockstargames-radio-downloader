import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Download, i as Pause, n as RefreshCw, r as Play } from "../_libs/lucide-react.mjs";
import { i as previewPathPrefix, n as Route$3, r as refreshCatalog } from "./router-CI0Qbzgp.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-vXmOFgtN.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function prefixed(path) {
	if (typeof window === "undefined") return path;
	return `${previewPathPrefix(window.location.hostname, window.location.pathname) ?? ""}${path}`;
}
function usePrefixed(path) {
	const [href, setHref] = (0, import_react.useState)(path);
	(0, import_react.useEffect)(() => {
		setHref(prefixed(path));
	}, [path]);
	return href;
}
function formatClock(seconds) {
	const safe = Math.max(0, seconds);
	const minutes = Math.floor(safe / 60);
	return `${minutes}:${(safe - minutes * 60).toFixed(1).padStart(4, "0")}`;
}
function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1048576).toFixed(2)} MB`;
}
function layerName(layer) {
	return layer === 3 ? "III" : layer === 2 ? "II" : "I";
}
function formatLine(station) {
	const format = station.format;
	return `${format.version} Layer ${layerName(format.layer)} · ${format.bitrateKbps} kbps ${format.bitrateMode} · ${(format.sampleRate / 1e3).toFixed(1)} kHz · ${format.channels}`;
}
function download(path) {
	const anchor = document.createElement("a");
	anchor.href = prefixed(path);
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
}
function Desk({ catalog }) {
	const router = useRouter();
	const audioRef = (0, import_react.useRef)(null);
	const [activeKey, setActiveKey] = (0, import_react.useState)(null);
	const [time, setTime] = (0, import_react.useState)(0);
	const [playing, setPlaying] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const active = catalog.stations.find((station) => station.key === activeKey) ?? null;
	const sharedFormat = new Set(catalog.stations.map(formatLine));
	const totalBytes = catalog.stations.reduce((sum, station) => sum + station.format.bytes, 0);
	(0, import_react.useEffect)(() => {
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
	async function toggle(station, at) {
		const audio = audioRef.current;
		if (!audio) return;
		setError(null);
		try {
			if (activeKey === station.key && at === void 0) {
				if (audio.paused) await audio.play();
				else audio.pause();
				return;
			}
			if (audio.dataset.station !== station.key) {
				audio.dataset.station = station.key;
				audio.src = prefixed(`/api/audio?station=${encodeURIComponent(station.key)}`);
				await new Promise((resolve, reject) => {
					const done = () => {
						cleanup();
						resolve();
					};
					const fail = () => {
						cleanup();
						reject(/* @__PURE__ */ new Error("The station master did not load"));
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
			if (Math.abs(audio.currentTime - target) > .05) audio.currentTime = target;
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
	function save(id, path) {
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
	function seek(next) {
		const audio = audioRef.current;
		if (!audio || !active) return;
		audio.currentTime = next;
		setTime(next);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
				ref: audioRef,
				preload: "none",
				className: "hidden"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "border-t-2 border-amber pt-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-sm tracking-widest text-amber",
						children: "NIGHT AIRCHECK"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex flex-wrap items-end justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display text-5xl font-semibold leading-none text-fg sm:text-6xl",
							children: "Station Scope"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => void refresh(),
							disabled: busy === "refresh",
							className: "inline-flex h-11 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm text-fg disabled:opacity-50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
								className: "size-4",
								"aria-hidden": "true"
							}), "Read page again"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 max-w-2xl text-base leading-relaxed text-muted",
						children: "Every radio preview on the Grand Theft Auto VI music page. Each station is one MPEG file with chapter cues, not a folder of songs. Masters are the original response bytes. Chapter files are those same frames, cut where a frame starts, with a new ID3 tag."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Stations",
								value: String(catalog.stations.length)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Chapters",
								value: String(catalog.stations.reduce((sum, station) => sum + station.chapters.length, 0))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Masters",
								value: formatBytes(totalBytes)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Encode",
								value: sharedFormat.size === 1 ? "One profile" : `${sharedFormat.size} profiles`
							})
						]
					}),
					sharedFormat.size === 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-fg",
						children: [...sharedFormat][0]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-muted",
						children: [
							"Read from the live page ",
							catalog.fetchedAt.replace("T", " ").replace(/\.\d+Z$/, " UTC"),
							"."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
								label: "All masters",
								busy: busy === "masters",
								onClick: () => save("masters", "/api/download?pack=masters")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
								label: "All chapters",
								tone: "ghost",
								busy: busy === "chapters",
								onClick: () => save("chapters", "/api/download?pack=chapters")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
								label: "Everything",
								tone: "ghost",
								busy: busy === "everything",
								onClick: () => save("everything", "/api/download?pack=everything")
							})
						]
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-amber",
						children: error
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 flex flex-col gap-4",
				children: catalog.stations.map((station) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StationBlock, {
					station,
					playing: playing && activeKey === station.key,
					time: activeKey === station.key ? time : 0,
					busy,
					onToggle: (at) => void toggle(station, at),
					onSeek: seek,
					onSave: save,
					active: activeKey === station.key
				}, station.key))
			})
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md border border-line bg-surface px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-xs tracking-wide text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "font-display text-2xl leading-tight text-fg",
			children: value
		})]
	});
}
function Action({ label, onClick, busy, tone = "solid" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		disabled: busy,
		className: `inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold disabled:opacity-50 ${tone === "solid" ? "bg-amber text-bg" : "border border-line bg-surface text-fg"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
			className: "size-4",
			"aria-hidden": "true"
		}), busy ? "Starting…" : label]
	});
}
function StationBlock({ station, playing, time, active, busy, onToggle, onSeek, onSave }) {
	const art = usePrefixed(`/api/art?station=${encodeURIComponent(station.key)}`);
	const current = station.chapters.find((chapter, index) => {
		const last = index === station.chapters.length - 1;
		return time >= chapter.start && (last ? time <= chapter.end + .05 : time < chapter.end);
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-lg border border-line bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-3",
				children: [station.hasArt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: art,
					alt: "",
					width: 1600,
					height: 1600,
					className: "size-20 shrink-0 rounded-md object-cover"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex size-20 shrink-0 items-center justify-center rounded-md bg-surface-2 font-display text-2xl text-amber",
					children: station.name.slice(0, 1)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-3xl leading-none text-fg",
							children: station.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: station.host
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-fg",
							children: station.description
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-sm text-muted",
				children: [
					formatClock(station.format.duration),
					" · ",
					formatBytes(station.format.bytes),
					" ·",
					" ",
					station.format.frames.toLocaleString("en-US"),
					" frames · ",
					formatLine(station)
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => onToggle(active ? void 0 : 0),
						className: "inline-flex h-11 items-center gap-2 rounded-md bg-amber px-3 text-sm font-semibold text-bg",
						"aria-pressed": playing,
						children: [playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }), playing ? "Pause" : "Play master"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
						label: "Master",
						tone: "ghost",
						busy: busy === station.key,
						onClick: () => onSave(station.key, `/api/download?station=${encodeURIComponent(station.key)}`)
					}),
					station.segmented ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
						label: "Chapter zip",
						tone: "ghost",
						busy: busy === `${station.key}-zip`,
						onClick: () => onSave(`${station.key}-zip`, `/api/download?station=${encodeURIComponent(station.key)}&pack=station`)
					}) : null
				]
			}),
			active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mt-3 block text-xs text-muted",
				children: [
					"Position ",
					formatClock(time),
					current ? ` · ${current.title}` : "",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "mt-1 block h-11 w-full",
						type: "range",
						min: 0,
						max: station.format.duration,
						step: .01,
						value: Math.min(time, station.format.duration),
						onChange: (event) => onSeek(Number(event.target.value))
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-4 divide-y divide-line border-t border-line",
				children: station.chapters.map((chapter) => {
					const on = active && current?.index === chapter.index;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: on ? "bg-surface-2" : void 0,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => onToggle(chapter.start),
								className: "min-w-0 flex-1 rounded-md px-1 py-2 text-left",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-xs text-amber",
										children: formatClock(chapter.start)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate text-sm font-semibold text-fg",
										children: chapter.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate text-sm text-muted",
										children: chapter.artists
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": `Download ${chapter.title}`,
								onClick: () => onSave(`${station.key}-${chapter.index}`, `/api/download?station=${encodeURIComponent(station.key)}&chapter=${chapter.index}`),
								className: "inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-line text-fg",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
									className: "size-4",
									"aria-hidden": "true"
								})
							})]
						})
					}, chapter.index);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
				className: "mt-2 text-sm text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
						className: "cursor-pointer py-2 text-fg",
						children: "File record"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "break-all",
						children: ["Source ", station.sourceUrl]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 break-all",
						children: ["SHA-256 ", station.format.sha256]
					}),
					station.format.id3v1Title ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1",
						children: [
							"Upstream ID3v1 “",
							station.format.id3v1Title,
							"”",
							station.format.id3v1Year ? ` · ${station.format.id3v1Year}` : ""
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1",
						children: [
							"Saved as ",
							station.filename,
							". Chapter files keep whole MPEG frames (",
							station.format.samplesPerFrame,
							" samples each). The audio is not re-encoded."
						]
					})
				]
			})
		]
	});
}
function Home() {
	const catalog = Route$3.useLoaderData();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Desk, { catalog });
}
//#endregion
export { Home as component };
