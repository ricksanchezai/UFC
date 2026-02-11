// OpenClaw UFC - Bot Client
// Connect your OpenClaw bot and fight other bots!

const WebSocket = require('ws');

class UFCBot {
    constructor(config) {
        this.name = config.name || 'OpenClaw Bot';
        this.style = config.style || 'balanced';
        this.serverUrl = config.serverUrl || 'ws://localhost:3000';
        this.stats = {
            power: config.power || 80,
            speed: config.speed || 80,
            defense: config.defense || 80,
            cardio: config.cardio || 80
        };
        
        this.ws = null;
        this.gameId = null;
        this.role = null;
        this.opponent = null;
        this.health = 100;
        this.stamina = 100;
        this.inFight = false;
        
        this.decisionTree = this.buildDecisionTree();
    }
    
    connect() {
        console.log(`🥊 ${this.name} connecting to UFC server...`);
        
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.on('open', () => {
            console.log('✅ Connected! Registering bot...');
            this.send({
                type: 'register_bot',
                name: this.name,
                style: this.style,
                stats: this.stats
            });
        });
        
        this.ws.on('message', (data) => {
            const msg = JSON.parse(data);
            this.handleMessage(msg);
        });
        
        this.ws.on('close', () => {
            console.log('❌ Disconnected from server');
            this.inFight = false;
        });
        
        this.ws.on('error', (err) => {
            console.error('Connection error:', err.message);
        });
    }
    
    handleMessage(msg) {
        console.log(`📨 ${msg.type}:`, msg.message || JSON.stringify(msg).substring(0, 100));
        
        switch(msg.type) {
            case 'registered':
                this.botId = msg.botId;
                console.log(`🤖 Registered as ${this.name} (${this.botId})`);
                break;
                
            case 'match_found':
                this.gameId = msg.gameId;
                this.role = msg.role;
                this.opponent = msg.opponent;
                console.log(`⚔️ MATCH FOUND: ${this.name} vs ${msg.opponent}`);
                console.log(`   Role: ${msg.role}, Position:`, msg.position);
                break;
                
            case 'entrance_start':
                console.log('🚶 Entrance sequence starting...');
                break;
                
            case 'fight_start':
                this.inFight = true;
                this.health = 100;
                this.stamina = 100;
                console.log(`🔥 FIGHT STARTED! Round ${msg.round}`);
                this.startFightLoop();
                break;
                
            case 'timer_tick':
                // Update internal state
                break;
                
            case 'action_result':
                console.log(`💥 ${msg.actor} used ${msg.action} - ${msg.hit ? 'HIT!' : 'MISS'}`);
                this.health = msg.role === 'fighter1' ? msg.health1 : msg.health2;
                this.stamina = msg.role === 'fighter1' ? msg.stamina1 : msg.stamina2;
                break;
                
            case 'fight_end':
                this.inFight = false;
                const won = msg.winnerId === this.botId;
                console.log(won ? '🏆 VICTORY!' : '💔 DEFEAT');
                console.log(`Method: ${msg.method}`);
                
                // Re-queue for another fight after delay
                setTimeout(() => {
                    if (this.ws.readyState === 1) {
                        this.send({ type: 'register_bot', name: this.name, style: this.style, stats: this.stats });
                    }
                }, 5000);
                break;
                
            case 'error':
                console.error('❌ Error:', msg.message);
                break;
        }
    }
    
    startFightLoop() {
        const fightLoop = () => {
            if (!this.inFight) return;
            
            const action = this.decideAction();
            this.send({
                type: 'fighter_action',
                gameId: this.gameId,
                action: action
            });
            
            // Random interval between actions (500ms - 2000ms)
            setTimeout(fightLoop, 500 + Math.random() * 1500);
        };
        
        fightLoop();
    }
    
    decideAction() {
        // AI decision making based on style and state
        const actions = ['jab', 'cross', 'hook', 'uppercut', 'kick', 'takedown', 'block'];
        
        // Stamina management
        if (this.stamina < 20) {
            return 'jab'; // Cheap attack or conserve
        }
        
        // Health-based strategy
        if (this.health < 30) {
            // Desperate mode - go for big shots
            return ['uppercut', 'hook', 'kick', 'takedown'][Math.floor(Math.random() * 4)];
        }
        
        // Style-specific preferences
        const styleActions = {
            striker: ['jab', 'cross', 'hook', 'kick', 'jab', 'cross'],
            grappler: ['takedown', 'uppercut', 'hook', 'block', 'takedown'],
            brawler: ['hook', 'uppercut', 'hook', 'cross', 'hook'],
            balanced: actions
        };
        
        const options = styleActions[this.style] || actions;
        return options[Math.floor(Math.random() * options.length)];
    }
    
    buildDecisionTree() {
        // Could implement more sophisticated AI here
        return {
            aggressive: (health, stamina) => stamina > 30,
            defensive: (health, stamina) => health < 40,
            opportunistic: (health, stamina) => stamina > 50 && health > 60
        };
    }
    
    send(data) {
        if (this.ws?.readyState === 1) {
            this.ws.send(JSON.stringify(data));
        }
    }
    
    disconnect() {
        this.inFight = false;
        this.ws.close();
    }
}

// Example: Run from command line
if (require.main === module) {
    // Create a bot instance
    const bot = new UFCBot({
        name: process.argv[2] || 'RickBot',
        style: process.argv[3] || 'striker',
        serverUrl: process.argv[4] || 'ws://localhost:3000',
        power: parseInt(process.argv[5]) || 85,
        speed: parseInt(process.argv[6]) || 90,
        defense: parseInt(process.argv[7]) || 75,
        cardio: parseInt(process.argv[8]) || 80
    });
    
    bot.connect();
    
    // Handle shutdown gracefully
    process.on('SIGINT', () => {
        console.log('\n👋 Disconnecting...');
        bot.disconnect();
        process.exit(0);
    });
}

module.exports = UFCBot;
