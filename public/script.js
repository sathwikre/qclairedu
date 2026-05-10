/* ===========================================================
   QuantumQuiz — Logic
   Pure JavaScript, no frameworks.
   =========================================================== */

/* -----------------------------------------------------------
   QUESTIONS
   Replace / extend this array with your own quiz questions.
   Each item: { question, options: [4], answer: index 0-3 }
   ----------------------------------------------------------- */
const QUESTIONS = [
  { question: "Who introduced the concept of energy quanta in 1900?",
    options: ["Albert Einstein", "Max Planck", "Niels Bohr", "Richard Feynman"], answer: 1 },
  { question: "What does the equation E = hf represent?",
    options: ["Newton’s Law", "Energy of a photon", "Schrödinger Equation", "Momentum Equation"], answer: 1 },
  { question: "Who explained the photoelectric effect?",
    options: ["Schrödinger", "Dirac", "Einstein", "Heisenberg"], answer: 2 },
  { question: "Wave-particle duality was proposed by:",
    options: ["Louis de Broglie", "Max Born", "Peter Shor", "Grover"], answer: 0 },
  { question: "Which principle states that position and momentum cannot both be measured exactly?",
    options: ["Superposition Principle", "Quantum Tunneling", "Uncertainty Principle", "Entanglement Principle"], answer: 2 },
  { question: "Which notation is widely used in quantum computing?",
    options: ["Binary notation", "Matrix notation", "Bra-ket notation", "Hexadecimal notation"], answer: 2 },
  { question: "Who popularized the idea of quantum computing in 1981?",
    options: ["Peter Shor", "Richard Feynman", "Lov Grover", "David Deutsch"], answer: 1 },
  { question: "Which algorithm demonstrated exponential quantum advantage first?",
    options: ["Grover’s Algorithm", "Shor’s Algorithm", "Deutsch-Jozsa Algorithm", "VQE"], answer: 2 },
  { question: "Shor’s Algorithm is mainly used for:",
    options: ["Searching databases", "Factoring large numbers", "Image processing", "Data compression"], answer: 1 },
  { question: "Grover’s Algorithm provides:",
    options: ["Exponential speedup", "No speedup", "Quadratic speedup", "Linear slowdown"], answer: 2 },
  { question: "A qubit can exist in:",
    options: ["Only 0", "Only 1", "Both 0 and 1 simultaneously", "Neither 0 nor 1"], answer: 2 },
  { question: "Which phenomenon allows instant correlation between qubits?",
    options: ["Diffraction", "Refraction", "Entanglement", "Interference"], answer: 2 },
  { question: "Which of the following is a quantum hardware platform?",
    options: ["Trapped ions", "RAM", "HDD", "SSD"], answer: 0 },
  { question: "Which company achieved quantum supremacy with the Sycamore processor?",
    options: ["IBM", "Microsoft", "Google", "Amazon"], answer: 2 },
  { question: "What does NISQ stand for?",
    options: ["National Integrated System for Quantum", "Noisy Intermediate-Scale Quantum", "Networked Intelligent System Quantum", "Non-Integrated Scalable Qubits"], answer: 1 },
  { question: "Which technology provides provably secure communication using quantum mechanics?",
    options: ["Blockchain", "VPN", "Quantum Key Distribution", "Cloud Computing"], answer: 2 },
  { question: "Quantum simulation is especially useful in:",
    options: ["Gaming", "Drug discovery", "Video editing", "Social media"], answer: 1 },
  { question: "Which quantum device is used for highly accurate timekeeping?",
    options: ["Laser Printer", "Atomic Clock", "Oscilloscope", "GPS Antenna"], answer: 1 },
  { question: "Which company launched the first commercial quantum system?",
    options: ["IBM", "Google", "D-Wave", "Intel"], answer: 2 },
  { question: "Which quantum hardware platform operates at room temperature?",
    options: ["Superconducting qubits", "Photonic qubits", "Silicon spin qubits", "Trapped ions"], answer: 1 },
];

