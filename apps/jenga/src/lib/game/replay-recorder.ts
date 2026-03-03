interface FrameSnapshot {
  timestamp: number
  bodies: Array<{
    id: number
    position: [number, number, number]
    rotation: [number, number, number, number]
  }>
}

const MAX_BUFFER_SECONDS = 5
const SAMPLE_RATE = 30 // fps
const MAX_FRAMES = MAX_BUFFER_SECONDS * SAMPLE_RATE

/**
 * Rolling buffer of physics frame snapshots for slow-motion replay.
 * ~226KB at full capacity (5s * 30fps * ~54 blocks * 28 bytes each).
 */
export class ReplayRecorder {
  private buffer: FrameSnapshot[] = []
  private lastSampleTime = 0

  record(
    bodies: Array<{
      id: number
      position: [number, number, number]
      rotation: [number, number, number, number]
    }>,
  ) {
    const now = performance.now()
    if (now - this.lastSampleTime < 1000 / SAMPLE_RATE) return

    this.lastSampleTime = now
    this.buffer.push({ timestamp: now, bodies })

    if (this.buffer.length > MAX_FRAMES) {
      this.buffer.shift()
    }
  }

  getReplay(): FrameSnapshot[] {
    return [...this.buffer]
  }

  clear() {
    this.buffer = []
  }
}
