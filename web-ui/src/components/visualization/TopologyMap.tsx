import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Focus, Download, RefreshCw } from 'lucide-react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import { useCIs } from '../../hooks/useCIs';
import { Environment } from '../../services/ci.service';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface TopologyMapProps {
  environment?: Environment;
  height?: number;
}

export const TopologyMap: React.FC<TopologyMapProps> = ({
  environment,
  height = 700,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | ''>(
    environment || ''
  );

  const { data: cisData, isLoading, refetch } = useCIs({
    environment: selectedEnvironment || undefined,
    limit: 500,
  });

  useEffect(() => {
    if (!containerRef.current || !cisData?.data.length) return;

    const elements: ElementDefinition[] = [];
    const environmentGroups = new Map<Environment, string[]>();

    cisData.data.forEach((ci) => {
      elements.push({
        data: {
          id: ci.id,
          label: ci.name,
          type: ci.type,
          status: ci.status,
          environment: ci.environment,
        },
      });

      if (!environmentGroups.has(ci.environment)) {
        environmentGroups.set(ci.environment, []);
      }
      environmentGroups.get(ci.environment)?.push(ci.id);
    });

    const environmentColors: Record<Environment, string> = {
      production: '#d32f2f',
      staging: '#f57c00',
      development: '#388e3c',
      test: '#1976d2',
    };

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => {
              const env = ele.data('environment');
              return environmentColors[env as Environment] || '#757575';
            },
            'border-width': 2,
            'border-color': (ele) => {
              const status = ele.data('status');
              if (status === 'active') return '#4caf50';
              if (status === 'inactive') return '#9e9e9e';
              if (status === 'maintenance') return '#ff9800';
              return '#f44336';
            },
            label: 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            color: '#333',
            'font-size': 9,
            'text-margin-y': 5,
            width: (ele: any) => {
              const type = ele.data('type');
              if (type === 'server' || type === 'database') return 50;
              if (type === 'container' || type === 'service') return 30;
              return 40;
            },
            height: (ele) => {
              const type = ele.data('type');
              if (type === 'server' || type === 'database') return 50;
              if (type === 'container' || type === 'service') return 30;
              return 40;
            },
            shape: (ele) => {
              const type = ele.data('type');
              if (type === 'server') return 'rectangle';
              if (type === 'database') return 'barrel';
              if (type === 'network-device') return 'diamond';
              if (type === 'load-balancer') return 'hexagon';
              return 'ellipse';
            },
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#ffc107',
          },
        },
      ],
      layout: {
        name: 'grid',
        padding: 50,
        spacingFactor: 1.5,
        avoidOverlap: true,
        condense: true,
      },
      minZoom: 0.2,
      maxZoom: 4,
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const data = node.data();
      console.log('Node clicked:', data);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [cisData]);

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleCenter = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  };

  const handleDownload = () => {
    if (cyRef.current) {
      const png = cyRef.current.png({ scale: 2, bg: '#fff' });
      const link = document.createElement('a');
      link.href = png;
      link.download = 'topology-map.png';
      link.click();
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Network Topology Map</h2>
        <div className="flex gap-2 items-center">
          <Select
            value={selectedEnvironment}
            onValueChange={(value) => setSelectedEnvironment(value as Environment | '')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Environments</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="test">Test</SelectItem>
            </SelectContent>
          </Select>

          <Button size="icon" variant="outline" onClick={handleRefresh} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="outline" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="outline" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="outline" onClick={handleCenter} title="Center">
            <Focus className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="outline" onClick={handleDownload} title="Download as PNG">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="flex items-center justify-center p-12" style={{ height }}>
          <p className="text-muted-foreground">Loading topology...</p>
        </Card>
      ) : !cisData?.data.length ? (
        <Card className="flex items-center justify-center p-12" style={{ height }}>
          <p className="text-muted-foreground">No configuration items found</p>
        </Card>
      ) : (
        <div
          ref={containerRef}
          className="border rounded-lg bg-white"
          style={{ height, width: '100%' }}
        />
      )}

      <div className="mt-4 flex gap-4 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">Environments:</span>
        <Badge className="bg-red-700 hover:bg-red-800">Production</Badge>
        <Badge className="bg-orange-600 hover:bg-orange-700">Staging</Badge>
        <Badge className="bg-green-700 hover:bg-green-800">Development</Badge>
        <Badge className="bg-blue-600 hover:bg-blue-700">Test</Badge>
      </div>

      <div className="mt-2 flex gap-4 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">Status:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500/100" />
          <span className="text-xs">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-xs">Maintenance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-xs">Inactive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive/100" />
          <span className="text-xs">Decommissioned</span>
        </div>
      </div>

      {cisData && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">
            Showing {cisData.data.length} of {cisData.total} configuration items
          </p>
        </div>
      )}
    </div>
  );
};

export default TopologyMap;
