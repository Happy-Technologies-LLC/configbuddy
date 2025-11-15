import React, { useState } from 'react';
import {
  Search,
  Filter,
  Grid3x3,
  List,
  Star,
  Clock,
  Users,
  DollarSign,
  Shield,
  Zap,
  Database,
  Cloud,
  Code,
  Lock,
} from 'lucide-react';
import { LiquidGlass } from '../components/ui/liquid-glass';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { ServiceMap } from '../components/visualization/ServiceMap';

interface Service {
  id: string;
  name: string;
  description: string;
  category: 'infrastructure' | 'platform' | 'application' | 'security' | 'data';
  tier: number;
  status: 'available' | 'coming-soon' | 'deprecated';
  rating: number;
  users: number;
  avgProvisionTime: number; // in hours
  monthlyCost: number;
  features: string[];
  icon: string;
  popular: boolean;
}

const mockServices: Service[] = [
  {
    id: '1',
    name: 'Cloud Compute Instance',
    description: 'Scalable virtual machines for your applications',
    category: 'infrastructure',
    tier: 1,
    status: 'available',
    rating: 4.8,
    users: 245,
    avgProvisionTime: 0.25,
    monthlyCost: 150,
    features: ['Auto-scaling', 'Load balancing', 'Backup included', '99.99% SLA'],
    icon: 'server',
    popular: true,
  },
  {
    id: '2',
    name: 'Managed Database',
    description: 'Fully managed PostgreSQL, MySQL, or MongoDB',
    category: 'platform',
    tier: 1,
    status: 'available',
    rating: 4.9,
    users: 189,
    avgProvisionTime: 1,
    monthlyCost: 200,
    features: ['Auto backups', 'Point-in-time recovery', 'Encryption', 'Monitoring'],
    icon: 'database',
    popular: true,
  },
  {
    id: '3',
    name: 'Container Platform',
    description: 'Kubernetes-based container orchestration',
    category: 'platform',
    tier: 1,
    status: 'available',
    rating: 4.7,
    users: 156,
    avgProvisionTime: 2,
    monthlyCost: 300,
    features: ['Auto-scaling', 'Service mesh', 'CI/CD integration', 'Monitoring'],
    icon: 'code',
    popular: true,
  },
  {
    id: '4',
    name: 'Identity & Access Management',
    description: 'Enterprise SSO and authentication service',
    category: 'security',
    tier: 0,
    status: 'available',
    rating: 4.6,
    users: 892,
    avgProvisionTime: 0.5,
    monthlyCost: 50,
    features: ['SSO', 'MFA', 'RBAC', 'Audit logs'],
    icon: 'shield',
    popular: false,
  },
  {
    id: '5',
    name: 'Data Analytics Platform',
    description: 'Self-service analytics and visualization',
    category: 'data',
    tier: 2,
    status: 'available',
    rating: 4.5,
    users: 78,
    avgProvisionTime: 3,
    monthlyCost: 500,
    features: ['SQL interface', 'Dashboards', 'ML integration', 'Data catalog'],
    icon: 'database',
    popular: false,
  },
  {
    id: '6',
    name: 'API Gateway',
    description: 'Manage and secure your APIs',
    category: 'platform',
    tier: 1,
    status: 'available',
    rating: 4.4,
    users: 134,
    avgProvisionTime: 1.5,
    monthlyCost: 180,
    features: ['Rate limiting', 'Authentication', 'Monitoring', 'Caching'],
    icon: 'zap',
    popular: false,
  },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  infrastructure: <Cloud className="h-5 w-5" />,
  platform: <Code className="h-5 w-5" />,
  application: <Grid3x3 className="h-5 w-5" />,
  security: <Shield className="h-5 w-5" />,
  data: <Database className="h-5 w-5" />,
};

const CATEGORY_COLORS = {
  infrastructure: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  platform: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  application: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  security: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  data: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
};

export const ServiceCatalog: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showServiceMap, setShowServiceMap] = useState(false);

  const filteredServices = mockServices.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const popularServices = filteredServices.filter((s) => s.popular);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Service Catalog</h1>
        <p className="text-muted-foreground mt-1">
          Browse and provision IT services from our catalog
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <LiquidGlass variant="default" rounded="xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Available Services</span>
              <Grid3x3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{mockServices.length}</div>
          </div>
        </LiquidGlass>

        <LiquidGlass variant="default" rounded="xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Active Users</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">
              {mockServices.reduce((sum, s) => sum + s.users, 0)}
            </div>
          </div>
        </LiquidGlass>

        <LiquidGlass variant="default" rounded="xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Avg. Provision Time</span>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">
              {(mockServices.reduce((sum, s) => sum + s.avgProvisionTime, 0) / mockServices.length).toFixed(1)}h
            </div>
          </div>
        </LiquidGlass>

        <LiquidGlass variant="default" rounded="xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Popular Services</span>
              <Star className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{popularServices.length}</div>
          </div>
        </LiquidGlass>
      </div>

      {/* Filters and View Controls */}
      <LiquidGlass variant="default" rounded="xl">
        <div className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="infrastructure">Infrastructure</SelectItem>
                <SelectItem value="platform">Platform</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="data">Data</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="rounded-l-none border-l"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </LiquidGlass>

      {/* Popular Services */}
      {popularServices.length > 0 && !searchQuery && categoryFilter === 'all' && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Popular Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {popularServices.map((service) => (
              <LiquidGlass key={service.id} variant="default" rounded="xl">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        {CATEGORY_ICONS[service.category]}
                      </div>
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-yellow-500">
                          <Star className="h-3 w-3 fill-current" />
                          <span>{service.rating}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={CATEGORY_COLORS[service.category]}>
                      {service.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>{service.users} users</span>
                    <span>{formatCurrency(service.monthlyCost)}/mo</span>
                  </div>
                  <Button className="w-full" onClick={() => setSelectedService(service)}>
                    Request Service
                  </Button>
                </div>
              </LiquidGlass>
            ))}
          </div>
        </div>
      )}

      {/* All Services */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {searchQuery || categoryFilter !== 'all' ? 'Search Results' : 'All Services'}
        </h2>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <LiquidGlass key={service.id} variant="default" rounded="xl">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {CATEGORY_ICONS[service.category]}
                      </div>
                      <div>
                        <h3 className="font-medium">{service.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-yellow-500">
                          <Star className="h-3 w-3 fill-current" />
                          <span>{service.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{service.description}</p>

                  <div className="space-y-2 mb-4">
                    {service.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3 mb-3">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{service.users}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{service.avgProvisionTime}h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>{formatCurrency(service.monthlyCost)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => setSelectedService(service)}
                  >
                    Request
                  </Button>
                </div>
              </LiquidGlass>
            ))}
          </div>
        ) : (
          <LiquidGlass variant="default" rounded="xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold">Service</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Rating</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Users</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Provision Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Monthly Cost</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((service) => (
                    <tr
                      key={service.id}
                      className="border-b border-border hover:bg-accent transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                            {CATEGORY_ICONS[service.category]}
                          </div>
                          <div>
                            <div className="font-medium">{service.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {service.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={CATEGORY_COLORS[service.category]}>
                          {service.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="text-sm">{service.rating}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{service.users}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{service.avgProvisionTime}h</td>
                      <td className="py-3 px-4 text-sm">{formatCurrency(service.monthlyCost)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" onClick={() => setSelectedService(service)}>
                          Request
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </LiquidGlass>
        )}
      </div>
    </div>
  );
};

export default ServiceCatalog;
