/* ================================================================
   ARIA v3 — script.js
   Complete working logic for all features
   ================================================================ */

'use strict';

// ================================================================
// CONFIG — change these to customise ARIA
// ================================================================
const CONFIG = {
  // ── Access ──────────────────────────────────────────────
  DEFAULT_PIN: '1234',          // Change via Settings modal
  STAY_LOGGED_IN_DEFAULT: true, // Session survives page refresh

  // ── Identity ────────────────────────────────────────────
  USER_NAME: 'Mr. Kritesh',     // Change via Settings modal

  // ── Backend ─────────────────────────────────────────────
  // Set these in Settings modal (stored in localStorage, never hard-coded here)
  // BACKEND_URL: 'https://your-api.com'  ← paste in Settings

  // ── Models available ────────────────────────────────────
  MODELS: [
    { id: 'gpt-4o',           label: 'GPT-4o' },
    { id: 'gpt-4-turbo',      label: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo',    label: 'GPT-3.5 Turbo' },
    { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro' },
  ],
};

// ================================================================
// STATE
// ================================================================
const STATE = {
  // Session
  authenticated: false,
  stayLoggedIn: true,
  pinAttempts: 0,
  pinBuffer: '',

  // Voice
  voiceOutputEnabled: true,
  voiceInputActive: false,
  recognition: null,
  voices: [],
  selectedVoice: null,
  voiceRate: 1.0,
  voicePitch: 0.9,

  // Chat
  chatHistory: [],         // { role, text, ts }
  activeModel: 'gpt-4o',

  // Settings
  apiKey: '',
  backendUrl: '',
  userName: 'Mr. Kritesh',

  // System
  backendOnline: false,
  systemLog: [],
};

// ================================================================
// DOM HELPERS
// ================================================================
const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelector(sel);

// ================================================================
// LOCAL STORAGE KEYS
// ================================================================
const LS = {
  AUTH:        'aria_auth',
  PIN:         'aria_pin',
  API_KEY:     'aria_apikey',
  BACKEND_URL: 'aria_backend_url',
  CHAT:        'aria_chat',
  EXPENSES:    'aria_expenses',
  VOICE_ON:    'aria_voice_on',
  VOICE_RATE:  'aria_voice_rate',
  VOICE_PITCH: 'aria_voice_pitch',
  VOICE_IDX:   'aria_voice_idx',
  MODEL:       'aria_model',
  USERNAME:    'aria_username',
  STAY_IN:     'aria_stay_logged',
  FIRST_USE:   'aria_first_use',
};

// ================================================================
// BOOT SEQUENCE
// ================================================================
const BOOT_MSGS = [
  'Initializing ARIA core systems…',
  'Loading neural reasoning engine…',
  'Checking server connectivity…',
  'Voice module online…',
  'Automation core ready…',
  'ARIA online. Welcome back.',
];

async function runBoot() {
  const bar    = $('boot-bar');
  const pctEl  = $('boot-pct');

  for (let i = 0; i < BOOT_MSGS.length; i++) {
    await sleep(i === 0 ? 200 : 380 + Math.random() * 200);
    const pct = Math.round(((i + 1) / BOOT_MSGS.length) * 100);
    bar.style.width = pct + '%';
    pctEl.textContent = pct + '%';

    // Mark previous as done, current as active
    for (let j = 0; j <= i; j++) {
      const el = $(`blog-${j}`);
      if (el) el.className = j === i ? 'boot-log-line active' : 'boot-log-line done';
    }
  }

  await sleep(500);

  // Check if session is still valid
  const savedAuth = localStorage.getItem(LS.AUTH);
  const stayIn    = localStorage.getItem(LS.STAY_IN) !== 'false';

  if (savedAuth === 'true' && stayIn) {
    STATE.authenticated = true;
    switchScreen('screen-boot', 'screen-connect');
    runConnectSequence();
  } else {
    switchScreen('screen-boot', 'screen-access');
  }
}

// ================================================================
// SCREEN TRANSITIONS
// ================================================================
function switchScreen(fromId, toId) {
  const from = $(fromId);
  const to   = $(toId);
  if (from) from.classList.remove('active');
  if (to) {
    to.classList.add('active');
    // Dashboard needs special handling
    if (toId === 'screen-dashboard') {
      to.style.display = 'block';
    }
  }
}

// ================================================================
// PIN ACCESS
// ================================================================
function initPinPad() {
  // Number keys
  document.querySelectorAll('.pin-key[data-val]').forEach(btn => {
    btn.addEventListener('click', () => pinDigit(btn.dataset.val));
  });

  $('pin-clear-btn').addEventListener('click', pinClear);
  $('pin-enter-btn').addEventListener('click', pinSubmit);

  // Physical keyboard support
  document.addEventListener('keydown', e => {
    if (!$('screen-access').classList.contains('active')) return;
    if (/^[0-9]$/.test(e.key)) pinDigit(e.key);
    if (e.key === 'Backspace') pinClear();
    if (e.key === 'Enter') pinSubmit();
  });

  updatePinDisplay();
}

function pinDigit(digit) {
  if (STATE.pinBuffer.length >= 4) return;
  STATE.pinBuffer += digit;
  updatePinDisplay();
  if (STATE.pinBuffer.length === 4) setTimeout(pinSubmit, 200);
}

function pinClear() {
  STATE.pinBuffer = '';
  updatePinDisplay();
  const err = $('pin-error');
  err.classList.add('hidden');
}

function updatePinDisplay() {
  for (let i = 0; i < 4; i++) {
    const dot = $(`pd${i}`);
    if (dot) dot.className = i < STATE.pinBuffer.length ? 'pin-dot filled' : 'pin-dot';
  }
}

function pinSubmit() {
  const stored = localStorage.getItem(LS.PIN) || CONFIG.DEFAULT_PIN;
  if (STATE.pinBuffer === stored) {
    pinSuccess();
  } else {
    pinFail();
  }
}

function pinSuccess() {
  STATE.authenticated = true;
  STATE.pinBuffer = '';
  updatePinDisplay();
  $('pin-error').classList.add('hidden');

  const stayIn = localStorage.getItem(LS.STAY_IN) !== 'false';
  if (stayIn) localStorage.setItem(LS.AUTH, 'true');

  switchScreen('screen-access', 'screen-connect');
  runConnectSequence();
}

function pinFail() {
  STATE.pinAttempts++;
  STATE.pinBuffer = '';
  updatePinDisplay();
  const err = $('pin-error');
  err.classList.remove('hidden');
  // Re-hide after 2.5s
  setTimeout(() => err.classList.add('hidden'), 2500);
}

// ================================================================
// CONNECT SEQUENCE (after login)
// ================================================================
async function runConnectSequence() {
  const lines = [$('cl-0'), $('cl-1'), $('cl-2'), $('cl-3')];

  for (let i = 0; i < lines.length; i++) {
    await sleep(500 + i * 400);
    if (lines[i - 1]) {
      lines[i - 1].className = 'connect-line done';
      lines[i - 1].querySelector('.cline-dot').className = 'cline-dot done';
    }
    lines[i].className = 'connect-line active';
    lines[i].querySelector('.cline-dot').className = 'cline-dot active';
  }

  await sleep(500);
  lines[lines.length - 1].className = 'connect-line done';

  await sleep(600);
  switchScreen('screen-connect', 'screen-dashboard');
  onDashboardReady();
}

// ================================================================
// DASHBOARD INIT
// ================================================================
function onDashboardReady() {
  loadAllSettings();
  initSidebar();
  initTopbar();
  initChat();
  initVoice();
  initCommands();
  initExpenses();
  initMemory();
  initStatus();
  initSettingsModal();
  initBriefingModal();
  checkBackendStatus();
  sysLog('ARIA dashboard loaded.', 'ok');
  sysLog(`Session started — model: ${STATE.activeModel}`, 'info');
}

// ================================================================
// SETTINGS: LOAD ALL
// ================================================================
function loadAllSettings() {
  STATE.apiKey         = localStorage.getItem(LS.API_KEY)     || '';
  STATE.backendUrl     = localStorage.getItem(LS.BACKEND_URL) || '';
  STATE.voiceOutputEnabled = localStorage.getItem(LS.VOICE_ON) !== 'false';
  STATE.voiceRate      = parseFloat(localStorage.getItem(LS.VOICE_RATE)  ?? '1.0');
  STATE.voicePitch     = parseFloat(localStorage.getItem(LS.VOICE_PITCH) ?? '0.9');
  STATE.activeModel    = localStorage.getItem(LS.MODEL)        || 'gpt-4o';
  STATE.userName       = localStorage.getItem(LS.USERNAME)     || CONFIG.USER_NAME;
  STATE.stayLoggedIn   = localStorage.getItem(LS.STAY_IN)     !== 'false';

  // Seed first-use date
  if (!localStorage.getItem(LS.FIRST_USE)) localStorage.setItem(LS.FIRST_USE, Date.now());

  // Apply to model selector
  const ms = $('model-selector');
  if (ms) ms.value = STATE.activeModel;
}

function saveSettings() {
  localStorage.setItem(LS.API_KEY,     STATE.apiKey);
  localStorage.setItem(LS.BACKEND_URL, STATE.backendUrl);
  localStorage.setItem(LS.VOICE_ON,    STATE.voiceOutputEnabled);
  localStorage.setItem(LS.VOICE_RATE,  STATE.voiceRate);
  localStorage.setItem(LS.VOICE_PITCH, STATE.voicePitch);
  localStorage.setItem(LS.MODEL,       STATE.activeModel);
  localStorage.setItem(LS.USERNAME,    STATE.userName);
  localStorage.setItem(LS.STAY_IN,     STATE.stayLoggedIn);
  if (STATE.selectedVoice)
    localStorage.setItem(LS.VOICE_IDX, STATE.voices.indexOf(STATE.selectedVoice));
}

// ================================================================
// SIDEBAR
// ================================================================
function initSidebar() {
  document.querySelectorAll('.nav-item[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchPanel(btn.dataset.panel);
      // Close sidebar on mobile
      if (window.innerWidth <= 768) $('sidebar').classList.remove('open');
    });
  });

  $('sidebar-toggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));

  $('btn-logout').addEventListener('click', lockSession);
}

