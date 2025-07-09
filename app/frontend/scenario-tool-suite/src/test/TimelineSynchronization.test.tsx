/**
 * Timeline Synchronization Tests - TDD RED Phase
 * Tests for proper timeline control and synchronization in 3D visualization
 * These tests focus on the animation loop and time management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimelineSync, TimelineState, TimelineControls } from '../components/visualization/hooks/useTimelineSync';

// Mock requestAnimationFrame and performance
const mockRequestAnimationFrame = vi.fn();
const mockCancelAnimationFrame = vi.fn();
const mockPerformanceNow = vi.fn();

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', mockRequestAnimationFrame);
  vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame);
  vi.stubGlobal('performance', { now: mockPerformanceNow });
  mockPerformanceNow.mockReturnValue(0);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('TimelineSynchronization - Core Functionality', () => {
  describe('Timeline State Management', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useTimelineSync(10)); // 10 second duration
      
      expect(result.current.state.currentTime).toBe(0);
      expect(result.current.state.isPlaying).toBe(false);
      expect(result.current.state.playbackSpeed).toBe(1);
      expect(result.current.state.duration).toBe(10);
      expect(result.current.state.timelineDuration).toBe(10);
    });

    it('should handle play/pause correctly', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      act(() => {
        result.current.controls.play();
      });
      
      expect(result.current.state.isPlaying).toBe(true);
      
      act(() => {
        result.current.controls.pause();
      });
      
      expect(result.current.state.isPlaying).toBe(false);
    });

    it('should toggle playback when play/pause is called', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      act(() => {
        result.current.controls.toggle();
      });
      
      expect(result.current.state.isPlaying).toBe(true);
      
      act(() => {
        result.current.controls.toggle();
      });
      
      expect(result.current.state.isPlaying).toBe(false);
    });

    it('should reset timeline to beginning', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      // Advance time first
      act(() => {
        result.current.controls.seekTo(5);
      });
      
      expect(result.current.state.currentTime).toBe(5);
      
      act(() => {
        result.current.controls.reset();
      });
      
      expect(result.current.state.currentTime).toBe(0);
      expect(result.current.state.isPlaying).toBe(false);
    });

    it('should seek to specific time correctly', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      act(() => {
        result.current.controls.seekTo(3.5);
      });
      
      expect(result.current.state.currentTime).toBe(3.5);
    });

    it('should clamp seek time to valid range', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      act(() => {
        result.current.controls.seekTo(-1);
      });
      
      expect(result.current.state.currentTime).toBe(0);
      
      act(() => {
        result.current.controls.seekTo(15);
      });
      
      expect(result.current.state.currentTime).toBe(10);
    });

    it('should update playback speed correctly', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      act(() => {
        result.current.controls.setPlaybackSpeed(2);
      });
      
      expect(result.current.state.playbackSpeed).toBe(2);
    });

    it('should handle invalid playback speeds', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      act(() => {
        result.current.controls.setPlaybackSpeed(0);
      });
      
      expect(result.current.state.playbackSpeed).toBe(0.1); // Should clamp to minimum
      
      act(() => {
        result.current.controls.setPlaybackSpeed(10);
      });
      
      expect(result.current.state.playbackSpeed).toBe(4); // Should clamp to maximum
    });
  });

  describe('Animation Loop Synchronization', () => {
    it('should start animation loop when playing', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      act(() => {
        result.current.controls.play();
      });
      
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('should stop animation loop when paused', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      act(() => {
        result.current.controls.play();
      });
      
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
      
      act(() => {
        result.current.controls.pause();
      });
      
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('should advance time correctly in animation loop', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      // Mock time progression
      let currentTime = 0;
      mockPerformanceNow.mockImplementation(() => currentTime);
      
      // Setup animation callback
      let animationCallback: (time: number) => void;
      mockRequestAnimationFrame.mockImplementation((callback) => {
        animationCallback = callback;
        return 1;
      });
      
      act(() => {
        result.current.controls.play();
      });
      
      // Simulate 16ms frame (60fps)
      currentTime = 16;
      act(() => {
        animationCallback(currentTime);
      });
      
      expect(result.current.state.currentTime).toBeCloseTo(0.016, 3); // 16ms = 0.016s
    });

    it('should respect playback speed in animation loop', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      let currentTime = 0;
      mockPerformanceNow.mockImplementation(() => currentTime);
      
      let animationCallback: (time: number) => void;
      mockRequestAnimationFrame.mockImplementation((callback) => {
        animationCallback = callback;
        return 1;
      });
      
      act(() => {
        result.current.controls.setPlaybackSpeed(2);
        result.current.controls.play();
      });
      
      // Simulate 16ms frame at 2x speed
      currentTime = 16;
      act(() => {
        animationCallback(currentTime);
      });
      
      expect(result.current.state.currentTime).toBeCloseTo(0.032, 3); // 16ms * 2 = 32ms = 0.032s
    });

    it('should pause automatically when reaching end', () => {
      const { result } = renderHook(() => useTimelineSync(1)); // 1 second duration
      
      let currentTime = 0;
      mockPerformanceNow.mockImplementation(() => currentTime);
      
      let animationCallback: (time: number) => void;
      mockRequestAnimationFrame.mockImplementation((callback) => {
        animationCallback = callback;
        return 1;
      });
      
      act(() => {
        result.current.controls.play();
      });
      
      // Simulate reaching end
      currentTime = 1100; // 1.1 seconds
      act(() => {
        animationCallback(currentTime);
      });
      
      expect(result.current.state.isPlaying).toBe(false);
      expect(result.current.state.currentTime).toBe(1); // Should clamp to duration
    });

    it('should handle frame drops gracefully', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      let currentTime = 0;
      mockPerformanceNow.mockImplementation(() => currentTime);
      
      let animationCallback: (time: number) => void;
      mockRequestAnimationFrame.mockImplementation((callback) => {
        animationCallback = callback;
        return 1;
      });
      
      act(() => {
        result.current.controls.play();
      });
      
      // Simulate large frame drop (100ms)
      currentTime = 100;
      act(() => {
        animationCallback(currentTime);
      });
      
      // Should cap frame time to reasonable value
      expect(result.current.state.currentTime).toBeLessThan(0.05); // Max 50ms frame time
    });
  });

  describe('Timeline Event Synchronization', () => {
    it('should provide current active events', () => {
      const events = [
        { time: 2, type: 'vehicle_start', data: { vehicleId: 'car1' } },
        { time: 5, type: 'lane_change', data: { vehicleId: 'car1' } },
        { time: 8, type: 'vehicle_stop', data: { vehicleId: 'car1' } }
      ];
      
      const { result } = renderHook(() => useTimelineSync(10, events));
      
      act(() => {
        result.current.controls.seekTo(5.5);
      });
      
      const activeEvents = result.current.getActiveEvents();
      expect(activeEvents).toHaveLength(2); // vehicle_start and lane_change should be active
      expect(activeEvents[0].type).toBe('vehicle_start');
      expect(activeEvents[1].type).toBe('lane_change');
    });

    it('should provide upcoming events', () => {
      const events = [
        { time: 2, type: 'vehicle_start', data: { vehicleId: 'car1' } },
        { time: 5, type: 'lane_change', data: { vehicleId: 'car1' } },
        { time: 8, type: 'vehicle_stop', data: { vehicleId: 'car1' } }
      ];
      
      const { result } = renderHook(() => useTimelineSync(10, events));
      
      act(() => {
        result.current.controls.seekTo(3);
      });
      
      const upcomingEvents = result.current.getUpcomingEvents(2); // Next 2 seconds
      expect(upcomingEvents).toHaveLength(1); // Only lane_change at time 5
      expect(upcomingEvents[0].type).toBe('lane_change');
    });

    it('should trigger event callbacks at correct times', () => {
      const onEventTrigger = vi.fn();
      const events = [
        { time: 2, type: 'vehicle_start', data: { vehicleId: 'car1' } }
      ];
      
      const { result } = renderHook(() => useTimelineSync(10, events, onEventTrigger));
      
      act(() => {
        result.current.controls.seekTo(2);
      });
      
      expect(onEventTrigger).toHaveBeenCalledWith(events[0]);
    });

    it('should not trigger events multiple times', () => {
      const onEventTrigger = vi.fn();
      const events = [
        { time: 2, type: 'vehicle_start', data: { vehicleId: 'car1' } }
      ];
      
      const { result } = renderHook(() => useTimelineSync(10, events, onEventTrigger));
      
      act(() => {
        result.current.controls.seekTo(2);
      });
      
      act(() => {
        result.current.controls.seekTo(2.1);
      });
      
      expect(onEventTrigger).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Optimization', () => {
    it('should throttle timeline updates for performance', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      const updateCallback = vi.fn();
      result.current.onTimelineUpdate(updateCallback);
      
      // Rapid time changes
      act(() => {
        result.current.controls.seekTo(1);
        result.current.controls.seekTo(1.1);
        result.current.controls.seekTo(1.2);
      });
      
      // Should throttle updates
      expect(updateCallback).toHaveBeenCalledTimes(1);
    });

    it('should provide frame rate monitoring', () => {
      const { result } = renderHook(() => useTimelineSync(10));
      
      let currentTime = 0;
      mockPerformanceNow.mockImplementation(() => currentTime);
      
      let animationCallback: (time: number) => void;
      mockRequestAnimationFrame.mockImplementation((callback) => {
        animationCallback = callback;
        return 1;
      });
      
      act(() => {
        result.current.controls.play();
      });
      
      // Simulate several frames
      for (let i = 0; i < 10; i++) {
        currentTime += 16.67; // 60fps
        act(() => {
          animationCallback(currentTime);
        });
      }
      
      expect(result.current.state.frameRate).toBeCloseTo(60, 1);
    });

    it('should handle memory cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useTimelineSync(10));
      
      act(() => {
        result.current.controls.play();
      });
      
      unmount();
      
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });
  });
});

