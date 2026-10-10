export const meta = {
  name: 'loop-dev-qa',
  description: 'Dev <-> QA loop (max 2 iterations), Run 1 perf render loop (P1-P3): one branch, no push/PR/tag',
  phases: [
    { title: 'Dev iter 1', detail: 'implement P1-P3 per SPEC on the run branch' },
    { title: 'QA iter 1', detail: 'gates, AC-1..AC-7 measurements, code review, functional pass' },
    { title: 'Dev iter 2', detail: 'fix OPEN findings only' },
    { title: 'QA iter 2', detail: 're-verify FIXED findings and gates' },
  ],
}

// args: { runId, specPath, logPath, branch, baseBranch, baseSha, baseDir, pwDir, scratchDir, maxIterations }
const A = args
const MAX = A.maxIterations ?? 2
const PLAYBOOK = 'docs/LOOP-DEV-QA.md'
const REFS =
  'docs/ARCHITECTURE.md, docs/TECHNICAL.md, docs/CONTRIBUTING.md, docs/PERFORMANCE_AND_VISUALIZATION.md'
const QA_DIR = `docs/loop/${A.runId}/qa`

const COMMON_RULES = `
Aturan keras untuk semua agent di run ini:
- Repo: /Users/ronggur/Works/www/solar-system. Branch kerja HARUS \`${A.branch}\` (cek \`git branch --show-current\`; jangan pindah branch, jangan menulis ke ${A.baseBranch}).
- DILARANG: git push, membuat tag, gh release/PR, mengubah .github/**, mengubah secrets, menambah dependency (package.json tidak boleh berubah), git commit --no-verify, git reset --hard/clean pada pekerjaan orang lain, menyentuh profil Chrome pengguna, menjalankan \`git worktree remove\` pada worktree yang bukan milik run ini.
- Commit kecil, Conventional Commits (feat|fix|perf|refactor|docs|chore|test), <=72 karakter, Bahasa Inggris, satu tujuan per commit. Jangan squash.
- Kode, komentar, dokumen repo, dan LOG.md: Bahasa Inggris.
- Baseline (SHA ${A.baseSha}, worktree ${A.baseDir}) sudah diukur oleh orchestrator. Angkanya ada di SPEC.md. Jangan mengukur ulang baseline kecuali SPEC menyebut angka yang kosong.
- Browser: Playwright 1.64.0 + Google Chrome sistem (channel 'chrome', headless, GPU Apple M1 via ANGLE Metal). Terpasang di ${A.pwDir} (di luar repo). Jalankan skrip ukur dengan PW_DIR=${A.pwDir}. Viewport 1440x900, deviceScaleFactor 1.
- Port: dev 5174 (\`npm run dev -- --port 5174\`), preview 4174 (\`npx vite preview --port 4174\`). Pastikan port bebas sebelum mulai (\`lsof -i :5174 -i :4174\`) dan matikan semua server yang kamu mulai sebelum selesai. Path aplikasi: http://localhost:<port>/solar-system/ (base path).
- Jangan mengukur frame time di dev server (StrictMode). Dev server hanya untuk fungsi, hitungan commit, sudut orbit, dan pertumbuhan renderer.info / buffer.
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
      ? `ITERASI 1: kerjakan SEMUA item "Implementation scope" di SPEC (P1, P2, P3 dan perluasan yang tertulis di SPEC). Urutan yang disarankan: (1) P3 registry parent, (2) P1 ref + orbit lines memoized + scratch objects, (3) P2 trail ring buffer. Commit per langkah. Setelah selesai, jalankan gerbang di bawah dan tempel ringkasannya di LOG.md (Iteration summary + Metrics kolom Iter 1 untuk ukuran chunk).
