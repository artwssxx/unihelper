import type { Passage, Question } from "../types";

// IELTS Academic Reading — оригинальный тест (не из книг Cambridge и других изданий).
// 3 текста нарастающей сложности, 40 вопросов: True/False/Not Given, sentence completion,
// matching headings, multiple choice, summary completion, Yes/No/Not Given.
// Написан вручную; перед выкаткой вычитать преподавателем (verified выставлен автором банка).

export const READING_TEST_ID = "ielts-reading-1";

export const PASSAGES: Passage[] = [
  {
    id: "p1",
    title: "The Shrinking Sea",
    text: `In the middle of the twentieth century, the Aral Sea, which lies on the border between present-day Kazakhstan and Uzbekistan, was one of the largest lakes in the world. Although it had no outlet to the ocean, its level remained fairly stable for centuries because two great rivers, the Amu Darya in the south and the Syr Darya in the north, carried enough water from distant mountains to balance the water lost through evaporation.

The balance began to change in the 1960s. Planners in the Soviet Union decided to turn the dry plains of Central Asia into a major cotton-growing region. Thousands of kilometres of irrigation canals were dug, and an increasing share of the two rivers was diverted to the fields. Many of these canals were unlined, so a large proportion of the water soaked into the sand or evaporated before it reached any crop. As the inflow fell, the sea began to retreat, slowly at first and then more quickly.

By the late 1980s, the sea had divided into two separate bodies of water: a smaller northern part and a larger southern part. The southern part continued to shrink and became so salty that most native fish species could no longer survive in it. Port towns that had once depended on fishing found themselves tens of kilometres from the shore. In Moynaq, in the Karakalpak region of Uzbekistan, rusting fishing boats now stand on dry ground, and they have become a well-known symbol of the disaster.

The environmental damage was not limited to the water itself. The exposed seabed, now often called the Aralkum Desert, is covered with salt and with residues of the fertilisers and pesticides that were washed down the rivers for decades. Strong winds lift this dust and carry it across the region, and local doctors have linked it to breathing problems among residents. The climate has also become harsher: without the moderating effect of a large body of water, summers in the area are reported to be hotter and winters colder than before.

The story, however, is not one of complete loss. In 2005, Kazakhstan completed a dam of about thirteen kilometres, known as the Kokaral Dam, which separates the northern part of the sea from the southern basin. Water from the Syr Darya is now held in the north instead of flowing south and evaporating. Within a few years the level of the northern sea rose noticeably, its salinity fell, and several fish species returned. Small-scale commercial fishing has restarted in nearby towns.

Restoring the southern part is a far greater challenge. It depends mainly on the Amu Darya, whose water is still heavily used for agriculture in several countries. Some projects now focus on planting salt-tolerant shrubs such as saxaul on the dry seabed to hold the soil in place and reduce dust storms. Scientists say that such efforts cannot bring the sea back, but they may make the region healthier for the people who live there.`,
  },
  {
    id: "p2",
    title: "How Sleep Shapes Memory",
    text: `A
For most of history, sleep was viewed as a passive state in which the brain simply rested. Over the past century, however, researchers have gathered strong evidence that sleep plays an active role in learning. Rather than merely protecting new memories from disturbance, the sleeping brain appears to reorganise and strengthen them.

B
One of the earliest studies on the subject was carried out in the 1920s. Two American psychologists asked volunteers to learn lists of nonsense syllables and then tested them after either a period of sleep or the same period of normal daytime activity. Recall was consistently better after sleep. The researchers concluded that the events of waking life interfere with new memories, and that sleep helps mainly by preventing this interference. This explanation was widely accepted for decades.

C
Later work suggested that the picture is more complex. Sleep is not a single uniform state: during the night the brain cycles through several stages, including deep or 'slow-wave' sleep and rapid eye movement (REM) sleep, when most vivid dreaming occurs. Experiments indicate that different stages may support different kinds of memory. Slow-wave sleep seems especially important for facts and events, while REM sleep has been associated with skills and with emotional memories.

D
Some of the most striking evidence comes from studies of animals. When a rat explores a maze, particular cells in the hippocampus, a brain region involved in memory, fire in a sequence that corresponds to its route. Researchers recording these cells found that the same sequences were repeated, at much higher speed, while the animal slept afterwards. This 'replay' is thought to be one way in which the brain transfers information from temporary storage to longer-lasting networks in the cortex.

E
These findings have practical implications, particularly for teenagers. During adolescence, the body clock naturally shifts later, so many teenagers find it difficult to fall asleep early. When schools begin very early in the morning, students may regularly lose the final hours of sleep, which are rich in REM sleep. Several school districts that moved their start times later reported that students slept longer and attended classes more regularly, although the effect on exam results has been less consistent.

F
For students preparing for important examinations, the message is clear. Staying up all night to revise may feel productive, but it deprives the brain of the very process that helps new information last. Researchers generally recommend spreading study sessions over several days and protecting a regular sleep schedule, especially in the days before a test.`,
  },
  {
    id: "p3",
    title: "Urban Beekeeping: Help or Hype?",
    text: `Over the last two decades, beehives have appeared on the rooftops of hotels, offices and apartment blocks in many of the world's major cities. Companies advertise their hives in annual reports, and city residents attend weekend courses to become hobby beekeepers. The movement is usually presented as a contribution to protecting pollinators, whose decline has received widespread attention. Yet a growing number of ecologists argue that the enthusiasm for urban honeybees is, at best, misplaced.

The central difficulty is that the honeybee is only one of many pollinating insects, and in most regions it is not the one in danger. Honeybees are managed livestock: their numbers are maintained by beekeepers who replace lost colonies, much as farmers manage cattle. Wild bees are a different matter. There are thousands of wild bee species, many of them solitary, nesting in the ground or in hollow stems, and it is among these species that the most serious declines have been recorded. In my view, describing rooftop hives as a way to 'save the bees' confuses two quite separate problems.

There is also evidence that adding large numbers of honeybees to a city can harm wild pollinators. A single colony may contain tens of thousands of workers, which collect nectar and pollen from the same flowers that wild bees depend on. Studies in several European cities have found that, as the density of hives increased, the number of wild bees observed on flowers fell. Honeybees can also spread diseases to other species when they visit the same plants. Not every study has found such effects, and the precise impact probably depends on how many flowers are available. Nevertheless, the risk is sufficient, I believe, to justify caution.

This does not mean that urban beekeeping has no value. Hives can be an effective way of teaching children and adults about insects, and the honey they produce is a pleasant reminder of the connection between cities and the natural world. The problem arises when beekeeping is presented as an environmental solution in itself, particularly by organisations that might otherwise invest in less visible but more useful measures.

What would such measures look like? The most important is to increase the quantity and variety of flowers available throughout the year. Many urban parks are dominated by closely mown grass, which offers pollinators almost nothing. Allowing some areas to grow longer, planting native flowering species and reducing the use of pesticides can all benefit wild bees as well as butterflies and other insects. Providing nesting sites is equally important: patches of bare, undisturbed soil and simple structures known as 'bee hotels' can support solitary species. These steps are often cheaper than maintaining hives, although they are less likely to attract publicity.

Some cities have begun to respond. A number of local authorities now require new commercial hives to be registered, and a few have published guidelines that link the number of permitted hives to the quantity of flowers in the surrounding area. Whether such rules will spread remains to be seen. What is clear is that a well-intentioned trend should be judged by its results rather than its image, and that the quiet work of planting flowers may achieve far more for pollinators than another hive on another roof.`,
  },
];

