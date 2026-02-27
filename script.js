let QUESTIONS = [];
let deck = [];
let idx = 0;
let score = 0;
let streak = 0;
let locked = false;
let started = false;
let totalAnswered = 0;

const qText = document.getElementById('qText');
const aiText = document.getElementById('aiText');
const reveal = document.getElementById('reveal');
const yourGuess = document.getElementById('yourGuess');
const truth = document.getElementById('truth');
const verdict = document.getElementById('verdict');
const explain = document.getElementById('explain');
const sourceEl = document.getElementById('source');

const elScore = document.getElementById('score');
const elStreak = document.getElementById('streak');
const elProgress = document.getElementById('progress');

const btnCorrect = document.getElementById('btnCorrect');
const btnIncorrect = document.getElementById('btnIncorrect');
const btnNext = document.getElementById('btnNext');
const btnRestart = document.getElementById('btnRestart');

const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const btnStart = document.getElementById('btnStart');

function fisherYatesShuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function parseCSV(text){
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for(let i=0;i<text.length;i++){
    const ch = text[i];
    const next = text[i+1];

    if(ch === '"'){
      if(inQuotes && next === '"'){
        field += '"';
        i += 1;
      }else{
        inQuotes = !inQuotes;
      }
      continue;
    }

    if(ch === ',' && !inQuotes){
      row.push(field);
      field = '';
      continue;
    }

    if((ch === '\n' || ch === '\r') && !inQuotes){
      if(ch === '\r' && next === '\n'){ i += 1; }
      row.push(field);
      if(row.length > 1 || row[0] !== ''){
        rows.push(row);
      }
      row = [];
      field = '';
      continue;
    }

    field += ch;
  }

  row.push(field);
  if(row.length > 1 || row[0] !== ''){
    rows.push(row);
  }

  if(!rows.length) return [];
  const headers = rows[0].map(h => String(h || '').trim());
  return rows.slice(1).map(cols => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx] ?? ''; });
    return obj;
  });
}

