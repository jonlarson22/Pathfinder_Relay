const ring = document.getElementById('ring');
const rover = document.getElementById('rover-anchor');
const statusText = document.getElementById('status');
const hexChars = "0123456789ABCDEF".split("");

// AUDIO ENGINE
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch beep
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function createStatic() {
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) { output[i] = Math.random() * 2 - 1; }
    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    const gain = audioCtx.createGain();
    
    // LOUDER STATIC: Increased from 0.02 to 0.15
    gain.gain.value = 0.15; 
    
    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    return { source: whiteNoise, gain: gain };
}

// INITIALIZE RING
hexChars.forEach((char, i) => {
    const angle = i * 22.5; 
    const el = document.createElement('div');
    el.className = 'hex-char';
    el.id = `char-${i}`; // ID for targeting the glow
    el.innerText = char;
    const radius = window.innerWidth < 600 ? 130 : 185;
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

// --- TYPEWRITER INTRO SEQUENCE ---
window.onload = () => {
    const titleEl = document.getElementById('sol-title');
    const uiContainer = document.getElementById('ui-container');
    const titleText = "SOL 97: PATHFINDER_COMMUNICATION_RELAY";
    let i = 0;

    function typeWriter() {
        if (i < titleText.length) {
            titleEl.innerHTML += titleText.charAt(i);
            i++;
            setTimeout(typeWriter, 60); // Speed of typing
        } else {
            setTimeout(() => {
                uiContainer.style.opacity = 1; // Fades in the UI
            }, 500);
        }
    }

    // Wait 1 second after page loads before starting the typing
    setTimeout(typeWriter, 1000);
};

async function playSequence(type) {
    if (isPlaying) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isPlaying = true;
    
    const buttons = document.querySelectorAll('.controls button');
    buttons.forEach(btn => btn.disabled = true);
    statusText.innerText = `RECEIVING DATA STREAM...`;

    cumulativeRotation = 0;
    currentHeading = 0;
    rover.style.transform = `rotate(0deg)`;
    
    await new Promise(r => setTimeout(r, 1200));

    const sequence = atob(messages[type]).split(',').map(num => parseFloat(num.trim()));
    
    for (let target of sequence) {
        const staticAudio = createStatic();
        staticAudio.source.start(); // Start static

        // Movement logic
        let delta = target - currentHeading;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        cumulativeRotation += delta;
        currentHeading = target;
        rover.style.transform = `rotate(${cumulativeRotation}deg)`;
        
        // Wait for movement (1.2s is the CSS transition time)
        await new Promise(r => setTimeout(r, 1200));
        
        staticAudio.source.stop(); // Stop static
        playBeep(); // Confirmation beep

        // Trigger Glow on the specific character
        const charIndex = (target / 22.5) % 16;
        const charElement = document.getElementById(`char-${charIndex}`);
        if (charElement) {
            charElement.classList.add('glow-active');
            setTimeout(() => charElement.classList.remove('glow-active'), 625);
        }
        
        await new Promise(r => setTimeout(r, 1300)); // Total 2.5s wait
    }
    
    statusText.innerText = "TRANSMISSION COMPLETE.";
    isPlaying = false;
    buttons.forEach(btn => btn.disabled = false);
}
