// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Analytics Page
 * Main analytics page with tabbed interface for different analytics views
 */

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Network,
  GitBranch,
  Search,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { InventoryStats } from '../components/analytics/InventoryStats';
import { ChangeTimeline } from '../components/analytics/ChangeTimeline';
import { HealthMetrics } from '../components/analytics/HealthMetrics';
import { TopConnectedCIs } from '../components/analytics/TopConnectedCIs';
import { RelationshipMatrix } from '../components/analytics/RelationshipMatrix';
import { DiscoveryStats } from '../components/analytics/DiscoveryStats';
import { DateRangeSelector } from '../components/analytics/DateRangeSelector';

export const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [dateRange, setDateRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});

  const handleDateRangeChange = (dateRange: { startDate?: string; endDate?: string }) => {
    setDateRange(dateRange);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Analytics & Reporting
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive insights into your CMDB configuration items
            </p>
          </div>
          <DateRangeSelector onChange={handleDateRangeChange} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <Card className="mb-6">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="inventory" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="changes" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Changes
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-2">
              <Activity className="h-4 w-4" />
              Health
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-2">
              <Network className="h-4 w-4" />
              Connections
            </TabsTrigger>
            <TabsTrigger value="relationships" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Relationships
            </TabsTrigger>
            <TabsTrigger value="discovery" className="gap-2">
              <Search className="h-4 w-4" />
              Discovery
            </TabsTrigger>
          </TabsList>
        </Card>

        <TabsContent value="inventory" className="mt-0">
          <InventoryStats />
        </TabsContent>

        <TabsContent value="changes" className="mt-0">
          <ChangeTimeline dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="health" className="mt-0">
          <HealthMetrics dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="connections" className="mt-0">
          <TopConnectedCIs />
        </TabsContent>

        <TabsContent value="relationships" className="mt-0">
          <RelationshipMatrix />
        </TabsContent>

        <TabsContent value="discovery" className="mt-0">
          <DiscoveryStats dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
