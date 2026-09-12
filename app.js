// ==========================================================================
// LIFE RPG - GAME LOGIC & SUPABASE INTEGRATION
// ==========================================================================

// 1. SUPABASE CLIENT INITIALIZATION
const SUPABASE_URL = 'https://gqinymrhijiardfjvkoh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaW55bXJoaWppYXJkZmp2a29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzQ1NjcsImV4cCI6MjA1NjgxMDU2N30.PLACEHOLDER'; // Ensure your key matches index.html
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State cache
let currentUser = null;
let userData = {
  id: '',
  email: '',
  level: 1,
  xp: 0,
  max_xp: 100,
  gold: 0,
  strength: 10,
  intellect: 10,
  title: 'Shadow Initiate'
};
let bossHp = 500;
const maxBossHp = 500;

// 2. DOM ELEMENTS
const authContainer = document.getElementById('auth-container');
const gameDashboard = document.getElementById('game-dashboard');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const btnLogout = document.getElementById('btn-logout');

const heroEmailEl = document.getElementById('hero-email');
const heroTitleBadgeEl = document.getElementById('hero-title-badge');
const statsLevelEl = document.getElementById('stats-level');
const xpTextEl = document.getElementById('xp-text');
const xpBarTrack = document.querySelector('.xp-bar-track');
const statsGoldEl = document.getElementById('stats-gold');
const attrStrEl = document.getElementById('attr-str');
const attrIntEl = document.getElementById('attr-int');

const questForm = document.getElementById('quest-form');
const questTitleInput = document.getElementById('quest-title');
const questAttrSelect = document.getElementById('quest-attribute');
const questListEl = document.getElementById('quest-list');

const bossHpTextEl = document.getElementById('boss-hp-text');
const bossHpTrack = document.querySelector('.boss-hp-track');
const btnAttackBoss = document.getElementById('btn-attack-boss');

// 3. EVENT LISTENERS
document.addEventListener('DOMContentLoaded', initApp);

btnLogin.addEventListener('click', handleLogin);
btnSignup.addEventListener('click', handleSignup);
btnLogout.addEventListener('click', handleLogout);
questForm.addEventListener('submit', handleAddQuest);
btnAttackBoss.addEventListener('click', handleAttackBoss);

// 4. AUTHENTICATION & INITIALIZATION
async function initApp() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadUserData();
    showDashboard();
  } else {
    showAuth();
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) return alert('Please enter both email and password.');

  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) return alert(`Sign up error: ${error.message}`);

  currentUser = data.user;
  if (currentUser) {
    await createInitialProfile(currentUser.id, currentUser.email);
    showDashboard();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) return alert('Please enter both email and password.');

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return alert(`Login error: ${error.message}`);

  currentUser = data.user;
  await loadUserData();
  showDashboard();
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  showAuth();
}

// 5. DATABASE OPERATIONS
async function createInitialProfile(userId, email) {
  const newProfile = {
    id: userId,
    email: email,
    level: 1,
    xp: 0,
    max_xp: 100,
    gold: 0,
    strength: 10,
    intellect: 10,
    title: 'Shadow Initiate'
  };

  const { error } = await supabaseClient.from('user_data').insert([newProfile]);
  if (error) {
    console.error('Error creating profile:', error);
  } else {
    userData = newProfile;
  }
}

async function loadUserData() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from('user_data')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (data) {
    userData = data;
    updateUI();
    loadQuests();
  } else if (error) {
    console.error('Error fetching user data:', error);
  }
}

async function saveUserData() {
  if (!currentUser) return;
  await supabaseClient.from('user_data').upsert(userData);
}

// 6. QUEST SYSTEM
async function handleAddQuest(e) {
  e.preventDefault();
  const title = questTitleInput.value.trim();
  const attribute = questAttrSelect.value;

  if (!title) return;

  const newQuest = {
    user_id: currentUser.id,
    title: title,
    attribute: attribute,
    completed: false
  };

  const { data, error } = await supabaseClient.from('tasks').insert([newQuest]).select();
  if (!error && data) {
    questTitleInput.value = '';
    renderQuestItem(data[0]);
  }
}

