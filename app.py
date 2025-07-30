import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, redirect, url_for, request
from flask_socketio import SocketIO, join_room, leave_room, emit
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import random, time, math

app=Flask(__name__)
socketio = SocketIO(app)
app.config['SECRET_KEY'] = 'secret!'

####################### DATABASE INFO ###############################

app.config['SQLALCHEMY_DATABASE_URI']='sqlite:///users.db'
db=SQLAlchemy(app)

# User model
class User(db.Model):
    username = db.Column(db.String(80), unique=True, nullable=False, primary_key=True)
    password = db.Column(db.String(100), nullable=False)
    trophies = db.Column(db.Integer, nullable=True)
    @staticmethod
    def isUniqueUsername(username):
        return User.query.get(username) is None

# Create the database
with app.app_context():
    db.create_all()


####################### DATABASE INFO ###############################
playerCount = 0
playerCount = max(playerCount, 0)
connected_users={}
multiplayer_users=[]

def getCurrentTime():
    current_datetime = datetime.now()
    time = current_datetime.strftime("%H:%M:%S")
    return time

@app.route('/')
def home():
    return render_template('index.html', playerCount=playerCount)

@app.route('/multiplayer/<username>')
def multiplayer(username):
    if username not in connected_users.values():
        return redirect(url_for('home'))
    else:
        multiplayer_users.append(username)
        for sid, user in list(connected_users.items()):
            if user == username:
                del connected_users[sid]
                break
        return render_template('multiplayer.html', playerCount=playerCount, userID=username)
    
@socketio.on('connect')
def on_connect():
    sid = request.sid
    connected_users[sid] = "unverified"  # temp placeholder
    emit('server_start', {'timestamp': getCurrentTime()})

@socketio.on('user_connected')
def start_connection(data):
    global playerCount
    user_id = data.get('userID')
    sid = request.sid

    already_connected = user_id in connected_users.values()
    connected_users[sid] = user_id  # ✅ always store SID
    playerstatus[user_id] = "idle"

    if not already_connected:
        playerCount += 1
        print(f"[{getCurrentTime()}] User connected with ID: {user_id}")
        socketio.emit('online_player_change', {'new-count': playerCount})
        socketio.emit('global_message_client', {
            'message': user_id + ' logged in!',
            'time': getCurrentTime()
        })
        socketio.emit('diff-id', to=sid)
    else:
        socketio.emit('same-id', to=sid)

@socketio.on('disconnect')
def on_disconnect():
    global playerCount

    sid = request.sid
    user_id = connected_users.get(sid, "Unknown")
    room=user_to_rooms.get(user_id)

    # 1️⃣ Unverified connection — ignore
    if user_id == "unverified":
        print(f"[{getCurrentTime()}] Unverified socket disconnected (sid={sid})")
        connected_users.pop(sid, None)
        return

    # 2️⃣ Unknown mapping (e.g., stale tab)
    if user_id == "Unknown":
        print(f"[{getCurrentTime()}] Unknown user disconnected (sid={sid})")
        return
    
    # Remove room from confirmation tracker if match not fully confirmed
    if room in confirmed_by_room:
        confirmed_by_room.pop(room, None)
        print(f"[MM] {user_id} left. Room {room} removed from pending confirmations.")

    # 3️⃣ If user is in a match
    if playerstatus.get(user_id) == "match_found":
        room = user_to_rooms.get(user_id)
        print(f"[{getCurrentTime()}] {user_id} disconnected mid-match. Room: {room}")
        stop_matchmaking({'user-ID': user_id, 'room': room})
        playerCount-=1
        socketio.emit('online_player_change', {'new-count': playerCount})
        socketio.emit('global_message_client', {
            'message': f"{user_id} disconnected",
            'time': getCurrentTime()
        })
    elif playerstatus[user_id] == "in_match":
        print(f"[MM] match in {room} ended! because {user_id} left")
        socketio.emit('match_cancel', room=room)
        playerCount -= 1
        print(f"[{getCurrentTime()}] User disconnected: {user_id}")
        socketio.emit('online_player_change', {'new-count': playerCount})
        socketio.emit('global_message_client', {
            'message': f"[MM] match in {room} ended! because {user_id} left",
            'time': getCurrentTime()
        })
        end_match(room=room)

    # 4️⃣ If user was still waiting in matchmaking queue
    elif playerstatus.get(user_id) == "searching":
        print(f"[{getCurrentTime()}] {user_id} disconnected while searching")
        _purge_from_queue(user_id)
        playerstatus[user_id] = 'not_known'
        playerCount-=1
        socketio.emit('online_player_change', {'new-count': playerCount})
        socketio.emit('global_message_client', {
            'message': f"{user_id} disconnected",
            'time': getCurrentTime()
        })

    # 5️⃣ Multiplayer tab only (not in matchmaking)
    elif user_id in multiplayer_users:
        print(f"[{getCurrentTime()}] User routed away from multiplayer: {user_id}")
        multiplayer_users.discard(user_id)

    # 6️⃣ Standard lobby user
    else:
        if playerstatus[user_id]=="created_room":
            userCreatedRooms.remove(room)
            playerinrooms.pop(room)
            user_to_rooms.pop(user_id)
            leave_room(room=room)
    
        playerCount -= 1
        print(f"[{getCurrentTime()}] User disconnected: {user_id}")
        socketio.emit('online_player_change', {'new-count': playerCount})
        socketio.emit('global_message_client', {
            'message': f"{user_id} disconnected",
            'time': getCurrentTime()
        })

    # 7️⃣ Final cleanup
    connected_users.pop(sid, None)


