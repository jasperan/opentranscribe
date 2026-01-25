'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Settings2,
  Copy,
  Check,
  Save,
  Trash2,
  Download,
  AlertCircle,
  X,
  Volume2,
  AudioWaveform,
  Radio,
  Loader2,
  ChevronDown,
} from 'lucide-react';

type StreamingMode = 'continuous' | 'vad' | 'push_to_talk';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface LiveRecorderProps {
  onTranscriptionComplete?: (text: string) => void;
  onSave?: (text: string, duration: number) => void;
}

interface StreamingMessage {
  type: 'ready' | 'vad' | 'partial' | 'final' | 'stopped' | 'error' | 'pong';
  text?: string;
  confidence?: number;
  duration?: number;
  total_duration?: number;
  speaking?: boolean;
  probability?: number;
  message?: string;
  model?: string;
}

const MODELS = [
  { id: 'tiny', name: 'Tiny', description: 'Fastest, lower accuracy' },
  { id: 'base', name: 'Base', description: 'Good balance (recommended)' },
  { id: 'small', name: 'Small', description: 'Better accuracy' },
  { id: 'medium', name: 'Medium', description: 'High accuracy' },
  { id: 'large-v3', name: 'Large', description: 'Best accuracy, slowest' },
];

const MODES: { id: StreamingMode; name: string; icon: typeof Mic; description: string }[] = [
  { id: 'vad', name: 'Voice Activated', icon: AudioWaveform, description: 'Auto-detect speech' },
  { id: 'continuous', name: 'Continuous', icon: Radio, description: 'Always transcribing' },
  { id: 'push_to_talk', name: 'Push to Talk', icon: Mic, description: 'Hold to record' },
];

