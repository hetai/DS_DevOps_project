import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Tag, 
  RotateCw, 
  Zap, 
  Info,
  Gauge,
  Calendar
} from 'lucide-react';
import { EventVisualizationData } from './types/ScenarioEventTypes';

interface BottomControlBarProps {
  // Playback controls
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  onPlayPause: (playing: boolean) => void;
  onReset: () => void;
  onTimeChange: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  
  // View controls
  showValidationHighlights: boolean;
  showVehicleLabels: boolean;
  autoRotate: boolean;
  onToggleValidation: () => void;
  onToggleLabels: () => void;
  onToggleRotation: () => void;
  
  // Performance monitoring
  frameRate: number;
  renderTime: number;
  performanceMode: boolean;
  onTogglePerformanceMode: () => void;
  
  // Timeline data
  timeline?: any[];
  scenarioEvents?: EventVisualizationData[];
  
  // Other
  showInfoPanel: boolean;
  onToggleInfoPanel: () => void;
}

const BottomControlBar: React.FC<BottomControlBarProps> = ({
  isPlaying,
  currentTime,
  duration,
  playbackSpeed,
  onPlayPause,
  onReset,
  onTimeChange,
  onSpeedChange,
  showValidationHighlights,
  showVehicleLabels,
  autoRotate,
  onToggleValidation,
  onToggleLabels,
  onToggleRotation,
  frameRate,
  renderTime,
  performanceMode,
  onTogglePerformanceMode,
  timeline,
  scenarioEvents,
  showInfoPanel,
  onToggleInfoPanel
}) => {
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<EventVisualizationData | null>(null);
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    onTimeChange(Math.max(0, Math.min(duration, newTime)));
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 p-4 z-30">
      <div className="flex flex-col space-y-3">
        {/* Timeline */}
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-300 w-12 text-center">
            {formatTime(currentTime)}
          </span>
          
          <div 
            className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer relative"
            onClick={handleTimelineClick}
          >
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            
            {/* Enhanced scenario events */}
            {scenarioEvents && scenarioEvents.map((eventData, index) => {
              const position = eventData.timelinePosition * 100;
              return (
                <div
                  key={`scenario-event-${index}`}
                  className="absolute top-0 w-2 h-full rounded-full cursor-pointer transform -translate-x-1/2 z-10"
                  style={{ 
                    left: `${position}%`,
                    backgroundColor: eventData.color,
                    opacity: eventData.isActive ? 1 : 0.8,
                    boxShadow: eventData.isActive ? `0 0 4px ${eventData.color}` : 'none'
                  }}
                  title={`${eventData.displayName}: ${eventData.description}`}
                  onMouseEnter={() => setHoveredEvent(eventData)}
                  onMouseLeave={() => setHoveredEvent(null)}
                />
              );
            })}
            
            {/* Legacy timeline events (fallback) */}
            {timeline && !scenarioEvents && timeline.map((event, index) => {
              const position = (event.time / duration) * 100;
              return (
                <div
                  key={index}
                  className="absolute top-0 w-1 h-full bg-yellow-400 rounded-full"
                  style={{ left: `${position}%` }}
                  title={`Event at ${formatTime(event.time)}`}
                />
              );
            })}
          </div>
          
          <span className="text-xs text-gray-300 w-12 text-center">
            {formatTime(duration)}
          </span>
        </div>
        
        {/* Event details hover display */}
        {hoveredEvent && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white p-3 rounded-lg shadow-lg border border-gray-600 z-40 min-w-64">
            <div className="flex items-center space-x-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: hoveredEvent.color }}
              />
              <span className="font-semibold">{hoveredEvent.displayName}</span>
              <span className="text-xs text-gray-400">
                {hoveredEvent.event.vehicleId}
              </span>
            </div>
            <p className="text-sm mb-2">{hoveredEvent.description}</p>
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>Time: {formatTime(hoveredEvent.event.time)}</span>
              <span>
                {hoveredEvent.isActive && (
                  <span className="px-2 py-1 bg-green-600 text-white rounded">Active</span>
                )}
                {hoveredEvent.isCompleted && (
                  <span className="px-2 py-1 bg-blue-600 text-white rounded">Completed</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Left: Playback Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPlayPause(!isPlaying)}
              className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>
            
            <button
              onClick={onReset}
              className="flex items-center justify-center w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4 text-white" />
            </button>
            
            <div className="flex items-center space-x-1 ml-2">
              <span className="text-xs text-gray-300">Speed:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          </div>

          {/* Center: View Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleValidation}
              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                showValidationHighlights 
                  ? 'bg-yellow-600 hover:bg-yellow-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title="Toggle Validation Highlights"
            >
              {showValidationHighlights ? (
                <Eye className="w-4 h-4 text-white" />
              ) : (
                <EyeOff className="w-4 h-4 text-white" />
              )}
            </button>
            
            <button
              onClick={onToggleLabels}
              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                showVehicleLabels 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title="Toggle Vehicle Labels"
            >
              <Tag className="w-4 h-4 text-white" />
            </button>
            
            <button
              onClick={onToggleRotation}
              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                autoRotate 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title="Toggle Auto Rotation"
            >
              <RotateCw className="w-4 h-4 text-white" />
            </button>
            
            <button
              onClick={() => setShowEventDetails(!showEventDetails)}
              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                showEventDetails 
                  ? 'bg-cyan-600 hover:bg-cyan-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title="Toggle Event Details"
            >
              <Calendar className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Right: Performance & Info */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 text-xs text-gray-300">
              <Gauge className="w-4 h-4" />
              <span>{frameRate.toFixed(0)} FPS</span>
              <span>|</span>
              <span>{renderTime.toFixed(1)}ms</span>
            </div>
            
            <button
              onClick={onTogglePerformanceMode}
              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                performanceMode 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title="Toggle Performance Mode"
            >
              <Zap className="w-4 h-4 text-white" />
            </button>
            
            <button
              onClick={onToggleInfoPanel}
              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                showInfoPanel 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title="Toggle Info Panel"
            >
              <Info className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomControlBar;