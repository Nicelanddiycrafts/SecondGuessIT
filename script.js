const state = {
  cards: [],
  deck: [],
  index: 0,
  score: 0,
  streak: 0,
  answered: false
};

const MISSION_SEEN_KEY = 'secondguessit-mission-seen';

const elements = {
  missionScreen: document.getElementById('missionScreen'),
  homeScreen: document.getElementById('homeScreen'),
  gameScreen: document.getElementById('gameScreen'),
  errorScreen: document.getElementById('errorScreen'),
  gameStatus: document.getElementById('gameStatus'),
  missionButton: document.getElementById('missionButton'),
  missionStartButton: document.getElementById('missionStartButton'),
  startButton: document.getElementById('startButton'),
  brandLink: document.getElementById('brandLink'),
  score: document.getElementById('score'),
  streak: document.getElementById('streak'),
  questionFace: document.getElementById('questionFace'),
  category: document.getElementById('category'),
  title: document.getElementById('cardTitle'),
  setup: document.getElementById('setup'),
  question: document.getElementById('question'),
  choices: document.getElementById('choices'),
  reveal: document.getElementById('reveal'),
  resultBadge: document.getElementById('resultBadge'),
  resultIcon: document.getElementById('resultIcon'),
  resultTitle: document.getElementById('resultTitle'),
  resultMessage: document.getElementById('resultMessage'),
  correctAnswer: document.getElementById('correctAnswer'),
  explanation: document.getElementById('explanation'),
  originalIncident: document.getElementById('originalIncident'),
  storyLink: document.getElementById('storyLink'),
  nextButton: document.getElementById('nextButton')
};

