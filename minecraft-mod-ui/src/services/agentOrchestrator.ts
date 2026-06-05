/**
 * Agent Orchestrator Service
 * Coordinates multi-agent task execution and workflow management
 */

export type AgentType = 'architect' | 'logic' | 'ui' | 'reviewer' | 'optimizer';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface AgentCapability {
  name: string;
  description: string;
  maxConcurrent: number;
}

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  status: 'idle' | 'busy' | 'error';
  capabilities: AgentCapability[];
  currentTask?: string;
  tasksCompleted: number;
  averageTaskDuration: number;
  errorCount: number;
  successRate: number;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  type: 'code_generation' | 'code_review' | 'optimization' | 'bug_fix' | 'documentation';
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgent?: AgentType;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  retryCount: number;
  maxRetries: number;
  dependencies: string[]; // Task IDs this depends on
  blockedBy: string[]; // Task IDs blocking this
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  duration: number;
  agentUsed: AgentType;
  tokensUsed: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  maxParallelTasks: number;
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  duration?: number;
  taskResults: Map<string, TaskResult>;
  totalTokensUsed: number;
  agentUsageStats: Map<AgentType, { count: number; avgDuration: number }>;
}

/**
 * Agent Orchestrator
 * Manages multi-agent coordination and task execution
 */
