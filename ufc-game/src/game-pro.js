// OpenClaw UFC PRO - Professional MMA Fighting Game
// High-quality animations, realistic combat, visual effects

const CONFIG = {
    OCTAGON_SIZE: 14,
    HEALTH: 100,
    STAMINA: 100,
    ROUND_TIME: 300,
    CAMERA_SHAKE: 0.4
};

const FIGHTERS = [
    { 
        id: 'rick', 
        name: 'Rick Sanchez', 
        color: 0x00ff88, 
        shortsColor: 0x1a1a1a,
        accentColor: 0x00ff88,
        style: 'striker', 
        stats: { power: 95, speed: 90, defense: 70, cardio: 80 },
        intro: "The Mad Scientist of the Octagon!"
    },
    { 
        id: 'claude', 
        name: 'Claude-Code', 
        color: 0xcc66ff, 
        shortsColor: 0x2a1a3a,
        accentColor: 0xcc66ff,
        style: 'grappler', 
        stats: { power: 75, speed: 90, defense: 95, cardio: 90 },
        intro: "The Technical Architect!"
    },
    { 
        id: 'gpt', 
        name: 'GPT-4 Turbo', 
        color: 0x3399ff, 
        shortsColor: 0x0a1a2a,
        accentColor: 0x3399ff,
        style: 'brawler', 
        stats: { power: 95, speed: 70, defense: 75, cardio: 75 },
        intro: "The Heavy Hitter!"
    },
    { 
        id: 'gemini', 
        name: 'Gemini Pro', 
        color: 0xff6600, 
        shortsColor: 0x2a1a0a,
        accentColor: 0xff6600,
        style: 'balanced', 
        stats: { power: 85, speed: 85, defense: 85, cardio: 85 },
        intro: "The Complete Fighter!"
    }
];

let scene, camera, renderer, fighters = [], crowdParticles = [];
let particleSystem, impactEffects = [];
let gameState = { isPlaying: false, round: 1, time: CONFIG.ROUND_TIME };
let clock = new THREE.Clock();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.015);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    setupLights();
    createOctagon();
    createCrowd();
    createAtmosphere();
    createParticleSystem();
    
    render();
}

function setupLights() {
    // Main overhead spotlights
    const spot1 = new THREE.SpotLight(0xffffff, 2);
    spot1.position.set(0, 25, 0);
    spot1.angle = Math.PI / 6;
    spot1.penumbra = 0.4;
    spot1.castShadow = true;
    spot1.shadow.mapSize.width = 2048;
    spot1.shadow.mapSize.height = 2048;
    spot1.shadow.bias = -0.0001;
    scene.add(spot1);

    // Side rim lights for drama
    const rim1 = new THREE.SpotLight(0xff4400, 1.5);
    rim1.position.set(-20, 12, 0);
    rim1.lookAt(0, 0, 0);
    scene.add(rim1);

    const rim2 = new THREE.SpotLight(0x0044ff, 1.5);
    rim2.position.set(20, 12, 0);
    rim2.lookAt(0, 0, 0);
    scene.add(rim2);

    // Ambient
    const ambient = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambient);
}

function createOctagon() {
    const size = CONFIG.OCTAGON_SIZE;
    
    // Main mat - octagonal
    const octagonShape = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const x = Math.cos(angle) * size;
        const z = Math.sin(angle) * size;
        if (i === 0) octagonShape.moveTo(x, z);
        else octagonShape.lineTo(x, z);
    }
    octagonShape.closePath();
    
    const extrudeSettings = { depth: 0.3, bevelEnabled: false };
    const matGeo = new THREE.ExtrudeGeometry(octagonShape, extrudeSettings);
    const matMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a, 
        roughness: 0.9,
        metalness: 0.1
    });
    const mat = new THREE.Mesh(matGeo, matMat);
    mat.rotation.x = -Math.PI / 2;
    mat.position.y = 0;
    mat.receiveShadow = true;
    scene.add(mat);
    
    // UFC Logo in center
    const logoGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.35, 8);
    const logoMat = new THREE.MeshStandardMaterial({ 
        color: 0x0a0a0a,
        roughness: 0.95
    });
    const logo = new THREE.Mesh(logoGeo, logoMat);
    logo.rotation.y = Math.PI / 8;
    logo.position.y = 0.025;
    logo.receiveShadow = true;
    scene.add(logo);
    
    // Posts and chain link fence
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const x = Math.cos(angle) * size;
        const z = Math.sin(angle) * size;
        
        // Black metal post
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 2.5, 16),
            new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.3 })
        );
        post.position.set(x, 1.25, z);
        post.castShadow = true;
        scene.add(post);
        
        // Red padding
        const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.22, 1.8, 16),
            new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.9 })
        );
        pad.position.set(x, 1.0, z);
        scene.add(pad);
    }
    
    // Canvas skirt
    const skirtGeo = new THREE.CylinderGeometry(size + 1.5, size + 0.5, 2.2, 8, 1, true);
    const skirtMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        side: THREE.DoubleSide,
        roughness: 0.9
    });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.rotation.y = Math.PI / 8;
    skirt.position.y = 1.1;
    scene.add(skirt);
}

