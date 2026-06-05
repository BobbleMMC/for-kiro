/**
 * Build Pipeline Service
 * Handles Gradle build execution, compilation, and jar generation
 * Supports both Forge and Fabric loaders
 */

export type BuildLogLevel = 'info' | 'warning' | 'error' | 'success' | 'debug';
export type BuildStatus = 'idle' | 'running' | 'success' | 'failed' | 'cancelled';

export interface BuildLog {
  id: string;
  timestamp: number;
  level: BuildLogLevel;
  message: string;
  source?: string; // gradle, compiler, plugin, etc.
  lineNumber?: number;
  stackTrace?: string;
}

export interface BuildTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  duration: number;
  details?: string;
}

export interface BuildResult {
  success: boolean;
  buildId: string;
  status: BuildStatus;
  startTime: number;
  endTime: number;
  duration: number;
  logs: BuildLog[];
  tasks: BuildTask[];
  artifacts: BuildArtifact[];
  errorSummary?: {
    errorCount: number;
    warningCount: number;
    criticalErrors: string[];
  };
}

export interface BuildArtifact {
  id: string;
  name: string;
  path: string;
  size: number;
  type: 'jar' | 'sources' | 'javadoc' | 'other';
  timestamp: number;
}

export interface BuildConfig {
  modId: string;
  modName: string;
  modVersion: string;
  modGroup: string;
  loaderType: 'forge' | 'fabric' | 'neoforge' | 'quilt';
  minecraftVersion: string;
  javaVersion: string;
}

export interface BuildProgressCallback {
  onLog: (log: BuildLog) => void;
  onTaskUpdate: (task: BuildTask) => void;
  onProgress: (percentage: number) => void;
}

// Extract error details from compilation output
const extractErrorDetails = (logs: BuildLog[]) => {
  const errorLogs = logs.filter(l => l.level === 'error');
  const warningLogs = logs.filter(l => l.level === 'warning');

  const criticalErrors: string[] = [];
  errorLogs.forEach(log => {
    if (log.message && log.message.length > 0) {
      criticalErrors.push(log.message);
    }
  });

  return {
    errorCount: errorLogs.length,
    warningCount: warningLogs.length,
    criticalErrors: criticalErrors.slice(0, 5), // Keep top 5 errors
  };
};

/**
 * Build Pipeline Manager
 * Orchestrates the gradle build process
 */
export class BuildPipeline {
  private buildId: string;
  private startTime: number = 0;
  private logs: BuildLog[] = [];
  private tasks: BuildTask[] = [];
  private artifacts: BuildArtifact[] = [];
  private status: BuildStatus = 'idle';
  private progressCallback?: BuildProgressCallback;

  constructor() {
    this.buildId = `build_${Date.now()}`;
  }

  /**
   * Execute a build with the given configuration
   */
  async execute(config: BuildConfig, callback?: BuildProgressCallback): Promise<BuildResult> {
    this.buildId = `build_${Date.now()}`;
    this.startTime = Date.now();
    this.logs = [];
    this.tasks = [];
    this.artifacts = [];
    this.status = 'running';
    this.progressCallback = callback;

    try {
      // Log build start
      this.addLog('info', `Starting ${config.loaderType.toUpperCase()} build for ${config.modName} v${config.modVersion}`, 'pipeline');

      // Simulate gradle wrapper call
      await this.simulateGradleBuild(config);

      // Parse results
      const errorSummary = extractErrorDetails(this.logs);
      const hasErrors = errorSummary.errorCount > 0;

      if (hasErrors) {
        this.status = 'failed';
        this.addLog('error', `Build failed with ${errorSummary.errorCount} error(s)`, 'pipeline');
      } else {
        this.status = 'success';
        this.addLog('success', 'Build completed successfully', 'pipeline');
        await this.generateArtifacts(config);
      }

      return this.getResult();
    } catch (error) {
      this.status = 'failed';
      this.addLog('error', `Build error: ${error instanceof Error ? error.message : String(error)}`, 'pipeline');
      return this.getResult();
    }
  }

  /**
   * Simulate gradle build execution with realistic output
   */
  private async simulateGradleBuild(config: BuildConfig): Promise<void> {
    const buildTaskList = [
      { name: 'prepareWorkspace', label: 'Preparing workspace' },
      { name: 'downloadAssets', label: 'Downloading Minecraft assets' },
      { name: 'processSources', label: 'Processing source files' },
      { name: 'compileJava', label: 'Compiling Java sources' },
      { name: 'processResources', label: 'Processing resources' },
      { name: 'generateDataRun', label: 'Generating data' },
      { name: 'jar', label: 'Creating JAR file' },
      { name: 'reobf', label: 'Remapping classes (ObfuscationPlugin)' },
    ];

    for (const task of buildTaskList) {
      await this.executeTask(task.name, task.label, config);
    }
  }

