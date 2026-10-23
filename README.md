# Nerdungeon — Belajar Jadi Petualangan

Nerdungeon adalah aplikasi web belajar dengan gamifikasi quiz. Materi (misalnya PDF kuliah) diubah menjadi "ekspedisi" berisi chapter/region, lalu dipelajari lewat battle quiz 10 soal per chapter dengan visual petualangan 2D.

Alurnya: upload PDF → jadi materi + soal pilihan ganda → battle jawab soal → dapat gold/gems/XP → buka chapter berikutnya / summon di Bazaar.

> Nama "Nerdius" di request = proyek ini (Nerdungeon). README ini menjelaskan kondisi kode saat ini, bukan janji rilis publik.

## Apa itu Nerdungeon

- **Belajar aktif, bukan baca pasif.** Setiap chapter punya materi ringkas + 10 soal pilihan ganda dengan pembahasan.
- **Dunia game sebagai motivasi.** React merender Hub, Expedition, Bazaar, Bag, Settings, dan quiz; Phaser 3.90 merender dunia battle (karakter jalan, musuh, parallax).
- **Konten milik sendiri.** Selain 1 ekspedisi tutorial bawaan (3 chapter × 10 soal), pengguna bisa mengunggah PDF sendiri (maks 25 MB) untuk dibuatkan 1–3 chapter lewat AI.
- **Progres per akun.** Satu akun anonim per browser (Supabase Auth); Postgres + private Storage menyimpan state, hasil battle, dan file tiap akun secara terisolasi.

## Tujuan Nerdungeon

1. Menurunkan rasa malas belajar dengan loop pendek: baca materi → jawab 1 soal → feedback langsung → lanjut.
2. Mengubah PDF apa pun menjadi paket belajar siap main (ringkasan, topik, materi, soal, kunci + pembahasan, referensi halaman).
3. Memberi rasa progres yang konkret: HP, damage, loot, gold/XP/gems, chapter terbuka, koleksi summon.
4. Menjaga kejujuran game: jawaban dinilai langsung di browser dari kunci chapter aktif, lalu divalidasi ulang backend saat disimpan; HP, reward, dan progres tetap dihitung backend.

## Fitur utama

- **Tutorial playable:** 1 ekspedisi tutorial, 3 chapter, masing-masing 10 soal bawaan.
- **Forge PDF:** upload PDF → validasi struktur → Gemini menghasilkan materi + tepat 10 soal per chapter → file disimpan privat → state ditambah. Gagal divalidasi/generasi = tidak ada ekspedisi palsu.
- **Combat quiz:** HP pemain 500, HP musuh 100. Benar = 50 damage ke musuh; salah = 50 damage ke pemain. Musuh kalah diganti selama soal tersisa. Selesaikan 10 soal dengan HP > 0 = menang; HP 0 = kalah tanpa reward.
- **Reward:** bonus pertama kali lulus chapter 450 gold + 100 XP; tiap musuh kalah = pending loot 100 gold + 50 gems yang hanya cair saat `complete` menang (termasuk replay). Exit/restart/kalah membuang pending loot.
- **Quiz responsif:** jawaban dinilai lokal tanpa menunggu request; jawaban dibatch dan disimpan saat Save and exit atau chapter selesai. Chapter yang disimpan dapat dilanjutkan atau diulang.
- **Bazaar summon:** gacha 1× (100 gems) / 10× (900 gems) dengan animasi chest + kartu, guard saldo lokal + validasi backend.
- **Bag, Settings, Hub badge:** tas, pengaturan nama/suara/reduce-motion, badge merah Hub untuk forge selesai/gagal, dialog forge bisa di-minimize setelah 3 detik.
- **Battle dua baris:** scene Phaser + HP musuh di atas, HP pemain + quiz di bawah; quiz tidak menutupi canvas.

## Tech Stack

| Lapisan | Teknologi |
| --- | --- |
| Frontend | React 19, Vite 6, TypeScript, Phaser 3.90, `@supabase/supabase-js` 2.x |
| Backend | Node 24, Express 5, TypeScript, Multer (upload), `pdf-lib` (validasi PDF) |
| Data/Auth | Supabase lokal (Docker): Auth anonim, Postgres (`game_states`), Storage privat (`expeditions`) |
| AI | Google Gemini (HTTP langsung, retry khusus 503) untuk materi + soal PDF |
| Kualitas | `tsc --noEmit`, ESLint, `vite build`, `node:test` (16 tes backend), skrip Playwright (`test:web`, `test:forge`, `test:summon`, `test:game`, `test:settings`, `test:learning`) |

## Architecture

Satu **modular monolith Express** + klien React/Vite + renderer Phaser. Kontrak endpoint tetap `/api`. Detail penuh ada di [docs/architecture.md](docs/architecture.md).

```text
Browser (React + Phaser) ── /api (JSON + multipart) ──► Express (/api/me, /api/game, /api/game/forge)
                                                                  │           │
                                                     Supabase Auth/State/Storage   Gemini (PDF → materi+soal)
```

### Backend (`backend/src/`)

- `app.ts` + `server.ts`: rakit middleware/router, verifikasi token, jalankan server.
- `modules/account/`: verifikasi access token, `GET /api/me`.
- `modules/game/`: route (`index.ts`), tipe domain (`types.ts`), aturan battle (`battle.ts`), snapshot publik (`snapshot.ts`), forge/upload (`forge.ts`), validasi + instruksi PDF (`pdf.ts`), persistensi optimistis (`store.ts`), summon/tutorial.
- `platform/`: client Supabase, transport/retry Gemini, error HTTP aman.

