/**
 * Compliance Impact Calculator
 * Assesses regulatory compliance impact and penalty risks
 */

import { BusinessService, ComplianceFramework } from '@cmdb/unified-model';
import { ComplianceImpact, ComplianceImpactWeight } from '../types/impact-types';
import { DataClassification } from '../types/bsm-types';

/**
 * Penalty Risk Estimates by Framework (in USD)
 * Based on actual regulatory penalties and guidance
 */
const COMPLIANCE_PENALTY_ESTIMATES: Record<ComplianceFramework, number> = {
  GDPR: 20_000_000, // Up to €20M or 4% of global revenue
  HIPAA: 1_500_000, // Up to $1.5M per violation category per year
  PCI_DSS: 500_000, // $5K-$100K per month + card replacement costs
  SOX: 5_000_000, // Criminal penalties + SEC fines
  FINRA: 1_000_000, // Varies widely, median ~$1M
  ISO27001: 100_000, // Certification loss, reputational damage
  SOC2: 250_000, // Certification loss, contract penalties
};

/**
 * Compliance weight by framework
 * Higher weight = more severe regulatory implications
 */
const COMPLIANCE_WEIGHTS: Record<ComplianceFramework, number> = {
  GDPR: 1.0, // Highest weight
  HIPAA: 0.95,
  PCI_DSS: 0.9,
  SOX: 0.85,
  FINRA: 0.8,
  ISO27001: 0.5,
  SOC2: 0.4,
};

/**
 * Compliance Impact Calculator
 * Assesses regulatory and compliance impacts of service disruptions
 */
export class ComplianceImpactCalculator {
  /**
   * Assess compliance impact for a business service
   *
   * @param businessService - Business service to analyze
   * @returns Compliance impact analysis
   */
  assessComplianceImpact(businessService: BusinessService): ComplianceImpact {
    const complianceRequirements = businessService.bsm_attributes.compliance_requirements || [];
    const dataClassification =
      businessService.bsm_attributes.data_sensitivity || 'internal';

    // Extract applicable frameworks
    const applicableFrameworks = complianceRequirements
      .filter((req) => req.applicable)
      .map((req) => req.framework);

    // Calculate total penalty risk
    const penaltyRisk = this.calculateTotalPenaltyRisk(applicableFrameworks);

    // Determine data subjects count (people whose data could be affected)
    const dataSubjects = this.estimateDataSubjects(businessService);

    // Check if breach notification is required
    const breachNotificationRequired = this.requiresBreachNotification(
      applicableFrameworks,
      dataClassification
    );

    // Generate regulatory scope description
    const regulatoryScope = this.generateRegulatoryScope(applicableFrameworks);

    // Generate audit requirements
    const auditRequirements = this.generateAuditRequirements(applicableFrameworks);

    // Generate impact description
    const impactDescription = this.generateImpactDescription(
      applicableFrameworks,
      dataClassification,
      dataSubjects
    );

    const complianceImpact: ComplianceImpact = {
      applicableFrameworks,
      dataClassification,
      regulatoryScope,
      penaltyRisk,
      auditRequirements,
      dataSubjects,
      breachNotificationRequired,
      impactDescription,
    };

    return complianceImpact;
  }

