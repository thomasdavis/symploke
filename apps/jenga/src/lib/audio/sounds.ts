type SoundName = 'pull' | 'crash' | 'wobble' | 'hover' | 'grab'

let audioContext: AudioContext | null = null

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

/**
 * Initialize audio on first user interaction (browser autoplay policy).
 */
export function initAudio(): void {
  const ctx = getContext()
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
}

/**
 * Generate a synthetic sound effect (no external files needed).
 */
export function playSound(name: SoundName, volume = 0.3): void {
  try {
    const ctx = getContext()
    if (ctx.state === 'suspended') return

    const gain = ctx.createGain()
    gain.gain.value = volume
    gain.connect(ctx.destination)

    switch (name) {
      case 'hover': {
        // Soft click
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = 800
        osc.connect(gain)
        gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.05)
        break
      }
      case 'grab': {
        // Wood creak
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(150, ctx.currentTime)
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3)
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 400
        osc.connect(filter)
        filter.connect(gain)
        gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
        break
      }
      case 'pull': {
        // Satisfying pop + chime
        const osc1 = ctx.createOscillator()
        osc1.type = 'sine'
        osc1.frequency.value = 523.25 // C5
        osc1.connect(gain)
        gain.gain.setValueAtTime(volume, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc1.start(ctx.currentTime)
        osc1.stop(ctx.currentTime + 0.3)

        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        gain2.gain.value = volume * 0.6
        gain2.connect(ctx.destination)
        osc2.type = 'sine'
        osc2.frequency.value = 659.25 // E5
        osc2.connect(gain2)
        gain2.gain.setValueAtTime(volume * 0.6, ctx.currentTime + 0.05)
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
        osc2.start(ctx.currentTime + 0.05)
        osc2.stop(ctx.currentTime + 0.35)
        break
      }
      case 'wobble': {
        // Creaking stress
        const osc = ctx.createOscillator()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(80, ctx.currentTime)
        osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.2)
        osc.frequency.linearRampToValueAtTime(70, ctx.currentTime + 0.5)
        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = 200
        filter.Q.value = 5
        osc.connect(filter)
        filter.connect(gain)
        gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.5)
        break
      }
      case 'crash': {
        // Dramatic crash using noise
        const bufferSize = ctx.sampleRate * 0.8
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15))
        }
        const noise = ctx.createBufferSource()
        noise.buffer = buffer
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 800
        noise.connect(filter)
        filter.connect(gain)
        gain.gain.setValueAtTime(volume, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
        noise.start(ctx.currentTime)
        break
      }
    }
  } catch {
    // Audio not available
  }
}
