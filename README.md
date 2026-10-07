<div align="center">

<img src="./Sources%20of%20Truth/GIF%20Assets/Header.gif" width="100%" alt="Tempest–Eastern Empire War">

# Tempest–Eastern Empire War · Campaign Atlas

**Atlas kampanye interaktif bergaya dokumenter untuk Perang Tempest–Kekaisaran Timur dari light novel *Tensura*.**
Peta, waktu, pasukan, wilayah, pergerakan — dan bukti di balik setiap klaim.

[**▶ Buka atlas**](https://tempest-eastern-empire-war-map.vercel.app/) ·
[Desain](./DESIGN.md) ·
[Audit kanon](./docs/audit/timeline-canon-audit.md) ·
[Register riset](./docs/research/RESEARCH_REGISTER.md) ·
[Arsitektur](./docs/ARCHITECTURE.md) ·
[QA](./docs/QA.md)

![Revision](https://img.shields.io/badge/dataset-R5_canon_audit-d4ab57?style=flat-square)
![Events](https://img.shields.io/badge/events-166-2f9e7e?style=flat-square)
![Canon](https://img.shields.io/badge/canonical-141_·_visual_recon._25-cfe5dc?style=flat-square)
![Clock](https://img.shields.io/badge/clock-D−43_→_D+31_·_10_min-5b8fd8?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-15-000?style=flat-square&logo=nextdotjs)
![MapLibre](https://img.shields.io/badge/MapLibre_GL-5-396CB2?style=flat-square&logo=maplibre&logoColor=white)

</div>

> [!IMPORTANT]
> **Proyek penggemar, bukan materi resmi Tensura.** Dibuat oleh **NuRichter Workspace** sebagai dedikasi untuk komunitas Tensura, menyambut periode anime musim 4 cour 3 (2027). Tidak berafiliasi dengan pemegang hak. Semua yang direkonstruksi — waktu, posisi, rute, sebagian urutan — **diberi label** di dalam atlas.

---

## Apa ini

Sebuah peta perang yang bisa diputar: dari rapat perang Kekaisaran, pawai 940.000 tentara menuju Hutan Jura, pertempuran permukaan yang selesai dalam kurang dari dua jam, operasi Labirin, satu malam panjang (kudeta, Velgrynd, Veldora), sampai pertemuan puncak dan repatriasi tawanan.

Yang bisa dijawab di layar untuk setiap momen:

- **Apa yang terjadi, di mana, kapan** (relatif terhadap kampanye)
- **Siapa yang bergerak, berapa besar pasukannya**, dan seberapa yakin angka itu
- **Siapa menguasai wilayah**, dan apa yang berubah
- **Dari mana kita tahu** — volume, bab, lokator baris, dan kelas provenans

## Kanon vs rekonstruksi

Setiap event membawa satu kelas provenans:

| Kelas | Arti |
|---|---|
| `CANONICAL` | Didukung eksplisit oleh novel |
| `CANONICAL_WITH_VISUAL_RECONSTRUCTION` | Kejadiannya kanon; posisi/rute/waktu di peta direkonstruksi |
| `INFERRED` | Mengikuti dari beberapa petunjuk, tidak dinyatakan |
| `RECONSTRUCTED` | Jembatan antara titik-titik yang diketahui, dibuat proyek ini |
| `UNRESOLVED` | Bukti tidak cukup — tetap ditampilkan agar celahnya kelihatan |

**Boleh:** interpolasi gerakan di antara dua posisi kanonik, waktu simulasi untuk event yang di novel hanya bertanggal hari, posisi peta untuk tempat yang tidak ditandai di peta mana pun (dengan alasan tertulis).
**Tidak boleh:** mengarang pertempuran, korban, jumlah pasukan, keputusan komandan, atau presisi palsu. Angka yang tidak diketahui tetap **unknown**, tidak pernah menjadi 0.

Audit kanon R5 menemukan 117 error dan 44 event kanonik yang hilang di dataset Step 1, lalu memperbaikinya dengan lokator teks. Ringkasannya di [`docs/audit/timeline-canon-audit.md`](./docs/audit/timeline-canon-audit.md); setiap event mencatat perubahannya sendiri (terlihat di dossier).

## Cara kerja timeline

Novel tidak pernah memberi jam atau tanggal kalender. Jadi:

| Lapisan | Contoh | Kanon? |
|---|---|---|
| Waktu kanonik | "kurang dari dua jam setelah dimulai" | Ya — kata-kata novel |
| Hari pertempuran | `D+00` (hari ultimatum & pertempuran permukaan) | Penempatan, dengan presisi tercatat |
| Waktu simulasi | `11:30` | **Bukan** — grid 10 menit, diberi tag *SIMULATION* |
| Kalender | `…/9001` | **Bukan** — penanda buatan |

Kerangka waktu dibangun dari interval yang dinyatakan novel ("sebulan setelah pertemuan", "tujuh hari sejak operasi dimulai", "keesokan harinya"). Celah yang tidak dinyatakan diberi penempatan `RECONSTRUCTED` beserta alasannya. Detail: [`docs/TIMELINE-METHODOLOGY.md`](./docs/TIMELINE-METHODOLOGY.md).

## Peta

- **Base Map (default)** — peta garis bersih untuk analisis operasional, dalam dua *look*: **Documentary** (default — dasar terang, warna negara solid, garis front putih, seperti video referensi) dan **War room** (gelap, analitis). Ganti di Layers → *Look*.
- **Myth Map** — peta dunia bergambar, untuk konteks geografis dan lore.
- **Flat / Globe** — atlas datar untuk keterbacaan, globe untuk imersi. Ganti gaya atau proyeksi tidak mereset waktu, seleksi, maupun filter.

**Wilayah mengikuti garis batas yang digambar**, bukan lingkaran atau poligon karangan: 20 wilayah dijiplak dari *Base Map - Blue* oleh `scripts/cartography/extract_territories.py`, dan pas di kedua gaya peta. Peran tiap negara berubah mengikuti waktu (belligerent, co-belligerent, contributor, tidak terlibat, permusuhan berakhir); kontrol yang tidak diketahui digambar abu-abu berarsir, tidak pernah dengan warna faksi. Area operasi teater tetap skematis, tapi dipotong mengikuti daratan dan batas. Detail: [`docs/CARTOGRAPHY.md`](./docs/CARTOGRAPHY.md).

**Wilayah yang dikuasai & garis front (RECONSTRUCTED).** Novel tidak menggambar garis front. Seperti di video referensi, atlas menyintesis tanah yang dikuasai dari posisi dan kekuatan setiap formasi (pengaruh ∝ ∛kekuatan, dengan bobot "tanah sendiri" untuk negara pemilik): warna pihak lain tumbuh di sekitar pasukannya, dan garis putih muncul di tempat kedua warna bertemu. Lapisan ini selalu diberi label *rekonstruksi* (legenda, panel Situasi) dan bisa dimatikan; status politik wilayah tetap mengikuti event.

Koordinat adalah **koordinat simulasi** pada peta fiksi — bukan lintang/bujur.

## Pasukan, ukuran, pergerakan

- **Ukuran pasukan** tampil sebagai angka besar di samping simbol (gaya video dokumenter perang), dengan status: eksplisit, `≈` turunan, `~` rekonstruksi, `?` tidak diketahui. Total per sisi per front dijumlah hanya dari formasi paling spesifik — tidak ada prajurit yang terhitung dua kali.
- **Bentuk + warna + label** untuk identitas faksi (persegi = Kekaisaran, lingkaran = Tempest, belah ketupat = Dwargon), tidak hanya warna.
- **Pergerakan** digambar menurut keyakinan rute: penuh (rute dinyatakan), putus-putus (titik ujung kanon, garis direkonstruksi), titik-titik (skematis), dan **tidak digambar** jika rute tidak diketahui (mis. lompatan ruang-waktu Velgrynd). Label menyebut kekuatan saat berangkat — bukan diasumsikan tetap.
- **Korban** dipisah: tewas, dibangkitkan, ditawan, luka, hilang. Kebangkitan tidak menghapus kematian; keduanya ditampilkan berdampingan.

## Fitur

Timeline dengan pita tahap, lajur teater, rentang pertempuran, penanda volume, **celah waktu berarsir** (rentang ≥ 6 jam simulasi tanpa catatan), bookmark, lompat event/hari/frame dan kecepatan 0,25×–48×, plus *auto-slow* di titik balik · event muncul sebagai cincin yang "pop" dengan label ±2 detik lalu memudar · angka korban dan kekuatan yang bergulir · panel Situasi (intelijen kampanye saat ini) · dossier untuk pasukan, event, pertempuran, karakter (photocard lokal), wilayah, teater, dan pergerakan — saling tertaut · pencarian + palet perintah (`/` atau `Ctrl+K`, fuzzy, alias, nama Jepang) · filter (faksi, negara, pasukan, pertempuran, wilayah, teater, jenis event, status kanon, keyakinan) dengan chip yang mengumumkan filter aktif · Cerita Kampanye per tahap · legenda · mode sinematik (tanggal besar, satu caption, kartu pemimpin, buku korban, kartu penutup) · kontrol look, opasitas, ketebalan jejak, ukuran label/penanda, kepadatan panel, dan gerak — tersimpan lokal · minimap dan preset kamera · deep link (`?frame=…&event=…`).

<details>
<summary><b>Pintasan keyboard</b></summary>

| Tombol | Aksi | Tombol | Aksi |
|---|---|---|---|
| `Space` | Play / pause | `/` · `Ctrl+K` | Cari & perintah |
| `←` `→` | ±1 jam simulasi | `G` | Flat / globe |
| `Shift` + `←` `→` | ±1 hari | `M` | Base / Myth Map |
| `[` `]` | Event sebelumnya / berikutnya | `L` | Legenda |
| `,` `.` | ±1 keyframe (10 menit) | `C` | Mode sinematik |
| `1`–`8` | Kecepatan | `0` | Bingkai seluruh kampanye |
| `Esc` | Tutup / batal pilih | `?` | Tentang & pintasan |
| `B` | Bookmark momen ini | | |

</details>

## Arsitektur data

```
Sources of Truth/   →   data-source/   →   compile-data   →   public/data   →   atlas
(novel, peta,          (event + efek,      (deterministik,     (checkpoint +
 photocard, Step 1)     pasukan, wilayah,   tervalidasi)        delta jarang)
                        karakter, istilah)
```

- **Sumber kebenaran riset:** `Sources of Truth/` — peta, bendera, photocard + manifest, dan dataset Step 1 (diarsipkan tanpa diubah sebagai revisi pra-audit).
- **Sumber atlas:** `data-source/` — kampanye R5 (event dengan efek, pasukan, pergerakan, korban, tahap), gazetteer, geometri wilayah, kontrol wilayah, karakter, terminologi.
- **Runtime:** `public/data/` dihasilkan oleh `scripts/compile-data.ts` — jangan diedit tangan.

Detail: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) · [`docs/DATA-MODEL.md`](./docs/DATA-MODEL.md) · [`docs/DEPENDENCY-MAP.md`](./docs/DEPENDENCY-MAP.md) · [`docs/RESEARCH-PROVENANCE.md`](./docs/RESEARCH-PROVENANCE.md).

## Pengembangan

Butuh **Node 20.11+**. Tidak ada API key, database, atau penyedia peta eksternal.

```bash
git clone https://github.com/NuRichter/Tempest_Eastern_Empire_War_Map.git
cd Tempest_Eastern_Empire_War_Map
npm install
npm run dev            # http://localhost:3000
```

Alat offline (opsional, Python 3 + numpy, opencv-python, Pillow):

```bash
python scripts/cartography/extract_territories.py   # geometri wilayah dari Base Map
python scripts/characters/build_photocards.py       # aset photocard dari repositori karakter
```

## Validasi & QA

```bash
npm run verify   # compile → validate-data → validate-assets → lint → typecheck → test → build
npm run qa       # QA browser sungguhan (Chromium via Puppeteer) terhadap build produksi
npm run qa:visual       # regresi visual: 10 checkpoint vs docs/qa/checkpoints
npm run qa:playwright   # smoke run Playwright CLI terhadap server yang sedang jalan
```

`validate-data` menolak id duplikat, referensi yatim, NaN/Infinity, jumlah negatif, waktu mundur, pergerakan yang selesai sebelum mulai, total korban yang tidak cocok saat dihitung ulang, dan state yang berbeda antara diputar dan di-*scrub*. `test` memastikan tidak ada pasukan yang "teleport" di sepanjang rute yang digambar dan bahwa *unknown* tidak pernah tampil sebagai nol. `qa` menjalankan 40 cek, termasuk 8 lebar layar (320–1920 px), auto-slow, latensi seek, dan waktu buka dossier. Detail: [`docs/QA.md`](./docs/QA.md).

## Deploy

Frontend statis di Vercel: import repositori, setelan default. `prebuild` meng-compile dan memvalidasi dataset, jadi build tidak bisa mengirim data yang belum diperiksa.

## Referensi desain

Prinsip visual diambil (tanpa menyalin aset) dari empat video dokumenter perang dan dua peta perang interaktif — kamera diam saat waktu berjalan, angka kekuatan di front, tanggal sebagai readout terkuat — lalu ditambah yang tidak mereka punya: legenda, sumber, dan ketidakpastian. Lihat [`docs/research/VISUAL-REFERENCES.md`](./docs/research/VISUAL-REFERENCES.md) kontrak desain [`DESIGN.md`](./DESIGN.md), dan anatomi layar [`docs/UI-DESIGN.md`](./docs/UI-DESIGN.md).

## Berkontribusi

Fakta dihormati, ketidakpastian diakui, karangan tidak diterima. Setiap fakta baru butuh penunjuk sumber (volume, bab, lokator) — tanpa kutipan panjang dari novel. Lihat [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) dan [Code of Conduct](./CODE_OF_CONDUCT.md).

## Lisensi & atribusi

Proyek ini milik **NuRichter** (NuRichter Workspace), dengan lisensi tiga lapis — lihat [LICENSE](./LICENSE): perangkat lunak (permisif), dataset & tulisan analitis (atribusi, non-komersial, berbagi serupa, wajib menjaga label integritas), dan materi pihak ketiga (tidak dilisensikan oleh proyek ini).

*Tensei Shitara Slime Datta Ken* beserta dunia, tokoh, teks, dan ilustrasinya adalah milik pemegang haknya. Photocard karakter berasal dari situs resmi TenSura dan wiki Tensura sebagaimana tercatat di manifest repositori karakter; lisensinya **Open** (keputusan pemilik proyek), dengan sumber dan atribusi tetap dicantumkan di setiap kartu. Teks novel (PDF) tidak disertakan di repositori ini — audit kanon memakai salinan lokal pemilik proyek; rujukan hanya berupa volume, bab, dan lokator baris. Belilah dan bacalah edisi resminya.

Sitasi: tombol **"Cite this repository"** di GitHub ([CITATION.cff](./CITATION.cff)).

<div align="center">
<br>
<img src="./Sources%20of%20Truth/GIF%20Assets/Footer.gif" width="100%" alt="">
<sub>Dibuat oleh penggemar, untuk penggemar. Ketidaktahuan itu data. Karangan itu bug.</sub>
</div>