function createCrowd() {
    // Create crowd as animated particles
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 30;
        const height = 2 + Math.random() * 15;
        
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = height;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
        
        // Random crowd colors
        const isLit = Math.random() > 0.95;
        colors[i * 3] = isLit ? 0.8 + Math.random() * 0.2 : 0.05;
        colors[i * 3 + 1] = isLit ? 0.7 + Math.random() * 0.3 : 0.05;
        colors[i * 3 + 2] = isLit ? 0.6 + Math.random() * 0.4 : 0.05;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    const crowd = new THREE.Points(geometry, material);
    scene.add(crowd);
    crowdParticles.push(crowd);
}

function createAtmosphere() {
    // Floor
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.3;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Entrance ramp
    const ramp = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.2, 10),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })
    );
    ramp.position.set(0, 0.1, 18);
    scene.add(ramp);
}

// PARTICLE EFFECTS SYSTEM
function createParticleSystem() {
    // System for sweat/blood particles
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -1000; // Hide initially
        positions[i * 3 + 2] = 0;
        velocities[i * 3] = 0;
        velocities[i * 3 + 1] = 0;
        velocities[i * 3 + 2] = 0;
        lifetimes[i] = 0;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0xffffaa,
        size: 0.08,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    particleSystem = new THREE.Points(geometry, material);
    particleSystem.userData = { velocities, lifetimes, nextParticle: 0 };
    scene.add(particleSystem);
}

function spawnImpactParticles(position, intensity = 1) {
    const count = Math.floor(10 * intensity);
    const positions = particleSystem.geometry.attributes.position.array;
    const velocities = particleSystem.userData.velocities;
    const lifetimes = particleSystem.userData.lifetimes;
    let nextIdx = particleSystem.userData.nextParticle;
    
    for (let i = 0; i < count; i++) {
        const idx = (nextIdx + i) % 200;
        
        // Spawn at impact point
        positions[idx * 3] = position.x + (Math.random() - 0.5) * 0.3;
        positions[idx * 3 + 1] = position.y + 1.8 + (Math.random() - 0.5) * 0.2;
        positions[idx * 3 + 2] = position.z + (Math.random() - 0.5) * 0.3;
        
        // Explode outward
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.1 + Math.random() * 0.15 * intensity;
        velocities[idx * 3] = Math.cos(angle) * speed;
        velocities[idx * 3 + 1] = 0.05 + Math.random() * 0.1;
        velocities[idx * 3 + 2] = Math.sin(angle) * speed;
        
        lifetimes[idx] = 30 + Math.random() * 20;
    }
    
    particleSystem.userData.nextParticle = (nextIdx + count) % 200;
    particleSystem.geometry.attributes.position.needsUpdate = true;
}

