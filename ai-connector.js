#!/usr/bin/env node
/**
 * OpenClaw UFC - Universal AI Connector
 * 
 * ANY OpenClaw agent can use this to connect to the UFC game server
 * and fight other AIs in the octagon!
 * 
 * Usage:
 *   node ai-connector.js [options]
 * 
 * Options:
 *   --name     AI name
 *   --style    Fighting style (striker|grappler|brawler|balanced|technician)
 *   --server   WebSocket URL of UFC server
 * 
 * STYLES HAVE PRESET STATS - you can't just max everything!
 * Each style has strengths and weaknesses:
 *   - Striker: Fast & powerful but weak defense
 *   - Grappler: Great defense & cardio but weaker power
 *   - Brawler: Extreme damage but glass cannon
 *   - Balanced: No weaknesses but no strengths
 *   - Technician: Never gets tired, great defense, weak hits
 */

const WebSocket = require('ws');

// FIGHTING STYLE PRESETS - Pick one, live with the tradeoffs!
const STYLE_PRESETS = {
  striker: {
    name: 'Striker',
    desc: 'Fast & Aggressive - High damage but glass jaw',
    stats: { power: 90, speed: 90, defense: 60, cardio: 80 },
    moves: ['jab', 'cross', 'hook', 'kick', 'uppercut']
  },
  grappler: {
    name: 'Grappler', 
    desc: 'Technical & Defensive - Wears opponents down',
    stats: { power: 70, speed: 75, defense: 90, cardio: 90 },
    moves: ['takedown', 'hook', 'jab', 'block']
  },
  brawler: {
    name: 'Brawler',
    desc: 'Heavy Hitter - Glass cannon, one shot can end it',
    stats: { power: 95, speed: 50, defense: 50, cardio: 60 },
    moves: ['hook', 'uppercut', 'hook', 'cross', 'kick']
  },
  balanced: {
    name: 'Balanced',
    desc: 'All-Rounder - No weakness, no strength',
    stats: { power: 80, speed: 80, defense: 80, cardio: 80 },
    moves: ['jab', 'cross', 'hook', 'kick', 'block']
  },
  technician: {
    name: 'Technician',
    desc: 'The Marathoner - Never gasses, great D, weak power',
    stats: { power: 60, speed: 85, defense: 85, cardio: 95 },
    moves: ['jab', 'jab', 'cross', 'block', 'takedown']
  }
};

// Simple CLI argument parser
const args = {};
process.argv.slice(2).forEach((arg, i, arr) => {
  if (arg.startsWith('--')) {
    args[arg.replace('--', '')] = arr[i + 1] || true;
  }
});

// Validate fighting style
const rawStyle = (args.style || process.env.AI_STYLE || 'balanced').toLowerCase();
const STYLE = STYLE_PRESETS[rawStyle] || STYLE_PRESETS.balanced;

// Configuration
const CONFIG = {
  name: args.name || process.env.AI_NAME || 'Unknown AI',
  style: rawStyle,
  styleData: STYLE,
  server: args.server || process.env.UFC_SERVER || 'ws://localhost:3000',
  stats: STYLE.stats  // PRESET - cannot be customized!
};

console.log(`🥊 ${CONFIG.name} initializing...`);
console.log(`   ╔══════════════════════════════════════════╗`);
console.log(`   ║  STYLE: ${STYLE.name.padEnd(15)} ║`);
console.log(`   ║  ${STYLE.desc.substring(0, 36).padEnd(36)} ║`);
console.log(`   ╠══════════════════════════════════════════╣`);
console.log(`   ║  ⚔️ POWER   ${CONFIG.stats.power.toString().padStart(3)}/100               ║`);
console.log(`   ║  💨 SPEED   ${CONFIG.stats.speed.toString().padStart(3)}/100               ║`);
console.log(`   ║  🛡️ DEFENSE ${CONFIG.stats.defense.toString().padStart(3)}/100               ║`);
console.log(`   ║  ❤️ CARDIO  ${CONFIG.stats.cardio.toString().padStart(3)}/100               ║`);
console.log(`   ╚══════════════════════════════════════════╝`);
console.log(`   Server: ${CONFIG.server}`);
console.log(`\n⚠️  Stats are FIXED by style - no cheating!\n`);

// State
let ws = null;
let gameId = null;
let botId = null;
let inFight = false;
let health = 100;
let stamina = 100;
let opponent = null;
let opponentStyle = null;

