/**
 * useDiscoveryDefinitions Hook
 * Custom hook for managing discovery definitions with CRUD operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  discoveryService,
  DiscoveryDefinition,
  DiscoveryDefinitionInput,
  DefinitionFilters,
} from '../services/discovery.service';
import { useToast } from '../contexts/ToastContext';

export interface UseDiscoveryDefinitionsReturn {
  definitions: DiscoveryDefinition[];
  loading: boolean;
  error: string | null;
  filters: DefinitionFilters;

  // Actions
  loadDefinitions: () => Promise<void>;
  createDefinition: (data: DiscoveryDefinitionInput) => Promise<void>;
  updateDefinition: (id: string, updates: Partial<DiscoveryDefinitionInput>) => Promise<void>;
  deleteDefinition: (id: string) => Promise<void>;
  runDefinition: (id: string) => Promise<string>;
  enableSchedule: (id: string) => Promise<void>;
  disableSchedule: (id: string) => Promise<void>;
  setFilters: (filters: DefinitionFilters) => void;
}

export const useDiscoveryDefinitions = (
  initialFilters: DefinitionFilters = {}
): UseDiscoveryDefinitionsReturn => {
  const [definitions, setDefinitions] = useState<DiscoveryDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<DefinitionFilters>(initialFilters);

  const { showToast } = useToast();
  const mountedRef = useRef(true);

  /**
   * Load all definitions with current filters
   */
  const loadDefinitions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await discoveryService.listDefinitions(filters);

      if (mountedRef.current) {
        setDefinitions(data);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load discovery definitions';
      if (mountedRef.current) {
        setError(errorMsg);
        showToast(errorMsg, 'error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [filters, showToast]);

  /**
   * Create a new discovery definition
   */
  const createDefinition = useCallback(
    async (data: DiscoveryDefinitionInput) => {
      try {
        const newDefinition = await discoveryService.createDefinition(data);

        if (mountedRef.current) {
          setDefinitions((prev) => [...prev, newDefinition]);
          showToast(`Discovery definition "${data.name}" created successfully`, 'success');
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to create discovery definition';
        showToast(errorMsg, 'error');
        throw err;
      }
    },
    [showToast]
  );

  /**
   * Update an existing discovery definition
   */
  const updateDefinition = useCallback(
    async (id: string, updates: Partial<DiscoveryDefinitionInput>) => {
      try {
        const updatedDefinition = await discoveryService.updateDefinition(id, updates);

        if (mountedRef.current) {
          setDefinitions((prev) =>
            prev.map((def) => (def.id === id ? updatedDefinition : def))
          );
          showToast('Discovery definition updated successfully', 'success');
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to update discovery definition';
        showToast(errorMsg, 'error');
        throw err;
      }
    },
    [showToast]
  );

  /**
   * Delete a discovery definition
   */
  const deleteDefinition = useCallback(
    async (id: string) => {
      try {
        await discoveryService.deleteDefinition(id);

        if (mountedRef.current) {
          setDefinitions((prev) => prev.filter((def) => def.id !== id));
          showToast('Discovery definition deleted successfully', 'success');
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to delete discovery definition';
        showToast(errorMsg, 'error');
        throw err;
      }
    },
    [showToast]
  );

  /**
   * Run a discovery definition (triggers a job)
   */
  const runDefinition = useCallback(
    async (id: string): Promise<string> => {
      try {
        const jobId = await discoveryService.runDefinition(id);
        showToast('Discovery job started successfully', 'success');

        // Refresh definitions to update lastRunAt
        await loadDefinitions();

        return jobId;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to run discovery definition';
        showToast(errorMsg, 'error');
        throw err;
      }
    },
    [showToast, loadDefinitions]
  );

  /**
   * Enable schedule for a discovery definition
   */
  const enableSchedule = useCallback(
    async (id: string) => {
      try {
        await discoveryService.enableSchedule(id);

        if (mountedRef.current) {
          setDefinitions((prev) =>
            prev.map((def) =>
              def.id === id
                ? { ...def, schedule: { ...def.schedule, enabled: true } }
                : def
            )
          );
          showToast('Discovery schedule enabled', 'success');
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to enable schedule';
        showToast(errorMsg, 'error');
        throw err;
      }
    },
    [showToast]
  );

  /**
   * Disable schedule for a discovery definition
   */
  const disableSchedule = useCallback(
    async (id: string) => {
      try {
        await discoveryService.disableSchedule(id);

        if (mountedRef.current) {
          setDefinitions((prev) =>
            prev.map((def) =>
              def.id === id
                ? { ...def, schedule: { ...def.schedule, enabled: false } }
                : def
            )
          );
          showToast('Discovery schedule disabled', 'success');
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to disable schedule';
        showToast(errorMsg, 'error');
        throw err;
      }
    },
    [showToast]
  );

  /**
   * Update filters
   */
  const setFilters = useCallback((newFilters: DefinitionFilters) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Load definitions when filters change
   */
  useEffect(() => {
    loadDefinitions();
  }, [loadDefinitions]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    definitions,
    loading,
    error,
    filters,
    loadDefinitions,
    createDefinition,
    updateDefinition,
    deleteDefinition,
    runDefinition,
    enableSchedule,
    disableSchedule,
    setFilters,
  };
};

export default useDiscoveryDefinitions;
