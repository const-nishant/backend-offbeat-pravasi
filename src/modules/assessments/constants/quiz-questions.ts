export interface QuizOption {
  label: string;
  score: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  weight: number;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'exercise_frequency',
    question: 'How often do you exercise?',
    options: [
      { label: 'Never', score: 0 },
      { label: '1-2x week', score: 25 },
      { label: '3-5x week', score: 50 },
      { label: 'Daily', score: 100 },
    ],
    weight: 1.5,
  },
  {
    id: 'longest_walk',
    question: 'What is the longest trek/walk you have completed in one day?',
    options: [
      { label: '< 5 km', score: 0 },
      { label: '5-10 km', score: 25 },
      { label: '10-20 km', score: 50 },
      { label: '> 20 km', score: 100 },
    ],
    weight: 1.5,
  },
  {
    id: 'altitude_experience',
    question: 'What is the highest altitude you have been to?',
    options: [
      { label: 'Sea level (< 500m)', score: 0 },
      { label: 'Low hills (500-2000m)', score: 25 },
      { label: 'High hills (2000-4000m)', score: 50 },
      { label: 'Mountains (> 4000m)', score: 100 },
    ],
    weight: 1.5,
  },
  {
    id: 'camping_comfort',
    question: 'How comfortable are you with camping in basic conditions?',
    options: [
      { label: 'Not comfortable', score: 0 },
      { label: 'Somewhat comfortable', score: 25 },
      { label: 'Comfortable', score: 50 },
      { label: 'Very comfortable', score: 100 },
    ],
    weight: 1.0,
  },
  {
    id: 'medical_conditions',
    question: 'Do you have any medical conditions that could affect trekking?',
    options: [
      { label: 'Yes, significant concerns', score: 0 },
      { label: 'Yes, minor concerns', score: 25 },
      { label: 'No known conditions', score: 75 },
      { label: 'Excellent health', score: 100 },
    ],
    weight: 2.0,
  },
  {
    id: 'primary_goal',
    question: 'What is your primary goal for trekking?',
    options: [
      { label: 'Leisure / sightseeing', score: 25 },
      { label: 'Fitness challenge', score: 50 },
      { label: 'Adventure / thrill', score: 75 },
      { label: 'Summit / endurance', score: 100 },
    ],
    weight: 1.0,
  },
  {
    id: 'age_range',
    question: 'What is your age range?',
    options: [
      { label: 'Under 18', score: 50 },
      { label: '18-30', score: 100 },
      { label: '31-45', score: 75 },
      { label: '45+', score: 50 },
    ],
    weight: 1.0,
  },
  {
    id: 'prior_trek_count',
    question: 'How many treks have you completed in the last 2 years?',
    options: [
      { label: 'None', score: 0 },
      { label: '1-2 treks', score: 25 },
      { label: '3-5 treks', score: 50 },
      { label: '6+ treks', score: 100 },
    ],
    weight: 1.5,
  },
  {
    id: 'swimming_comfort',
    question: 'How comfortable are you swimming in natural water bodies?',
    options: [
      { label: 'Cannot swim', score: 0 },
      { label: 'Basic swimming', score: 25 },
      { label: 'Comfortable swimmer', score: 50 },
      { label: 'Very strong swimmer', score: 100 },
    ],
    weight: 0.5,
  },
  {
    id: 'sleeping_conditions',
    question: 'How do you feel about sleeping in shared accommodation / tents?',
    options: [
      { label: 'Very uncomfortable', score: 0 },
      { label: 'Prefer private', score: 25 },
      { label: 'Okay with it', score: 50 },
      { label: 'Prefer it', score: 100 },
    ],
    weight: 0.5,
  },
];

export function calculateScore(
  answers: { questionId: string; selectedOption: string }[],
): {
  totalScore: number;
  difficultyBracket: string;
} {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const answer of answers) {
    const question = QUIZ_QUESTIONS.find((q) => q.id === answer.questionId);
    if (!question) continue;

    const option = question.options.find(
      (o) => o.label === answer.selectedOption,
    );
    if (!option) continue;

    weightedSum += option.score * question.weight;
    totalWeight += question.weight;
  }

  if (totalWeight === 0) {
    return { totalScore: 0, difficultyBracket: 'EASY' };
  }

  const normalizedScore = Math.round(weightedSum / totalWeight);

  let difficultyBracket: string;
  if (normalizedScore <= 20) {
    difficultyBracket = 'EASY';
  } else if (normalizedScore <= 45) {
    difficultyBracket = 'MODERATE';
  } else if (normalizedScore <= 75) {
    difficultyBracket = 'DIFFICULT';
  } else {
    difficultyBracket = 'EXTREME';
  }

  return { totalScore: normalizedScore, difficultyBracket };
}
