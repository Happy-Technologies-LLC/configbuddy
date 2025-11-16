# FinOps Dashboard User Guide

Complete guide to the FinOps Dashboard for IT financial operations teams, cloud economists, and cost optimization specialists.

## Overview

The FinOps Dashboard provides detailed IT cost analysis, optimization recommendations, and financial planning tools. Designed for FinOps practitioners, finance analysts, and cloud cost managers who need deep visibility into IT spending.

**Access**: http://localhost:3001/dashboards/finops

**Refresh Rate**: Hourly (cloud costs sync every 6 hours)

**Role Required**: `operator` or `admin`

---

## Dashboard Layout

The FinOps Dashboard is organized into 8 key sections:

1. **Cost Summary** - Total spend and key metrics
2. **Cloud Cost Analysis** - Per-provider breakdown (AWS, Azure, GCP)
3. **On-Premises vs. Cloud** - Hybrid infrastructure costs
4. **Budget Variance** - Actual vs. budgeted spend
5. **Cost Optimization Opportunities** - Actionable savings recommendations
6. **Unit Economics** - Cost per user, transaction, workload
7. **License Management** - Software license tracking and renewals
8. **Cost Allocation** - Chargeback and showback reporting

---

## Section 1: Cost Summary

### Total Monthly Spend

**What it shows**: Comprehensive view of current month's IT costs.

**Metrics Displayed**:
```
Total Monthly Cost:     $125,450
  Cloud (AWS):          $75,000  (59.8%)
  Cloud (Azure):        $35,451  (28.3%)
  Cloud (GCP):          $10,000   (8.0%)
  On-Premises:          $ 4,999   (3.9%)

Daily Average:          $ 4,182
Projected Month-End:    $127,835
```

**Cost Breakdown**:
- **Compute**: CPU, VMs, containers
- **Storage**: Block, object, file storage
- **Network**: Data transfer, load balancers
- **Database**: Managed database services
- **Other**: Security, monitoring, miscellaneous

**Actions**:
- Click on category to drill down
- Export to CSV for finance reports
- Set budget alerts

---

### Key Financial Metrics

**Metrics**:

**Cost Efficiency Score** (0-100):
- Measures how efficiently resources are utilized
- 80+ = Excellent
- 60-79 = Good
- 40-59 = Needs Improvement
- <40 = Poor

**Calculation**:
```
Efficiency = (Utilized Resources / Provisioned Resources) × 100
```

**Waste Percentage**:
- Percentage of spend on unused/underutilized resources
- Target: <10%
- Typical: 20-30%
- Poor: >40%

**Reserved Instance Coverage** (Cloud only):
- Percentage of compute covered by RIs/Savings Plans
- Target: >70% for stable workloads
- Cost savings: 30-50% vs. on-demand

**Example**:
```
Cost Efficiency:        72/100  (Good)
Waste Percentage:       18%     (Acceptable)
RI Coverage (AWS):      65%     (Needs Improvement)
RI Coverage (Azure):    80%     (Excellent)
```

---

## Section 2: Cloud Cost Analysis

### AWS Costs

**What it shows**: Detailed breakdown of Amazon Web Services spending.

**Top AWS Services**:
```
Service             Monthly Cost    % of AWS    Trend
EC2                 $35,000         46.7%       ↑ +5%
RDS                 $12,000         16.0%       → 0%
S3                  $ 8,500         11.3%       ↑ +12%
Lambda              $ 6,000          8.0%       ↓ -3%
EBS                 $ 5,000          6.7%       → 0%
CloudFront          $ 3,500          4.7%       ↑ +8%
Other               $ 5,000          6.6%       → 0%
```

**By Region**:
```
us-east-1:          $40,000  (53.3%)
us-west-2:          $20,000  (26.7%)
eu-west-1:          $10,000  (13.3%)
ap-southeast-1:     $ 5,000   (6.7%)
```

**By Environment**:
```
Production:         $60,000  (80.0%)
Staging:            $10,000  (13.3%)
Development:        $ 5,000   (6.7%)
```

**Actions**:
- Click service to see resource-level costs
- Identify cost anomalies
- Compare regions for optimization

---

### Azure Costs

**What it shows**: Detailed breakdown of Microsoft Azure spending.

**Top Azure Services**:
```
Service                 Monthly Cost    % of Azure  Trend
Virtual Machines        $15,000         42.3%       → 0%
Azure SQL Database      $ 8,000         22.6%       ↑ +3%
Storage Accounts        $ 4,500         12.7%       ↑ +15%
App Service             $ 3,500          9.9%       → 0%
Azure Kubernetes        $ 2,500          7.0%       ↓ -5%
Other                   $ 1,951          5.5%       → 0%
```

