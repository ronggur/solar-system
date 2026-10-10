export const meta = {
  name: 'loop-dev-qa',
  description: 'Dev <-> QA loop (max 2 iterations) for Solar System Explorer: one branch, no push/PR/tag',
  phases: [
    { title: 'Dev iter 1', detail: 'implement SPEC on the run branch' },
    { title: 'QA iter 1', detail: 'independent gates, review, negative proof, baseline' },
    { title: 'Dev iter 2', detail: 'fix OPEN findings only' },
    { title: 'QA iter 2', detail: 're-verify FIXED findings and gates' },
  ],
}

// args: { runId, specPath, logPath, branch, baseBranch, baseSha, pwDir, scratchDir, maxIterations }
const A = args
const MAX = A.maxIterations ?? 2
const PLAYBOOK = 'docs/LOOP-DEV-QA.md'
const REFS =
  'docs/ARCHITECTURE.md, docs/TECHNICAL.md, docs/CONTRIBUTING.md, docs/PERFORMANCE_AND_VISUALIZATION.md, docs/INACCURACIES.md'

const COMMON_RULES = `
Aturan keras untuk semua agent di run ini:
- Repo: /Users/ronggur/Works/www/solar-system. Branch kerja HARUS \`${A.branch}\` (cek \`git branch --show-current\`; jangan pindah branch, jangan menulis ke main/${A.baseBranch}).
- DILARANG: git push, membuat tag, gh release/PR, mengubah .github/**, mengubah secrets, git commit --no-verify, git reset --hard/clean pada pekerjaan orang lain, menyentuh profil Chrome pengguna.
- Commit kecil, Conventional Commits (feat|fix|perf|refactor|docs|chore|test), <=72 karakter, Bahasa Inggris, satu tujuan per commit. Jangan squash.
- Kode, komentar, dokumen repo: Bahasa Inggris. LOG.md: Bahasa Inggris.
- Browser: Playwright 1.64.0 + Google Chrome sistem (chromium.launch({ channel: 'chrome' }), headless; terverifikasi memakai GPU Apple M1 lewat ANGLE Metal). Terpasang di ${A.pwDir} (jangan pasang ke repo). Resolusi modul dari skrip di luar folder itu: createRequire(process.env.PW_DIR + '/') lalu require('playwright'); jalankan dengan PW_DIR=${A.pwDir}. Konteks tetap: viewport 1440x900, deviceScaleFactor 1.
- Port: dev server 5174 (\`npm run dev -- --port 5174\`), preview 4174 (\`npx vite preview --port 4174\`). Matikan semua server yang kamu mulai sebelum selesai. Path aplikasi: http://localhost:<port>/solar-system/ (base path!).
- Jangan mengukur performa di dev server (StrictMode); dev server hanya untuk fungsi dan pertumbuhan renderer.info.
- Jangan tulis jawaban panjang di chat; detail ada di LOG.md.
`

const DEV_SCHEMA = {
  type: 'object',
  properties: {
    iteration: { type: 'number' },
    done: { type: 'boolean' },
    notes: { type: 'string' },
  },
  required: ['iteration', 'done', 'notes'],
}

const QA_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    counts: {
      type: 'object',
      properties: {
        blocker: { type: 'number' },
        major: { type: 'number' },
        minor: { type: 'number' },
        nit: { type: 'number' },
      },
      required: ['blocker', 'major', 'minor', 'nit'],
    },
    openIds: { type: 'array', items: { type: 'string' } },
    logPath: { type: 'string' },
  },
  required: ['verdict', 'counts', 'openIds', 'logPath'],
}

