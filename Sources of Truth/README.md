<div align="center">

<img src="https://media.giphy.com/media/AUux1IiywLVOBR0CpS/giphy.gif" width="100%" alt="Tempest War Banner">

# ⚔️ Tempest–Eastern Empire War ⚔️
### 🗺️ Battlefield Timeline & Web Animation Project 🗺️

*Rekonstruksi lengkap Perang Tempest–Kekaisaran Timur,*
*dari mobilisasi sampai perjanjian damai.*
*Satu keyframe setiap 10 menit. Tanpa bolong. Tanpa ngarang.* ✨

<br>

![Status](https://img.shields.io/badge/Step_1-🔒_LOCKED-success?style=for-the-badge)
![Keyframes](https://img.shields.io/badge/Keyframes-7,200-blueviolet?style=for-the-badge)
![Events](https://img.shields.io/badge/Atomic_Events-105-orange?style=for-the-badge)
![Theatres](https://img.shields.io/badge/Theatres-6_paralel-informational?style=for-the-badge)

![Audit](https://img.shields.io/badge/Temporal_Audit-30/30_PASS-brightgreen?style=flat-square)
![Fanon](https://img.shields.io/badge/Fanon-0%25-critical?style=flat-square)
![Sumber](https://img.shields.io/badge/Sumber-Volume_12–16-lightgrey?style=flat-square)

</div>

---

## 👋 Halo, Selamat Datang!

Jadi gini ceritanya.

Kekaisaran Timur mengerahkan **940.000 tentara** ke Hutan Besar Jura. Empat hari kemudian,
**770.000** di antaranya sudah tidak ada. Federasi Jura-Tempest kehilangan… **nol**. Secara numerik.

Itu bukan pertempuran. Itu **rekayasa medan perang**. 🧠

Repo ini menyimpan hasil rekonstruksinya dalam bentuk **database keadaan medan perang** —
bukan ringkasan cerita, tapi *state* yang bisa langsung dianimasikan. Setiap 10 menit waktu
simulasi = satu keyframe. Engine animasi tinggal melakukan interpolasi di antaranya pada
18–24 FPS. 🎬

> 💡 **Kenapa 10 menit?**
> Karena sumbernya (novel) tidak pernah menyebut jam. Sama sekali. Nol.
> Jadi kita tidak berpura-pura punya presisi detik — kita bikin grid yang jujur,
> lalu biarkan renderer yang menghaluskan.

<br>

<div align="center">
<img src="https://media.giphy.com/media/VFUiCebcO2ddJwccF8/giphy.gif" width="360" alt="Aserang Ambek">
<br>
<sub><i>Legiun Hijau, kira-kira begini energinya waktu EVT-0102.</i></sub>
</div>

<br>

---

## 📦 Isi Repo

| File | Isinya apa | Buat siapa |
|:--|:--|:--|
| 📊 `Tempest_Eastern_Empire_War_Timeline.xlsx` | **Master dataset.** 7.200 keyframe + 11 sheet pendukung | Mesin 🤖 |
| 📖 `Tempest_Eastern_Empire_War_Timeline.md` | Naratif lengkap, audit, register ambiguitas | Manusia 🧍 |
| 🐍 `source_dataset_final.py` | Sumber kebenaran: event, force, casualty, constraint | Developer |
| ⚙️ `keyframe_generator.py` | Bikin grid keyframe dari event | Developer |
| 📝 `markdown_generator.py` | Bikin `.md` dari `.xlsx` (biar nggak pernah beda) | Developer |
| ✅ `validate_temporal.py` | **Jalankan ini setiap habis ngedit!** | Developer |
| 🗂️ `source_dataset_r1/r2/r3.py` | Arsip revisi. Jangan dihapus, ini rantai bukti | Arsip |

---

## 🕰️ Lima Jam yang Tidak Boleh Ketuker

Ini bagian yang paling gampang bikin salah paham, jadi ditulis besar-besar:

```
Campaign_Time    C+40:06:20   ← dihitung dari mobilisasi
Battle_Time      B+00:06:20   ← dihitung dari kontak pertama
Canonical_Time   "sebulan telah berlalu"   ← apa yang NOVEL bilang
Simulation_Time  06:20        ← tempelan kita, BUKAN kanon
Calendar_Date    10/02/9001   ← tahun 9001 itu penanda buatan
```

⚠️ **Tahun 9001 bukan tanggal in-world.** Tidak ada satu pun jam di dataset ini yang kanon.
Semua `HH:MM` berlabel `SIMULATION_RECONSTRUCTED`. Kalau nanti ada yang bilang
*"novelnya bilang jam 6 pagi"* — tidak, itu kita yang menempatkan. 🙅

---

## 🎭 Enam Teater, Jalan Bareng

Perangnya bukan satu medan. Enam teater punya state sendiri-sendiri dan **tidak pernah saling
menimpa**. Di puncaknya, keenamnya hidup bersamaan dalam satu keyframe.

```
TH-DWG  🏔️  Gerbang Dwargon      → 240.000 musnah dalam satu hari
TH-LAB  🌀  Labirin Ramiris       → 530.000 musnah di bawah tanah
TH-CAP  🏛️  Ibu Kota Kekaisaran   → kudeta yang gagal sebelum dimulai
TH-DWE  ⛩️  Front Timur Dwargon   → 60.000 dikorbankan oleh pihaknya sendiri
TH-DRG  🐉  Teater Naga           → Veldora vs Velgrynd, buntu
TH-DIP  🕊️  Penyelesaian          → traktat, suksesi, repatriasi
```

---

## 📐 Struktur Data

```
BUKTI SUMBER  📚
      ↓
EVENT ATOMIK  ⚡   ← "apa yang BERUBAH"
      ↓
GRAF EVENT  🔗
      ↓
KEYFRAME 10 MENIT  🎞️   ← "seperti apa medan perangnya"
      ↓
STATE MEDAN PERANG  🗺️
      ↓
EXCEL  📊  →  MARKDOWN  📖
```

**Event ≠ Keyframe.** Ini aturan paling penting di proyek ini.
Event bilang *apa yang berubah*. Keyframe bilang *bagaimana rupanya sekarang*.

---

## 🚀 Buat yang Mau Bikin Animasinya (Step 2)

Loop-nya kira-kira begini:

```js
for (const frame of keyframes) {
  loadTheatres(frame);        // 6 teater, state independen
  loadForces(frame);          // posisi, kekuatan, status gerak
  loadFrontline(frame);       // garis depan per teater
  loadTerritory(frame);       // siapa menguasai apa
  loadCommand(frame);         // siapa memimpin
  loadCasualties(frame);      // kumulatif, monoton naik
  applyStateChange(frame);
}
// lalu interpolasi antar-keyframe di 18–24 FPS ✨
```

Frontend **tidak perlu** membaca novelnya. Semua sudah jadi state. 💆

### ✅ Aturan Main

| Boleh | Jangan |
|:--|:--|
| ✔️ Interpolasi antar keyframe | ❌ Bikin baris per-frame video |
| ✔️ Tampilkan `UNKNOWN` apa adanya | ❌ Ubah `UNKNOWN` jadi 0 |
| ✔️ Pakai `Approach_Progress_Pct` buat animasi | ❌ Anggap itu jarak terukur |
| ✔️ Tambah event kalau ada bukti sumber | ❌ Ngarang biar animasinya seru |
| ✔️ Jalankan `validate_temporal.py` | ❌ Ubah timestamp tanpa cek constraint |

---

## 🔍 Yang Jujur Kami Akui

Dataset ini **tidak sempurna**, dan itu ditulis terang-terangan di dalamnya:

- 🌫️ **Jendela 50 hari itu simulasi**, bukan durasi kanon. Novel tidak pernah bilang
  perangnya berapa lama.
- 🧩 **Titik referensi "sebulan"** adalah interpretasi (AMB-016). Kalau salah baca,
  seluruh fase pendekatan bergeser — walau urutannya tetap.
- 🕳️ **Jeda "beberapa hari"** ke fase kedua dimodelkan tepat 3 hari (AMB-006). Ini sambungan
  terlemah.
- ❓ **Korban luka & hilang tidak diketahui** untuk kedua pihak, di semua fase. Tidak dikarang.
- 🫥 **±170.000 tentara Kekaisaran tidak jelas nasibnya.** Tidak diasumsikan mati.

> **Prinsipnya:** kalau sumbernya diam, field-nya `UNKNOWN`.
> Ketidaktahuan itu data. Karangan itu bug. 🐛

---

## 🧪 Sebelum Commit

```bash
python validate_temporal.py     # 30 constraint, harus 30/30 PASS
python keyframe_generator.py    # rebuild .xlsx
python markdown_generator.py    # rebuild .md dari .xlsx
```

Kalau `validate_temporal.py` merah — **jangan di-commit**. Timeline-nya lagi bohong. 🚨

---

<div align="center">

## 🎉 Sampai Ketemu di Step 2!

Datanya sudah dikunci. Sekarang bagian serunya: **bikin peta ini hidup.** 🗺️✨

<br>

<img src="https://media.giphy.com/media/i9M9KxhkKMBxUrFuMI/giphy.gif" width="320" alt="Rimuru">

<br>

*"Semua sudah sesuai rencana."*
— Benimaru, kira-kira, sambil pura-pura kalah 🔥

<br>

**Step 1: 🔒 LOCKED** · **Step 2: 🚧 Ayo mulai**

<sub>Proyek penggemar non-komersial. Baca `LICENSE` sebelum pakai. 💛</sub>

</div>