export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private workflows: Map<string, WorkflowExecution> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();
  private taskQueue: string[] = [];

  constructor() {
    this.initializeAgents();
  }

  /**
   * Initialize default agents
   */
  private initializeAgents(): void {
    const agentConfigs = [
      {
        type: 'architect' as AgentType,
        name: 'Architecture Agent',
        description: 'Designs mod architecture and structure',
        capabilities: [
          { name: 'structural_design', description: 'Design mod structure', maxConcurrent: 1 },
          { name: 'dependency_analysis', description: 'Analyze dependencies', maxConcurrent: 2 },
        ],
      },
      {
        type: 'logic' as AgentType,
        name: 'Logic Agent',
        description: 'Implements game logic and mechanics',
        capabilities: [
          { name: 'code_generation', description: 'Generate Java code', maxConcurrent: 3 },
          { name: 'recipe_design', description: 'Design recipes', maxConcurrent: 3 },
        ],
      },
      {
        type: 'ui' as AgentType,
        name: 'UI Agent',
        description: 'Handles UI and configuration files',
        capabilities: [
          { name: 'json_generation', description: 'Generate JSON files', maxConcurrent: 4 },
          { name: 'resource_creation', description: 'Create resources', maxConcurrent: 3 },
        ],
      },
      {
        type: 'reviewer' as AgentType,
        name: 'Reviewer Agent',
        description: 'Reviews and validates generated code',
        capabilities: [
          { name: 'code_review', description: 'Review Java code', maxConcurrent: 2 },
          { name: 'validation', description: 'Validate syntax', maxConcurrent: 3 },
        ],
      },
      {
        type: 'optimizer' as AgentType,
        name: 'Optimizer Agent',
        description: 'Optimizes code and performance',
        capabilities: [
          { name: 'performance_optimization', description: 'Optimize performance', maxConcurrent: 2 },
          { name: 'refactoring', description: 'Refactor code', maxConcurrent: 2 },
        ],
      },
    ];

    agentConfigs.forEach(config => {
      const agent: Agent = {
        id: `agent_${config.type}`,
        type: config.type,
        name: config.name,
        description: config.description,
        status: 'idle',
        capabilities: config.capabilities,
        tasksCompleted: 0,
        averageTaskDuration: 0,
        errorCount: 0,
        successRate: 100,
      };
      this.agents.set(agent.id, agent);
    });
  }

  /**
   * Get all agents
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by type
   */
  getAgent(type: AgentType): Agent | undefined {
    return this.agents.get(`agent_${type}`);
  }

  /**
   * Create a new task
   */
  createTask(
    name: string,
    type: Task['type'],
    input: Record<string, unknown>,
    options?: {
      priority?: TaskPriority;
      dependencies?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Task {
    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `${type} task`,
      type,
      status: 'pending',
      priority: options?.priority || 'medium',
      input,
      retryCount: 0,
      maxRetries: 3,
      dependencies: options?.dependencies || [],
      blockedBy: [],
      createdAt: Date.now(),
      metadata: options?.metadata,
    };

    this.tasks.set(task.id, task);
    this.taskQueue.push(task.id);
    this.emit('task:created', task);

    return task;
  }

  /**
   * Assign task to agent
   */
  assignTask(taskId: string, agentType: AgentType): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.assignedAgent = agentType;
    task.status = 'running';
    task.startTime = Date.now();

    const agent = this.getAgent(agentType);
    if (agent) {
      agent.status = 'busy';
      agent.currentTask = taskId;
    }

    this.emit('task:assigned', { taskId, agentType });
    return true;
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, output: Record<string, unknown>, tokensUsed: number = 0): TaskResult {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'completed';
    task.endTime = Date.now();
    task.duration = task.endTime - (task.startTime || Date.now());
    task.output = output;

    const agent = task.assignedAgent ? this.getAgent(task.assignedAgent) : undefined;
    if (agent) {
      agent.status = 'idle';
      agent.currentTask = undefined;
      agent.tasksCompleted++;
      agent.averageTaskDuration =
        (agent.averageTaskDuration * (agent.tasksCompleted - 1) + task.duration) /
        agent.tasksCompleted;
      agent.successRate = (agent.tasksCompleted / (agent.tasksCompleted + agent.errorCount)) * 100;
    }

    const result: TaskResult = {
      taskId,
      success: true,
      output,
      duration: task.duration,
      agentUsed: task.assignedAgent || 'logic',
      tokensUsed,
    };

    this.emit('task:completed', result);
    return result;
  }

  /**
   * Fail a task
   */
  failTask(taskId: string, error: string): TaskResult {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'failed';
    task.error = error;
    task.endTime = Date.now();
    task.duration = task.endTime - (task.startTime || Date.now());

    const agent = task.assignedAgent ? this.getAgent(task.assignedAgent) : undefined;
    if (agent) {
      agent.status = 'idle';
      agent.currentTask = undefined;
      agent.errorCount++;
      agent.successRate = (agent.tasksCompleted / (agent.tasksCompleted + agent.errorCount)) * 100;
    }

    const result: TaskResult = {
      taskId,
      success: false,
      error,
      duration: task.duration,
      agentUsed: task.assignedAgent || 'logic',
      tokensUsed: 0,
    };

    this.emit('task:failed', result);
    return result;
  }

  /**
   * Get task
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === status);
  }

  /**
   * Create and start a workflow
   */
  createWorkflow(definition: WorkflowDefinition): WorkflowExecution {
    const execution: WorkflowExecution = {
      id: `workflow_${Date.now()}`,
      workflowId: definition.id,
      status: 'running',
      startTime: Date.now(),
      taskResults: new Map(),
      totalTokensUsed: 0,
      agentUsageStats: new Map(),
    };

    this.workflows.set(execution.id, execution);
    this.emit('workflow:started', execution);

    return execution;
  }

  /**
   * Get workflow execution
   */
  getWorkflow(workflowId: string): WorkflowExecution | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStats() {
    const totalTasks = this.tasks.size;
    const completedTasks = this.getTasksByStatus('completed').length;
    const failedTasks = this.getTasksByStatus('failed').length;
    const runningTasks = this.getTasksByStatus('running').length;
    const pendingTasks = this.getTasksByStatus('pending').length;

    const agents = this.getAgents();
    const avgSuccessRate =
      agents.length > 0
        ? agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length
        : 0;

    return {
      totalTasks,
      completedTasks,
      failedTasks,
      runningTasks,
      pendingTasks,
      successRate: completedTasks / Math.max(totalTasks, 1) * 100,
      agentHealthScore: avgSuccessRate,
      agents: agents.map(a => ({
        type: a.type,
        status: a.status,
        tasksCompleted: a.tasksCompleted,
        errorCount: a.errorCount,
        successRate: a.successRate,
      })),
    };
  }

  /**
   * Get optimal agent for task
   */
  selectAgent(taskType: Task['type']): AgentType {
    // Simple selection based on task type
    const typeAgentMap: Record<Task['type'], AgentType> = {
      code_generation: 'logic',
      code_review: 'reviewer',
      optimization: 'optimizer',
      bug_fix: 'logic',
      documentation: 'ui',
    };

    return typeAgentMap[taskType] || 'logic';
  }

  /**
   * Event system
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in event handler for ${event}:`, err);
        }
      });
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.tasks.clear();
    this.workflows.clear();
    this.taskQueue = [];
  }

  /**
   * Get task queue
   */
  getTaskQueue(): string[] {
    return [...this.taskQueue];
  }

  /**
   * Remove task from queue
   */
  dequeueTask(): string | undefined {
    return this.taskQueue.shift();
  }

  /**
   * Check if task dependencies are resolved
   */
  areDependenciesResolved(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.dependencies.length === 0) return true;

    return task.dependencies.every(depId => {
      const depTask = this.tasks.get(depId);
      return depTask?.status === 'completed';
    });
  }

  /**
   * Get blocked tasks
   */
  getBlockedTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(
      t => t.blockedBy.length > 0 && t.status === 'pending'
    );
  }

  /**
   * Get ready tasks (dependencies resolved, not blocked)
   */
  getReadyTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(
      t => t.status === 'pending' && this.areDependenciesResolved(t.id)
    );
  }
}

/**
 * Singleton instance
 */
export const agentOrchestrator = new AgentOrchestrator();

export default AgentOrchestrator;
