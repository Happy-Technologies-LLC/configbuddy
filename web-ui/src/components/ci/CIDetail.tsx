// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Pencil,
  Trash2,
  ArrowLeft,
  Tag,
  Calendar,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCI } from '../../hooks/useCIs';
import { useCIRelationships, useImpactAnalysis } from '../../hooks/useCIRelationships';
import CIStatusBadge from './CIStatusBadge';
import CITypeBadge from './CITypeBadge';
import DependencyGraph from '../visualization/DependencyGraph';
import DriftTrackingPanel from '../drift/DriftTrackingPanel';
import AuditHistory from './AuditHistory';
import { cn } from '../../utils/cn';
import { LiquidGlass } from '../ui/liquid-glass';
import JSONViewer from '../ui/JSONViewer';
import '../ui/JSONViewer.css';

interface CIDetailProps {
  ciId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
}

export const CIDetail: React.FC<CIDetailProps> = ({
  ciId,
  onEdit,
  onDelete,
  onBack,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [relationshipDepth, setRelationshipDepth] = useState(1);

  const { data: ci, isLoading, error } = useCI(ciId);
  const { data: relationships, isLoading: relationshipsLoading } = useCIRelationships(
    ciId,
    true,  // Always load for stats
    relationshipDepth
  );
  const { data: impactAnalysis, isLoading: impactLoading } = useImpactAnalysis(
    ciId,
    true  // Always load for stats
  );

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/inventory');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !ci) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
        Failed to load configuration item details. {error?.message}
      </div>
    );
  }

  const tabs = ['Overview', 'Relationships', 'Configuration Drift', 'History'];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <LiquidGlass size="md" rounded="xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Back to list"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-2xl font-semibold text-foreground">{ci.name}</h1>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-5 h-5 text-primary" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-5 h-5 text-destructive" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <CITypeBadge type={ci.type} />
          <CIStatusBadge status={ci.status} />
          <span className="inline-block px-3 py-1 text-sm border border-input rounded-full capitalize">
            {ci.environment}
          </span>
        </div>

        {ci.description && (
          <p className="text-foreground mb-6">{ci.description}</p>
        )}

        <hr className="my-6 border-border/30" />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm text-foreground">{formatDate(ci.created_at)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm text-foreground">{formatDate(ci.updated_at)}</p>
            </div>
          </div>

          {ci.discovered_by && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Discovered By</p>
                <p className="text-sm text-foreground">{ci.discovered_by}</p>
              </div>
            </div>
          )}

          {ci.confidence_score !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Confidence Score</p>
              <p className="text-sm text-foreground">
                {(ci.confidence_score * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {ci.tags && ci.tags.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Tags</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ci.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-muted text-foreground rounded text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {ci.attributes && Object.keys(ci.attributes).length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Attributes</h3>
            <div className="bg-muted/30 border border-border/30 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(ci.attributes).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground mb-1">{key}</p>
                    <p className="text-sm text-foreground">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </LiquidGlass>

      {/* Tabs Section */}
      <LiquidGlass size="sm" rounded="xl" className="overflow-hidden">
        <div className="border-b border-border/50">
          <nav className="flex -mb-px">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => setActiveTab(index)}
                className={cn(
                  'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === index
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-input'
                )}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 0 && (
            <div className="space-y-6">
              {/* Metadata Section */}
              {ci.metadata && Object.keys(ci.metadata).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Metadata</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(ci.metadata)
                      .sort(([, a], [, b]) => {
                        // Sort: simple values first, complex values last
                        const aIsComplex = typeof a === 'object' && a !== null;
                        const bIsComplex = typeof b === 'object' && b !== null;
                        if (aIsComplex === bIsComplex) return 0;
                        return aIsComplex ? 1 : -1;
                      })
                      .map(([key, value]) => {
                        const isComplexValue = typeof value === 'object' && value !== null;

                        return (
                          <div
                            key={key}
                            className={`bg-muted/30 border border-border/30 rounded-lg p-4 ${
                              isComplexValue ? 'md:col-span-2 lg:col-span-3' : ''
                            }`}
                          >
                            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                              {key.replace(/_/g, ' ')}
                            </p>
                            {isComplexValue ? (
                              <JSONViewer data={value} collapsed={1} />
                            ) : (
                              <p className="text-sm text-foreground font-medium">
                                {String(value)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Relationships</p>
                    <p className="text-2xl font-bold text-primary">{relationships?.length || 0}</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Potential Impact</p>
                    <p className="text-2xl font-bold text-primary">
                      {impactAnalysis ? (impactAnalysis.upstream.length + impactAnalysis.downstream.length) : 0}
                    </p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Confidence Score</p>
                    <p className="text-2xl font-bold text-primary">
                      {ci.confidence_score ? `${(ci.confidence_score * 100).toFixed(0)}%` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Attributes */}
              {ci.attributes && Object.keys(ci.attributes).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Additional Attributes</h3>
                  <div className="bg-muted/30 border border-border/30 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(ci.attributes).map(([key, value]) => (
                        <div key={key} className="border-l-2 border-primary/50 pl-3">
                          <p className="text-xs text-muted-foreground mb-1">{key}</p>
                          <p className="text-sm text-foreground">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 1 && (
            <div>
              {relationshipsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : relationships && relationships.length > 0 ? (
                <DependencyGraph
                  ciId={ciId}
                  relationships={relationships}
                  depth={relationshipDepth}
                  onDepthChange={setRelationshipDepth}
                />
              ) : (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-primary">
                  No relationships found for this CI.
                </div>
              )}
            </div>
          )}

          {activeTab === 2 && (
            <DriftTrackingPanel ciId={ciId} ciName={ci.name} />
          )}

          {activeTab === 3 && <AuditHistory ciId={ciId} />}
        </div>
      </LiquidGlass>
    </div>
  );
};

export default CIDetail;
