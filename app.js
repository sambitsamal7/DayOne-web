const SUPABASE_URL = 'https://gqinymrhijiardfjvkoh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaW55bXJoaWppYXJkZmp2a29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMTgwMzYsImV4cCI6MjEwNDc5NDAzNn0.TuM5bOIEg-ewNAD7fvxKkwWEh9z6IUXQ1qw33j-C-4U';

// Initialize properly with 2 separate arguments:
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State tracking
let currentUser = null;
let currentStats = null;

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const authScreen = document.getElementById('auth-screen');
const dashboard = document.getElementById('dashboard');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');

// Stats Elements
const userDisplay = document.getElementById('user-display');
const userLevel = document.getElementById('user-level');
const userXp = document.getElementById('user-xp');
const maxXp = document.getElementById('max-xp');
const xpBar = document.getElementById('xp-bar');
const userGold = document.getElementById('user-gold');
const streakCount = document.getElementById('streak-count');
const statStr = document.getElementById('stat-str');
const statInt = document.getElementById('stat-int');
const taskList = document.getElementById('task-list');

// Profile Elements
const profileName = document.getElementById('profile-name');
const profileTitle = document.getElementById('profile-title');
const customTitleInput = document.getElementById('custom-title-input');
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileCompletedCount = document.getElementById('profile-completed-count');
const profileTotalGold = document.getElementById('profile-total-gold');

// ==========================================
// 3. SOUND SYNTHESIZER (Web Audio API)
// ==========================================
function playSFX(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'levelUp') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'complete') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.log('Audio disabled or blocked by browser.');
  }
}

// ==========================================
// 4. AUTHENTICATION LOGIC
// ==========================================
async function handleSignUp() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) return alert('Please enter both email and passcode.');

  const { data, error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    alert('Sign Up Error: ' + error.message);
  } else if (data.user) {
    currentUser = data.user;
    await initializeUserData(data.user.id, email);
    showDashboard();
  }
}

async function handleLogIn() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) return alert('Please enter both email and passcode.');

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    alert('Log In Error: ' + error.message);
  } else if (data.user) {
    currentUser = data.user;
    await loadUserData();
    showDashboard();
  }
}

async function handleLogOut() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  currentStats = null;
  dashboard.classList.add('hidden');
  authScreen.classList.remove('hidden');
}

// Attach Auth Listeners
if (signupBtn) signupBtn.addEventListener('click', handleSignUp);
if (loginBtn) loginBtn.addEventListener('click', handleLogIn);
if (logoutBtn) logoutBtn.addEventListener('click', handleLogOut);

// Prevent form page reload on submit
if (authForm) {
  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogIn();
  });
}

// Check existing session on load
window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    await loadUserData();
    showDashboard();
  }
});

// ==========================================
// 5. DATABASE PERSISTENCE & USER DATA
// ==========================================
async function initializeUserData(userId, email) {
  const defaultData = {
    id: userId,
    email: email,
    level: 1,
    xp: 0,
    max_xp: 100,
    gold: 0,
    streak: 1,
    strength: 10,
    intellect: 10,
    title: 'Shadow Initiate',
    quests_completed: 0,
    last_login: new Date().toISOString()
  };

  const { error } = await supabaseClient.from('user_data').insert([defaultData]);
  if (error && error.code !== '23505') {
    console.error('Error creating user profile:', error);
  }
  await loadUserData();
}

async function loadUserData() {
  if (!currentUser) return;

  let { data, error } = await supabaseClient
    .from('user_data')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (!data) {
    await initializeUserData(currentUser.id, currentUser.email);
    return;
  }

  currentStats = data;
  updateUI();
  await loadTasks();
}

function updateUI() {
  if (!currentStats) return;

  if (userDisplay) userDisplay.textContent = currentStats.email || 'Hero';
  if (userLevel) userLevel.textContent = currentStats.level;
  if (userXp) userXp.textContent = currentStats.xp;
  if (maxXp) maxXp.textContent = currentStats.max_xp;
  if (userGold) userGold.textContent = currentStats.gold;
  if (streakCount) streakCount.textContent = currentStats.streak;
  if (statStr) statStr.textContent = currentStats.strength;
  if (statInt) statInt.textContent = currentStats.intellect;

  if (profileName) profileName.textContent = currentStats.email.split('@')[0];
  if (profileTitle) profileTitle.textContent = currentStats.title || 'Shadow Initiate';
  if (profileCompletedCount) profileCompletedCount.textContent = currentStats.quests_completed || 0;
  if (profileTotalGold) profileTotalGold.textContent = currentStats.gold;

  const pct = Math.min((currentStats.xp / currentStats.max_xp) * 100, 100);
  if (xpBar) xpBar.style.width = `${pct}%`;
}

function showDashboard() {
  authScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
}