function switchPanel(panelId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-panel]').forEach(b => b.classList.remove('active'));
  const panel = $(panelId);
  if (panel) panel.classList.add('active');
  const btn = document.querySelector(`.nav-item[data-panel="${panelId}"]`);
  if (btn) btn.classList.add('active');

  // Refresh status panel when opened
  if (panelId === 'panel-status') refreshStatusPanel();
  if (panelId === 'panel-memory') renderMemoryFeed();
}

// ================================================================
// TOPBAR
// ================================================================
function initTopbar() {
  updateGreeting();
  updateDateDisplay();
  setInterval(updateDateDisplay, 60000);
  setInterval(updateGreeting, 3600000);

  $('btn-voice-toggle').addEventListener('click', toggleVoiceOutput);
  $('btn-briefing').addEventListener('click', openBriefing);
  $('btn-settings').addEventListener('click', openSettings);
  $('model-selector').addEventListener('change', e => {
    STATE.activeModel = e.target.value;
    saveSettings();
    sysLog(`Model switched to ${STATE.activeModel}`, 'info');
    showToast(`Model: ${STATE.activeModel}`, 'info');
    updateStatusCard('sc-model', STATE.activeModel, '');
  });
}

function updateGreeting() {
  const h      = new Date().getHours();
  const period = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  $('topbar-greeting').textContent = `Good ${period}, ${STATE.userName}.`;
}

