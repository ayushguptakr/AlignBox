
const socket = io();
const messagesEl = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const nameInput = document.getElementById('nameInput');
const anonBar = document.getElementById('anonBar');
const anonToggle = document.getElementById('anonToggle');
const anonText = document.getElementById('anonText');

let isAnonymous = true;

// persistent client id to detect "my messages"
let clientId = sessionStorage.getItem('clientId');
if (!clientId) {
  clientId = 'c_' + Math.random().toString(36).slice(2, 12);
  sessionStorage.setItem('clientId', clientId);
}

// toggle anonymous mode
anonToggle.addEventListener('click', () => {
  isAnonymous = !isAnonymous;
  anonBar.style.display = isAnonymous ? 'flex' : 'none';
  anonToggle.style.opacity = isAnonymous ? '1' : '0.6';
  anonText.textContent = isAnonymous ? "Now you're appearing as Anonymous!" : "You're appearing as yourself";
});

// init UI
anonBar.style.display = isAnonymous ? 'flex' : 'none';

// display many messages
function renderMessages(arr){
  messagesEl.innerHTML = '';
  arr.forEach(m => appendMessage(m));
  // scroll bottom
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function formatTime(ts) {
  const d = new Date(ts);
  const hh = d.getHours();
  const mm = d.getMinutes().toString().padStart(2,'0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const hh12 = ((hh + 11) % 12 + 1);
  return `${hh12}:${mm} ${ampm}`;
}

function appendMessage(msg) {
  // msg fields: id, client_id, user_name, is_anonymous, message_text, created_at
  const isMine = msg.client_id === clientId;
  const li = document.createElement('li');
  li.className = 'msg ' + (isMine ? 'right' : 'left');

  if (!isMine) {
    // avatar + bubble
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.style.backgroundImage = `url('https://i.pravatar.cc/40?u=${encodeURIComponent(msg.user_name||'anon')}')`;
    avatar.style.backgroundSize = 'cover';
    li.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  // show sender name (if not anonymous)
  if (!msg.is_anonymous && !isMine) {
    const sender = document.createElement('div');
    sender.className = 'sender';
    sender.textContent = msg.user_name || 'User';
    bubble.appendChild(sender);
  } else if (!msg.is_anonymous && isMine) {
    // show small name on right bubble too if needed
  } else if (msg.is_anonymous && !isMine) {
    const sender = document.createElement('div');
    sender.className = 'sender';
    sender.textContent = 'Anonymous';
    bubble.appendChild(sender);
  }

  const txt = document.createElement('div');
  txt.textContent = msg.message_text;
  bubble.appendChild(txt);

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = formatTime(msg.created_at);
  bubble.appendChild(meta);

  li.appendChild(bubble);

  if (isMine) {
    // add small check icon
    const tick = document.createElement('div');
    tick.className = 'avatar';
    tick.style.width = '22px';
    tick.style.height = '22px';
    tick.style.background = 'transparent';
    tick.style.display = 'flex';
    tick.style.alignItems = 'center';
    tick.style.justifyContent = 'center';
    tick.textContent = '✓✓';
    li.appendChild(tick);
  }

  messagesEl.appendChild(li);
  // auto scroll
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;
  const payload = {
    client_id: clientId,
    name: nameInput.value.trim() || 'You',
    isAnonymous: isAnonymous,
    text
  };
  socket.emit('send message', payload);
  messageInput.value = '';
}

// socket handlers
socket.on('connect', () => {
  console.log('connected to socket');
});

socket.on('init messages', (rows) => {
  renderMessages(rows);
});

socket.on('new message', (msg) => {
  appendMessage(msg);
});