**By Subscription**:
- List subscriptions with costs
- Identify which teams/projects own subscriptions

**Actions**:
- Review unused reservations
- Check for unattached disks
- Optimize VM sizes

---

### GCP Costs

**What it shows**: Detailed breakdown of Google Cloud Platform spending.

**Top GCP Services**:
```
Service                 Monthly Cost    % of GCP    Trend
Compute Engine          $5,000          50.0%       → 0%
Cloud Storage           $2,000          20.0%       ↑ +10%
BigQuery                $1,500          15.0%       ↓ -5%
Cloud SQL               $1,000          10.0%       → 0%
Other                   $  500           5.0%       → 0%
```

**Actions**:
- Review committed use discounts
- Optimize storage classes
- Monitor BigQuery query costs

---

## Section 3: On-Premises vs. Cloud

### Cost Comparison

**What it shows**: Total Cost of Ownership (TCO) comparison between on-prem and cloud.

**On-Premises Costs**:
```
Capital Expenses (CapEx):
  Hardware:             $50,000 (depreciated over 5 years)
  Software Licenses:    $10,000 (annual)

Operating Expenses (OpEx):
  Power & Cooling:      $ 2,000/month
  Space (Colocation):   $ 1,500/month
  Maintenance:          $ 1,000/month
  Labor:                $ 5,000/month (allocated)

Monthly Total:          $ 9,500
```

**Cloud Costs**:
```
AWS:                    $75,000/month
Azure:                  $35,451/month
GCP:                    $10,000/month

Monthly Total:          $120,451
```

**Hybrid Total**: $129,951/month ($1,559,412/year)

**TCO Analysis**:
```
5-Year On-Prem TCO:     $820,000
5-Year Cloud TCO:       $7,227,000
Difference:             Cloud costs 8.8x more

But consider:
- Cloud elasticity (scale up/down)
- No upfront capital
- Faster time to market
- Reduced operational burden
```

**Actions**:
- Identify workloads suitable for on-prem migration (stable, predictable)
- Calculate break-even point for repatriation
- Evaluate hybrid architectures

---

### Workload Distribution

**What it shows**: Which workloads run where and why.

**Workload Placement**:
```
Cloud (Elastic):        75% of workloads
  - Web applications
  - Microservices
  - Dev/Test environments
  - Seasonal workloads

On-Prem (Stable):       25% of workloads
  - Legacy databases
  - Compliance-constrained systems
  - High I/O workloads
  - Predictable baseline load
```

**Actions**:
- Review workload placement decisions
- Identify repatriation candidates
- Plan hybrid connectivity costs

---

## Section 4: Budget Variance

### Actual vs. Budget

**What it shows**: Monthly spend compared to approved budget.

**Budget Tracking**:
```
Month: November 2025

Approved Budget:        $120,000
Actual Spend (MTD):     $ 92,340
Projected Month-End:    $127,835
Variance:               +$ 7,835  (+6.5%)  ⚠

Status: OVER BUDGET
```

**Variance by Category**:
```
Category        Budget      Actual      Variance    Status
Compute         $50,000     $52,500     +5.0%       ⚠
Storage         $25,000     $28,000     +12.0%      🔴
Network         $15,000     $14,500     -3.3%       ✅
Database        $20,000     $21,500     +7.5%       ⚠
Other           $10,000     $11,335     +13.4%      🔴
```

**Root Causes**:
- **Storage overage**: Unplanned data growth (+$3,000)
- **Database overage**: Increased load (+$1,500)
- **Other overage**: Security tools added mid-month (+$1,335)

**Actions**:
- Request budget increase for storage
- Implement data lifecycle policies
- Right-size database instances

---

### Forecast vs. Actuals

**What it shows**: How accurate your cost forecasts have been.

**Forecast Accuracy**:
```
Month           Forecast    Actual      Variance    Accuracy
October         $118,000    $121,500    +3.0%       97.0%
September       $115,000    $117,800    +2.4%       97.6%
August          $120,000    $125,000    +4.2%       95.8%
July            $118,000    $115,500    -2.1%       97.9%

Average Accuracy: 97.1%  (Excellent)
```

**Improving Forecast Accuracy**:
1. Review growth trends monthly
2. Factor in planned projects
3. Account for seasonality
4. Monitor commitment utilization

