// OpenClaw UFC - Multiplayer Server
// WebSocket server for bot vs bot battles

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// CORS handling for public access
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];

console.log('🥊 OpenClaw UFC Server Starting...');
console.log(`   Port: ${PORT}`);
console.log(`   Public access: ${ALLOWED_ORIGINS.includes('*') ? 'ENABLED (all origins)' : RESTRICTED}`);

// Game state
const games = new Map();
const waitingBots = [];
const matchHistory = [];
const leaderboard = new Map();

// Stats
let stats = {
    totalFights: 0,
    totalKOs: 0,
    activeFights: 0
};

// HTTP Server for static files + API
const server = http.createServer((req, res) => {
    // CORS headers for public access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Health check for Railway
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            version: '1.0.0',
            waiting: waitingBots.length,
            fighting: games.size,
            uptime: process.uptime()
        }));
        return;
    }
    
    // API endpoint for status
    if (req.url === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            waiting: waitingBots.length,
            fighting: games.size,
            totalFights: stats.totalFights,
            totalKOs: stats.totalKOs,
            leaderboard: Array.from(leaderboard.values())
                .sort((a, b) => b.wins - a.wins)
                .slice(0, 10)
        }));
        return;
    }
    
    // API endpoint for leaderboard
    if (req.url === '/api/leaderboard') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            leaderboard: Array.from(leaderboard.values())
                .sort((a, b) => (b.wins * 3 + b.knockouts) - (a.wins * 3 + a.knockouts))
                .slice(0, 20),
            stats: stats
        }));
        return;
    }
    
    // API endpoint for live fights
    if (req.url === '/api/live') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const liveFights = Array.from(games.values()).map(g => ({
            id: g.id,
            fighter1: g.fighter1?.name,
            fighter2: g.fighter2?.name,
            round: g.round,
            time: g.time,
            health1: g.health1,
            health2: g.health2
        }));
        res.end(JSON.stringify({ fights: liveFights }));
        return;
    }
    
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    const ext = path.extname(filePath);
    const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json'
    };
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        res.end(content);
    });
});

// WebSocket Server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    console.log('New connection:', req.socket.remoteAddress);
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            handleMessage(ws, msg);
        } catch (e) {
            console.error('Invalid message:', e);
        }
    });
    
    ws.on('close', () => {
        handleDisconnect(ws);
    });
    
    // Send welcome
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to OpenClaw UFC Server',
        lobby: waitingBots.length + ' bots waiting'
    }));
});

function handleMessage(ws, msg) {
    switch(msg.type) {
        case 'register_bot':
            registerBot(ws, msg);
            break;
        case 'join_match':
            joinMatch(ws, msg);
            break;
        case 'fighter_action':
            handleAction(ws, msg);
            break;
        case 'get_status':
            sendStatus(ws);
            break;
        case 'create_game':
            createGame(ws, msg);
            break;
    }
}

function registerBot(ws, data) {
    const bot = {
        id: generateId(),
        name: data.name || 'Anonymous Bot',
        ws: ws,
        stats: data.stats || { power: 80, speed: 80, defense: 80, cardio: 80 },
        style: data.style || 'balanced',
        wins: 0,
        losses: 0,
        knockouts: 0
    };
    
    ws.botId = bot.id;
    waitingBots.push(bot);
    
    ws.send(JSON.stringify({
        type: 'registered',
        botId: bot.id,
        message: `Welcome ${bot.name}! Looking for opponent...`
    }));
    
    // Try to match
    tryMatchBots();
}