Hal yang WAJIB dijaga (lihat juga "Implementation constraints" di SPEC):
- Urutan dan jumlah pemanggilan Math.random() saat mount tidak berubah, supaya sudut awal sama dengan baseline dalam pengukuran seeded.
- Sampling trail tetap per frame (100 titik), tidak diubah menjadi jarak busur. Hasil visual harus identik.
- Tidak ada setState di useFrame; tidak ada new Vector3/Line/Material/BufferAttribute di useFrame; tidak ada scene.getObjectByName di useFrame (termasuk jalur follow mode di SolarSystem).
- Setiap geometri/material/buffer yang dibuat manual di-dispose saat unmount; perhatikan StrictMode (effect berjalan dua kali di dev).
- Dokumen: perbarui pernyataan di docs/ARCHITECTURE.md yang menjadi salah (§4.3 angle "in React state", §6.1 trail/orbit, §6.3 orbit lines) dan tidak mengubah checklist progres di PERFORMANCE_AND_VISUALIZATION.md (itu tugas orchestrator setelah PASS).`
      : `ITERASI ${n}: kerjakan HANYA temuan berstatus OPEN di LOG.md (baca seluruh LOG.md). Per temuan: ubah OPEN -> FIXED, isi kolom Fix (file, commit) dan Regression evidence (angka sesudah dari probe/skrip QA atau langkah reproduksi). JANGAN menandai VERIFIED (hak QA). Bila temuan keliru atau tidak bisa direproduksi, beri alasan tertulis dan status DISPUTED. Tidak ada refactor di luar temuan.`

  return `Kamu adalah AGENT 1 — DEVELOPER dalam loop Dev<->QA run ${A.runId}.
Baca bagian 0, 0b, dan 2 dari ${PLAYBOOK}. Lalu ${REFS}, eslint.config.js, tsconfig.app.json, SPEC (${A.specPath}), dan LOG (${A.logPath}). Baca juga src/components/Planet.tsx, Moon.tsx, Satellite.tsx, SolarSystem.tsx sebelum mengedit.
${COMMON_RULES}
${iterSpecific}

Gerbang yang WAJIB hijau sebelum selesai: \`npm run lint\`, \`npm run build\` (catat ukuran chunk: index / vendor-three / vendor-react / css), \`npm test\`, \`npm audit --omit=dev --audit-level=moderate\` (CI gate). Audit penuh (dev-tooling) baseline 9 kerentanan; jangan menambah kerentanan baru.
Commit perubahan LOG.md sebagai \`docs:\`. Pastikan working tree bersih (git status --porcelain kosong) saat selesai.
Output akhir: hanya objek terstruktur {iteration:${n}, done, notes} dengan notes <= 3 baris.`
}

