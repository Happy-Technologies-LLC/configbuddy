import api from '../lib/api-client';

export interface AIPattern {
  patternId: string;
  name: string;
  category: string;
  description?: string;
  detectionCode: string;
  discoveryCode: string;
  confidenceScore: number;
  status: 'draft' | 'review' | 'approved' | 'active' | 'deprecated';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  activatedAt?: string;
  usageCount: number;
  successCount: number;
  avgExecutionTimeMs: number;
  learnedFromSessions?: string[];
  testCases?: PatternTestCase[];
  tags?: string[];
}

export interface PatternTestCase {
  name: string;
  input: any;
  expectedMatch: boolean;
  expectedConfidence?: number;
}

export interface AIDiscoverySession {
  sessionId: string;
  targetHost: string;
  targetPort: number;
  status: 'running' | 'completed' | 'failed';
  toolCalls: ToolCall[];
  discoveredCIs: any[];
  confidenceScore: number;
  estimatedCost: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  aiReasoning?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  provider: string;
  model: string;
}

export interface ToolCall {
  toolName: string;
  toolInput: any;
  toolOutput: any;
  success: boolean;
  executionTimeMs: number;
  timestamp: string;
}

export interface PatternUsageMetrics {
  patternId: string;
  timestamp: string;
  executionTimeMs: number;
  success: boolean;
  matchedHost?: string;
  matchedPort?: number;
}

export interface PatternAnalysisResult {
  isPattern: boolean;
  signature: {
    signatureHash: string;
    toolSequence: string[];
    serviceIndicators: string[];
    sessionCount: number;
  } | null;
  candidate: {
    suggestedName: string;
    suggestedCategory: string;
    confidenceScore: number;
    commonElements: {
      ports: number[];
      httpHeaders: string[];
      httpEndpoints: string[];
      serviceNames: string[];
    };
  } | null;
}

export interface PatternValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  testResults: Array<{
    testName: string;
    passed: boolean;
    error?: string;
  }>;
}

export interface CostAnalytics {
  totalCost: number;
  totalSessions: number;
  avgCostPerSession: number;
  costByProvider: Array<{
    provider: string;
    cost: number;
    sessions: number;
  }>;
  costByDay: Array<{
    date: string;
    cost: number;
    sessions: number;
  }>;
  savingsFromPatterns: {
    totalSaved: number;
    percentSaved: number;
    patternHits: number;
    aiDiscoveries: number;
  };
}

export interface PatternFilters {
  status?: string[];
  category?: string;
  isActive?: boolean;
  minConfidence?: number;
  minUsage?: number;
  search?: string;
}

export interface SessionFilters {
  status?: string[];
  provider?: string;
  dateFrom?: string;
  dateTo?: string;
  minCost?: number;
  maxCost?: number;
  search?: string;
}

class AIPatternService {
  // Pattern Management
  async listPatterns(filters?: PatternFilters): Promise<AIPattern[]> {
    return api.get<AIPattern[]>('/ai/patterns', { params: filters });
  }

  async getPattern(patternId: string): Promise<AIPattern> {
    return api.get<AIPattern>(`/ai/patterns/${patternId}`);
  }

  async createPattern(pattern: Partial<AIPattern>): Promise<AIPattern> {
    return api.post<AIPattern>('/ai/patterns', pattern);
  }

  async updatePattern(patternId: string, updates: Partial<AIPattern>): Promise<AIPattern> {
    return api.put<AIPattern>(`/ai/patterns/${patternId}`, updates);
  }

  async deletePattern(patternId: string): Promise<void> {
    return api.delete(`/ai/patterns/${patternId}`);
  }

  // Pattern Workflow
  async submitForReview(patternId: string, submittedBy: string, notes?: string): Promise<{
    success: boolean;
    validation: PatternValidationResult;
    error?: string;
  }> {
    return api.post(`/ai/patterns/${patternId}/submit`, { submittedBy, notes });
  }

  async approvePattern(patternId: string, approvedBy: string, notes?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return api.post(`/ai/patterns/${patternId}/approve`, { approvedBy, notes });
  }

  async rejectPattern(patternId: string, rejectedBy: string, reason: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return api.post(`/ai/patterns/${patternId}/reject`, { rejectedBy, reason });
  }

  async activatePattern(patternId: string, activatedBy: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return api.post(`/ai/patterns/${patternId}/activate`, { activatedBy });
  }

  async deactivatePattern(patternId: string, deactivatedBy: string, reason?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return api.post(`/ai/patterns/${patternId}/deactivate`, { deactivatedBy, reason });
  }

  // Pattern Validation
  async validatePattern(patternId: string): Promise<PatternValidationResult> {
    return api.post<PatternValidationResult>(`/ai/patterns/${patternId}/validate`);
  }

  // Discovery Sessions
  async listSessions(filters?: SessionFilters): Promise<AIDiscoverySession[]> {
    return api.get<AIDiscoverySession[]>('/ai/sessions', { params: filters });
  }

  async getSession(sessionId: string): Promise<AIDiscoverySession> {
    return api.get<AIDiscoverySession>(`/ai/sessions/${sessionId}`);
  }

  // Pattern Analysis
  async analyzeSession(sessionId: string): Promise<PatternAnalysisResult> {
    return api.post<PatternAnalysisResult>(`/ai/sessions/${sessionId}/analyze`);
  }

  async compileAndSubmitPatterns(): Promise<{
    compiled: number;
    submitted: number;
    errors: string[];
  }> {
    return api.post('/ai/patterns/compile');
  }

  // Pattern Usage Metrics
  async getPatternUsage(patternId: string, days?: number): Promise<PatternUsageMetrics[]> {
    return api.get<PatternUsageMetrics[]>(`/ai/patterns/${patternId}/usage`, {
      params: { days }
    });
  }

  // Cost Analytics
  async getCostAnalytics(dateFrom?: string, dateTo?: string): Promise<CostAnalytics> {
    return api.get<CostAnalytics>('/ai/analytics/cost', {
      params: { dateFrom, dateTo }
    });
  }

  async getSessionCostTrend(days: number = 30): Promise<Array<{
    date: string;
    cost: number;
    sessions: number;
    avgCost: number;
  }>> {
    return api.get('/ai/analytics/cost/trend', { params: { days } });
  }

  // Pattern Learning Statistics
  async getLearningStats(): Promise<{
    totalPatterns: number;
    activePatterns: number;
    pendingReview: number;
    autoApproved: number;
    manualApproved: number;
    totalSessions: number;
    avgConfidence: number;
  }> {
    return api.get('/ai/analytics/learning');
  }

  // Pattern Categories
  async getCategories(): Promise<string[]> {
    return api.get<string[]>('/ai/patterns/categories');
  }

  // Pattern History
  async getPatternHistory(patternId: string): Promise<Array<{
    timestamp: string;
    action: string;
    performedBy: string;
    notes?: string;
    oldStatus?: string;
    newStatus?: string;
  }>> {
    return api.get(`/ai/patterns/${patternId}/history`);
  }
}

export const aiPatternService = new AIPatternService();
