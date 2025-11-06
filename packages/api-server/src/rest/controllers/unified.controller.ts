/**
 * Unified Framework Controller
 * Handles requests for unified ITIL + TBM + BSM interface
 */

import { Request, Response } from 'express';
import { UnifiedServiceInterface } from '@cmdb/framework-integration';
import { BusinessServiceRepository } from '@cmdb/itil-service-manager';
import { getPostgresClient } from '@cmdb/database';

/**
 * Unified Controller
 * REST API controller for unified framework operations
 */
export class UnifiedController {
  private unifiedService: UnifiedServiceInterface;
  private businessServiceRepo: BusinessServiceRepository;

  constructor() {
    this.unifiedService = new UnifiedServiceInterface();
    this.businessServiceRepo = new BusinessServiceRepository(getPostgresClient());
  }

  /**
   * Get complete service view
   * GET /api/v1/unified/services/:serviceId/complete
   */
  async getCompleteServiceView(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const useCache = req.query.useCache !== 'false';

      const view = await this.unifiedService.getCompleteServiceView(serviceId, { useCache });

      res.json({
        success: true,
        data: view
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get unified KPIs
   * GET /api/v1/unified/services/:serviceId/kpis
   */
  async getUnifiedKPIs(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;

      const view = await this.unifiedService.getCompleteServiceView(serviceId);

      res.json({
        success: true,
        data: view.kpis
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get service dashboard
   * GET /api/v1/unified/services/:serviceId/dashboard
   */
  async getServiceDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;

      const dashboard = await this.unifiedService.getServiceDashboard(serviceId);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create enriched incident
   * POST /api/v1/unified/incidents/enriched
   */
  async createEnrichedIncident(req: Request, res: Response): Promise<void> {
    try {
      const incident = req.body;

      const enrichedIncident = await this.unifiedService.createEnrichedIncident(incident);

      res.status(201).json({
        success: true,
        data: enrichedIncident,
        message: 'Enriched incident created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Assess unified change risk
   * POST /api/v1/unified/changes/assess-unified
   */
  async assessUnifiedChangeRisk(req: Request, res: Response): Promise<void> {
    try {
      const change = req.body;

      const riskAssessment = await this.unifiedService.assessChangeRisk(change);

      res.json({
        success: true,
        data: riskAssessment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Query services with unified filters
   * POST /api/v1/unified/services/query
   */
  async queryServices(req: Request, res: Response): Promise<void> {
    try {
      const filters = req.body;

      // Get all business services (would be optimized with actual query)
      const services = await this.businessServiceRepo.findAll();

      // Apply filters
      let filtered = services;

      if (filters.serviceIds && filters.serviceIds.length > 0) {
        filtered = filtered.filter(s => filters.serviceIds.includes(s.id));
      }

      if (filters.criticality && filters.criticality.length > 0) {
        filtered = filtered.filter(s =>
          filters.criticality.includes(s.bsm_attributes.business_criticality)
        );
      }

      if (filters.operationalStatus && filters.operationalStatus.length > 0) {
        filtered = filtered.filter(s =>
          filters.operationalStatus.includes(s.operational_status)
        );
      }

      if (filters.technicalOwner) {
        filtered = filtered.filter(s => s.technical_owner === filters.technicalOwner);
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(s =>
          s.name.toLowerCase().includes(searchLower) ||
          s.description.toLowerCase().includes(searchLower)
        );
      }

      // Get complete views for filtered services
      const views = await Promise.all(
        filtered.slice(0, filters.limit || 50).map(s =>
          this.unifiedService.getCompleteServiceView(s.id)
        )
      );

      // Apply additional filters on computed fields
      let finalViews = views;

      if (filters.costRange) {
        if (filters.costRange.min !== undefined) {
          finalViews = finalViews.filter(v => v.tbm.monthlyCost >= filters.costRange.min);
        }
        if (filters.costRange.max !== undefined) {
          finalViews = finalViews.filter(v => v.tbm.monthlyCost <= filters.costRange.max);
        }
      }

      if (filters.healthScoreRange) {
        if (filters.healthScoreRange.min !== undefined) {
          finalViews = finalViews.filter(v => v.kpis.serviceHealth >= filters.healthScoreRange.min);
        }
        if (filters.healthScoreRange.max !== undefined) {
          finalViews = finalViews.filter(v => v.kpis.serviceHealth <= filters.healthScoreRange.max);
        }
      }

      if (filters.riskLevel && filters.riskLevel.length > 0) {
        finalViews = finalViews.filter(v =>
          filters.riskLevel.includes(v.bsm.riskLevel)
        );
      }

      // Sort
      if (filters.sortBy) {
        finalViews.sort((a, b) => {
          let aVal, bVal;

          switch (filters.sortBy) {
            case 'name':
              aVal = a.serviceName;
              bVal = b.serviceName;
              break;
            case 'cost':
              aVal = a.tbm.monthlyCost;
              bVal = b.tbm.monthlyCost;
              break;
            case 'health':
              aVal = a.kpis.serviceHealth;
              bVal = b.kpis.serviceHealth;
              break;
            case 'risk':
              aVal = a.kpis.riskScore;
              bVal = b.kpis.riskScore;
              break;
            case 'revenue':
              aVal = a.bsm.annualRevenue;
              bVal = b.bsm.annualRevenue;
              break;
            case 'criticality':
              aVal = this.criticalityToNumber(a.bsm.criticality);
              bVal = this.criticalityToNumber(b.bsm.criticality);
              break;
            default:
              aVal = a.serviceName;
              bVal = b.serviceName;
          }

          if (aVal < bVal) return filters.sortDirection === 'desc' ? 1 : -1;
          if (aVal > bVal) return filters.sortDirection === 'desc' ? -1 : 1;
          return 0;
        });
      }

      // Pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginated = finalViews.slice(offset, offset + limit);

      res.json({
        success: true,
        data: paginated,
        meta: {
          total: finalViews.length,
          offset,
          limit,
          returned: paginated.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get service health details
   * GET /api/v1/unified/services/:serviceId/health-details
   */
  async getServiceHealthDetails(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;

      const view = await this.unifiedService.getCompleteServiceView(serviceId);

      const healthDetails = {
        overallScore: view.kpis.serviceHealth,
        availabilityScore: view.itil.availability * 100,
        incidentScore: Math.max(0, 100 - (view.itil.openIncidents * 10)),
        changeScore: view.itil.changeSuccessRate * 100,
        complianceScore: view.itil.baselineCompliance,
        performanceScore: 85, // Placeholder
        operationalStatus: view.businessService.operational_status,
        trend: this.determineTrend(view.kpis.serviceHealth),
        calculatedAt: new Date()
      };

      res.json({
        success: true,
        data: healthDetails
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get risk score details
   * GET /api/v1/unified/services/:serviceId/risk-details
   */
  async getRiskScoreDetails(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;

      const view = await this.unifiedService.getCompleteServiceView(serviceId);

      const riskDetails = {
        overallScore: view.kpis.riskScore,
        changeRisk: view.itil.changesLast30Days > 10 ? 50 : 20,
        criticalityRisk: this.getCriticalityRisk(view.bsm.criticality),
        incidentRisk: Math.min(100, view.itil.criticalIncidents * 20),
        driftRisk: view.itil.driftedCIs > 0
          ? (view.itil.driftedCIs / view.itil.baselinedCIs) * 100
          : 0,
        complianceRisk: view.itil.auditStatus === 'non_compliant' ? 100 : 0,
        riskLevel: this.getRiskLevel(view.kpis.riskScore),
        trend: this.determineTrend(100 - view.kpis.riskScore),
        topRiskFactors: this.getTopRiskFactors(view),
        calculatedAt: new Date()
      };

      res.json({
        success: true,
        data: riskDetails
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get value score details
   * GET /api/v1/unified/services/:serviceId/value-details
   */
  async getValueScoreDetails(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;

      const view = await this.unifiedService.getCompleteServiceView(serviceId);

      const annualCost = view.tbm.monthlyCost * 12;
      const annualRevenue = view.bsm.annualRevenue;

      const valueDetails = {
        overallScore: view.kpis.valueScore,
        annualRevenue,
        annualCost,
        roiPercentage: view.kpis.roi * 100,
        valueClassification: this.getValueClassification(view.kpis.valueScore),
        revenuePerDollar: view.kpis.valueScore,
        costOptimizationOpportunities: this.getCostOptimizationOpportunities(view),
        trend: view.tbm.costTrend === 'decreasing' ? 'increasing' : 'stable',
        calculatedAt: new Date()
      };

      res.json({
        success: true,
        data: valueDetails
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get top services by cost
   * GET /api/v1/unified/services/top-by-cost
   */
  async getTopServicesByCost(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const services = await this.businessServiceRepo.findAll();
      const views = await Promise.all(
        services.slice(0, 100).map(s => this.unifiedService.getCompleteServiceView(s.id))
      );

      const sorted = views.sort((a, b) => b.tbm.monthlyCost - a.tbm.monthlyCost);
      const top = sorted.slice(0, limit);

      res.json({
        success: true,
        data: top
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get top services by risk
   * GET /api/v1/unified/services/top-by-risk
   */
  async getTopServicesByRisk(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const services = await this.businessServiceRepo.findAll();
      const views = await Promise.all(
        services.slice(0, 100).map(s => this.unifiedService.getCompleteServiceView(s.id))
      );

      const sorted = views.sort((a, b) => b.kpis.riskScore - a.kpis.riskScore);
      const top = sorted.slice(0, limit);

      res.json({
        success: true,
        data: top
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get top services by value
   * GET /api/v1/unified/services/top-by-value
   */
  async getTopServicesByValue(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const services = await this.businessServiceRepo.findAll();
      const views = await Promise.all(
        services.slice(0, 100).map(s => this.unifiedService.getCompleteServiceView(s.id))
      );

      const sorted = views.sort((a, b) => b.kpis.valueScore - a.kpis.valueScore);
      const top = sorted.slice(0, limit);

      res.json({
        success: true,
        data: top
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Helper: Convert criticality to number for sorting
   * @private
   */
  private criticalityToNumber(criticality: string): number {
    switch (criticality) {
      case 'tier_0': return 0;
      case 'tier_1': return 1;
      case 'tier_2': return 2;
      case 'tier_3': return 3;
      case 'tier_4': return 4;
      default: return 5;
    }
  }

  /**
   * Helper: Determine trend from score
   * @private
   */
  private determineTrend(score: number): 'improving' | 'stable' | 'degrading' {
    if (score >= 80) return 'improving';
    if (score >= 60) return 'stable';
    return 'degrading';
  }

  /**
   * Helper: Get criticality risk score
   * @private
   */
  private getCriticalityRisk(criticality: string): number {
    switch (criticality) {
      case 'tier_0': return 100;
      case 'tier_1': return 75;
      case 'tier_2': return 50;
      case 'tier_3': return 25;
      case 'tier_4': return 10;
      default: return 50;
    }
  }

  /**
   * Helper: Get risk level from score
   * @private
   */
  private getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Helper: Get top risk factors
   * @private
   */
  private getTopRiskFactors(view: any): string[] {
    const factors = [];

    if (view.bsm.criticality === 'tier_0' || view.bsm.criticality === 'tier_1') {
      factors.push('High business criticality');
    }

    if (view.itil.criticalIncidents > 0) {
      factors.push(`${view.itil.criticalIncidents} critical incidents in 30 days`);
    }

    if (view.itil.driftedCIs > 0) {
      factors.push(`${view.itil.driftedCIs} CIs with configuration drift`);
    }

    if (view.itil.auditStatus === 'non_compliant') {
      factors.push('Non-compliant audit status');
    }

    if (view.itil.changeSuccessRate < 0.9) {
      factors.push('Low change success rate');
    }

    return factors.slice(0, 5);
  }

  /**
   * Helper: Get value classification
   * @private
   */
  private getValueClassification(score: number): 'high_value' | 'medium_value' | 'low_value' | 'cost_center' {
    if (score >= 5) return 'high_value';
    if (score >= 2) return 'medium_value';
    if (score >= 1) return 'low_value';
    return 'cost_center';
  }

  /**
   * Helper: Get cost optimization opportunities
   * @private
   */
  private getCostOptimizationOpportunities(view: any): string[] {
    const opportunities = [];

    if (view.tbm.costTrend === 'increasing') {
      opportunities.push('Cost trending upward - review resource utilization');
    }

    if (view.tbm.allocationPercentage < 80) {
      opportunities.push('Low cost allocation - improve cost attribution');
    }

    if (view.kpis.costEfficiency.costPerTransaction > 1) {
      opportunities.push('High cost per transaction - optimize processing efficiency');
    }

    if (view.tbm.budgetVariance < 0) {
      opportunities.push('Over budget - review spending and identify savings');
    }

    if (view.kpis.valueScore < 2) {
      opportunities.push('Low value score - increase revenue or reduce costs');
    }

    return opportunities.slice(0, 5);
  }
}
