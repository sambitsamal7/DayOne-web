// Initialize Supabase Client
const SUPABASE_URL = 'https://gqinymrhijiardfjvkoh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fazn2s3V2pfA8vzSAYr-QA_X2zeK';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Web Audio Synthesizer (SFX Engine)
const playSFX = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'complete') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'levelup') {
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch(e) { /* Audio context fallback */ }
};

// Application State
let currentUser = null;
let userData = { level: 1, xp: 0, max_xp: 100, gold: 0, str: 10, int: 10, streak: 1, inventory: [], completed_count: 0, custom_title: "Rank I: Shadow Initiate", last_active_date: null };
let tasks = [];
let bossHP = 500;

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const dashboard = document.getElementById('dashboard');
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');

// Authentication Handlers (Supabase Auth)
document.getElementById('signup-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return alert('Please provide email and password');

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert('Sign Up Error: ' + error.message);
  } else {
    alert('Hero created! Logging you in...');
    checkSession();
  }
});

document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return alert('Please provide email and password');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Login Error: ' + error.message);
  } else {
    checkSession();
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

// Session Checker & Real-Time Sync
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    authScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('user-display').innerText = currentUser.email.split('@')[0];
    await loadUserData();
  }
}

// Check session on page load
checkSession();

// Navigation Tabs Router
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    
    btn.classList.add('active');
    const targetTab = btn.getAttribute('data-tab');
    document.getElementById(targetTab).classList.remove('hidden');
  });
});

// Database Load & Save with Dynamic Streak Calculation
async function loadUserData() {
  if (!currentUser) return;

  // 1. Fetch User Stats
  let { data: profile, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // Initial insert for new user
    const today = new Date().toISOString().split('T')[0];
    const initialData = { id: currentUser.id, level: 1, xp: 0, max_xp: 100, gold: 0, str: 10, int: 10, streak: 1, inventory: [], completed_count: 0, custom_title: 'Rank I: Shadow Initiate', last_active_date: today };
    await supabase.from('user_data').insert([initialData]);
    userData = initialData;
  } else if (profile) {
    // Dynamic Streak System Calculation
    const today = new Date();
    const lastActive = profile.last_active_date ? new Date(profile.last_active_date) : null;
    
    if (lastActive) {
      const diffTime = Math.abs(today - lastActive);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        profile.streak += 1;
        profile.last_active_date = today.toISOString().split('T')[0];
        await supabase.from('user_data').update({ streak: profile.streak, last_active_date: profile.last_active_date }).eq('id', currentUser.id);
      } else if (diffDays > 2) {
        profile.streak = 1;
        profile.last_active_date = today.toISOString().split('T')[0];
        await supabase.from('user_data').update({ streak: 1, last_active_date: profile.last_active_date }).eq('id', currentUser.id);
      }
    }
    userData = profile;
  }

  // 2. Fetch Tasks
  const { data: dbTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  
  tasks = dbTasks || [];
  updateUI();
}

async function saveData() {
  if (!currentUser) return;
  
  // Sync User Stats to Supabase Database
  await supabase
    .from('user_data')
    .upsert({
      id: currentUser.id,
      level: userData.level,
      xp: userData.xp,
      max_xp: userData.max_xp,
      gold: userData.gold,
      str: userData.str,
      int: userData.int,
      streak: userData.streak,
      inventory: userData.inventory,
      completed_count: userData.completed_count,
      custom_title: userData.custom_title,
      last_active_date: userData.last_active_date
    });
}

