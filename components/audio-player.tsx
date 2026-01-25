'use client';

import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume1, Volume2, VolumeX, Gauge, Keyboard } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl?: string;
  audioFile?: File;
  onTimeUpdate?: (currentTime: number) => void;
  onSeek?: (time: number) => void;
}

export interface AudioPlayerHandle {
  seekTo: (time: number) => void;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Generate pseudo-random waveform data based on a seed
function generateWaveform(seed: number, count: number): number[] {
  const bars: number[] = [];
  let value = 0.5;

  for (let i = 0; i < count; i++) {
    // Use a simple pseudo-random formula based on seed and position
    const noise = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const random = noise - Math.floor(noise);

    // Smooth the values with some momentum
    value = value * 0.7 + random * 0.3;

    // Add variation based on position (more activity in middle)
    const positionFactor = 1 - Math.abs(i / count - 0.5) * 0.4;

    bars.push(Math.max(0.15, Math.min(1, value * positionFactor)));
  }

  return bars;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(function AudioPlayer({
  audioUrl,
  audioFile,
  onTimeUpdate,
  onSeek,
}, ref) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Generate a stable seed from file name or URL
  const waveformSeed = useMemo(() => {
    const source = audioFile?.name || audioUrl || 'default';
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      hash = ((hash << 5) - hash) + source.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }, [audioFile?.name, audioUrl]);

  // Generate waveform bars
  const waveformBars = useMemo(() => generateWaveform(waveformSeed, 80), [waveformSeed]);

  // Create object URL for file
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  const src = audioUrl || objectUrl;

  // Expose seekTo function via ref
  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    },
  }), []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!audioRef.current) return;
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    audioRef.current.volume = clampedVolume;
    setVolume(clampedVolume);
    if (clampedVolume > 0 && isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
    }
  }, [isMuted]);

  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
  }, [duration]);

  const changePlaybackSpeed = useCallback((speed: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  }, []);

  const cyclePlaybackSpeed = useCallback(() => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    changePlaybackSpeed(PLAYBACK_SPEEDS[nextIndex]);
  }, [playbackSpeed, changePlaybackSpeed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if player is visible and not typing in an input
      if (!src) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skip(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skip(10);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 's':
          e.preventDefault();
          cyclePlaybackSpeed();
          break;
        case '0':
        case 'home':
          e.preventDefault();
          if (audioRef.current) audioRef.current.currentTime = 0;
          break;
        case 'end':
          e.preventDefault();
          if (audioRef.current) audioRef.current.currentTime = duration;
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [src, togglePlay, skip, toggleMute, cyclePlaybackSpeed, duration, volume, handleVolumeChange]);

  const handleWaveformClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audioRef.current.currentTime = newTime;
    onSeek?.(newTime);
  }, [duration, onSeek]);

  const handleWaveformHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    setHoverPosition(percent * 100);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    onTimeUpdate?.(audioRef.current.currentTime);
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
    // Restore playback speed after loading
    audioRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!src) {
    return null;
  }

  return (
    <div ref={containerRef} className="bg-card border border-border rounded-xl p-4 space-y-4">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Waveform visualization */}
      <div
        ref={waveformRef}
        onClick={handleWaveformClick}
        onMouseMove={handleWaveformHover}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="relative h-16 bg-secondary/30 rounded-lg cursor-pointer overflow-hidden"
      >
        {/* Waveform bars */}
        <div className="absolute inset-0 flex items-center justify-center gap-[2px] px-2">
          {waveformBars.map((height, index) => {
            const barProgress = (index / waveformBars.length) * 100;
            const isPlayed = barProgress <= progress;
            const isHovered = isHovering && barProgress <= hoverPosition;

            return (
              <motion.div
                key={index}
                initial={{ scaleY: 0 }}
                animate={{
                  scaleY: 1,
                  opacity: isPlaying && isPlayed ? [0.6, 1, 0.6] : 1,
                }}
                transition={{
                  scaleY: { delay: index * 0.005, duration: 0.3 },
                  opacity: { repeat: isPlaying && isPlayed ? Infinity : 0, duration: 0.5 }
                }}
                className={`w-1 rounded-full transition-colors duration-150 ${
                  isPlayed
                    ? 'bg-primary'
                    : isHovered
                      ? 'bg-primary/40'
                      : 'bg-muted-foreground/30'
                }`}
                style={{
                  height: `${height * 100}%`,
                  minHeight: '4px',
                }}
              />
            );
          })}
        </div>

        {/* Progress overlay */}
        <div
          className="absolute inset-y-0 left-0 bg-primary/10 pointer-events-none"
          style={{ width: `${progress}%` }}
        />

        {/* Hover time indicator */}
        {isHovering && (
          <div
            className="absolute top-0 h-full w-px bg-white/50 pointer-events-none"
            style={{ left: `${hoverPosition}%` }}
          >
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-foreground text-background px-2 py-0.5 rounded">
              {formatTime((hoverPosition / 100) * duration)}
            </span>
          </div>
        )}

        {/* Current position indicator */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white shadow-lg pointer-events-none transition-all"
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Play controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => skip(-10)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
            title="Skip back 10s (J or ←)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <motion.button
            onClick={togglePlay}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white hover:bg-primary/90 transition-colors shadow-lg"
            title="Play/Pause (Space or K)"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </motion.button>

          <button
            onClick={() => skip(10)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
            title="Skip forward 10s (L or →)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Time display */}
        <div className="flex-1 flex items-center justify-center gap-2 text-sm">
          <span className="font-mono text-foreground">
            {formatTime(currentTime)}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-muted-foreground">
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback speed */}
        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
            title="Playback speed (S)"
          >
            <Gauge className="w-4 h-4" />
            <span className="font-mono text-xs">{playbackSpeed}x</span>
          </button>

          <AnimatePresence>
            {showSpeedMenu && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full mb-2 right-0 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[80px] z-10"
              >
                {PLAYBACK_SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => changePlaybackSpeed(speed)}
                    className={`w-full px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors ${
                      playbackSpeed === speed ? 'text-primary font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Volume with slider */}
        <div
          className="relative flex items-center"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <button
            onClick={toggleMute}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
            title="Mute/Unmute (M)"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>

          <AnimatePresence>
            {showVolumeSlider && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 pl-1 pr-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                    title="Volume (↑/↓)"
                  />
                  <span className="text-xs text-muted-foreground font-mono w-8">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keyboard shortcuts help */}
        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>
      </div>

      {/* Keyboard shortcuts overlay */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-3">Keyboard Shortcuts</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { key: 'Space / K', action: 'Play/Pause' },
                  { key: 'J / ←', action: 'Rewind 10s' },
                  { key: 'L / →', action: 'Forward 10s' },
                  { key: 'M', action: 'Mute/Unmute' },
                  { key: '↑ / ↓', action: 'Volume' },
                  { key: 'S', action: 'Change speed' },
                  { key: '0 / Home', action: 'Go to start' },
                ].map(({ key, action }) => (
                  <div key={key} className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-secondary rounded text-muted-foreground font-mono">
                      {key}
                    </kbd>
                    <span className="text-muted-foreground">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default AudioPlayer;
