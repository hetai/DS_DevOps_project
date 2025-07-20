/**
 * Test cases for extractScenarioFromConversation function
 * Testing the scenario description extraction logic
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock chat messages for testing
const mockChatMessages = {
  // Test case 1: Comprehensive summary message
  withSummary: [
    { type: 'user', content: '我想创建一个高速超车场景', timestamp: '2024-01-01T10:00:00Z' },
    { type: 'assistant', content: '好的，我来帮你创建高速超车场景。', timestamp: '2024-01-01T10:01:00Z' },
    { type: 'user', content: '车辆在高速公路上以80km/h行驶，需要超越前方慢车', timestamp: '2024-01-01T10:02:00Z' },
    { type: 'assistant', content: '场景摘要：这是一个高速公路超车场景，主车以80km/h的速度行驶，前方有一辆慢车需要超越。主车将变道到左侧车道，加速超车，然后变回原车道。整个过程需要确保安全距离和合理的加速度。', timestamp: '2024-01-01T10:03:00Z' }
  ],
  
  // Test case 2: Long comprehensive response
  withLongResponse: [
    { type: 'user', content: '创建城市道路场景', timestamp: '2024-01-01T10:00:00Z' },
    { type: 'assistant', content: '我将为你创建一个城市道路驾驶场景。在这个场景中，车辆在城市道路上以40km/h的速度行驶，道路两侧有建筑物和人行道。车辆需要在红绿灯路口停车等待，然后继续前行。道路宽度为双向四车道，每条车道宽3.5米。环境设置为白天，天气晴朗，能见度良好。', timestamp: '2024-01-01T10:01:00Z' }
  ],
  
  // Test case 3: Multiple relevant messages
  withMultipleMessages: [
    { type: 'user', content: '我要测试AEB系统', timestamp: '2024-01-01T10:00:00Z' },
    { type: 'assistant', content: '好的，AEB测试需要设置前方障碍物。', timestamp: '2024-01-01T10:01:00Z' },
    { type: 'user', content: '车速设置为60km/h', timestamp: '2024-01-01T10:02:00Z' },
    { type: 'assistant', content: '车辆以60km/h速度行驶，前方50米处有静止车辆作为障碍物。', timestamp: '2024-01-01T10:03:00Z' },
    { type: 'assistant', content: '测试场景：AEB自动紧急制动测试，主车以60km/h接近前方静止障碍物，系统应在安全距离内触发制动。', timestamp: '2024-01-01T10:04:00Z' }
  ],
  
  // Test case 4: Short messages only
  withShortMessages: [
    { type: 'user', content: '测试', timestamp: '2024-01-01T10:00:00Z' },
    { type: 'assistant', content: '好的', timestamp: '2024-01-01T10:01:00Z' },
    { type: 'user', content: '车辆', timestamp: '2024-01-01T10:02:00Z' },
    { type: 'assistant', content: '明白', timestamp: '2024-01-01T10:03:00Z' }
  ]
};

// Mock extracted parameters
const mockExtractedParameters = {
  withDescription: {
    scenario_name: "Test Scenario",
    description: "这是从AI对话中提取的参数描述：高速公路超车测试场景"
  },
  withoutDescription: {
    scenario_name: "Test Scenario"
  }
};

describe('extractScenarioFromConversation', () => {
  let extractScenarioFromConversation: (chatMessages: any[], extractedParameters: any, currentDescription: string) => string;
  
  beforeEach(() => {
    // This function will be implemented in the actual component
    extractScenarioFromConversation = (chatMessages, extractedParameters, currentDescription) => {
      if (!chatMessages.length) return currentDescription;
      
      const aiMessages = chatMessages.filter(msg => msg.type === 'assistant');
      if (!aiMessages.length) return extractedParameters?.description || currentDescription;
      
      // Strategy 1: Find the most recent comprehensive summary
      const summaryMessage = aiMessages
        .slice()
        .reverse()
        .find(msg => 
          msg.content.length > 150 && 
          (msg.content.toLowerCase().includes('场景摘要') ||
           msg.content.toLowerCase().includes('scenario summary') ||
           msg.content.toLowerCase().includes('这是一个') ||
           msg.content.toLowerCase().includes('here\'s what we have') ||
           msg.content.toLowerCase().includes('based on our conversation') ||
           msg.content.toLowerCase().includes('the scenario you described'))
        );
      
      if (summaryMessage) {
        return summaryMessage.content;
      }
      
      // Strategy 2: Find the longest comprehensive response
      const comprehensiveMessage = aiMessages
        .slice()
        .reverse()
        .find(msg => 
          msg.content.length > 100 && 
          (msg.content.toLowerCase().includes('场景') || 
           msg.content.toLowerCase().includes('scenario') || 
           msg.content.toLowerCase().includes('situation') ||
           msg.content.toLowerCase().includes('description') ||
           msg.content.toLowerCase().includes('车辆') ||
           msg.content.toLowerCase().includes('vehicle') ||
           msg.content.toLowerCase().includes('道路') ||
           msg.content.toLowerCase().includes('road') ||
           msg.content.toLowerCase().includes('driving'))
        );
      
      if (comprehensiveMessage) {
        return comprehensiveMessage.content;
      }
      
      // Strategy 3: Combine multiple relevant messages
      const relevantMessages = aiMessages
        .filter(msg => 
          msg.content.length > 20 &&
          (msg.content.toLowerCase().includes('场景') ||
           msg.content.toLowerCase().includes('scenario') ||
           msg.content.toLowerCase().includes('车辆') ||
           msg.content.toLowerCase().includes('vehicle') ||
           msg.content.toLowerCase().includes('道路') ||
           msg.content.toLowerCase().includes('road') ||
           msg.content.toLowerCase().includes('速度') ||
           msg.content.toLowerCase().includes('speed') ||
           msg.content.toLowerCase().includes('测试') ||
           msg.content.toLowerCase().includes('test'))
        )
        .slice(-5); // Take last 5 relevant messages instead of 3
      
      if (relevantMessages.length > 0) {
        return relevantMessages.map(msg => msg.content).join('\n\n');
      }
      
      // Strategy 4: Use the last substantial AI message
      const lastSubstantialMessage = aiMessages
        .slice()
        .reverse()
        .find(msg => msg.content.length > 50);
      
      if (lastSubstantialMessage) {
        return lastSubstantialMessage.content;
      }
      
      // Final fallback to extracted parameters or current description
      return extractedParameters?.description || currentDescription || 'Generated scenario from conversation';
    };
  });
  
  it('should extract comprehensive summary when available', () => {
    const result = extractScenarioFromConversation(
      mockChatMessages.withSummary,
      null,
      ''
    );
    
    expect(result).toContain('场景摘要');
    expect(result).toContain('高速公路超车场景');
    expect(result).toContain('80km/h');
    expect(result.length).toBeGreaterThan(150);
  });
  
  it('should extract long comprehensive response when no summary available', () => {
    const result = extractScenarioFromConversation(
      mockChatMessages.withLongResponse,
      null,
      ''
    );
    
    expect(result).toContain('城市道路驾驶场景');
    expect(result).toContain('40km/h');
    expect(result).toContain('双向四车道');
    expect(result.length).toBeGreaterThan(100);
  });
  
  it('should combine multiple relevant messages when no single comprehensive message', () => {
    const result = extractScenarioFromConversation(
      mockChatMessages.withMultipleMessages,
      null,
      ''
    );
    
    expect(result).toContain('AEB');
    expect(result).toContain('60km/h');
    expect(result).toContain('障碍物');
    // Should combine multiple messages
    expect(result.split('\n\n').length).toBeGreaterThan(1);
  });
  
  it('should fallback to extracted parameters when messages are too short', () => {
    const result = extractScenarioFromConversation(
      mockChatMessages.withShortMessages,
      mockExtractedParameters.withDescription,
      ''
    );
    
    expect(result).toBe(mockExtractedParameters.withDescription.description);
  });
  
  it('should fallback to current description when no useful content found', () => {
    const currentDescription = '当前场景描述';
    const result = extractScenarioFromConversation(
      mockChatMessages.withShortMessages,
      mockExtractedParameters.withoutDescription,
      currentDescription
    );
    
    expect(result).toBe(currentDescription);
  });
  
  it('should return default message when all fallbacks fail', () => {
    const result = extractScenarioFromConversation(
      mockChatMessages.withShortMessages,
      null,
      ''
    );
    
    expect(result).toBe('Generated scenario from conversation');
  });
  
  it('should handle empty chat messages', () => {
    const currentDescription = '测试描述';
    const result = extractScenarioFromConversation(
      [],
      null,
      currentDescription
    );
    
    expect(result).toBe(currentDescription);
  });
  
  it('should handle chat messages with no AI responses', () => {
    const userOnlyMessages = [
      { type: 'user', content: '用户消息1', timestamp: '2024-01-01T10:00:00Z' },
      { type: 'user', content: '用户消息2', timestamp: '2024-01-01T10:01:00Z' }
    ];
    
    const result = extractScenarioFromConversation(
      userOnlyMessages,
      mockExtractedParameters.withDescription,
      ''
    );
    
    expect(result).toBe(mockExtractedParameters.withDescription.description);
  });
});