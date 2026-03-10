const COUNTRIES = [
  { code: "RU", flag: "RU", name: { ru: "Россия", en: "Russia" } },
  { code: "US", flag: "US", name: { ru: "США", en: "United States" } },
  { code: "UA", flag: "UA", name: { ru: "Украина", en: "Ukraine" } },
  { code: "BY", flag: "BY", name: { ru: "Беларусь", en: "Belarus" } },
  { code: "KZ", flag: "KZ", name: { ru: "Казахстан", en: "Kazakhstan" } },
  { code: "PL", flag: "PL", name: { ru: "Польша", en: "Poland" } },
  { code: "DE", flag: "DE", name: { ru: "Германия", en: "Germany" } },
  { code: "FR", flag: "FR", name: { ru: "Франция", en: "France" } },
  { code: "GB", flag: "GB", name: { ru: "Великобритания", en: "United Kingdom" } },
  { code: "JP", flag: "JP", name: { ru: "Япония", en: "Japan" } },
  { code: "KR", flag: "KR", name: { ru: "Южная Корея", en: "South Korea" } },
  { code: "CN", flag: "CN", name: { ru: "Китай", en: "China" } },
  { code: "BR", flag: "BR", name: { ru: "Бразилия", en: "Brazil" } },
  { code: "MX", flag: "MX", name: { ru: "Мексика", en: "Mexico" } },
  { code: "CA", flag: "CA", name: { ru: "Канада", en: "Canada" } },
  { code: "AU", flag: "AU", name: { ru: "Австралия", en: "Australia" } },
  { code: "ES", flag: "ES", name: { ru: "Испания", en: "Spain" } },
  { code: "IT", flag: "IT", name: { ru: "Италия", en: "Italy" } },
  { code: "TR", flag: "TR", name: { ru: "Турция", en: "Turkey" } },
  { code: "SE", flag: "SE", name: { ru: "Швеция", en: "Sweden" } },
];

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

module.exports = {
  COUNTRIES,
  COUNTRY_BY_CODE,
};