function hasSeenMission() {
  try {
    return localStorage.getItem(MISSION_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function rememberMission() {
  try {
    localStorage.setItem(MISSION_SEEN_KEY, 'true');
  } catch {
    // The game still works when storage is unavailable.
  }
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function buildDeck(cards) {
  const groups = new Map();

  cards.forEach((card) => {
    const category = card.category || 'AI in the real world';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(card);
  });

  const shuffledGroups = [...groups.values()].map(shuffle);
  const deck = [];

  while (shuffledGroups.some((group) => group.length)) {
    shuffle(shuffledGroups)
      .filter((group) => group.length)
      .forEach((group) => deck.push(group.pop()));
  }

  return deck;
}

function isValidCard(card) {
  return (
    card &&
    typeof card.title === 'string' &&
    typeof card.setup === 'string' &&
    typeof card.question === 'string' &&
    Array.isArray(card.choices) &&
    card.choices.length === 4 &&
    card.choices.includes(card.correct_choice)
  );
}

async function loadCards() {
  const response = await fetch('cards.json');
  if (!response.ok) throw new Error(`Card request failed: ${response.status}`);

  const cards = await response.json();
  if (!Array.isArray(cards)) throw new Error('Card data is not an array.');

  state.cards = cards.filter(isValidCard);
  if (!state.cards.length) throw new Error('No valid cards were found.');
}

function updateScoreboard() {
  elements.score.textContent = state.score;
  elements.streak.textContent = state.streak;
}

function createChoiceButton(choice, index) {
  const button = document.createElement('button');
  const letter = String.fromCharCode(65 + index);

  button.type = 'button';
  button.className = 'choice-button';
  button.dataset.choice = choice;
  button.setAttribute('aria-label', `${letter}. ${choice}`);

  const letterElement = document.createElement('span');
  letterElement.className = 'choice-letter';
  letterElement.textContent = letter;

  const textElement = document.createElement('span');
  textElement.textContent = choice;

  const stateElement = document.createElement('span');
  stateElement.className = 'choice-state';
  stateElement.setAttribute('aria-hidden', 'true');

  button.append(letterElement, textElement, stateElement);
  button.addEventListener('click', () => answerCard(choice));
  return button;
}

function safeStoryUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function renderCard() {
  const card = state.deck[state.index];
  state.answered = false;

  elements.category.textContent = card.category || 'AI in the real world';
  elements.title.textContent = card.title;
  elements.setup.textContent = card.setup;
  elements.question.textContent = card.question || 'What happened next?';
  const shuffledChoices = shuffle(card.choices);
  elements.choices.replaceChildren(...shuffledChoices.map(createChoiceButton));
  elements.questionFace.hidden = false;
  elements.reveal.hidden = true;
  updateScoreboard();

  requestAnimationFrame(() => elements.title.focus());
}

function answerCard(selectedChoice) {
  if (state.answered) return;
  state.answered = true;

  const card = state.deck[state.index];
  const isCorrect = selectedChoice === card.correct_choice;

  if (isCorrect) {
    state.score += 10;
    state.streak += 1;
  } else {
    state.streak = 0;
  }

  elements.resultBadge.classList.toggle('wrong', !isCorrect);
  elements.resultIcon.textContent = isCorrect ? '✓' : '×';
  elements.resultTitle.textContent = isCorrect ? 'You got it!' : 'Plot twist!';
  elements.resultMessage.textContent = isCorrect
    ? (state.streak >= 3 ? `${state.streak} in a row — nicely spotted.` : 'Good catch. That was a tricky one.')
    : 'Not the ending you expected?';
  elements.correctAnswer.textContent = card.correct_choice;
  elements.explanation.textContent = card.explanation || '';
  elements.originalIncident.textContent = card.original_description || '';

  const storyUrl = safeStoryUrl(card.article_url);
  elements.storyLink.hidden = !storyUrl;
  if (storyUrl) elements.storyLink.href = storyUrl;

  elements.questionFace.hidden = true;
  elements.reveal.hidden = false;
  updateScoreboard();
  elements.resultTitle.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextCard() {
  if (!state.answered) return;

  state.index += 1;
  if (state.index >= state.deck.length) {
    state.deck = buildDeck(state.cards);
    state.index = 0;
  }

  renderCard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startGame() {
  rememberMission();
  state.deck = buildDeck(state.cards);
  state.index = 0;
  state.score = 0;
  state.streak = 0;
  elements.missionScreen.hidden = true;
  elements.homeScreen.hidden = true;
  elements.errorScreen.hidden = true;
  elements.gameScreen.hidden = false;
  elements.gameStatus.hidden = false;
  renderCard();
}

function showHome() {
  const showMission = !hasSeenMission();
  elements.missionScreen.hidden = !showMission;
  elements.homeScreen.hidden = showMission;
  elements.gameScreen.hidden = true;
  elements.errorScreen.hidden = true;
  elements.gameStatus.hidden = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showMission() {
  elements.missionScreen.hidden = false;
  elements.homeScreen.hidden = true;
  elements.gameScreen.hidden = true;
  elements.errorScreen.hidden = true;
  elements.gameStatus.hidden = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLoadError(error) {
  console.error(error);
  elements.missionScreen.hidden = true;
  elements.homeScreen.hidden = true;
  elements.gameScreen.hidden = true;
  elements.gameStatus.hidden = true;
  elements.errorScreen.hidden = false;
}

elements.missionStartButton.addEventListener('click', startGame);
elements.missionButton.addEventListener('click', showMission);
elements.startButton.addEventListener('click', startGame);
elements.nextButton.addEventListener('click', nextCard);
elements.brandLink.addEventListener('click', (event) => {
  event.preventDefault();
  showHome();
});

document.addEventListener('keydown', (event) => {
  if (elements.gameScreen.hidden) return;

  if (!state.answered && ['1', '2', '3', '4'].includes(event.key)) {
    elements.choices.children[Number(event.key) - 1]?.click();
  } else if (state.answered && event.key === 'Enter') {
    nextCard();
  }
});

loadCards()
  .then(() => {
    elements.missionStartButton.disabled = false;
    elements.missionStartButton.textContent = 'Start Playing';
    elements.startButton.disabled = false;
    elements.startButton.textContent = 'Deal me a card';

    const playRequested = new URLSearchParams(window.location.search).get('play') === '1';
    if (playRequested) {
      startGame();
    } else if (window.location.hash === '#mission' || !hasSeenMission()) {
      elements.missionScreen.hidden = false;
    } else {
      elements.homeScreen.hidden = false;
    }
  })
  .catch(showLoadError);