@socketio.on('global_message_server')
def send_global_message(data):
    if data.get('user-ID')!='':
        userID = data.get('user-ID')
    else:
        print("no id so defaulting to messaging as server")
        userID='server'
    message = data.get('message')
    time = getCurrentTime()
    socketio.emit('global_message_client', {'userID':userID, 'message':message, 'time':time})

@socketio.on('user_multiplayer')
def remove_user_multiplayer(data):
    userid = data.get('user-id')
    if userid in multiplayer_users:
        multiplayer_users.remove(userid)
    sid = request.sid
    connected_users[sid] = userid


######################### START OF MATCHMAKING ##############################
# =======================  MATCHMAKING  =======================

searching_users  : list[dict] = []          # [{'id': str, 'sid': str}]
playerinrooms    : dict[str, list[str]] = {}# room -> [p1, p2]
user_to_rooms    : dict[str, str] = {}      # user_id -> room
playerstatus     : dict[str, str] = {}      # user_id -> 'searching' | 'match_found' | 'not_known'
connected_users  : dict[str, str] = {}      # sid   -> user_id  (keep this up‑to‑date in your login/register)

# ---------- helper ----------
def _purge_from_queue(user_id: str) -> None:
    """Remove a user from the searching queue, in place."""
    searching_users[:] = [u for u in searching_users if u["id"] != user_id]

# ---------- room code ----------
def generate_room_code(length: int = 6) -> str:
    from random import choices
    from string import ascii_uppercase, digits
    return "".join(choices(ascii_uppercase + digits, k=length))

# ---------- start matchmaking ----------
@socketio.on("start_random_matchmaking")
def start_random_matchmaking(data):
    user_id = data.get("user-ID")
    sid     = request.sid

    if not user_id:
        return

    # ✋ Prevent duplicate entry
    if any(u["id"] == user_id for u in searching_users):
        print(f"[MM] {user_id} is already in the matchmaking queue. Ignored.")
        return

    # ❌ Avoid players who are already in a match
    if playerstatus.get(user_id) in ["match_found", "playing"]:
        print(f"[MM] {user_id} is already matched or playing. Ignored.")
        return

    # ✅ Enqueue user
    searching_users.append({"id": user_id, "sid": sid})
    playerstatus[user_id] = "searching"
    print(f"[MM] {user_id} added to queue. Queue size = {len(searching_users)}")

    # ⏳ Notify that we're still waiting for second player
    if len(searching_users) == 1:
        socketio.emit("waiting", to=sid)
        return

    # 🎯 We have at least two players — match them!
    p1, p2 = searching_users[:2]

    # Extra sanity check
    if not p1["id"] or not p2["id"]:
        searching_users.clear()
        return

    # 🎮 Create room
    room = generate_room_code(7)
    join_room(room, sid=p1["sid"])
    join_room(room, sid=p2["sid"])

    # 🔐 Bookkeeping
    playerinrooms[room]      = [p1["id"], p2["id"]]
    user_to_rooms[p1["id"]]  = room
    user_to_rooms[p2["id"]]  = room
    playerstatus[p1["id"]]   = "match_found"
    playerstatus[p2["id"]]   = "match_found"

    # 🚀 Notify both players
    socketio.emit(
        "match_found",
        {
            "room": room,
            "player1": p1["id"],
            "player2": p2["id"]
        },
        room=room
    )

    # ♻️ Reset queue for next players
    searching_users.clear()
    print(f"[MM] Match found! {p1['id']} vs {p2['id']} in room {room}")