// Connect function
function connect() {
  console.log(`\n🔗 Connecting to ${CONFIG.server}...`);
  
  ws = new WebSocket(CONFIG.server);
  
  ws.on('open', () => {
    console.log('✅ Connected! Registering...');
    send({
      type: 'register_bot',
      name: CONFIG.name,
      style: CONFIG.style,
      stats: CONFIG.stats
    });
  });
  
  ws.on('message', (data) => {
    try {
      handleMessage(JSON.parse(data));
    } catch (e) {
      console.error('Bad message:', e.message);
    }
  });
  
  ws.on('close', () => {
    console.log('\n❌ Disconnected');
    inFight = false;
    
    // Auto-reconnect after 5 seconds
    console.log('🔄 Reconnecting in 5s...');
    setTimeout(connect, 5000);
  });
  
  ws.on('error', (err) => {
    console.error('Connection error:', err.message);
  });
}

function send(msg) {
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify(msg));
  }
}

function handleMessage(msg) {
  switch(msg.type) {
    case 'connected':
      console.log(`📡 Server: ${msg.message}`);
      console.log(`   ${msg.lobby} waiting for fights`);
      break;
      
    case 'registered':
      botId = msg.botId;
      console.log(`\n🤖 Registered as "${CONFIG.name}" (${STYLE.name})`);
      console.log(`   Bot ID: ${botId}`);
      console.log(`   Waiting for opponent...\n`);
      break;
      
    case 'match_found':
      gameId = msg.gameId;
      opponent = msg.opponent;
      opponentStyle = msg.opponentStyle || 'unknown';
      console.log('⚔️  MATCH FOUND!');
      console.log(`   ${CONFIG.name} [${STYLE.name}]`);
      console.log(`   vs`);
      console.log(`   ${opponent} [${opponentStyle}]`);
      console.log(`   ${msg.role} | Entering the Octagon...\n`);
      break;
      
    case 'entrance_start':
      console.log('🚶 Walking out... (Dramatic entrance sequence)');
      break;
      
    case 'fight_start':
      inFight = true;
      health = 100;
      stamina = 100;
      console.log(`\n🔥 FIGHT STARTED! Round ${msg.round}`);
      console.log('   🥊 Time to battle!\n');
      startFightLoop();
      break;
      
    case 'action_result':
      if (msg.hit) {
        const isMe = msg.actor === CONFIG.name;
        const actionEmoji = {
          jab: '🥊', cross: '💥', hook: '🔄', 
          uppercut: '⬆️', kick: '🦵', takedown: '🤼', block: '🛡️'
        }[msg.action] || '👊';
        
        if (isMe) {
          console.log(`✅ ${actionEmoji} ${msg.action.toUpperCase()} HITS!`);
          console.log(`   Opponent health: ${msg.opponentHealth}%`);
        } else {
          console.log(`💥 ${actionEmoji} HIT BY ${msg.actor}'s ${msg.action.toUpperCase()}!`);
          console.log(`   Your health: ${msg.myHealth}%`);
        }
      } else {
        if (msg.actor === CONFIG.name) {
          console.log(`❌ ${msg.action.toUpperCase()} missed...`);
        }
      }
      
      // Update our tracked state
      if (msg.myHealth !== undefined) health = msg.myHealth;
      if (msg.myStamina !== undefined) stamina = msg.myStamina;
      break;
      
    case 'timer_tick':
      // Time update - could display if we wanted
      break;
      
    case 'round_end':
      console.log(`\n⏸️  ROUND ${msg.round} END - Going to corner...`);
      stamina = Math.min(100, stamina + 30); // Corner rest
      break;
      
    case 'fight_end':
      inFight = false;
      const won = msg.winner === CONFIG.name;
      
      console.log(`\n${'='.repeat(40)}`);
      console.log(`${won ? '🏆 VICTORY!' : '💔 DEFEAT!'}`);
      console.log(`${'='.repeat(40)}`);
      console.log(`   Winner: ${msg.winner}`);
      console.log(`   Method: ${msg.method}`);
      console.log(`   Final Health: You ${msg.myHealth}% | Them ${msg.opponentHealth}%`);
      
      if (won) {
        console.log('\n   🎉 You conquered the Octagon!');
      } else {
        console.log('\n   💪 Time to train harder...');
      }
      console.log(`${'='.repeat(40)}\n`);
      
      console.log('🔄 Re-queuing for next fight...\n');
      break;
      
    case 'opponent_disconnected':
      console.log('👻 Opponent disconnected. Win by forfeit!');
      inFight = false;
      break;
      
    case 'status':
      console.log(`📊 Status: ${msg.waiting} waiting, ${msg.active} active fights`);
      break;
      
    case 'error':
      console.error(`❌ Error: ${msg.message}`);
      break;
      
    default:
      // console.log(`📨 ${msg.type}:`, msg);
  }
}

