import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CIList from '../components/ci/CIList';

/**
 * CIList Page
 * Displays the list of Configuration Items with search and filter capabilities
 * Supports URL query parameters: ?type=server&status=active&environment=production
 */
export const CIListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleView = (ci: any) => {
    navigate(`/cis/${ci.id}`);
  };

  // Extract filter values from URL query parameters
  const initialType = searchParams.get('type') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialEnvironment = searchParams.get('environment') || '';
  const initialSearch = searchParams.get('search') || '';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Configuration Items
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and manage all configuration items in your CMDB
          </p>
        </div>
        <Button onClick={() => navigate('/inventory')}>
          <Plus className="mr-2 h-4 w-4" />
          Manage CIs
        </Button>
      </div>

      <CIList
        onView={handleView}
        showActions={false}
        initialTypeFilter={initialType as any}
        initialStatusFilter={initialStatus as any}
        initialEnvironmentFilter={initialEnvironment as any}
        initialSearch={initialSearch}
      />
    </div>
  );
};

export default CIListPage;