@socketio.on("stop_matchmaking")
def stop_matchmaking(data):
    user_id = data.get("user-ID")
    room = data.get("room") or user_to_rooms.get(user_id)

    if not user_id:
        return

    # ✅ Remove user from search queue if present
    _purge_from_queue(user_id)

    # ✅ If no room, user was solo (not matched yet) — done after cleanup
    if not room or room not in playerinrooms:
        playerstatus[user_id] = "idle"
        user_to_rooms.pop(user_id, None)
        print(f"[MM] {user_id} left queue (no room).")
        return

    # ✅ Matched: handle cleanup
    players = playerinrooms.get(room, [])
    if len(players) != 2 or user_id not in players:
        playerinrooms.pop(room, None)
        user_to_rooms.pop(user_id, None)
        playerstatus[user_id] = "idle"
        print(f"[MM] Invalid room or solo user {user_id}. Cleaned.")
        return

    # ✅ Identify opponent
    opponent = players[1] if players[0] == user_id else players[0]

    # ✅ Leave room
    leaver_sid = next((s for s, uid in connected_users.items() if uid == user_id), None)
    if leaver_sid:
        leave_room(room, sid=leaver_sid)

    # ✅ Cleanup room
    playerinrooms.pop(room, None)
    user_to_rooms.pop(user_id, None)
    user_to_rooms.pop(opponent, None)

    # ✅ Status updates
    playerstatus[user_id] = "idle"
    playerstatus[opponent] = "searching"

    # ✅ Notify opponent to restart matchmaking or handle gracefully
    socketio.emit("matchmaking_cancel", {"user-id": user_id}, room=room)

    print(f"[MM] {user_id} left room {room}. Opponent {opponent} stays in flow.")

confirmed_by_room: dict[str, set[str]] = {}   # room → {user_id, …}
game_state: dict[str, list[list[int]]] = {}   # room → board

def _clean_up_queue_after_match(room: str, p1: str, p2: str):
    """Remove players / room from all matchmaking structures."""
    # They can’t still be in searching_users, but purge defensively
    _purge_from_queue(p1)
    _purge_from_queue(p2)

@socketio.on("confirm_match")
def confirm_match():
    sid       = request.sid
    user_id   = connected_users.get(sid)
    room      = user_to_rooms.get(user_id)
    players   = playerinrooms.get(room)

    if not room or not players:
        print(f"[MM] confirm_match: invalid room for {user_id}")
        return

    # Store confirmation
    confirmed_set = confirmed_by_room.setdefault(room, set())
    confirmed_set.add(user_id)
    print(f"[MM] {user_id} confirmed in room {room} ({len(confirmed_set)}/2)")

    # Wait until both players confirm
    if len(confirmed_set) < 2:
        return

    # Both confirmed → start match
    p1, p2 = players
    start_match(room, p1, p2)

    # Clean structures so next time is fresh
    confirmed_by_room.pop(room, None)
    _clean_up_queue_after_match(room, p1, p2)