function devPrompt(n) {
  const iterSpecific =
    n === 1
      ? `ITERASI 1: kerjakan SEMUA kriteria SPEC yang menjadi tugas Dev (AC-1..AC-5, AC-7..AC-11). AC-6 (bukti negatif) dan AC-12 (baseline) adalah tugas QA; JANGAN mengisi baseline-main.md sendiri.
Urutan: (1) types/hook -> (2) vitest + tests -> (3) scripts/perf-sampler.js -> (4) docs. Setelah hook dan sampler jadi, uji mandiri secukupnya dengan Playwright (dev server 5174: window.__SOLAR_DEBUG__ ada dan info.memory terbaca; preview build: tidak ada) dan tempel ringkasan di LOG.md.
Dependency: hanya \`npm i -D vitest@^4.1\` (Vitest 5 butuh Node>=22.12; CI Node 20). Pastikan package-lock.json hanya berubah karena vitest + tree-nya, dan \`npm audit\` tidak menambah advisory vs baseline di SPEC (18 total / 1 --omit=dev).
Tests: letakkan di luar src/ bila perlu agar \`tsc -b\` dan tsconfig.app.json (types: vite/client) tidak rusak; pastikan lint, build, dan test hijau dan tests tidak masuk dist/. Pertimbangkan inspectAttr plugin (hanya command==='serve') saat Vitest memuat vite.config.ts.
Hook: pasang dari Canvas onCreated di src/App.tsx atau helper kecil di src/lib; dijaga \`import.meta.env.DEV\`; tipe di src/vite-env.d.ts. Tidak mengubah perilaku runtime.
Docs: perbarui semua yang menjadi salah (AC-11) dan tambahkan subbagian "Performance measurement" di docs/TECHNICAL.md yang juga mendokumentasikan hook, \`npm test\`, dan sampler.`
      : `ITERASI ${n}: kerjakan HANYA temuan berstatus OPEN di LOG.md (baca seluruh LOG.md). Per temuan: ubah OPEN -> FIXED, isi kolom Fix (file, commit) dan Regression evidence. JANGAN menandai VERIFIED (hak QA). Bila temuan keliru/tidak dapat direproduksi atau perbaikannya bukan perubahan kode (mis. lingkungan), beri alasan tertulis dan status DISPUTED. Tidak ada refactor di luar temuan.`

  return `Kamu adalah AGENT 1 — DEVELOPER dalam loop Dev<->QA run ${A.runId}.
Baca bagian 0, 0b, dan 2 dari ${PLAYBOOK}, lalu ${REFS}, eslint.config.js, tsconfig.app.json, SPEC (${A.specPath}) dan LOG (${A.logPath}).
${COMMON_RULES}
${iterSpecific}

Gerbang yang WAJIB hijau sebelum selesai: \`npm run lint\`, \`npm run build\` (catat ukuran chunk), \`npm audit --audit-level=moderate\` (bandingkan dengan baseline SPEC; kegagalan pre-existing dicatat, bukan "diperbaiki"), \`npm test\`. Tempel ringkasan hasil dan ukuran chunk di baris iterasi LOG.md (tabel Iteration summary + Metrics), commit perubahan LOG.md sebagai \`docs:\`.
Pastikan working tree bersih (git status --porcelain kosong) saat selesai.
Output akhir: hanya objek terstruktur {iteration:${n}, done, notes} dengan notes <= 3 baris.`
}

