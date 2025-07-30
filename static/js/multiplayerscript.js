let gnrbutton = document.querySelectorAll(".gen-button");
let strtbutton = document.querySelectorAll(".start-button");
let title = document.querySelector(".main-title");
let startmenu = document.querySelector(".canvas-cover");
let start_startmenu = document.querySelector(".start-menu");
let endmenu = document.querySelector(".end-menu");
let a_menu = document.querySelector("#option-a");
let b_menu = document.querySelector("#option-b");
let c_menu = document.querySelector("#option-c");
let d_menu = document.querySelector("#option-d");
let e_menu = document.querySelector("#option-e");
let matchSelect = document.querySelectorAll(".mode-button");

const palette = [
  "#9039f3", "#ed3ef3", "#f37ee9", "#988ef0",
  "#7b68ee", "#c71585", "#8a2be2", "#4169e1"
];

let moveAudio = new Audio("/static/sounds/game-move.mp3");
let startAudio = new Audio("/static/sounds/game-start.mp3");
let overAudio = new Audio("/static/sounds/game-over.mp3");
let startAudio_1 = new Audio("/static/sounds/start-1.mp3");
let victoryAudio = new Audio("/static/sounds/victory.mp3");
let wrongMusic = new Audio("/static/sounds/wrong.mp3");
let loadmusic = new Audio("/static/sounds/loading.wav");
let matchfoundmusic = new Audio("/static/sounds/match-found.wav");
let lockMusic = new Audio('/static/sounds/lock-item.wav');

let state = 0;
let game = [[2, 2, 2], [2, 2, 2], [2, 2, 2]];
let gameOver = false;
let gameMode=0;
let isCross;
let ongoingMove;
let end;
let playerX;
let myMove

//start of changes
const socket = io();
let playerCounter = document.getElementById("playerCounter");
let sideBar = document.querySelector(".side-bar");
let playerCountBar = document.getElementsByClassName("player-count");
let messageBoard = document.getElementsByClassName("message-board");

function removeboxbg(){
  let boxes = document.querySelectorAll('.box');
  boxes.forEach(box => {
    box.style.backgroundColor = 'rgba(0, 0, 0, 0)';
});
}

function showBox(className) {
  const box = document.querySelector('.'+className);
  box.classList.remove("hidden", "fade-out");
  box.classList.add("fade-in");
}

function hideBox(className) {
  const box = document.querySelector('.'+className);
  box.classList.remove("fade-in");
  box.classList.add("fade-out");

  // Add .hidden *after* the fade-out animation finishes
  setTimeout(() => {
    box.classList.add("hidden");
  }, 300); // match your fadeSlideOut animation duration
}


document.addEventListener('DOMContentLoaded', ()=>{
    socket.on('connect', () => {
        console.log(userID+"was routed to multiplayer");
        socket.emit('user_multiplayer', {'user-id':userID});
        startAudio_1.play()
        addChatMessage("welcome to multiplayer", 'server', 'server');
    });
    socket.on('online_player_change', (data) => {
        playerCount=data['new-count'];
        playerCounter.innerText='Players Online: '+playerCount;
    });
    socket.on('global_message_client', (data)=>{
        user = data['userID'];

    });
    if (window.innerWidth > 480) return; // ❌ Only for mobile

  const sidebar = document.querySelector('.side-bar');
  const dragHandle = document.querySelector('.drag-handle');

  if (!sidebar || !dragHandle) return;

  let isDragging = false;
  let startY = 0;
  let startTop = 0;
  let startHeight = 0;

  const minHeight = 100;
  const maxHeight = window.innerHeight * 0.85;

  const startDrag = (y) => {
    isDragging = true;
    startY = y;
    startTop = sidebar.getBoundingClientRect().top;
    startHeight = sidebar.offsetHeight;

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', touchMoveHandler);
    document.addEventListener('touchend', stopDrag);
  };

  const mouseMoveHandler = (e) => updateDrag(e.clientY);
  const touchMoveHandler = (e) => {
    if (e.touches.length === 1) {
      updateDrag(e.touches[0].clientY);
    }
  };

  const updateDrag = (currentY) => {
    if (!isDragging) return;
    const dy = currentY - startY;
    let newTop = startTop + dy;
    newTop = Math.min(Math.max(0, newTop), window.innerHeight - minHeight);
    const newHeight = window.innerHeight - newTop;

    sidebar.style.top = `${newTop}px`;
    sidebar.style.height = `${newHeight}px`;
  };

  const stopDrag = () => {
    isDragging = false;
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', touchMoveHandler);
    document.removeEventListener('touchend', stopDrag);
  };

  dragHandle.addEventListener('mousedown', (e) => startDrag(e.clientY));
  dragHandle.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) startDrag(e.touches[0].clientY);
  });
  });