playerside={}
match_timers={}
def start_match(room: str, player1: str, player2: str):
    # Decide who goes first and who is X
    firstmove  = player1 if random.randint(0, 1) else player2

    if random.randint(0, 1):
        playerX = player1 
        playerside[player1] = 'playerX'
        playerside[player2] = 'playerO'
    else: 
        playerX = player2
        playerside[player2] = 'playerX'
        playerside[player1] = 'playerO'

    # Create empty 3x3 board for the room
    game_state[room] = [[2, 2, 2] for _ in range(3)]

    # Mark both players as "in_match"
    playerstatus[player1] = "in_match"
    playerstatus[player2] = "in_match"

    match_timers[room] = {
        player1: 0,
        player2: 0,
        'last_move_time': time.time(),   # timer starts right now
        'last_mover': firstmove,         # starting player
        'move_count': 0                  # <-- new flag
    }

    print(f"[MM] Starting match in {room}: {player1} vs {player2}. "
          f"{firstmove} starts, {playerX} is X.")
    # Notify both clients
    socketio.emit(
        "start_match",
        {"firstmove": firstmove, "playerX": playerX},
        room=room
    )

@socketio.on('user_move_server')
def user_move(data):
    sid = request.sid
    user_id = connected_users.get(sid)
    
    room = user_to_rooms.get(user_id)
    if not room:
        print(f"[MM] No room found for user {user_id}")
        return

    game = game_state.get(room)
    if not game:
        print(f"[MM] No game state found for room {room}")
        return

    # Get move indices (adjusted to 0-based)
    i = data.get('i', 0) - 1
    j = data.get('j', 0) - 1

    # 🔒 Validate bounds
    if not (0 <= i < 3 and 0 <= j < 3):
        print(f"[MM] Invalid move index from {user_id}: ({i+1},{j+1})")
        return

    # 🔒 Check if cell already occupied
    if game[j][i] != 2:
        print(f"[MM] Cell ({i+1},{j+1}) already occupied in room {room}")
        return

    # 🔒 Ensure player has a side assigned
    side = playerside.get(user_id)
    if side not in ['playerX', 'playerO']:
        print(f"[MM] Invalid player side for {user_id}")
        return

    # 🔵 Perform the move: 1 for X, 0 for O
    game[j][i] = 1 if side == 'playerX' else 0
    game_state[room] = game  # Save updated state

    print(f"[MM] {user_id} ({side}) made move at ({i+1},{j+1}) in room {room}")
    print(f"[MM] Updated game board for {room}: {game}")

    # ⏱️ Get and update timing data
    timer = match_timers.get(room)
    now = time.time()
    
    if timer:
        last_mover      = timer['last_mover']
        last_move_time  = timer['last_move_time']
        elapsed         = now - last_move_time

        if timer['move_count'] == 0:
            # First recorded move – always credit the starting player
            timer[last_mover] += elapsed
        elif last_mover != user_id:
            # Normal turn switch – credit previous mover
            timer[user_id] += elapsed
        # else: same player moved twice in a row (shouldn’t happen), ignore

        # Update for next turn
        timer['last_mover']     = user_id
        timer['last_move_time'] = now
        timer['move_count'] += 1
    print(f"[MM] Timer data for {room}: {match_timers[room]}")

    # 📤 Notify opponent of the move
    socketio.emit('opponent_move', {
        'i': i + 1,
        'j': j + 1,
        'side': side
    }, room=room)

    # 🏁 Check for end conditions
    if check_winner(game) is not None:
        print(f"[MM] Game over - {check_winner(game)} wins in room {room}")
        result = check_winner(game)
        winner=''
        winnernum = result.get('winner')
        boxes = result.get('boxes')
        box1 = str(boxes[0])
        box2 = str(boxes[1])
        box3 = str(boxes[2])
        winner = 'playerX' if winnernum==1 else "playerO"
        socketio.emit('match_won', {
            'winner':winner, 
            'box-1':box1,
            'box-2':box2,
            'box-3':box3
        })
        socketio.emit('global_message_client', {
            'message': f"[MM] {user_id} won the match in {room}!",
            'time': getCurrentTime()
        })
        end_match(room)
        
    elif is_board_full(game):
        end_draw_match(room)
        end_match(room)