  /**
   * Calculate compliance impact weight for scoring
   * Used by impact scoring service
   *
   * @param businessService - Business service to analyze
   * @returns Compliance impact weight (0-1 scale)
   */
  calculateComplianceWeight(businessService: BusinessService): ComplianceImpactWeight {
    const complianceRequirements = businessService.bsm_attributes.compliance_requirements || [];

    // Extract applicable frameworks
    const applicableFrameworks = complianceRequirements
      .filter((req) => req.applicable)
      .map((req) => req.framework);

    if (applicableFrameworks.length === 0) {
      return {
        frameworks: [],
        weight: 0,
        penaltyRisk: 0,
        description: 'No regulatory compliance requirements',
      };
    }

    // Calculate weighted score
    let totalWeight = 0;
    for (const framework of applicableFrameworks) {
      totalWeight += COMPLIANCE_WEIGHTS[framework] || 0;
    }

    // Normalize to 0-1 scale (max weight is 1.0 for GDPR)
    const normalizedWeight = Math.min(totalWeight, 1.0);

    // Calculate total penalty risk
    const penaltyRisk = this.calculateTotalPenaltyRisk(applicableFrameworks);

    // Generate description
    const description = `Subject to ${applicableFrameworks.join(', ')} regulations`;

    return {
      frameworks: applicableFrameworks,
      weight: normalizedWeight,
      penaltyRisk,
      description,
    };
  }

  /**
   * Calculate total penalty risk across all applicable frameworks
   *
   * @param frameworks - Array of applicable compliance frameworks
   * @returns Total estimated penalty risk in USD
   */
  private calculateTotalPenaltyRisk(frameworks: ComplianceFramework[]): number {
    // Take the maximum penalty (not sum) as penalties typically don't stack
    // Also apply a probability factor (not all breaches result in maximum penalties)
    const maxPenalty = frameworks.reduce((max, framework) => {
      const penalty = COMPLIANCE_PENALTY_ESTIMATES[framework] || 0;
      return Math.max(max, penalty);
    }, 0);

    // Apply 30% probability factor (average likelihood of maximum penalty)
    return Math.round(maxPenalty * 0.3);
  }

  /**
   * Estimate number of data subjects (individuals) whose data could be affected
   *
   * @param businessService - Business service to analyze
   * @returns Estimated number of data subjects
   */
  private estimateDataSubjects(businessService: BusinessService): number {
    // Data subjects are typically customers for customer-facing services
    const customerCount = businessService.bsm_attributes.customer_count || 0;

    // For internal services, count internal users
    const serviceType = businessService.itil_attributes.service_type;
    if (serviceType === 'internal') {
      return 500; // Estimate employee count
    }

    return customerCount;
  }

  /**
   * Check if breach notification is required
   * GDPR, HIPAA, and some state laws require breach notification
   *
   * @param frameworks - Applicable compliance frameworks
   * @param dataClassification - Data sensitivity classification
   * @returns True if breach notification is required
   */
  private requiresBreachNotification(
    frameworks: ComplianceFramework[],
    dataClassification: DataClassification
  ): boolean {
    // GDPR and HIPAA require breach notification for personal data
    const requiresNotification = frameworks.some(
      (f) => f === 'GDPR' || f === 'HIPAA' || f === 'PCI_DSS'
    );

    // Also required for confidential or restricted data
    const sensitiveData =
      dataClassification === 'confidential' ||
      dataClassification === 'restricted' ||
      dataClassification === 'highly_restricted';

    return requiresNotification && sensitiveData;
  }

  /**
   * Generate regulatory scope descriptions
   *
   * @param frameworks - Applicable compliance frameworks
   * @returns Array of scope descriptions
   */
  private generateRegulatoryScope(frameworks: ComplianceFramework[]): string[] {
    const scopeMap: Record<ComplianceFramework, string> = {
      GDPR: 'EU personal data processing and privacy',
      HIPAA: 'Protected Health Information (PHI) security and privacy',
      PCI_DSS: 'Payment card data security and handling',
      SOX: 'Financial reporting controls and audit trails',
      FINRA: 'Financial services operations and recordkeeping',
      ISO27001: 'Information security management system',
      SOC2: 'Security, availability, and confidentiality controls',
    };

    return frameworks.map((f) => scopeMap[f] || 'Unknown regulatory scope');
  }

