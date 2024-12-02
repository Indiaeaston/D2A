// In your audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096; // Increase buffer size
        this.buffer = new Float32Array(this.bufferSize);
        this.bytesWritten = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0][0];
        if (!input) return true;

        // Add input to buffer
        for (let i = 0; i < input.length; i++) {
            if (this.bytesWritten < this.bufferSize) {
                this.buffer[this.bytesWritten] = input[i];
                this.bytesWritten++;
            }
        }

        // If buffer is full, send it
        if (this.bytesWritten >= this.bufferSize) {
            const pcmData = new Int16Array(this.bufferSize);
            for (let i = 0; i < this.bufferSize; i++) {
                // Convert float32 to int16
                const s = Math.max(-1, Math.min(1, this.buffer[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
            
            // Reset buffer
            this.buffer = new Float32Array(this.bufferSize);
            this.bytesWritten = 0;
        }

        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);