def end_match(room: str, winner: str | None = None):
    """Clean up after a finished game and reset both players."""

    # Players stored as plain user‑id strings (not dicts)
    players = playerinrooms.pop(room, [])
    if len(players) != 2:
        return  # nothing to do or already cleaned

    p1, p2 = players

    # Remove per‑room artefacts
    game_state.pop(room, None)
    match_timers.pop(room, None)
    confirmed_by_room.pop(room, None)

    # Re‑use queue cleanup util (defensive)
    _clean_up_queue_after_match(room, p1, p2)

    for uid in (p1, p2):
        user_to_rooms.pop(uid, None)
        playerside.pop(uid, None)
        playerstatus[uid] = "idle"
        _purge_from_queue(uid)

        # Force socket to leave the room if still connected
        sid = next((s for s, u in connected_users.items() if u == uid), None)
        if sid:
            leave_room(room, sid=sid)
    print(f"[MM] Match in {room} ended.")

####################### START OF JOIN ROOM AND CREATE ROOM LOGIC ##################################

userCreatedRooms = []
@socketio.on('create_room')
def createRoom():
    sid = request.sid
    user_id = connected_users.get(sid)
    
    room = generate_room_code()
    playerinrooms[room]=user_id
    user_to_rooms[user_id]=room
    playerstatus[user_id]="created_room"

    join_room(room=room)
    socketio.emit('respond_room_code', {'room_code':room}, room=room)
    userCreatedRooms.append(room)

@socketio.on('join_room')
def joinRoom(data):
    sid = request.sid
    user_id = connected_users.get(sid)
    room = data.get('room')
    playerstatus[user_id]="joined_room"
    
    if room in userCreatedRooms:
        p1 = playerinrooms.get(room)
        p2 = user_id
        playerinrooms[room]=[p1, p2]
        user_to_rooms[user_id]=room
        join_room(room=room)
        socketio.emit('player_tag', {'player-1':p1, 'player-2':p2})
        start_match(room=room, player1=p1, player2=p2)
    else:
        socketio.emit('room_not_found')

@socketio.on('create_room_leave')
def createRoomLeave():
    sid = request.sid
    user_id = connected_users.get(sid)
    room = user_to_rooms.get(user_id)
    userCreatedRooms.remove(room)

    playerinrooms.pop(room)
    user_to_rooms.pop(user_id)
    leave_room(room=room)

####################### END OF JOIN ROOM AND CREATE ROOM LOGIC ##################################

def check_winner(game):
    # Helper: Map 2D position (i,j) → 1D box number (1–9)
    def pos_to_box(i, j):
        return j * 3 + i + 1

    # Check rows
    for j in range(3):
        if game[j][0] == game[j][1] == game[j][2] != 2:
            return {
                "winner": game[j][0],
                "boxes": [pos_to_box(i, j) for i in range(3)]
            }

    # Check columns
    for i in range(3):
        if game[0][i] == game[1][i] == game[2][i] != 2:
            return {
                "winner": game[0][i],
                "boxes": [pos_to_box(i, j) for j in range(3)]
            }

    # Check diagonals
    if game[0][0] == game[1][1] == game[2][2] != 2:
        return {
            "winner": game[0][0],
            "boxes": [1, 5, 9]
        }
    if game[0][2] == game[1][1] == game[2][0] != 2:
        return {
            "winner": game[0][2],
            "boxes": [3, 5, 7]
        }

    # No winner yet
    return None



def is_board_full(game):
    return all(cell != 2 for row in game for cell in row)

def end_draw_match(room):
    now = time.time()
    timer = match_timers.get(room)
    
    if not timer:
        return

    p1, p2 = playerinrooms.get(room)
    t1 = timer[p1]
    t2 = timer[p2]

    # Determine winner on time
    if t1 < t2:
        winner = p1
    elif t2 < t1:
        winner = p2
    else:
        winner = None  # exact draw
    print(f"[MM] {winner} won draw on time in room:{room}")

    print('game over')
    # Emit result
    socketio.emit("draw_decided_by_time", {
        "winner": winner,
        "time_diff": round(math.fabs(t1-t2), 2)
    }, room=room)


######################### END OF MATCHMAKING ################################

if __name__=='__main__':
    socketio.run(app=app, debug=True)