// ------------------ Chat helpers ------------------
const msgBoard = document.querySelector('.message-board');

/**
 * Adds a line to the board, animates it in, and scrolls down.
 * @param {string} text  – the message you want to display
 */
function addChatMessage(message, time = null, sender = 'other') {
  const msgEl = document.createElement('div');

  // Sender styles
  let color = 'black';
  let senderLabel = '';

  if (sender === 'server') {
    senderLabel = 'Server';
    color = 'orange';
    msgEl.style.borderColor = 'orange';
    msgEl.style.backgroundColor = 'rgba(255, 229, 100, 0.2)';
  } else if (sender === 'me') {
    senderLabel = 'You';
    color = 'green';
    msgEl.style.borderColor = 'green';
    msgEl.style.backgroundColor = 'rgba(173, 255, 173, 0.2)';
  } else {
    senderLabel = sender;
    color = 'deepskyblue';
    msgEl.style.borderColor = 'deepskyblue';
    msgEl.style.backgroundColor = 'rgba(173, 216, 255, 0.2)';
  }

  // Build message content
  msgEl.innerHTML = `
    <span class="sender" style="color: ${color}">${senderLabel}:</span>
    <span style="color: black;">${message}</span>
    ${time ? `<div class="timestamp">${time}</div>` : ''}
  `;

  document.querySelector('.message-board').appendChild(msgEl);
  document.querySelector('.message-board').scrollTop = document.querySelector('.message-board').scrollHeight;
}

/* ---------- Example: Socket.IO hookup ---------- */
socket.on('global_message_client', ({ userID: senderID, message, time }) => {
  let sender=senderID;
  if (sender) {
    if (senderID === userID) sender = 'me';
  }
  else{
    sender='server'
  }
  addChatMessage(message, time=time, sender);
});

/* ---------- Example: send on Enter key ---------- */
let chat = document.getElementById('chatInput');
chat.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    socket.emit('global_message_server', {'user-ID':userID, 'message': e.target.value.trim() });
    e.target.value = '';
  }
});
document.getElementById('msgbutton').addEventListener('click', ()=>{
    if (chat.value.trim()) {
    socket.emit('global_message_server', {'user-ID':userID, 'message': chat.value.trim() });
    chat.value = '';
  }
});

//end of changes

///////////////////// START OF MATCHMAKING //////////////////////////

////// TIMER///////
let matchFound = false
let timerInterval;
let secondsElapsed = 0;

function startMatchmakingTimer() {
  const timerEl = document.getElementById("matchmaking-timer");
  secondsElapsed = 0;

  timerInterval = setInterval(() => {
    secondsElapsed++;
    if (!matchFound) loadmusic.play();   
    const minutes = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const seconds = String(secondsElapsed % 60).padStart(2, '0');

    timerEl.textContent = `${minutes}:${seconds}`;
  }, 1000);
}

function stopMatchmakingTimer() {
  clearInterval(timerInterval);
  document.getElementById("matchmaking-timer").textContent = "00:00";
}

// === Base values ===
let playerTime = 0;
let opponentTime = 0;
let activeTimer = null;
let lastUpdate = null;

let playerBox = document.getElementById('player-box');
let opponentBox = document.getElementById('opponent-box');
let playerTimerEl = document.getElementById('player-timer');
let opponentTimerEl = document.getElementById('opponent-timer');

// Format seconds to 2 decimal places
function formatTime(seconds) {
  return seconds.toFixed(2);
}

// Main loop to update the running timer
function update() {
  const now = performance.now();
  if (lastUpdate && activeTimer) {
    const delta = (now - lastUpdate) / 1000;

    if (activeTimer === 'player') {
      playerTime += delta;
      playerTimerEl.textContent = formatTime(playerTime);
    } else if (activeTimer === 'opponent') {
      opponentTime += delta;
      opponentTimerEl.textContent = formatTime(opponentTime);
    }
  }
  lastUpdate = now;
  requestAnimationFrame(update);
}

