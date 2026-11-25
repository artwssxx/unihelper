// Стартовые списки вузов для подбора из общей базы — популярные у учеников из Узбекистана.
// Для остальных стран список один раз собирает ИИ (uni_country_tops). Названия — как в справочнике.
export const UNI_SEEDS: Record<string, string[]> = {
  KR: ["Seoul National University", "Korea Advanced Institute of Science", "Yonsei University", "Korea University", "Sungkyunkwan University", "Hanyang University", "Kyung Hee University", "Ajou University", "Inha University", "Pusan National University"],
  HU: ["Eötvös Loránd", "Budapest University of Technology", "University of Debrecen", "University of Szeged", "Corvinus", "University of Pécs", "Semmelweis"],
  TR: ["Middle East Technical University", "Bogazici", "Istanbul Technical University", "Bilkent", "Koc University", "Sabanci", "Hacettepe", "Ankara University"],
  US: ["Massachusetts Institute of Technology", "Harvard University", "Stanford University", "New York University", "Arizona State University", "Berea College", "University of Texas at Austin", "Purdue University", "Duke University", "University of Illinois"],
  DE: ["Technische Universität München", "RWTH Aachen", "Heidelberg", "Humboldt", "Freie Universität Berlin", "Technische Universität Berlin", "Karlsruhe"],
  IT: ["Politecnico di Milano", "Bologna", "Sapienza", "Padova", "Politecnico di Torino"],
  JP: ["University of Tokyo", "Kyoto University", "Osaka University", "Waseda", "Keio", "Tohoku University"],
  AE: ["New York University Abu Dhabi", "Khalifa University", "American University of Sharjah", "United Arab Emirates University"],
  UZ: ["Westminster", "Inha University in Tashkent", "Turin Polytechnic", "Webster University", "Amity", "Akfa", "Ajou University in Tashkent", "National University of Uzbekistan", "Tashkent University of Information Technologies", "Tashkent State University of Economics"],
  GB: ["University of Oxford", "University of Cambridge", "Imperial College", "University College London", "University of Edinburgh", "University of Manchester"],
};
