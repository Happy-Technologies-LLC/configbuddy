import React, { useState } from 'react';
import {
  Search,
  Pencil,
  Trash2,
  Eye,
  Filter,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCIs } from '../../hooks/useCIs';
import { CI, CIType, CIStatus, Environment } from '../../services/ci.service';
import CIStatusBadge from './CIStatusBadge';
import CITypeBadge from './CITypeBadge';
import { cn } from '../../utils/cn';
import { LiquidGlass } from '../ui/liquid-glass';

interface CIListProps {
  onEdit?: (ci: CI) => void;
  onDelete?: (ci: CI) => void;
  onView?: (ci: CI) => void;
  showActions?: boolean;
  initialTypeFilter?: CIType | '';
  initialStatusFilter?: CIStatus | '';
  initialEnvironmentFilter?: Environment | '';
  initialSearch?: string;
}

const CI_TYPES: CIType[] = [
  'server',
  'virtual-machine',
  'container',
  'application',
  'service',
  'database',
  'network-device',
  'storage',
  'load-balancer',
  'cloud-resource',
];

const CI_STATUSES: CIStatus[] = ['active', 'inactive', 'maintenance', 'decommissioned'];

const ENVIRONMENTS: Environment[] = ['production', 'staging', 'development', 'test'];

export const CIList: React.FC<CIListProps> = ({
  onEdit,
  onDelete,
  onView,
  showActions = true,
  initialTypeFilter = '',
  initialStatusFilter = '',
  initialEnvironmentFilter = '',
  initialSearch = '',
}) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<CIType | ''>(initialTypeFilter);
  const [statusFilter, setStatusFilter] = useState<CIStatus | ''>(initialStatusFilter);
  const [environmentFilter, setEnvironmentFilter] = useState<Environment | ''>(initialEnvironmentFilter);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Update URL when filters change
  const updateURLFilters = (type: string, status: string, environment: string, searchTerm: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (environment) params.set('environment', environment);
    if (searchTerm) params.set('search', searchTerm);

    const queryString = params.toString();
    navigate(`?${queryString}`, { replace: true });
  };

  const { data, isLoading, error } = useCIs({
    page: page + 1,
    limit: rowsPerPage,
    search: search || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    environment: environmentFilter || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  const handleSort = (column: string) => {
    const isAsc = sortBy === column && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(column);
  };

  const handleView = (ci: CI) => {
    if (onView) {
      onView(ci);
    } else {
      navigate(`/inventory/${ci.id}`);
    }
  };

  const handleEdit = (ci: CI, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(ci);
    }
  };

  const handleDelete = (ci: CI, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(ci);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatLabel = (value: string) => {
    return value
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Error loading CIs: {error.message}</p>
      </div>
    );
  }

  return (
    <LiquidGlass size="sm" rounded="xl" className="overflow-hidden">
      {/* Filters */}
      <div className="p-4 flex flex-wrap gap-3 items-center border-b border-border/50">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search CIs..."
            value={search}
            onChange={(e) => {
              const newSearch = e.target.value;
              setSearch(newSearch);
              updateURLFilters(typeFilter, statusFilter, environmentFilter, newSearch);
            }}
            className="w-full pl-10 pr-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="relative min-w-[150px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={typeFilter}
            onChange={(e) => {
              const newType = e.target.value as CIType | '';
              setTypeFilter(newType);
              updateURLFilters(newType, statusFilter, environmentFilter, search);
            }}
            className="w-full pl-10 pr-8 py-2 border border-input rounded-md text-sm appearance-none bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Types</option>
            {CI_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatLabel(type)}
              </option>
            ))}
          </select>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            const newStatus = e.target.value as CIStatus | '';
            setStatusFilter(newStatus);
            updateURLFilters(typeFilter, newStatus, environmentFilter, search);
          }}
          className="min-w-[150px] px-3 py-2 border border-input rounded-md text-sm appearance-none bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          {CI_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatLabel(status)}
            </option>
          ))}
        </select>

        <select
          value={environmentFilter}
          onChange={(e) => {
            const newEnvironment = e.target.value as Environment | '';
            setEnvironmentFilter(newEnvironment);
            updateURLFilters(typeFilter, statusFilter, newEnvironment, search);
          }}
          className="min-w-[150px] px-3 py-2 border border-input rounded-md text-sm appearance-none bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Environments</option>
          {ENVIRONMENTS.map((env) => (
            <option key={env} value={env}>
              {formatLabel(env)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30 border-b border-border/50">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground"
                >
                  Name
                  {sortBy === 'name' && (
                    sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Environment
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('updated_at')}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground"
                >
                  Last Updated
                  {sortBy === 'updated_at' && (
                    sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                  )}
                </button>
              </th>
              {showActions && (
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {isLoading ? (
              <tr>
                <td colSpan={showActions ? 7 : 6} className="px-4 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 7 : 6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No configuration items found
                </td>
              </tr>
            ) : (
              data?.data.map((ci) => (
                <tr
                  key={ci.id}
                  onClick={() => handleView(ci)}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-foreground">{ci.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <CITypeBadge type={ci.type} />
                  </td>
                  <td className="px-4 py-3">
                    <CIStatusBadge status={ci.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground capitalize">{ci.environment}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
                      {ci.description || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">{formatDate(ci.updated_at)}</span>
                  </td>
                  {showActions && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleView(ci)}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {onEdit && (
                          <button
                            onClick={(e) => handleEdit(ci, e)}
                            className="p-1.5 hover:bg-primary/10 rounded transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4 text-primary" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => handleDelete(ci, e)}
                            className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            className="px-2 py-1 border border-input rounded text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {[5, 10, 25, 50].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">
            {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, data?.total || 0)} of{' '}
            {data?.total || 0}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 border border-input rounded text-sm bg-background text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!data || (page + 1) * rowsPerPage >= data.total}
              className="px-3 py-1 border border-input rounded text-sm bg-background text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </LiquidGlass>
  );
};

export default CIList;