// ✅ Start Player's Stopwatch
function startPlayerTimer() {
  activeTimer = 'player';
  lastUpdate = performance.now();
  playerBox.classList.add('active');
  opponentBox.classList.remove('active');
}

// ✅ Start Opponent's Stopwatch
function startOpponentTimer() {
  activeTimer = 'opponent';
  lastUpdate = performance.now();
  opponentBox.classList.add('active');
  playerBox.classList.remove('active');
}

// ✅ Stop Both Timers
function stopTimers() {
  activeTimer = null;
  playerBox.classList.remove('active');
  opponentBox.classList.remove('active');
}

function resetTimers() {
  // Reset time values
  playerTime = 0;
  opponentTime = 0;

  // Reset display
  playerTimerEl.textContent = formatTime(playerTime);
  opponentTimerEl.textContent = formatTime(opponentTime);

  // Optional: Stop any active timer
  stopTimers();

  // Optional: Reset lastUpdate (if you plan to resume timer later)
  lastUpdate = null;
}



// 🔁 Start the loop
requestAnimationFrame(update);


////// TIMER///////

let multigameMode =0;

matchSelect.forEach(
  button => {
    button.addEventListener('click', function(event){
      matchmodestart(event);
    });
  }
)
function matchmodestart(event){
  let id = event.currentTarget.id;
  let mainint = id[6];
  switch(mainint){
    case '1':
      joinRoom();
      break;
    case '2':
      createRoom();
      break;
    case '3':
      startRandomMatchmaking();
      break;
  }
}
/////////////////////////////// CREATE ROOM AND JOIN ROOM LOGIC START /////////////////////////////////////

const createRoomBox = document.getElementById('create-room-box');
const joinRoomBox = document.getElementById('join-room-box');
const createInputValue = document.getElementById('room-code');

function createRoom()
{
  hideBox('start-menu');
  createRoomBox.classList.remove('hidden');
  socket.emit('create_room');
}
function joinRoom()
{
  hideBox('start-menu');
  joinRoomBox.classList.remove('hidden');
}

socket.on('respond_room_code', (data)=>{
  room=data['room_code'];
  createInputValue.value = room;
})

const copybtn = document.getElementById('copy-btn');
copybtn.onclick = () => {
  const code = document.getElementById('room-code').value;
  navigator.clipboard.writeText(code).then(() => {
    copybtn.textContent = "✅";

    // Revert back to clipboard after 1 second
    setTimeout(() => {
      copybtn.textContent = "📋";
    }, 2000);
  });
};

let code = document.getElementById('join-code').value.trim();
/* Join button example */
document.getElementById('join-btn').onclick = () => {
  code = document.getElementById('join-code').value.trim();
  if (code) socket.emit('join_room', { room: code });
  else alert('please enter room code');
}

function joinRoomLeave()
{
  joinRoomBox.classList.add('hidden');
  showBox('start-menu');
  start_startmenu.classList.remove('fade-out');
  code.value = '';
}

function createRoomLeave()
{
  createRoomBox.classList.add('hidden');
  showBox('start-menu');
  start_startmenu.classList.remove('fade-out');
  socket.emit('create_room_leave');
}

socket.on('room_not_found', ()=>{
  let joinRoomTitle = document.getElementById('join-room-text');
  joinRoomTitle.innerText = 'Room not found!';
  wrongMusic.play();
  
  setTimeout(()=>{
    joinRoomTitle.innerText = 'Join Room';
  }, 1000);
});
/////////////////////////////// CREATE ROOM AND JOIN ROOM LOGIC END /////////////////////////////////////

matchmakingbox = document.querySelector('.matchmaking-box');
function startRandomMatchmaking(){
  console.log('random matchmaking started');
  startMatchmakingTimer();

  hideBox('start-menu');
  showBox('matchmaking-box');
  socket.emit('start_random_matchmaking', {'user-ID':userID});
}
function cancelMatchmaking() {
  confirmButton.classList.remove('checked');
  confirmButton.innerText='Confirm Match!';
  confirmButton.classList.add('hidden');
  stopMatchmakingTimer();
  hideBox("matchmaking-box");

  socket.emit('stop_matchmaking', {
    'user-ID': userID,
    'room': room  // ✅ send the room to the server
  });

  setTimeout(() => {
    showBox("start-menu");
    matchtext.innerText='Sit tight, finding you a match…'
  }, 300);
}

