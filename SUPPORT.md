<div align="center">

# 🛟 Dukungan · Support

*Butuh bantuan dengan Campaign Atlas atau dataset Step 1? Mulai dari sini.*

</div>

---

## 🧭 Ke Mana Harus Bertanya?

| Kebutuhan | Tempatnya |
|:--|:--|
| 📖 Cara memasang, menjalankan, atau men-deploy | [README → Mulai dalam 60 Detik](./README.md#-mulai-dalam-60-detik) |
| 🛠️ Error umum (peta kosong, dataset tidak termuat, bendera hilang) | [README → Troubleshooting](./README.md#-troubleshooting) |
| 🐛 Menemukan bug di aplikasi | [Buka issue baru](https://github.com/NuRichter/Tempest_Eastern_Empire_War_Map/issues/new) |
| 📚 Menemukan kesalahan data (angka, urutan, lokasi) | [Buka issue baru](https://github.com/NuRichter/Tempest_Eastern_Empire_War_Map/issues/new) dengan bukti sumber |
| 💡 Ide fitur atau pertanyaan umum | [Issues](https://github.com/NuRichter/Tempest_Eastern_Empire_War_Map/issues) |
| ⚖️ Pertanyaan lisensi / permintaan takedown pemegang hak | Hubungi [@NuRichter](https://github.com/NuRichter) secara pribadi — lihat [LICENSE](./LICENSE) Bagian 17 |
| 🚨 Melaporkan pelanggaran Kode Etik | Lihat [CODE_OF_CONDUCT.md → Pelaporan](./CODE_OF_CONDUCT.md#-pelaporan) |

> [!NOTE]
> Ini proyek penggemar yang dikelola di waktu luang. Tidak ada SLA, tapi setiap issue yang rapi pasti dibaca. 💛

---

## ✅ Sebelum Membuka Issue

1. 🔎 **Cari dulu** di [issue yang sudah ada](https://github.com/NuRichter/Tempest_Eastern_Empire_War_Map/issues?q=is%3Aissue) — mungkin sudah pernah dibahas.
2. 🔄 **Compile ulang & validasi:**
   ```bash
   npm run compile-data
   npm run validate-data
   npm run validate-assets
   ```
3. 🧪 Jalankan `npm run verify` dan salin output yang gagal.
4. 🧩 Pastikan Node **≥ 20.11** (`node --version`) dan browser mendukung **WebGL 2**.

---

## 🐛 Melaporkan Bug Aplikasi

Sertakan:

- 💻 OS, browser + versinya, versi Node
- 🔢 Frame atau waktu kampanye saat bug muncul (tekan <kbd>d</kbd> untuk developer readout)
- 🪜 Langkah untuk mereproduksi
- 🎯 Yang diharapkan vs yang terjadi
- 🖼️ Screenshot atau output console bila ada

## 📚 Melaporkan Kesalahan Data

Dataset ini berpegang pada satu prinsip: **ketidaktahuan itu data, karangan itu bug.** Laporan data yang baik memuat:

- 🆔 ID yang terdampak (mis. `EVT-0102`, `TH-LAB`, `AMB-016`)
- 📖 Penunjuk sumber — **volume & bab saja**, tanpa kutipan verbatim
- 🧠 Kenapa menurutmu nilainya keliru, dan nilai apa yang didukung sumber
- 🏷️ Apakah itu fakta kanon atau rekonstruksi simulasi

> [!IMPORTANT]
> Laporan yang meminta `UNKNOWN` diganti angka taksiran, atau menambah detail tanpa sumber, akan ditutup dengan
> sopan. Ini bukan soal galak — integritas label adalah syarat lisensi ([LICENSE](./LICENSE) Bagian 8).

---

## 🚫 Yang Tidak Bisa Kami Bantu

- Menyediakan teks, terjemahan, atau berkas novel *Tensei Shitara Slime Datta Ken*
- Pertanyaan kanon di luar cakupan volume 12–16 yang tidak terkait dataset
- Penggunaan komersial atas dataset (Lapis B) — lihat [LICENSE](./LICENSE) Bagian 6

---

<div align="center">
<sub>Terima kasih sudah peduli pada peta ini. 🗺️✨</sub>
</div>