type Raw = Omit<Question, "exam" | "section" | "source" | "verified" | "answerType"> & { answerType?: Question["answerType"] };

const TFNG = ["TRUE", "FALSE", "NOT GIVEN"];
const YNNG = ["YES", "NO", "NOT GIVEN"];
const HEADINGS = [
  "i. An explanation that was later questioned",
  "ii. Evidence from brain activity during rest",
  "iii. Advice for those facing exams",
  "iv. A change in how scientists view sleep",
  "v. The dangers of sleeping pills",
  "vi. Separate roles for separate stages",
  "vii. A reason to rethink school timetables",
  "viii. Why some people need less sleep",
];

const Q: Raw[] = [
  // Passage 1 — T/F/NG
  { id: "r01", passageId: "p1", group: "Questions 1–7. Do the following statements agree with the information in Reading Passage 1? Choose TRUE, FALSE or NOT GIVEN.", domain: "Passage 1", skill: "True/False/Not Given", difficulty: 1,
    stem: "Before the 1960s, the level of the Aral Sea changed very little over long periods.", choices: TFNG, answer: "A",
    explanation: "«its level remained fairly stable for centuries» — TRUE." },
  { id: "r02", passageId: "p1", domain: "Passage 1", skill: "True/False/Not Given", difficulty: 1,
    stem: "The Aral Sea was connected to the ocean by a narrow channel.", choices: TFNG, answer: "B",
    explanation: "«it had no outlet to the ocean» — FALSE." },
  { id: "r03", passageId: "p1", domain: "Passage 1", skill: "True/False/Not Given", difficulty: 2,
    stem: "Much of the water in the irrigation canals was lost before it reached the crops.", choices: TFNG, answer: "A",
    explanation: "«a large proportion of the water soaked into the sand or evaporated before it reached any crop» — TRUE." },
  { id: "r04", passageId: "p1", domain: "Passage 1", skill: "True/False/Not Given", difficulty: 2,
    stem: "Cotton from Central Asia was mainly exported to Europe.", choices: TFNG, answer: "C",
    explanation: "Куда шёл хлопок, в тексте не сказано — NOT GIVEN." },
  { id: "r05", passageId: "p1", domain: "Passage 1", skill: "True/False/Not Given", difficulty: 2,
    stem: "The southern part of the sea became less salty after it separated from the northern part.", choices: TFNG, answer: "B",
    explanation: "Южная часть стала настолько солёной, что рыба не выживала, — FALSE." },
  { id: "r06", passageId: "p1", domain: "Passage 1", skill: "True/False/Not Given", difficulty: 2,
    stem: "Doctors have connected dust from the dry seabed with health problems.", choices: TFNG, answer: "A",
    explanation: "«local doctors have linked it to breathing problems» — TRUE." },
  { id: "r07", passageId: "p1", domain: "Passage 1", skill: "True/False/Not Given", difficulty: 3,
    stem: "The Kokaral Dam was paid for entirely by the government of Uzbekistan.", choices: TFNG, answer: "C",
    explanation: "Сказано только, что плотину завершил Казахстан; кто платил — не указано. NOT GIVEN (не FALSE: о финансировании ничего нет)." },
  // Passage 1 — sentence completion
  { id: "r08", passageId: "p1", group: "Questions 8–13. Complete the sentences. Choose NO MORE THAN TWO WORDS from the passage for each answer.", domain: "Passage 1", skill: "Sentence completion", difficulty: 1, answerType: "text",
    stem: "Soviet planners wanted Central Asia to become an important region for growing ______.", answer: "cotton",
    explanation: "«a major cotton-growing region»." },
  { id: "r09", passageId: "p1", domain: "Passage 1", skill: "Sentence completion", difficulty: 2, answerType: "text",
    stem: "Many irrigation canals were ______, which allowed water to soak into the sand.", answer: "unlined",
    explanation: "«Many of these canals were unlined»." },
  { id: "r10", passageId: "p1", domain: "Passage 1", skill: "Sentence completion", difficulty: 1, answerType: "text",
    stem: "In Moynaq, old ______ on dry land have become a symbol of the disaster.", answer: "fishing boats", accept: ["boats", "rusting fishing boats"],
    explanation: "«rusting fishing boats now stand on dry ground»." },
  { id: "r11", passageId: "p1", domain: "Passage 1", skill: "Sentence completion", difficulty: 2, answerType: "text",
    stem: "The dry former seabed is now often known as the ______.", answer: "Aralkum Desert", accept: ["Aralkum"],
    explanation: "«now often called the Aralkum Desert»." },
  { id: "r12", passageId: "p1", domain: "Passage 1", skill: "Sentence completion", difficulty: 2, answerType: "text",
    stem: "After the dam was built, the northern sea's level rose and its ______ fell.", answer: "salinity",
    explanation: "«its salinity fell»." },
  { id: "r13", passageId: "p1", domain: "Passage 1", skill: "Sentence completion", difficulty: 3, answerType: "text",
    stem: "Shrubs such as ______ are being planted to reduce dust storms.", answer: "saxaul",
    explanation: "«salt-tolerant shrubs such as saxaul»." },

  // Passage 2 — matching headings
  { id: "r14", passageId: "p2", group: "Questions 14–19. Reading Passage 2 has six paragraphs, A–F. Choose the correct heading for each paragraph from the list of headings (i–viii).", domain: "Passage 2", skill: "Matching headings", difficulty: 2,
    stem: "Paragraph A", choices: HEADINGS, answer: "D", explanation: "A — о смене взгляда на сон: из пассивного в активный процесс (iv)." },
  { id: "r15", passageId: "p2", domain: "Passage 2", skill: "Matching headings", difficulty: 2,
    stem: "Paragraph B", choices: HEADINGS, answer: "A", explanation: "B — объяснение 1920-х, которое потом пересмотрели (i): следующий абзац начинается с «Later work suggested… more complex»." },
  { id: "r16", passageId: "p2", domain: "Passage 2", skill: "Matching headings", difficulty: 2,
    stem: "Paragraph C", choices: HEADINGS, answer: "F", explanation: "C — разные стадии сна поддерживают разную память (vi)." },
  { id: "r17", passageId: "p2", domain: "Passage 2", skill: "Matching headings", difficulty: 3,
    stem: "Paragraph D", choices: HEADINGS, answer: "B", explanation: "D — «replay» клеток гиппокампа у спящих крыс (ii)." },
  { id: "r18", passageId: "p2", domain: "Passage 2", skill: "Matching headings", difficulty: 2,
    stem: "Paragraph E", choices: HEADINGS, answer: "G", explanation: "E — подростки и время начала уроков (vii)." },
  { id: "r19", passageId: "p2", domain: "Passage 2", skill: "Matching headings", difficulty: 1,
    stem: "Paragraph F", choices: HEADINGS, answer: "C", explanation: "F — советы перед экзаменами (iii)." },
  // Passage 2 — multiple choice
  { id: "r20", passageId: "p2", group: "Questions 20–23. Choose the correct letter, A, B, C or D.", domain: "Passage 2", skill: "Multiple choice", difficulty: 2,
    stem: "According to the researchers in the 1920s, sleep improves recall mainly because it",
    choices: ["creates new brain cells.", "prevents waking experiences from interfering with memories.", "increases the time spent dreaming.", "makes nonsense syllables easier to pronounce."], answer: "B",
    explanation: "«sleep helps mainly by preventing this interference»." },
  { id: "r21", passageId: "p2", domain: "Passage 2", skill: "Multiple choice", difficulty: 2,
    stem: "Which type of memory is most closely associated with slow-wave sleep?",
    choices: ["Physical skills", "Emotional memories", "Facts and events", "Dreams"], answer: "C",
    explanation: "«Slow-wave sleep seems especially important for facts and events»." },
  { id: "r22", passageId: "p2", domain: "Passage 2", skill: "Multiple choice", difficulty: 3,
    stem: "During sleep, the 'replay' observed in rats",
    choices: ["happened more slowly than the original exploration.", "occurred in cells unrelated to the maze.", "repeated the sequence much faster than during exploration.", "stopped once the rat began to dream."], answer: "C",
    explanation: "«the same sequences were repeated, at much higher speed»." },
  { id: "r23", passageId: "p2", domain: "Passage 2", skill: "Multiple choice", difficulty: 3,
    stem: "What does the writer say about later school start times?",
    choices: ["They clearly improved exam results everywhere.", "They led to longer sleep and better attendance, but mixed effects on exam results.", "They made students less willing to attend.", "They were rejected by most school districts."], answer: "B",
    explanation: "«slept longer and attended classes more regularly, although the effect on exam results has been less consistent»." },
  // Passage 2 — summary completion
  { id: "r24", passageId: "p2", group: "Questions 24–26. Complete the summary. Choose ONE WORD ONLY from the passage for each answer.", domain: "Passage 2", skill: "Summary completion", difficulty: 2, answerType: "text",
    stem: "In adolescence, the body ______ shifts later, making early sleep difficult.", answer: "clock",
    explanation: "«the body clock naturally shifts later»." },
  { id: "r25", passageId: "p2", domain: "Passage 2", skill: "Summary completion", difficulty: 3, answerType: "text",
    stem: "Early school starts can cut the final hours of sleep, which contain a lot of ______ sleep.", answer: "REM",
    explanation: "«the final hours of sleep, which are rich in REM sleep»." },
  { id: "r26", passageId: "p2", domain: "Passage 2", skill: "Summary completion", difficulty: 2, answerType: "text",
    stem: "Researchers advise students to spread study sessions over several days and keep a ______ sleep schedule.", answer: "regular",
    explanation: "«protecting a regular sleep schedule»." },

  // Passage 3 — multiple choice
  { id: "r27", passageId: "p3", group: "Questions 27–31. Choose the correct letter, A, B, C or D.", domain: "Passage 3", skill: "Multiple choice", difficulty: 2,
    stem: "How is urban beekeeping usually presented, according to the first paragraph?",
    choices: ["As a profitable business", "As a way of protecting pollinators", "As a dangerous hobby", "As a scientific experiment"], answer: "B",
    explanation: "«presented as a contribution to protecting pollinators»." },
  { id: "r28", passageId: "p3", domain: "Passage 3", skill: "Multiple choice", difficulty: 3,
    stem: "The writer compares honeybees to cattle in order to show that honeybees",
    choices: ["are kept mainly for their meat.", "are managed by people who maintain their numbers.", "are larger than wild bees.", "need large areas of grass."], answer: "B",
    explanation: "«their numbers are maintained by beekeepers who replace lost colonies, much as farmers manage cattle»." },
  { id: "r29", passageId: "p3", domain: "Passage 3", skill: "Multiple choice", difficulty: 2,
    stem: "Where have the most serious bee declines been recorded?",
    choices: ["Among honeybee colonies on rooftops", "Among wild bee species", "In rural honey farms", "In hotel gardens"], answer: "B",
    explanation: "«it is among these species [wild bees] that the most serious declines have been recorded»." },
  { id: "r30", passageId: "p3", domain: "Passage 3", skill: "Multiple choice", difficulty: 3,
    stem: "What did studies in several European cities find?",
    choices: ["Wild bees increased as hives were added.", "Fewer wild bees were seen on flowers as hive density increased.", "Honeybees avoided city flowers.", "Hive density had no connection with flowers."], answer: "B",
    explanation: "«as the density of hives increased, the number of wild bees observed on flowers fell»." },
  { id: "r31", passageId: "p3", domain: "Passage 3", skill: "Multiple choice", difficulty: 3,
    stem: "Why, according to the writer, are flower-planting measures less common than hives?",
    choices: ["They are much more expensive.", "They are less likely to attract publicity.", "They harm butterflies.", "They are illegal in many cities."], answer: "B",
    explanation: "«These steps are often cheaper… although they are less likely to attract publicity»." },
  // Passage 3 — Yes/No/Not Given
  { id: "r32", passageId: "p3", group: "Questions 32–36. Do the following statements agree with the views of the writer in Reading Passage 3? Choose YES, NO or NOT GIVEN.", domain: "Passage 3", skill: "Yes/No/Not Given", difficulty: 2,
    stem: "Calling rooftop hives a way to 'save the bees' mixes up two different problems.", choices: YNNG, answer: "A",
    explanation: "«In my view, describing rooftop hives as a way to 'save the bees' confuses two quite separate problems» — YES." },
  { id: "r33", passageId: "p3", domain: "Passage 3", skill: "Yes/No/Not Given", difficulty: 3,
    stem: "Every study has shown that honeybees harm wild pollinators.", choices: YNNG, answer: "B",
    explanation: "«Not every study has found such effects» — NO." },
  { id: "r34", passageId: "p3", domain: "Passage 3", skill: "Yes/No/Not Given", difficulty: 2,
    stem: "Urban beekeeping has some educational value.", choices: YNNG, answer: "A",
    explanation: "«Hives can be an effective way of teaching children and adults about insects» — YES." },
  { id: "r35", passageId: "p3", domain: "Passage 3", skill: "Yes/No/Not Given", difficulty: 3,
    stem: "Honey produced in cities tastes better than honey from the countryside.", choices: YNNG, answer: "C",
    explanation: "О вкусе городского мёда автор мнения не высказывает — NOT GIVEN." },
  { id: "r36", passageId: "p3", domain: "Passage 3", skill: "Yes/No/Not Given", difficulty: 3,
    stem: "Trends that aim to help the environment should be judged by what they achieve.", choices: YNNG, answer: "A",
    explanation: "«a well-intentioned trend should be judged by its results rather than its image» — YES." },
  // Passage 3 — sentence completion
  { id: "r37", passageId: "p3", group: "Questions 37–40. Complete the sentences. Choose NO MORE THAN TWO WORDS from the passage for each answer.", domain: "Passage 3", skill: "Sentence completion", difficulty: 2, answerType: "text",
    stem: "Many wild bees are ______ and nest in the ground or in hollow stems.", answer: "solitary",
    explanation: "«many of them solitary, nesting in the ground or in hollow stems»." },
  { id: "r38", passageId: "p3", domain: "Passage 3", skill: "Sentence completion", difficulty: 2, answerType: "text",
    stem: "Parks covered with closely mown ______ offer pollinators almost nothing.", answer: "grass",
    explanation: "«closely mown grass, which offers pollinators almost nothing»." },
  { id: "r39", passageId: "p3", domain: "Passage 3", skill: "Sentence completion", difficulty: 2, answerType: "text",
    stem: "Simple structures called ______ can support solitary bee species.", answer: "bee hotels",
    explanation: "«simple structures known as 'bee hotels'»." },
  { id: "r40", passageId: "p3", domain: "Passage 3", skill: "Sentence completion", difficulty: 3, answerType: "text",
    stem: "Some local authorities now require new commercial hives to be ______.", answer: "registered",
    explanation: "«require new commercial hives to be registered»." },
];

export function buildReadingBank(): Question[] {
  return Q.map((q) => ({
    ...q,
    exam: "ielts",
    section: "reading",
    answerType: q.answerType ?? "mcq",
    source: "human",
    verified: true,
  }));
}
