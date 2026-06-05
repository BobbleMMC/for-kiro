import { useState, type FC } from 'react';
import { AlertTriangle, Lightbulb, RefreshCw, CheckCircle2, Copy, Check } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

interface ErrorFix {
  id: string;
  error: string;
  suggestion: string;
  fixedCode: string;
  language: string;
  explanation: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: number;
}

interface ErrorFixAssistantProps {
  error?: string;
  code?: string;
  language?: 'java' | 'json';
}

/**
 * Error Fix Assistant
 * AI-powered error resolution and code fixing
 */
export const ErrorFixAssistant: FC<ErrorFixAssistantProps> = ({
  error = '',
  code = '',
  language = 'java',
}) => {
  const [currentError, setCurrentError] = useState(error);
  const [currentCode, setCurrentCode] = useState(code);
  const [fixes, setFixes] = useState<ErrorFix[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFixId, setSelectedFixId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const selectedFix = selectedFixId ? fixes.find(f => f.id === selectedFixId) : null;

  const analyzeError = async () => {
    if (!currentError.trim()) return;

    setIsAnalyzing(true);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newFix: ErrorFix = {
      id: `fix_${Date.now()}`,
      error: currentError,
      suggestion: `Fix for: ${currentError.substring(0, 50)}...`,
      fixedCode: `// Fixed version\n${currentCode.substring(0, 200)}...`,
      language,
      explanation: `This error typically occurs when ${currentError.toLowerCase()}. The suggested fix improves code quality and prevents runtime issues.`,
      severity: currentError.includes('null') || currentError.includes('undefined') ? 'critical' : 'high',
      timestamp: Date.now(),
    };

    setFixes(prev => [newFix, ...prev]);
    setSelectedFixId(newFix.id);
    setCurrentError('');
    setIsAnalyzing(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getSeverityColor = (severity: ErrorFix['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Input */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-red-600" />
          Error Analysis
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Error Message</label>
            <textarea
              value={currentError}
              onChange={(e) => setCurrentError(e.target.value)}
              placeholder="Paste your error message here..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg resize-none font-mono text-sm"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Related Code (optional)</label>
            <textarea
              value={currentCode}
              onChange={(e) => setCurrentCode(e.target.value)}
              placeholder="Paste problematic code here..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg resize-none font-mono text-sm"
              rows={3}
            />
          </div>

          <Button
            onClick={analyzeError}
            disabled={!currentError.trim() || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Lightbulb size={16} className="mr-2" />
                Analyze Error
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Analysis Results */}
      {selectedFix && (
        <Card className={`p-6 border-2 ${getSeverityColor(selectedFix.severity)}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} />
                Fix Suggestion
              </h4>
              <p className="text-sm mt-1">{selectedFix.suggestion}</p>
            </div>
            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-semibold uppercase">
              {selectedFix.severity}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <h5 className="font-semibold text-sm mb-2">Explanation</h5>
              <p className="text-sm opacity-90">{selectedFix.explanation}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-sm">Fixed Code</h5>
                <Button
                  onClick={() => handleCopy(selectedFix.fixedCode, selectedFix.id)}
                  size="sm"
                  variant="outline"
                  className="!bg-white !dark:bg-gray-800"
                >
                  {copied === selectedFix.id ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                </Button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto font-mono text-xs">
                <code>{selectedFix.fixedCode}</code>
              </pre>
            </div>
          </div>
        </Card>
      )}

      {/* Fix History */}
      {fixes.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Fix History</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {fixes.map((fix) => (
              <button
                key={fix.id}
                onClick={() => setSelectedFixId(fix.id)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  selectedFixId === fix.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getSeverityColor(fix.severity)}`}>
                    {fix.severity}
                  </span>
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                    {fix.error.substring(0, 40)}...
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {new Date(fix.timestamp).toLocaleTimeString()}
                </p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {fixes.length === 0 && !selectedFix && (
        <Card className="p-8 text-center text-gray-600 dark:text-gray-400">
          <AlertTriangle size={32} className="mx-auto mb-3 opacity-50" />
          <p>Paste an error and click "Analyze Error" to get AI-powered fixes</p>
        </Card>
      )}
    </div>
  );
};

export default ErrorFixAssistant;