  /**
   * Execute a single gradle task
   */
  private async executeTask(taskId: string, taskLabel: string, config: BuildConfig): Promise<void> {
    const taskStartTime = Date.now();

    // Create task record
    const task: BuildTask = {
      id: taskId,
      name: taskLabel,
      status: 'running',
      duration: 0,
    };
    this.tasks.push(task);
    this.progressCallback?.onTaskUpdate(task);

    // Add info log
    this.addLog('info', `> Task :${taskId}`, 'task');

    // Simulate task execution with realistic delays
    const delay = Math.random() * 1500 + 500; // 500-2000ms per task
    await new Promise(resolve => setTimeout(resolve, delay));

    // Randomly add some log messages based on task
    if (taskId === 'compileJava') {
      this.addLog('info', '[INFO] Compiling 42 source files', 'compiler');
      this.addLog('debug', '[DEBUG] Using Java 17 compiler', 'compiler');
    } else if (taskId === 'processResources') {
      this.addLog('info', '[INFO] Processing 128 resource files', 'resource');
    } else if (taskId === 'jar') {
      this.addLog('info', `[INFO] Building JAR: ${config.modId}-${config.modVersion}.jar`, 'jar');
    }

    // Mark task as complete
    task.status = 'success';
    task.duration = Date.now() - taskStartTime;
    this.progressCallback?.onTaskUpdate(task);

    // Update progress
    const buildTaskCount = 8; // Number of tasks in simulateGradleBuild
    const progress = (this.tasks.filter(t => t.status === 'success').length / buildTaskCount) * 100;
    this.progressCallback?.onProgress(Math.min(progress, 95)); // Cap at 95% until final

    this.addLog('success', `${taskLabel} completed in ${task.duration}ms`, 'task');
  }

  /**
   * Generate build artifacts
   */
  private async generateArtifacts(config: BuildConfig): Promise<void> {
    const timestamp = Date.now();
    const mainJarSize = Math.floor(Math.random() * 5000000 + 2000000); // 2-7 MB
    const sourcesJarSize = Math.floor(Math.random() * 1000000 + 500000); // 0.5-1.5 MB

    this.artifacts = [
      {
        id: `artifact_main_${timestamp}`,
        name: `${config.modId}-${config.modVersion}.jar`,
        path: `build/libs/${config.modId}-${config.modVersion}.jar`,
        size: mainJarSize,
        type: 'jar',
        timestamp,
      },
      {
        id: `artifact_sources_${timestamp}`,
        name: `${config.modId}-${config.modVersion}-sources.jar`,
        path: `build/libs/${config.modId}-${config.modVersion}-sources.jar`,
        size: sourcesJarSize,
        type: 'sources',
        timestamp,
      },
    ];

    this.addLog('info', `Generated artifact: ${this.artifacts[0].name} (${this.formatBytes(mainJarSize)})`, 'artifact');
    this.addLog('info', `Generated artifact: ${this.artifacts[1].name} (${this.formatBytes(sourcesJarSize)})`, 'artifact');
  }

  /**
   * Add a log message
   */
  private addLog(level: BuildLogLevel, message: string, source?: string): void {
    const log: BuildLog = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      level,
      message,
      source: source || 'system',
    };
    this.logs.push(log);
    this.progressCallback?.onLog(log);
  }

  /**
   * Get the current build result
   */
  private getResult(): BuildResult {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    const errorSummary = extractErrorDetails(this.logs);

    return {
      success: this.status === 'success',
      buildId: this.buildId,
      status: this.status,
      startTime: this.startTime,
      endTime,
      duration,
      logs: this.logs,
      tasks: this.tasks,
      artifacts: this.artifacts,
      errorSummary,
    };
  }

  /**
   * Cancel the current build
   */
  cancel(): void {
    this.status = 'cancelled';
    this.addLog('warning', 'Build cancelled by user', 'pipeline');
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

/**
 * Build History Manager
 * Tracks and stores build history
 */
export class BuildHistoryManager {
  private history: BuildResult[] = [];
  private maxHistorySize: number = 50;

  /**
   * Add a build result to history
   */
  addBuild(result: BuildResult): void {
    this.history.unshift(result);
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get all builds
   */
  getHistory(): BuildResult[] {
    return [...this.history];
  }

  /**
   * Get builds for a specific mod
   */
  getBuildsForMod(modId: string): BuildResult[] {
    return this.history.filter(b => {
      const firstLog = b.logs[0];
      return firstLog?.message?.includes(modId) || false;
    });
  }

  /**
   * Get the latest successful build
   */
  getLatestSuccessfulBuild(): BuildResult | undefined {
    return this.history.find(b => b.status === 'success');
  }

  /**
   * Get build statistics
   */
  getStatistics() {
    const total = this.history.length;
    const successful = this.history.filter(b => b.status === 'success').length;
    const failed = this.history.filter(b => b.status === 'failed').length;
    const cancelled = this.history.filter(b => b.status === 'cancelled').length;

    const totalDuration = this.history.reduce((sum, b) => sum + b.duration, 0);
    const avgDuration = total > 0 ? totalDuration / total : 0;

    return {
      total,
      successful,
      failed,
      cancelled,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDuration: avgDuration,
      totalDuration,
    };
  }

  /**
   * Clear build history
   */
  clear(): void {
    this.history = [];
  }
}

export default BuildPipeline;
