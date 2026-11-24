// IELTS Academic Writing — оригинальные учебные задания. Данные в Task 1 вымышленные (учебные).

export const WRITING_TEST_ID = "ielts-writing-1";

export const TASK1 = {
  title: "Writing Task 1",
  minutes: 20,
  minWords: 150,
  prompt:
    "The chart below shows the percentage of residents in four cities who used public transport on a typical weekday in 2010 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
  chart: {
    unit: "%",
    series: ["2010", "2020"],
    categories: [
      { label: "City A", values: [34, 52] },
      { label: "City B", values: [61, 58] },
      { label: "City C", values: [22, 41] },
      { label: "City D", values: [45, 47] },
    ],
  },
};

export const TASK2 = {
  title: "Writing Task 2",
  minutes: 40,
  minWords: 250,
  prompt:
    "Some people believe that universities should focus mainly on preparing students for employment. Others think that the purpose of higher education is much broader.\n\nDiscuss both views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.",
};