function updateDateDisplay() {
  const now = new Date();
  $('topbar-date').textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ================================================================
// VOICE SYSTEM
// ================================================================
function initVoice() {
  // Load voices
  const loadVoices = () => {
    STATE.voices = speechSynthesis.getVoices();
    buildVoiceDropdown();
    autoSelectVoice();
    updateVoiceStatusCard();
  };
  if (speechSynthesis.getVoices().length) loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;

  // Update icon
  updateVoiceIcon();
}

function buildVoiceDropdown() {
  const sel = $('set-voice-select');
  if (!sel) return;
  sel.innerHTML = '';
  STATE.voices.forEach((v, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `${v.name} (${v.lang})`;
    sel.appendChild(o);
  });
  const savedIdx = parseInt(localStorage.getItem(LS.VOICE_IDX));
  if (!isNaN(savedIdx) && STATE.voices[savedIdx]) {
    sel.value = savedIdx;
    STATE.selectedVoice = STATE.voices[savedIdx];
  }
}

function autoSelectVoice() {
  if (STATE.selectedVoice) return;
  const preferred = ['Google UK English Male','Google US English','Alex','Daniel','Fred','Samantha'];
  for (const name of preferred) {
    const v = STATE.voices.find(v => v.name.includes(name));
    if (v) { STATE.selectedVoice = v; return; }
  }
  const eng = STATE.voices.find(v => /en/i.test(v.lang));
  if (eng) STATE.selectedVoice = eng;
  else if (STATE.voices[0]) STATE.selectedVoice = STATE.voices[0];
}

function speak(text) {
  if (!STATE.voiceOutputEnabled) return;
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let idx = 0;
  const next = () => {
    if (idx >= sentences.length) return;
    const u = new SpeechSynthesisUtterance(sentences[idx].trim());
    if (STATE.selectedVoice) u.voice = STATE.selectedVoice;
    u.rate = STATE.voiceRate; u.pitch = STATE.voicePitch; u.volume = 1;
    u.onend = () => { idx++; next(); };
    speechSynthesis.speak(u);
    idx++;
  };
  next();
}

function toggleVoiceOutput() {
  STATE.voiceOutputEnabled = !STATE.voiceOutputEnabled;
  updateVoiceIcon();
  saveSettings();
  showToast(STATE.voiceOutputEnabled ? 'Voice output enabled' : 'Voice output muted', 'info');
  sysLog(`Voice output ${STATE.voiceOutputEnabled ? 'enabled' : 'disabled'}`, 'info');
}

function updateVoiceIcon() {
  const btn = $('btn-voice-toggle');
  if (!btn) return;
  if (STATE.voiceOutputEnabled) {
    btn.querySelector('svg').innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>';
    btn.style.color = '';
  } else {
    btn.querySelector('svg').innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
    btn.style.color = 'var(--text-faint)';
  }
}

function updateVoiceStatusCard() {
  const hasVoice = 'speechSynthesis' in window && STATE.voices.length > 0;
  updateStatusCard('sc-voice',
    hasVoice ? 'AVAILABLE' : 'UNAVAILABLE',
    hasVoice ? `${STATE.voices.length} voices loaded` : 'Browser unsupported',
    hasVoice ? 'online' : 'offline'
  );
  if (!hasVoice) sysLog('Speech synthesis not available in this browser.', 'warn');
}

// Voice Input
function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.continuous = false; rec.interimResults = false; rec.lang = 'en-US';
  rec.onresult = e => {
    const text = e.results[0][0].transcript.trim();
    $('chat-input').value = text;
    stopVoiceInput();
    handleChatSend();
  };
  rec.onerror  = () => stopVoiceInput();
  rec.onend    = () => { if (STATE.voiceInputActive) { try { rec.start(); } catch {} } };
  return rec;
}

function startVoiceInput() {
  if (!STATE.recognition) STATE.recognition = initRecognition();
  if (!STATE.recognition) {
    showToast('Voice input not supported in this browser. Use Chrome or Edge.', 'error');
    sysLog('Voice input unavailable — browser unsupported.', 'warn');
    return;
  }
  STATE.voiceInputActive = true;
  $('mic-btn').classList.add('listening');
  try { STATE.recognition.start(); } catch {}
  sysLog('Voice input started.', 'info');
}

function stopVoiceInput() {
  STATE.voiceInputActive = false;
  $('mic-btn').classList.remove('listening');
  if (STATE.recognition) { try { STATE.recognition.stop(); } catch {} }
}