async function loadQuests() {
  questListEl.innerHTML = '';
  const { data } = await supabaseClient
    .from('tasks')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('completed', false);

  if (data) {
    data.forEach(renderQuestItem);
  }
}

function renderQuestItem(quest) {
  const li = document.createElement('li');
  li.className = 'quest-item';
  li.id = `quest-${quest.id}`;
  li.innerHTML = `
    <div>
      <strong>[${quest.attribute}]</strong> ${quest.title}
    </div>
    <button class="btn btn-accent btn-small" onclick="completeQuest('${quest.id}', '${quest.attribute}')">✔️ COMPLETE</button>
  `;
  questListEl.appendChild(li);
}

window.completeQuest = async function(questId, attribute) {
  await supabaseClient.from('tasks').update({ completed: true }).eq('id', questId);
  const el = document.getElementById(`quest-${questId}`);
  if (el) el.remove();

  // Gain XP & Gold
  userData.xp += 35;
  userData.gold += 15;

  if (attribute === 'STR') userData.strength += 1;
  if (attribute === 'INT') userData.intellect += 1;

  // Check Level Up
  if (userData.xp >= userData.max_xp) {
    userData.level += 1;
    userData.xp -= userData.max_xp;
    userData.max_xp = Math.floor(userData.max_xp * 1.5);
    celebrateLevelUp(); // JUICE ANIMATION
  }

  updateUI();
  saveUserData();
};

// 7. DUNGEON BOSS ENGINE
function handleAttackBoss() {
  const damage = userData.strength * 2 + userData.intellect;
  bossHp = Math.max(0, bossHp - damage);

  const fillPct = (bossHp / maxBossHp) * 100;
  bossHpTrack.style.setProperty('--fill', `${fillPct}%`);
  bossHpTextEl.innerText = `${bossHp} / ${maxBossHp}`;

  if (bossHp === 0) {
    alert('🎉 BOSS DEFEATED! Earned 100 Bonus Gold!');
    userData.gold += 100;
    bossHp = maxBossHp;
    bossHpTrack.style.setProperty('--fill', `100%`);
    bossHpTextEl.innerText = `${bossHp} / ${maxBossHp}`;
    updateUI();
    saveUserData();
  }
}

// 8. VISUAL JUICE MOMENT (SCREEN FLASH + PARTICLE BURST)
function celebrateLevelUp() {
  // Radial Cyan Screen Flash
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    inset: 0;
    background: radial-gradient(circle, rgba(0, 240, 255, 0.35), transparent 75%);
    pointer-events: none;
    z-index: 9999;
    animation: flashPulse 0.6s ease-out forwards;
  `;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 600);

  // 24 Particle Radial Burst
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    const angle = (Math.PI * 2 * i) / 24;
    const dist = 90 + Math.random() * 70;
    p.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${i % 2 ? 'var(--accent-cyan)' : 'var(--accent-gold)'};
      box-shadow: 0 0 10px currentColor;
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(p);

    p.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(angle) * dist - 50}%, ${Math.sin(angle) * dist - 50}%) scale(0)`, opacity: 0 }
    ], {
      duration: 750,
      easing: 'ease-out'
    });

    setTimeout(() => p.remove(), 750);
  }
}

// 9. UI UPDATE & HELPER FUNCTIONS
function updateUI() {
  heroEmailEl.innerText = userData.email || 'HERO PROFILE';
  heroTitleBadgeEl.innerText = userData.title || 'Shadow Initiate';
  statsLevelEl.innerText = userData.level;
  xpTextEl.innerText = `${userData.xp} / ${userData.max_xp}`;
  statsGoldEl.innerText = userData.gold;

  attrStrEl.innerText = userData.strength;
  attrIntEl.innerText = userData.intellect;

  // Set CSS progress bar fill variable
  const fillPct = (userData.xp / userData.max_xp) * 100;
  xpBarTrack.style.setProperty('--fill', `${fillPct}%`);
}

function showDashboard() {
  authContainer.classList.add('hidden');
  gameDashboard.classList.remove('hidden');
}

function showAuth() {
  gameDashboard.classList.add('hidden');
  authContainer.classList.remove('hidden');
}