function matchConfirmed(){
  confirmButton.classList.add('checked');
  confirmButton.innerText='Confirmed!';
  box.classList.remove('match-found-pop');
  backButton.classList.add('hidden');

  lockMusic.play();
  socket.emit('confirm_match');
}

room = ''
matchtext=document.querySelector('.match-text');
const box = document.querySelector('.matchmaking-box');
const confirmButton = document.querySelector('.confirm-button')
const backButton = document.querySelector('.back-button');

socket.on('match_found', (data)=>{
  matchFound=true
  player1 = data['player1'];
  player2 = data['player2'];
  room = data['room'];
  opponent = '';
  matchfoundmusic.play();

  box.classList.add('match-found-pop');
  confirmButton.classList.remove('hidden');

  if (player1==userID) opponent=player2;
  else opponent = player1;

  matchtext.innerText='found match against '+opponent+'!';
});
socket.on('matchmaking_cancel', () => {
  matchtext.innerText = 'user left! match cancelled';
  confirmButton.classList.remove('checked');
  confirmButton.innerText='Confirm Match!';
  confirmButton.classList.add('hidden');
  box.classList.remove('match-found-pop');
  backButton.classList.remove('hidden');

  setTimeout(() => {
    matchtext.innerText = 'Sit tight, finding you a match…';
    
    
    // ✅ Restart matchmaking with correct user-ID
    socket.emit('start_random_matchmaking', { 'user-ID': userID });

    matchFound=false;

    // ✅ Clear room after you're done using it
    room = '';
  }, 2500);
});

///////////////////// END OF MATCHMAKING //////////////////////////

///////////////////// START OF GAMELOGIC //////////////////////////

let timers = document.querySelector('.timer-container');
let enemyid = document.querySelector('#enemytitle');
function putAsideBar()
{
    const sideBar = document.querySelector('.side-bar'); // make sure this is defined
    const inputbox = document.querySelector('.input-box');
    const inputArea = document.getElementById('chatInput');
    sideBar.style.top = '17rem'; // move up
    sideBar.style.left = 'calc(79%)'; // move to the side
    sideBar.style.backgroundColor = 'rgba(255, 255, 255, 0.92)';
    inputbox.style.backgroundColor = 'rgba(255, 255, 255, 0.82)';
    inputArea.style.backgroundColor = 'rgba(255, 255, 255, 0.92)';

    const playerCountBar = document.querySelector('.player-count');
    if (playerCountBar) {
        playerCountBar.style.backgroundColor = 'rgba(255, 255, 255, 0.65)';
    }
}

socket.on('player_tag', (data)=>{
  if (data['player-1']==userID)
  {opponent = data['player-2'];}
  else
  {opponent=data['player-1'];}
});

socket.on('start_match', (data)=>{
  let firstmove=data['firstmove'];
  myMove = (firstmove==userID);
  let playerx = data['playerX'];
  playerX = (playerx==userID);
  stopMatchmakingTimer();
  matchtext.innerText = 'Sit tight, finding you a match…';
  confirmButton.classList.remove('checked');
  confirmButton.classList.add('hidden');
  box.classList.remove('match-found-pop');
  backButton.classList.remove('hidden');

  if(myMove && playerX) title.innerText='First move is yours!, you are X';
  else if(myMove && !playerX) title.innerText='First move is yours!, you are O';
  else if(!myMove && playerX) title.innerText='Opponents Move!, you are X';
  else title.innerText='Opponents Move!, you are O';
  enemyid.innerText=opponent+':';
  
  matchmakingbox.classList.add('hidden');
  startmenu.classList.add('hidden');
  joinRoomBox.classList.add('hidden');
  createRoomBox.classList.add('hidden');
  timers.classList.remove('hidden');
  if(window.innerWidth>480)
  {putAsideBar(); title.style.fontSize = "3.5rem";}
  else{
    title.style.fontSize = "1.3rem";
  }
  if (myMove) startPlayerTimer();
  else startOpponentTimer();
  
});

gnrbutton.forEach(button => {
    button.addEventListener('click', function(event) {
        if(myMove)
        {
            console.log("my move");
            userMove(event);
        }
        else{
            console.log("not my move");
        } // Move this inside buttonClick if needed before placing the image
    });
});