function updateUI() {
  document.getElementById('user-level').innerText = userData.level;
  document.getElementById('user-xp').innerText = userData.xp;
  document.getElementById('max-xp').innerText = userData.max_xp;
  document.getElementById('user-gold').innerText = userData.gold;
  document.getElementById('stat-str').innerText = userData.str;
  document.getElementById('stat-int').innerText = userData.int;
  document.getElementById('streak-count').innerText = userData.streak;

  const heroName = currentUser ? currentUser.email.split('@')[0] : "Hero";
  document.getElementById('profile-name').innerText = heroName;
  document.getElementById('profile-title').innerText = userData.custom_title;
  document.getElementById('profile-completed-count').innerText = userData.completed_count || 0;
  document.getElementById('profile-total-gold').innerText = userData.gold;

  const pct = (userData.xp / userData.max_xp) * 100;
  document.getElementById('xp-bar').style.width = `${pct}%`;

  const gearContainer = document.getElementById('equipped-list');
  if (userData.inventory && userData.inventory.length > 0) {
    gearContainer.innerHTML = userData.inventory.map(item => `<div class="stat-pill">⚔️ ${item}</div>`).join(' ');
  } else {
    gearContainer.innerHTML = '<p class="subtitle">No gear equipped yet. Visit the Item Shop!</p>';
  }

  const bossPct = Math.max(0, (bossHP / 500) * 100);
  document.getElementById('boss-hp').style.width = `${bossPct}%`;
  document.getElementById('boss-hp-text').innerText = `${bossHP} / 500`;

  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = '';
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span><strong>${task.title}</strong> <small style="color:var(--accent-purple)">(${task.attr})</small></span>
      <div class="task-actions">
        <button class="btn-done" aria-label="Complete Quest ${task.title}" onclick="completeTask(${task.id})">✔️ Complete</button>
        <button class="btn-del" aria-label="Delete Quest ${task.title}" onclick="deleteTask(${task.id})">🗑️</button>
      </div>
    `;
    taskList.appendChild(li);
  });
}

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title').value;
  const attr = document.getElementById('task-attr').value;

  const { data, error } = await supabase
    .from('tasks')
    .insert([{ user_id: currentUser.id, title, attr }])
    .select();

  if (!error && data) {
    tasks.unshift(data[0]);
    document.getElementById('task-title').value = '';
    updateUI();
  }
});

window.completeTask = async function(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx > -1) {
    const task = tasks[idx];
    playSFX('complete');
    userData.xp += 50;
    userData.gold += 25;
    userData.completed_count = (userData.completed_count || 0) + 1;

    if (task.attr === 'STR') userData.str += 2;
    if (task.attr === 'INT') userData.int += 2;

    if (userData.xp >= userData.max_xp) {
      playSFX('levelup');
      userData.level += 1;
      userData.xp -= userData.max_xp;
      userData.max_xp = Math.floor(userData.max_xp * 1.5);
      alert(`🎉 LEVEL UP! You reached Level ${userData.level}`);
    }

    await supabase.from('tasks').delete().eq('id', id);
    tasks.splice(idx, 1);
    await saveData();
    updateUI();
  }
};

window.deleteTask = async function(id) {
  await supabase.from('tasks').delete().eq('id', id);
  tasks = tasks.filter(t => t.id !== id);
  updateUI();
};

document.getElementById('save-profile-btn').addEventListener('click', async () => {
  const val = document.getElementById('custom-title-input').value.trim();
  if (val) {
    userData.custom_title = val;
    document.getElementById('custom-title-input').value = '';
    await saveData();
    updateUI();
    alert('Hero Profile Title Updated!');
  }
});

window.buyItem = async function(name, cost, stat, boost) {
  if (userData.gold >= cost) {
    userData.gold -= cost;
    if (stat === 'STR') userData.str += boost;
    if (stat === 'INT') userData.int += boost;
    userData.inventory.push(name);
    playSFX('complete');
    await saveData();
    updateUI();
    alert(`Purchased ${name}!`);
  } else {
    alert('Not enough gold!');
  }
};

window.buyPotion = async function(cost) {
  if (userData.gold >= cost) {
    userData.gold -= cost;
    userData.xp += 50;
    playSFX('complete');
    if (userData.xp >= userData.max_xp) {
      playSFX('levelup');
      userData.level += 1;
      userData.xp -= userData.max_xp;
      userData.max_xp = Math.floor(userData.max_xp * 1.5);
    }
    await saveData();
    updateUI();
  } else {
    alert('Not enough gold!');
  }
};

document.getElementById('attack-boss-btn').addEventListener('click', async () => {
  if (userData.gold >= 10) {
    userData.gold -= 10;
    const damage = userData.str * 2;
    bossHP = Math.max(0, bossHP - damage);
    playSFX('complete');
    if (bossHP === 0) {
      alert('🐲 Boss Defeated! You earned 200 Gold!');
      userData.gold += 200;
      bossHP = 500;
    }
    await saveData();
    updateUI();
  } else {
    alert('You need 10 Gold to attack the boss!');
  }
});