// Interleave by category/type to avoid streaks
function interleaveByCategory(items){
  const key = items.some(x=>x.category) ? 'category' : (items.some(x=>x.type) ? 'type' : null);
  if(!key) return fisherYatesShuffle(items);

  const groups = new Map();
  for(const it of items){
    const k = String(it[key] ?? 'Other');
    if(!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }

  for(const [k, arr] of groups.entries()){
    groups.set(k, fisherYatesShuffle(arr));
  }

  const keys = Array.from(groups.keys()).sort((a,b)=>groups.get(b).length - groups.get(a).length);

  const out = [];
  let added = true;
  while(added){
    added = false;
    for(const k of keys){
      const arr = groups.get(k);
      if(arr && arr.length){
        out.push(arr.pop());
        added = true;
      }
    }
  }
  return out;
}

function normalizeLabel(l){
  return String(l || '').trim().toLowerCase();
}

function updateStats(){
  elScore.textContent = String(score);
  elStreak.textContent = String(streak);
  elProgress.textContent = started ? String(totalAnswered) : '0';
}

function setButtonsForAnswerPhase(){
  btnCorrect.disabled = true;
  btnIncorrect.disabled = true;
  btnNext.disabled = false;
}

function setButtonsForGuessPhase(){
  btnCorrect.disabled = false;
  btnIncorrect.disabled = false;
  btnNext.disabled = true;
}

function safeExplanation(item){
  const ai = String(item.ai_answer ?? '').trim();
  const exp = String(item.explanation ?? '').trim();
  if(!exp) return '';
  if(ai && exp && ai.toLowerCase() === exp.toLowerCase()){
    return 'Explanation: ' + exp; // guarantees not identical
  }
  return 'Explanation: ' + exp;
}

function safeSource(item){
  const src = String(item.source ?? '').trim();
  return src ? ('Source: ' + src) : '';
}

function renderCard(){
  locked = false;
  const item = deck[idx];

  qText.textContent = item.question || '—';
  aiText.textContent = item.ai_answer || '—';

  reveal.hidden = true;
  yourGuess.className = 'chip';
  truth.className = 'chip';
  verdict.className = 'chip';
  verdict.textContent = '—';

  explain.textContent = '—';
  sourceEl.textContent = '—';

  setButtonsForGuessPhase();
  updateStats();
}

function answer(userLabel){
  if(locked) return;
  locked = true;

  const item = deck[idx];
  const truthLabel = normalizeLabel(item.label);
  const guessLabel = normalizeLabel(userLabel);
  const isRight = truthLabel === guessLabel;

  totalAnswered += 1;
  if(isRight){ score += 1; streak += 1; }
  else { streak = 0; }

  reveal.hidden = false;
  yourGuess.textContent = `Your guess: ${guessLabel.toUpperCase()}`;
  truth.textContent = `Truth: ${truthLabel.toUpperCase()}`;
  truth.classList.add(truthLabel === 'correct' ? 'ok' : 'bad');

  verdict.textContent = isRight ? 'Nice catch' : 'Got tricked';
  verdict.classList.add(isRight ? 'ok' : 'bad');

  explain.textContent = safeExplanation(item) || 'Explanation: —';
  sourceEl.textContent = safeSource(item) || 'Source: —';

  setButtonsForAnswerPhase();
  updateStats();
}

function next(){
  if(!locked) return;
  idx += 1;
  if(idx >= deck.length){
    deck = interleaveByCategory(QUESTIONS); // reshuffle forever
    idx = 0;
  }
  renderCard();
}

async function loadQuestions(){
  const res = await fetch('TruthfulQA.csv');
  const csvText = await res.text();
  const rows = parseCSV(csvText);

  const items = [];
  for(const x of rows){
    const question = x.Question ?? x.question ?? '';
    const bestAnswer = x['Best Answer'] ?? x.best_answer ?? '';
    const bestIncorrect = x['Best Incorrect Answer'] ?? x.best_incorrect_answer ?? '';
    const category = x.Category ?? x.category ?? '';
    const type = x.Type ?? x.type ?? '';
    const source = x.Source ?? x.source ?? 'TruthfulQA';

    if(question && bestAnswer){
      items.push({
        id: `${question}_c`,
        type,
        category,
        question,
        ai_answer: bestAnswer,
        label: 'correct',
        explanation: `Best answer: ${bestAnswer}`,
        source
      });
    }

    if(question && bestIncorrect){
      items.push({
        id: `${question}_i`,
        type,
        category,
        question,
        ai_answer: bestIncorrect,
        label: 'incorrect',
        explanation: `Best answer: ${bestAnswer || 'Not available'}`,
        source
      });
    }
  }

  QUESTIONS = items.filter(q => q.question && q.ai_answer && (q.label === 'correct' || q.label === 'incorrect'));

  deck = interleaveByCategory(QUESTIONS);
  idx = 0;
}

function showStart(){
  started = false;
  startScreen.classList.add('active');
  gameScreen.classList.remove('active');
  updateStats();
}

async function showGame(){
  started = true;
  startScreen.classList.remove('active');
  gameScreen.classList.add('active');

  if(!QUESTIONS.length){
    await loadQuestions();
  }
  renderCard();
}

function restart(){
  score = 0;
  streak = 0;
  totalAnswered = 0;
  deck = interleaveByCategory(QUESTIONS);
  idx = 0;
  if(!started){ showGame(); return; }
  renderCard();
}

btnCorrect.addEventListener('click', () => answer('correct'));
btnIncorrect.addEventListener('click', () => answer('incorrect'));
btnNext.addEventListener('click', next);
btnRestart.addEventListener('click', restart);
btnStart.addEventListener('click', showGame);

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if(k === 'c') answer('correct');
  if(k === 'i') answer('incorrect');
  if(k === 'n') next();
  if(k === 'r') restart();
});

showStart();