function updateParticles() {
    if (!particleSystem) return;
    
    const positions = particleSystem.geometry.attributes.position.array;
    const velocities = particleSystem.userData.velocities;
    const lifetimes = particleSystem.userData.lifetimes;
    
    for (let i = 0; i < 200; i++) {
        if (lifetimes[i] > 0) {
            lifetimes[i]--;
            
            positions[i * 3] += velocities[i * 3];
            positions[i * 3 + 1] += velocities[i * 3 + 1];
            positions[i * 3 + 2] += velocities[i * 3 + 2];
            
            // Gravity
            velocities[i * 3 + 1] -= 0.005;
            
            if (lifetimes[i] <= 0) {
                positions[i * 3 + 1] = -1000;
            }
        }
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
}

// PRO FIGHTER MODEL with animation-ready parts
function createProFighter(data, isRightSide) {
    const group = new THREE.Group();
    group.userData = {
        name: data.name,
        health: CONFIG.HEALTH,
        stamina: CONFIG.STAMINA,
        style: data.style,
        stats: data.stats,
        isRightSide: isRightSide,
        isBlocking: false,
        isStunned: false
    };

    const skinMat = new THREE.MeshStandardMaterial({ 
        color: 0xffccaa, 
        roughness: 0.6,
        metalness: 0.1
    });
    
    const shortsMat = new THREE.MeshStandardMaterial({ 
        color: data.shortsColor,
        roughness: 0.8
    });
    
    const accentMat = new THREE.MeshStandardMaterial({
        color: data.accentColor,
        roughness: 0.7,
        emissive: data.accentColor,
        emissiveIntensity: 0.2
    });
    
    const gloveMat = new THREE.MeshStandardMaterial({
        color: 0x080808,
        roughness: 0.4,
        metalness: 0.3,
        emissive: 0xff0000,
        emissiveIntensity: 0.1
    });

    // BODY GROUP (torso)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.5;
    
    // Lower torso - shorts
    const shorts = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.38, 0.9, 12),
        shortsMat
    );
    shorts.position.y = -0.2;
    shorts.castShadow = true;
    torsoGroup.add(shorts);
    
    // Accent stripe on shorts
    const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.43, 0.39, 0.3, 12),
        accentMat
    );
    stripe.position.y = -0.1;
    torsoGroup.add(stripe);
    
    // Upper torso - chest
    const chest = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.42, 0.7, 12),
        accentMat
    );
    chest.position.y = 0.45;
    chest.castShadow = true;
    torsoGroup.add(chest);
    
    group.add(torsoGroup);

    // HEAD
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.3;
    
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 24, 24),
        skinMat
    );
    headGroup.add(head);
    
    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 0.05, 0.18);
    headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 0.05, 0.18);
    headGroup.add(rightEye);
    
    group.add(headGroup);
    group.userData.head = headGroup;

    // ARMS with shoulder pivots for animation
    const armThickness = 0.11;
    const armLength = 0.8;
    
    // Left Shoulder Group (pivot point)
    const leftShoulder = new THREE.Group();
    leftShoulder.position.set(-0.55, 1.9, 0);
    
    const leftArm = new THREE.Mesh(
        new THREE.CylinderGeometry(armThickness, armThickness * 0.8, armLength, 8),
        skinMat
    );
    leftArm.position.y = -armLength / 2;
    leftShoulder.add(leftArm);
    
    const leftGlove = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16),
        gloveMat
    );
    leftGlove.position.y = -armLength - 0.05;
    leftShoulder.add(leftGlove);
    
    group.add(leftShoulder);
    group.userData.leftArm = leftShoulder;
    group.userData.leftGlove = leftGlove;
    
    // Right Shoulder Group
    const rightShoulder = new THREE.Group();
    rightShoulder.position.set(0.55, 1.9, 0);
    
    const rightArm = new THREE.Mesh(
        new THREE.CylinderGeometry(armThickness, armThickness * 0.8, armLength, 8),
        skinMat
    );
    rightArm.position.y = -armLength / 2;
    rightShoulder.add(rightArm);
    
    const rightGlove = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16),
        gloveMat
    );
    rightGlove.position.y = -armLength - 0.05;
    rightShoulder.add(rightGlove);
    
    group.add(rightShoulder);
    group.userData.rightArm = rightShoulder;
    group.userData.rightGlove = rightGlove;

    // LEGS
    const legThickness = 0.16;
    const legLength = 1.0;
    
    const leftLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(legThickness, legThickness * 0.8, legLength, 8),
        shortsMat
    );
    leftLeg.position.set(-0.28, legLength / 2, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    group.userData.leftLeg = leftLeg;
    
    const rightLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(legThickness, legThickness * 0.8, legLength, 8),
        shortsMat
    );
    rightLeg.position.set(0.28, legLength / 2, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);
    group.userData.rightLeg = rightLeg;

    // Initial fighting stance
    leftShoulder.rotation.z = 0.4;
    leftShoulder.rotation.x = 0.3;
    rightShoulder.rotation.z = -0.4;
    rightShoulder.rotation.x = 0.3;
    
    return group;
}

