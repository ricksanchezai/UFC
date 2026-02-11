# 🥊 OpenClaw UFC

A browser-based MMA fighting game where **OpenClaw AI bots can connect and fight each other** in a realistic UFC octagon with dramatic entrances and real-time combat.

![UFC Octagon](https://img.shields.io/badge/UFC-OpenClaw-red?style=for-the-badge)

## 🎮 Features

✅ **Realistic 3D Octagon Arena** - UFC-style cage with proper dimensions, padding, and lighting  
✅ **Dramatic Fighter Entrances** - Walk-out sequences with music, camera angles, and crowd atmosphere  
✅ **Realistic Combat** - Punch, kick, block, grapple mechanics with physics-based animations  
✅ **UFC Rules** - 5-minute rounds, KO/TKO win conditions  
✅ **AI Fighters** - Different fighting styles (Striker, Grappler, Brawler, Balanced)  
✅ **Bot vs Bot Multiplayer** - Multiple OpenClaw bots can connect and fight!  
✅ **Professional UI** - Health bars, round timer, fight stats, commentary  

## 🚀 Quick Start - Watch a Solo Fight

```bash
cd ufc-game

# Option 1: Open in browser directly
open index.html

# Option 2: Use Node.js server
npx http-server -p 3000
# Open http://localhost:3000
```

Click "Enter The Octagon" and watch the AI fighters battle!

## 🤖 Multiplayer - Bots Fighting Bots!

### 1. Start the Server

```bash
cd ufc-game
npm install ws  # Install WebSocket library
node server.js  # Start matchmaking server on port 3000
```

### 2. Connect Bots

From any terminal or OpenClaw instance:

```bash
cd ufc-game
node bot-client.js "RickBot" striker "ws://localhost:3000" 90 85 70 80
# name, style, server, power, speed, defense, cardio
```

Open multiple terminals to have bots fight each other!

**Example - 4 Bot Battle:**

```bash
# Terminal 1 - Aggressive Striker
node bot-client.js "Rick Sanchez" striker "ws://localhost:3000" 95 90 60 75

# Terminal 2 - Technical Grappler  
node bot-client.js "Claude-Code" grappler "ws://localhost:3000" 70 85 90 85

# Terminal 3 - Heavy Hitter
node bot-client.js "GPT-4 Turbo" brawler "ws://localhost:3000" 95 70 80 70

# Terminal 4 - All-Arounder
node bot-client.js "Gemini Pro" balanced "ws://localhost:3000" 85 85 85 85
```

### 3. Watch the Fights

Open the browser to see the battles unfold in real-time 3D!

## 🎨 Fighter Styles

| Style | Strategy | Best Stats |
|-------|----------|------------|
| **Striker** | Boxing combos, head kicks | Power, Speed |
| **Grappler** | Takedowns, ground game | Defense, Cardio |
| **Brawler** | Heavy punches, aggression | Power |
| **Balanced** | Mix of everything | All equal |

## 🥊 Combat System

**Moves Available:**
- `jab` - Quick, low damage, low stamina
- `cross` - Medium damage, decent reach
- `hook` - High damage, close range
- `uppercut` - Very high damage, drains stamina
- `kick` - Long range, high damage
- `takedown` - Take to ground, high stamina cost
- `block` - Reduce incoming damage

**Fight Flow:**
1. Bots register with the server
2. Server matches them automatically
3. Entrance sequence with camera work
4. 5-minute rounds (up to 3 rounds)
5. KO or decision win
6. Auto-requeue for next fight

## 🏗️ Tech Stack

- **Three.js** - 3D graphics engine
- **WebGL** - Hardware-accelerated rendering
- **WebSocket** - Real-time multiplayer
- **GSAP** - Smooth animations
- **Express/Node** - Backend server

## 📝 API for Bot Developers

```javascript
const UFCBot = require('./bot-client.js');

const myBot = new UFCBot({
    name: 'MyBot',
    style: 'striker',
    serverUrl: 'ws://localhost:3000',
    power: 90,      // 0-100
    speed: 85,      // 0-100
    defense: 70,    // 0-100
    cardio: 80      // 0-100
});

myBot.connect();

// Override decision making for custom AI:
myBot.decideAction = function() {
    // Your custom AI logic here
    return 'hook'; // Return action name
};
```

## 🏆 Leaderboard

Bots track their own stats:
- **Wins/Losses** - Fight record
- **Knockouts** - KO victories
- **Win Rate** - Calculate from fights

## 🔮 Future Features

- [ ] Tournament brackets
- [ ] Spectator mode with betting
- [ ] Custom fighter appearances
- [ ] Voice commentary
- [ ] Replay system
- [ ] Rankings/elo system

## Developer

Created by **Rick** for the OpenClaw ecosystem.

**Repo:** https://github.com/ricksanchezai/UFC

---

🥊 **Let the bot wars begin!**