/**
 * Timeline Controller - Manages scenario playback and timeline scrubbing
 * Provides play/pause, speed control, and timeline navigation
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { TimelineEvent } from '../types/VisualizationTypes';
import { MathUtils } from '../utils/MathUtils';

interface TimelineControllerProps {
  timeline: TimelineEvent[];
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onTimeChange: (time: number) => void;
  onPlayPause: (playing: boolean) => void;
  onSpeedChange: (speed: number) => void;
  onEventTrigger?: (event: TimelineEvent) => void;
}

interface TimelineState {
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  duration: number;
  progress: number;
}

interface ExtendedTimelineEvent extends TimelineEvent {
  triggered?: boolean;
}

interface UseTimelineReturn {
  state: TimelineState;
  play: () => void;
  pause: () => void;
  reset: () => void;
  seek: (time: number) => void;
  setSpeed: (speed: number) => void;
  getEventsAtTime: (time: number) => TimelineEvent[];
  getActiveEvents: (time: number) => TimelineEvent[];
}

/**
 * Timeline management hook
 */
function useTimeline(
  timeline: TimelineEvent[],
  duration: number,
  onEventTrigger?: (event: TimelineEvent) => void
): UseTimelineReturn {
  const [state, setState] = React.useState<TimelineState>({
    currentTime: 0,
    isPlaying: false,
    playbackSpeed: 1.0,
    duration,
    progress: 0
  });
  
  const triggeredEventsRef = useRef<Set<string>>(new Set());
  const lastUpdateTimeRef = useRef<number>(0);
  
  // Update duration when it changes
  useEffect(() => {
    setState(prev => ({ ...prev, duration }));
  }, [duration]);
  
  // Animation loop for playback using requestAnimationFrame
  useEffect(() => {
    if (!state.isPlaying) return;
    
    let animationId: number;
    
    const animate = () => {
      const currentTime = performance.now();
      const delta = (currentTime - lastUpdateTimeRef.current) / 1000; // Convert to seconds
      lastUpdateTimeRef.current = currentTime;
      
      setState(prev => {
        if (!prev.isPlaying) return prev;
        
        const newTime = Math.min(
          prev.currentTime + delta * prev.playbackSpeed,
          prev.duration
        );
        
        // Check for events that should be triggered
        if (onEventTrigger) {
          const eventsToTrigger = timeline.filter(event => 
            event.timestamp > prev.currentTime && 
            event.timestamp <= newTime &&
            !triggeredEventsRef.current.has(`${event.timestamp}-${event.type}-${event.target}`)
          );
          
          eventsToTrigger.forEach(event => {
            onEventTrigger(event);
            triggeredEventsRef.current.add(`${event.timestamp}-${event.type}-${event.target}`);
          });
        }
        
        // Auto-pause at end
        if (newTime >= prev.duration) {
          return {
            ...prev,
            currentTime: prev.duration,
            isPlaying: false,
            progress: 1
          };
        } else {
          return {
            ...prev,
            currentTime: newTime,
            progress: newTime / prev.duration
          };
        }
      });
      
      if (state.isPlaying && state.currentTime < state.duration) {
        animationId = requestAnimationFrame(animate);
      }
    };
    
    lastUpdateTimeRef.current = performance.now();
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [state.isPlaying, state.duration, timeline, onEventTrigger]);
  
  const play = () => {
    setState(prev => ({ ...prev, isPlaying: true }));
  };
  
  const pause = () => {
    setState(prev => ({ ...prev, isPlaying: false }));
  };
  
  const reset = () => {
    setState(prev => ({
      ...prev,
      currentTime: 0,
      isPlaying: false,
      progress: 0
    }));
    triggeredEventsRef.current.clear();
  };
  
  const seek = (time: number) => {
    const clampedTime = MathUtils.clamp(time, 0, state.duration);
    
    // Clear triggered events if seeking backwards
    if (clampedTime < state.currentTime) {
      triggeredEventsRef.current.clear();
      
      // Re-trigger events up to the new time
      if (onEventTrigger) {
        timeline.filter(event => event.timestamp <= clampedTime).forEach(event => {
          onEventTrigger(event);
          triggeredEventsRef.current.add(`${event.timestamp}-${event.type}-${event.target}`);
        });
      }
    }
    
    setState(prev => ({
      ...prev,
      currentTime: clampedTime,
      progress: clampedTime / state.duration
    }));
  };
  
  const setSpeed = (speed: number) => {
    setState(prev => ({ ...prev, playbackSpeed: MathUtils.clamp(speed, 0.1, 5.0) }));
  };
  
  const getEventsAtTime = (time: number): TimelineEvent[] => {
    return timeline.filter(event => 
      Math.abs(event.timestamp - time) < 0.1 // 100ms tolerance
    );
  };
  
  const getActiveEvents = (time: number): TimelineEvent[] => {
    return timeline.filter(event => 
      event.timestamp <= time && 
      (event.timestamp + (event.duration || 0)) > time
    );
  };
  
  return {
    state,
    play,
    pause,
    reset,
    seek,
    setSpeed,
    getEventsAtTime,
    getActiveEvents
  };
}

/**
 * Timeline visualization component
 */
function TimelineVisualization({ 
  timeline, 
  duration, 
  currentTime,
  onSeek 
}: {
  timeline: TimelineEvent[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Timeline visualization data
  const timelineData = useMemo(() => {
    const lanes: { [key: string]: TimelineEvent[] } = {};
    
    // Group events by target entity
    timeline.forEach(event => {
      if (!lanes[event.target]) {
        lanes[event.target] = [];
      }
      lanes[event.target].push(event);
    });
    
    // Sort events within each lane by timestamp
    Object.values(lanes).forEach(lane => {
      lane.sort((a, b) => a.timestamp - b.timestamp);
    });
    
    return lanes;
  }, [timeline]);
  
  // Draw timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Set canvas size
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear canvas
    context.clearRect(0, 0, width, height);
    
    // Draw background
    context.fillStyle = '#1a1a1a';
    context.fillRect(0, 0, width, height);
    
    // Draw timeline lanes
    const laneHeight = height / Math.max(Object.keys(timelineData).length, 1);
    const timeScale = width / duration;
    
    Object.entries(timelineData).forEach(([target, events], laneIndex) => {
      const y = laneIndex * laneHeight;
      
      // Lane background
      context.fillStyle = laneIndex % 2 === 0 ? '#2a2a2a' : '#252525';
      context.fillRect(0, y, width, laneHeight);
      
      // Lane label
      context.fillStyle = '#ffffff';
      context.font = '12px Arial';
      context.textAlign = 'left';
      context.fillText(target, 5, y + laneHeight / 2 + 4);
      
      // Draw events
      events.forEach(event => {
        const x = event.timestamp * timeScale;
        const eventWidth = Math.max((event.duration || 1) * timeScale, 3);
        
        // Event color based on type
        const color = getEventColor(event.type);
        context.fillStyle = color;
        context.fillRect(x, y + 5, eventWidth, laneHeight - 10);
        
        // Event label (if wide enough)
        if (eventWidth > 30) {
          context.fillStyle = '#000000';
          context.font = '10px Arial';
          context.textAlign = 'center';
          context.fillText(
            event.type,
            x + eventWidth / 2,
            y + laneHeight / 2 + 3
          );
        }
      });
    });
    
    // Draw current time indicator
    const currentX = currentTime * timeScale;
    context.strokeStyle = '#ff0000';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(currentX, 0);
    context.lineTo(currentX, height);
    context.stroke();
    
    // Draw time markers
    context.strokeStyle = '#555555';
    context.lineWidth = 1;
    const timeInterval = Math.max(1, Math.floor(duration / 10));
    
    for (let t = 0; t <= duration; t += timeInterval) {
      const x = t * timeScale;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
      
      // Time label
      context.fillStyle = '#888888';
      context.font = '10px Arial';
      context.textAlign = 'center';
      context.fillText(`${t}s`, x, height - 5);
    }
    
  }, [timelineData, duration, currentTime]);
  
  // Handle click to seek
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = (x / rect.width) * duration;
    
    onSeek(time);
  };
  
  return (
    <div
      ref={containerRef}
      className="timeline-visualization"
      style={{ width: '100%', height: '200px', position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ 
          width: '100%', 
          height: '100%', 
          cursor: 'pointer',
          border: '1px solid #333'
        }}
      />
    </div>
  );
}

