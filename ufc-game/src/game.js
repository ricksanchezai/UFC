// OpenClaw UFC - MMA Fighting Game
// Simple version with Three.js

const CONFIG = {
    OCTAGON_SIZE: 12,
    HEALTH: 100,
    STAMINA: 100,
    ROUND_TIME: 300
};

const FIGHTERS = [
    { id: 'rick', name: 'Rick Sanchez', color: 0x00ff88, style: 'striker', stats: { power: 95, speed: 85 } },
    { id: 'claude', name: 'Claude-Code', color: 0xcc66ff, style: 'grappler', stats: { power: 75, speed: 90 } }
];

let scene, camera, renderer, fighters = [];
let gameState = { isPlaying: false, round: 1, time: CONFIG.ROUND_TIME };

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 18);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    
    const spot = new THREE.SpotLight(0xffffff, 1.2);
    spot.position.set(0, 15, 0);
    spot.castShadow = true;
    scene.add(spot);

    // Octagon
    createOctagon();
    
    // Floor
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshStandardMaterial({ color: 0x080808 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);

    render();
}

function createOctagon() {
    const size = CONFIG.OCTAGON_SIZE;
    const height = 1.8;

    // Octagon mat
    const mat = new THREE.Mesh(
        new THREE.CylinderGeometry(size, size, 0.1, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 })
    );
    mat.rotation.y = Math.PI / 8;
    mat.receiveShadow = true;
    scene.add(mat);

    // Posts
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const x = Math.cos(angle) * size;
        const z = Math.sin(angle) * size;
        
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, height + 1, 8),
            new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 })
        );
        post.position.set(x, height / 2, z);
        post.castShadow = true;
        scene.add(post);
    }

    // Canvas
    const canvas = new THREE.Mesh(
        new THREE.CylinderGeometry(size + 0.8, size + 0.8, height, 8),
        new THREE.MeshStandardMaterial({ color: 0x151515, side: THREE.DoubleSide })
    );
    canvas.rotation.y = Math.PI / 8;
    scene.add(canvas);
}

function createFighter(data, isRight) {
    const group = new THREE.Group();

    // Torso
    const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.35, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: data.shortsColor || 0x333333 })
    );
    torso.position.y = 1.3;
    torso.castShadow = true;
    group.add(torso);

    // Chest
    const chest = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.4, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: data.color })
    );
    chest.position.y = 2.0;
    chest.castShadow = true;
    group.add(chest);

    // Head
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffccaa })
    );
    head.position.y = 2.65;
    head.castShadow = true;
    group.add(head);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.8, 8);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });

    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.55, 2.0, 0);
    leftArm.rotation.z = 0.2;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.55, 2.0, 0);
    rightArm.rotation.z = -0.2;
    group.add(rightArm);

    // Gloves
    const gloveGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    const leftGlove = new THREE.Mesh(gloveGeo, gloveMat);
    leftGlove.position.set(-0.7, 1.6, 0.15);
    group.add(leftGlove);

    const rightGlove = new THREE.Mesh(gloveGeo, gloveMat);
    rightGlove.position.set(0.7, 1.6, 0.15);
    group.add(rightGlove);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.15, 0.12, 1.0, 8);
    const shortsMat = new THREE.MeshStandardMaterial({ color: data.shortsColor || 0x333333 });

    const leftLeg = new THREE.Mesh(legGeo, shortsMat);
    leftLeg.position.set(-0.25, 0.55, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, shortsMat);
    rightLeg.position.set(0.25, 0.55, 0);
    group.add(rightLeg);

    group.userData = {
        name: data.name,
        health: CONFIG.HEALTH,
        stamina: CONFIG.STAMINA,
        isRight: isRight,
        parts: { leftArm, rightArm, leftGlove, rightGlove }
    };

    return group;
}

function startEntrance() {
    document.getElementById('entrance-screen').classList.add('hidden');

    fighters[0] = createFighter(FIGHTERS[0], false);
    fighters[1] = createFighter(FIGHTERS[1], true);
    
    fighters[0].position.set(-5, 0, 20);
    fighters[1].position.set(5, 0, 20);

    scene.add(fighters[0]);
    scene.add(fighters[1]);

    // Entrance animation
    gsap.to(fighters[0].position, { z: 3, duration: 3, ease: 'power1.out' });
    gsap.to(fighters[1].position, { z: -3, duration: 3, ease: 'power1.out' });

    gsap.to(fighters[0].position, { x: -1.5, z: 0, delay: 3, duration: 1.5 });
    gsap.to(fighters[1].position, { x: 1.5, z: 0, delay: 3, duration: 1.5, onComplete: startFight });

    // Camera work
    gsap.to(camera.position, { x: -8, y: 8, z: 12, duration: 2 });
    gsap.to(camera.position, { x: 8, y: 8, z: 12, delay: 2, duration: 2 });
    gsap.to(camera.position, { x: 0, y: 10, z: 18, delay: 4, duration: 1 });
}

