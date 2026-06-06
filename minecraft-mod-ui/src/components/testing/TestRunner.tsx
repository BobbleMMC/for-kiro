/**
 * Automated Testing Framework — Test Runner Dashboard
 * Unit tests, integration tests, performance benchmarks, regression detection
 * Inspired by Unity Test Runner + Jest
 */
import { useState, useCallback, type FC } from 'react';
import { FlaskConical, Play, CheckCircle, XCircle, Clock, AlertTriangle, RotateCcw, ChevronDown, ChevronRight, FileCode, Cpu, Gauge, Layers } from 'lucide-react';

type TestStatus = 'passed' | 'failed' | 'skipped' | 'running' | 'pending';
type TestCategory = 'unit' | 'integration' | 'performance' | 'regression';

interface TestResult {
  id: string;
  name: string;
  category: TestCategory;
  status: TestStatus;
  duration: number;
  error?: string;
  assertions: number;
}

interface TestSuite {
  id: string;
  name: string;
  category: TestCategory;
  tests: TestResult[];
  expanded: boolean;
}

// ==================== Mock Test Data ====================

const createMockSuites = (): TestSuite[] => [
  {
    id: 's1', name: 'Block Registry', category: 'unit', expanded: true,
    tests: [
      { id: 't1', name: 'should register custom block', category: 'unit', status: 'passed', duration: 12, assertions: 3 },
      { id: 't2', name: 'should set correct hardness', category: 'unit', status: 'passed', duration: 5, assertions: 1 },
      { id: 't3', name: 'should generate valid blockstate JSON', category: 'unit', status: 'passed', duration: 18, assertions: 5 },
      { id: 't4', name: 'should handle null texture path', category: 'unit', status: 'failed', duration: 8, assertions: 2, error: 'Expected non-null but got null at textureAll field' },
    ],
  },
  {
    id: 's2', name: 'Item Generation', category: 'unit', expanded: false,
    tests: [
      { id: 't5', name: 'should create item with correct stack size', category: 'unit', status: 'passed', duration: 6, assertions: 2 },
      { id: 't6', name: 'should apply enchantment glint', category: 'unit', status: 'passed', duration: 9, assertions: 1 },
      { id: 't7', name: 'should validate durability bounds', category: 'unit', status: 'skipped', duration: 0, assertions: 0 },
    ],
  },
  {
    id: 's3', name: 'Mod Loading Pipeline', category: 'integration', expanded: true,
    tests: [
      { id: 't8', name: 'should load mod without errors', category: 'integration', status: 'passed', duration: 1240, assertions: 8 },
      { id: 't9', name: 'should register all blocks in registry', category: 'integration', status: 'passed', duration: 340, assertions: 12 },
      { id: 't10', name: 'should fire initialization events', category: 'integration', status: 'failed', duration: 890, assertions: 4, error: 'FMLCommonSetupEvent not received within 5000ms timeout' },
    ],
  },
  {
    id: 's4', name: 'Visual Scripting Compile', category: 'integration', expanded: false,
    tests: [
      { id: 't11', name: 'should compile empty graph', category: 'integration', status: 'passed', duration: 45, assertions: 2 },
      { id: 't12', name: 'should generate valid Java from nodes', category: 'integration', status: 'passed', duration: 180, assertions: 6 },
      { id: 't13', name: 'should inject SafeGuard protections', category: 'integration', status: 'passed', duration: 95, assertions: 4 },
    ],
  },
  {
    id: 's5', name: 'TPS Benchmarks', category: 'performance', expanded: true,
    tests: [
      { id: 't14', name: 'onBlockBreak handler < 2ms', category: 'performance', status: 'passed', duration: 1800, assertions: 1 },
      { id: 't15', name: 'Entity tick loop < 5ms (100 entities)', category: 'performance', status: 'failed', duration: 2400, assertions: 1, error: 'Measured 7.2ms, exceeds 5ms threshold' },
      { id: 't16', name: 'Chunk load event < 10ms', category: 'performance', status: 'passed', duration: 950, assertions: 1 },
    ],
  },
  {
    id: 's6', name: 'Build Regression', category: 'regression', expanded: false,
    tests: [
      { id: 't17', name: 'generated code matches snapshot v1.2', category: 'regression', status: 'passed', duration: 220, assertions: 15 },
      { id: 't18', name: 'block properties unchanged', category: 'regression', status: 'passed', duration: 35, assertions: 8 },
      { id: 't19', name: 'recipe JSON output stable', category: 'regression', status: 'passed', duration: 28, assertions: 6 },
    ],
  },
];