---

## Section 5: Cost Optimization Opportunities

### Actionable Recommendations

**What it shows**: Specific, ranked cost-saving opportunities.

**Optimization Categories**:

#### 1. Right-Sizing (Highest Impact)

**Example Recommendations**:
```
Resource                Current Size    Recommended    Monthly Savings
prod-db-01              db.r5.8xlarge   db.r5.4xlarge  $2,400
web-server-pool         t3.xlarge (20)  t3.large (20)  $1,200
staging-cluster         c5.2xlarge (10) c5.xlarge (10) $1,000

Total Potential Savings: $4,600/month ($55,200/year)
```

**Implementation**:
- Low risk: Test environment changes (1 week)
- Medium risk: Non-prod changes (2-4 weeks)
- High risk: Production changes (4-8 weeks with testing)

---

#### 2. Reserved Instance/Savings Plan Purchases

**Example Recommendations**:
```
Service         Current Cost    With RI/SP     Savings     Term
AWS EC2         $20,000/mo      $13,000/mo     35%         1-year
Azure VMs       $10,000/mo      $ 7,000/mo     30%         1-year
RDS             $ 8,000/mo      $ 5,600/mo     30%         1-year

Total Savings: $12,400/month ($148,800/year)
Upfront Cost: $156,000 (1-year partial upfront)
Payback: 13 months
```

**Risk Assessment**:
- Commitment utilization confidence: 85%
- Workload stability: High
- Recommendation: Proceed with 70% coverage

---

#### 3. Idle Resource Cleanup

**Example Recommendations**:
```
Resource Type       Count    Monthly Cost    Action
Unattached EBS      125      $3,125          Delete
Stopped Instances   15       $1,500          Terminate or commit
Unused Load Balancers 8      $240            Delete
Old Snapshots       500      $750            Implement lifecycle
Orphaned IPs        20       $144            Release

Total Savings: $5,759/month ($69,108/year)
```

**Implementation Priority**: High (quick wins, low risk)

---

#### 4. Storage Optimization

**Example Recommendations**:
```
Optimization                Current    Optimized   Savings
S3 Lifecycle Policies       None       Intelligent $1,200/mo
EBS gp3 Migration           gp2        gp3         $  800/mo
Archive Old Backups         S3         Glacier     $  500/mo
Enable Compression          No         Yes         $  300/mo

Total Savings: $2,800/month ($33,600/year)
```

---

#### 5. Commitment Optimization

**Example Recommendations**:
```
Expiring This Quarter:
- AWS EC2 RI (50 instances)     Expires Dec 31     Action: Renew or convert to SP
- Azure Reserved VMs (20 VMs)   Expires Nov 30     Action: Evaluate usage, renew 80%

Underutilized Commitments:
- AWS Savings Plan              65% utilized       Action: Adjust workload placement
- Azure Hybrid Benefit          50% utilized       Action: Maximize Windows VM coverage
```

---

### Total Savings Potential

**Summary**:
```
Optimization Category       Monthly Savings    Annual Savings    Effort
Right-Sizing                $  4,600           $ 55,200          Medium
RI/SP Purchases             $ 12,400           $148,800          Low
Idle Resource Cleanup       $  5,759           $ 69,108          Low
Storage Optimization        $  2,800           $ 33,600          Low
Commitment Optimization     $  3,500           $ 42,000          Low

TOTAL POTENTIAL:            $ 29,059           $348,708

Current Monthly Spend:      $125,450
Optimized Monthly Spend:    $ 96,391
Potential Reduction:        23.2%
```

**Implementation Roadmap**:
- **Month 1**: Idle resource cleanup ($5,759/mo savings)
- **Month 2**: Storage optimization ($2,800/mo savings)
- **Month 3**: Right-sizing non-prod ($1,500/mo savings)
- **Month 4**: RI/SP purchases ($12,400/mo savings)
- **Month 5**: Right-sizing production ($3,100/mo savings)
- **Month 6**: Commitment optimization ($3,500/mo savings)

---

## Section 6: Unit Economics

### Cost per Business Metric

**What it shows**: IT cost allocated to business outcomes.

**Key Unit Economics**:

**1. Cost per User**:
```
Monthly Active Users:       5,000
Total IT Cost:              $125,450
Cost per User:              $25.09

Industry Benchmark:         $30-40 per user (SaaS)
Performance:                Excellent (below benchmark)

Trend:
- 6 months ago:             $28.50 per user
- Improvement:              -12%
```

**2. Cost per Transaction**:
```
Monthly Transactions:       850,000
Total IT Cost:              $125,450
Cost per Transaction:       $0.148

Target:                     $0.15 per transaction
Performance:                On Target

Trend:
- 6 months ago:             $0.165 per transaction
- Improvement:              -10.3%
```

**3. Cost per Workload**:
```
Active Workloads:           150
Total IT Cost:              $125,450
Cost per Workload:          $836

Breakdown:
- Production workloads:     $1,200/workload (100 workloads)
- Non-prod workloads:       $  150/workload (50 workloads)
```

**Actions**:
- Track unit economics monthly
- Use for capacity planning
- Benchmark against competitors
- Include in executive reporting

---

### Marginal Cost Analysis

**What it shows**: Cost to serve one additional user/transaction.

**Marginal Costs**:
```
Next 1,000 Users:
- Infrastructure:           $5,000  ($5.00/user)
- Licenses:                 $2,000  ($2.00/user)
- Support:                  $1,000  ($1.00/user)
Total Marginal Cost:        $8/user

Current Average Cost:       $25.09/user
Marginal Cost:              $8.00/user
Profit Margin Improvement:  High (low marginal cost)
```

**Interpretation**:
- Low marginal costs = economies of scale
- High marginal costs = investigate inefficiencies

---

## Section 7: License Management

### Software Licenses

**What it shows**: All software subscriptions and licenses.

**License Inventory**:
```
Vendor              Product                 Qty     Cost/Unit   Monthly Total   Expiry
VMware              vSphere Enterprise      100     $250        $2,083          2026-01-15
Microsoft           Office 365 E3           500     $20         $10,000         2026-05-31
Oracle              Database EE             50      $350        $1,458          2025-12-31
Red Hat             Enterprise Linux        200     $50         $833            2026-03-15
Splunk              Enterprise              10TB    $150        $1,500          2025-11-30
HashiCorp           Terraform Enterprise    100     $70         $583            2026-02-28

Total Monthly License Cost: $16,457
Total Annual License Cost:  $197,484
```

---

### Upcoming Renewals

**What it shows**: Licenses expiring in next 90 days.

**Renewal Calendar**:
```
Days Until    Vendor      Product                Cost        Auto-Renew?
Expiry
15            Splunk      Enterprise             $18,000     No
45            Oracle      Database EE            $21,000     No
75            HashiCorp   Terraform              $8,400      Yes

Total Renewals (90 days):  $47,400
```

**Action Items**:
1. **Splunk** (15 days): Negotiate renewal, evaluate alternatives (Elastic, Datadog)
2. **Oracle** (45 days): Review usage, consider downsizing from 50 to 40 licenses
3. **HashiCorp** (75 days): Verify auto-renewal pricing, check for price increases

**License Optimization**:
```
Underutilized Licenses:
- Office 365: 50 inactive users (save $12,000/year by removing)
- Oracle DB: 10 unused licenses (save $42,000/year)

Total Potential Savings: $54,000/year
```

---

### True-Up Tracking

**What it shows**: License compliance and true-up liability.

**Compliance Status**:
```
Vendor              Licensed    In Use      Overage     True-Up Cost
VMware              100         105         5           $15,000
Microsoft           500         485         0           $0
Oracle              50          62          12          $63,000
Red Hat             200         198         0           $0

Total True-Up Liability: $78,000
```

**Actions**:
- Purchase additional Oracle licenses before audit
- Decommission 5 VMware VMs to avoid true-up
- Reallocate unused Microsoft licenses

---

## Section 8: Cost Allocation

### Chargeback Reporting

**What it shows**: IT costs allocated back to business units/teams.

**Allocation Methods**:
1. **Direct**: CI directly used by team (e.g., team-specific database)
2. **Usage-Based**: Shared resource allocated by usage % (e.g., storage by GB)
3. **Equal Split**: Shared overhead divided equally

**Example Chargeback Report**:
```
Business Unit       Direct      Shared      Total       % of IT Budget
E-Commerce          $45,000     $15,000     $60,000     47.8%
Marketing           $20,000     $10,000     $30,000     23.9%
Operations          $15,000     $ 8,000     $23,000     18.3%
Development         $ 8,000     $ 4,450     $12,450     9.9%

Total:              $88,000     $37,450     $125,450    100%
```

**Chargeback Model Benefits**:
- Increases cost awareness
- Incentivizes optimization
- Justifies IT budget
- Enables P&L by business unit

---

### Showback Reporting

**What it shows**: Informational cost allocation (no actual billing).

**Use Cases**:
- Teams don't have budgets
- IT is cost center, not profit center
- Goal is awareness, not accountability

**Example Showback**:
```
Team            This Month    Last Month    Trend       Top Resources
Backend API     $35,000       $32,000       ↑ +9%       prod-api-cluster ($25K)
Frontend Web    $20,000       $21,000       ↓ -5%       cdn-distribution ($12K)
Data Platform   $18,000       $17,500       ↑ +3%       data-warehouse ($15K)
QA/Testing      $12,000       $15,000       ↓ -20%      test-environments ($10K)
```

**Actions**:
- Share reports monthly
- Highlight cost-saving teams
- Educate on cost drivers

---

## Common Workflows

### Daily Cost Review (10 min/day)

1. Check **Cost Summary** for unexpected spikes
2. Review **Budget Variance** - on track?
3. Scan **Optimization Opportunities** for quick wins
4. Monitor **License Renewals** approaching
5. Check alerts for anomalies

---

### Weekly Cost Optimization (1 hour/week)

1. Review **Idle Resource Cleanup** recommendations
2. Implement 2-3 quick wins (delete unused resources)
3. Update **Right-Sizing** tracking spreadsheet
4. Check **RI/SP** utilization percentage
5. Export chargeback reports for teams

---

### Monthly Budget Review (2 hours/month)

1. Analyze **Budget Variance** in detail
2. Update forecast for next month
3. Review **Unit Economics** trends
4. Prepare cost reduction plan if over budget
5. Submit optimization report to leadership

---

### Quarterly Planning (4 hours/quarter)

1. Deep dive **Cloud Cost Analysis** by service
2. Review all **Cost Optimization** categories
3. Plan RI/SP purchases for next quarter
4. Update TCO model (**On-Prem vs. Cloud**)
5. Negotiate upcoming **License Renewals**
6. Set cost reduction targets

---

## Best Practices

### 1. Tagging Strategy

**Implement comprehensive tagging**:
```
Required Tags:
- Environment (prod, staging, dev)
- Owner (team or individual)
- CostCenter (finance code)
- Project (business initiative)
- Application (system name)

Optional Tags:
- ExpirationDate (for temporary resources)
- Compliance (regulatory framework)
- DataClassification (public, confidential, restricted)
```

**Enforcement**:
- Tag policies (e.g., AWS Tag Policies)
- Automated tagging via IaC
- Monthly tag compliance reports

---

### 2. Budget Alerts

**Set up multi-level alerts**:
```
Alert Level     Threshold       Action
Warning         80% of budget   Email FinOps team
Critical        100% of budget  Email CFO + CTO
Emergency       120% of budget  Freeze non-essential spending
```

---

### 3. Optimization Cadence

**Regular optimization schedule**:
- **Daily**: Check for anomalies
- **Weekly**: Implement quick wins
- **Monthly**: Right-sizing analysis
- **Quarterly**: RI/SP planning
- **Annually**: TCO review

---

### 4. Collaboration

**Work with stakeholders**:
- **Engineering**: Right-sizing, architecture optimization
- **Finance**: Budget planning, forecasting
- **Executives**: Strategic cost reduction initiatives
- **Business Units**: Chargeback/showback reporting

---

## Troubleshooting

### Cloud costs not syncing

**Check**:
1. Cloud provider credentials valid
2. Cost sync jobs running: `curl http://localhost:3000/api/v1/jobs?type=cost-sync`
3. API permissions (e.g., AWS Cost Explorer, Azure Cost Management)

**Solution**: Re-run cost sync job manually

---

### Budget variance incorrect

**Possible causes**:
1. Budget not set for current month
2. Forecast model misconfigured
3. Unexpected one-time charges

**Solution**: Review budget settings, exclude one-time charges from trend analysis

---

### Optimization recommendations stale

**Cause**: Recommendations refreshed weekly

**Solution**: Wait for next refresh or trigger manual analysis via API

---

## See Also

- [Executive Dashboard User Guide](/user-guides/executive-dashboard.md) - High-level IT metrics
- [Financial Management API](/api/rest/financial.md) - Programmatic cost data access
- [TBM Cost Engine](/components/tbm-cost-engine.md) - Cost calculation architecture
- [Migrating to v3.0](/getting-started/migrating-to-v3.md) - Migration guide

---

**Dashboard Version**: 3.0
**Last Updated**: November 2025
**Audience**: FinOps practitioners, cloud economists, financial analysts
