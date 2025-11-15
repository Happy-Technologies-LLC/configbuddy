import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Network, DollarSign, Users, TrendingUp } from 'lucide-react';
import { LiquidGlass } from '../components/ui/liquid-glass';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

interface BusinessService {
  id: string;
  name: string;
  description?: string;
  tier: number;
  criticality: 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';
  revenueImpact: number;
  userCount: number;
  owner?: string;
  status: 'active' | 'inactive' | 'planned';
  supportingCIs?: number;
  monthlyCost?: number;
}

const CRITICALITY_COLORS = {
  TIER_0: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  TIER_1: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  TIER_2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  TIER_3: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300',
  planned: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
};

// Mock data - will be replaced with actual API calls
const mockServices: BusinessService[] = [
  {
    id: '1',
    name: 'Customer Portal',
    description: 'External customer-facing web application',
    tier: 0,
    criticality: 'TIER_0',
    revenueImpact: 5000000,
    userCount: 50000,
    owner: 'Product Team',
    status: 'active',
    supportingCIs: 45,
    monthlyCost: 125000,
  },
  {
    id: '2',
    name: 'Internal ERP System',
    description: 'Enterprise Resource Planning system',
    tier: 1,
    criticality: 'TIER_1',
    revenueImpact: 2000000,
    userCount: 1500,
    owner: 'Finance Team',
    status: 'active',
    supportingCIs: 32,
    monthlyCost: 85000,
  },
  {
    id: '3',
    name: 'Employee Self-Service',
    description: 'HR and employee management portal',
    tier: 2,
    criticality: 'TIER_2',
    revenueImpact: 0,
    userCount: 800,
    owner: 'HR Team',
    status: 'active',
    supportingCIs: 18,
    monthlyCost: 42000,
  },
];

export const BusinessServices: React.FC = () => {
  const [services, setServices] = useState<BusinessService[]>(mockServices);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<BusinessService | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tier: '0',
    revenueImpact: '',
    userCount: '',
    owner: '',
  });

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = filterTier === 'all' || service.tier.toString() === filterTier;
    return matchesSearch && matchesTier;
  });

  const handleCreateService = () => {
    const newService: BusinessService = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      tier: parseInt(formData.tier),
      criticality: `TIER_${formData.tier}` as BusinessService['criticality'],
      revenueImpact: parseFloat(formData.revenueImpact) || 0,
      userCount: parseInt(formData.userCount) || 0,
      owner: formData.owner,
      status: 'active',
      supportingCIs: 0,
      monthlyCost: 0,
    };

    if (editingService) {
      setServices(services.map(s => s.id === editingService.id ? { ...newService, id: editingService.id } : s));
      setEditingService(null);
    } else {
      setServices([...services, newService]);
    }

    setFormData({
      name: '',
      description: '',
      tier: '0',
      revenueImpact: '',
      userCount: '',
      owner: '',
    });
    setIsCreateDialogOpen(false);
  };

  const handleEdit = (service: BusinessService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      tier: service.tier.toString(),
      revenueImpact: service.revenueImpact.toString(),
      userCount: service.userCount.toString(),
      owner: service.owner || '',
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this business service?')) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Business Services</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your business-critical services
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingService(null);
              setFormData({
                name: '',
                description: '',
                tier: '0',
                revenueImpact: '',
                userCount: '',
                owner: '',
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Edit Business Service' : 'Create Business Service'}</DialogTitle>
              <DialogDescription>
                Define a new business service and its key attributes
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Portal"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the service"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="tier">Criticality Tier</Label>
                  <Select
                    value={formData.tier}
                    onValueChange={(value) => setFormData({ ...formData, tier: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Tier 0 - Mission Critical</SelectItem>
                      <SelectItem value="1">Tier 1 - Business Critical</SelectItem>
                      <SelectItem value="2">Tier 2 - Important</SelectItem>
                      <SelectItem value="3">Tier 3 - Standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="owner">Service Owner</Label>
                  <Input
                    id="owner"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    placeholder="Team or person"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="revenueImpact">Annual Revenue Impact ($)</Label>
                  <Input
                    id="revenueImpact"
                    type="number"
                    value={formData.revenueImpact}
                    onChange={(e) => setFormData({ ...formData, revenueImpact: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="userCount">User Count</Label>
                  <Input
                    id="userCount"
                    type="number"
                    value={formData.userCount}
                    onChange={(e) => setFormData({ ...formData, userCount: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateService} disabled={!formData.name}>
                {editingService ? 'Update Service' : 'Create Service'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <LiquidGlass variant="default" rounded="xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Services</span>
              <Network className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{services.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {services.filter(s => s.status === 'active').length} active
            </p>
          </div>
        </LiquidGlass>

        <LiquidGlass variant="default" rounded="xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Revenue Impact</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">
              {formatCurrency(services.reduce((sum, s) => sum + s.revenueImpact, 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Annual</p>
          </div>
        </LiquidGlass>

        <LiquidGlass variant="default" rounded="xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Users</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">
              {formatNumber(services.reduce((sum, s) => sum + s.userCount, 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all services</p>
          </div>
        </LiquidGlass>

        <LiquidGlass variant="default" rounded="xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Monthly IT Cost</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">
              {formatCurrency(services.reduce((sum, s) => sum + (s.monthlyCost || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All services</p>
          </div>
        </LiquidGlass>
      </div>

      {/* Filters */}
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

            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="0">Tier 0 - Mission Critical</SelectItem>
                <SelectItem value="1">Tier 1 - Business Critical</SelectItem>
                <SelectItem value="2">Tier 2 - Important</SelectItem>
                <SelectItem value="3">Tier 3 - Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </LiquidGlass>

      {/* Services Table */}
      <LiquidGlass variant="default" rounded="xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold">Service Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Tier</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Revenue Impact</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Users</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Monthly Cost</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Supporting CIs</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    No services found
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr
                    key={service.id}
                    className="border-b border-border hover:bg-accent transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{service.name}</div>
                        {service.description && (
                          <div className="text-xs text-muted-foreground">{service.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={CRITICALITY_COLORS[service.criticality]}>
                        Tier {service.tier}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={STATUS_COLORS[service.status]} variant="outline">
                        {service.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {formatCurrency(service.revenueImpact)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {formatNumber(service.userCount)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {service.monthlyCost ? formatCurrency(service.monthlyCost) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className="text-muted-foreground">{service.supportingCIs || 0}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </LiquidGlass>
    </div>
  );
};

export default BusinessServices;
