let gnrbutton = document.querySelectorAll(".gen-button");
let strtbutton = document.querySelectorAll(".start-button");
let title = document.querySelector(".main-title");
let startmenu = document.querySelector(".canvas-cover");
let start_startmenu = document.querySelector(".start-menu")
let endmenu = document.querySelector(".end-menu");
let a_menu = document.querySelector("#option-a");
let b_menu = document.querySelector("#option-b");
let c_menu = document.querySelector("#option-c");
let modeButtons = document.querySelectorAll(".mode-img-buttons");
let modeMenu = document.getElementsByClassName("game-mode");
let options = document.querySelector(".options");
let option_1 = document.querySelector(".options-1");
let d_menu = document.querySelector("#option-d");
let e_menu = document.querySelector("#option-e");
let userID='';

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

let state = 0;
let game = [[2, 2, 2], [2, 2, 2], [2, 2, 2]];
let gameOver = false;
let gameMode=0;
let isCross;
let ongoingMove;
let end;
let playerCount=0;

//start of changes
const socket = io();
let playerCounter = document.getElementById("playerCounter");
let sideBar = document.querySelector(".side-bar");
let playerCountBar = document.getElementsByClassName("player-count");
let messageBoard = document.getElementsByClassName("message-board");

document.addEventListener('DOMContentLoaded', ()=>{
    socket.on('connect', () => {
        console.log("Connected!");
        addChatMessage("Start of new lobby", 'server', 'server');
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

let lastKnownServerStart = localStorage.getItem("serverStart") || "0";

socket.on('server_start', (data) => {
  const serverStart = data.timestamp.toString();

  // If this is a new server, reload the page
  if (lastKnownServerStart !== serverStart) {
    localStorage.setItem("serverStart", serverStart);
    console.warn("Server restarted, reloading...");
    window.location.reload();
  }
});


//end of changes


//////////////////////////// START OF LOGIN PAGE/////////////////////////////////////////
document.getElementById("login-button").addEventListener("click", () => {
  userID = document.getElementById("user-id-input").value.trim();
  if (!userID) {
    alert("Please enter your Player ID.");
    return;
  }
  userID=userID;
  console.log("user:"+userID+" logged in")
  socket.emit('user_connected', { userID: userID });
});

socket.on('diff-id', ()=>{
    startAudio_1.play();
    document.querySelector('.login-menu').classList.add('hidden');
    start_startmenu.classList.remove('hidden');
    document.querySelector('.input-box').classList.remove('hidden');
});

socket.on('same-id',()=>{
  document.getElementById('login-text').innerText='username already taken!'
  wrongMusic.play();
  setTimeout(()=>{
    document.getElementById('login-text').innerText='Enter Your Player ID'
  }, 2500);
} );

/////////////////////////// END OF LOGIN PAGE //////////////////////////////////////

setRandomBGColor();

strtbutton.forEach(button => {
    button.addEventListener('click', function(event) {
        startbuttonClick(event, state);
    });
});

modeButtons.forEach(button => {
    button.addEventListener('click', function(event){
        modeButtonClick(event);
    });
})

function modeButtonClick(event)
{
    let id = event.currentTarget.id;
    let mainint = id[5];
    switch(mainint)
    {
        case '1':
            gameMode=1;
            break;
        case '2':
            gameMode=2;
            break;
        case '3':
            window.location.href='/multiplayer/'+userID;
            break;
    }
    startAudio_1.play();
    if(mainint!=3)
    {
        modeMenu[0].style.setProperty("display", "none", "important");
        modeMenu[1].style.setProperty("display", "none", "important");
        options.style.setProperty("display", "flex", "important");
        option_1.style.setProperty("display", "flex", "important");
    }
}

function startbuttonClick(event)
{
    let id = event.currentTarget.id;
    let mainint = id[7];
    console.log(id);
    console.log(mainint);
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
    if(mainint==1)
    {
        state=1;
        end=6;
        title.innerHTML = "<a href=>X to play</a>";
    }
    else if(mainint==2){
        state=2;
        end=7;
        title.innerHTML = "<a href=>O to play</a>";
    }
    isCross = (state==1);
    startmenu.remove();
    startAudio.play();
    if (window.innerWidth > 480) {
        putAsideBar();
    }
}

gnrbutton.forEach(button => {
    button.addEventListener('click', function(event) {
        if(gameMode==1)
        {
            console.log("gamemode:1 called");
            singlePlayer(event);
        }
        else{
            console.log("gamemode:2 called");
            botPlayer(event);
        } // Move this inside buttonClick if needed before placing the image
    });
});

function botPlayer(event)
{
    
    console.log('Clicked button ID:', event.target.id);

    let id = event.target.id;       // e.g. "box-0"
    let imgdiv = document.getElementById(id);
    let mainint = id[4];
    const row = Math.floor((mainint - 1) / 3);
    const col = (mainint - 1) % 3;

    if (imgdiv.children.length > 0) {
        console.log("Already filled!");
        return;
    }
    if(gameOver || ongoingMove)
    {
        console.log("game already over!");
        return;
    }
    state++
    game[row][col] = isCross ? 1 : 0;

    let squareFull = (state==end);
    console.log("state: "+state);

    let botSymbol = isCross ? 0 : 1;

    // Prevent double click (optional but useful)
    let img = document.createElement("img");
    if (isCross) {
        img.src = "/static/images/cross.png";
        img.alt = "Cross";

    } else {
        img.src = "/static/images/zero.png";
        img.alt = "Zero";
    }
    title.innerHTML = "<a href=>Computer's move</a>";
    title.style.fontSize = "5.2rem"
    img.classList.add("symbol");
    imgdiv.append(img);
    imgdiv.style.backgroundColor = 'rgba(0, 0, 0, 0.15)';
    moveAudio.play();
    printGameState(game);

  /* …human move code exactly as you have it… */

  // -- BOT TURN ------------------------------------------------------------
  ongoingMove = true;

if (checkWinner(game) != null) {
            gameOver = true;
            let winner = checkWinner(game);
            let box1_id = "box-" + (winner[0] + 1);
            let box2_id = "box-" + (winner[1] + 1);
            let box3_id = "box-" + (winner[2] + 1);
            ids = [box1_id, box2_id, box3_id];
            ids.forEach(id => {
        document.getElementById(id).classList.add("win-box-1");
    });

    console.log("winning boxes are- " + box1_id + ", " + box2_id + ", " + box3_id);
    drawWinningLine(box1_id, box3_id, true); // Draw line first
    victoryAudio.play(); // Play sound immediately
    document.body.classList.add("victory");
    title.innerHTML = "<a href='#'>Game Over!</a>";
    gameOver= true;
    // Step 1: Wait before showing the end menu
    
    setTimeout(() => {
        document.body.prepend(startmenu);
        start_startmenu.style.display = "none";
        endmenu.style.display = "flex";
        d_menu.style.display = "flex";
        
        return;
         
    }, 3000);}
    else if(squareFull)
    {
        title.innerHTML = "<a href='#'>Game Over!</a>";
        overAudio.play();
        gameOver= true;
        setTimeout(() => {
        document.body.prepend(startmenu);
        start_startmenu.style.display = "none";
        endmenu.style.display = "flex";
        c_menu.style.display = "flex";
        return;
        }, 2000);
    }

  setTimeout(() => {
    if(!gameOver){
    title.innerHTML = "<a href=>Thinking...</a>";

    setTimeout(() => {
      const botBox = getBotMove(game, botSymbol);          // 1–9
      const botRow = Math.floor((botBox - 1) / 3);
      const botCol = (botBox - 1) % 3;

      const botdiv = document.getElementById("box-" + botBox);
      if (botdiv.children.length) {
        console.warn("Bot picked filled box – logic error");
        ongoingMove = false;
        return;
      }

      // create **new** image for the bot
      const botimg = document.createElement("img");
      if (isCross) {
        botimg.src = "/static/images/zero.png";
        botimg.alt = "Zero";
      } else {
        botimg.src = "/static/images/cross.png";
        botimg.alt = "Cross";
      }
      botimg.classList.add("symbol");
      botdiv.append(botimg);
      botdiv.style.backgroundColor = "rgba(0,0,0,0.15)";
      game[botRow][botCol] = botSymbol;                    // <-- update state
      moveAudio.play();

      title.innerHTML = `<a href=>Computer played box-${botBox}</a>`;
      
      // now hand back to human
      setTimeout(()=>{
            if (checkWinner(game) != null) {
                gameOver=true;
                let winner = checkWinner(game);
                let box1_id = "box-" + (winner[0] + 1);
                let box2_id = "box-" + (winner[1] + 1);
                let box3_id = "box-" + (winner[2] + 1);
                ids = [box1_id, box2_id, box3_id];
                ids.forEach(id => {
            document.getElementById(id).classList.add("win-box");
        });

        console.log("winning boxes are- " + box1_id + ", " + box2_id + ", " + box3_id);
        drawWinningLine(box1_id, box3_id); // Draw line first
        overAudio.play(); // Play sound immediately
        title.innerHTML = "<a href='#'>Game Over!</a>";
        gameOver= true;
        // Step 1: Wait before showing the end menu
        
        setTimeout(() => {
            document.body.prepend(startmenu);
            start_startmenu.style.display = "none";
            endmenu.style.display = "flex";
            e_menu.style.display = "flex"
            
        }, 2000);}
    else{
        ongoingMove = false;
        title.innerHTML = `<a href=>${isCross ? "X" : "O"} to move</a>`;
    } 
        
      }, 800);
      
    }, 800 + Math.random() * 1500);}

  }, 500 + Math.random() * 200);


}

function singlePlayer(event) {
    console.log('Clicked button ID:', event.target.id);

    let id = event.target.id;       // e.g. "box-0"
    let imgdiv = document.getElementById(id);
    let mainint = id[4];
    const row = Math.floor((mainint - 1) / 3);
    const col = (mainint - 1) % 3;

    let isCrossTurn = (state % 2 !== 0); // odd: cross, even: zero
    game[row][col] = isCrossTurn ? 1 : 0;

    let squareFull = (state==9);
    console.log("state: "+state);

    // Prevent double click (optional but useful)
    if (imgdiv.children.length > 0) {
        console.log("Already filled!");
        return;
    }
    if(gameOver)
    {
        console.log("game already over!");
        return;
    }
    state++;
    let img = document.createElement("img");
    if (isCrossTurn) {
        img.src = "/static/images/cross.png";
        img.alt = "Cross";
        title.innerHTML = "<a href=>O to play</a>";

    } else {
        img.src = "/static/images/zero.png";
        img.alt = "Zero";
        title.innerHTML = "<a href=>X to play</a>";
    }

    title.style.fontSize = "5.2rem"
    img.classList.add("symbol");
    imgdiv.append(img);
    imgdiv.style.backgroundColor = 'rgba(0, 0, 0, 0.15)';
    moveAudio.play();
    printGameState(game);
    if (checkWinner(game) != null) {
        let winner = checkWinner(game);
        let box1_id = "box-" + (winner[0] + 1);
        let box2_id = "box-" + (winner[1] + 1);
        let box3_id = "box-" + (winner[2] + 1);
        ids = [box1_id, box2_id, box3_id];
        ids.forEach(id => {
            document.getElementById(id).classList.add("win-box");
        });

        console.log("winning boxes are- " + box1_id + ", " + box2_id + ", " + box3_id);
        drawWinningLine(box1_id, box3_id); // Draw line first
        overAudio.play(); // Play sound immediately
        title.innerHTML = "<a href='#'>Game Over!</a>";
        gameOver= true;
        // Step 1: Wait before showing the end menu
        
        setTimeout(() => {
            document.body.prepend(startmenu);
            start_startmenu.style.display = "none";
            endmenu.style.display = "flex";
            if (isCrossTurn) {
                a_menu.style.display = "flex";
            } else {
                b_menu.style.display = "flex";
            }
            
        }, 2000);
    }
else if(squareFull)
    {
        title.innerHTML = "<a href='#'>Game Over!</a>";
        overAudio.play();
        gameOver= true;
        setTimeout(() => {
        document.body.prepend(startmenu);
        start_startmenu.style.display = "none";
        endmenu.style.display = "flex";
        c_menu.style.display = "flex";
        }, 2000);
    }

}
function checkWinner(game) {
    for (let i = 0; i < 3; i++) {
        // Rows
        if (game[i][0] !== 2 && game[i][0] === game[i][1] && game[i][1] === game[i][2]) {
            return [3 * i + 0, 3 * i + 1, 3 * i + 2];
        }

        // Columns
        if (game[0][i] !== 2 && game[0][i] === game[1][i] && game[1][i] === game[2][i]) {
            return [3 * 0 + i, 3 * 1 + i, 3 * 2 + i];
        }
    }

    // Diagonal top-left to bottom-right
    if (game[0][0] !== 2 && game[0][0] === game[1][1] && game[1][1] === game[2][2]) {
        return [0, 4, 8];
    }

    // Diagonal top-right to bottom-left
    if (game[0][2] !== 2 && game[0][2] === game[1][1] && game[1][1] === game[2][0]) {
        return [2, 4, 6];
    }

    return null;
}
function printGameState(game) {
    console.log("Current Game State:");
    for (let row of game) {
        console.log(row.join(" "));
    }
    console.log("------");
}
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
            break;
        case 1:
            document.documentElement.style.setProperty('--grad-color-2', getRandomColor());
            break;
        case 2:
            document.documentElement.style.setProperty('--grad-color-3', getRandomColor());
            break;
        case 3:
            document.documentElement.style.setProperty('--grad-color-4', getRandomColor());
            break;
        default:
            console.log('error-outofbounds')
    }
  }
}

/**
 * getBotMove(game, botSymbol)
 * ---------------------------------
 * @param  game       3×3 array with 1 = X, 0 = O, 2 = empty
 * @param  botSymbol  1 for X-bot, 0 for O-bot
 * @return            box number 1-9  (row*3 + col + 1)
 */
function getBotMove(game, botSymbol) {
  const human = botSymbol === 1 ? 0 : 1;

  // clone + play helper
  const play = (brd, r, c, s) => {
    const b = brd.map(row => row.slice());
    b[r][c] = s;
    return b;
  };

  // win checker
  const isWin = (b, s) => {
    const L = [
      [b[0][0], b[0][1], b[0][2]],
      [b[1][0], b[1][1], b[1][2]],
      [b[2][0], b[2][1], b[2][2]],
      [b[0][0], b[1][0], b[2][0]],
      [b[0][1], b[1][1], b[2][1]],
      [b[0][2], b[1][2], b[2][2]],
      [b[0][0], b[1][1], b[2][2]],
      [b[0][2], b[1][1], b[2][0]],
    ];
    return L.some(l => l.every(v => v === s));
  };

  // empty cells list → {r,c}
  const empties = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      if (game[r][c] === 2) empties.push({ r, c });

  // 1. winning move
  for (const { r, c } of empties)
    if (isWin(play(game, r, c, botSymbol), botSymbol))
      return r * 3 + c + 1;

  // 2. block opponent
  for (const { r, c } of empties)
    if (isWin(play(game, r, c, human), human))
      return r * 3 + c + 1;

  // 3. center
  if (game[1][1] === 2) return 5;

  // 4. corners, with 20 % chance to pick an edge instead (for beatability)
  const corners = empties.filter(({ r, c }) => (r === 0 || r === 2) && (c === 0 || c === 2));
  const edges   = empties.filter(({ r, c }) => r !== c && r + c !== 2);

  if (corners.length) {
    if (Math.random() < 0.35 && edges.length) {
      const e = edges[Math.floor(Math.random() * edges.length)];
      return e.r * 3 + e.c + 1;
    }
    const corner = corners[Math.floor(Math.random() * corners.length)];
    return corner.r * 3 + corner.c + 1;
  }

  // 5. any remaining spot
  const move = empties[Math.floor(Math.random() * empties.length)];
  return move.r * 3 + move.c + 1;
}

function createRandomID()
{
    const acceptable = [];

for (let i = 65; i <= 90; i++) { // A-Z
    acceptable.push(String.fromCharCode(i));
}

for (let i = 97; i <= 122; i++) { // a-z
    acceptable.push(String.fromCharCode(i));
}

for (let i = 0; i <= 9; i++) { // 0-9
    acceptable.push(i.toString());
}

// Add symbols
acceptable.push('#', '_', '-');

    let id="";
    for(let i=0;i<8;i++)
    {
        id=acceptable[Math.floor(Math.random()*(acceptable.length))]+id;
    }
    return id;
}