/**
 * Playback controls component
 */
function PlaybackControls({
  isPlaying,
  playbackSpeed,
  currentTime,
  duration,
  onPlayPause,
  onSpeedChange,
  onSeek,
  onReset
}: {
  isPlaying: boolean;
  playbackSpeed: number;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (time: number) => void;
  onReset: () => void;
}) {
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };
  
  const speedOptions = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0];
  
  return (
    <div className="playback-controls" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px',
      padding: '10px',
      backgroundColor: '#2a2a2a',
      borderRadius: '4px'
    }}>
      {/* Play/Pause button */}
      <button 
        onClick={onPlayPause}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: '#4CAF50',
          color: 'white',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      
      {/* Reset button */}
      <button 
        onClick={onReset}
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: '#666',
          color: 'white',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        ⏹
      </button>
      
      {/* Time scrubber */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: 'white', fontSize: '12px', minWidth: '60px' }}>
          {formatTime(currentTime)}
        </span>
        
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          style={{
            flex: 1,
            height: '4px',
            backgroundColor: '#555',
            outline: 'none',
            borderRadius: '2px'
          }}
        />
        
        <span style={{ color: 'white', fontSize: '12px', minWidth: '60px' }}>
          {formatTime(duration)}
        </span>
      </div>
      
      {/* Speed control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ color: 'white', fontSize: '12px' }}>Speed:</span>
        <select
          value={playbackSpeed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          style={{
            backgroundColor: '#444',
            color: 'white',
            border: '1px solid #666',
            borderRadius: '4px',
            padding: '4px'
          }}
        >
          {speedOptions.map(speed => (
            <option key={speed} value={speed}>
              {speed}x
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * Event inspector component
 */
function EventInspector({ 
  events, 
  currentTime 
}: { 
  events: TimelineEvent[];
  currentTime: number;
}) {
  const activeEvents = events.filter(event => 
    event.timestamp <= currentTime && 
    (event.timestamp + (event.duration || 0)) > currentTime
  );
  
  const upcomingEvents = events.filter(event => 
    event.timestamp > currentTime && 
    event.timestamp <= currentTime + 5 // Next 5 seconds
  ).slice(0, 5);
  
  return (
    <div className="event-inspector" style={{
      backgroundColor: '#1a1a1a',
      padding: '10px',
      borderRadius: '4px',
      color: 'white'
    }}>
      <h4>Active Events</h4>
      {activeEvents.length === 0 ? (
        <p style={{ color: '#888', fontSize: '12px' }}>No active events</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {activeEvents.map((event, index) => (
            <li key={index} style={{ 
              padding: '4px 0', 
              borderLeft: `3px solid ${getEventColor(event.type)}`,
              paddingLeft: '8px',
              marginBottom: '4px',
              fontSize: '12px'
            }}>
              <strong>{event.target}</strong>: {event.type}
              {event.duration && (
                <span style={{ color: '#888' }}>
                  {' '}({((currentTime - event.timestamp) / event.duration * 100).toFixed(0)}%)
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      
      <h4 style={{ marginTop: '15px' }}>Upcoming Events</h4>
      {upcomingEvents.length === 0 ? (
        <p style={{ color: '#888', fontSize: '12px' }}>No upcoming events</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {upcomingEvents.map((event, index) => (
            <li key={index} style={{ 
              padding: '2px 0',
              fontSize: '11px',
              color: '#ccc'
            }}>
              <span style={{ color: '#888' }}>
                +{(event.timestamp - currentTime).toFixed(1)}s
              </span> {' '}
              <strong>{event.target}</strong>: {event.type}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Utility functions
 */
function getEventColor(eventType: string): string {
  const colors: { [key: string]: string } = {
    'teleport': '#ff4444',
    'speed': '#44ff44',
    'laneChange': '#4444ff',
    'init': '#ffff44',
    'action': '#ff8844',
    'condition': '#8844ff',
    'default': '#888888'
  };
  
  return colors[eventType] || colors.default;
}

/**
 * Main timeline controller component
 */
export default function TimelineController({
  timeline,
  duration,
  currentTime,
  isPlaying,
  playbackSpeed,
  onTimeChange,
  onPlayPause,
  onSpeedChange,
  onEventTrigger
}: TimelineControllerProps) {
  const timelineHook = useTimeline(timeline, duration, onEventTrigger);
  
  // Sync external state with internal state
  useEffect(() => {
    if (Math.abs(timelineHook.state.currentTime - currentTime) > 0.1) {
      timelineHook.seek(currentTime);
    }
  }, [currentTime, timelineHook]);
  
  useEffect(() => {
    if (timelineHook.state.isPlaying !== isPlaying) {
      if (isPlaying) {
        timelineHook.play();
      } else {
        timelineHook.pause();
      }
    }
  }, [isPlaying, timelineHook]);
  
  useEffect(() => {
    if (Math.abs(timelineHook.state.playbackSpeed - playbackSpeed) > 0.01) {
      timelineHook.setSpeed(playbackSpeed);
    }
  }, [playbackSpeed, timelineHook]);
  
  // Update external state when internal state changes
  useEffect(() => {
    if (Math.abs(timelineHook.state.currentTime - currentTime) > 0.01) {
      onTimeChange(timelineHook.state.currentTime);
    }
  }, [timelineHook.state.currentTime, currentTime, onTimeChange]);
  
  return (
    <div className="timeline-controller" style={{ width: '100%' }}>
      <PlaybackControls
        isPlaying={timelineHook.state.isPlaying}
        playbackSpeed={timelineHook.state.playbackSpeed}
        currentTime={timelineHook.state.currentTime}
        duration={timelineHook.state.duration}
        onPlayPause={() => onPlayPause(!timelineHook.state.isPlaying)}
        onSpeedChange={onSpeedChange}
        onSeek={onTimeChange}
        onReset={timelineHook.reset}
      />
      
      <TimelineVisualization
        timeline={timeline}
        duration={duration}
        currentTime={timelineHook.state.currentTime}
        onSeek={onTimeChange}
      />
      
      <EventInspector
        events={timeline}
        currentTime={timelineHook.state.currentTime}
      />
    </div>
  );
}

// Export hooks and utilities
export { 
  useTimeline, 
  TimelineVisualization, 
  PlaybackControls, 
  EventInspector,
  getEventColor 
};