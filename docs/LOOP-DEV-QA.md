# Loop Dev ↔ QA — Solar System Explorer

Dokumen ini adalah instruksi untuk loop dua agent: **Agent 1 (Dev)** membangun, **Agent 2 (QA)** memvalidasi secara independen. Maksimal **2 iterasi**. Semua temuan dan perbaikan dicatat di satu file log `.md`.

Project ini adalah **SPA statis** (React 19 + React Three Fiber + Vite, tanpa backend, tanpa Firebase). Satu repo, satu branch, satu PR per run. Tidak ada test runner saat ini, jadi gerbang objektif = `lint` + `build` + budget ukuran + pengukuran runtime (lihat Bagian 0b dan 4).

**Cara pakai:** buka Claude Code di `/Users/ronggur/Works/www/solar-system`. Sesi utama bertindak sebagai **orchestrator**: ia menyiapkan SPEC, meminta konfirmasi, lalu menjalankan iterasi Dev↔QA lewat **Workflow** (Bagian 6). Bagian 2–5 dibaca oleh agent masing-masing (skrip workflow menyertakan path dokumen ini ke prompt mereka).

Dokumen acuan yang harus ada di konteks agent: [ARCHITECTURE.md](ARCHITECTURE.md), [TECHNICAL.md](TECHNICAL.md), [CONTRIBUTING.md](CONTRIBUTING.md), [PERFORMANCE_AND_VISUALIZATION.md](PERFORMANCE_AND_VISUALIZATION.md) (sumber backlog performa/visual), [INACCURACIES.md](INACCURACIES.md) (data astronomi).

---

## 0. Prinsip desain loop

| Prinsip | Alasan |
|---|---|
| **Scope per run dibatasi (1 fase/fitur kecil)** | Backlog performa+visual (fase A–D) × 2 iterasi dalam satu run akan melebihi konteks dan menurunkan kualitas. Satu run = satu fase atau satu fitur vertikal (Bagian 7). |
| **QA tidak boleh membaca ringkasan/klaim Dev** | QA hanya menerima: SPEC, diff, dan hasil perintah/pengukuran yang ia jalankan sendiri. Agen yang diberi hipotesis cenderung mengonfirmasinya. |
| **Gerbang objektif dulu, penilaian subjektif belakangan** | `lint` + `build` + budget ukuran harus hijau sebelum QA mereview logika/visual. Gagal gerbang = langsung kembali ke Dev. |
| **Ukur, jangan percaya** | Klaim performa ("lebih cepat", "tidak bocor") hanya valid bila ada angka sebelum/sesudah dari protokol yang sama (Bagian 4, langkah 5). Baseline diambil **sebelum** Dev mengubah apa pun. |
| **Setiap bug/perf fix wajib punya bukti regresi** | Setelah Run 0: unit test (Vitest) untuk logika murni atau test integritas data. Untuk perilaku render/visual: langkah reproduksi + metrik sebelum/sesudah di `LOG.md`. Fix tanpa bukti = ditolak QA. |
| **Jujur soal yang tidak bisa diuji** | Perangkat mobile nyata, Safari/Firefox, layar 120 Hz, tekanan memori GPU tidak bisa dijangkau agent. QA menandai `NEEDS-MANUAL`, bukan `PASS`. |
| **Berhenti dengan tegas** | Akhir iterasi 2 dengan temuan Blocker/Major terbuka → loop berhenti dan melapor ke manusia. Tidak ada iterasi ke-3 diam-diam. |
| **Satu branch + satu PR, banyak commit** | Seluruh run (semua iterasi) di **satu branch** dari `main`. Commit kecil dan berurutan, **tidak di-squash** oleh loop. Judul PR Conventional Commits. |
| **Satu sesi per run; keadaan ada di file, bukan di chat** | Keadaan penting harus ada di `SPEC.md`, `LOG.md`, docs, dan git, sehingga sesi baru tidak kehilangan apa-apa. Jangan `/clear` di tengah run. Bila berhenti di tengah run, perbarui `LOG.md` lalu lanjutkan di sesi baru ("lanjutkan run `<RUN_ID>`"). Satu pemanggilan Workflow = satu run. |
| **Tidak ada aksi keluar tanpa persetujuan** | Selama loop: tidak `git push`, tidak merge, tidak membuat tag/GitHub Release (**publish release memicu `deploy.yml` ke server produksi Vultr**), tidak mengubah `.github/workflows` atau secrets kecuali ada di scope. PR dibuka orchestrator **setelah laporan akhir dan konfirmasi pemilik**. |

