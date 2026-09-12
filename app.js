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
let userData = { level: 1, xp: 0, maxXp: 100, gold: 0, str: 10, int: 10, streak: 1, inventory: [] };
let tasks = [];
let bossHP = 500;

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const dashboard = document.getElementById('dashboard');
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');

// Auth Handler
document.getElementById('login-btn').addEventListener('click', () => {
  const emailInput = document.getElementById('email').value.trim();
  const email = emailInput || "hero@dayone.com";
  
  currentUser = email;
  loadUserData();
  
  authScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  document.getElementById('user-display').innerText = email.split('@')[0];
});

document.getElementById('logout-btn').addEventListener('click', () => location.reload());

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

// Data Persistence
function loadUserData() {
  const saved = localStorage.getItem(`rpg_full_${currentUser}`);
  if (saved) {
    const data = JSON.parse(saved);
    userData = data.userData;
    tasks = data.tasks || [];
    bossHP = data.bossHP !== undefined ? data.bossHP : 500;
  } else {
    tasks = [{ id: 1, title: 'Complete Web Hackathon Submission', attr: 'INT' }];
    saveData();
  }
  updateUI();
}

function saveData() {
  if (!currentUser) return;
  localStorage.setItem(`rpg_full_${currentUser}`, JSON.stringify({ userData, tasks, bossHP }));
}

function updateUI() {
  document.getElementById('user-level').innerText = userData.level;
  document.getElementById('user-xp').innerText = userData.xp;
  document.getElementById('max-xp').innerText = userData.maxXp;
  document.getElementById('user-gold').innerText = userData.gold;
  document.getElementById('stat-str').innerText = userData.str;
  document.getElementById('stat-int').innerText = userData.int;
  document.getElementById('streak-count').innerText = userData.streak;

  const pct = (userData.xp / userData.maxXp) * 100;
  document.getElementById('xp-bar').style.width = `${pct}%`;

  // Update Inventory UI
  const gearContainer = document.getElementById('equipped-list');
  if (userData.inventory && userData.inventory.length > 0) {
    gearContainer.innerHTML = userData.inventory.map(item => `<div class="stat-pill">⚔️ ${item}</div>`).join(' ');
  } else {
    gearContainer.innerHTML = '<p class="subtitle">No gear equipped yet. Visit the Item Shop!</p>';
  }

  // Update Boss UI
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
        <button class="btn-done" onclick="completeTask(${task.id})">✔️ Complete</button>
        <button class="btn-del" onclick="deleteTask(${task.id})">🗑️</button>
      </div>
    `;
    taskList.appendChild(li);
  });
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title').value;
  const attr = document.getElementById('task-attr').value;
  tasks.push({ id: Date.now(), title, attr });
  document.getElementById('task-title').value = '';
  saveData();
  updateUI();
});

window.completeTask = function(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx > -1) {
    const task = tasks[idx];
    playSFX('complete');
    userData.xp += 50;
    userData.gold += 25;
    if (task.attr === 'STR') userData.str += 2;
    if (task.attr === 'INT') userData.int += 2;

    if (userData.xp >= userData.maxXp) {
      playSFX('levelup');
      userData.level += 1;
      userData.xp -= userData.maxXp;
      userData.maxXp = Math.floor(userData.maxXp * 1.5);
      alert(`🎉 LEVEL UP! You reached Level ${userData.level}`);
    }

    tasks.splice(idx, 1);
    saveData();
    updateUI();
  }
};

window.deleteTask = function(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveData();
  updateUI();
};

// Shop System Actions
window.buyItem = function(name, cost, stat, boost) {
  if (userData.gold >= cost) {
    userData.gold -= cost;
    if (stat === 'STR') userData.str += boost;
    if (stat === 'INT') userData.int += boost;
    userData.inventory.push(name);
    playSFX('complete');
    saveData();
    updateUI();
    alert(`Purchased ${name}!`);
  } else {
    alert('Not enough gold!');
  }
};

window.buyPotion = function(cost) {
  if (userData.gold >= cost) {
    userData.gold -= cost;
    userData.xp += 50;
    playSFX('complete');
    if (userData.xp >= userData.maxXp) {
      playSFX('levelup');
      userData.level += 1;
      userData.xp -= userData.maxXp;
      userData.maxXp = Math.floor(userData.maxXp * 1.5);
    }
    saveData();
    updateUI();
  } else {
    alert('Not enough gold!');
  }
};

// Boss Attack Action
document.getElementById('attack-boss-btn').addEventListener('click', () => {
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
    saveData();
    updateUI();
  } else {
    alert('You need 10 Gold to attack the boss!');
  }
});