  /**
   * Generate audit requirements based on frameworks
   *
   * @param frameworks - Applicable compliance frameworks
   * @returns Array of audit requirements
   */
  private generateAuditRequirements(frameworks: ComplianceFramework[]): string[] {
    const requirements: string[] = [];

    if (frameworks.includes('GDPR')) {
      requirements.push('72-hour breach notification to supervisory authority');
      requirements.push('Maintain data processing records');
      requirements.push('Conduct Data Protection Impact Assessment (DPIA)');
    }

    if (frameworks.includes('HIPAA')) {
      requirements.push('Breach notification within 60 days');
      requirements.push('Maintain audit logs for 6 years');
      requirements.push('Conduct annual risk assessment');
    }

    if (frameworks.includes('PCI_DSS')) {
      requirements.push('Quarterly vulnerability scans');
      requirements.push('Annual penetration testing');
      requirements.push('Maintain PCI compliance attestation');
    }

    if (frameworks.includes('SOX')) {
      requirements.push('Document IT general controls');
      requirements.push('Annual IT controls testing');
      requirements.push('Maintain audit trail for financial systems');
    }

    if (frameworks.includes('ISO27001')) {
      requirements.push('Annual certification audit');
      requirements.push('Maintain Information Security Management System (ISMS)');
      requirements.push('Conduct regular risk assessments');
    }

    if (frameworks.includes('SOC2')) {
      requirements.push('Annual SOC 2 Type II audit');
      requirements.push('Maintain evidence of control effectiveness');
      requirements.push('Quarterly control testing');
    }

    return requirements;
  }

  /**
   * Generate impact description for reporting
   *
   * @param frameworks - Applicable compliance frameworks
   * @param dataClassification - Data sensitivity classification
   * @param dataSubjects - Number of affected individuals
   * @returns Human-readable impact description
   */
  private generateImpactDescription(
    frameworks: ComplianceFramework[],
    dataClassification: DataClassification,
    dataSubjects: number
  ): string {
    if (frameworks.length === 0) {
      return 'No regulatory compliance impact identified.';
    }

    const frameworkList = frameworks.join(', ');
    const dataLevel = this.dataClassificationToText(dataClassification);

    let description = `This service is subject to ${frameworkList} regulations and handles ${dataLevel} data. `;

    if (dataSubjects > 0) {
      description += `Approximately ${dataSubjects.toLocaleString()} individuals' data could be affected. `;
    }

    if (this.requiresBreachNotification(frameworks, dataClassification)) {
      description += 'Regulatory breach notification would be required for data exposure. ';
    }

    const penaltyRisk = this.calculateTotalPenaltyRisk(frameworks);
    if (penaltyRisk > 0) {
      description += `Estimated regulatory penalty risk: $${penaltyRisk.toLocaleString()}.`;
    }

    return description;
  }

  /**
   * Convert data classification to human-readable text
   *
   * @param classification - Data classification level
   * @returns Human-readable description
   */
  private dataClassificationToText(classification: DataClassification): string {
    const textMap: Record<DataClassification, string> = {
      public: 'public',
      internal: 'internal',
      confidential: 'confidential',
      restricted: 'restricted',
      highly_restricted: 'highly restricted',
    };

    return textMap[classification] || 'unclassified';
  }

  /**
   * Calculate compliance score contribution (0-10 points)
   * Used by impact scoring service
   *
   * @param businessService - Business service to analyze
   * @returns Compliance score (0-10)
   */
  calculateComplianceScore(businessService: BusinessService): number {
    const weight = this.calculateComplianceWeight(businessService);

    // Convert weight (0-1) to score (0-10)
    const score = weight.weight * 10;

    return Math.round(score * 10) / 10; // Round to 1 decimal place
  }
}

/**
 * Singleton instance
 */
let complianceCalculatorInstance: ComplianceImpactCalculator | null = null;

/**
 * Get Compliance Impact Calculator instance (singleton)
 */
export function getComplianceImpactCalculator(): ComplianceImpactCalculator {
  if (!complianceCalculatorInstance) {
    complianceCalculatorInstance = new ComplianceImpactCalculator();
  }
  return complianceCalculatorInstance;
}
