import { BuildPipeline, BuildHistoryManager, type BuildConfig, type BuildResult } from '../../services/buildPipeline';

describe('BuildPipeline', () => {
  let pipeline: BuildPipeline;
  let config: BuildConfig;

  beforeEach(() => {
    pipeline = new BuildPipeline();
    config = {
      modId: 'testmod',
      modName: 'Test Mod',
      modVersion: '1.0.0',
      modGroup: 'com.test',
      loaderType: 'forge',
      minecraftVersion: '1.20.1',
      javaVersion: '17',
    };
  });

  it('should execute build and return result', async () => {
    const result = await pipeline.execute(config);

    expect(result).toBeDefined();
    expect(result.buildId).toBeDefined();
    expect(result.status).toBe('success');
    expect(result.success).toBe(true);
    expect(result.logs.length).toBeGreaterThan(0);
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThan(0);
  }, 15000);

  it('should generate artifacts on successful build', async () => {
    const result = await pipeline.execute(config);

    expect(result.artifacts.length).toBe(2); // jar + sources
    expect(result.artifacts[0].name).toContain(config.modId);
    expect(result.artifacts[0].type).toBe('jar');
    expect(result.artifacts[1].type).toBe('sources');
    expect(result.artifacts[0].size).toBeGreaterThan(0);
  }, 15000);

  it('should include error summary on success', async () => {
    const result = await pipeline.execute(config);

    expect(result.errorSummary).toBeDefined();
    expect(result.errorSummary!.errorCount).toBe(0);
    expect(result.errorSummary!.warningCount).toBe(0);
    expect(result.errorSummary!.criticalErrors.length).toBe(0);
  }, 15000);
});

describe('BuildHistoryManager', () => {
  let manager: BuildHistoryManager;
  let config: BuildConfig;

  beforeEach(() => {
    manager = new BuildHistoryManager();
    config = {
      modId: 'testmod',
      modName: 'Test Mod',
      modVersion: '1.0.0',
      modGroup: 'com.test',
      loaderType: 'forge',
      minecraftVersion: '1.20.1',
      javaVersion: '17',
    };
  });

  it('should return empty array initially', () => {
    const history = manager.getHistory();
    expect(history.length).toBe(0);
  });

  it('should add and retrieve builds', async () => {
    const pipeline = new BuildPipeline();
    const result = await pipeline.execute(config);

    manager.addBuild(result);

    const history = manager.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].buildId).toBe(result.buildId);
  }, 15000);

  it('should get latest successful build', async () => {
    const pipeline = new BuildPipeline();
    const result = await pipeline.execute(config);

    manager.addBuild(result);

    const latest = manager.getLatestSuccessfulBuild();
    expect(latest).toBeDefined();
    expect(latest!.buildId).toBe(result.buildId);
  }, 15000);

  it('should calculate correct statistics', async () => {
    const pipeline = new BuildPipeline();
    const result = await pipeline.execute(config);

    manager.addBuild(result);

    const stats = manager.getStatistics();
    expect(stats.total).toBe(1);
    expect(stats.successful).toBe(1);
    expect(stats.failed).toBe(0);
    expect(stats.successRate).toBe(100);
  }, 15000);

  it('should clear history', async () => {
    const pipeline = new BuildPipeline();
    const result = await pipeline.execute(config);

    manager.addBuild(result);
    expect(manager.getHistory().length).toBe(1);

    manager.clear();
    expect(manager.getHistory().length).toBe(0);
  }, 15000);
});

describe('Integration Tests', () => {
  it('should handle complete build workflow', async () => {
    const config: BuildConfig = {
      modId: 'integrationtest',
      modName: 'Integration Test Mod',
      modVersion: '1.0.0',
      modGroup: 'com.integration.test',
      loaderType: 'fabric',
      minecraftVersion: '1.20.4',
      javaVersion: '21',
    };

    const pipeline = new BuildPipeline();
    const manager = new BuildHistoryManager();

    // Execute first build
    const result1 = await pipeline.execute(config);
    expect(result1.success).toBe(true);
    expect(result1.status).toBe('success');

    manager.addBuild(result1);

    // Verify artifacts
    expect(result1.artifacts.length).toBeGreaterThan(0);
    const jarArtifact = result1.artifacts.find(a => a.type === 'jar');
    expect(jarArtifact).toBeDefined();
    expect(jarArtifact!.name).toContain(config.modId);

    // Verify history
    const history = manager.getHistory();
    expect(history.length).toBe(1);

    // Verify statistics
    const stats = manager.getStatistics();
    expect(stats.total).toBe(1);
    expect(stats.successful).toBe(1);
    expect(stats.successRate).toBe(100);
  }, 30000);

  it('should generate valid artifact information', async () => {
    const config: BuildConfig = {
      modId: 'artifacttest',
      modName: 'Artifact Test',
      modVersion: '2.5.1',
      modGroup: 'com.artifact.test',
      loaderType: 'forge',
      minecraftVersion: '1.20.1',
      javaVersion: '17',
    };

    const pipeline = new BuildPipeline();
    const result = await pipeline.execute(config);

    // Verify JAR artifact
    const jarArtifact = result.artifacts.find(a => a.type === 'jar');
    expect(jarArtifact).toBeDefined();
    expect(jarArtifact!.name).toMatch(/artifacttest-2\.5\.1\.jar/);
    expect(jarArtifact!.size).toBeGreaterThan(2000000); // > 2MB
    expect(jarArtifact!.size).toBeLessThan(10000000); // < 10MB
    expect(jarArtifact!.path).toContain('build/libs/');
    expect(jarArtifact!.timestamp).toBeGreaterThan(0);

    // Verify sources artifact
    const sourcesArtifact = result.artifacts.find(a => a.type === 'sources');
    expect(sourcesArtifact).toBeDefined();
    expect(sourcesArtifact!.name).toMatch(/artifacttest-2\.5\.1-sources\.jar/);
    expect(sourcesArtifact!.size).toBeGreaterThan(500000); // > 0.5MB
  }, 15000);
});
