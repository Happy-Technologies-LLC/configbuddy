import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type {
  ConfigurationItem,
  CIRelationship,
  DiscoveryJob,
  DiscoverySchedule,
  User,
  PaginatedResponse,
  FilterOptions,
  SortOptions,
  PaginationOptions,
} from '../types';
import { api } from '@services/api';

// Query Keys
export const queryKeys = {
  cis: {
    all: ['cis'] as const,
    list: (filters?: FilterOptions, sort?: SortOptions, pagination?: PaginationOptions) =>
      ['cis', 'list', filters, sort, pagination] as const,
    detail: (id: string) => ['cis', 'detail', id] as const,
    relationships: (id: string) => ['cis', 'relationships', id] as const,
    search: (query: string) => ['cis', 'search', query] as const,
  },
  discoveryJobs: {
    all: ['discoveryJobs'] as const,
    list: (pagination?: PaginationOptions) => ['discoveryJobs', 'list', pagination] as const,
    detail: (id: string) => ['discoveryJobs', 'detail', id] as const,
  },
  discoverySchedules: {
    all: ['discoverySchedules'] as const,
    list: () => ['discoverySchedules', 'list'] as const,
  },
  dashboard: {
    stats: () => ['dashboard', 'stats'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (pagination?: PaginationOptions) => ['users', 'list', pagination] as const,
    current: () => ['users', 'current'] as const,
  },
};

// Configuration Items Hooks
export const useConfigurationItems = (
  filters?: FilterOptions,
  sort?: SortOptions,
  pagination?: PaginationOptions,
  options?: UseQueryOptions<PaginatedResponse<ConfigurationItem>, AxiosError>
) => {
  return useQuery({
    queryKey: queryKeys.cis.list(filters, sort, pagination),
    queryFn: () => api.getCIs(filters, sort, pagination),
    ...options,
  });
};

export const useConfigurationItem = (
  ciId: string,
  options?: UseQueryOptions<ConfigurationItem, AxiosError>
) => {
  return useQuery({
    queryKey: queryKeys.cis.detail(ciId),
    queryFn: () => api.getCIById(ciId),
    enabled: !!ciId,
    ...options,
  });
};

export const useCreateCI = (
  options?: UseMutationOptions<ConfigurationItem, AxiosError, Partial<ConfigurationItem>>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ci: Partial<ConfigurationItem>) => api.createCI(ci),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cis.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    },
    ...options,
  });
};

export const useUpdateCI = (
  options?: UseMutationOptions<ConfigurationItem, AxiosError, { ciId: string; updates: Partial<ConfigurationItem> }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ciId, updates }) => api.updateCI(ciId, updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cis.detail(variables.ciId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cis.all });
    },
    ...options,
  });
};

export const useDeleteCI = (
  options?: UseMutationOptions<void, AxiosError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ciId: string) => api.deleteCI(ciId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cis.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    },
    ...options,
  });
};

export const useSearchCIs = (
  query: string,
  options?: UseQueryOptions<ConfigurationItem[], AxiosError>
) => {
  return useQuery({
    queryKey: queryKeys.cis.search(query),
    queryFn: () => api.searchCIs(query),
    enabled: query.length > 0,
    ...options,
  });
};

// Relationships Hooks
export const useCIRelationships = (
  ciId: string,
  options?: UseQueryOptions<CIRelationship[], AxiosError>
) => {
  return useQuery({
    queryKey: queryKeys.cis.relationships(ciId),
    queryFn: () => api.getCIRelationships(ciId),
    enabled: !!ciId,
    ...options,
  });
};

export const useCreateRelationship = (
  options?: UseMutationOptions<CIRelationship, AxiosError, Partial<CIRelationship>>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (relationship: Partial<CIRelationship>) => api.createRelationship(relationship),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cis.relationships(data.from_ci_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cis.relationships(data.to_ci_id) });
    },
    ...options,
  });
};

export const useDeleteRelationship = (
  options?: UseMutationOptions<void, AxiosError, { relationshipId: string; fromCiId: string; toCiId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ relationshipId }) => api.deleteRelationship(relationshipId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cis.relationships(variables.fromCiId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cis.relationships(variables.toCiId) });
    },
    ...options,
  });
};

// Discovery Jobs Hooks
export const useDiscoveryJobs = (
  pagination?: PaginationOptions,
  options?: UseQueryOptions<PaginatedResponse<DiscoveryJob>, AxiosError>
) => {
  return useQuery({
    queryKey: queryKeys.discoveryJobs.list(pagination),
    queryFn: () => api.getDiscoveryJobs(pagination),
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
    ...options,
  });
};

export const useDiscoveryJob = (
  jobId: string,
  options?: UseQueryOptions<DiscoveryJob, AxiosError>
) => {
  return useQuery({
    queryKey: queryKeys.discoveryJobs.detail(jobId),
    queryFn: () => api.getDiscoveryJobById(jobId),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      return job?.status === 'running' || job?.status === 'pending' ? 2000 : false;
    },
    ...options,
  });
};

export const useTriggerDiscovery = (
  options?: UseMutationOptions<DiscoveryJob, AxiosError, { provider: string; config?: Record<string, unknown> }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, config }) => api.triggerDiscovery(provider, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.discoveryJobs.all });
    },
    ...options,
  });
};

// Discovery Schedules Hooks
export const useDiscoverySchedules = (
  options?: UseQueryOptions<DiscoverySchedule[], AxiosError>
) => {
  return useQuery({
    queryKey: queryKeys.discoverySchedules.list(),
    queryFn: () => api.getDiscoverySchedules(),
    ...options,
  });
};

export const useCreateDiscoverySchedule = (
  options?: UseMutationOptions<DiscoverySchedule, AxiosError, Partial<DiscoverySchedule>>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (schedule: Partial<DiscoverySchedule>) => api.createDiscoverySchedule(schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.discoverySchedules.all });
    },
    ...options,
  });
};

export const useUpdateDiscoverySchedule = (
  options?: UseMutationOptions<DiscoverySchedule, AxiosError, { scheduleId: string; updates: Partial<DiscoverySchedule> }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, updates }) => api.updateDiscoverySchedule(scheduleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.discoverySchedules.all });
    },
    ...options,
  });
};

export const useDeleteDiscoverySchedule = (
  options?: UseMutationOptions<void, AxiosError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) => api.deleteDiscoverySchedule(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.discoverySchedules.all });
    },
    ...options,
  });
};

// Dashboard Hooks
export const useDashboardStats = (
  options?: UseQueryOptions<any, AxiosError>
) => {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => api.getDashboardStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
    ...options,
  });
};

// Users Hooks (Admin)
export const useUsers = (
  pagination?: PaginationOptions,
  options?: UseQueryOptions<PaginatedResponse<User>, AxiosError>
) => {
  return useQuery({
    queryKey: queryKeys.users.list(pagination),
    queryFn: () => api.getUsers(pagination),
    ...options,
  });
};

export const useCreateUser = (
  options?: UseMutationOptions<User, AxiosError, Partial<User>>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (user: Partial<User>) => api.createUser(user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    ...options,
  });
};

export const useUpdateUser = (
  options?: UseMutationOptions<User, AxiosError, { userId: string; updates: Partial<User> }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }) => api.updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    ...options,
  });
};

export const useDeleteUser = (
  options?: UseMutationOptions<void, AxiosError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => api.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    ...options,
  });
};