function qaPrompt(n) {
  const iterSpecific =
    n === 1
      ? `ITERASI 1 — selain gerbang dan review, kamu WAJIB menjalankan pengukuran AC-1..AC-7 dari SPEC, masing-masing dengan skrip di ${QA_DIR}/ (jangan menulis ulang skrip yang sudah ada kecuali rusak; bila rusak, catat sebagai temuan). Simpan JSON hasil ke ${QA_DIR}/results/iter1/ dan screenshot ke docs/loop/${A.runId}/shots/iter1/ (gitignored). Perintah utama (PW_DIR=${A.pwDir}):
- AC-1: \`node ${QA_DIR}/probes.mjs commits --port 5174 --seconds 10\`
- AC-2: \`node ${QA_DIR}/probes.mjs buffers --port 5174 --minutes 5 --scenario overview\` dan \`--scenario selected\` (jalankan berurutan, bukan paralel)
- AC-3: \`node ${QA_DIR}/probes.mjs angular --port 5174\` (dua kali; ambil median)
- AC-4: \`BASE_DIR=${A.baseDir} BRANCH_DIR=$(pwd) ROUNDS=3 bash ${QA_DIR}/ab-overview.sh <outdir>\` (skrip ini menjalankan preview sendiri di 4174; pastikan tidak ada server lain di 4174). Lalu ringkas p50/p95/frames>33 ms per varian (median) dari JSON-nya. Tambahkan \`measure.mjs perf\` 3 run untuk skenario selected pada cabang sebagai informasi (bukan gerbang).
- AC-5: \`node ${QA_DIR}/probes.mjs shots --port 4174 --out docs/loop/${A.runId}/shots/iter1/branch\`. Bandingkan dengan docs/loop/${A.runId}/shots/base/ memakai ${QA_DIR}/compare-shots.mjs (tulis skrip ini bila belum ada: pngjs + pixelmatch dipasang di ${A.pwDir}, bukan di repo; laporkan jumlah piksel berbeda per pasangan, dan noise = base overview-1 vs overview-2, base selected-jupiter-1 vs -2). Tampilkan juga satu gambar diff bila ada perbedaan di atas noise.
- AC-6: gerbang build: \`npm run build\`, cek \`grep -r __SOLAR_DEBUG__ dist/\` kosong, ukuran chunk vs SPEC (±2%), \`npm run lint\`, \`npm test\`, \`npm audit --omit=dev --audit-level=moderate\`, dan \`git diff --stat ${A.baseSha}...HEAD -- package.json package-lock.json\` kosong.
- AC-7: \`node ${QA_DIR}/measure.mjs smoke --port 5174\` dan \`node ${QA_DIR}/measure.mjs verify-selected --port 5174\`, plus pemeriksaan manual singkat (Object List pilih Jupiter dan satu bulan serta satelit; Follow Object; Reset View; toggle Orbits/Satellites/Moons; pause/resume; panel info tutup dan "Continue Exploring"; dialog bantuan). Bandingkan console error dengan baseline: tidak boleh ada error/warning baru.
Untuk review kode, periksa khusus: (a) setState/alokasi/getObjectByName di useFrame; (b) dispose dan lifecycle registry saat unmount dan StrictMode; (c) ring buffer: tidak ada garis penghubung palsu di titik pembungkus (wrap-around), drawRange benar; (d) Math.random call order saat mount; (e) jalur follow mode di SolarSystem; (f) perubahan visual tersembunyi (mis. pulse hover sekarang satu frame berbeda: nilai dan alasannya harus tertulis).`
      : `ITERASI ${n} — reproduksi ulang setiap temuan berstatus FIXED: VERIFIED bila benar-benar beres (dengan bukti baru), kembalikan OPEN dengan catatan bila tidak. Jalankan ulang semua gerbang dan AC yang terkait temuan. Baseline tidak diukur ulang.`

  return `Kamu adalah AGENT 2 — QA / VALIDATOR independen dalam loop Dev<->QA run ${A.runId}. Tugasmu menemukan alasan kerja Dev BELUM layak, bukan membenarkannya.
Baca bagian 0, 0b, dan 4 dari ${PLAYBOOK}, lalu SPEC (${A.specPath}) dan LOG (${A.logPath}). Input yang boleh kamu pakai: SPEC, \`git diff ${A.baseSha}...HEAD\`, LOG, kode, dan hasil perintah/pengukuran yang kamu jalankan sendiri. Jangan mengandalkan klaim atau catatan Dev; baca bagian temuan di LOG saja untuk status, bukan narasi.
${COMMON_RULES}
${iterSpecific}

Prosedur wajib (urut): gerbang objektif -> kepatuhan SPEC per AC dengan bukti (angka dari pengukuranmu, dibandingkan dengan baseline di SPEC) -> review kode -> regresi fungsional -> tulis ke LOG.md (satu baris tabel per temuan dengan ID, iterasi, severity, area, lokasi, deskripsi + bukti; isi tabel Metrics kolom Iter ${n}; perbarui Iteration summary dan NEEDS-MANUAL).
Severity mengikuti Bagian 4. Hal yang tidak bisa diuji di sini -> NEEDS-MANUAL (perangkat nyata, Safari/Firefox, layar 120 Hz), bukan PASS. Commit artefak QA (LOG.md, docs/loop/${A.runId}/qa/**) dengan \`docs:\`. Kamu tidak mengubah kode fitur atau test. Working tree harus bersih di akhir (kecuali shots/ yang gitignored).
Angka AC yang tidak ada buktinya = temuan. Perbedaan performa dinyatakan bermakna hanya bila di luar noise A/B (ukur noise dari varian BASE).
PASS hanya bila semua gerbang hijau dan tidak ada Blocker/Major dengan status OPEN/FIXED/DISPUTED.
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
