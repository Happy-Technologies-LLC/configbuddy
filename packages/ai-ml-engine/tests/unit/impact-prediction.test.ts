// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Impact Prediction Engine Unit Tests
 * Tests for dependency graph analysis and change impact assessment
 */

import { ImpactPredictionEngine } from '../../src/engines/impact-prediction-engine';
import {
  ChangeType,
  RiskLevel,
  ImpactType,
} from '../../src/types/impact.types';
import {
  mockCIs,
  mockDependencyGraph,
  mockAffectedCIs,
  createMockNeo4jSession,
  createMockNeo4jRecord,
  createMockPgClient,
} from '../fixtures/test-data';

// Mock dependencies
jest.mock('@cmdb/database');
jest.mock('uuid', () => ({ v4: () => 'impact-test-uuid' }));

import { getNeo4jClient, getPostgresClient } from '@cmdb/database';

describe('ImpactPredictionEngine', () => {
  let engine: ImpactPredictionEngine;
  let mockNeo4jClient: any;
  let mockPgClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNeo4jClient = {
      getSession: jest.fn(),
    };
    mockPgClient = createMockPgClient([]);

    (getNeo4jClient as jest.Mock).mockReturnValue(mockNeo4jClient);
    (getPostgresClient as jest.Mock).mockReturnValue(mockPgClient);

    engine = ImpactPredictionEngine.getInstance();
  });

  describe('predictChangeImpact', () => {
    it('should predict impact for database change with downstream dependencies', async () => {
      // Mock CI query
      const ciSession = createMockNeo4jSession([
        {
          id: mockCIs.database.id,
          name: mockCIs.database.name,
          ci_type: mockCIs.database.ci_type,
        },
      ]);

      // Mock downstream dependencies query
      const depSession = createMockNeo4jSession([
        {
          ci_id: mockCIs.webServer.id,
          ci_name: mockCIs.webServer.name,
          ci_type: mockCIs.webServer.ci_type,
          hop_count: 1,
          path_ids: [mockCIs.database.id, mockCIs.webServer.id],
        },
        {
          ci_id: mockCIs.loadBalancer.id,
          ci_name: mockCIs.loadBalancer.name,
          ci_type: mockCIs.loadBalancer.ci_type,
          hop_count: 2,
          path_ids: [mockCIs.database.id, mockCIs.webServer.id, mockCIs.loadBalancer.id],
        },
      ]);

      // Mock critical path query
      const pathSession = createMockNeo4jSession([
        {
          critical_path: [mockCIs.database.id, mockCIs.webServer.id, mockCIs.loadBalancer.id],
        },
      ]);

      mockNeo4jClient.getSession
        .mockReturnValueOnce(ciSession)
        .mockReturnValueOnce(depSession)
        .mockReturnValueOnce(pathSession)
        .mockReturnValue(createMockNeo4jSession([]));

      // Mock criticality scores
      mockPgClient.query
        .mockResolvedValueOnce({
          rows: [{
            ci_id: mockCIs.database.id,
            ci_name: mockCIs.database.name,
            criticality_score: 95,
            factors: {},
            calculated_at: new Date(),
          }],
        })
        .mockResolvedValue({ rows: [] });

      const impact = await engine.predictChangeImpact(
        mockCIs.database.id,
        ChangeType.VERSION_UPGRADE
      );

      expect(impact).toBeDefined();
      expect(impact.source_ci_id).toBe(mockCIs.database.id);
      expect(impact.change_type).toBe(ChangeType.VERSION_UPGRADE);
      expect(impact.blast_radius).toBe(2); // Web server + load balancer
      expect(impact.affected_cis).toHaveLength(2);
      expect(impact.risk_level).toBeDefined();
      expect(impact.impact_score).toBeGreaterThan(0);
    });

    it('should calculate CRITICAL risk for decommission with large blast radius', async () => {
      const ciSession = createMockNeo4jSession([
        {
          id: mockCIs.database.id,
          name: mockCIs.database.name,
          ci_type: mockCIs.database.ci_type,
        },
      ]);

      // Mock 60 affected CIs
      const affectedRecords = Array.from({ length: 60 }, (_, i) => ({
        ci_id: `ci-affected-${i}`,
        ci_name: `affected-server-${i}`,
        ci_type: 'server',
        hop_count: 1,
        path_ids: [mockCIs.database.id, `ci-affected-${i}`],
      }));

      const depSession = createMockNeo4jSession(affectedRecords);
      const pathSession = createMockNeo4jSession([
        { critical_path: [mockCIs.database.id, 'ci-affected-0'] },
      ]);

      mockNeo4jClient.getSession
        .mockReturnValueOnce(ciSession)
        .mockReturnValueOnce(depSession)
        .mockReturnValueOnce(pathSession)
        .mockReturnValue(createMockNeo4jSession([]));

      mockPgClient.query
        .mockResolvedValueOnce({
          rows: [{
            ci_id: mockCIs.database.id,
            criticality_score: 95,
            factors: {},
            calculated_at: new Date(),
          }],
        })
        .mockResolvedValue({ rows: [] });

      const impact = await engine.predictChangeImpact(
        mockCIs.database.id,
        ChangeType.DECOMMISSION
      );

      expect(impact.risk_level).toBe(RiskLevel.CRITICAL);
      expect(impact.blast_radius).toBe(60);
      expect(impact.estimated_downtime_minutes).toBeGreaterThan(0);
    });

    it('should calculate LOW risk for configuration change with minimal impact', async () => {
      const ciSession = createMockNeo4jSession([
        {
          id: mockCIs.webServer.id,
          name: mockCIs.webServer.name,
          ci_type: mockCIs.webServer.ci_type,
        },
      ]);

      // Only 1 affected CI
      const depSession = createMockNeo4jSession([
        {
          ci_id: mockCIs.loadBalancer.id,
          ci_name: mockCIs.loadBalancer.name,
          ci_type: mockCIs.loadBalancer.ci_type,
          hop_count: 1,
          path_ids: [mockCIs.webServer.id, mockCIs.loadBalancer.id],
        },
      ]);

      const pathSession = createMockNeo4jSession([
        { critical_path: [mockCIs.webServer.id, mockCIs.loadBalancer.id] },
      ]);

      mockNeo4jClient.getSession
        .mockReturnValueOnce(ciSession)
        .mockReturnValueOnce(depSession)
        .mockReturnValueOnce(pathSession)
        .mockReturnValue(createMockNeo4jSession([]));

      mockPgClient.query
        .mockResolvedValueOnce({
          rows: [{
            ci_id: mockCIs.webServer.id,
            criticality_score: 30,
            factors: {},
            calculated_at: new Date(),
          }],
        })
        .mockResolvedValue({ rows: [] });

      const impact = await engine.predictChangeImpact(
        mockCIs.webServer.id,
        ChangeType.CONFIGURATION_CHANGE
      );

      expect(impact.risk_level).toBe(RiskLevel.LOW);
      expect(impact.blast_radius).toBe(1);
    });

    it('should distinguish between direct and indirect impact', async () => {
      const ciSession = createMockNeo4jSession([
        {
          id: mockCIs.database.id,
          name: mockCIs.database.name,
          ci_type: mockCIs.database.ci_type,
        },
      ]);

      const depSession = createMockNeo4jSession([
        {
          ci_id: mockCIs.webServer.id,
          ci_name: mockCIs.webServer.name,
          ci_type: mockCIs.webServer.ci_type,
          hop_count: 1, // Direct
          path_ids: [mockCIs.database.id, mockCIs.webServer.id],
        },
        {
          ci_id: mockCIs.loadBalancer.id,
          ci_name: mockCIs.loadBalancer.name,
          ci_type: mockCIs.loadBalancer.ci_type,
          hop_count: 2, // Indirect
          path_ids: [mockCIs.database.id, mockCIs.webServer.id, mockCIs.loadBalancer.id],
        },
      ]);

      const pathSession = createMockNeo4jSession([
        { critical_path: [mockCIs.database.id, mockCIs.webServer.id] },
      ]);

      mockNeo4jClient.getSession
        .mockReturnValueOnce(ciSession)
        .mockReturnValueOnce(depSession)
        .mockReturnValueOnce(pathSession)
        .mockReturnValue(createMockNeo4jSession([]));

      mockPgClient.query
        .mockResolvedValueOnce({
          rows: [{
            ci_id: mockCIs.database.id,
            criticality_score: 80,
            factors: {},
            calculated_at: new Date(),
          }],
        })
        .mockResolvedValue({ rows: [] });

      const impact = await engine.predictChangeImpact(
        mockCIs.database.id,
        ChangeType.RESTART
      );

      const directImpact = impact.affected_cis.find(
        ci => ci.ci_id === mockCIs.webServer.id
      );
      const indirectImpact = impact.affected_cis.find(
        ci => ci.ci_id === mockCIs.loadBalancer.id
      );

      expect(directImpact?.impact_type).toBe(ImpactType.DIRECT);
      expect(directImpact?.hop_count).toBe(1);
      expect(directImpact?.impact_probability).toBe(90);

      expect(indirectImpact?.impact_type).toBe(ImpactType.INDIRECT);
      expect(indirectImpact?.hop_count).toBe(2);
      expect(indirectImpact?.impact_probability).toBeLessThan(90);
    });

    it('should throw error for non-existent CI', async () => {
      const ciSession = createMockNeo4jSession([]);

      mockNeo4jClient.getSession.mockReturnValue(ciSession);

      await expect(
        engine.predictChangeImpact('ci-nonexistent', ChangeType.RESTART)
      ).rejects.toThrow('CI not found');
    });
  });

  describe('calculateCriticalityScore', () => {
    it('should calculate high criticality for CI with many dependents', async () => {
      const depSession = createMockNeo4jSession([
        {
          ci_id: mockCIs.database.id,
          ci_name: mockCIs.database.name,
          dependent_count: 50, // Many CIs depend on this
          dependency_count: 0,
          dependent_ids: [],
        },
      ]);

      mockNeo4jClient.getSession.mockReturnValue(depSession);
      mockPgClient.query
        .mockResolvedValueOnce({ rows: [] }) // No cached score
        .mockResolvedValueOnce({ rows: [{ change_count: '5' }] }) // Change frequency
        .mockResolvedValue({ rows: [] });

      const score = await engine.getCriticalityScore(mockCIs.database.id);

      expect(score.criticality_score).toBeGreaterThan(70);
      expect(score.factors.dependent_count).toBe(50);
    });

    it('should calculate low criticality for isolated CI', async () => {
      const depSession = createMockNeo4jSession([
        {
          ci_id: 'ci-isolated',
          ci_name: 'isolated-server',
          dependent_count: 0,
          dependency_count: 0,
          dependent_ids: [],
        },
      ]);

      mockNeo4jClient.getSession.mockReturnValue(depSession);
      mockPgClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ change_count: '2' }] })
        .mockResolvedValue({ rows: [] });

      const score = await engine.getCriticalityScore('ci-isolated');

      expect(score.criticality_score).toBeLessThan(50);
      expect(score.factors.dependent_count).toBe(0);
    });

    it('should use cached criticality score if recent', async () => {
      const cachedScore = {
        ci_id: mockCIs.database.id,
        ci_name: mockCIs.database.name,
        criticality_score: 85,
        factors: {
          dependent_count: 40,
          dependent_weight: 100,
          change_frequency: 10,
          failure_history: 0,
          business_impact: 50,
        },
        calculated_at: new Date(),
      };

      mockPgClient.query.mockResolvedValueOnce({ rows: [cachedScore] });

      const score = await engine.getCriticalityScore(mockCIs.database.id);

      expect(score.criticality_score).toBe(85);
      expect(mockNeo4jClient.getSession).not.toHaveBeenCalled(); // Should not recalculate
    });

    it('should factor in change frequency (lower is better)', async () => {
      const depSession = createMockNeo4jSession([
        {
          ci_id: 'ci-stable',
          ci_name: 'stable-server',
          dependent_count: 10,
          dependency_count: 0,
          dependent_ids: [],
        },
      ]);

      mockNeo4jClient.getSession.mockReturnValue(depSession);
      mockPgClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ change_count: '1' }] }) // Very stable
        .mockResolvedValue({ rows: [] });

      const stableScore = await engine.getCriticalityScore('ci-stable');

      // Reset for unstable CI
      jest.clearAllMocks();

      const depSession2 = createMockNeo4jSession([
        {
          ci_id: 'ci-unstable',
          ci_name: 'unstable-server',
          dependent_count: 10,
          dependency_count: 0,
          dependent_ids: [],
        },
      ]);

      mockNeo4jClient.getSession.mockReturnValue(depSession2);
      mockPgClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ change_count: '50' }] }) // Very unstable
        .mockResolvedValue({ rows: [] });

      const unstableScore = await engine.getCriticalityScore('ci-unstable');

      // Stable CIs should have higher criticality (more reliable = more critical)
      expect(stableScore.criticality_score).toBeGreaterThan(unstableScore.criticality_score);
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build complete dependency graph', async () => {
      // Mock nodes query
      const nodesSession = createMockNeo4jSession(
        mockDependencyGraph.nodes.map(node => ({
          id: node.ci_id,
          name: node.ci_name,
          ci_type: node.ci_type,
          dependents_count: node.dependents_count,
          dependencies_count: node.dependencies_count,
        }))
      );

      // Mock edges query
      const edgesSession = {
        ...nodesSession,
        run: jest.fn()
          .mockResolvedValueOnce({
            records: mockDependencyGraph.nodes.map(node =>
              createMockNeo4jRecord({
                id: node.ci_id,
                name: node.ci_name,
                ci_type: node.ci_type,
                dependents_count: node.dependents_count,
                dependencies_count: node.dependencies_count,
              })
            ),
          })
          .mockResolvedValueOnce({
            records: mockDependencyGraph.edges.map(edge =>
              createMockNeo4jRecord({
                source_id: edge.source_id,
                target_id: edge.target_id,
                rel_type: edge.relationship_type,
              })
            ),
          }),
        close: jest.fn().mockResolvedValue(undefined),
      };

      mockNeo4jClient.getSession.mockReturnValue(edgesSession);

      // Mock criticality scores
      mockPgClient.query.mockImplementation((query: string, params: any[]) => {
        const ciId = params?.[0];
        const node = mockDependencyGraph.nodes.find(n => n.ci_id === ciId);
        if (node) {
          return Promise.resolve({
            rows: [{
              ci_id: node.ci_id,
              ci_name: node.ci_name,
              criticality_score: node.criticality,
              factors: {},
              calculated_at: new Date(),
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const graph = await engine.buildDependencyGraph(mockCIs.database.id, 3);

      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
      expect(graph.metadata.total_nodes).toBe(graph.nodes.length);
      expect(graph.metadata.total_edges).toBe(graph.edges.length);
      expect(graph.metadata.max_depth).toBe(3);
    });

    it('should respect max depth parameter', async () => {
      const session = createMockNeo4jSession([
        {
          id: mockCIs.database.id,
          name: mockCIs.database.name,
          ci_type: mockCIs.database.ci_type,
          dependents_count: 0,
          dependencies_count: 0,
        },
      ]);

      session.run = jest.fn()
        .mockResolvedValueOnce({
          records: [
            createMockNeo4jRecord({
              id: mockCIs.database.id,
              name: mockCIs.database.name,
              ci_type: mockCIs.database.ci_type,
              dependents_count: 0,
              dependencies_count: 0,
            }),
          ],
        })
        .mockResolvedValueOnce({ records: [] });

      mockNeo4jClient.getSession.mockReturnValue(session);
      mockPgClient.query.mockResolvedValue({
        rows: [{
          ci_id: mockCIs.database.id,
          criticality_score: 50,
          factors: {},
          calculated_at: new Date(),
        }],
      });

      const graph = await engine.buildDependencyGraph(mockCIs.database.id, 2);

      expect(graph.metadata.max_depth).toBe(2);
      // Query should use maxDepth in Cypher query
      expect(session.run).toHaveBeenCalledWith(
        expect.stringContaining('[*0..2]'),
        expect.any(Object)
      );
    });
  });

  describe('estimateDowntime', () => {
    it('should estimate downtime for RESTART', async () => {
      const ciSession = createMockNeo4jSession([
        {
          id: mockCIs.database.id,
          name: mockCIs.database.name,
          ci_type: mockCIs.database.ci_type,
        },
      ]);

      const depSession = createMockNeo4jSession(
        Array.from({ length: 10 }, (_, i) => ({
          ci_id: `ci-${i}`,
          ci_name: `server-${i}`,
          ci_type: 'server',
          hop_count: 1,
          path_ids: [mockCIs.database.id, `ci-${i}`],
        }))
      );

      const pathSession = createMockNeo4jSession([
        { critical_path: [mockCIs.database.id, 'ci-0'] },
      ]);

      mockNeo4jClient.getSession
        .mockReturnValueOnce(ciSession)
        .mockReturnValueOnce(depSession)
        .mockReturnValueOnce(pathSession)
        .mockReturnValue(createMockNeo4jSession([]));

      mockPgClient.query
        .mockResolvedValueOnce({
          rows: [{
            ci_id: mockCIs.database.id,
            criticality_score: 80,
            factors: {},
            calculated_at: new Date(),
          }],
        })
        .mockResolvedValue({ rows: [] });

      const impact = await engine.predictChangeImpact(
        mockCIs.database.id,
        ChangeType.RESTART
      );

      expect(impact.estimated_downtime_minutes).toBeDefined();
      expect(impact.estimated_downtime_minutes).toBeGreaterThan(0);
      // RESTART formula: 5 + blastRadius * 2
      expect(impact.estimated_downtime_minutes).toBe(5 + 10 * 2);
    });

    it('should estimate higher downtime for VERSION_UPGRADE', async () => {
      const ciSession = createMockNeo4jSession([
        {
          id: mockCIs.database.id,
          name: mockCIs.database.name,
          ci_type: mockCIs.database.ci_type,
        },
      ]);

      const depSession = createMockNeo4jSession([
        {
          ci_id: mockCIs.webServer.id,
          ci_name: mockCIs.webServer.name,
          ci_type: mockCIs.webServer.ci_type,
          hop_count: 1,
          path_ids: [mockCIs.database.id, mockCIs.webServer.id],
        },
      ]);

      const pathSession = createMockNeo4jSession([
        { critical_path: [mockCIs.database.id, mockCIs.webServer.id] },
      ]);

      mockNeo4jClient.getSession
        .mockReturnValueOnce(ciSession)
        .mockReturnValueOnce(depSession)
        .mockReturnValueOnce(pathSession)
        .mockReturnValue(createMockNeo4jSession([]));

      mockPgClient.query
        .mockResolvedValueOnce({
          rows: [{
            ci_id: mockCIs.database.id,
            criticality_score: 80,
            factors: {},
            calculated_at: new Date(),
          }],
        })
        .mockResolvedValue({ rows: [] });

      const impact = await engine.predictChangeImpact(
        mockCIs.database.id,
        ChangeType.VERSION_UPGRADE
      );

      // VERSION_UPGRADE formula: 30 + blastRadius * 5
      expect(impact.estimated_downtime_minutes).toBe(30 + 1 * 5);
    });

    it('should not estimate downtime for CONFIGURATION_CHANGE', async () => {
      const ciSession = createMockNeo4jSession([
        {
          id: mockCIs.webServer.id,
          name: mockCIs.webServer.name,
          ci_type: mockCIs.webServer.ci_type,
        },
      ]);

      const depSession = createMockNeo4jSession([]);
      const pathSession = createMockNeo4jSession([
        { critical_path: [mockCIs.webServer.id] },
      ]);

      mockNeo4jClient.getSession
        .mockReturnValueOnce(ciSession)
        .mockReturnValueOnce(depSession)
        .mockReturnValueOnce(pathSession)
        .mockReturnValue(createMockNeo4jSession([]));

      mockPgClient.query
        .mockResolvedValueOnce({
          rows: [{
            ci_id: mockCIs.webServer.id,
            criticality_score: 50,
            factors: {},
            calculated_at: new Date(),
          }],
        })
        .mockResolvedValue({ rows: [] });

      const impact = await engine.predictChangeImpact(
        mockCIs.webServer.id,
        ChangeType.CONFIGURATION_CHANGE
      );

      expect(impact.estimated_downtime_minutes).toBeUndefined();
    });
  });

  describe('change type weight', () => {
    it('should apply highest weight to DECOMMISSION', async () => {
      const ciSession = createMockNeo4jSession([
        {
          id: mockCIs.database.id,
          name: mockCIs.database.name,
          ci_type: mockCIs.database.ci_type,
        },
      ]);

      const depSession = createMockNeo4jSession([
        {
          ci_id: mockCIs.webServer.id,
          ci_name: mockCIs.webServer.name,
          ci_type: mockCIs.webServer.ci_type,
          hop_count: 1,
          path_ids: [mockCIs.database.id, mockCIs.webServer.id],
        },
      ]);

      const pathSession = createMockNeo4jSession([
        { critical_path: [mockCIs.database.id, mockCIs.webServer.id] },
      ]);

      mockNeo4jClient.getSession
        .mockReturnValueOnce(ciSession)
        .mockReturnValueOnce(depSession)
        .mockReturnValueOnce(pathSession)
        .mockReturnValue(createMockNeo4jSession([]));

      mockPgClient.query
        .mockResolvedValueOnce({
          rows: [{
            ci_id: mockCIs.database.id,
            criticality_score: 80,
            factors: {},
            calculated_at: new Date(),
          }],
        })
        .mockResolvedValue({ rows: [] });

      const decommissionImpact = await engine.predictChangeImpact(
        mockCIs.database.id,
        ChangeType.DECOMMISSION
      );

      // Reset mocks
      jest.clearAllMocks();

      mockNeo4jClient.getSession
        .mockReturnValueOnce(ciSession)
        .mockReturnValueOnce(depSession)
        .mockReturnValueOnce(pathSession)
        .mockReturnValue(createMockNeo4jSession([]));

      mockPgClient.query
        .mockResolvedValueOnce({
          rows: [{
            ci_id: mockCIs.database.id,
            criticality_score: 80,
            factors: {},
            calculated_at: new Date(),
          }],
        })
        .mockResolvedValue({ rows: [] });

      const configChangeImpact = await engine.predictChangeImpact(
        mockCIs.database.id,
        ChangeType.CONFIGURATION_CHANGE
      );

      // Decommission should have higher impact score than config change
      expect(decommissionImpact.impact_score).toBeGreaterThan(configChangeImpact.impact_score);
    });
  });
});