function userMove(event){
  let id = event.target.id;       // e.g. "box-0"
  let imgdiv = document.getElementById(id);
  let mainint = id[4];
  const row = Math.floor((mainint - 1) / 3);
  const col = (mainint - 1) % 3;

  if (imgdiv.children.length > 0) {
        console.log("Already filled!");
        return;
    }

  let img = document.createElement("img");
  if (playerX) {
      img.src = "/static/images/cross.png";
      img.alt = "Cross";

  } else {
      img.src = "/static/images/zero.png";
      img.alt = "Zero";
  }

  img.classList.add("symbol");
  imgdiv.append(img);
  moveAudio.play();
  imgdiv.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';

  socket.emit('user_move_server', {'i':col+1, 'j':row+1});

}

 socket.on('opponent_move', (data)=>{
  let i = data['i']
  let j = data['j']
  if(myMove){
    startOpponentTimer();
    myMove=false
    title.innerText='You played '+(i)+', '+(j);

    setTimeout(()=>{
      if((!gameOver))
      { title.innerText='Opponents move!';}
    }, 1000);
  }

  else{
    myMove=true
    startPlayerTimer();
    
    title.innerText='Opponent played '+(i)+', '+(j);
    
    let box_int = ((i)+3*(j-1))
    id = 'box-'+box_int
    let imgdiv = document.getElementById(id);
    let img = document.createElement("img");
    if (!playerX) {
        img.src = "/static/images/cross.png";
        img.alt = "Cross";

    } else {
        img.src = "/static/images/zero.png";
        img.alt = "Zero";
    }

    img.classList.add("symbol");
    imgdiv.append(img);
    moveAudio.play();
    imgdiv.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
    setTimeout(()=>{
      if((myMove) && (!gameOver))
    { title.innerText='Your move!';}
    }, 1500);
    }
 });

 function applyGlow(color) {
  const cells = document.querySelectorAll('.box');
  cells.forEach(cell => {
    if (color === 'green') cell.classList.add('win-box-1');
    else if (color === 'red') cell.classList.add('win-box');
  });
}
function removeEverything() {
  const cells = document.querySelectorAll('.box');
  cells.forEach(cell => {
    cell.classList.remove('win-box-1');
    cell.classList.remove('win-box');
    cell.innerHTML='';
  });
}

// Call this after game ends
// applyGlow('green'); // for win
// applyGlow('red');   // for draw or loss

 socket.on("draw_decided_by_time",(data)=>{
    winner = data['winner'];
    timediff = data['time_diff'];
    gameOver=true;
    console.log('game-over');
    stopTimers();

    if(winner==userID)
    {
      applyGlow('green');
      title.innerHTML='You won on time!!';
      victoryAudio.play();
      setTimeout(()=>{
        startmenu.classList.remove('hidden');
        timers.classList.add('hidden');
        showGameOverBox('you won on time against '+opponent+' by '+ timediff+'s!');
        confirmButton.innerText='Confirm Match!';
        removeboxbg();
        resetTimers();
      }, 2500);
    }
    else
    {
      applyGlow('red');
      title.innerHTML='You lost on time...';
      overAudio.play();
      setTimeout(()=>{
        startmenu.classList.remove('hidden');
        timers.classList.add('hidden');
        showGameOverBox('you lost on time against '+opponent+' by '+ timediff+'s!');
        confirmButton.innerText='Confirm Match!';
        removeboxbg();
        resetTimers();
      }, 2500);
    }
 });

 socket.on("match_won", (data)=>{
  gameOver=true;
  stopTimers();
  winner=data['winner'];
  let box1 ='box-'+ data['box-1'];
  let box2 ='box-'+ data['box-2'];
  let box3 ='box-'+  data['box-3'];
  console.log("winning boxes are- " + box1 + ", " + box2 + ", " + box3);
  ids = [box1, box2, box3];

  if((winner=='playerX'&&playerX)||(winner=='playerO'&&(!playerX)))
  {
    ids.forEach(id => {
      document.getElementById(id).classList.add("win-box-1");
    });
    drawWinningLine(box1, box3, isGreen=true);
    victoryAudio.play();
    title.innerHTML='You won!!';
    setTimeout(()=>{
      startmenu.classList.remove('hidden');
      timers.classList.add('hidden');
      showGameOverBox('you won against '+opponent+'!');
      confirmButton.innerText='Confirm Match!';
      removeboxbg();
      resetTimers();
      }, 2500);
  }
  else
  {
    ids.forEach(id => {
      document.getElementById(id).classList.add("win-box");
    });
    drawWinningLine(box1, box3);
    overAudio.play();
    title.innerHTML='You lost....';
    setTimeout(()=>{
      startmenu.classList.remove('hidden');
      timers.classList.add('hidden');
      confirmButton.innerText='Confirm Match!';
      showGameOverBox('you lost against '+opponent+'!');
      removeboxbg();
      resetTimers();
      }, 2500);
  }
 });
 socket.on('match_cancel', ()=>{
  gameOver=true;
  stopTimers();
  victoryAudio.play();
  title.innerHTML=opponent+' left, You won!!';
    setTimeout(()=>{
      startmenu.classList.remove('hidden');
      timers.classList.add('hidden');
      showGameOverBox(opponent+' left, You won!!');
      confirmButton.innerText='Confirm Match!';
      removeboxbg();
      resetTimers();
      }, 2500);
 });


 function showGameOverBox(resultText, trophyMessage = "") {
  document.getElementById("game-result-text").textContent = resultText;
  document.getElementById("trophy-area").textContent = trophyMessage;
  
  const box = document.getElementById("game-over-box");
  box.classList.remove("hidden");
}