/* ----- Config ----- */
const TIME_PER_QUESTION = 25; // seconds
const LETTERS = ["A", "B", "C", "D"];
const MOTIVATION = [
  "Nice — keep going!", "You're on a roll!", "Stay sharp!",
  "Great focus!", "Almost there!", "Trust your instinct!"
];

/* ----- DOM refs ----- */
const $ = (id) => document.getElementById(id);
const startScreen   = $("start-screen");
const quizScreen    = $("quiz-screen");
const resultScreen  = $("result-screen");
const startBtn      = $("start-btn");
const restartBtn    = $("restart-btn");
const nextBtn       = $("next-btn");
const questionText  = $("question-text");
const optionsBox    = $("options");
const counterEl     = $("question-counter");
const progressFill  = $("progress-fill");
const feedbackEl    = $("feedback");
const timerValue    = $("timer-value");
const timerPill     = $("timer");

/* ----- State ----- */
let currentIndex = 0;
let correctCount = 0;
let wrongCount   = 0;
let answered     = false;
let timerId      = null;
let timeLeft     = TIME_PER_QUESTION;

/* ----- Inject SVG gradient for the score ring ----- */
(function injectRingGradient() {
  const svg = document.querySelector(".score-ring");
  if (!svg) return;
  svg.insertAdjacentHTML("afterbegin",
    `<defs><linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0%" stop-color="#7c5cff"/>
       <stop offset="100%" stop-color="#22d3ee"/>
     </linearGradient></defs>`);
})();

/* ----- Sound effects (Web Audio, no assets needed) ----- */
let audioCtx = null;
function playTone(freq, duration = 0.2, type = "sine", gain = 0.08) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {/* ignore */}
}
const playCorrect = () => { playTone(660, 0.15); setTimeout(() => playTone(880, 0.2), 120); };
const playWrong   = () => { playTone(220, 0.25, "sawtooth", 0.06); };

/* ----- Screen switching ----- */
function showScreen(el) {
  [startScreen, quizScreen, resultScreen].forEach(s => s.classList.remove("active"));
  el.classList.add("active");
}

/* ----- Render current question ----- */
function renderQuestion() {
  const q = QUESTIONS[currentIndex];
  answered = false;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  nextBtn.disabled = true;
  nextBtn.textContent = (currentIndex === QUESTIONS.length - 1) ? "See Results" : "Next Question";
  // Re-add arrow after textContent reset
  const arrow = document.createElement("span");
  arrow.className = "arrow";
  arrow.textContent = (currentIndex === QUESTIONS.length - 1) ? "🏁" : "→";
  nextBtn.appendChild(document.createTextNode(" "));
  nextBtn.appendChild(arrow);

  counterEl.textContent = `Question ${currentIndex + 1} of ${QUESTIONS.length}`;
  progressFill.style.width = `${((currentIndex) / QUESTIONS.length) * 100}%`;
  questionText.textContent = q.question;

  optionsBox.innerHTML = "";
  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.setAttribute("role", "option");
    btn.dataset.index = String(idx);
    btn.innerHTML = `
      <span class="option-letter">${LETTERS[idx]}</span>
      <span class="option-text"></span>
      <span class="option-icon" aria-hidden="true"></span>
    `;
    btn.querySelector(".option-text").textContent = opt;
    btn.addEventListener("click", () => selectAnswer(idx));
    optionsBox.appendChild(btn);
  });

  startTimer();
}

/* ----- Timer ----- */
function startTimer() {
  clearInterval(timerId);
  timeLeft = TIME_PER_QUESTION;
  updateTimerUI();
  timerId = setInterval(() => {
    timeLeft--;
    updateTimerUI();
    if (timeLeft <= 0) {
      clearInterval(timerId);
      if (!answered) selectAnswer(-1); // time out — count as wrong
    }
  }, 1000);
}
function updateTimerUI() {
  timerValue.textContent = String(Math.max(0, timeLeft));
  timerPill.classList.toggle("warn", timeLeft <= 10 && timeLeft > 5);
  timerPill.classList.toggle("danger", timeLeft <= 5);
}

