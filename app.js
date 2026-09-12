// Firebase Configuration (Demo Persisting Mock DB Instance)
const firebaseConfig = {
  apiKey: "AIzaSyDemoKeyForHackathonSubmissionOnly",
  authDomain: "dayone-rpg.firebaseapp.com",
  projectId: "dayone-rpg",
  storageBucket: "dayone-rpg.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:demo"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// App State
let currentUser = null;
let userData = { level: 1, xp: 0, maxXp: 100, gold: 0, str: 10, int: 10, streak: 1 };
let tasks = [];

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const dashboard = document.getElementById('dashboard');
const authForm = document.getElementById('auth-form');
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');

// Auth Handler
authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  currentUser = email;
  loadUserData();
  authScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  document.getElementById('user-display').innerText = `Hero: ${email.split('@')[0]}`;
});

document.getElementById('logout-btn').addEventListener('click', () => {
  location.reload();
});

// Load persistent data from Local DB Mirror / Cloud Store
function loadUserData() {
  const saved = localStorage.getItem(`rpg_${currentUser}`);
  if (saved) {
    const data = JSON.parse(saved);
    userData = data.userData;
    tasks = data.tasks || [];
  } else {
    tasks = [
      { id: 1, title: 'Complete Web Hackathon Round 1', attr: 'INT', done: false }
    ];
    saveData();
  }
  updateUI();
}

function saveData() {
  if (!currentUser) return;
  localStorage.setItem(`rpg_${currentUser}`, JSON.stringify({ userData, tasks }));
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

  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = '';
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${task.title} <small>(${task.attr})</small></span>
      <div class="task-actions">
        <button class="btn-done" onclick="completeTask(${task.id})">✔️ Complete</button>
        <button class="btn-del" onclick="deleteTask(${task.id})">🗑️ Delete</button>
      </div>
    `;
    taskList.appendChild(li);
  });
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title').value;
  const attr = document.getElementById('task-attr').value;
  tasks.push({ id: Date.now(), title, attr, done: false });
  document.getElementById('task-title').value = '';
  saveData();
  updateUI();
});

window.completeTask = function(id) {
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex > -1) {
    const task = tasks[taskIndex];
    userData.xp += 45;
    userData.gold += 20;
    if (task.attr === 'STR') userData.str += 2;
    if (task.attr === 'INT') userData.int += 2;

    if (userData.xp >= userData.maxXp) {
      userData.level += 1;
      userData.xp -= userData.maxXp;
      userData.maxXp = Math.floor(userData.maxXp * 1.5);
      alert('🎉 LEVEL UP! You reached Level ' + userData.level);
    }

    tasks.splice(taskIndex, 1);
    saveData();
    updateUI();
  }
};

window.deleteTask = function(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveData();
  updateUI();
};