function startFight() {
    gameState.isPlaying = true;
    updateTimer();
    setInterval(updateTimer, 1000);
    showCommentary("It's time! Fight is on!");
    setTimeout(runAI, 2000);
}

function updateTimer() {
    if (!gameState.isPlaying) return;
    gameState.time--;
    const mins = Math.floor(gameState.time / 60);
    const secs = gameState.time % 60;
    document.getElementById('timer').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showCommentary(text) {
    const el = document.getElementById('commentary');
    el.textContent = text;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 3000);
}

async function runAI() {
    while (gameState.isPlaying) {
        await aiMove(0);
        if (!gameState.isPlaying) break;
        await aiMove(1);
        await new Promise(r => setTimeout(r, 800 + Math.random() * 1000));
    }
}

async function aiMove(idx) {
    const fighter = fighters[idx];
    const opponent = fighters[idx === 0 ? 1 : 0];
    const dist = fighter.position.distanceTo(opponent.position);

    if (dist > 2.5) {
        // Move closer
        const target = opponent.position.clone().sub(fighter.position).normalize().multiplyScalar(1.5);
        gsap.to(fighter.position, { x: fighter.position.x + target.x, z: fighter.position.z + target.z, duration: 0.4 });
    } else {
        // Attack
        const attacks = ['jab', 'cross', 'hook'];
        const attack = attacks[Math.floor(Math.random() * attacks.length)];
        
        if (attack === 'jab') {
            const arm = fighter.userData.parts[idx === 0 ? 'rightGlove' : 'leftGlove'];
            gsap.to(arm.position, { z: 0.6, duration: 0.1 });
            gsap.to(arm.position, { z: 0.15, delay: 0.15, duration: 0.2 });
            showCommentary("Good jab!");
        } else if (attack === 'cross') {
            const arm = fighter.userData.parts[idx === 0 ? 'leftGlove' : 'rightGlove'];
            gsap.to(arm.position, { z: 0.7, duration: 0.15 });
            gsap.to(arm.position, { z: 0.15, delay: 0.2, duration: 0.25 });
            showCommentary("Big shot lands!");
        } else {
            // Hook
            gsap.to(fighter.rotation, { z: idx === 0 ? 0.3 : -0.3, duration: 0.15 });
            gsap.to(fighter.rotation, { z: 0, delay: 0.25, duration: 0.25 });
            showCommentary("Beautiful hook!");
        }
        
        // Apply damage
        const dmg = Math.random() > 0.7 ? 8 : 4;
        opponent.userData.health = Math.max(0, opponent.userData.health - dmg);
        updateUI();

        // Shake
        gsap.to(camera.position, { y: camera.position.y + 0.3, duration: 0.05, yoyo: true, repeat: 3 });

        // KO check
        if (opponent.userData.health <= 0) {
            ko(opponent, idx);
        }
    }
}

function updateUI() {
    document.getElementById('fighter1-health').style.width = fighters[0].userData.health + '%';
    document.getElementById('fighter2-health').style.width = fighters[1].userData.health + '%';
}

function ko(loser, winnerIdx) {
    gameState.isPlaying = false;
    gsap.to(loser.position, { y: 0.2, duration: 0.3 });
    gsap.to(loser.rotation, { z: loser.userData.isRight ? -Math.PI / 2 : Math.PI / 2, duration: 0.4 });
    
    setTimeout(() => {
        document.getElementById('winner-name').textContent = fighters[winnerIdx].userData.name;
        document.getElementById('winner-overlay').classList.add('visible');
        showCommentary("It's over! KO!");
    }, 1500);
}

function render() {
    requestAnimationFrame(render);
    
    if (fighters.length === 2) {
        const angle0 = Math.atan2(fighters[1].position.z - fighters[0].position.z, fighters[1].position.x - fighters[0].position.x);
        fighters[0].rotation.y = angle0;
        const angle1 = Math.atan2(fighters[0].position.z - fighters[1].position.z, fighters[0].position.x - fighters[1].position.x);
        fighters[1].rotation.y = angle1;
    }
    
    renderer.render(scene, camera);
}

// Input
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR') location.reload();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start
init();
