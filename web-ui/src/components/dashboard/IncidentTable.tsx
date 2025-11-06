import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Incident {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  affectedCI: string;
  assignedTeam?: string;
  createdAt: string;
  age?: number; // in hours
}

interface IncidentTableProps {
  incidents: Incident[];
  title?: string;
  description?: string;
  onIncidentClick?: (incident: Incident) => void;
  showFilters?: boolean;
}

const PRIORITY_COLORS = {
  P1: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  P2: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  P3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  P4: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  P5: 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300',
};

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300',
};

export const IncidentTable: React.FC<IncidentTableProps> = ({
  incidents,
  title = 'Open Incidents',
  description = 'Current incidents by priority',
  onIncidentClick,
  showFilters = false,
}) => {
  const [priorityFilter, setPriorityFilter] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);

  const filteredIncidents = incidents.filter((incident) => {
    if (priorityFilter && incident.priority !== priorityFilter) return false;
    if (statusFilter && incident.status !== statusFilter) return false;
    return true;
  });

  const getAgeDisplay = (createdAt: string) => {
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {showFilters && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <select
              className="px-3 py-1 border border-border rounded-md text-sm"
              value={priorityFilter || ''}
              onChange={(e) => setPriorityFilter(e.target.value || null)}
            >
              <option value="">All Priorities</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
              <option value="P5">P5</option>
            </select>
            <select
              className="px-3 py-1 border border-border rounded-md text-sm"
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || null)}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-sm font-semibold">Priority</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">Title</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">Affected CI</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">Status</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">Age</th>
                <th className="text-left py-3 px-2 text-sm font-semibold">Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No incidents found
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="border-b border-border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => onIncidentClick?.(incident)}
                  >
                    <td className="py-3 px-2">
                      <Badge className={PRIORITY_COLORS[incident.priority]}>
                        {incident.priority}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-red-500" />
                        <span className="text-sm font-medium">{incident.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm">{incident.affectedCI}</td>
                    <td className="py-3 px-2">
                      <Badge className={STATUS_COLORS[incident.status]} variant="outline">
                        {incident.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {getAgeDisplay(incident.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {incident.assignedTeam ? (
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3" />
                          {incident.assignedTeam}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
