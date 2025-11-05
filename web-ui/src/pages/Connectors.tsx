import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { Button } from '@/components/ui/button';
import { Info, ArrowRight, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ConnectorDashboard from '../components/connectors/ConnectorDashboard';
import ConnectorDefinitionList from '../components/connectors/ConnectorDefinitionList';
import ConnectorJobList from '../components/connectors/ConnectorJobList';

export const Connectors: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tabValue, setTabValue] = useState('dashboard');
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['dashboard', 'definitions', 'jobs'].includes(tab)) {
      setTabValue(tab);
    }
  }, [searchParams]);

  const handleTabChange = (newValue: string) => {
    setTabValue(newValue);
    setSearchParams({ tab: newValue });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Integration Connectors</h2>
          <p className="text-muted-foreground mt-1">
            Deploy bi-directional integrations with ITSM, ticketing, and monitoring systems
          </p>
        </div>
        <button
          onClick={() => setShowHelpDialog(true)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title="Help"
        >
          <HelpCircle className="h-6 w-6 text-muted-foreground" />
        </button>
      </div>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Looking for Cloud Infrastructure Discovery?</DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>
                For discovering CIs from AWS, Azure, GCP, Kubernetes, SSH, and network devices, use the
                <strong> Discovery </strong> feature instead.
              </p>
              <p>
                Connectors are for bi-directional synchronization with external ITSM and monitoring platforms
                like ServiceNow, Jira, Datadog, and Splunk.
              </p>
              <Button
                onClick={() => {
                  setShowHelpDialog(false);
                  navigate('/discovery');
                }}
                size="sm"
                className="mt-4"
              >
                Go to Discovery
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Tabs value={tabValue} onValueChange={handleTabChange} className="w-full">
        <LiquidGlass size="sm" rounded="xl" className="mb-6 overflow-hidden">
          <TabsList className="w-full grid grid-cols-3 bg-transparent">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="definitions">Definitions</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
          </TabsList>
        </LiquidGlass>

        <TabsContent value="dashboard" className="mt-0">
          <ConnectorDashboard key={`dashboard-${tabValue}`} />
        </TabsContent>

        <TabsContent value="definitions" className="mt-0">
          <ConnectorDefinitionList key={`definitions-${tabValue}`} />
        </TabsContent>

        <TabsContent value="jobs" className="mt-0">
          <ConnectorJobList key={`jobs-${tabValue}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Connectors;
