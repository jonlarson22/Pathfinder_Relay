const ring = document.getElementById('ring');
const rover = document.getElementById('rover-anchor');
const statusText = document.getElementById('status');
const hexChars = "0123456789ABCDEF".split("");

// AUDIO ENGINE
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 1. Typewriter Click
function playClick() {
    if (audioCtx.state === 'suspended') return; 
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime); // Very short, quiet click
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

// 2. Confirmation Beep
function playBeep() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

// 3. Motor Whirring
function createMotor() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, audioCtx.currentTime); // Gritty motor pitch
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime); // Slightly louder since static is gone
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    return osc;
}

let activeMotor = null;

function startMotor() {
    if (!activeMotor) {
        activeMotor = createMotor();
        activeMotor.start();
    }
}

function stopMotor() {
    if (activeMotor) {
        activeMotor.stop();
        activeMotor = null;
    }
}

// INITIALIZE RING
hexChars.forEach((char, i) => {
    const angle = i * 22.5; 
    const el = document.createElement('div');
    el.className = 'hex-char';
    el.id = `char-${i}`;
    el.innerText = char;
    const radius = window.innerWidth < 600 ? 125 : 185;
    el.style.transform = `rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`;
    ring.appendChild(el);
});

const messages = {
    msg1: "OTAsIDExMi41LCAyMi41LCA0NSwgNjcuNSwgOTAsIDExMi41",
    msg2: "MiIuNSwgMjIuNSwgMjIuNSwgMjIuNSwgNDUsIDY3LjUsIDkwLCAxMTIuNQ==",
    msg3: "NDUsIDkwLCAxMzUsIDkwLCA0NQ=="
};

let currentHeading = 0;
let cumulativeRotation = 0;
let isPlaying = false;

// --- BOOT SYSTEM (Triggered by clicking the overlay) ---
function bootSystem() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const bootScreen = document.getElementById('boot-screen');
    bootScreen.style.opacity = '0';
    setTimeout(() => bootScreen.style.display = 'none', 500);

    const titleEl = document.getElementById('sol-title');
    const uiContainer = document.getElementById('ui-container');
    const titleText = "SOL 97: PATHFINDER_COMMS_RELAY";
    let i = 0;

    function typeWriter() {
        if (i < titleText.length) {
            titleEl.innerHTML += titleText.charAt(i);
            playClick(); 
            i++;
            setTimeout(typeWriter, 120); // SLOWED TO HALF SPEED
        } else {
            setTimeout(() => { uiContainer.style.opacity = 1; }, 500);
        }
    }
    setTimeout(typeWriter, 400);
}

async function playSequence(type) {
    if (isPlaying) return;
    isPlaying = true;
    
    const buttons = document.querySelectorAll('.controls button');
    buttons.forEach(btn => btn.disabled = true);
    statusText.innerText = `RECEIVING DATA STREAM...`;

    // RESET TO ZERO (With Motor Whir)
    startMotor();
    cumulativeRotation = 0;
    currentHeading = 0;
    rover.style.transform = `rotate(0deg)`;
    await new Promise(r => setTimeout(r, 1200));
    stopMotor(); // Stop briefly at home
    
    const sequence = atob(messages[type]).split(',').map(num => parseFloat(num.trim()));
    
    for (let target of sequence) {
        await new Promise(r => setTimeout(r, 200)); // Short pause before next move
        
        startMotor();

        let delta = target - currentHeading;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        cumulativeRotation += delta;
        currentHeading = target;
        rover.style.transform = `rotate(${cumulativeRotation}deg)`;
        
        await new Promise(r => setTimeout(r, 1200));
        
        stopMotor(); 
        playBeep();

        const charIndex = (target / 22.5) % 16;
        const charElement = document.getElementById(`char-${charIndex}`);
        if (charElement) {
            charElement.classList.add('glow-active');
            setTimeout(() => charElement.classList.remove('glow-active'), 625);
        }
        
        await new Promise(r => setTimeout(r, 1300)); 
    }
    
    statusText.innerText = "TRANSMISSION COMPLETE.";
    isPlaying = false;
    buttons.forEach(btn => btn.disabled = false);
}