// ==========================================
// 6. QUEST & TASK MANAGEMENT
// ==========================================
async function loadTasks() {
  if (!currentUser) return;

  const { data: tasks, error } = await supabaseClient
    .from('tasks')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) return console.error('Error fetching tasks:', error);

  if (taskList) {
    taskList.innerHTML = '';
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;
      li.innerHTML = `
        <div>
          <strong>${task.title}</strong>
          <span class="badge">[+${task.attribute || 'STR'}]</span>
        </div>
        ${!task.completed ? `<button onclick="completeTask('${task.id}')">✔️ Complete</button>` : '<span>Done</span>'}
      `;
      taskList.appendChild(li);
    });
  }
}

const taskForm = document.getElementById('task-form');
if (taskForm) {
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('task-title');
    const attrInput = document.getElementById('task-attr');

    const title = titleInput.value.trim();
    const attribute = attrInput.value;

    if (!title || !currentUser) return;

    const { error } = await supabaseClient.from('tasks').insert([
      { user_id: currentUser.id, title: title, attribute: attribute, completed: false }
    ]);

    if (!error) {
      titleInput.value = '';
      await loadTasks();
    }
  });
}

window.completeTask = async function(taskId) {
  const { error } = await supabaseClient
    .from('tasks')
    .update({ completed: true })
    .eq('id', taskId);

  if (!error) {
    playSFX('complete');
    currentStats.xp += 25;
    currentStats.gold += 15;
    currentStats.quests_completed = (currentStats.quests_completed || 0) + 1;

    if (currentStats.xp >= currentStats.max_xp) {
      currentStats.level += 1;
      currentStats.xp -= currentStats.max_xp;
      currentStats.max_xp = Math.floor(currentStats.max_xp * 1.5);
      playSFX('levelUp');
      alert(`🎉 LEVEL UP! You reached Level ${currentStats.level}!`);
    }

    await supabaseClient
      .from('user_data')
      .update({
        xp: currentStats.xp,
        max_xp: currentStats.max_xp,
        level: currentStats.level,
        gold: currentStats.gold,
        quests_completed: currentStats.quests_completed
      })
      .eq('id', currentUser.id);

    updateUI();
    await loadTasks();
  }
};

// ==========================================
// 7. TAB NAVIGATION & OTHER ENGINE LOGIC
// ==========================================
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));

    btn.classList.add('active');
    const targetTab = document.getElementById(btn.dataset.tab);
    if (targetTab) targetTab.classList.remove('hidden');
  });
});

if (saveProfileBtn) {
  saveProfileBtn.addEventListener('click', async () => {
    const newTitle = customTitleInput.value.trim();
    if (!newTitle || !currentUser) return;

    currentStats.title = newTitle;
    await supabaseClient.from('user_data').update({ title: newTitle }).eq('id', currentUser.id);
    customTitleInput.value = '';
    updateUI();
    alert('Title updated!');
  });
}

window.buyItem = async function(itemName, cost, statType, boost) {
  if (!currentStats || currentStats.gold < cost) return alert('Not enough gold!');

  currentStats.gold -= cost;
  if (statType === 'STR') currentStats.strength += boost;
  if (statType === 'INT') currentStats.intellect += boost;

  await supabaseClient
    .from('user_data')
    .update({
      gold: currentStats.gold,
      strength: currentStats.strength,
      intellect: currentStats.intellect
    })
    .eq('id', currentUser.id);

  updateUI();
  alert(`Purchased ${itemName}!`);
};

window.buyPotion = async function(cost) {
  if (!currentStats || currentStats.gold < cost) return alert('Not enough gold!');

  currentStats.gold -= cost;
  currentStats.xp += 50;
  if (currentStats.xp >= currentStats.max_xp) {
    currentStats.level += 1;
    currentStats.xp -= currentStats.max_xp;
    currentStats.max_xp = Math.floor(currentStats.max_xp * 1.5);
    playSFX('levelUp');
  }

  await supabaseClient
    .from('user_data')
    .update({ gold: currentStats.gold, xp: currentStats.xp, max_xp: currentStats.max_xp, level: currentStats.level })
    .eq('id', currentUser.id);

  updateUI();
  alert('Drank XP Potion (+50 XP)!');
};

const attackBossBtn = document.getElementById('attack-boss-btn');
if (attackBossBtn) {
  attackBossBtn.addEventListener('click', () => {
    if (!currentStats || currentStats.gold < 10) return alert('You need 10 Gold to strike the boss!');

    currentStats.gold -= 10;
    const bossHpText = document.getElementById('boss-hp-text');
    const bossHpBar = document.getElementById('boss-hp');

    let currentHp = parseInt(bossHpText.textContent) || 500;
    let damage = Math.floor(Math.random() * 20) + currentStats.strength;
    currentHp = Math.max(0, currentHp - damage);

    bossHpText.textContent = `${currentHp} / 500`;
    bossHpBar.style.width = `${(currentHp / 500) * 100}%`;

    playSFX('complete');
    updateUI();
    alert(`💥 Struck the Shadow Dragon for ${damage} damage!`);
  });
}