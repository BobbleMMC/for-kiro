import { useState, useEffect, type FC } from 'react';
import { RefreshCw, Pause, Play, AlertCircle, CheckCircle2, Loader, Zap, BarChart3, Clock } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { agentOrchestrator, type Agent, type Task, type AgentType } from '../../services/agentOrchestrator';

interface AgentTaskDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Agent Task Dashboard
 * Real-time monitoring of multi-agent task execution
 */
export const AgentTaskDashboard: FC<AgentTaskDashboardProps> = ({
  autoRefresh = true,
  refreshInterval = 2000,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Refresh data
  const refreshData = () => {
    setAgents(agentOrchestrator.getAgents());
    setTasks(agentOrchestrator.getAllTasks());
    setStats(agentOrchestrator.getWorkflowStats());
  };

  useEffect(() => {
    refreshData();

    if (!autoRefresh || isPaused) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isPaused]);

  // Listen for events
  useEffect(() => {
    const handleTaskUpdate = () => refreshData();

    agentOrchestrator.on('task:created', handleTaskUpdate);
    agentOrchestrator.on('task:assigned', handleTaskUpdate);
    agentOrchestrator.on('task:completed', handleTaskUpdate);
    agentOrchestrator.on('task:failed', handleTaskUpdate);

    return () => {
      agentOrchestrator.off('task:created', handleTaskUpdate);
      agentOrchestrator.off('task:assigned', handleTaskUpdate);
      agentOrchestrator.off('task:completed', handleTaskUpdate);
      agentOrchestrator.off('task:failed', handleTaskUpdate);
    };
  }, []);

  const getAgentStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'idle':
        return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
      case 'busy':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    }
  };

  const getTaskStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-green-600" />;
      case 'running':
        return <Loader size={16} className="text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle size={16} className="text-red-600" />;
      case 'pending':
        return <Clock size={16} className="text-gray-600" />;
      default:
        return <Zap size={16} className="text-yellow-600" />;
    }
  };

  const getTaskStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'running':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'pending':
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    }
  };

  const filteredTasks = selectedAgent
    ? tasks.filter(t => t.assignedAgent === selectedAgent)
    : tasks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Agent Task Dashboard</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time multi-agent task orchestration monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsPaused(!isPaused)}
            variant="outline"
            size="sm"
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </Button>
          <Button
            onClick={refreshData}
            variant="outline"
            size="sm"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.totalTasks}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Tasks</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.completedTasks}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Completed</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.runningTasks}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Running</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{stats.failedTasks}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Failed</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {Math.round(stats.successRate)}%
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Success Rate</p>
          </Card>
        </div>
      )}

      {/* Agents Status */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4">Agents</h4>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(selectedAgent === agent.type ? null : agent.type)}
              className={`p-4 rounded-lg border-2 transition-all ${getAgentStatusColor(agent.status)} ${
                selectedAgent === agent.type ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm">{agent.name}</div>
                <div className={`w-2 h-2 rounded-full ${
                  agent.status === 'idle' ? 'bg-green-600' : 
                  agent.status === 'busy' ? 'bg-blue-600' : 
                  'bg-red-600'
                }`} />
              </div>
              <div className="text-xs space-y-1 text-left">
                <p>Status: {agent.status}</p>
                <p>Completed: {agent.tasksCompleted}</p>
                <p>Success: {Math.round(agent.successRate)}%</p>
                <p>Errors: {agent.errorCount}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Task List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">
            Tasks {selectedAgent && `(${selectedAgent})`}
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No tasks {selectedAgent ? `for ${selectedAgent}` : 'yet'}
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border-2 ${getTaskStatusColor(task.status)}`}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getTaskStatusIcon(task.status)}
                  </div>

                  {/* Task Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{task.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                        {task.type}
                      </span>
                      {task.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          task.priority === 'critical' ? 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100' :
                          task.priority === 'high' ? 'bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100' :
                          task.priority === 'medium' ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100' :
                          'bg-gray-200 dark:bg-gray-700'
                        }`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>

                    {/* Task Details */}
                    <div className="grid grid-cols-4 gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <div>
                        <span className="font-semibold">Agent:</span> {task.assignedAgent || 'unassigned'}
                      </div>
                      <div>
                        <span className="font-semibold">Status:</span> {task.status}
                      </div>
                      {task.duration && (
                        <div>
                          <span className="font-semibold">Duration:</span> {(task.duration / 1000).toFixed(1)}s
                        </div>
                      )}
                      {task.error && (
                        <div className="col-span-4 text-red-600 dark:text-red-400">
                          <span className="font-semibold">Error:</span> {task.error}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  {task.status === 'running' && (
                    <div className="flex-shrink-0">
                      <Loader size={16} className="animate-spin text-blue-600" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Agent Statistics */}
      {stats && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Agent Performance
          </h4>
          <div className="space-y-3">
            {stats.agents.map((agent: any) => (
              <div key={agent.type} className="flex items-center gap-4">
                <div className="w-24 font-semibold text-sm capitalize">{agent.type}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-600 h-full transition-all"
                        style={{ width: `${agent.successRate}%` }}
                      />
                    </div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 min-w-[50px] text-right">
                      {Math.round(agent.successRate)}%
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 min-w-[100px] text-right">
                  {agent.tasksCompleted} completed • {agent.errorCount} errors
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AgentTaskDashboard;
