'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Square,
  Settings2,
  Copy,
  Check,
  Save,
  Clipboard,
  Monitor,
  Radio,
  ToggleLeft,
  AudioWaveform,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';

type RecordingMode = 'push_to_talk' | 'toggle' | 'vad' | 'toggle_vad';
type OutputMode = 'display' | 'auto_save' | 'clipboard';

interface LiveTranscriptionProps {
  onTranscriptionComplete?: (text: string) => void;
  onSave?: (text: string) => void;
}

interface StreamingMessage {
  type: 'ready' | 'partial' | 'final' | 'vad' | 'error' | 'saved' | 'config_updated' | 'pong';
  text?: string;
  confidence?: number;
  timestamp?: number;
  speaking?: boolean;
  message?: string;
}

export default function LiveTranscription({ onTranscriptionComplete, onSave }: LiveTranscriptionProps) {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Configuration
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('toggle');
  const [outputMode, setOutputMode] = useState<OutputMode>('display');
  const [showSettings, setShowSettings] = useState(false);
  const [silenceTimeout, setSilenceTimeout] = useState(1.5);

  // Transcription state
  const [partialText, setPartialText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  // Handle clipboard mode - copy final text automatically
  useEffect(() => {
    if (outputMode === 'clipboard' && finalText) {
      navigator.clipboard.writeText(finalText);
    }
  }, [finalText, outputMode]);

  // M7: Send config updates over existing WebSocket without reconnecting
  useEffect(() => {
    if (!isRecording || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'config',
      vad_enabled: recordingMode === 'vad' || recordingMode === 'toggle_vad',
      silence_timeout: silenceTimeout,
    }));
  }, [isRecording, recordingMode, silenceTimeout]);

  const connectWebSocket = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      // Use dynamic protocol/host detection for WebSocket connection
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      const wsPort = window.location.protocol === 'https:' ? window.location.port : '8000';
      const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws/transcribe/stream`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);

        // Send start message with configuration
        ws.send(JSON.stringify({
          type: 'start',
          language: 'en',
          mode: recordingMode,
          output_mode: outputMode,
          vad_enabled: recordingMode === 'vad' || recordingMode === 'toggle_vad',
          silence_timeout: silenceTimeout,
        }));
      };

      ws.onmessage = (event) => {
        const data: StreamingMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'ready':
            console.log('Streaming session ready');
            resolve();
            break;
          case 'partial':
            setPartialText(data.text || '');
            break;
          case 'final':
            if (data.text) {
              setFinalText(prev => prev ? `${prev} ${data.text}` : (data.text || ''));
              setPartialText('');
            }
            break;
          case 'vad':
            setIsSpeaking(data.speaking || false);
            break;
          case 'error':
            setError(data.message || 'Unknown error');
            break;
          case 'saved':
            console.log('Transcription saved');
            break;
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error. Is the backend running?');
        setIsConnected(false);
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
      };

      wsRef.current = ws;
    });
  }, [recordingMode, outputMode, silenceTimeout]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Connect WebSocket first
      await connectWebSocket();

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context for processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Helper to send PCM buffer over WebSocket
      const sendPcmData = (pcmBuffer: ArrayBuffer) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const bytes = new Uint8Array(pcmBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        wsRef.current.send(JSON.stringify({
          type: 'audio',
          data: base64,
        }));
      };

      // Try AudioWorklet first, fall back to ScriptProcessorNode
      try {
        await audioContext.audioWorklet.addModule('/audio-worklet-processor.js');
        const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor', {
          processorOptions: { targetSampleRate: 16000 },
        });
        processorRef.current = workletNode;

        workletNode.port.onmessage = (event) => {
          if (event.data.type === 'audio') {
            sendPcmData(event.data.pcmData);
          }
        };

        source.connect(workletNode);
        workletNode.connect(audioContext.destination);
      } catch {
        // Fallback: ScriptProcessorNode for browsers without AudioWorklet support
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

          const inputData = event.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          sendPcmData(pcmData.buffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      }

      setIsRecording(true);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
    }
  }, [connectWebSocket, recordingMode, isPushToTalkActive, isRecording]);

  const stopRecording = useCallback(() => {
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Send stop message and close WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      wsRef.current.close();
    }
    wsRef.current = null;

    setIsRecording(false);
    setIsConnected(false);
    setIsSpeaking(false);
    setPartialText('');

    // Call completion callback
    if (finalText && onTranscriptionComplete) {
      onTranscriptionComplete(finalText);
    }
  }, [finalText, onTranscriptionComplete]);

  // Handle push-to-talk mouse/touch events
  const handlePushToTalkStart = useCallback(() => {
    if (recordingMode === 'push_to_talk') {
      setIsPushToTalkActive(true);
    }
  }, [recordingMode]);

  const handlePushToTalkEnd = useCallback(() => {
    if (recordingMode === 'push_to_talk') {
      setIsPushToTalkActive(false);
    }
  }, [recordingMode]);

  // Handle keyboard events for push-to-talk (spacebar)
  useEffect(() => {
    if (recordingMode !== 'push_to_talk' || !isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsPushToTalkActive(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPushToTalkActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [recordingMode, isRecording]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(finalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setFinalText('');
    setPartialText('');
  };

  const handleSave = () => {
    if (finalText && onSave) {
      onSave(finalText);
    }
  };

  const displayText = finalText + (partialText ? ` ${partialText}` : '');

  const modeIcons: Record<RecordingMode, typeof Mic> = {
    push_to_talk: Radio,
    toggle: ToggleLeft,
    vad: AudioWaveform,
    toggle_vad: AudioWaveform,
  };

  const modeLabels: Record<RecordingMode, string> = {
    push_to_talk: 'Push to Talk',
    toggle: 'Toggle',
    vad: 'Voice Activated',
    toggle_vad: 'Toggle + VAD',
  };

  const outputIcons: Record<OutputMode, typeof Monitor> = {
    display: Monitor,
    auto_save: Save,
    clipboard: Clipboard,
  };

  const outputLabels: Record<OutputMode, string> = {
    display: 'Display Only',
    auto_save: 'Auto Save',
    clipboard: 'Clipboard',
  };

  return (
    <div className="space-y-4">
      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-secondary/50 rounded-xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Recording Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Recording mode */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Control Mode</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(modeLabels) as RecordingMode[]).map((mode) => {
                    const Icon = modeIcons[mode];
                    return (
                      <button
                        key={mode}
                        onClick={() => setRecordingMode(mode)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          recordingMode === mode
                            ? 'bg-primary text-white'
                            : 'bg-secondary hover:bg-accent'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{modeLabels[mode]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Output mode */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Output Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(outputLabels) as OutputMode[]).map((mode) => {
                    const Icon = outputIcons[mode];
                    return (
                      <button
                        key={mode}
                        onClick={() => setOutputMode(mode)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          outputMode === mode
                            ? 'bg-primary text-white'
                            : 'bg-secondary hover:bg-accent'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {outputLabels[mode]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Silence timeout (for VAD modes) */}
              {(recordingMode === 'vad' || recordingMode === 'toggle_vad') && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Silence Timeout: {silenceTimeout}s
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={silenceTimeout}
                    onChange={(e) => setSilenceTimeout(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main recording interface */}
      <div className="p-6 bg-secondary/30 rounded-xl border border-border">
        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto p-1 hover:bg-destructive/20 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recording controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* Settings button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-xl transition-colors ${
              showSettings ? 'bg-primary text-white' : 'bg-secondary hover:bg-accent'
            }`}
            title="Settings"
          >
            <Settings2 className="w-5 h-5" />
          </button>

          {/* Main record button */}
          <motion.button
            onClick={isRecording ? stopRecording : startRecording}
            onMouseDown={handlePushToTalkStart}
            onMouseUp={handlePushToTalkEnd}
            onMouseLeave={handlePushToTalkEnd}
            onTouchStart={handlePushToTalkStart}
            onTouchEnd={handlePushToTalkEnd}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
              isRecording
                ? isPushToTalkActive || recordingMode !== 'push_to_talk'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-orange-500 hover:bg-orange-600'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {/* Pulsing ring when speaking */}
            {isRecording && (isSpeaking || isPushToTalkActive) && (
              <motion.div
                className="absolute inset-0 rounded-full bg-current opacity-30"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
            )}

            {isRecording ? (
              recordingMode === 'push_to_talk' && !isPushToTalkActive ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : (
                <Square className="w-8 h-8 text-white" />
              )
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </motion.button>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            disabled={!finalText}
            className={`p-3 rounded-xl transition-colors ${
              finalText ? 'bg-secondary hover:bg-accent' : 'bg-secondary/50 cursor-not-allowed'
            }`}
            title="Copy text"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Status indicators */}
        <div className="flex items-center justify-center gap-4 mb-4 text-sm">
          {isRecording && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              {isConnected ? (
                <span className="flex items-center gap-1.5 text-green-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Connecting...
                </span>
              )}

              {(recordingMode === 'vad' || recordingMode === 'toggle_vad') && (
                <span className={`flex items-center gap-1.5 ${isSpeaking ? 'text-primary' : 'text-muted-foreground'}`}>
                  <AudioWaveform className="w-4 h-4" />
                  {isSpeaking ? 'Speaking' : 'Listening'}
                </span>
              )}

              {recordingMode === 'push_to_talk' && (
                <span className="text-muted-foreground">
                  {isPushToTalkActive ? 'Recording...' : 'Hold space or button to talk'}
                </span>
              )}
            </motion.div>
          )}

          {!isRecording && (
            <span className="text-muted-foreground">
              Click to start recording
            </span>
          )}
        </div>

        {/* Transcription display */}
        <div className="min-h-[120px] p-4 bg-background rounded-lg border border-border">
          {displayText ? (
            <p className="text-foreground leading-relaxed">
              {finalText}
              {partialText && (
                <span className="text-muted-foreground italic"> {partialText}</span>
              )}
            </p>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {isRecording ? 'Listening...' : 'Your transcription will appear here'}
            </p>
          )}
        </div>

        {/* Action buttons */}
        {finalText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-end gap-2 mt-4"
          >
            <button
              onClick={handleClear}
              className="btn-ghost text-sm"
            >
              Clear
            </button>
            {onSave && (
              <button
                onClick={handleSave}
                className="btn-primary text-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Mode indicator */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {(() => {
            const Icon = modeIcons[recordingMode];
            return <Icon className="w-3 h-3" />;
          })()}
          {modeLabels[recordingMode]}
        </span>
        <span>|</span>
        <span className="flex items-center gap-1">
          {(() => {
            const Icon = outputIcons[outputMode];
            return <Icon className="w-3 h-3" />;
          })()}
          {outputLabels[outputMode]}
        </span>
      </div>
    </div>
  );
}
