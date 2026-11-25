import { t } from "./i18n/ru";

/** Все страны мира (ISO 3166-1 alpha-2), где есть вузы. */
export const ALL_COUNTRIES = (
  "AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW"
).split(" ");

const SET = new Set(ALL_COUNTRIES);
export const isCountry = (c: string) => SET.has(c);

/** Куда чаще всего поступают из Узбекистана — показываем первыми. */
export const POPULAR_COUNTRIES = ["US", "KR", "HU", "TR", "DE", "IT", "JP", "AE", "GB", "CA", "CN", "MY", "KZ", "RU", "PL", "CZ", "FR", "NL", "SG", "UZ"];

// Название страны по коду ISO2: сначала наш словарь, иначе — встроенный в браузер/Node.
let dn: Intl.DisplayNames | null = null;
export function countryName(code: string): string {
  const own = (t.countries as Record<string, string>)[code];
  if (own) return own;
  try {
    dn ??= new Intl.DisplayNames(["ru"], { type: "region" });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}
