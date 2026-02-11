/**
 * AudioWorklet processor for capturing PCM audio data.
 * Replaces the deprecated ScriptProcessorNode.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this._targetSampleRate = (options && options.processorOptions && options.processorOptions.targetSampleRate) || 16000;
    this._buffer = [];
    this._bufferSize = 4096;
  }

  /**
   * Resample audio from source rate to target rate using linear interpolation.
   */
  resample(inputData, inputRate, outputRate) {
    if (inputRate === outputRate) return inputData;
    const ratio = inputRate / outputRate;
    const outputLength = Math.round(inputData.length / ratio);
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
      const t = srcIndex - srcIndexFloor;
      output[i] = inputData[srcIndexFloor] * (1 - t) + inputData[srcIndexCeil] * t;
    }
    return output;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    // Accumulate samples into buffer
    for (let i = 0; i < channelData.length; i++) {
      this._buffer.push(channelData[i]);
    }

    // When we have enough samples, process and send
    while (this._buffer.length >= this._bufferSize) {
      const chunk = new Float32Array(this._buffer.splice(0, this._bufferSize));

      // Resample to target rate
      const resampled = this.resample(chunk, sampleRate, this._targetSampleRate);

      // Convert to 16-bit PCM
      const pcmData = new Int16Array(resampled.length);
      for (let i = 0; i < resampled.length; i++) {
        const s = Math.max(-1, Math.min(1, resampled[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      this.port.postMessage({
        type: 'audio',
        pcmData: pcmData.buffer,
      }, [pcmData.buffer]);
    }

    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
