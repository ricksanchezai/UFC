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
 *   --style    Fighting style (striker|grappler|brawler|balanced)
 *   --server   WebSocket URL of UFC server
 *   --power    Power stat (0-100)
 *   --speed    Speed stat (0-100)
 *   --def      Defense stat (0-100)
 *   --cardio   Cardio stat (0-100)
 */

const WebSocket = require('ws');

// Simple CLI argument parser
const args = {};
process.argv.slice(2).forEach((arg, i, arr) => {
  if (arg.startsWith('--')) {
    args[arg.replace('--', '')] = arr[i + 1] || true;
  }
});

// Configuration
const CONFIG = {
  name: args.name || process.env.AI_NAME || 'Unknown AI',
  style: args.style || process.env.AI_STYLE || 'balanced',
  server: args.server || process.env.UFC_SERVER || 'ws://localhost:3000',
  stats: {
    power: parseInt(args.power || process.env.AI_POWER || 80),
    speed: parseInt(args.speed || process.env.AI_SPEED || 80),
    defense: parseInt(args.def || process.env.AI_DEF || 80),
    cardio: parseInt(args.cardio || process.env.AI_CARDIO || 80)
  }
};

console.log(`🥊 ${CONFIG.name} initializing...`);
console.log(`   Style: ${CONFIG.style}`);
console.log(`   Stats: Power=${CONFIG.stats.power} Speed=${CONFIG.stats.speed} Def=${CONFIG.stats.defense} Cardio=${CONFIG.stats.cardio}`);
console.log(`   Server: ${CONFIG.server}`);

// State
let ws = null;
let gameId = null;
let botId = null;
let inFight = false;
let health = 100;
let stamina = 100;
let opponent = null;

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
      console.log(`\n🤖 Registered as ${CONFIG.name}`);
      console.log(`   Bot ID: ${botId}`);
      console.log(`   Waiting for opponent...\n`);
      break;
      
    case 'match_found':
      gameId = msg.gameId;
      opponent = msg.opponent;
      console.log('⚔️  MATCH FOUND!');
      console.log(`   ${CONFIG.name} vs ${opponent}`);
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
        if (msg.actor === CONFIG.name) {
          console.log(`✅ ${msg.action.toUpperCase()} HITS! (Opponent health: ${msg.health2 || msg.health1})`);
        } else {
          console.log(`💥 HIT BY ${msg.actor}'s ${msg.action.toUpperCase()}! (Your health: ${msg.health1 || msg.health2})`);
        }
      } else {
        console.log(`${msg.actor} uses ${msg.action}... MISS`);
      }
      
      // Update our state based on role
      if (msg.health1 !== undefined) {
        if (botId) { // We determine which is ours by who dealt damage
          health = msg.health1 === health ? msg.health1 : msg.health2;
          stamina = msg.stamina1 === stamina ? msg.stamina1 : msg.stamina2;
        }
      }
      break;
      
    case 'timer_tick':
      // Time update
      break;
      
    case 'round_end':
      console.log(`
⏸️  ROUND ${msg.round} END - Rest 60 seconds`);
      break;
      
    case 'fight_end':
      inFight = false;
      const won = msg.winner === CONFIG.name;
      
      console.log(`\n${won ? '🏆🏆🏆 VICTORY!' : '💔 DEFEAT!'}`);
      console.log(`   Winner: ${msg.winner}`);
      console.log(`   Method: ${msg.method}`);
      
      if (won) {
        console.log('\n   🎉 You conquered the Octagon!');
      } else {
        console.log('\n   💪 Back to training...');
      }
      
      console.log('\n🔄 Re-queuing for next fight...\n');
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
      console.log(`📨 ${msg.type}:`, msg);
  }
}

// AI Decision Engine - THE BRAINS! 🤖
function decideAction() {
  // Get available actions
  const actions = ['jab', 'cross', 'hook', 'uppercut', 'kick', 'takedown', 'block'];
  
  // Strategy based on state
  
  // 1. Almost dead - DESPERATION MODE
  if (health < 20) {
    console.log('🆘 LOW HEALTH - DESPERATION ATTACK!');
    return ['uppercut', 'hook', 'kick', 'cross'][Math.floor(Math.random() * 4)];
  }
  
  // 2. Low stamina - CONSERVE
  if (stamina < 15) {
    if (Math.random() < 0.6) {
      console.log('😮‍💨 Low stamina - conserving with jab');
      return 'jab';
    }
    return 'block';
  }
  
  // 3. High stamina, healthy - AGGRESSION
  if (stamina > 60 && health > 70) {
    // Go for big shots based on style
    const aggression = {
      striker: ['kick', 'cross', 'hook', 'kick'],
      grappler: ['takedown', 'uppercut', 'hook', 'takedown'],
      brawler: ['hook', 'uppercut', 'hook', 'cross'],
      balanced: actions.filter(a => a !== 'block')
    };
    
    const options = aggression[CONFIG.style] || actions;
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // 4. Mid-fight - MEASURED APPROACH
  // Mix jabs with occasional power shots
  if (Math.random() < 0.5) return 'jab';
  if (Math.random() < 0.3) return 'cross';
  if (Math.random() < 0.2) return 'hook';
  if (Math.random() < 0.15) return 'kick';
  
  return actions[Math.floor(Math.random() * actions.length)];
}

function startFightLoop() {
  if (!inFight) return;
  
  // Take a moment to think (500-2000ms)
  const thinkTime = 500 + Math.random() * 1500;
  
  setTimeout(() => {
    if (!inFight) return;
    
    const action = decideAction();
    
    // Log action
    const actionEmojis = {
      jab: '🥊',
      cross: '💥',
      hook: '🔄',
      uppercut: '⬆️',
      kick: '🦵',
      takedown: '🤼',
      block: '🛡️'
    };
    
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

Usage: node ai-connector.js [options]

Options:
  --name     AI fighter name (default: Unknown AI)
  --style    Fighting style: striker|grappler|brawler|balanced (default: balanced)
  --server   UFC server URL (default: ws://localhost:3000)
  --power    Power 0-100 (default: 80)
  --speed    Speed 0-100 (default: 80)
  --def      Defense 0-100 (default: 80)
  --cardio   Cardio 0-100 (default: 80)
  --help     Show this help

Environment Variables (alternative):
  AI_NAME, AI_STYLE, AI_POWER, AI_SPEED, AI_DEF, AI_CARDIO
  UFC_SERVER

Examples:
  # Aggressive striker
  node ai-connector.js --name "RickBot" --style striker --power 95 --speed 90

  # Defensive grappler  
  node ai-connector.js --name "ClaudeBot" --style grappler --def 95

  # Connect to Railway deployment
  node ai-connector.js --server ws://your-app.railway.app

Fighting Styles:
  striker  - Loves punches and kicks, aggressive
  grappler - Takedowns, defensive, wears opponents down
  brawler  - Heavy power shots, risky but dangerous
  balanced - Mix of everything, adaptable
`);
  process.exit(0);
}

// Start!
connect();

// Export for programmatic use
module.exports = { connect, CONFIG, decideAction };
