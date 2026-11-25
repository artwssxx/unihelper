// Названия предметов на разных языках для распознавания (ru, uz латиница и кириллица, en). Не интерфейс —
// файл не переводится (scripts/i18n-extract.mjs его пропускает).
import type { SubjectKey } from "./grades";

// Порядок важен: более узкие названия раньше общих («ingliz tili» раньше «tili»).
export const ALIASES: [SubjectKey, string[]][] = [
  ["military", ["чақирувгача", "chaqiruvga", "chaqiruvgacha", "чбт", "chbt", "допризыв", "нвп"]],
  ["informatics", ["информатик", "информацион", "informatika", "axborot texnolog", "ахборот технолог", "computer science", "informatics", "programming", "программирован", "ict"]],
  ["math", ["математ", "matemat", "алгебр", "algebra", "геометр", "geometr", "mathematics", "math", "calculus"]],
  ["physics", ["физик", "fizika", "physics", "астроном", "astronom"]],
  ["chemistry", ["хими", "кимё", "kimyo", "chemistry"]],
  ["biology", ["биолог", "biolog", "эколог", "ekolog", "ecology", "анатом", "anatom"]],
  ["english", ["англ", "инглиз", "ingliz", "english"]],
  ["russian", ["русский", "рус тили", "rus tili", "russian"]],
  ["foreign", ["немец", "немис", "nemis", "француз", "fransuz", "араб", "arab tili", "корей", "koreys", "китай", "xitoy", "турец", "turk tili", "german", "french", "spanish", "испан", "иностран", "chet til"]],
  ["native", ["родной", "она тили", "ona tili", "узбекск", "ўзбек тили", "o'zbek tili", "ozbek tili", "uzbek", "каракалп", "qoraqalpoq", "казах", "qozoq", "таджик", "tojik", "давлат тили", "davlat tili"]],
  ["literature", ["литератур", "адабиёт", "adabiyot", "literature"]],
  ["history", ["истори", "тарих", "tarix", "history"]],
  ["geography", ["географ", "geograf", "geography"]],
  ["economics", ["эконом", "иқтисод", "iqtisod", "economics", "economy", "бизнес", "biznes", "тадбиркор", "tadbirkor"]],
  ["law", ["право", "ҳуқуқ", "huquq", "law", "конституц", "konstitutsiya", "граждан", "fuqarolik"]],
  ["drawing", ["черчен", "чизмачилик", "chizmachilik", "technical drawing"]],
  ["art", ["изобразит", "рисован", "тасвирий", "tasviriy", "fine art", "art"]],
  ["music", ["музык", "мусиқа", "musiqa", "music"]],
  ["pe", ["физкульт", "физическ", "жисмоний", "jismoniy", "physical education", "sport", "спорт"]],
  ["tech", ["технолог", "texnolog", "труд", "mehnat", "меҳнат", "technology"]],
  ["upbringing", ["тарбия", "tarbiya", "воспитан", "одобнома", "odobnoma", "ахлоқ", "axloq"]],
];