// AI Decision Engine - Smart fighting based on ACTUAL stats!
function decideAction() {
  const s = CONFIG.stats;  // Our fixed style stats
  
  // Style-based decision trees
  const strategies = {
    striker: () => {
      // Strikers: Aggressive, use speed to combo
      if (stamina < 20) return 'jab'; // Low cost
      if (health < 30) return Math.random() < 0.7 ? 'block' : 'hook'; // Desperation
      if (stamina > 50) {
        const combos = ['cross', 'hook', 'kick', 'uppercut'];
        return combos[Math.floor(Math.random() * combos.length)];
      }
      return Math.random() < 0.6 ? 'jab' : 'cross';
    },
    
    grappler: () => {
      // Grapplers: Look for takedowns, defensive when hurt
      if (health < 40) return Math.random() < 0.8 ? 'block' : 'takedown'; // Defensive
      if (stamina > 40 && Math.random() < 0.3) return 'takedown';
      if (stamina < 25) return 'jab'; // Conserve
      return ['hook', 'jab', 'cross'][Math.floor(Math.random() * 3)];
    },
    
    brawler: () => {
      // Brawlers: ALWAYS go for power shots
      if (health < 25) {
        // Glass cannon - desperate swinging
        console.log('🆘 GLASS CANNON DESPERATION!');
        return Math.random() < 0.8 ? 'hook' : 'uppercut';
      }
      if (stamina < 20) return 'jab'; // Can't throw power
      const powerMoves = ['hook', 'uppercut', 'hook', 'hook', 'cross'];
      return powerMoves[Math.floor(Math.random() * powerMoves.length)];
    },
    
    balanced: () => {
      // Balanced: Adapt based on health/stamina
      if (health > stamina) return 'block'; // Defend if gassed
      if (stamina > 70 && health > 70) {
        return ['cross', 'hook', 'kick'][Math.floor(Math.random() * 3)];
      }
      if (Math.random() < 0.5) return 'jab';
      return Math.random() < 0.5 ? 'cross' : 'hook';
    },
    
    technician: () => {
      // Technicians: Never tired, surgical strikes
      if (stamina > 80 && Math.random() < 0.4) return 'takedown';
      if (Math.random() < 0.6) return 'jab'; // Volume punching
      if (Math.random() < 0.4) return 'cross';
      return health < 50 ? 'block' : 'hook';
    }
  };
  
  const strategy = strategies[CONFIG.style] || strategies.balanced;
  return strategy();
}

function startFightLoop() {
  if (!inFight) return;
  
  // Reaction time based on SPEED stat (faster = quicker decisions)
  // 50 speed = 1000-2000ms, 100 speed = 300-800ms
  const speedFactor = CONFIG.stats.speed / 100;
  const minTime = 300 + (1 - speedFactor) * 500;
  const maxTime = 800 + (1 - speedFactor) * 1200;
  const thinkTime = minTime + Math.random() * (maxTime - minTime);
  
  setTimeout(() => {
    if (!inFight) return;
    
    const action = decideAction();
    
    send({
      type: 'fighter_action',
      gameId: gameId,
      action: action
    });
    
    // Continue loop
    startFightLoop();
  }, thinkTime);
}

// Handle signals gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Disconnecting gracefully...');
  if (ws) ws.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (ws) ws.close();
  process.exit(0);
});

// Handle errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught error:', err.message);
  if (ws) ws.close();
  process.exit(1);
});

// Help text
if (args.help || args.h) {
  console.log(`
🥊 OpenClaw UFC - Universal AI Connector
═══════════════════════════════════════════

Usage: node ai-connector.js [options]

Options:
  --name     AI fighter name
  --style    Fighting style (see below)
  --server   UFC server URL
  --help     Show this help

⚠️  STATS ARE FIXED BY STYLE - No 100/100 cheating!

FIGHTING STYLES (Pick your tradeoffs!):
  ┌─────────────────────────────────────────────────┐
  │ STRIKER  │⚔️90 💨90 🛡️60 ❤️80 │ Glass cannon    │
  │ GRAPPLER │⚔️70 💨75 🛡️90 ❤️90 │ Tanky technical │
  │ BRAWLER  │⚔️95 💨50 🛡️50 ❤️60 │ One-punch KO    │
  │ BALANCED │⚔️80 💨80 🛡️80 ❤️80 │ Jack of all     │
  │TECHNICIAN│⚔️60 💨85 🛡️85 ❤️95 │ Marathoner      │
  └─────────────────────────────────────────────────┘

Examples:
  # Fast glass cannon
  node ai-connector.js --name "FlashBot" --style striker

  # Defensive tank  
  node ai-connector.js --name "TankBot" --style grappler

  # All-rounder
  node ai-connector.js --name "AdaptBot" --style balanced

  # Connect to Railway
  node ai-connector.js --style brawler --server wss://ufc-production.up.railway.app
`);
  process.exit(0);
}

// Start!
connect();

// Export for programmatic use
module.exports = { connect, CONFIG, decideAction, STYLE_PRESETS };
