/**
 * Timeline Synchronization Hook
 * Manages timeline state, playback controls, and event synchronization
 * Core component for scene playback functionality
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface TimelineState {
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  duration: number;
  timelineDuration: number;
  frameRate: number;
  renderTime: number;
}

export interface TimelineControls {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  seekTo: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
}

export interface TimelineEvent {
  time: number;
  type: string;
  data: any;
}

const MAX_FRAME_TIME = 0.05; // 50ms max frame time (20fps minimum)
const MIN_PLAYBACK_SPEED = 0.1;
const MAX_PLAYBACK_SPEED = 4;
const FRAME_RATE_BUFFER_SIZE = 60; // 1 second at 60fps

export function useTimelineSync(
  duration: number,
  events: TimelineEvent[] = [],
  onEventTrigger?: (event: TimelineEvent) => void
) {
  const [state, setState] = useState<TimelineState>({
    currentTime: 0,
    isPlaying: false,
    playbackSpeed: 1,
    duration,
    timelineDuration: duration,
    frameRate: 0,
    renderTime: 0
  });

  const animationIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  const triggeredEventsRef = useRef<Set<number>>(new Set());
  const timelineUpdateCallbackRef = useRef<((time: number) => void) | null>(null);

  // Animation loop
  const animate = useCallback((currentTimeMs: number) => {
    const now = performance.now();
    const deltaTime = Math.min((currentTimeMs - lastFrameTimeRef.current) / 1000, MAX_FRAME_TIME);
    
    setState(prevState => {
      if (!prevState.isPlaying) return prevState;
      
      const timeIncrement = deltaTime * prevState.playbackSpeed;
      const newTime = Math.min(prevState.currentTime + timeIncrement, prevState.duration);
      
      // Auto-pause at end
      const shouldPause = newTime >= prevState.duration;
      
      // Calculate frame rate
      frameTimesRef.current.push(deltaTime);
      if (frameTimesRef.current.length > FRAME_RATE_BUFFER_SIZE) {
        frameTimesRef.current.shift();
      }
      
      const avgFrameTime = frameTimesRef.current.reduce((sum, time) => sum + time, 0) / frameTimesRef.current.length;
      const frameRate = avgFrameTime > 0 ? 1 / avgFrameTime : 0;
      
      return {
        ...prevState,
        currentTime: newTime,
        isPlaying: !shouldPause,
        frameRate,
        renderTime: now - performance.now()
      };
    });
    
    lastFrameTimeRef.current = currentTimeMs;
  }, []);

  // Controls
  const controls: TimelineControls = {
    play: () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    },
    
    pause: () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    },
    
    toggle: () => {
      setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    },
    
    reset: () => {
      setState(prev => ({ 
        ...prev, 
        currentTime: 0, 
        isPlaying: false 
      }));
      triggeredEventsRef.current.clear();
    },
    
    seekTo: (time: number) => {
      const clampedTime = Math.max(0, Math.min(time, duration));
      setState(prev => ({ ...prev, currentTime: clampedTime }));
      
      // Reset triggered events when seeking
      triggeredEventsRef.current.clear();
      
      // Trigger events up to the seek time
      events.forEach((event, index) => {
        if (event.time <= clampedTime) {
          onEventTrigger?.(event);
          triggeredEventsRef.current.add(index);
        }
      });
      
      // Throttled timeline update callback
      if (timelineUpdateCallbackRef.current) {
        timelineUpdateCallbackRef.current(clampedTime);
      }
    },
    
    setPlaybackSpeed: (speed: number) => {
      const clampedSpeed = Math.max(MIN_PLAYBACK_SPEED, Math.min(speed, MAX_PLAYBACK_SPEED));
      setState(prev => ({ ...prev, playbackSpeed: clampedSpeed }));
    }
  };

  // Event management
  const getActiveEvents = useCallback(() => {
    return events.filter(event => event.time <= state.currentTime);
  }, [events, state.currentTime]);

  const getUpcomingEvents = useCallback((timeWindow: number) => {
    const endTime = state.currentTime + timeWindow;
    return events.filter(event => 
      event.time > state.currentTime && event.time <= endTime
    );
  }, [events, state.currentTime]);

  const onTimelineUpdate = useCallback((callback: (time: number) => void) => {
    let lastCallTime = 0;
    const throttleDelay = 16; // 60fps throttling
    
    timelineUpdateCallbackRef.current = (time: number) => {
      const now = performance.now();
      if (now - lastCallTime >= throttleDelay) {
        callback(time);
        lastCallTime = now;
      }
    };
  }, []);

  // Start animation loop when playing
  useEffect(() => {
    if (state.isPlaying) {
      lastFrameTimeRef.current = performance.now();
      const runAnimation = () => {
        animationIdRef.current = requestAnimationFrame((time) => {
          animate(time);
          if (state.isPlaying && state.currentTime < state.duration) {
            runAnimation();
          }
        });
      };
      runAnimation();
    } else {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    }
  }, [state.isPlaying, animate]);

  // Trigger events during playback
  useEffect(() => {
    events.forEach((event, index) => {
      if (event.time <= state.currentTime && !triggeredEventsRef.current.has(index)) {
        onEventTrigger?.(event);
        triggeredEventsRef.current.add(index);
      }
    });
  }, [events, state.currentTime, onEventTrigger]);

  // Update duration when it changes
  useEffect(() => {
    setState(prev => ({ 
      ...prev, 
      duration, 
      timelineDuration: duration 
    }));
  }, [duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return {
    state,
    controls,
    getActiveEvents,
    getUpcomingEvents,
    onTimelineUpdate
  };
}