function routetoMainmenu()
{
  let box = document.getElementById("game-over-box");
  box.classList.add('hidden');
  start_startmenu.classList.remove('fade-out');
  start_startmenu.classList.remove('hidden');
  title.innerText='TicTacToe';
  resetTimers();
  removeEverything();
}
///////////////////// END OF GAMELOGIC //////////////////////////


/**
 * drawWinningLine(fromId, toId, isGreen = false)
 * ---------------------------------------------
 * fromId / toId  –  "box-x" IDs for the two end squares
 * isGreen        –  true  = use green gradient (player win)
 *                  false = use red  gradient (bot win / default)
 */
function drawWinningLine(fromId, toId, isGreen = false) {
  const line      = document.getElementById("win-line");
  const box1      = document.getElementById(fromId);
  const box2      = document.getElementById(toId);
  const container = document.querySelector(".main-box");
  if (!line || !box1 || !box2 || !container) return;

  /* 1.  pick colour */
  line.classList.remove("red", "green");
  line.classList.add(isGreen ? "green" : "red");

  /* 2.  geometry maths (unchanged) */
  const r1 = box1.getBoundingClientRect(),
        r2 = box2.getBoundingClientRect(),
        rc = container.getBoundingClientRect();

  const x1 = r1.left + r1.width  / 2 - rc.left,
        y1 = r1.top  + r1.height / 2 - rc.top,
        x2 = r2.left + r2.width  / 2 - rc.left,
        y2 = r2.top  + r2.height / 2 - rc.top;

  const length = Math.hypot(x2 - x1, y2 - y1),
        angle  = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

  line.style.left      = `${x1}px`;
  line.style.top       = `${y1}px`;
  line.style.width     = `${length}px`;
  line.style.transform = `rotate(${angle}deg) scaleX(1)`;
  line.style.opacity   = 1;

  /* 3.  restart animation */
  line.classList.remove("active");
  void line.offsetWidth;
  line.classList.add("active");
  setTimeout(()=>{line.classList.add('hidden');}, 3500);
}


function getRandomColor() {
    return palette[Math.floor(Math.random() * palette.length)];
}

function setRandomBGColor(extreme) {
  
  let num = Math.floor(Math.random() * 4)
  if(extreme)
  {
    setTimeout(()=>{
        document.documentElement.style.setProperty('--grad-color-1', getRandomColor());
        setTimeout(()=>{
            document.documentElement.style.setProperty('--grad-color-2', getRandomColor());
            setTimeout(()=>{
                document.documentElement.style.setProperty('--grad-color-3', getRandomColor());
                setTimeout(()=>{
                    document.documentElement.style.setProperty('--grad-color-4', getRandomColor());
    }, 500);
    }, 500);
    }, 500);
    }, 500);
      
  }
  else{
        switch(num)
    {
        case 0:
            document.documentElement.style.setProperty('--grad-color-1', getRandomColor());
            console.log('change-1');
            break;
        case 1:
            document.documentElement.style.setProperty('--grad-color-2', getRandomColor());
            console.log('change-2');
            break;
        case 2:
            document.documentElement.style.setProperty('--grad-color-3', getRandomColor());
            console.log('change-3');
            break;
        case 3:
            document.documentElement.style.setProperty('--grad-color-4', getRandomColor());
            console.log('change-4');
            break;
        default:
            console.log('error-outofbounds')
    }
  }
}




