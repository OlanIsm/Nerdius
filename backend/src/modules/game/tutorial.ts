import type { Region } from "./types.ts";

const lessons = [
  {
    title: "Reaksi Terang", material: "Reaksi terang terjadi pada membran tilakoid kloroplas. Klorofil menangkap energi cahaya. Pemecahan air menghasilkan oksigen, sedangkan transfer elektron membantu membentuk ATP dan NADPH untuk siklus Calvin.",
    questions: [
      ["Di mana reaksi terang berlangsung?", ["Membran tilakoid", "Inti sel", "Sitoplasma", "Dinding sel"], 0, "Reaksi terang berlangsung pada membran tilakoid di kloroplas."],
      ["Dari molekul apa oksigen pada fotosintesis berasal?", ["Karbon dioksida", "Air", "Glukosa", "ATP"], 1, "Pemecahan air pada reaksi terang melepaskan oksigen."],
      ["Apa hasil reaksi terang yang digunakan oleh siklus Calvin?", ["Oksigen dan air", "Glukosa dan air", "ATP dan NADPH", "Nitrogen dan oksigen"], 2, "ATP menyediakan energi dan NADPH menyediakan elektron untuk siklus Calvin."],
      ["Pigmen apa yang menangkap cahaya?", ["Klorofil", "Hemoglobin", "Melanin", "Keratin"], 0, "Klorofil menangkap energi cahaya di kloroplas."],
      ["Apa fungsi ATP hasil reaksi terang?", ["Menyimpan gen", "Menyediakan energi untuk siklus Calvin", "Membentuk dinding sel", "Menghancurkan klorofil"], 1, "ATP menyediakan energi untuk siklus Calvin."],
      ["Apa fungsi NADPH pada fotosintesis?", ["Mengangkut oksigen", "Menjadi pigmen", "Menyediakan elektron", "Membentuk inti sel"], 2, "NADPH membawa elektron untuk pembentukan senyawa organik."],
      ["Apa yang dipecah ketika oksigen dilepaskan?", ["Air", "ATP", "Glukosa", "Karbon dioksida"], 0, "Pemecahan air melepaskan oksigen pada reaksi terang."],
      ["Energi awal reaksi terang berasal dari apa?", ["Suara", "Cahaya", "Garam", "Nitrogen"], 1, "Energi cahaya ditangkap klorofil."],
      ["Reaksi terang berlangsung di organel apa?", ["Inti sel", "Ribosom", "Kloroplas", "Lisosom"], 2, "Membran tilakoid berada di kloroplas."],
      ["Mengapa reaksi terang mendukung siklus Calvin?", ["Menghasilkan ATP dan NADPH", "Menghilangkan semua air", "Mengubah inti menjadi kloroplas", "Menghentikan pembentukan gula"], 0, "ATP dan NADPH menyediakan energi dan elektron bagi siklus Calvin."],
    ],
  },
  {
    title: "Siklus Calvin", material: "Siklus Calvin terjadi di stroma kloroplas. Rubisco membantu mengikat karbon dioksida pada RuBP. ATP dan NADPH dari reaksi terang digunakan untuk menghasilkan G3P, bahan pembentuk gula, serta meregenerasi RuBP.",
    questions: [
      ["Di mana siklus Calvin terjadi?", ["Stroma", "Membran sel", "Inti sel", "Mitokondria"], 0, "Siklus Calvin berlangsung di stroma kloroplas."],
      ["Gas apa yang diikat pada siklus Calvin?", ["Oksigen", "Karbon dioksida", "Nitrogen", "Hidrogen"], 1, "Karbon dioksida menjadi sumber karbon untuk pembentukan gula."],
      ["Enzim apa yang membantu fiksasi karbon?", ["Amilase", "Pepsin", "Rubisco", "Lipase"], 2, "Rubisco membantu mengikat karbon dioksida pada RuBP."],
      ["Molekul apa yang menerima karbon dioksida?", ["RuBP", "Oksigen", "Klorofil", "Air"], 0, "Karbon dioksida diikat pada RuBP dengan bantuan Rubisco."],
      ["Apa bahan pembentuk gula hasil siklus Calvin?", ["Nitrogen", "G3P", "Oksigen", "Klorofil"], 1, "G3P dapat digunakan untuk membentuk gula."],
      ["Dari mana ATP untuk siklus Calvin berasal?", ["Dinding sel", "Pemecahan nitrogen", "Reaksi terang", "Inti sel"], 2, "Reaksi terang menyediakan ATP untuk siklus Calvin."],
      ["Apa sumber elektron bagi siklus Calvin?", ["NADPH", "Oksigen", "RuBP saja", "Nitrogen"], 0, "NADPH menyediakan elektron untuk menghasilkan G3P."],
      ["Mengapa RuBP diregenerasi?", ["Menghilangkan karbon", "Agar dapat menerima karbon dioksida lagi", "Membuat oksigen", "Menghentikan fotosintesis"], 1, "Regenerasi RuBP memungkinkan siklus terus mengikat karbon dioksida."],
      ["Apa sumber karbon untuk pembentukan gula?", ["ATP", "Cahaya", "Karbon dioksida", "Oksigen"], 2, "Karbon dalam gula berasal dari karbon dioksida yang difiksasi."],
      ["Apa peran utama Rubisco dalam materi ini?", ["Membantu fiksasi karbon", "Menangkap cahaya", "Memecah air", "Membentuk dinding sel"], 0, "Rubisco membantu pengikatan karbon dioksida pada RuBP."],
    ],
  },
  {
    title: "Metabolisme", material: "Fotosintesis menyimpan energi cahaya sebagai energi kimia dalam senyawa organik. Respirasi sel melepaskan energi dari senyawa organik untuk membentuk ATP. Tumbuhan melakukan fotosintesis dan respirasi; respirasi juga berlangsung ketika tidak ada cahaya.",
    questions: [
      ["Bagaimana fotosintesis mengubah energi?", ["Cahaya menjadi energi kimia", "Panas menjadi bunyi", "Kimia menjadi cahaya", "Bunyi menjadi listrik"], 0, "Fotosintesis menyimpan energi cahaya dalam senyawa organik."],
      ["Apakah tumbuhan melakukan respirasi sel?", ["Tidak pernah", "Ya", "Hanya setelah mati", "Hanya di bunga"], 1, "Tumbuhan melakukan respirasi untuk mendapatkan ATP dari senyawa organik."],
      ["Apa fungsi utama ATP dalam sel?", ["Membentuk dinding sel saja", "Menyimpan informasi genetik", "Menyediakan energi untuk proses sel", "Menggantikan semua enzim"], 2, "ATP menyediakan energi untuk berbagai proses di dalam sel."],
      ["Di mana energi cahaya disimpan setelah fotosintesis?", ["Senyawa organik", "Gelombang suara", "Nitrogen udara", "Inti atom"], 0, "Fotosintesis menyimpan energi sebagai energi kimia dalam senyawa organik."],
      ["Apa fungsi respirasi sel?", ["Menangkap semua cahaya", "Melepaskan energi untuk membentuk ATP", "Menghapus informasi genetik", "Menghentikan metabolisme"], 1, "Respirasi melepaskan energi dari senyawa organik untuk menghasilkan ATP."],
      ["Kapan tumbuhan dapat melakukan respirasi?", ["Hanya setelah mati", "Hanya saat berbunga", "Saat ada atau tidak ada cahaya", "Tidak pernah"], 2, "Respirasi tumbuhan juga berlangsung tanpa cahaya."],
      ["Apa bentuk energi yang tersimpan dalam gula?", ["Energi kimia", "Energi bunyi", "Energi nuklir", "Energi magnet"], 0, "Gula adalah senyawa organik yang menyimpan energi kimia."],
      ["Proses apa yang menyimpan energi cahaya?", ["Respirasi saja", "Fotosintesis", "Pencernaan saja", "Pembekuan"], 1, "Fotosintesis mengubah energi cahaya menjadi energi kimia."],
      ["Dari bahan apa respirasi sel melepaskan energi?", ["Suara", "Cahaya saja", "Senyawa organik", "Pasir"], 2, "Respirasi melepaskan energi dari senyawa organik."],
      ["Pernyataan mana sesuai materi?", ["Tumbuhan melakukan fotosintesis dan respirasi", "Tumbuhan tidak membutuhkan ATP", "Respirasi hanya dilakukan hewan", "Fotosintesis menghasilkan energi bunyi"], 0, "Tumbuhan menyimpan energi melalui fotosintesis dan memperoleh ATP melalui respirasi."],
    ],
  },
] as const;

export function tutorialRegions(): Region[] {
  return lessons.map((lesson, index) => ({
    chapter: index + 1, title: lesson.title, summary: lesson.material, material: lesson.material,
    topics: [lesson.title], questions: lesson.questions.length, enemies: 5,
    questionBank: lesson.questions.map(([prompt, options, answerIndex, explanation], questionIndex) => ({
      id: `${index + 1}-${questionIndex + 1}`, prompt, options: [...options], answerIndex, explanation, sourcePage: 1,
    })),
  }));
}