---

## 0b. Lingkungan uji (browser, tanpa perangkat khusus)

Tidak ada emulator/perangkat yang wajib. QA menjalankan app di browser Chrome lewat tool `mcp__claude-in-chrome__*` (tool ini *deferred* — muat dengan `ToolSearch`, mulai dengan `tabs_context_mcp`, buka **tab baru**, jangan memakai tab milik pengguna, hindari memicu `alert`/dialog modal).

- **Prasyarat:** Node ≥ 20.19 (syarat Vite 7), `npm ci`.
- **Dev server:** `npm run dev -- --port 5174` → `http://localhost:5174/solar-system/` (perhatikan **base path** `/solar-system/`). Gunakan port selain 5173 agar tidak bentrok dengan server milik pengguna; matikan setelah selesai.
- **Build produksi:** `npm run build && npx vite preview --port 4174` → `http://localhost:4174/solar-system/`. Verifikasi base path, chunk, dan aset di sini.
- **Jangan ukur performa di dev server.** `StrictMode` menggandakan render/effect dan plugin `inspectAttr` menambah atribut debug. Dev server hanya untuk validasi fungsional dan perbandingan *pertumbuhan* (mis. jumlah geometri), bukan frame time.
- **Alternatif bila ekstensi Chrome tidak tersambung:** Playwright (`chromium.launch({ channel: 'chrome' })`, headless memakai GPU sungguhan di macOS) dipasang di direktori scratch di luar repo; viewport 1440×900, `deviceScaleFactor: 1`. Skrip ukur disimpan di `docs/loop/<RUN_ID>/qa/` dan angkanya hanya sebanding dengan angka dari alat yang sama (catat alat + versi di baseline). Run 0 (`20261010-qa-infra`) memakai jalur ini.
- **Alat QA di browser:** `read_console_messages` (gunakan `pattern`, mis. `error|warn|THREE`), `read_network_requests` (cari 404 / aset ganda), `javascript_tool` (sampling `requestAnimationFrame`, `PerformanceObserver` untuk long task, membaca hook debug), screenshot, `resize_window` untuk 1440×900, 768×1024, 360×800.
- **Hook debug (prasyarat Run 0):** Dev menambahkan `window.__SOLAR_DEBUG__ = { info: gl.info, … }` yang **hanya aktif bila `import.meta.env.DEV`** (hilang dari build produksi). QA memverifikasi hook ini tidak ada di build `preview`.
- **Angka performa** dicatat bersama spesifikasi mesin (CPU/GPU, browser, resolusi, DPR) dan hanya dibandingkan terhadap baseline di **mesin dan viewport yang sama**.
- Tidak ada perangkat mobile terhubung → semua klaim "ringan di mobile" = `NEEDS-MANUAL`; emulasi viewport hanya menguji layout.
- Jangan mengubah file besar di `public/` (texture, GLB) secara manual; gunakan skrip di `scripts/` (lihat TECHNICAL.md) dan catat sebelum/sesudah ukurannya.

---

## 1. Prompt Orchestrator (tempel ini di sesi utama)

