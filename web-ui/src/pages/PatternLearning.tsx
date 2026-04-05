// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { ParticleBackground } from '@/components/ui/particle-background';
import { Button } from '@/components/ui/button';
import { HelpCircle, RefreshCw } from 'lucide-react';
import { PatternLibrary } from '@/components/ai/PatternLibrary';
import { DiscoverySessionsView } from '@/components/ai/DiscoverySessionsView';
import { CostAnalyticsDashboard } from '@/components/ai/CostAnalyticsDashboard';
import { PatternLearningOverview } from '@/components/ai/PatternLearningOverview';
import { useDiscoverySessions } from '@/hooks/useDiscoverySessions';

const PatternLearning: React.FC = () => {
  const [tabValue, setTabValue] = useState('overview');
  const { compileAndSubmitPatterns } = useDiscoverySessions();
  const [compiling, setCompiling] = useState(false);

  const handleCompilePatterns = async () => {
    setCompiling(true);
    try {
      await compileAndSubmitPatterns();
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <ParticleBackground opacity={0.15} />

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">AI Pattern Learning</h2>
            <p className="text-muted-foreground mt-1">
              Automatically learn and compile patterns from AI discoveries
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCompilePatterns}
              disabled={compiling}
            >
              {compiling ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Compile Patterns
            </Button>
            <Button variant="ghost" size="sm">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tabValue} onValueChange={setTabValue} className="space-y-6">
          <LiquidGlass size="sm" rounded="xl">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="patterns">Pattern Library</TabsTrigger>
              <TabsTrigger value="sessions">Discovery Sessions</TabsTrigger>
              <TabsTrigger value="analytics">Cost Analytics</TabsTrigger>
            </TabsList>
          </LiquidGlass>

          <TabsContent value="overview" className="space-y-6">
            <PatternLearningOverview />
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            <PatternLibrary />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <DiscoverySessionsView />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <CostAnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PatternLearning;