// ENTIRE ENTRANCE SEQUENCE
function startEntrance() {
    document.getElementById('entrance-screen').classList.add('hidden');
    
    const f1 = FIGHTERS[0];
    const f2 = FIGHTERS[1];
    
    fighters[0] = createProFighter(f1, false);
    fighters[1] = createProFighter(f2, true);
    
    fighters[0].position.set(-8, 0, 35);
    fighters[1].position.set(8, 0, 35);
    
    scene.add(fighters[0]);
    scene.add(fighters[1]);
    
    // Update UI names
    document.getElementById('fighter1-display-name').textContent = f1.name;
    document.getElementById('fighter2-display-name').textContent = f2.name;
    
    // DRAMATIC ENTRANCE TIMELINE
    const tl = gsap.timeline({ onComplete: startFight });
    
    // Announcer voice effect via UI
    showCommentary("Ladies and gentlemen...", 2000);
    
    // Fighter 1 entrance
    tl.to(fighters[0].position, {
        z: 5,
        duration: 4,
        ease: "power2.inOut"
    }, 0.5);
    
    tl.to(fighters[0].rotation, {
        y: Math.PI / 6,
        duration: 1
    }, 4);
    
    // Fighter 2 entrance
    tl.to(fighters[1].position, {
        z: -5,
        duration: 4,
        ease: "power2.inOut"
    }, 1);
    
    tl.to(fighters[1].rotation, {
        y: -Math.PI / 6,
        duration: 1
    }, 4.5);
    
    // Camera drama
    tl.to(camera.position, {
        x: -12, y: 10, z: 15,
        duration: 2,
        ease: "power2.inOut"
    }, 0);
    
    tl.to(camera.position, {
        x: 12, y: 10, z: 15,
        duration: 2,
        ease: "power2.inOut"
    }, 2);
    
    tl.to(camera.position, {
        x: 0, y: 6, z: 8,
        duration: 2,
        ease: "power2.inOut"
    }, 4.5);
    
    // Touch gloves - move to center (closer so they can immediately fight)
    tl.to(fighters[0].position, {
        x: -1.2, z: 0,
        duration: 1.5,
        ease: "power2.out"
    }, 5.5);
    
    tl.to(fighters[1].position, {
        x: 1.2, z: 0,
        duration: 1.5,
        ease: "power2.out"
    }, 5.5);
    
    tl.to(camera.position, {
        x: 0, y: 8, z: 18,
        duration: 1.5,
        ease: "power2.out"
    }, 5.5);
}

function startFight() {
    console.log('🔥 FIGHT STARTED! isPlaying=' + gameState.isPlaying);
    gameState.isPlaying = true;
    showCommentary("IT'S TIME! FIGHT!", 3000);
    
    // Start timer immediately
    updateTimer();
    const timerInterval = setInterval(() => {
        if (gameState.isPlaying) {
            updateTimer();
        } else {
            clearInterval(timerInterval);
        }
    }, 1000);
    
    // Start AI fight loop
    aiCombatLoop();
}