function qaPrompt(n) {
  const iterSpecific =
    n === 1
      ? `ITERASI 1 — selain gerbang dan review, kamu WAJIB menyelesaikan:
(a) AC-6 bukti negatif: tiga eksperimen terpisah (id moon ganda; \`texture\` menunjuk file yang tidak ada; angka moons salah di README.md) -> \`npm test\` merah dengan pesan yang menyebut id/file -> pulihkan dengan \`git checkout -- <file>\` -> \`git status --porcelain\` bersih untuk file itu -> \`npm test\` hijau. Tempel potongan output di LOG.md.
(b) AC-12 baseline-main.md (docs/loop/baseline-main.md) sesuai Bagian 4 langkah 5 dan SPEC:
    - Bangun BASE dari git worktree SHA ${A.baseSha} di ${A.scratchDir}/base-worktree (symlink node_modules dari repo; \`npm run build\`; \`vite preview --port 4174\` dari worktree itu). Itu kode yang identik dengan main. Jangan ukur dari working tree cabang run.
    - Skenario (a) overview 1x, (b) satu planet terpilih (mis. Jupiter via Object List) dengan moons+satellites ON dan gerakan DILANJUTKAN (memilih objek menjeda gerak; tekan resume dan verifikasi posisi benar-benar berubah lewat window.__SOLAR_DEBUG__.scene.getObjectByName pada dua waktu), (c) dijeda (idle). Tiap skenario: 3 run, median; 30 s pemanasan + 30 s sampling. Frame time lewat scripts/perf-sampler.js buatan Dev (uji dulu sampler itu sendiri; bila cacat, itu temuan) + long task.
    - renderer.info (geometries, textures, calls, triangles) pada menit 1 dan menit 5 di dev server cabang (5174), skenario (a), 1x; catat pertumbuhan, bukan nilai absolut.
    - Muat awal (preview build BASE, cache dinonaktifkan): jumlah request, total byte transfer, 10 request terbesar; ukuran chunk.
    - Spesifikasi mesin: CPU/GPU, macOS, versi Chrome + Playwright, viewport, DPR, headless, string renderer WebGL (harus GPU asli, bukan SwiftShader/llvmpipe) dan paragraf caveat.
    - Simpan skrip ukurnya di docs/loop/${A.runId}/qa/ (resolusi Playwright lewat PW_DIR) agar angka bisa direproduksi. Satu skenario per panggilan Bash bila perlu agar tidak melebihi timeout; gunakan run_in_background untuk yang panjang.
    - Verifikasi AC-2 di build preview cabang run: window.__SOLAR_DEBUG__ === undefined dan grep dist/ kosong; AC-1 di dev server.
(c) Cek ukuran chunk cabang run vs baseline SPEC (+-1%), \`npm ci\` (di salinan/atau verifikasi lockfile) tidak membawa bump tak terkait.`
      : `ITERASI ${n} — reproduksi ulang setiap temuan berstatus FIXED: VERIFIED bila benar-benar beres, kembalikan OPEN dengan catatan bila tidak. Jalankan ulang semua gerbang. Baseline TIDAK diukur ulang kecuali baseline-main.md belum lengkap atau kode runtime berubah.`

  return `Kamu adalah AGENT 2 — QA / VALIDATOR independen dalam loop Dev<->QA run ${A.runId}. Tugasmu menemukan alasan kerja Dev BELUM layak, bukan membenarkannya.
Baca bagian 0, 0b, dan 4 dari ${PLAYBOOK}, lalu SPEC (${A.specPath}) dan LOG (${A.logPath}). Input yang boleh kamu pakai: SPEC, \`git diff ${A.baseSha}...HEAD\`, LOG, kode, dan hasil perintah/pengukuran yang kamu jalankan sendiri. Jangan mengandalkan klaim Dev.
${COMMON_RULES}
${iterSpecific}

Prosedur wajib (urut): gerbang objektif (lint, build, audit vs baseline, test, kebersihan commit/diff, tidak ada perubahan di .github atau vite.config yang tak dijelaskan) -> kepatuhan SPEC per AC dengan bukti -> review kode (hook: benar-benar dev-only dan aman StrictMode; test: kuat atau hanya "lolos"? cari false-positive, regex yang diam-diam match nol, path alias, test yang tidak gagal saat data rusak; sampler: bocor observer/timer, rAF di tab tersembunyi; vitest config tak masuk dist; lockfile) -> regresi fungsional singkat di browser (halaman memuat, tidak ada console error baru, klik planet/Object List, toggle, Reset View) di 1440x900 -> tulis ke LOG.md.
LOG.md: satu baris tabel per temuan (ID, iterasi, severity, area, lokasi, deskripsi + bukti), isi tabel Metrics, perbarui baris Iteration summary dan bagian NEEDS-MANUAL. Severity sesuai Bagian 4. Hal yang tidak bisa diuji -> NEEDS-MANUAL, bukan PASS.
Commit semua artefak QA (LOG.md, docs/loop/baseline-main.md, docs/loop/${A.runId}/qa/**) dengan commit \`docs:\` terpisah/kecil; kamu tidak mengubah kode fitur atau test (kecuali eksperimen AC-6 yang kamu pulihkan). Working tree harus bersih di akhir.
PASS hanya bila semua gerbang hijau dan tidak ada Blocker/Major OPEN/FIXED/DISPUTED. Baseline INCOMPLETE atau AC tanpa bukti = temuan.
Output akhir: hanya objek terstruktur {verdict, counts, openIds, logPath}.`
}

let status = 'ESCALATED'
let reason = ''
let prevQa = null
const history = []

for (let n = 1; n <= MAX; n++) {
  const devPhase = `Dev iter ${n}`
  const qaPhase = `QA iter ${n}`

  phase(devPhase)
  const dev = await agent(devPrompt(n), { label: `dev-iter-${n}`, phase: devPhase, schema: DEV_SCHEMA })
  if (!dev || !dev.done) {
    reason = `Dev iteration ${n} did not finish`
    history.push({ iteration: n, dev, qa: null })
    break
  }

  phase(qaPhase)
  const qa = await agent(qaPrompt(n), { label: `qa-iter-${n}`, phase: qaPhase, schema: QA_SCHEMA })
  history.push({ iteration: n, dev, qa })
  if (!qa) {
    reason = `QA iteration ${n} returned no result`
    break
  }
  if (qa.verdict === 'PASS') {
    status = 'PASSED'
    break
  }
  if (n === MAX) {
    reason = `QA FAIL after final iteration (${qa.openIds.length} open: ${qa.openIds.join(', ')})`
    break
  }
  if (prevQa) {
    const same =
      qa.openIds.length === prevQa.openIds.length && qa.openIds.every((id) => prevQa.openIds.includes(id))
    const noProgress = qa.counts.blocker + qa.counts.major >= prevQa.counts.blocker + prevQa.counts.major
    if (same || noProgress) {
      reason = 'stagnation: same open IDs or Blocker+Major did not decrease'
      break
    }
  }
  prevQa = qa
  log(`QA iter ${n} FAIL: open ${qa.openIds.join(', ')}; starting iteration ${n + 1}`)
}

log(`Workflow ${status}${reason ? ': ' + reason : ''}`)
return { runId: A.runId, status, reason, history, logPath: A.logPath }
