// Web Audio API sound effects — no external files needed
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  if (!audioCtx) return;
  resumeAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, volume = 0.2) {
  if (!audioCtx) return;
  resumeAudio();
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  source.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
}

let lastWinFile = '';
let lastLoseFile = '';

export const sounds = {
  move() {
    playTone(600, 0.08, 'sine', 0.12);
    setTimeout(() => playTone(800, 0.05, 'sine', 0.08), 30);
  },
  capture() {
    playTone(300, 0.12, 'square', 0.15);
    setTimeout(() => playTone(200, 0.1, 'square', 0.1), 50);
  },
  check() {
    new Audio('/sounds/check.mp3').play().catch(e => console.log('Audio error:', e));
  },
  explosion() {
    playNoise(0.8, 0.35);
    playTone(80, 0.5, 'sawtooth', 0.2);
    setTimeout(() => playTone(50, 0.3, 'sawtooth', 0.15), 100);
  },
  gameEnd() {
    playTone(523, 0.2, 'sine', 0.15);
    setTimeout(() => playTone(659, 0.2, 'sine', 0.15), 150);
    setTimeout(() => playTone(784, 0.3, 'sine', 0.15), 300);
  },
  captureQueen() {
    new Audio('/sounds/queen.mp3').play().catch(e => console.log('Audio error:', e));
  },
  win() {
    const winFiles = ['/sounds/won.mp3', '/sounds/won2.mp3'];
    let randomFile;
    do {
      randomFile = winFiles[Math.floor(Math.random() * winFiles.length)];
    } while (randomFile === lastWinFile && winFiles.length > 1);
    
    lastWinFile = randomFile;
    new Audio(randomFile).play().catch(e => console.log('Audio error:', e));
  },
  lose() {
    const loseFiles = ['/sounds/lost.mp3', '/sounds/lost2.mp3', '/sounds/lost3.mp3'];
    let randomFile;
    do {
      randomFile = loseFiles[Math.floor(Math.random() * loseFiles.length)];
    } while (randomFile === lastLoseFile && loseFiles.length > 1);
    
    lastLoseFile = randomFile;
    const audio = new Audio(randomFile);
    audio.play().catch(e => console.log('Audio error:', e));
  },
  draw() {
    new Audio('/sounds/draw.mp3').play().catch(e => console.log('Audio error:', e));
  },
  notify() {
    playTone(440, 0.1, 'sine', 0.1);
    setTimeout(() => playTone(660, 0.15, 'sine', 0.1), 100);
  },
};

export default sounds;
