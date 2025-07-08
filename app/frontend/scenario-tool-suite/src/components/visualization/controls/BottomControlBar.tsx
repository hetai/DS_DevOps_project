/**
 * Bottom Control Bar - 统一的底部控制栏组件
 * 整合播放控制、时间轴、视图控制和性能监控功能
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  Settings,
  Zap,
  Info,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { TimelineEvent } from '../types/VisualizationTypes';

interface BottomControlBarProps {
  // 播放控制
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  onPlayPause: (playing: boolean) => void;
  onReset: () => void;
  onTimeChange: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  
  // 视图控制
  showValidationHighlights: boolean;
  showVehicleLabels: boolean;
  autoRotate: boolean;
  onToggleValidation: () => void;
  onToggleLabels: () => void;
  onToggleRotation: () => void;
  
  // 性能监控
  frameRate?: number;
  renderTime?: number;
  performanceMode?: boolean;
  onTogglePerformanceMode?: () => void;
  
  // 时间轴数据
  timeline?: TimelineEvent[];
  onEventTrigger?: (event: TimelineEvent) => void;
  
  // 其他
  showInfoPanel?: boolean;
  onToggleInfoPanel?: () => void;
  className?: string;
}

/**
 * 播放控制区域组件
 */
function PlaybackControls({
  isPlaying,
  playbackSpeed,
  onPlayPause,
  onReset,
  onSpeedChange
}: {
  isPlaying: boolean;
  playbackSpeed: number;
  onPlayPause: (playing: boolean) => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}) {
  const speedOptions = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0];
  
  return (
    <div className="flex items-center space-x-2">
      {/* 播放/暂停按钮 */}
      <Button
        size="sm"
        onClick={() => onPlayPause(!isPlaying)}
        className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 text-white p-0"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      
      {/* 重置按钮 */}
      <Button
        size="sm"
        variant="outline"
        onClick={onReset}
        className="w-8 h-8 p-0 bg-gray-600 hover:bg-gray-700 text-white border-gray-500"
      >
        <RotateCcw className="w-3 h-3" />
      </Button>
      
      {/* 播放速度选择器 */}
      <div className="flex items-center space-x-1">
        <span className="text-xs text-gray-300">速度:</span>
        <select
          value={playbackSpeed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="bg-gray-700 text-white text-xs border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
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
 * 时间轴控制区域组件
 */
function TimelineControls({
  currentTime,
  duration,
  timeline,
  onTimeChange,
  onEventTrigger
}: {
  currentTime: number;
  duration: number;
  timeline?: TimelineEvent[];
  onTimeChange: (time: number) => void;
  onEventTrigger?: (event: TimelineEvent) => void;
}) {
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  // 获取当前活跃的事件
  const activeEvents = timeline?.filter(event => 
    event.timestamp <= currentTime && 
    (event.timestamp + (event.duration || 0)) > currentTime
  ) || [];
  
  const upcomingEvent = timeline?.find(event => 
    event.timestamp > currentTime
  );
  
  return (
    <div className="flex-1 mx-4">
      {/* 时间显示和事件信息 */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-300">
          {formatTime(currentTime)}
        </span>
        
        {/* 当前事件显示 */}
        {activeEvents.length > 0 && (
          <div className="text-xs text-yellow-400 max-w-xs truncate">
            活跃: {activeEvents[0].target} - {activeEvents[0].type}
          </div>
        )}
        
        {/* 即将到来的事件 */}
        {upcomingEvent && activeEvents.length === 0 && (
          <div className="text-xs text-blue-400 max-w-xs truncate">
            下一个: {upcomingEvent.target} - {upcomingEvent.type} (+{(upcomingEvent.timestamp - currentTime).toFixed(1)}s)
          </div>
        )}
        
        <span className="text-xs text-gray-300">
          {formatTime(duration)}
        </span>
      </div>
      
      {/* 时间轴滑块 */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={(e) => onTimeChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #10b981 ${progress}%, #374151 ${progress}%, #374151 100%)`
          }}
        />
        
        {/* 事件标记 */}
        {timeline && timeline.map((event, index) => {
          const position = duration > 0 ? (event.timestamp / duration) * 100 : 0;
          const eventColor = getEventColor(event.type);
          
          return (
            <div
              key={index}
              className="absolute top-0 w-1 h-2 rounded-full cursor-pointer"
              style={{
                left: `${position}%`,
                backgroundColor: eventColor,
                transform: 'translateX(-50%)'
              }}
              title={`${event.timestamp.toFixed(1)}s: ${event.target} - ${event.type}`}
              onClick={() => onTimeChange(event.timestamp)}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * 视图控制区域组件
 */
function ViewControls({
  showValidationHighlights,
  showVehicleLabels,
  autoRotate,
  onToggleValidation,
  onToggleLabels,
  onToggleRotation
}: {
  showValidationHighlights: boolean;
  showVehicleLabels: boolean;
  autoRotate: boolean;
  onToggleValidation: () => void;
  onToggleLabels: () => void;
  onToggleRotation: () => void;
}) {
  return (
    <div className="flex items-center space-x-1">
      {/* 验证高亮切换 */}
      <Button
        size="sm"
        variant={showValidationHighlights ? "default" : "outline"}
        onClick={onToggleValidation}
        className={`w-8 h-8 p-0 ${
          showValidationHighlights 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-gray-600 hover:bg-gray-700 text-gray-300 border-gray-500'
        }`}
        title="切换验证高亮"
      >
        {showValidationHighlights ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      </Button>
      
      {/* 车辆标签切换 */}
      <Button
        size="sm"
        variant={showVehicleLabels ? "default" : "outline"}
        onClick={onToggleLabels}
        className={`w-8 h-8 p-0 text-xs ${
          showVehicleLabels 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-gray-600 hover:bg-gray-700 text-gray-300 border-gray-500'
        }`}
        title="切换车辆标签"
      >
        🏷
      </Button>
      
      {/* 自动旋转切换 */}
      <Button
        size="sm"
        variant={autoRotate ? "default" : "outline"}
        onClick={onToggleRotation}
        className={`w-8 h-8 p-0 ${
          autoRotate 
            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
            : 'bg-gray-600 hover:bg-gray-700 text-gray-300 border-gray-500'
        }`}
        title="切换自动旋转"
      >
        <RotateCcw className="w-3 h-3" />
      </Button>
    </div>
  );
}

/**
 * 性能监控区域组件
 */
function PerformanceMonitor({
  frameRate,
  renderTime,
  performanceMode,
  onTogglePerformanceMode
}: {
  frameRate?: number;
  renderTime?: number;
  performanceMode?: boolean;
  onTogglePerformanceMode?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="flex items-center space-x-2">
      {/* 性能模式切换 */}
      {onTogglePerformanceMode && (
        <Button
          size="sm"
          variant={performanceMode ? "default" : "outline"}
          onClick={onTogglePerformanceMode}
          className={`w-8 h-8 p-0 ${
            performanceMode 
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
              : 'bg-gray-600 hover:bg-gray-700 text-gray-300 border-gray-500'
          }`}
          title="切换性能模式"
        >
          <Zap className="w-3 h-3" />
        </Button>
      )}
      
      {/* 性能信息显示 */}
      <div className="relative">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 px-2 bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-500 text-xs"
        >
          FPS: {frameRate || 0}
          {isExpanded ? <ChevronDown className="w-3 h-3 ml-1" /> : <ChevronUp className="w-3 h-3 ml-1" />}
        </Button>
        
        {/* 展开的性能详情 */}
        {isExpanded && (
          <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg p-2 text-xs text-gray-300 whitespace-nowrap">
            <div>FPS: {frameRate || 0}</div>
            <div>渲染: {renderTime?.toFixed(1) || 0}ms</div>
            {performanceMode && (
              <div className="text-yellow-400 font-semibold">⚡ 性能模式</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 获取事件颜色
 */
function getEventColor(eventType: string): string {
  const colors: { [key: string]: string } = {
    'teleport': '#ef4444',
    'speed': '#10b981',
    'laneChange': '#3b82f6',
    'init': '#eab308',
    'action': '#f97316',
    'condition': '#8b5cf6',
    'default': '#6b7280'
  };
  
  return colors[eventType] || colors.default;
}

/**
 * 主要的底部控制栏组件
 */
export default function BottomControlBar({
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
  onEventTrigger,
  showInfoPanel,
  onToggleInfoPanel,
  className = ''
}: BottomControlBarProps) {
  // Keyboard shortcuts support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (event.code) {
        case 'Space':
          event.preventDefault();
          onPlayPause(!isPlaying);
          break;
        case 'KeyR':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onReset();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onTimeChange(Math.max(0, currentTime - 5)); // Skip back 5 seconds
          break;
        case 'ArrowRight':
          event.preventDefault();
          onTimeChange(Math.min(duration, currentTime + 5)); // Skip forward 5 seconds
          break;
        case 'ArrowUp':
          event.preventDefault();
          const speedOptions = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0];
          const currentIndex = speedOptions.indexOf(playbackSpeed);
          if (currentIndex < speedOptions.length - 1) {
            onSpeedChange(speedOptions[currentIndex + 1]);
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          const speedOptionsDown = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0];
          const currentIndexDown = speedOptionsDown.indexOf(playbackSpeed);
          if (currentIndexDown > 0) {
            onSpeedChange(speedOptionsDown[currentIndexDown - 1]);
          }
          break;
        case 'KeyV':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onToggleValidation();
          }
          break;
        case 'KeyL':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onToggleLabels();
          }
          break;
        case 'KeyI':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onToggleInfoPanel?.();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, playbackSpeed, onPlayPause, onReset, onTimeChange, onSpeedChange, onToggleValidation, onToggleLabels, onToggleInfoPanel]);
  return (
    <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 ${className}`}>
      <div className="flex items-center bg-black/80 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-3 shadow-lg">
        {/* 播放控制区域 */}
        <PlaybackControls
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onPlayPause={onPlayPause}
          onReset={onReset}
          onSpeedChange={onSpeedChange}
        />
        
        {/* 时间轴控制区域 */}
        <TimelineControls
          currentTime={currentTime}
          duration={duration}
          timeline={timeline}
          onTimeChange={onTimeChange}
          onEventTrigger={onEventTrigger}
        />
        
        {/* 视图控制区域 */}
        <ViewControls
          showValidationHighlights={showValidationHighlights}
          showVehicleLabels={showVehicleLabels}
          autoRotate={autoRotate}
          onToggleValidation={onToggleValidation}
          onToggleLabels={onToggleLabels}
          onToggleRotation={onToggleRotation}
        />
        
        {/* 性能监控区域 */}
        <div className="ml-2">
          <PerformanceMonitor
            frameRate={frameRate}
            renderTime={renderTime}
            performanceMode={performanceMode}
            onTogglePerformanceMode={onTogglePerformanceMode}
          />
        </div>
        
        {/* 设置和信息 */}
        <div className="ml-2 flex items-center space-x-1">
          {onToggleInfoPanel && (
            <Button
              size="sm"
              variant={showInfoPanel ? "default" : "outline"}
              onClick={onToggleInfoPanel}
              className={`w-8 h-8 p-0 ${
                showInfoPanel 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-600 hover:bg-gray-700 text-gray-300 border-gray-500'
              }`}
              title="切换信息面板"
            >
              <Info className="w-3 h-3" />
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0 bg-gray-600 hover:bg-gray-700 text-gray-300 border-gray-500"
            title="更多设置"
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// 导出子组件供其他地方使用
export {
  PlaybackControls,
  TimelineControls,
  ViewControls,
  PerformanceMonitor,
  getEventColor
};