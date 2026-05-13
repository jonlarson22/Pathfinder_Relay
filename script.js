const ring = document.getElementById('ring');
const rover = document.getElementById('rover-anchor');
const statusText = document.getElementById('status');
const hexChars = "0123456789ABCDEF".split("");

// Initialize the Hex Ring
hexChars.forEach((char, i) => {
    const angle = i * 22.5; 
    const el = document.createElement('div');
    el.className = 'hex-char';
    el.innerText = char;
    el.style.transform = `rotate(${angle}deg) translateY(-170px) rotate(-${angle}deg)`;
    ring.appendChild(el);
});

const messages = {
    msg1: "OTAsIDExMi41LCAyMi41LCA0NSwgNjcuNSwgOTAsIDExMi41", // Original North
    msg2: "MiIuNSwgMjIuNSwgMjIuNSwgMjIuNSwgNDUsIDY3LjUsIDkwLCAxMTIuNQ==", // Original West
    msg3: "NDUsIDkwLCAxMzUsIDkwLCA0NQ==" // New Placeholder (Points to 2, 4, 6, 4, 2)
};

let currentHeading = 0;
let cumulativeRotation = 0;
let isPlaying = false;

async function playSequence(type) {
    if (isPlaying) return;
    isPlaying = true;
    
    // Disable all buttons
    const buttons = document.querySelectorAll('.controls button');
    buttons.forEach(btn => btn.disabled = true);
    
    statusText.innerText = `RECEIVING DATA STREAM: ${type.toUpperCase()}...`;

    // Reset rover position
    cumulativeRotation = 0;
    currentHeading = 0;
    rover.style.transform = `rotate(0deg)`;
    
    await new Promise(r => setTimeout(r, 1200));

    // Decode and play sequence
    const sequence = atob(messages[type]).split(',').map(num => parseFloat(num.trim()));
    
    for (let target of sequence) {
        if (target === currentHeading) {
            statusText.innerText = "CHARACTER REPEAT: CONFIRMING...";
            cumulativeRotation += 360;
            rover.style.transform = `rotate(${cumulativeRotation}deg)`;
            await new Promise(r => setTimeout(r, 1500));
            statusText.innerText = `RECEIVING DATA...`;
        }

        let delta = target - currentHeading;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        cumulativeRotation += delta;
        currentHeading = target;
        rover.style.transform = `rotate(${cumulativeRotation}deg)`;
        
        await new Promise(r => setTimeout(r, 2500));
    }
    
    statusText.innerText = "TRANSMISSION COMPLETE.";
    isPlaying = false;
    buttons.forEach(btn => btn.disabled = false);
}
