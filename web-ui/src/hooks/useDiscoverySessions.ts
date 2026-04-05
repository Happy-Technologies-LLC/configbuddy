// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useCallback, useRef } from 'react';
import { aiPatternService, AIDiscoverySession, SessionFilters, CostAnalytics, PatternAnalysisResult } from '../services/ai-pattern.service';
import { useToast } from '../contexts/ToastContext';

export interface UseDiscoverySessionsReturn {
  sessions: AIDiscoverySession[];
  loading: boolean;
  error: string | null;
  loadSessions: (filters?: SessionFilters) => Promise<void>;
  getSession: (sessionId: string) => Promise<AIDiscoverySession | null>;
  analyzeSession: (sessionId: string) => Promise<PatternAnalysisResult | null>;
  compileAndSubmitPatterns: () => Promise<{ compiled: number; submitted: number; errors: string[] } | null>;
  costAnalytics: CostAnalytics | null;
  loadCostAnalytics: (dateFrom?: string, dateTo?: string) => Promise<void>;
  learningStats: {
    totalPatterns: number;
    activePatterns: number;
    pendingReview: number;
    autoApproved: number;
    manualApproved: number;
    totalSessions: number;
    avgConfidence: number;
  } | null;
  loadLearningStats: () => Promise<void>;
}

export const useDiscoverySessions = (): UseDiscoverySessionsReturn => {
  const [sessions, setSessions] = useState<AIDiscoverySession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [costAnalytics, setCostAnalytics] = useState<CostAnalytics | null>(null);
  const [learningStats, setLearningStats] = useState<{
    totalPatterns: number;
    activePatterns: number;
    pendingReview: number;
    autoApproved: number;
    manualApproved: number;
    totalSessions: number;
    avgConfidence: number;
  } | null>(null);
  const { showToast } = useToast();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSessions = useCallback(async (filters?: SessionFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiPatternService.listSessions(filters);
      if (mountedRef.current) {
        setSessions(data);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load sessions';
      if (mountedRef.current) {
        setError(errorMsg);
      }
      showToast(errorMsg, 'error');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [showToast]);

  const getSession = useCallback(async (sessionId: string): Promise<AIDiscoverySession | null> => {
    try {
      const session = await aiPatternService.getSession(sessionId);
      return session;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load session';
      showToast(errorMsg, 'error');
      return null;
    }
  }, [showToast]);

  const analyzeSession = useCallback(async (sessionId: string): Promise<PatternAnalysisResult | null> => {
    try {
      const result = await aiPatternService.analyzeSession(sessionId);
      if (result.isPattern) {
        showToast('Pattern detected in session!', 'success');
      } else {
        showToast('No pattern detected in this session', 'info');
      }
      return result;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to analyze session';
      showToast(errorMsg, 'error');
      return null;
    }
  }, [showToast]);

  const compileAndSubmitPatterns = useCallback(async (): Promise<{
    compiled: number;
    submitted: number;
    errors: string[];
  } | null> => {
    try {
      const result = await aiPatternService.compileAndSubmitPatterns();
      if (result.compiled > 0) {
        showToast(`Compiled ${result.compiled} patterns, submitted ${result.submitted} for review`, 'success');
      } else {
        showToast('No new patterns found to compile', 'info');
      }
      return result;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to compile patterns';
      showToast(errorMsg, 'error');
      return null;
    }
  }, [showToast]);

  const loadCostAnalytics = useCallback(async (dateFrom?: string, dateTo?: string) => {
    try {
      const data = await aiPatternService.getCostAnalytics(dateFrom, dateTo);
      if (mountedRef.current) {
        setCostAnalytics(data);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load cost analytics';
      showToast(errorMsg, 'error');
    }
  }, [showToast]);

  const loadLearningStats = useCallback(async () => {
    try {
      const data = await aiPatternService.getLearningStats();
      if (mountedRef.current) {
        setLearningStats(data);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load learning stats';
      showToast(errorMsg, 'error');
    }
  }, [showToast]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    loadCostAnalytics();
    loadLearningStats();
  }, [loadSessions, loadCostAnalytics, loadLearningStats]);

  return {
    sessions,
    loading,
    error,
    loadSessions,
    getSession,
    analyzeSession,
    compileAndSubmitPatterns,
    costAnalytics,
    loadCostAnalytics,
    learningStats,
    loadLearningStats,
  };
};
