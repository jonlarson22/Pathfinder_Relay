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
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime); 
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
    osc.frequency.setValueAtTime(110, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime); 
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

// DYNAMIC POSITIONING FOR CHARACTERS
function positionCharacters() {
    const container = document.getElementById('mars-base');
    const chars = document.querySelectorAll('.hex-char');
    
    const radius = container.offsetWidth * 0.42; 

    chars.forEach((el, i) => {
        const angle = i * 22.5; 
        el.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`;
    });
}

// INITIALIZE
hexChars.forEach((char, i) => {
    const el = document.createElement('div');
    el.className = 'hex-char';
    el.id = `char-${i}`;
    el.innerText = char;
    ring.appendChild(el);
});

const messages = {
    msg1: "OTAsIDExMi41LCAyMi41LCA0NSwgNjcuNSwgOTAsIDExMi41",
    msg2: "MjIuNSwgMjIuNSwgMjIuNSwgMjIuNSwgNDUsIDY3LjUsIDkwLCAxMTIuNQ==",
    msg3: "NDUsIDkwLCAxMzUsIDkwLCA0NQ=="
};

let currentHeading = 0;
let cumulativeRotation = 0;
let isPlaying = false;

window.addEventListener('load', positionCharacters);
window.addEventListener('resize', positionCharacters);

async function bootSystem() {
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume(); 
    }
    
    const bootScreen = document.getElementById('boot-screen');
    bootScreen.style.opacity = '0';
    setTimeout(() => bootScreen.style.display = 'none', 500);

    const titleEl = document.getElementById('sol-title');
    const uiContainer = document.getElementById('ui-container');
    const titleText = "NASA - ARES III<BR>MISSION LOG: SOL 97<BR>PATHFINDER TELEMETRY OVERRIDE";
    let i = 0;

    function typeWriter() {
        if (i < titleText.length) {
            if (titleText.slice(i, i + 4) === '<BR>') {
                titleEl.innerHTML += '<br>';
                i += 4; 
            } else {
                titleEl.innerHTML += titleText.charAt(i);
                i++;
            }
            playClick(); 
            setTimeout(typeWriter, 90); 
        } else {
            positionCharacters();
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
    statusText.innerText = `DOWNLINKING TELEMETRY...`;

    startMotor();
    cumulativeRotation = 0;
    currentHeading = 0;
    
    rover.style.transform = `translate(-50%, -50%) rotate(0deg)`; 
    
    await new Promise(r => setTimeout(r, 1200));
    stopMotor(); 
    
    const sequence = atob(messages[type]).split(',').map(num => parseFloat(num.trim()));
    
    for (let target of sequence) {
        await new Promise(r => setTimeout(r, 200)); 
        
        startMotor();

        let delta = target - currentHeading;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        cumulativeRotation += delta;
        currentHeading = target;
        
        rover.style.transform = `translate(-50%, -50%) rotate(${cumulativeRotation}deg)`;
        
        await new Promise(r => setTimeout(r, 1200));
        stopMotor(); 
        playBeep();

        // FIX: Math.round keeps decimal divisions from generating broken fractional IDs
        const charIndex = Math.round(target / 22.5) % 16;
        const charElement = document.getElementById(`char-${charIndex}`);
        if (charElement) {
            charElement.classList.add('glow-active');
            setTimeout(() => charElement.classList.remove('glow-active'), 625);
        }
        
        await new Promise(r => setTimeout(r, 1300)); 
    }
    
    statusText.innerText = "DECOMPRESSION SUCCESSFUL // BUFFER LOCKED";
    isPlaying = false;
    buttons.forEach(btn => btn.disabled = false);
}