// ==================== Main Component ====================

export const TestRunner: FC = () => {
  const [suites, setSuites] = useState<TestSuite[]>(createMockSuites());
  const [isRunning, setIsRunning] = useState(false);
  const [filter, setFilter] = useState<TestCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TestStatus | 'all'>('all');
  const [runHistory, setRunHistory] = useState<{ time: string; passed: number; failed: number; skipped: number }[]>([
    { time: '10:30', passed: 15, failed: 2, skipped: 1 },
    { time: '11:00', passed: 16, failed: 1, skipped: 1 },
    { time: '11:30', passed: 14, failed: 3, skipped: 1 },
    { time: '12:00', passed: 16, failed: 2, skipped: 1 },
  ]);

  // Compute totals
  const allTests = suites.flatMap(s => s.tests);
  const passed = allTests.filter(t => t.status === 'passed').length;
  const failed = allTests.filter(t => t.status === 'failed').length;
  const skipped = allTests.filter(t => t.status === 'skipped').length;
  const totalDuration = allTests.reduce((s, t) => s + t.duration, 0);

  // Run all tests (mock)
  const runTests = useCallback(async () => {
    setIsRunning(true);
    setSuites(prev => prev.map(s => ({ ...s, tests: s.tests.map(t => ({ ...t, status: 'running' as TestStatus })) })));

    // Simulate test execution
    for (const suite of suites) {
      for (const test of suite.tests) {
        await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
        setSuites(prev => prev.map(s => s.id === suite.id ? {
          ...s,
          tests: s.tests.map(t => t.id === test.id ? { ...t, status: Math.random() > 0.15 ? 'passed' : 'failed' } as TestResult : t),
        } : s));
      }
    }

    setIsRunning(false);
    setRunHistory(prev => [...prev, { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), passed: passed + Math.floor(Math.random() * 2), failed: Math.floor(Math.random() * 3), skipped }].slice(-10));
  }, [suites, passed, skipped]);

  const toggleSuite = (id: string) => setSuites(prev => prev.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s));

  // Filter suites
  const filteredSuites = suites
    .filter(s => filter === 'all' || s.category === filter)
    .map(s => ({
      ...s,
      tests: s.tests.filter(t => statusFilter === 'all' || t.status === statusFilter),
    }))
    .filter(s => s.tests.length > 0);

  const statusIcon = (status: TestStatus) => {
    switch (status) {
      case 'passed': return <CheckCircle size={11} className="text-green-400" />;
      case 'failed': return <XCircle size={11} className="text-red-400" />;
      case 'skipped': return <AlertTriangle size={11} className="text-yellow-400" />;
      case 'running': return <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />;
      default: return <Clock size={11} className="text-slate-500" />;
    }
  };

  const categoryIcon = (cat: TestCategory) => {
    switch (cat) {
      case 'unit': return <FileCode size={11} className="text-blue-400" />;
      case 'integration': return <Layers size={11} className="text-purple-400" />;
      case 'performance': return <Gauge size={11} className="text-green-400" />;
      case 'regression': return <Cpu size={11} className="text-orange-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900">
      {/* Header */}
      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-3">
        <FlaskConical size={16} className="text-green-400" />
        <span className="text-sm font-bold text-slate-100">Test Runner</span>
        <div className="flex-1" />
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isRunning ? 'bg-slate-700 text-slate-400' : 'bg-green-600 hover:bg-green-700 text-white'}`}
        >
          {isRunning ? <div className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin" /> : <Play size={12} />}
          {isRunning ? 'Running...' : 'Run All'}
        </button>
        <button onClick={() => setSuites(createMockSuites())} className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><RotateCcw size={14} /></button>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2 border-b border-slate-700 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <CheckCircle size={12} className="text-green-400" />
          <span className="text-xs text-green-400 font-bold">{passed}</span>
          <span className="text-[10px] text-slate-500">passed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle size={12} className="text-red-400" />
          <span className="text-xs text-red-400 font-bold">{failed}</span>
          <span className="text-[10px] text-slate-500">failed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={12} className="text-yellow-400" />
          <span className="text-xs text-yellow-400 font-bold">{skipped}</span>
          <span className="text-[10px] text-slate-500">skipped</span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-slate-400" />
          <span className="text-xs text-slate-300">{(totalDuration / 1000).toFixed(1)}s</span>
        </div>
        <div className="flex-1" />

        {/* Filters */}
        <select value={filter} onChange={e => setFilter(e.target.value as TestCategory | 'all')} className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white">
          <option value="all">All Categories</option>
          <option value="unit">Unit</option>
          <option value="integration">Integration</option>
          <option value="performance">Performance</option>
          <option value="regression">Regression</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as TestStatus | 'all')} className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white">
          <option value="all">All Status</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-800 flex">
        <div className="bg-green-500 transition-all" style={{ width: `${(passed / allTests.length) * 100}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${(failed / allTests.length) * 100}%` }} />
        <div className="bg-yellow-500 transition-all" style={{ width: `${(skipped / allTests.length) * 100}%` }} />
      </div>

      {/* Test list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {filteredSuites.map(suite => (
          <div key={suite.id} className="rounded-lg border border-slate-700 overflow-hidden">
            <button
              onClick={() => toggleSuite(suite.id)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 text-left"
            >
              {suite.expanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
              {categoryIcon(suite.category)}
              <span className="text-[11px] font-semibold text-slate-200 flex-1">{suite.name}</span>
              <span className="text-[9px] text-slate-500">{suite.tests.filter(t => t.status === 'passed').length}/{suite.tests.length}</span>
            </button>

            {suite.expanded && (
              <div className="border-t border-slate-700/50">
                {suite.tests.map(test => (
                  <div key={test.id} className={`flex items-start gap-2 px-4 py-2 border-b border-slate-700/30 last:border-0 ${test.status === 'failed' ? 'bg-red-950/10' : ''}`}>
                    {statusIcon(test.status)}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-300">{test.name}</div>
                      {test.error && (
                        <div className="text-[9px] text-red-400 mt-0.5 font-mono bg-red-950/30 px-2 py-1 rounded">{test.error}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {test.assertions > 0 && <span className="text-[8px] text-slate-500">{test.assertions} assert</span>}
                      {test.duration > 0 && <span className="text-[9px] text-slate-500 font-mono">{test.duration < 1000 ? `${test.duration}ms` : `${(test.duration / 1000).toFixed(1)}s`}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* History chart */}
      <div className="px-4 py-2 border-t border-slate-700 flex items-center gap-3">
        <span className="text-[9px] text-slate-500 font-bold uppercase">History:</span>
        <div className="flex items-end gap-1 h-5">
          {runHistory.map((run, i) => (
            <div key={i} className="flex flex-col gap-px" title={`${run.time}: ${run.passed}✓ ${run.failed}✗`}>
              <div className="w-3 bg-green-500 rounded-t-sm" style={{ height: `${Math.max(2, (run.passed / 20) * 16)}px` }} />
              {run.failed > 0 && <div className="w-3 bg-red-500 rounded-b-sm" style={{ height: `${Math.max(2, (run.failed / 5) * 8)}px` }} />}
            </div>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-[9px] text-slate-500">{allTests.length} tests · {suites.length} suites</span>
      </div>
    </div>
  );
};