// ================================================================
// CHAT SYSTEM
// ================================================================
function initChat() {
  // Load saved history
  try {
    const saved = JSON.parse(localStorage.getItem(LS.CHAT) || '[]');
    STATE.chatHistory = Array.isArray(saved) ? saved : [];
  } catch { STATE.chatHistory = []; }

  renderChatHistory();

  // Add welcome message if empty
  if (STATE.chatHistory.length === 0) {
    const h = new Date().getHours();
    const period = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
    const greeting = `Good ${period}, ${STATE.userName}. ARIA is online. How can I assist you today?`;
    appendChatMsg('aria', greeting, false);
    speak(greeting);
  }

  // Event listeners
  $('send-btn').addEventListener('click', handleChatSend);
  $('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  });
  $('mic-btn').addEventListener('click', () => {
    STATE.voiceInputActive ? stopVoiceInput() : startVoiceInput();
  });
  $('btn-clear-chat').addEventListener('click', clearChat);
}

function renderChatHistory() {
  const feed = $('chat-feed');
  if (!feed) return;
  feed.innerHTML = '';
  STATE.chatHistory.forEach(m => renderMsg(m.role, m.text, m.ts, false));
  scrollChatBottom();
}

function appendChatMsg(role, text, save = true) {
  const ts = Date.now();
  if (save) {
    STATE.chatHistory.push({ role, text, ts });
    saveChatHistory();
  }
  renderMsg(role, text, ts, true);
  return ts;
}

function renderMsg(role, text, ts, animate = true) {
  const feed = $('chat-feed');
  if (!feed) return;

  const isAria = role === 'aria';
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  if (!animate) div.style.animation = 'none';

  const timeStr = ts ? new Date(ts).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) : '';

  div.innerHTML = `
    <div class="msg-avatar">${isAria ? 'AI' : 'YOU'}</div>
    <div class="msg-body">
      <div class="msg-sender">${isAria ? 'ARIA' : 'YOU'}</div>
      <div class="msg-text">${escapeHtml(text)}</div>
      <div class="msg-time">${timeStr}</div>
    </div>
  `;
  feed.appendChild(div);
  scrollChatBottom();
  return div;
}

function showTypingIndicator() {
  const feed = $('chat-feed');
  const div = document.createElement('div');
  div.className = 'msg aria';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div class="msg-body">
      <div class="msg-sender">ARIA</div>
      <div class="msg-text"><div class="typing-dots"><span></span><span></span><span></span></div></div>
    </div>
  `;
  feed.appendChild(div);
  scrollChatBottom();
}

function removeTypingIndicator() {
  const el = $('typing-indicator');
  if (el) el.remove();
}

function scrollChatBottom() {
  requestAnimationFrame(() => {
    const feed = $('chat-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  });
}

function saveChatHistory() {
  // Keep last 200 messages
  if (STATE.chatHistory.length > 200) STATE.chatHistory = STATE.chatHistory.slice(-200);
  localStorage.setItem(LS.CHAT, JSON.stringify(STATE.chatHistory));
  updateMemoryStats();
}

function clearChat() {
  STATE.chatHistory = [];
  localStorage.removeItem(LS.CHAT);
  $('chat-feed').innerHTML = '';
  addSysMsgToChat('Chat history cleared.');
  showToast('Chat cleared', 'info');
  sysLog('Chat history cleared.', 'info');
  updateMemoryStats();
}

function addSysMsgToChat(text) {
  const feed = $('chat-feed');
  const div = document.createElement('div');
  div.className = 'sys-msg';
  div.textContent = text;
  feed.appendChild(div);
  scrollChatBottom();
}

// ================================================================
// HANDLE CHAT SEND (routes to commands or AI)
// ================================================================
async function handleChatSend() {
  const raw = $('chat-input').value.trim();
  if (!raw) return;
  $('chat-input').value = '';

  appendChatMsg('user', raw);

  // 1. Try automation commands first
  if (handleCommand(raw)) return;

  // 2. Route to AI (or explain how to connect)
  await handleAIReply(raw);
}

// ================================================================
// COMMAND HANDLER
// ================================================================
const OPEN_MAP = {
  'youtube':   'https://youtube.com',
  'google':    'https://google.com',
  'gmail':     'https://mail.google.com',
  'github':    'https://github.com',
  'reddit':    'https://reddit.com',
  'spotify':   'https://open.spotify.com',
  'netflix':   'https://netflix.com',
  'twitter':   'https://x.com',
  'x':         'https://x.com',
  'instagram': 'https://instagram.com',
  'amazon':    'https://amazon.com',
  'wikipedia': 'https://wikipedia.org',
  'chatgpt':   'https://chat.openai.com',
};

function handleCommand(input) {
  const lower = input.toLowerCase().trim();

  // ── Open website ──────────────────────────────────────
  for (const [key, url] of Object.entries(OPEN_MAP)) {
    if ([`open ${key}`, `go to ${key}`, `launch ${key}`].includes(lower)) {
      window.open(url, '_blank');
      const reply = `Opening ${capitalize(key)} now.`;
      appendChatMsg('aria', reply);
      speak(reply);
      sysLog(`Opened ${key}`, 'ok');
      return true;
    }
  }

  // ── Search YouTube ────────────────────────────────────
  const ytMatch = lower.match(/^(?:search youtube|youtube search)\s+(?:for\s+)?(.+)$/);
  if (ytMatch) {
    const q = ytMatch[1];
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank');
    const reply = `Searching YouTube for "${q}".`;
    appendChatMsg('aria', reply);
    speak(reply);
    return true;
  }

  // ── Search Google ─────────────────────────────────────
  const gMatch = lower.match(/^(?:search google|google search|search for|search)\s+(.+)$/);
  if (gMatch) {
    const q = gMatch[1];
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
    const reply = `Searching Google for "${q}".`;
    appendChatMsg('aria', reply);
    speak(reply);
    return true;
  }

  // ── Date / Time ───────────────────────────────────────
  if (/what(?:'?s| is)? (?:the )?(?:current )?time|what time is it/i.test(lower)) {
    const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const reply = `The current time is ${t}.`;
    appendChatMsg('aria', reply);
    speak(reply);
    return true;
  }

  if (/what(?:'?s| is)? (?:today'?s? )?date|show (?:today'?s )?date/i.test(lower)) {
    const d = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const reply = `Today is ${d}.`;
    appendChatMsg('aria', reply);
    speak(reply);
    return true;
  }

  // ── Clear chat ────────────────────────────────────────
  if (/^(clear chat|clear history|reset chat)$/i.test(lower)) {
    clearChat();
    return true;
  }

  // ── Voice mode ────────────────────────────────────────
  if (/start voice(?: mode)?/i.test(lower)) {
    startVoiceInput();
    const reply = 'Voice input activated. I\'m listening.';
    appendChatMsg('aria', reply);
    speak(reply);
    return true;
  }
  if (/stop voice(?: mode)?/i.test(lower)) {
    stopVoiceInput();
    const reply = 'Voice input deactivated.';
    appendChatMsg('aria', reply);
    speak(reply);
    return true;
  }

  // ── Show memory ───────────────────────────────────────
  if (/show memory|open memory/i.test(lower)) {
    switchPanel('panel-memory');
    const reply = 'Memory panel is now active.';
    appendChatMsg('aria', reply);
    speak(reply);
    return true;
  }

  // ── System commands ───────────────────────────────────
  if (/^(shutdown|restart|lock screen|sleep)$/i.test(lower)) {
    const reply = 'System-level commands require a native desktop bridge. This feature is not available in the web version of ARIA.';
    appendChatMsg('aria', reply);
    speak(reply);
    return true;
  }

  return false;
}

// ================================================================
// AI REPLY — backend-ready structure
// ================================================================
async function handleAIReply(userMessage) {
  showTypingIndicator();

  try {
    // ── If backend URL and API key are set → call real backend ──
    if (STATE.backendUrl && STATE.apiKey) {
      const response = await callBackend(userMessage);
      removeTypingIndicator();
      if (response) {
        appendChatMsg('aria', response);
        speak(response);
        return;
      }
    }

    // ── If only API key set → call OpenAI directly (CORS may block) ──
    if (STATE.apiKey && !STATE.backendUrl) {
      const response = await callOpenAIDirect(userMessage);
      removeTypingIndicator();
      if (response) {
        appendChatMsg('aria', response);
        speak(response);
        return;
      }
    }

    // ── No API key → friendly explanation ──
    await sleep(800 + Math.random() * 400);
    removeTypingIndicator();
    const noKeyReply = `I don't have an API key configured yet, ${STATE.userName}. To enable real AI responses, open Settings and paste your OpenAI API key. You can also point me at a custom backend URL. Once that's set, I'll have full reasoning capability.`;
    appendChatMsg('aria', noKeyReply);
    speak(noKeyReply);

  } catch (err) {
    removeTypingIndicator();
    const errReply = `I encountered an error connecting to the AI backend: ${err.message}. Please check your API key and backend URL in Settings.`;
    appendChatMsg('aria', errReply);
    sysLog(`AI error: ${err.message}`, 'err');
  }
}

