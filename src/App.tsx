// App.tsx
// Celestial Journey — romantic interactive memory timeline
// React + TypeScript + Tailwind + Framer Motion
//
// Put files in: /public/media/
// Images (8):
//  - 29-11.jpeg
//  - 05-12.jpeg
//  - 20-12.jpeg
//  - 20-12 [2].jpeg
//  - 20-12 [3].jpeg
//  - 03-01.jpeg
//  - 03-01 [2].jpeg
//  - 17-01 [1].jpeg
//
// Videos:
//  - video 1.mp4 ... video 7.mp4   (sem acento, com espaço)
//
// Audio:
//  - pense em mim.mp3   (exatamente esse nome)
//
// Password: "senha"

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

type MediaKind = "image" | "video" | "chapter";

type JourneyItem = {
  id: string;
  kind: MediaKind;
  src?: string; // for image/video
  title: string;
  subtitle?: string;
  dateLabel?: string;
  constellation?: string;
  easterEgg?: string; // shown when opening image
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

/** ---------- Starfield (canvas particles) ---------- */
function Starfield({
  intensity = 150,
  className,
}: {
  intensity?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let w = 0;
    let h = 0;

    type Star = {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      a: number;
      tw: number;
    };

    const stars: Star[] = [];

    const resize = () => {
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars.length = 0;
      const count = Math.max(60, Math.floor((w * h) / 12500) + intensity);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.6 + 0.2,
          vx: (Math.random() - 0.5) * 0.07,
          vy: (Math.random() - 0.5) * 0.07,
          a: Math.random() * 0.6 + 0.2,
          tw: Math.random() * 0.02 + 0.005,
        });
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);

      const haze = ctx.createRadialGradient(
        w * 0.5,
        h * 0.35,
        10,
        w * 0.5,
        h * 0.35,
        Math.max(w, h) * 0.7
      );
      haze.addColorStop(0, "rgba(140, 90, 255, 0.08)");
      haze.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;

        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;
        if (s.y < -10) s.y = h + 10;
        if (s.y > h + 10) s.y = -10;

        s.a += (Math.random() - 0.5) * s.tw;
        s.a = Math.max(0.12, Math.min(0.9, s.a));

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 210, 255, ${s.a})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    resize();
    tick();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={cx("pointer-events-none fixed inset-0 z-0", className)}
    />
  );
}