// ANIMATED PUNCHES
async function animateJab(fighter, isRightArm) {
    const arm = isRightArm ? fighter.userData.rightArm : fighter.userData.leftArm;
    const startRot = { z: arm.rotation.z, x: arm.rotation.x };
    
    // Wind up
    gsap.to(arm.rotation, {
        z: startRot.z + (isRightArm ? -0.3 : 0.3),
        x: startRot.x - 0.2,
        duration: 0.08,
        ease: "power2.out"
    });
    
    await new Promise(r => setTimeout(r, 80));
    
    // SNAP forward
    gsap.to(arm.rotation, {
        z: startRot.z + (isRightArm ? 0.5 : -0.5),
        x: startRot.x - 0.8,
        duration: 0.08,
        ease: "power4.out"
    });
    
    // Small body lunge
    gsap.to(fighter.position, {
        z: fighter.position.z + (fighter.userData.isRightSide ? 0.3 : -0.3),
        duration: 0.08
    });
    
    await new Promise(r => setTimeout(r, 100));
    
    // Return to stance
    gsap.to(arm.rotation, {
        z: startRot.z,
        x: startRot.x,
        duration: 0.25,
        ease: "power2.out"
    });
    
    gsap.to(fighter.position, {
        z: fighter.userData.isRightSide ? 0 : 0,
        duration: 0.25
    });
}

async function animateHook(fighter, isRightArm) {
    const arm = isRightArm ? fighter.userData.rightArm : fighter.userData.leftArm;
    const startRot = { z: arm.rotation.z };
    
    // BIG wind up
    gsap.to(fighter.rotation, {
        y: fighter.rotation.y + (isRightArm ? -0.8 : 0.8),
        duration: 0.15,
        ease: "power2.in"
    });
    
    gsap.to(arm.rotation, {
        z: startRot.z + (isRightArm ? -1.2 : 1.2),
        duration: 0.15
    });
    
    await new Promise(r => setTimeout(r, 150));
    
    // SWING across
    gsap.to(fighter.rotation, {
        y: fighter.rotation.y,
        duration: 0.2,
        ease: "power4.out"
    });
    
    gsap.to(arm.rotation, {
        z: startRot.z + (isRightArm ? 0.8 : -0.8),
        duration: 0.15,
        ease: "power4.out"
    });
    
    await new Promise(r => setTimeout(r, 200));
    
    // Return
    gsap.to(arm.rotation, {
        z: startRot.z,
        duration: 0.3,
        ease: "power2.out"
    });
}

async function animateUppercut(fighter, isRightArm) {
    const arm = isRightArm ? fighter.userData.rightArm : fighter.userData.leftArm;
    const startRot = { x: arm.rotation.x, z: arm.rotation.z };
    
    // Dip down
    gsap.to(fighter.position, {
        y: -0.15,
        duration: 0.15
    });
    
    gsap.to(arm.rotation, {
        x: startRot.x - 0.5,
        z: startRot.z + (isRightArm ? -0.3 : 0.3),
        duration: 0.15
    });
    
    await new Promise(r => setTimeout(r, 150));
    
    // EXPLODE up
    gsap.to(fighter.position, {
        y: 0.1,
        duration: 0.15,
        ease: "power4.out"
    });
    
    gsap.to(arm.rotation, {
        x: startRot.x + 1.5,
        z: startRot.z,
        duration: 0.15,
        ease: "power4.out"
    });
    
    await new Promise(r => setTimeout(r, 150));
    
    // Return
    gsap.to(fighter.position, { y: 0, duration: 0.2 });
    gsap.to(arm.rotation, {
        x: startRot.x,
        z: startRot.z,
        duration: 0.3
    });
}

async function animateKick(fighter) {
    const leg = fighter.userData.rightLeg;
    const startRot = leg.rotation.x;
    
    // Chamber the kick
    gsap.to(leg.rotation, {
        x: -0.8,
        duration: 0.2,
        ease: "power2.in"
    });
    
    await new Promise(r => setTimeout(r, 200));
    
    // SNAP kick
    gsap.to(leg.rotation, {
        x: 0.6,
        duration: 0.15,
        ease: "power4.out"
    });
    
    await new Promise(r => setTimeout(r, 150));
    
    // Return
    gsap.to(leg.rotation, {
        x: 0,
        duration: 0.3,
        ease: "power2.out"
    });
}