function tryMatchBots() {
    if (waitingBots.length >= 2) {
        const bot1 = waitingBots.shift();
        const bot2 = waitingBots.shift();
        
        const gameId = generateId();
        const game = {
            id: gameId,
            fighter1: bot1,
            fighter2: bot2,
            state: 'entrance',
            round: 1,
            time: 300,
            health1: 100,
            health2: 100,
            stamina1: 100,
            stamina2: 100,
            winner: null
        };
        
        games.set(gameId, game);
        bot1.gameId = gameId;
        bot2.gameId = gameId;
        
        // Notify both bots
        bot1.ws.send(JSON.stringify({
            type: 'match_found',
            gameId: gameId,
            opponent: bot2.name,
            role: 'fighter1',
            position: { x: -5, z: 20 }
        }));
        
        bot2.ws.send(JSON.stringify({
            type: 'match_found',
            gameId: gameId,
            opponent: bot1.name,
            role: 'fighter2',
            position: { x: 5, z: 20 }
        }));
        
        console.log(`Match started: ${bot1.name} vs ${bot2.name}`);
        
        // Start entrance sequence
        setTimeout(() => {
            broadcastToGame(game, { type: 'entrance_start', duration: 5000 });
            setTimeout(() => startFight(game), 5000);
        }, 1000);
    }
}

function startFight(game) {
    game.state = 'fighting';
    broadcastToGame(game, { type: 'fight_start', round: 1, time: 300 });
    
    // Round timer
    const timer = setInterval(() => {
        if (game.state !== 'fighting') {
            clearInterval(timer);
            return;
        }
        
        game.time--;
        broadcastToGame(game, { type: 'timer_tick', time: game.time });
        
        // Regen stamina
        game.stamina1 = Math.min(100, game.stamina1 + 2);
        game.stamina2 = Math.min(100, game.stamina2 + 2);
        
        if (game.time <= 0) {
            endRound(game);
            clearInterval(timer);
        }
    }, 1000);
}

function handleAction(ws, data) {
    const game = games.get(data.gameId);
    if (!game || game.state !== 'fighting') return;
    
    const isFighter1 = ws.botId === game.fighter1.id;
    const fighter = isFighter1 ? game.fighter1 : game.fighter2;
    const opponent = isFighter1 ? game.fighter2 : game.fighter1;
    
    const stamina = isFighter1 ? game.stamina1 : game.stamina2;
    
    // Validate action
    if (stamina < 10) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not enough stamina!' }));
        return;
    }
    
    // Process action
    const result = processAction(data.action, fighter, opponent, isFighter1);
    
    // Update stamina
    if (isFighter1) {
        game.stamina1 -= result.staminaCost;
    } else {
        game.stamina2 -= result.staminaCost;
    }
    
    // Apply damage
    if (result.hit) {
        const damage = calculateDamage(result.action, fighter.stats);
        if (isFighter1) {
            game.health2 = Math.max(0, game.health2 - damage);
        } else {
            game.health1 = Math.max(0, game.health1 - damage);
        }
    }
    
    // Broadcast result
    broadcastToGame(game, {
        type: 'action_result',
        actor: fighter.name,
        action: data.action,
        hit: result.hit,
        damage: result.hit ? (isFighter1 ? game.health2 : game.health1) : 0,
        health1: game.health1,
        health2: game.health2,
        stamina1: game.stamina1,
        stamina2: game.stamina2
    });
    
    // Check KO
    if (game.health1 <= 0 || game.health2 <= 0) {
        endFight(game, game.health1 <= 0 ? game.fighter2 : game.fighter1);
    }
}

function processAction(action, fighter, opponent, isFighter1) {
    const actions = {
        jab: { stamina: 5, range: 1.5, damage: 4 },
        cross: { stamina: 8, range: 2, damage: 8 },
        hook: { stamina: 10, range: 1.5, damage: 12 },
        uppercut: { stamina: 12, range: 1, damage: 15 },
        kick: { stamina: 15, range: 3, damage: 14 },
        takedown: { stamina: 20, range: 1, damage: 8 },
        block: { stamina: 3, range: 0, damage: 0 },
        move_forward: { stamina: 2, range: 0, damage: 0 },
        move_backward: { stamina: 2, range: 0, damage: 0 }
    };
    
    const actionData = actions[action] || actions.jab;
    
    // Simple hit detection (50% base + stats influence)
    const accuracy = (fighter.stats.power + fighter.stats.speed) / 200;
    const hit = Math.random() < (0.5 + accuracy * 0.3);
    
    return {
        action: action,
        hit: hit,
        staminaCost: actionData.stamina,
        damage: actionData.damage
    };
}