export default function LiveRecorder({ onTranscriptionComplete, onSave }: LiveRecorderProps) {
  // Connection state
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Check if secure context (HTTPS or localhost) for microphone access
  const [isSecureContext, setIsSecureContext] = useState(true);
  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';
    setIsSecureContext(isLocalhost || isHttps);
  }, []);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [vadProbability, setVadProbability] = useState(0);

  // Configuration
  const [selectedModel, setSelectedModel] = useState('base');
  const [selectedMode, setSelectedMode] = useState<StreamingMode>('vad');
  const [language, setLanguage] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [silenceTimeout, setSilenceTimeout] = useState(1.0);
  const [vadThreshold, setVadThreshold] = useState(0.5);

  // Transcription state
  const [partialText, setPartialText] = useState('');
  const [segments, setSegments] = useState<{ text: string; isFinal: boolean; confidence: number }[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [copied, setCopied] = useState(false);

  // Audio visualization
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(50).fill(0));

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [segments, partialText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  // Update waveform visualization
  const updateVisualization = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average level
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255);

    // Sample waveform data
    const samples = 50;
    const step = Math.floor(dataArray.length / samples);
    const waveform = [];
    for (let i = 0; i < samples; i++) {
      waveform.push(dataArray[i * step] / 255);
    }
    setWaveformData(waveform);

    animationFrameRef.current = requestAnimationFrame(updateVisualization);
  }, []);

  const connectWebSocket = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      setStatus('connecting');
      setError(null);

      // Use current hostname and port for WebSocket connection
      // When using HTTPS, WebSocket goes through the same proxy on the same port
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      const wsPort = window.location.protocol === 'https:' ? window.location.port : '8000';
      const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws/live/stream`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');

        // Send start message with configuration
        ws.send(JSON.stringify({
          type: 'start',
          language: language || null,
          model: selectedModel,
          mode: selectedMode,
          vad_threshold: vadThreshold,
          silence_duration: silenceTimeout,
        }));
      };

      ws.onmessage = (event) => {
        const data: StreamingMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'ready':
            console.log('Streaming session ready:', data.model);
            resolve();
            break;

          case 'vad':
            setIsSpeaking(data.speaking || false);
            setVadProbability(data.probability || 0);
            break;

          case 'partial':
            setPartialText(data.text || '');
            break;

          case 'final':
            if (data.text) {
              setSegments(prev => [...prev, {
                text: data.text!,
                isFinal: true,
                confidence: data.confidence || 0,
              }]);
              setPartialText('');
              if (data.duration) {
                setTotalDuration(prev => prev + data.duration!);
              }
            }
            break;

          case 'stopped':
            if (data.total_duration) {
              setTotalDuration(data.total_duration);
            }
            break;

          case 'error':
            setError(data.message || 'Unknown error');
            break;
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error. Is the backend running?');
        setStatus('error');
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setStatus('disconnected');
      };

      wsRef.current = ws;
    });
  }, [language, selectedModel, selectedMode, vadThreshold, silenceTimeout]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setSegments([]);
      setPartialText('');
      setTotalDuration(0);

      // Check if mediaDevices is available (requires HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isLocalhost && window.location.protocol !== 'https:') {
          setError('Microphone access requires HTTPS. Please access this page via HTTPS or localhost.');
        } else {
          setError('Your browser does not support microphone access.');
        }
        return;
      }

      // Connect WebSocket first
      await connectWebSocket();

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context for processing and visualization
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Create analyser for visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Create script processor for sending audio data
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (!isRecording) return;
        if (selectedMode === 'push_to_talk' && !isPushToTalkActive) return;

        // Get audio data
        const inputData = event.inputBuffer.getChannelData(0);

        // Convert Float32Array to 16-bit PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to base64 and send
        const bytes = new Uint8Array(pcmData.buffer);
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

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Start visualization
      updateVisualization();

      setIsRecording(true);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      setStatus('error');
    }
  }, [connectWebSocket, selectedMode, isPushToTalkActive, isRecording, updateVisualization]);

  const stopRecording = useCallback(() => {
    // Stop visualization
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current = null;
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
    setStatus('disconnected');
    setIsSpeaking(false);
    setAudioLevel(0);
    setWaveformData(new Array(50).fill(0));

    // Call completion callback
    const fullText = getFullText();
    if (fullText && onTranscriptionComplete) {
      onTranscriptionComplete(fullText);
    }
  }, [onTranscriptionComplete]);

  // Handle push-to-talk
  const handlePushToTalkStart = useCallback(() => {
    if (selectedMode === 'push_to_talk' && isRecording) {
      setIsPushToTalkActive(true);
    }
  }, [selectedMode, isRecording]);

  const handlePushToTalkEnd = useCallback(() => {
    if (selectedMode === 'push_to_talk' && isRecording) {
      setIsPushToTalkActive(false);
      // Request finalization
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'finalize' }));
      }
    }
  }, [selectedMode, isRecording]);

  // Keyboard handler for push-to-talk
  useEffect(() => {
    if (selectedMode !== 'push_to_talk' || !isRecording) return;

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
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'finalize' }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedMode, isRecording]);

  const getFullText = useCallback(() => {
    const finalTexts = segments.map(s => s.text).join(' ');
    return partialText ? `${finalTexts} ${partialText}`.trim() : finalTexts;
  }, [segments, partialText]);

  const handleCopy = async () => {
    const text = getFullText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setSegments([]);
    setPartialText('');
    setTotalDuration(0);
  };

  const handleSave = () => {
    const text = getFullText();
    if (text && onSave) {
      onSave(text, totalDuration);
    }
  };

  const handleExport = () => {
    const text = getFullText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fullText = getFullText();

  return (
    <div className="space-y-6">
      {/* Settings Panel */}
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

              {/* Model Selection */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Whisper Model</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      disabled={isRecording}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedModel === model.id
                          ? 'bg-primary text-white'
                          : 'bg-secondary hover:bg-accent'
                      } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={model.description}
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Recording Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {MODES.map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setSelectedMode(mode.id)}
                        disabled={isRecording}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedMode === mode.id
                            ? 'bg-primary text-white'
                            : 'bg-secondary hover:bg-accent'
                        } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={mode.description}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{mode.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Language (leave empty for auto-detect)</label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g., en, es, fr, de, zh..."
                  disabled={isRecording}
                  className={`w-full px-3 py-2 bg-secondary rounded-lg text-sm border border-border focus:border-primary focus:outline-none ${
                    isRecording ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              {/* VAD Settings */}
              {(selectedMode === 'vad') && (
                <>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Silence Timeout: {silenceTimeout}s
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.25"
                      value={silenceTimeout}
                      onChange={(e) => setSilenceTimeout(parseFloat(e.target.value))}
                      disabled={isRecording}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      VAD Sensitivity: {Math.round(vadThreshold * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={vadThreshold}
                      onChange={(e) => setVadThreshold(parseFloat(e.target.value))}
                      disabled={isRecording}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Recording Interface */}
      <div className="p-6 bg-secondary/30 rounded-xl border border-border">
        {/* Error Display */}
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

        {/* Waveform Visualization */}
        <div className="mb-6 h-16 bg-background rounded-lg border border-border flex items-center justify-center px-2 overflow-hidden">
          {isRecording ? (
            <div className="flex items-end gap-0.5 h-12">
              {waveformData.map((value, i) => (
                <motion.div
                  key={i}
                  className={`w-1 rounded-full ${isSpeaking ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  animate={{
                    height: Math.max(4, value * 48),
                  }}
                  transition={{ duration: 0.05 }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AudioWaveform className="w-5 h-5" />
              <span>Audio visualization will appear here</span>
            </div>
          )}
        </div>

        {/* Recording Controls */}
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
            disabled={status === 'connecting'}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
              status === 'connecting'
                ? 'bg-muted cursor-wait'
                : isRecording
                ? isSpeaking || (selectedMode === 'push_to_talk' && isPushToTalkActive)
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

            {status === 'connecting' ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : isRecording ? (
              selectedMode === 'push_to_talk' && !isPushToTalkActive ? (
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
            disabled={!fullText}
            className={`p-3 rounded-xl transition-colors ${
              fullText ? 'bg-secondary hover:bg-accent' : 'bg-secondary/50 cursor-not-allowed'
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

        {/* Status Indicators */}
        <div className="flex items-center justify-center gap-4 mb-4 text-sm">
          {isRecording && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4"
            >
              {/* Connection status */}
              <span className={`flex items-center gap-1.5 ${
                status === 'connected' ? 'text-green-500' : 'text-muted-foreground'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
                }`} />
                {status === 'connected' ? 'Connected' : 'Connecting...'}
              </span>

              {/* VAD indicator */}
              {selectedMode === 'vad' && (
                <span className={`flex items-center gap-1.5 ${
                  isSpeaking ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  <Volume2 className="w-4 h-4" />
                  {isSpeaking ? `Speaking (${Math.round(vadProbability * 100)}%)` : 'Listening...'}
                </span>
              )}

              {/* Push-to-talk indicator */}
              {selectedMode === 'push_to_talk' && (
                <span className="text-muted-foreground">
                  {isPushToTalkActive ? 'Recording...' : 'Hold space or button to talk'}
                </span>
              )}

              {/* Duration */}
              <span className="text-muted-foreground">
                {formatDuration(totalDuration)}
              </span>
            </motion.div>
          )}

          {!isRecording && !isSecureContext && (
            <div className="flex items-center gap-2 text-yellow-500">
              <AlertCircle className="w-4 h-4" />
              <span>HTTPS required for microphone access. Use localhost or enable HTTPS.</span>
            </div>
          )}

          {!isRecording && isSecureContext && (
            <span className="text-muted-foreground">
              Click to start recording with {MODELS.find(m => m.id === selectedModel)?.name} model
            </span>
          )}
        </div>

        {/* Transcription Display */}
        <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-background rounded-lg border border-border">
          {segments.length > 0 || partialText ? (
            <div className="space-y-2">
              {segments.map((segment, index) => (
                <motion.p
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-foreground leading-relaxed"
                >
                  {segment.text}
                  {segment.confidence > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({Math.round(segment.confidence * 100)}%)
                    </span>
                  )}
                </motion.p>
              ))}
              {partialText && (
                <motion.p
                  key="partial"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-muted-foreground italic"
                >
                  {partialText}
                </motion.p>
              )}
              <div ref={transcriptEndRef} />
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-16">
              {isRecording ? 'Listening for speech...' : 'Your transcription will appear here'}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {fullText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-border"
          >
            <div className="text-sm text-muted-foreground">
              {segments.length} segment{segments.length !== 1 ? 's' : ''} | {fullText.split(/\s+/).filter(Boolean).length} words
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="btn-ghost text-sm flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
              <button
                onClick={handleExport}
                className="btn-ghost text-sm flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Export
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
            </div>
          </motion.div>
        )}
      </div>

      {/* Mode indicator */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {(() => {
            const mode = MODES.find(m => m.id === selectedMode);
            if (!mode) return null;
            const Icon = mode.icon;
            return <Icon className="w-3 h-3" />;
          })()}
          {MODES.find(m => m.id === selectedMode)?.name}
        </span>
        <span>|</span>
        <span>
          Model: {MODELS.find(m => m.id === selectedModel)?.name}
        </span>
        <span>|</span>
        <span>
          Language: {language || 'Auto-detect'}
        </span>
      </div>
    </div>
  );
}