// REACTIONS
async function animateHitReaction(fighter, damage) {
    // Head snap back
    gsap.to(fighter.userData.head.rotation, {
        x: -0.3,
        duration: 0.1,
        yoyo: true,
        repeat: 1
    });
    
    // Body stagger
    gsap.to(fighter.position, {
        z: fighter.position.z + (fighter.userData.isRightSide ? -0.3 : 0.3),
        x: fighter.position.x + (Math.random() - 0.5) * 0.3,
        duration: 0.1
    });
    
    // Flash red
    const originalScale = fighter.scale.x;
    gsap.to(fighter.scale, {
        x: originalScale * 1.05,
        y: 1.05,
        z: 1.05,
        duration: 0.05,
        yoyo: true,
        repeat: 3
    });
    
    // Screen shake
    shakeCamera(damage / 10);
    
    // Particle effects for big hits
    if (damage > 8) {
        spawnImpactParticles(fighter.position, damage / 10);
    }
}

async function animateKnockout(loser) {
    // Dramatic slow-mo fall
    gsap.to(loser.rotation, {
        z: loser.userData.isRightSide ? -Math.PI / 2 : Math.PI / 2,
        duration: 1.5,
        ease: "power2.out"
    });
    
    gsap.to(loser.position, {
        y: 0.1,
        duration: 1.5,
        ease: "bounce.out"
    });
    
    // Arms go limp
    gsap.to(loser.userData.leftArm.rotation, {
        z: 1.5,
        duration: 1
    });
    gsap.to(loser.userData.rightArm.rotation, {
        z: -1.5,
        duration: 1
    });
    
    // Big particle explosion
    spawnImpactParticles(loser.position, 3);
    
    // Dramatic camera zoom
    gsap.to(camera.position, {
        y: 4,
        z: 8,
        duration: 1,
        ease: "power2.in"
    });
}

// AI COMBAT SYSTEM with animations
async function aiCombatLoop() {
    while (gameState.isPlaying) {
        for (let i = 0; i < 2; i++) {
            if (!gameState.isPlaying) break;
            await aiTakeTurn(i);
        }
        await new Promise(r => setTimeout(r, 800 + Math.random() * 1000));
    }
}

async function aiTakeTurn(fighterIdx) {
    const fighter = fighters[fighterIdx];
    const opponent = fighters[fighterIdx === 0 ? 1 : 0];
    const data = fighter.userData;
    
    if (data.isStunned || data.health <= 0) return;
    
    const dist = fighter.position.distanceTo(opponent.position);
    
    // Decide action based on style and state
    const action = selectAIAction(data, dist);
    
    // Execute with animation
    let damage = 0;
    let landed = false;
    
    switch(action) {
        case 'jab':
            await animateJab(fighter, Math.random() > 0.5);
            landed = Math.random() < 0.7;
            damage = landed ? 4 : 0;
            if (landed) showCommentary("Sharp jab!");
            break;
            
        case 'cross':
            await animateJab(fighter, true);
            landed = Math.random() < 0.65;
            damage = landed ? 8 : 0;
            if (landed) showCommentary("Big cross connects!");
            break;
            
        case 'hook':
            await animateHook(fighter, Math.random() > 0.5);
            landed = Math.random() < 0.6;
            damage = landed ? 12 : 0;
            if (landed) showCommentary("Devastating hook!");
            break;
            
        case 'uppercut':
            await animateUppercut(fighter, Math.random() > 0.5);
            landed = Math.random() < 0.55;
            damage = landed ? 15 : 0;
            if (landed) showCommentary("CRUSHING UPPERCUT!");
            break;
            
        case 'kick':
            await animateKick(fighter);
            landed = Math.random() < 0.5;
            damage = landed ? 14 : 0;
            if (landed) showCommentary("Head kick lands!");
            break;
            
        case 'move':
            // Move TOWARD opponent, not away!
            const direction = fighterIdx === 0 ? 1 : -1;
            const currentX = fighter.position.x;
            const oppX = opponent.position.x;
            // Move 1 unit closer to opponent
            const targetX = currentX + (oppX > currentX ? 0.8 : -0.8);
            gsap.to(fighter.position, {
                x: targetX,
                duration: 0.4,
                ease: "power2.out"
            });
            break;
    }
    
    // Apply damage
    if (damage > 0 && landed) {
        opponent.userData.health = Math.max(0, opponent.userData.health - damage);
        await animateHitReaction(opponent, damage);
        updateUI();
        
        if (opponent.userData.health <= 0) {
            endFight(fighterIdx);
        }
    }
    
    data.stamina = Math.max(0, data.stamina - (damage > 0 ? 8 : 3));
}