Aturan penting:

- Question bank tersimpan di backend, tetapi answer keys chapter aktif dikirim ke browser agar grading instan; backend memvalidasi ulang pilihan dalam batch saat exit/complete.
- `start` (expeditionId/chapter), `restart` (battleId baru, HP penuh, resource/progres utuh), `exit` (simpan batch jawaban), `answer` (aksi kompatibilitas; UI tidak mengirim satu per satu), `complete` (batch jawaban divalidasi lalu attempt diselesaikan).
- Tulis state dengan version check + retry konflik ≤ 5×; retry answer/complete idempotent.

### Frontend (`frontend/src/`)

- `App.tsx`: shell, navigasi, lifetime halaman.
- `modules/game/`: DTO/API (`api.ts`), snapshot (`useGame.ts`), adventure/battle entry (`useAdventure.ts`), forge/minimize/badge (`useForge.ts`).
- `platform/auth.ts`: sesi browser + sign-in anonim.
- `screens/` + `components/`: presentasi per layar; `game/`: scene Phaser (visual saja, tidak memberi reward).

### Urutan forge PDF (ringkas)

1. UI kirim multipart PDF terautentikasi → router game → forge.
2. Validasi PDF (1–1000 halaman, ≤ 25 MB, tidak rusak) → minta JSON ke Gemini.
3. Validasi hasil (tepat 10 soal/chapter, 4 opsi unik, index jawaban valid, referensi halaman fisik).
4. Simpan file ke Storage privat → tambah ekspedisi ke state (gagal tulis = file dihapus lagi).

Retry Gemini hanya untuk HTTP 503 (maks 3 attempt, 1 deadline 90 detik). Error kuota/input/limit tidak diulang. Log hanya berisi model, byte/halaman, status, durasi, token — tanpa isi PDF/key.

## Cara run locally

### Prasyarat

- Node 24, npm (Windows: pakai `npm.cmd` bila `npm.ps1` diblokir).
- Docker Desktop (untuk Supabase lokal: Auth, Postgres, Storage).
- Chrome terinstal (untuk tes browser; override `CHROME_PATH` bila perlu).
- `GEMINI_API_KEY` (Google AI Studio) di `backend/.env` — hanya untuk forge PDF; tutorial jalan tanpanya.

Jangan arahkan proxy API ke port 3000 — di workspace ini port itu milik app Next.js lain dan mengembalikan HTML. Nerdungeon memakai **backend 4000 + frontend 5173**.

### 1. Install

```sh
npm ci
npm --prefix frontend ci
npm --prefix backend ci
```

### 2. Supabase lokal + env

```sh
npm run supabase:start
npm run supabase -- status --workdir backend -o env
```

Salin hasilnya ke env:

- `frontend/.env`: `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (= `API_URL` + `PUBLISHABLE_KEY` lokal).
- `backend/.env`: `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` sama, plus `SUPABASE_SECRET_KEY` (= `SECRET_KEY`). Jangan taruh secret di frontend/Git.
- Pastikan `PORT=4000` di `backend/.env`; `GEMINI_API_KEY` diisi bila mau coba forge PDF.

Config lokal sudah mengaktifkan anonymous sign-in dan migrasi `backend/supabase/migrations/20260930000000_game_backend.sql` jalan saat startup.

### 3. Jalan

```sh
npm run dev
```

Buka http://localhost:5173. Vite mem-proxy `/api` ke `http://127.0.0.1:4000`. Pisah bila perlu: `npm run backend:dev` + `npm run frontend:dev`. Matikan proses dev Nerdungeon lama dulu; Vite strictPort menolak port sibuk. Stop DB lokal: `npm run supabase:stop` (volume Docker tetap).

### 4. Verifikasi

```sh
npm --prefix backend test
npm --prefix backend run typecheck
npm run typecheck
npm run lint
npm run build
npm run test:game
npm run test:web      # butuh frontend aktif
npm run test:forge     # butuh frontend aktif
npm run test:summon    # butuh frontend aktif
npm run test:settings  # butuh frontend aktif
npm run test:learning  # butuh frontend + backend + GEMINI_API_KEY
npm --prefix backend run verify:pdf  # live Gemini/Supabase, jalan server ephemeral sendiri
```

`test:web/forge/summon/settings` memakai mock Auth/API + domain backend asli (tanpa gems/kuota live). `verify:pdf`/`test:learning` memakai provider asli, akun/file sementara yang dibersihkan di `finally`, dan memakan kuota Gemini. Screenshot masuk `test-results/` (diabaikan Git).

Output produksi frontend: `frontend/dist`. Deploy perlu mem-proxy `/api` ke backend (atau build dengan `VITE_API_URL`).

## Status saat ini (jujur)

Jalur belajar **lokal** sudah terbukti end-to-end (upload PDF sintetis → battle → reward → reload, dua akun terisolasi). **MVP publik belum siap**: belum ada deploy HTTPS/proxy produksi, audit policy menyeluruh, limit anti-abuse, pemulihan akun lintas perangkat, hapus akun/retensi, monitoring/backup, dan review kualitas PDF nyata (scan, buku panjang, referensi faktual). Lihat tabel progres di `AGENTS.md` sebelum mengklaim selesai.