/** ---------- Hidden audio (starts on user interaction) ---------- */
function HiddenAudio({
  shouldPlay,
  onReady,
}: {
  shouldPlay: boolean;
  onReady?: (api: { resume: () => void }) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const resume = () => {
    const a = audioRef.current;
    if (!a) return;
    a.loop = true;
    a.volume = 0.7;
    a.play().catch(() => { });
  };

  useEffect(() => {
    onReady?.({ resume });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    a.loop = true;
    a.volume = 0.7;

    if (shouldPlay) {
      a.play().catch(() => { });
    } else {
      a.pause();
      a.currentTime = 0;
    }
  }, [shouldPlay]);

  return (
    <audio
      ref={audioRef}
      src="/media/pense em mim.mp3"
      preload="auto"
      className="hidden"
    />
  );
}

export default function App() {
  const audioApiRef = useRef<{ resume: () => void } | null>(null);
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [started, setStarted] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Lightbox
  const [openImg, setOpenImg] = useState<{
    src: string;
    alt: string;
    easterEgg?: string;
  } | null>(null);


  const items: JourneyItem[] = useMemo(() => {
    const images = [
      "29-11.jpeg",
      "05-12.jpeg",
      "20-12.jpeg",
      "20-12 [2].jpeg",
      "20-12 [3].jpeg",
      "03-01.jpeg",
      "03-01 [2].jpeg",
      "17-01 [1].jpeg",
    ];

    const videos = [
      "video 1.mp4",
      "video 2.mp4",
      "video 3.mp4",
      "video 4.mp4",
      "video 5.mp4",
      "video 6.mp4",
      "video 7.mp4",
    ];

    // 8 captions (photos only)
    const photoCaptions = [
      {
        title: "Imagem 1",
        subtitle:
          "Deixa a memória te puxar… devagar. Hoje eu entendo: ali, sem perceber, eu comecei a me apaixonar. Antes mesmo de saber dar nome ao sentimento.",
      },
      {
        title: "Imagem 2",
        subtitle:
          "Aqui eu estava indo pra Raul Soares pela primeira vez. A estrada era escura, o coração acelerado, e a cabeça cheia de pensamentos.",
      },
      {
        title: "Imagem 3",
        subtitle:
          "Primeira viagem juntos, Caratinga. Você dormiu uns 40 min no meu peito e peidou até.",
      },
      {
        title: "Imagem 4",
        subtitle:
          "Nós indo pro nosso primeiro date juntos, a praça de Caratinga estava toda decorada.",
      },
      {
        title: "Imagem 5",
        subtitle:
          "Nós no primeiro date, a cerveja estava boa viu. Você estava linda! Sou fã da sua companhia.",
      },
      {
        title: "Imagem 6",
        subtitle: "Eu tirando foto te admirando kkkkkkkk",
      },
      {
        title: "Imagem 7",
        subtitle: "Nós sendo papais",
      },
      {
        title: "Imagem 8",
        subtitle:
          "Quando eu te assumi pro meu cf, mas na verdade, quero te assumir pro mundo.",
      },
    ];

    // Constellations by phase
    const constellations = [
      "Constelação: A Primeira Conversa",
      "Constelação: A Estrada Pra Te Ver",
      "Constelação: Primeira Viagem",
      "Constelação: Primeiro Date - BORAAA",
      "Constelação: Primeiro Date - Deu certo",
      "Constelação: Flagrei de Admiração",
      "Constelação: Modo Papais",
      "Constelação: Assumido (só que não)",
    ];

    // Easter eggs shown on lightbox
    const eggs = [
      "Easter egg: cliquei e me apaixonei (sem querer) ✅",
      "Easter egg: +10 pontos de coragem (estrada de noite) 🛣️",
      "Easter egg: checkpoint desbloqueado — cochilo no peito 😴",
      "Easter egg: missão: chegar vivo e não passar vergonha 🎯",
      "Easter egg: buff ativo — cerveja gelada + companhia 10/10 🍻",
      "Easter egg: modo safado ativado 👀",
      "Easter egg: DLC pais liberada 🍼",
      "Easter egg: status: “quase oficial”, mas eu queria era mundial 🌍",
    ];

    // Chapters between items (text-only)
    const chapters = [
      { afterIndex: 0, title: "Capítulo 1", subtitle: "Aqui eu já tava emocionado… só não admitia kkkkk" },
      { afterIndex: 2, title: "Capítulo 2", subtitle: "Plot twist: eu tava gostando do cheiro do peido" },
      { afterIndex: 4, title: "Capítulo 3", subtitle: "Nessa parte eu já tinha perdido o controle" },
      { afterIndex: 6, title: "Capítulo 4", subtitle: "Parece brincadeira… mas daqui uns anos seremos" },
    ];

    const out: JourneyItem[] = [];

    const pushImg = (file: string, idx: number) => {
      out.push({
        id: `img-${idx}-${file}`,
        kind: "image",
        src: `/media/${file}`,
        title: photoCaptions[idx]?.title ?? `Imagem ${idx + 1}`,
        subtitle: photoCaptions[idx]?.subtitle ?? "…",
        dateLabel: file.replace(/\.(jpg|jpeg|png|webp)$/i, ""),
        constellation: constellations[idx],
        easterEgg: eggs[idx],
      });
    };

    const pushVid = (file: string, idx: number, title: string) => {
      out.push({
        id: `vid-${idx}-${file}`,
        kind: "video",
        src: `/media/${file}`,
        title,
        subtitle: "Respira. Aperta play. E fica aqui um pouco.",
      });
    };

    const maybeInsertChapterAfterPhotoIndex = (photoIdx: number) => {
      const chap = chapters.find((c) => c.afterIndex === photoIdx);
      if (!chap) return;
      out.push({
        id: `chapter-after-${photoIdx}`,
        kind: "chapter",
        title: chap.title,
        subtitle: chap.subtitle,
      });
    };

    // Weave videos between photos (videos unchanged vibe)
    pushImg(images[0], 0);
    maybeInsertChapterAfterPhotoIndex(0);
    pushVid(videos[0], 1, "Um pedaço de nós em movimento");

    pushImg(images[1], 1);
    pushVid(videos[1], 2, "Quando o tempo desacelera");

    pushImg(images[2], 2);
    maybeInsertChapterAfterPhotoIndex(2);
    pushVid(videos[2], 3, "A cena que eu não esqueço");

    pushImg(images[3], 3);
    pushVid(videos[3], 4, "Dois mundos, uma órbita");

    pushImg(images[4], 4);
    maybeInsertChapterAfterPhotoIndex(4);
    pushVid(videos[4], 5, "A vida fazendo sentido do nada");

    pushImg(images[5], 5);
    pushVid(videos[5], 6, "O que eu não disse, tá aqui");

    pushImg(images[6], 6);
    maybeInsertChapterAfterPhotoIndex(6);
    pushImg(images[7], 7);

    // Finale
    out.push({
      id: "finale-video-7",
      kind: "video",
      src: `/media/${videos[6]}`,
      title: "To be continued…",
      subtitle:
        "Continua… e eu ainda vou te assumir pro mundo (com juros)",
    });

    // Final note
    out.push({
      id: "final-note",
      kind: "chapter",
      title: "Última coisa antes de fechar",
      subtitle: "Eu amo você, Linda!",
    });

    return out;
  }, []);

  const { scrollYProgress } = useScroll();

  const bg1 = useTransform(scrollYProgress, [0, 0.45, 1], [
    "linear-gradient(180deg, #000000 0%, #050015 40%, #0b0022 100%)",
    "linear-gradient(180deg, #02000a 0%, #09001f 45%, #150038 100%)",
    "linear-gradient(180deg, #070012 0%, #18003f 55%, #2b0066 100%)",
  ]);

  const lineGlow = useTransform(scrollYProgress, [0, 1], [0.35, 0.9]);
  const lineFillHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const handleLogin = () => {
    if (password.trim().toLowerCase() === "senha") {
      setErr(null);
      setAuthed(true);
    } else {
      setErr("Senha incorreta.");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenImg(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen text-white">
      {/* Dynamic background */}
      <motion.div
        className="fixed inset-0 z-[-2]"
        style={{ background: bg1 as unknown as string }}
      />

      {/* Star particles */}
      <Starfield intensity={160} />

      {/* Soft vignette */}
      <div className="pointer-events-none fixed inset-0 z-[-1] bg-[radial-gradient(circle_at_50%_30%,rgba(120,70,255,0.12),rgba(0,0,0,0.75)_55%,rgba(0,0,0,0.95)_100%)]" />

      {/* Audio starts on Start Journey */}
      <HiddenAudio
        shouldPlay={started}
        onReady={(api) => (audioApiRef.current = api)}
      />

      {/* PASSWORD GATE */}
      <AnimatePresence>
        {!authed && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-[92%] max-w-md">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-3 h-1 w-10 rounded bg-white/60" />
                <p className="text-sm tracking-[0.35em] text-white/60">
                  CELESTIAL JOURNEY
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                <label className="mb-2 block text-xs tracking-widest text-white/60">
                  PASSWORD
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/25"
                  placeholder="digite a senha…"
                  type="password"
                  autoFocus
                />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-white/40">(silêncio. escuro. só você.)</p>
                  <button
                    onClick={handleLogin}
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white/85 transition hover:bg-white/15 active:scale-[0.99]"
                  >
                    Entrar
                  </button>
                </div>
                {err && <p className="mt-3 text-sm text-red-300/90">{err}</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* START SCREEN */}
      <AnimatePresence>
        {authed && !started && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0 }}
          >
            <div className="w-[92%] max-w-xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="mx-auto"
              >
                <p className="mb-3 text-xs tracking-[0.4em] text-white/60">
                  APERTE PARA COMEÇAR
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Uma linha do tempo
                  <span className="block text-white/70">
                    feita de estrelas e memória
                  </span>
                </h1>
                <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/60">
                  Desce devagar. E se você clicar numa foto… tem easter egg 😅
                </p>

                <div className="mt-7 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setStarted(true)}
                    className="group relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-medium text-white/90 shadow-[0_0_40px_rgba(160,120,255,0.15)] transition hover:bg-white/12 active:scale-[0.99]"
                  >
                    <span className="relative z-10">Start Journey</span>
                    <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(circle_at_30%_30%,rgba(200,170,255,0.28),rgba(0,0,0,0)_55%)]" />
                  </button>

                  <span className="text-xs text-white/35">(a música começa aqui)</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* THE JOURNEY */}
      {authed && started && (
        <main className="relative z-10">
          {/* Center line */}
          <div className="pointer-events-none fixed inset-x-0 top-0 z-10 flex justify-center">
            <motion.div
              className="relative h-screen w-[2px] overflow-hidden rounded-full"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.00) 0%, rgba(170,120,255,0.85) 10%, rgba(170,120,255,0.55) 60%, rgba(255,255,255,0.00) 100%)",
                boxShadow: "0 0 34px rgba(170,120,255,0.45)",
                opacity: lineGlow,
              }}
            >
              <motion.div
                className="absolute left-0 top-0 w-full"
                style={{
                  height: lineFillHeight,
                  background:
                    "linear-gradient(180deg, rgba(170,120,255,0.0) 0%, rgba(255,255,255,0.55) 45%, rgba(170,120,255,0.95) 100%)",
                  boxShadow: "0 0 40px rgba(190,150,255,0.6)",
                }}
              />
            </motion.div>
          </div>

          {/* Spacer top */}
          <section className="mx-auto flex min-h-[55vh] max-w-6xl items-end px-4 pb-12 sm:px-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              className="w-full text-center"
            >
              <p className="text-xs tracking-[0.45em] text-white/50">SCROLL TO TRAVEL</p>
              <h2 className="mt-3 text-2xl font-semibold text-white/90 sm:text-3xl">
                Cada ponto é uma constelação.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/55">
                Dica: clique nas fotos pra ver tudo sem cortar 😉
              </p>
            </motion.div>
          </section>

          <section className="mx-auto max-w-6xl px-4 pb-32 sm:px-8">
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(circle_at_50%_30%,black,transparent_70%)]">
                <div className="absolute left-1/2 top-0 h-full w-[520px] -translate-x-1/2 bg-[radial-gradient(circle_at_50%_10%,rgba(160,120,255,0.18),rgba(0,0,0,0)_60%)]" />
              </div>

              <div className="space-y-16 sm:space-y-24">
                {items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="relative"
                  >
                    {/* Node */}

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-12 sm:gap-6">
                      <div
                        className={cx(
                          "sm:col-span-12",
                          idx % 2 === 0
                            ? "sm:col-start-2 sm:col-end-8"
                            : "sm:col-start-6 sm:col-end-12"
                        )}
                      >
                        {/* Chapter card */}
                        {item.kind === "chapter" ? (
                          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_60px_rgba(120,70,255,0.10)] backdrop-blur-xl">
                            <div className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(circle_at_30%_30%,rgba(200,170,255,0.20),rgba(0,0,0,0)_55%)]" />
                            <p className="text-xs tracking-[0.4em] text-white/55">CHAPTER</p>
                            <h3 className="mt-2 text-xl font-semibold text-white/90">
                              {item.title}
                            </h3>
                            {item.subtitle && (
                              <p className="mt-2 text-sm leading-relaxed text-white/65">
                                {item.subtitle}
                              </p>
                            )}

                            <div className="mt-5 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/70">
                                Saudade: +1 ponto
                              </span>
                              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/70">
                                Felicidade: +1 ponto
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_60px_rgba(120,70,255,0.10)] backdrop-blur-xl">
                            <div className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(circle_at_30%_30%,rgba(200,170,255,0.20),rgba(0,0,0,0)_55%)]" />

                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs tracking-[0.35em] text-white/45">
                                  {item.dateLabel ?? `MEMORY ${idx + 1}`}
                                </p>

                                {item.constellation && (
                                  <p className="mt-2 text-xs text-white/55">
                                    ✨ {item.constellation}
                                  </p>
                                )}

                                <h3 className="mt-2 text-lg font-semibold text-white/90">
                                  {item.title}
                                </h3>
                                {item.subtitle && (
                                  <p className="mt-1 text-sm text-white/60">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Media */}
                            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                              {item.kind === "image" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenImg({
                                      src: item.src!,
                                      alt: item.dateLabel ?? item.title,
                                      easterEgg: item.easterEgg,
                                    })
                                  }
                                  className="relative block w-full"
                                  title="Abrir imagem (com easter egg)"
                                >
                                  <img
                                    src={item.src}
                                    alt={item.dateLabel ?? item.title}
                                    className="h-[340px] w-full bg-black/60 object-contain sm:h-[420px]"
                                    loading="lazy"
                                  />
                                </button>
                              ) : (
                                <video
                                  src={item.src}
                                  className="h-[340px] w-full object-cover sm:h-[420px]"
                                  controls
                                  playsInline
                                  preload="metadata"
                                  muted
                                  onPlay={() => audioApiRef.current?.resume()}
                                  onPause={() => audioApiRef.current?.resume()}
                                  onVolumeChange={(e) => {
                                    const v = e.currentTarget;
                                    if (!v.muted) v.muted = true;
                                    audioApiRef.current?.resume();
                                  }}
                                />

                              )}

                              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.10),rgba(0,0,0,0)_35%),radial-gradient(circle_at_70%_60%,rgba(170,120,255,0.10),rgba(0,0,0,0)_45%)]" />
                            </div>

                            {/* Thread */}
                            <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[2px] w-[160px] -translate-x-1/2 opacity-70 sm:w-[220px]">
                              <div className="h-full w-full bg-[linear-gradient(90deg,rgba(0,0,0,0),rgba(170,120,255,0.65),rgba(0,0,0,0))] blur-[0.2px]" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="hidden sm:block sm:col-span-4" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Finale CTA */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="mx-auto mt-24 max-w-xl text-center"
              >
                <p className="text-xs tracking-[0.5em] text-white/45">END OF THIS CHAPTER</p>
                <h3 className="mt-4 text-2xl font-semibold text-white/90">
                  Às vezes eu penso: e se isso tudo for só um sonho, desses que a gente não quer acordar?
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55">
                  Pontuação Final 5/5 <br></br>
                  Volta quando quiser. As estrelas ficam aqui.
                </p>

                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="mt-7 rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm text-white/85 transition hover:bg-white/12 active:scale-[0.99]"
                >
                  Recomeçar a jornada
                </button>
              </motion.div>
            </div>
          </section>

          <div className="h-[40vh]" />
        </main>
      )}

      {/* LIGHTBOX */}
      <AnimatePresence>
        {openImg && (
          <motion.div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenImg(null)}
          >
            <motion.div
              className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm text-white/80">{openImg.alt}</p>
                  {openImg.easterEgg && (
                    <p className="mt-1 text-xs text-white/55">{openImg.easterEgg}</p>
                  )}
                </div>

                <button
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
                  onClick={() => setOpenImg(null)}
                >
                  Fechar
                </button>
              </div>

              <div className="flex max-h-[80vh] items-center justify-center p-3">
                <img
                  src={openImg.src}
                  alt={openImg.alt}
                  className="max-h-[78vh] w-auto max-w-full object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