/* ----- Answer handling ----- */
function selectAnswer(selectedIdx) {
  if (answered) return;
  answered = true;
  clearInterval(timerId);

  const q = QUESTIONS[currentIndex];
  const buttons = optionsBox.querySelectorAll(".option");
  buttons.forEach(b => (b.disabled = true));

  const correctIdx = q.answer;
  const isCorrect = selectedIdx === correctIdx;

  // Mark correct option
  const correctBtn = buttons[correctIdx];
  correctBtn.classList.add("correct");
  correctBtn.querySelector(".option-icon").textContent = "✓";

  if (isCorrect) {
    correctCount++;
    feedbackEl.textContent = `✓ Correct Answer — ${randomFrom(MOTIVATION)}`;
    feedbackEl.className = "feedback correct";
    playCorrect();
  } else {
    wrongCount++;
    if (selectedIdx >= 0) {
      const wrongBtn = buttons[selectedIdx];
      wrongBtn.classList.add("wrong");
      wrongBtn.querySelector(".option-icon").textContent = "✗";
    }
    feedbackEl.textContent = selectedIdx === -1 ? "⏱ Time's up — Wrong Answer" : "✗ Wrong Answer";
    feedbackEl.className = "feedback wrong";
    playWrong();
  }

  progressFill.style.width = `${((currentIndex + 1) / QUESTIONS.length) * 100}%`;
  nextBtn.disabled = false;
  nextBtn.focus();
}

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ----- Next ----- */
nextBtn.addEventListener("click", () => {
  if (currentIndex < QUESTIONS.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    showResults();
  }
});

/* ----- Results ----- */
function showResults() {
  clearInterval(timerId);
  const total = QUESTIONS.length;
  const pct = Math.round((correctCount / total) * 100);

  $("correct-count").textContent = String(correctCount);
  $("wrong-count").textContent   = String(wrongCount);
  $("total-count").textContent   = String(total);
  $("score-percent").textContent = `${pct}%`;

  let msg = "Needs Improvement — keep practicing!";
  if (pct >= 90)      msg = "Excellent! Outstanding work 🌟";
  else if (pct >= 70) msg = "Good Job! You really know your stuff 👏";
  else if (pct >= 50) msg = "Average — solid foundation, keep going!";
  $("performance-message").textContent = msg;

  // Animate ring
  const ring = $("ring-progress");
  const circumference = 2 * Math.PI * 52; // ≈ 326.7
  ring.style.strokeDasharray = String(circumference);
  ring.style.strokeDashoffset = String(circumference);
  showScreen(resultScreen);
  requestAnimationFrame(() => {
    ring.style.strokeDashoffset = String(circumference * (1 - pct / 100));
  });

  if (pct > 80) launchConfetti();
}

/* ----- Restart ----- */
restartBtn.addEventListener("click", () => {
  currentIndex = 0; correctCount = 0; wrongCount = 0;
  showScreen(quizScreen);
  renderQuestion();
});

/* ----- Start ----- */
startBtn.addEventListener("click", () => {
  currentIndex = 0; correctCount = 0; wrongCount = 0;
  showScreen(quizScreen);
  renderQuestion();
});

/* ===========================================================
   Lightweight confetti (no library)
   =========================================================== */
function launchConfetti() {
  const canvas = $("confetti-canvas");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.scale(dpr, dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  const colors = ["#7c5cff", "#22d3ee", "#22c55e", "#f59e0b", "#ec4899", "#ffffff"];
  const particles = Array.from({ length: 160 }, () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * 200,
    r: 4 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)],
    vx: -2 + Math.random() * 4,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: -0.2 + Math.random() * 0.4,
  }));

  const start = performance.now();
  function frame(t) {
    const elapsed = t - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.05;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.5);
      ctx.restore();
    });
    if (elapsed < 4500) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(frame);
}

/* ----- Keyboard: Enter advances when next is enabled ----- */
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && quizScreen.classList.contains("active") && !nextBtn.disabled) {
    nextBtn.click();
  }
});