```text
Kamu adalah ORCHESTRATOR loop Dev↔QA untuk repo Solar System Explorer. Ikuti
docs/LOOP-DEV-QA.md secara ketat.

SCOPE run ini:
  <isi, mis. "Fase A performa: hilangkan setState per-frame, trail ring buffer,
   registry parent (docs/PERFORMANCE_AND_VISUALIZATION.md P1–P3)">
DESIGN: <path ke design-<fitur>.md / mockup, atau "belum ada — Dev boleh mendesain">
RUN_ID: <yyyymmdd-slug, mis. 20261010-perf-render-loop>
BASE: <branch dasar, default "main"; pakai branch docs bila docs/ belum di-merge ke main>

Saya SECARA EKSPLISIT meminta penggunaan Workflow (orkestrasi multi-agent) untuk
iterasi Dev↔QA di run ini. Muat skill `workflow-authoring` sebelum menulis skrip.

Langkah:
1. Persiapan (kamu sendiri, tanpa subagent):
   a. Baca docs/ARCHITECTURE.md, TECHNICAL.md, CONTRIBUTING.md, dan bagian yang
      relevan di PERFORMANCE_AND_VISUALIZATION.md. Baca eslint.config.js.
   b. Pastikan working tree bersih. Buat branch <type>/<slug> (mis.
      perf/render-loop) dari BASE. Jangan mengerjakan apa pun di BASE/main.
   c. Catat BASELINE di BASE: hasil `npm run lint`, `npm run build` (ukuran chunk),
      dan — bila scope menyentuh performa — metrik runtime sesuai protokol Bagian 4
      langkah 5. Kegagalan yang sudah ada di main dicatat sebagai "pre-existing".
   d. Tulis SPEC.md di docs/loop/<RUN_ID>/ (format Bagian 3) dan LOG.md dari
      template (Bagian 5). Tambahkan `docs/loop/*/shots/` ke .gitignore bila belum.
   e. Tampilkan SPEC ringkas dan MINTA KONFIRMASI saya — hanya sekali. Jangan
      mulai iterasi sebelum saya setuju.
2. Jalankan Workflow `loop-dev-qa` (Bagian 6) dengan runId, specPath, logPath,
   maxIterations=2. Jangan mengerjakan iterasi sendiri di sesi utama.
3. Setelah Workflow selesai, baca LOG.md dan buat laporan akhir ke saya (≤ 25
   baris): status (PASSED/ESCALATED), ringkasan perubahan, tabel metrik
   baseline vs akhir, temuan OPEN/DEFERRED, daftar NEEDS-MANUAL (langkah uji),
   nama branch. Siapkan draf judul + deskripsi PR.
   JANGAN push/PR/merge/tag/release sebelum saya konfirmasi.
```

---

## 1b. Perintah mulai (siap tempel) — Run 0

**Prasyarat sebelum membuka sesi baru**

- [ ] `git status` bersih, dan branch yang sedang aktif memuat folder `docs/` ini (branch docs, atau `main` bila docs sudah di-merge). Isi `BASE` di prompt dengan branch tersebut.
- [ ] Chrome terbuka dengan ekstensi **Claude in Chrome** terhubung (dipakai QA untuk screenshot, console, network, sampling frame).
- [ ] Port **5174** dan **4174** bebas; `npm ci` sudah dijalankan (Node ≥ 20.19).
- [ ] Anda setuju: tidak ada push, tag, atau GitHub Release selama run (release memicu deploy produksi).

**Mulai sesi**

```bash
cd /Users/ronggur/Works/www/solar-system
git status && git branch --show-current   # pastikan bersih & branch yang benar
claude
```

**Tempel di sesi baru:**

```text
Kamu adalah ORCHESTRATOR loop Dev↔QA untuk repo Solar System Explorer.
Baca docs/LOOP-DEV-QA.md sampai selesai, lalu ikuti Bagian 1 (Prompt Orchestrator)
secara ketat untuk Langkah 1–3. Gunakan Workflow untuk iterasi (Bagian 6).

SCOPE run ini:
  Run 0 — infrastruktur QA. TANPA mengubah perilaku runtime produksi.
  - Hook debug dev-only `window.__SOLAR_DEBUG__` (gl.info, dsb.), aktif hanya
    bila import.meta.env.DEV; harus tidak ada di hasil `npm run build`.
  - Vitest sebagai devDependency + skrip `npm test`. Test integritas data:
    id unik per koleksi; `parentPlanet` valid (planet id, 'sun', atau 'moon'
    khusus satelit); file texture/GLB/gambar yang dirujuk data ada di public/;
    orbitDistance > radius parent + radius objek (moons & satelit berorbit
    planet); jumlah moons/spacecraft yang disebut di README.md dan index.html
    sama dengan panjang array data.
  - `scripts/perf-sampler.js`: snippet browser (ditempel via javascript_tool)
    untuk sampling rAF → p50/p95/frames>33ms + long task; dokumentasikan di
    docs/TECHNICAL.md.
  - QA mencatat BASELINE performa `main` ke docs/loop/baseline-main.md sesuai
    protokol Bagian 4 langkah 5 (3 skenario × 3 kali, median; renderer.info
    menit 1 & 5; byte/request muat awal; ukuran chunk; spesifikasi mesin).
  Di luar scope: perubahan komponen 3D/UI, perubahan .github/workflows (usul
  menambah `npm test` ke quality.yml dicatat sebagai DEFERRED untuk pemilik).
DESIGN: tidak relevan (tanpa perubahan UI)
RUN_ID: 20261010-qa-infra
BASE: <isi: main, atau nama branch docs saat ini>

Kriteria penerimaan minimum untuk SPEC: (1) hook ada di dev & tidak ada di
dist/; (2) `npm test` hijau pada data saat ini, dan QA membuktikan test benar-
benar gagal bila data sengaja dirusak (mis. id ganda) lalu mengembalikannya;
(3) lint + build hijau, ukuran chunk tidak berubah >1%, `npm audit` bersih;
(4) baseline-main.md lengkap. Tampilkan SPEC ringkas dan minta konfirmasi saya
sekali sebelum menjalankan Workflow. JANGAN push/PR/merge/tag/release.
```

**Run berikutnya** (setelah Run 0 lolos dan PR-nya di-merge): ganti `SCOPE`, `RUN_ID`, `BASE=main` sesuai tabel Bagian 7. Untuk Run 1 (Fase A), scope-nya: _"P1, P2, P3 dari docs/PERFORMANCE_AND_VISUALIZATION.md: hilangkan setState per-frame di Planet/Moon/Satellite, memoisasi + dispose orbit line, trail ring buffer berbasis jarak busur, registry parent menggantikan getObjectByName per-frame, objek scratch; tanpa perubahan visual"_ dengan `RUN_ID: 20261010-perf-render-loop`.

---

## 2. Instruksi Agent 1 — Developer

**Peran:** implementer. Mengerjakan item SPEC; pada iterasi ≥2 hanya memperbaiki temuan yang `OPEN` di `LOG.md`.

**Wajib sebelum menulis kode**
1. Baca `docs/ARCHITECTURE.md`, `docs/TECHNICAL.md`, `docs/CONTRIBUTING.md`, `eslint.config.js`, dan `tsconfig.app.json` (mode `strict`, `noUnusedLocals`, `noUnusedParameters`). Pola komponen yang ada (`Planet`, `Moon`, `Satellite`, panel `*Info`) adalah acuan gaya.
2. Baca `SPEC.md` dan (iterasi ≥2) seluruh `LOG.md`.
3. Urutan kerja: **(1) `src/types` + `src/data` → (2) `src/lib` → (3) komponen 3D (`Planet/Moon/Satellite/Sun/SolarSystem`) → (4) UI (`ControlPanel`, `ObjectList`, panel info, `Header`) → (5) docs yang ikut berubah** (jumlah objek, README, TECHNICAL, ARCHITECTURE).

**Aturan kode**
- TypeScript strict, alias `@/`, tidak ada `any` baru, tidak ada `console.log` tersisa, `eslint-disable` harus disertai alasan.
- **Loop render (`useFrame`):** kode baru tidak boleh memanggil `setState` per frame, tidak boleh membuat `new Vector3/Line/Material/BufferAttribute` per frame, dan tidak boleh memakai `scene.getObjectByName` per frame. Pakai `useRef`, objek scratch yang dipakai ulang, dan `useMemo`.
- **Siklus hidup resource:** geometri, material, dan texture yang dibuat manual harus di-`dispose` saat unmount/toggle. Perhatikan `StrictMode` (effect berjalan dua kali di dev).
- Gerakan harus **frame-rate independent** (skala dengan `delta`).
- URL aset memakai `import.meta.env.BASE_URL` (base `/solar-system/`); jangan hardcode path absolut. Aset di `public/` berikut konvensi path di TECHNICAL.md.
- Dependency baru wajib dibenarkan di LOG dan lolos `npm audit --audit-level=moderate`. Tidak mengubah `.github/workflows` atau `vite.config.ts` di luar scope. Tidak ada secret di commit.
- Kode, komentar, UI copy, dan commit memakai **Bahasa Inggris** (seperti seluruh repo).

**Aturan desain UI/visual**
- Jika ada mockup/`design-*.md` → implementasikan se-presisi mungkin.
- **Standar kualitas: UI/UX terbaik, bukan sekadar "jalan".** Sebelum mendesain, muat dan ikuti skill desain yang tersedia (`hallmark` agar tidak generik, `design:ux-copy`, `design:accessibility-review`) dan lakukan swa-kritik (`design:design-critique`) sebelum menyerahkan ke QA.
- Jika belum ada desain → **boleh mendesain sendiri**, dengan syarat: (a) pakai token yang ada (variabel CSS HSL di `src/index.css`, tema Tailwind, komponen shadcn di `src/components/ui`, gaya panel kaca `bg-black/60 backdrop-blur-xl border-white/10 rounded-2xl`, ikon `lucide-react`), (b) konsisten dengan panel tetangga (Controls, Objects, panel Info), (c) tulis spec singkat `docs/loop/<RUN_ID>/design-<fitur>.md`: perilaku, parameter (warna/ukuran/kapan tampil), **anggaran performa** (draw call, segmen geometri, ukuran texture), fallback bila texture/GLB gagal dimuat, perilaku di layar sempit, aksesibilitas.
- Setiap elemen UI wajib menangani state: **loading, kosong (mis. "No objects found"), error/fallback, berisi**. Tombol ikon wajib punya `aria-label`; target sentuh ≥ 44 px; kontras memadai; handler keyboard global harus mengabaikan elemen editable; animasi menghormati `prefers-reduced-motion`.
- Teks UI Bahasa Inggris, singkat, ramah, tanpa jargon.

**Perubahan data astronomi:** cantumkan sumber (NASA/ESA/IAU/JPL) di `LOG.md`; perbarui jumlah objek di README/docs bila berubah (lihat daftar "keep in sync" di TECHNICAL.md).

**Gerbang yang harus hijau sebelum menyerahkan ke QA** (jalankan sendiri, tempel ringkasan di `LOG.md`)
- `npm run lint`
- `npm run build` (menjalankan `tsc -b` + `vite build`; catat ukuran chunk)
- `npm audit --audit-level=moderate` bila `package.json`/lockfile berubah
- `npm test` bila skrip itu sudah ada (setelah Run 0)

**Pada iterasi ≥2**
- Per temuan: ubah status `OPEN → FIXED`, isi *Fix* (apa yang diubah, file, commit) dan *Bukti* (test/metrik sesudah). Jangan menandai `VERIFIED` — itu hak QA.
- Jangan mengerjakan hal di luar temuan (tidak ada refactor liar). Bila temuan keliru/tidak bisa direproduksi, beri alasan tertulis, status `DISPUTED` (QA memutuskan).

**Commit:** kecil dan sering, Conventional Commits (`feat|fix|perf|refactor|docs|chore|test`), ≤72 karakter, satu tujuan per commit, di branch fitur (tidak pernah di `main`). Tidak push.

**Output ke orchestrator:** hanya "selesai iterasi N" + path `LOG.md`. Detail ada di log, bukan di chat.

---

## 3. SPEC.md — format acceptance criteria

Ditulis orchestrator sebelum iterasi 1; menjadi kontrak bagi Dev **dan** QA. Tulis dalam Bahasa Inggris (file ini ikut di-commit ke repo publik).

```markdown
# SPEC — <RUN_ID>
## Goal
## Out of scope
## Baseline (measured on main, <machine/browser/viewport>)
| Metric | Value |
|---|---|
| lint / build | green / green (pre-existing failures: …) |
| Bundle: index / vendor-three / vendor-react / css (kB) | 278 / 976 / 193 / 32 |
| renderer.info after 5 min idle (geometries/textures/calls) | … |
| Frame time p50 / p95 (overview, 30 s, preview build) | … |
## Acceptance criteria (testable)
- AC-1: No per-frame React state updates in Planet/Moon/Satellite (React Profiler: 0 commits/s at idle).
- AC-2: `renderer.info.memory.geometries` is flat (±0) between minute 1 and minute 5 at 1x speed.
- AC-3: Orbital angular speed per second unchanged vs baseline (±1%) at 1x/5x/10x.
- AC-4: Bundle size within +2% of baseline; lint and build green.
## Data / scene changes (files, ids, counts)
## Design (path to design-<feature>.md, or "Dev designs → design-<feature>.md")
## Performance budget (draw calls, texture sizes, JS size)
## Needs real device / other browser (NEEDS-MANUAL)
```

---

## 4. Instruksi Agent 2 — QA / Validator

**Peran:** auditor independen dan skeptis. Tugas: **menemukan alasan kerja Dev belum layak**, bukan membenarkannya. Tidak menulis kode fitur; hanya boleh menulis **test/skrip reproduksi** bila membantu membuktikan bug (tandai sebagai menunggu fix, atau lampirkan langkah reproduksi).

**Input yang boleh dibaca:** `SPEC.md`, `design-*.md`, `git diff main...HEAD`, `LOG.md`, kode. **Dilarang** mengandalkan klaim "sudah beres" dari Dev — verifikasi sendiri.

**Prosedur (urut; berhenti ke Dev bila langkah 1 gagal)**

1. **Gerbang objektif** — jalankan sendiri dan catat output ringkas:
   - `npm run lint`, `npm run build`, `npm audit --audit-level=moderate` (bila dependency berubah), `npm test` (bila ada).
   - **Budget ukuran:** bandingkan chunk dengan baseline di SPEC. Kenaikan >5% tanpa alasan tertulis = Major.
   - **Kebersihan:** tidak ada secret, `console.log` tersisa, commit ke `main`, file `public/` besar yang tidak dijelaskan, perubahan di `.github/` di luar scope; commit sesuai Conventional Commits dan Bahasa Inggris; tidak ada test/aturan lint yang dimatikan tanpa alasan.
2. **Kepatuhan SPEC** — telusuri tiap AC satu per satu: kode + bukti (test/metrik/screenshot). AC tanpa bukti = temuan.
3. **Review kode**
   - **Loop render:** `setState`/alokasi/`getObjectByName` di dalam `useFrame`; objek Three yang dibuat di render tanpa `useMemo`; `dispose` yang hilang; dependency effect; aman terhadap `StrictMode`.
   - **Kebenaran scene:** nama objek konsisten (`planet-<id>`, `moon-<id>`, `satellite-<id>`, `moon-moon`); `orbitDistance` > radius parent + radius objek (cegah z-fighting/tembus); belt tidak menutupi objek; skala frame-rate independent.
   - **State machine:** seleksi planet/satelit/bulan saling eksklusif; semantik pause (`isPaused`, interaksi kamera, objek terpilih, `resumeWhileSelected`); guard `isTransitioning` tidak deadlock; reset kamera; mode follow.
   - **Loading & aset:** path memakai `BASE_URL`; tidak ada 404; fallback Suspense berfungsi saat texture/GLB gagal; GLB tetap ditangguhkan (idle) dan Loader hanya muncul sekali; tidak ada kerja sinkron >50 ms di main thread saat startup.
   - **Integritas data:** `id` unik, `parentPlanet` valid, file texture/GLB/gambar ada, jumlah di README/docs/`index.html` sinkron, fakta sesuai sumber (INACCURACIES.md).
   - **Supply chain & keamanan:** dependency baru, `npm audit`, tautan eksternal `rel="noopener noreferrer"`, tidak ada `dangerouslySetInnerHTML`/eval, workflow deploy tidak berubah tanpa alasan.
4. **Validasi UI vs desain** (bila ada perubahan tampilan; untuk yang didesain Dev, nilai juga kualitas UX dengan skill `design:design-critique` dan `design:accessibility-review`):
   - Jalankan di browser (Bagian 0b) pada 1440×900, 768×1024, 360×800. Periksa state loading/kosong/fallback/berisi, keyboard (Space, ←/→, ↑/↓, Tab), fokus, kontras, teks, dan **console tanpa error/warning baru**. Screenshot ke `docs/loop/<RUN_ID>/shots/iter<N>/`.
   - Bila sesuatu tidak bisa dijalankan, nyatakan eksplisit dan nilai via review kode — jangan mengaku sudah melihat layar yang tidak pernah dijalankan.
5. **Pengukuran performa** (wajib bila scope menyentuh render/aset/bundle). Protokol tetap agar angka sebanding dengan baseline:
   - Mesin, browser, viewport, DPR sama dengan baseline; build `preview`; tab lain tertutup; 30 s pemanasan lalu 30 s sampling.
   - **Frame time:** sampling `requestAnimationFrame` via `javascript_tool` → p50/p95 dan jumlah frame >33 ms; **long task** via `PerformanceObserver`. Ulangi 3×, ambil median. Skenario: (a) overview 1x, (b) objek terpilih + moons/satellites ON, (c) di-pause (idle).
   - **Memori/objek:** di dev server baca `__SOLAR_DEBUG__.info.memory` (`geometries`, `textures`) dan `render.calls/triangles` pada menit 1 dan 5. Pertumbuhan monoton = kebocoran (Blocker/Major).
   - **Muat awal:** total byte dan jumlah request dari `read_network_requests` pada first load; bandingkan dengan baseline (target jejak awal v1.6.0 ≈ 3,5 MB).
   - Regresi >10% pada p95 frame time atau kenaikan jejak memuat tanpa alasan = Major.
6. **Uji regresi fungsional** — alur berdekatan tetap jalan: klik planet/bulan/satelit, pilih dari Object List (search, filter kategori, All/None, ↑/↓), Sun, Reset View, Follow Object, toggle Orbits/Satellites/Moons, slider kecepatan, panel info (tutup, "Continue Exploring"), dialog bantuan. Tidak ada test/aturan lama yang dihapus/dimatikan tanpa alasan.
7. **Tulis hasil ke `LOG.md`** — setiap temuan satu baris tabel (ID, severity, area, lokasi, deskripsi + langkah reproduksi/bukti) dan isi tabel metrik. Untuk temuan iterasi sebelumnya yang sudah `FIXED`: reproduksi ulang → `VERIFIED` atau kembalikan `OPEN` dengan catatan mengapa gagal. Hal yang tak bisa diuji di sini → `NEEDS-MANUAL` dengan langkah uji.

**Severity**

| Level | Arti | Boleh lolos? |
|---|---|---|
| **Blocker** | Layar kosong/crash, WebGL context hilang, kebocoran resource yang tumbuh tanpa batas, lint/build merah, AC inti tidak jalan, aset 404 di build produksi | Tidak |
| **Major** | Perilaku salah (seleksi, pause, kamera), regresi performa/ukuran signifikan, visual jelas menyimpang dari desain, logika kritis tanpa bukti regresi, data astronomi salah | Tidak |
| **Minor** | Polesan visual kecil, copy, naming, aksesibilitas non-kritis | Boleh `DEFERRED` dengan catatan |
| **Nit** | Preferensi gaya | Dicatat saja |

**Kriteria PASS iterasi:** semua gerbang hijau **dan** tidak ada Blocker/Major dengan status `OPEN`/`FIXED`/`DISPUTED` (semua `VERIFIED`/`DEFERRED`).

**Output ke orchestrator:** `PASS` atau `FAIL` + jumlah temuan per severity + ID temuan OPEN + path `LOG.md`. Selebihnya ada di log.

---

## 5. Template `LOG.md` (`docs/loop/<RUN_ID>/LOG.md`)

```markdown
# Loop Log — <RUN_ID>
Scope: …  ·  Branch: <type>/<slug>  ·  Started: <date>  ·  Machine: <CPU/GPU, browser, viewport, DPR>

## Status: IN_PROGRESS | PASSED | ESCALATED   (current iteration: N/2)

## Iteration summary
| Iter | Dev completed | Gates (lint/build/audit/test) | QA verdict | New findings | Verified |
|---|---|---|---|---|---|
| 1 | … | ✅/❌ | FAIL | 5 | 0 |

## Metrics (same protocol every time)
| Metric | Baseline (main) | Iter 1 | Iter 2 |
|---|---|---|---|
| Bundle index / vendor-three / css (kB) | 278 / 976 / 32 | | |
| First load: requests / bytes | | | |
| Frame time p50 / p95 (ms), overview | | | |
| geometries @1min → @5min | | | |

## Findings
Status: OPEN → FIXED (Dev) → VERIFIED (QA) | DISPUTED | DEFERRED | NEEDS-MANUAL
Area: 3d | ui | data | build | perf | a11y | docs

| ID | Iter | Sev | Area | Location | Finding & repro/evidence | Status | Fix (file/commit) | Regression evidence |
|---|---|---|---|---|---|---|---|---|
| P-001 | 1 | Major | perf | Planet.tsx:342 | `setAngle` still called per frame → 60 commits/s in Profiler | VERIFIED | angle moved to ref, `abc123` | Profiler: 0 commits/s; geometries flat |
| V-001 | 1 | Minor | ui | ObjectList.tsx | Filter toggle lacks `aria-label` | DEFERRED | — | — |

## NEEDS-MANUAL (real device / other browsers)
- [ ] Step, expected result (e.g. "iPhone Safari: select Saturn, rings render, no jank")

## Decisions & notes
- Dev DISPUTED P-00x: reason … → QA ruling: …

## Merge notes
- Docs updated: …  ·  Counts changed: …  ·  Release/tag: not created (needs owner approval)
```

---

## 6. Eksekusi sebagai Workflow

Project ini dikerjakan dengan **Workflow agent**: satu pemanggilan = satu run. Pembagian peran:

| Tahap | Dilakukan oleh | Catatan |
|---|---|---|
| Persiapan, SPEC, baseline, **konfirmasi pemilik** | Sesi utama (orchestrator) | Tidak bisa dalam Workflow karena butuh konfirmasi manusia. |
| Iterasi 1..2 (Dev → QA) | **Workflow `loop-dev-qa`** | Berjalan di latar belakang; bisa dipantau lewat `/workflows`. |
| Laporan akhir, draf PR, push/PR setelah konfirmasi | Sesi utama | Workflow tidak pernah push. |

**Kontrak skrip** (ditulis orchestrator saat run dimulai; salinannya disimpan di `docs/loop/<RUN_ID>/workflow.js` untuk audit):

- **Args:** `{ runId, specPath, logPath, branch, maxIterations: 2 }`.
- **Fase per iterasi N:** `Dev iter N` → `QA iter N`. Berurutan, **tidak paralel** (satu working tree, satu `LOG.md`).
- **Konteks segar:** setiap `agent()` adalah panggilan baru. QA **tidak** menerima keluaran Dev, hanya path `SPEC.md`, `LOG.md`, dan instruksi Bagian 4.
- **Prompt agent:** menyuruh agent membaca bagian terkait dokumen ini (Bagian 2 untuk Dev, Bagian 4 untuk QA) dan acuan di bagian atas, bukan menyalin isinya ke skrip.
- **Keluaran terstruktur (schema):** Dev → `{ iteration, done, notes }`; QA → `{ verdict: 'PASS'|'FAIL', counts: { blocker, major, minor, nit }, openIds: string[], logPath }`.
- **Kontrol alur:** berhenti `PASSED` bila QA `PASS`; `ESCALATED` bila iterasi 2 masih FAIL; **eskalasi lebih awal** bila `openIds` iterasi N sama dengan iterasi N-1 (stagnasi) atau jumlah Blocker+Major tidak turun.
- **Anggaran agent:** 2 Dev + 2 QA = 4 agent per run. Opsional (bila scope besar): QA memecah review menjadi spesialis *read-only* (kode, UI/a11y, performa) yang mengembalikan temuan terstruktur ke satu agent QA agregator yang satu-satunya menulis `LOG.md` — hindari beberapa agent menulis log bersamaan.
- **Larangan di dalam skrip:** `git push`, tag, `gh release`, perubahan `.github/`, menulis ke `main`.
- **Lanjut bila terputus:** gunakan `resumeFromRunId` (hasil `agent()` yang prompt/opsinya tidak berubah di-cache), setelah menghentikan run lama.

---

## 7. Backlog run yang disarankan

Sumber: [PERFORMANCE_AND_VISUALIZATION.md](PERFORMANCE_AND_VISUALIZATION.md). Satu run = satu baris.

| Run | RUN_ID contoh | Scope | Catatan |
|---|---|---|---|
| **0** | `20261010-qa-infra` | Hook debug dev-only (`__SOLAR_DEBUG__`), Vitest + `npm test` + test integritas data (id unik, `parentPlanet` valid, file aset ada, `orbitDistance` > radius parent+objek, jumlah objek di README/`index.html` = panjang array data), snippet sampling frame time di `scripts/perf-sampler.js`, **baseline performa `main` tercatat** di `docs/loop/baseline-main.md` | Prasyarat agar "bukti regresi" bisa otomatis. Tidak mengubah perilaku runtime produksi. |
| **1** | `…-perf-render-loop` | Fase A: P1, P2, P3 (ref, memoized lines, trail ring buffer, parent registry) | Dampak performa terbesar; tanpa perubahan visual. |
| **2** | `…-perf-idle-labels` | Fase B: P4 label LOD, P5 demand render + DPR adaptif, P6 tekstur bulan prosedural | Ukur ulang CPU/DOM dan memori GPU. |
| **3** | `…-visual-core` | Fase C: V1 Sun glow, V2 Earth shader + atmosfer, V3 target klik, V4 toggle orbit, V5 follow | Dev boleh mendesain → `design-*.md`; wajib anggaran draw call. |
| **4** | `…-polish-mobile` | Fase D: P7 texture/KTX2, P8, V6 tilt, V7 reticle, V8 layout mobile | Banyak `NEEDS-MANUAL` (perangkat nyata). |
| **5** | `…-data-accuracy` | Verifikasi fakta basi (INACCURACIES.md "Known candidates"), sinkron jumlah objek di `index.html`/README | Wajib sumber resmi per perubahan. |

---

## 8. Batasan yang perlu kamu ketahui

- QA berbasis agent tidak menggantikan uji di perangkat mobile nyata, Safari, Firefox, atau layar 120 Hz (gerakan planet/Sun saat ini belum diskala `delta`, jadi bergantung refresh rate).
- Tidak ada test runner saat ini; sebelum Run 0, bukti regresi untuk perilaku render berupa langkah reproduksi + metrik, bukan test otomatis.
- Angka performa sangat bergantung mesin; hanya bandingkan di mesin/viewport yang sama dengan baseline. Frame time di browser yang dikendalikan automation bisa lebih berisik — gunakan median 3 kali dan toleransi 10%.
- Validasi "sesuai desain" paling andal bila ada mockup; tanpa mockup, acuannya `design-<fitur>.md` buatan Dev + token yang ada, sehingga lebih lemah — sebaiknya kamu tinjau hasil desain Dev sekali.
- Run penuh (4+ agent, build berulang, sampling browser) memakan token besar; mulai dengan scope kecil (Run 0 atau Run 1).