function selectAIAction(data, dist) {
    const rand = Math.random();
    
    if (dist > 3) return 'move';
    if (data.stamina < 15) return Math.random() > 0.5 ? 'jab' : 'move';
    if (data.health < 25 && rand < 0.6) return 'uppercut';
    
    const weights = {
        striker: { jab: 0.3, cross: 0.25, hook: 0.2, kick: 0.2, uppercut: 0.05 },
        grappler: { jab: 0.2, cross: 0.2, hook: 0.3, kick: 0.1, uppercut: 0.2 },
        brawler: { jab: 0.1, cross: 0.2, hook: 0.3, kick: 0.1, uppercut: 0.3 },
        balanced: { jab: 0.25, cross: 0.25, hook: 0.2, kick: 0.2, uppercut: 0.1 }
    };
    
    const w = weights[data.style] || weights.balanced;
    const total = w.jab + w.cross + w.hook + w.kick + w.uppercut;
    const r = Math.random() * total;
    
    if (r < w.jab) return 'jab';
    if (r < w.jab + w.cross) return 'cross';
    if (r < w.jab + w.cross + w.hook) return 'hook';
    if (r < w.jab + w.cross + w.hook + w.kick) return 'kick';
    return 'uppercut';
}

function endFight(winnerIdx) {
    gameState.isPlaying = false;
    const winner = fighters[winnerIdx];
    const loser = fighters[winnerIdx === 0 ? 1 : 0];
    
    animateKnockout(loser);
    showCommentary(`${winner.userData.name} WINS BY KO!`, 5000);
    
    setTimeout(() => {
        document.getElementById('winner-name').textContent = winner.userData.name;
        document.getElementById('result-type').textContent = 'KNOCKOUT VICTORY';
        document.getElementById('winner-overlay').classList.add('visible');
    }, 2000);
}

// UTILITIES
function shakeCamera(intensity = 0.3) {
    const originalPos = camera.position.clone();
    gsap.to(camera.position, {
        x: originalPos.x + (Math.random() - 0.5) * intensity,
        y: originalPos.y + (Math.random() - 0.5) * intensity,
        duration: 0.04,
        yoyo: true,
        repeat: 6,
        onComplete: () => {
            camera.position.copy(originalPos);
        }
    });
}

function updateUI() {
    if (fighters.length < 2) return;
    document.getElementById('fighter1-health').style.width = fighters[0].userData.health + '%';
    document.getElementById('fighter2-health').style.width = fighters[1].userData.health + '%';
    document.getElementById('fighter1-stamina').style.width = fighters[0].userData.stamina + '%';
    document.getElementById('fighter2-stamina').style.width = fighters[1].userData.stamina + '%';
}

function updateTimer() {
    if (!gameState.isPlaying) return;
    gameState.time--;
    const mins = Math.floor(gameState.time / 60);
    const secs = gameState.time % 60;
    document.getElementById('timer').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showCommentary(text, duration = 2000) {
    const el = document.getElementById('commentary');
    el.textContent = text;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), duration);
}

function render() {
    requestAnimationFrame(render);
    
    const time = clock.getElapsedTime();
    
    // Animate crowd
    crowdParticles.forEach((crowd, i) => {
        crowd.rotation.y = time * 0.05;
        crowd.position.y = Math.sin(time * 0.5) * 0.2;
    });
    
    // Update particles
    updateParticles();
    
    // Fighters face each other
    if (fighters.length === 2) {
        const angle0 = Math.atan2(fighters[1].position.z - fighters[0].position.z, 
                                  fighters[1].position.x - fighters[0].position.x);
        if (!gameState.isPlaying) fighters[0].rotation.y = angle0;
        
        const angle1 = Math.atan2(fighters[0].position.z - fighters[1].position.z, 
                                  fighters[0].position.x - fighters[1].position.x);
        if (!gameState.isPlaying) fighters[1].rotation.y = angle1;
    }
    
    renderer.render(scene, camera);
}

// INPUT
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR') location.reload();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Auto-init when script loads
init();