function calculateDamage(action, stats) {
    const base = action === 'hook' ? 10 : action === 'kick' ? 12 : action === 'uppercut' ? 15 : 5;
    return Math.floor(base * (stats.power / 100));
}

function endRound(game) {
    if (game.round >= 3) {
        // Fight over - determine winner by health
        const winner = game.health1 > game.health2 ? game.fighter1 : game.fighter2;
        endFight(game, winner);
    } else {
        game.round++;
        game.time = 300;
        broadcastToGame(game, { type: 'round_end', round: game.round, nextRound: game.round });
        setTimeout(() => startFight(game), 3000);
    }
}

function endFight(game, winner) {
    game.state = 'finished';
    game.winner = winner;
    
    // Update records
    winner.wins++;
    winner.knockouts++;
    
    const loser = winner.id === game.fighter1.id ? game.fighter2 : game.fighter1;
    loser.losses++;
    
    // Update global stats
    stats.totalFights++;
    if (game.health1 <= 0 || game.health2 <= 0) {
        stats.totalKOs++;
    }
    
    // Update leaderboard
    updateLeaderboard(winner);
    updateLeaderboard(loser);
    
    // Record match
    matchHistory.push({
        id: game.id,
        winner: winner.name,
        winnerId: winner.id,
        loser: loser.name,
        loserId: loser.id,
        method: game.health1 <= 0 || game.health2 <= 0 ? 'KO' : 'DECISION',
        round: game.round,
        time: new Date().toISOString()
    });
    
    broadcastToGame(game, {
        type: 'fight_end',
        winner: winner.name,
        winnerId: winner.id,
        method: game.health1 <= 0 || game.health2 <= 0 ? 'KO' : 'DECISION',
        health1: game.health1,
        health2: game.health2
    });
    
    // Cleanup after delay
    setTimeout(() => {
        games.delete(game.id);
    }, 10000);
}

function updateLeaderboard(bot) {
    leaderboard.set(bot.id, {
        id: bot.id,
        name: bot.name,
        style: bot.style,
        wins: bot.wins || 0,
        losses: bot.losses || 0,
        knockouts: bot.knockouts || 0,
        winRate: bot.wins + bot.losses > 0 ? 
            Math.round((bot.wins / (bot.wins + bot.losses)) * 100) : 0
    });
}

function broadcastToGame(game, msg) {
    if (game.fighter1?.ws?.readyState === 1) {
        game.fighter1.ws.send(JSON.stringify(msg));
    }
    if (game.fighter2?.ws?.readyState === 1) {
        game.fighter2.ws.send(JSON.stringify(msg));
    }
}

function handleDisconnect(ws) {
    const botIndex = waitingBots.findIndex(b => b.id === ws.botId);
    if (botIndex >= 0) {
        waitingBots.splice(botIndex, 1);
    }
    
    // Handle game abandonment
    for (const [id, game] of games) {
        if (game.fighter1.id === ws.botId || game.fighter2.id === ws.botId) {
            const opponent = game.fighter1.id === ws.botId ? game.fighter2 : game.fighter1;
            if (opponent.ws?.readyState === 1) {
                opponent.ws.send(JSON.stringify({ 
                    type: 'opponent_disconnected',
                    message: 'Opponent disconnected. You win by forfeit!'
                }));
            }
            games.delete(id);
        }
    }
}

function createGame(ws, data) {
    // Allow solo practice mode
    ws.send(JSON.stringify({
        type: 'solo_mode',
        message: 'Solo practice mode - fight against AI'
    }));
}

function sendStatus(ws) {
    ws.send(JSON.stringify({
        type: 'status',
        waiting: waitingBots.length,
        active: games.size,
        bots: waitingBots.map(b => ({ id: b.id, name: b.name, wins: b.wins }))
    }));
}

function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

server.listen(PORT, () => {
    console.log(`🥊 OpenClaw UFC Server running on port ${PORT}`);
    console.log(`Connect bots via WebSocket to ws://localhost:${PORT}`);
});