// ── Backend call (your own server.js or any REST API) ─────────
async function callBackend(message) {
  const res = await Promise.race([
    fetch(`${STATE.backendUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        model: STATE.activeModel,
        history: STATE.chatHistory.slice(-10),
      }),
    }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('Request timed out')), 20000)),
  ]);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.reply || data.message || data.content || null;
}

// ── Direct OpenAI call ─────────────────────────────────────────
// NOTE: Works in browser only if CORS is allowed or a proxy is used.
// Recommended approach: use server.js as the proxy.
async function callOpenAIDirect(message) {
  const model = STATE.activeModel.startsWith('gpt') ? STATE.activeModel : 'gpt-4o';

  const messages = [
    {
      role: 'system',
      content: `You are ARIA — a calm, intelligent, loyal AI assistant. Address the user as "${STATE.userName}" occasionally. Be direct, useful, and confident. Never be sycophantic. Keep responses concise unless depth is needed.`,
    },
    ...STATE.chatHistory.slice(-8).map(m => ({ role: m.role === 'aria' ? 'assistant' : 'user', content: m.text })),
    { role: 'user', content: message },
  ];

  const res = await Promise.race([
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.apiKey}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: 500, temperature: 0.7 }),
    }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('OpenAI request timed out')), 20000)),
  ]);

  if (res.status === 401) throw new Error('Invalid API key. Check Settings.');
  if (res.status === 429) throw new Error('Rate limit reached. Wait a moment.');
  if (!res.ok) throw new Error(`OpenAI error: HTTP ${res.status}`);

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

// ================================================================
// COMMANDS PANEL
// ================================================================
function initCommands() {
  // Quick-command buttons
  document.querySelectorAll('.cmd-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      if (cmd.startsWith('sys-')) {
        showToast('System commands require native desktop bridge.', 'error');
        return;
      }
      // Route to chat panel and process
      switchPanel('panel-chat');
      $('chat-input').value = cmd;
      handleChatSend();
    });
  });

  // Search shortcuts
  $('search-google-btn').addEventListener('click', () => {
    const q = $('search-query').value.trim();
    if (!q) { showToast('Enter a search query', 'error'); return; }
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
    showToast(`Searching Google for "${q}"`, 'info');
    $('search-query').value = '';
  });

  $('search-youtube-btn').addEventListener('click', () => {
    const q = $('search-query').value.trim();
    if (!q) { showToast('Enter a search query', 'error'); return; }
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, '_blank');
    showToast(`Searching YouTube for "${q}"`, 'info');
    $('search-query').value = '';
  });

  $('search-query').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('search-google-btn').click();
  });
}

// ================================================================
// EXPENSE TRACKER
// ================================================================
let expenses = [];

function initExpenses() {
  // Load from localStorage
  try {
    expenses = JSON.parse(localStorage.getItem(LS.EXPENSES) || '[]');
  } catch { expenses = []; }

  // Set today's date as default
  const dateEl = $('exp-date');
  if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);

  renderExpenses();

  $('btn-add-expense').addEventListener('click', addExpense);
  $('btn-clear-expenses').addEventListener('click', clearExpenses);

  // Enter key on amount
  $('exp-amount').addEventListener('keydown', e => { if (e.key === 'Enter') addExpense(); });
}

function addExpense() {
  const name   = $('exp-name').value.trim();
  const amount = parseFloat($('exp-amount').value);
  const cat    = $('exp-category').value;
  const date   = $('exp-date').value || new Date().toISOString().slice(0, 10);

  if (!name) { showToast('Enter a description', 'error'); return; }
  if (isNaN(amount) || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }

  const entry = { id: Date.now(), name, amount, cat, date };
  expenses.unshift(entry);
  saveExpenses();
  renderExpenses();

  $('exp-name').value   = '';
  $('exp-amount').value = '';
  showToast(`Added: $${amount.toFixed(2)} — ${name}`, 'success');
  sysLog(`Expense added: ${name} $${amount.toFixed(2)}`, 'ok');
}

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses();
  renderExpenses();
  showToast('Expense removed', 'info');
}

function clearExpenses() {
  if (!confirm('Clear all expense entries?')) return;
  expenses = [];
  saveExpenses();
  renderExpenses();
  showToast('All expenses cleared', 'info');
}

function saveExpenses() {
  localStorage.setItem(LS.EXPENSES, JSON.stringify(expenses));
}

function renderExpenses() {
  const list  = $('expense-list');
  const total = expenses.reduce((a, e) => a + e.amount, 0);

  // Month total
  const now = new Date();
  const monthTotal = expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((a, e) => a + e.amount, 0);

  $('exp-total').textContent  = `$${total.toFixed(2)}`;
  $('exp-month').textContent  = `$${monthTotal.toFixed(2)}`;
  $('exp-count').textContent  = expenses.length;

  if (!list) return;
  if (expenses.length === 0) {
    list.innerHTML = '<div class="exp-empty">No expenses recorded yet.</div>';
    return;
  }

  list.innerHTML = '';
  expenses.forEach(e => {
    const div = document.createElement('div');
    div.className = 'exp-item';
    div.innerHTML = `
      <span class="exp-item-cat">${escapeHtml(e.cat)}</span>
      <span class="exp-item-name">${escapeHtml(e.name)}</span>
      <span class="exp-item-date">${e.date}</span>
      <span class="exp-item-amount">$${e.amount.toFixed(2)}</span>
      <button class="exp-item-del" data-id="${e.id}" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
      </button>
    `;
    list.appendChild(div);
  });

  list.querySelectorAll('.exp-item-del').forEach(btn => {
    btn.addEventListener('click', () => deleteExpense(parseInt(btn.dataset.id)));
  });
}

// ================================================================
// MEMORY / HISTORY PANEL
// ================================================================
function initMemory() {
  $('btn-clear-memory').addEventListener('click', () => {
    if (!confirm('Clear all ARIA memory and chat history?')) return;
    clearChat();
    showToast('Memory cleared', 'info');
  });

  updateMemoryStats();
  renderMemoryFeed();
}

function updateMemoryStats() {
  $('mem-msg-count').textContent = STATE.chatHistory.length;

  const firstUse = parseInt(localStorage.getItem(LS.FIRST_USE) || Date.now());
  const days = Math.max(1, Math.round((Date.now() - firstUse) / 86400000));
  $('mem-days').textContent = days;
}

function renderMemoryFeed() {
  const feed = $('memory-feed');
  if (!feed) return;

  updateMemoryStats();

  if (STATE.chatHistory.length === 0) {
    feed.innerHTML = '<div class="mem-empty">No memory entries yet. Start chatting.</div>';
    return;
  }

  feed.innerHTML = '';
  // Show last 50 entries, newest first
  const slice = [...STATE.chatHistory].reverse().slice(0, 50);
  slice.forEach(m => {
    const div = document.createElement('div');
    div.className = 'mem-entry';
    const ts = m.ts ? new Date(m.ts).toLocaleString() : '—';
    div.innerHTML = `
      <div class="mem-entry-meta">${m.role.toUpperCase()} · ${ts}</div>
      <div class="mem-entry-text">${escapeHtml(m.text.slice(0, 200))}${m.text.length > 200 ? '…' : ''}</div>
    `;
    feed.appendChild(div);
  });
}

// ================================================================
// STATUS PANEL
// ================================================================
function initStatus() {
  $('btn-refresh-status').addEventListener('click', () => {
    refreshStatusPanel();
    showToast('Status refreshed', 'info');
  });
  refreshStatusPanel();
}

function refreshStatusPanel() {
  updateStatusCard('sc-backend',
    STATE.backendOnline ? 'CONNECTED' : (STATE.backendUrl ? 'OFFLINE' : 'NOT SET'),
    STATE.backendUrl || 'Configure in Settings',
    STATE.backendOnline ? 'online' : 'offline'
  );
  updateStatusCard('sc-model', STATE.activeModel, 'Change in Chat panel', '');
  updateStatusCard('sc-apikey',
    STATE.apiKey ? 'CONFIGURED' : 'NOT SET',
    STATE.apiKey ? `Key: sk-…${STATE.apiKey.slice(-4)}` : 'Set in Settings',
    STATE.apiKey ? 'online' : ''
  );
  updateStatusCard('sc-memory-sub', null, `${STATE.chatHistory.length} messages stored`);
  updateVoiceStatusCard();
}

async function checkBackendStatus() {
  if (!STATE.backendUrl) {
    sysLog('No backend URL configured.', 'warn');
    return;
  }
  sysLog(`Checking backend at ${STATE.backendUrl}…`, 'info');
  try {
    const res = await Promise.race([
      fetch(`${STATE.backendUrl}/api/health`),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
    ]);
    STATE.backendOnline = res.ok;
    sysLog(`Backend ${res.ok ? 'online' : 'returned error ' + res.status}`, res.ok ? 'ok' : 'err');
    refreshStatusPanel();
  } catch {
    STATE.backendOnline = false;
    sysLog('Backend unreachable.', 'err');
    refreshStatusPanel();
  }
}

function updateStatusCard(id, val, sub, cls) {
  const el = $(id);
  if (!el) return;
  if (val !== null && val !== undefined) {
    el.textContent = val;
    el.className = `status-card-val${cls ? ' ' + cls : ''}`;
  }
  const subEl = $(`${id}-sub`);
  if (subEl && sub !== null && sub !== undefined) subEl.textContent = sub;
}

function sysLog(msg, type = 'info') {
  const ts = new Date().toLocaleTimeString();
  STATE.systemLog.unshift({ msg, type, ts });
  if (STATE.systemLog.length > 100) STATE.systemLog.pop();

  const log = $('system-log');
  if (!log) return;
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = `[${ts}] ${msg}`;
  log.insertBefore(line, log.firstChild);
  if (log.children.length > 60) log.removeChild(log.lastChild);
}

// ================================================================
// SETTINGS MODAL
// ================================================================
function initSettingsModal() {
  $('btn-settings').addEventListener('click', openSettings);
  $('modal-settings-close').addEventListener('click', closeSettings);
  $('modal-settings-cancel').addEventListener('click', closeSettings);
  $('modal-settings-save').addEventListener('click', saveSettingsModal);
  $('modal-settings').addEventListener('click', e => { if (e.target === $('modal-settings')) closeSettings(); });

  // Show/hide API key
  $('toggle-apikey-vis').addEventListener('click', () => {
    const inp = $('set-apikey');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  // Rate/pitch sliders
  $('set-voice-rate').addEventListener('input', () => {
    $('rate-badge').textContent = parseFloat($('set-voice-rate').value).toFixed(2);
  });
  $('set-voice-pitch').addEventListener('input', () => {
    $('pitch-badge').textContent = parseFloat($('set-voice-pitch').value).toFixed(2);
  });

  // Test voice
  $('btn-test-voice').addEventListener('click', () => {
    const rate  = parseFloat($('set-voice-rate').value);
    const pitch = parseFloat($('set-voice-pitch').value);
    const voiceIdx = parseInt($('set-voice-select').value);
    const tmpVoice  = STATE.voices[voiceIdx] || STATE.selectedVoice;
    const u = new SpeechSynthesisUtterance(`ARIA voice test. Rate ${rate.toFixed(2)}, pitch ${pitch.toFixed(2)}. Systems nominal.`);
    if (tmpVoice) u.voice = tmpVoice;
    u.rate = rate; u.pitch = pitch;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });

  // PIN change
  $('btn-change-pin').addEventListener('click', changePin);
}

function openSettings() {
  // Populate form with current state
  $('set-apikey').value       = STATE.apiKey;
  $('set-backend-url').value  = STATE.backendUrl;
  $('set-voice-output').checked = STATE.voiceOutputEnabled;
  $('set-voice-rate').value   = STATE.voiceRate;
  $('set-voice-pitch').value  = STATE.voicePitch;
  $('rate-badge').textContent  = STATE.voiceRate.toFixed(2);
  $('pitch-badge').textContent = STATE.voicePitch.toFixed(2);
  $('set-stay-logged-in').checked = STATE.stayLoggedIn;
  $('set-username').value     = STATE.userName;
  $('modal-settings').classList.remove('hidden');
  $('pin-change-msg').classList.add('hidden');
}

function closeSettings() {
  $('modal-settings').classList.add('hidden');
}

function saveSettingsModal() {
  STATE.apiKey         = $('set-apikey').value.trim();
  STATE.backendUrl     = $('set-backend-url').value.trim().replace(/\/$/, '');
  STATE.voiceOutputEnabled = $('set-voice-output').checked;
  STATE.voiceRate      = parseFloat($('set-voice-rate').value);
  STATE.voicePitch     = parseFloat($('set-voice-pitch').value);
  STATE.stayLoggedIn   = $('set-stay-logged-in').checked;
  STATE.userName       = $('set-username').value.trim() || CONFIG.USER_NAME;

  const voiceIdx = parseInt($('set-voice-select').value);
  if (!isNaN(voiceIdx) && STATE.voices[voiceIdx]) {
    STATE.selectedVoice = STATE.voices[voiceIdx];
  }

  saveSettings();
  updateGreeting();
  updateVoiceIcon();
  refreshStatusPanel();
  closeSettings();
  showToast('Settings saved', 'success');
  sysLog('Settings updated.', 'ok');

  // Re-check backend if URL was set
  if (STATE.backendUrl) checkBackendStatus();
}

function changePin() {
  const current = $('set-pin-current').value.trim();
  const newPin  = $('set-pin-new').value.trim();
  const stored  = localStorage.getItem(LS.PIN) || CONFIG.DEFAULT_PIN;
  const msgEl   = $('pin-change-msg');

  msgEl.classList.remove('hidden', 'ok', 'err');

  if (current !== stored) {
    msgEl.textContent = '✗ Current PIN is incorrect.';
    msgEl.classList.add('err');
    return;
  }
  if (!/^\d{4}$/.test(newPin)) {
    msgEl.textContent = '✗ New PIN must be exactly 4 digits.';
    msgEl.classList.add('err');
    return;
  }

  localStorage.setItem(LS.PIN, newPin);
  $('set-pin-current').value = '';
  $('set-pin-new').value = '';
  msgEl.textContent = '✓ PIN changed successfully.';
  msgEl.classList.add('ok');
  sysLog('Access PIN updated.', 'ok');
}

// ================================================================
// DAILY BRIEFING MODAL
// ================================================================
function initBriefingModal() {
  $('modal-briefing-close').addEventListener('click', () => $('modal-briefing').classList.add('hidden'));
  $('modal-briefing').addEventListener('click', e => { if (e.target === $('modal-briefing')) $('modal-briefing').classList.add('hidden'); });
}

function openBriefing() {
  const now  = new Date();
  const body = $('briefing-body');

  // Build briefing content
  // In a real deployment, this would call a news/weather API.
  // Here we show a structured demo briefing.
  const hour   = now.getHours();
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  body.innerHTML = `
    <div style="font-family:var(--font-m);font-size:11px;color:var(--red);letter-spacing:2px;margin-bottom:16px">
      BRIEFING GENERATED — ${now.toLocaleString()}
    </div>

    <div class="briefing-section">
      <div class="briefing-section-title">Overview</div>
      <div class="briefing-item">
        <div class="briefing-item-title">Good ${period}, ${STATE.userName}.</div>
        <div class="briefing-item-meta">ARIA Personal Intelligence System · Web Edition</div>
      </div>
    </div>

    <div class="briefing-section">
      <div class="briefing-section-title">System Status</div>
      <div class="briefing-item">
        <div class="briefing-item-title">ARIA Core — Online</div>
        <div class="briefing-item-meta">Chat history: ${STATE.chatHistory.length} messages · Model: ${STATE.activeModel}</div>
      </div>
      <div class="briefing-item">
        <div class="briefing-item-title">API Connection — ${STATE.apiKey ? 'Key configured' : 'Not configured'}</div>
        <div class="briefing-item-meta">${STATE.apiKey ? 'Real AI responses available' : 'Add API key in Settings to enable AI chat'}</div>
      </div>
      <div class="briefing-item">
        <div class="briefing-item-title">Expenses — ${expenses.length} entries tracked</div>
        <div class="briefing-item-meta">Total: $${expenses.reduce((a,e)=>a+e.amount,0).toFixed(2)}</div>
      </div>
    </div>

    <div class="briefing-section">
      <div class="briefing-section-title">Quick Commands</div>
      <div class="briefing-item">
        <div class="briefing-item-title">Type in chat to control ARIA</div>
        <div class="briefing-item-meta">"open YouTube" · "search Google for X" · "what time is it" · "start voice mode"</div>
      </div>
    </div>

    <div class="briefing-section">
      <div class="briefing-section-title">Connect Live Data <span style="color:var(--text-faint);font-size:9px">(backend required)</span></div>
      <div class="briefing-item">
        <div class="briefing-item-title">News, Weather, Calendar</div>
        <div class="briefing-item-meta">Deploy server.js with your API keys to enable live briefing data.</div>
      </div>
    </div>
  `;

  $('modal-briefing').classList.remove('hidden');
  speak(`Daily briefing ready, ${STATE.userName}. ARIA systems are operational.`);
}

// ================================================================
// TOAST NOTIFICATIONS
// ================================================================
function showToast(message, type = 'info', duration = 3000) {
  const container = $('toast-container');
  const toast     = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ================================================================
// SESSION LOCK
// ================================================================
function lockSession() {
  STATE.authenticated = false;
  localStorage.removeItem(LS.AUTH);
  speechSynthesis.cancel();
  stopVoiceInput();

  const dash = $('screen-dashboard');
  dash.style.display = 'none';
  dash.classList.remove('active');

  // Reset connect lines
  ['cl-0','cl-1','cl-2','cl-3'].forEach(id => {
    const el = $(id);
    if (el) {
      el.className = 'connect-line';
      el.querySelector('.cline-dot').className = 'cline-dot pending';
    }
  });

  STATE.pinBuffer = '';
  updatePinDisplay();
  $('pin-error').classList.add('hidden');

  switchScreen('screen-dashboard', 'screen-access');
  showToast('Session locked', 'info');
}

// ================================================================
// UTILITIES
// ================================================================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  initPinPad();
  runBoot();
});
