import { useState, type FC } from 'react';
import { Copy, Check, Download, Settings2, Zap } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

interface CodeBlock {
  id: string;
  language: 'java' | 'json' | 'gradle' | 'xml';
  name: string;
  code: string;
  timestamp: number;
  source?: string;
}

interface CodeGenViewerProps {
  code?: string;
  language?: string;
  showHistory?: boolean;
}

/**
 * Code Generation Viewer
 * Displays real-time AI-generated code with formatting and copy options
 */
export const CodeGenViewer: FC<CodeGenViewerProps> = ({
  code = '',
  language = 'java',
  showHistory = true,
}) => {
  const [codeHistory, setCodeHistory] = useState<CodeBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [autoFormat, setAutoFormat] = useState(true);

  const selectedBlock = selectedBlockId
    ? codeHistory.find(b => b.id === selectedBlockId)
    : null;

  const addCodeBlock = (newCode: string, lang: string, name: string) => {
    const block: CodeBlock = {
      id: `block_${Date.now()}`,
      language: lang as any,
      name,
      code: newCode,
      timestamp: Date.now(),
    };
    setCodeHistory(prev => [block, ...prev]);
    setSelectedBlockId(block.id);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = (code: string, lang: string, name: string) => {
    const ext = lang === 'json' ? 'json' : lang === 'gradle' ? 'gradle' : lang === 'xml' ? 'xml' : 'java';
    const filename = `${name}.${ext}`;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCode = (code: string, lang: string): string => {
    if (!autoFormat) return code;
    
    let formatted = code;
    
    // Basic Java formatting
    if (lang === 'java') {
      formatted = formatted.replace(/{\s*$/gm, ' {');
      formatted = formatted.replace(/^\s+/gm, (match) => {
        const tabCount = Math.floor(match.length / 2);
        return '  '.repeat(tabCount);
      });
    }
    
    // JSON formatting
    if (lang === 'json') {
      try {
        formatted = JSON.stringify(JSON.parse(code), null, 2);
      } catch {
        // Keep original if parse fails
      }
    }
    
    return formatted;
  };

  const displayCode = selectedBlock
    ? formatCode(selectedBlock.code, selectedBlock.language)
    : formatCode(code, language);

  return (
    <div className="space-y-6">
      {/* Main Code Display */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Generated Code</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {selectedBlock ? `${selectedBlock.name} (${selectedBlock.language})` : `Language: ${language}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setAutoFormat(!autoFormat)}
              variant="outline"
              size="sm"
              title="Toggle auto-format"
            >
              <Settings2 size={14} />
            </Button>
            <Button
              onClick={() => handleCopy(displayCode, 'main')}
              variant="outline"
              size="sm"
            >
              {copied === 'main' ? <Check size={14} /> : <Copy size={14} />}
            </Button>
            <Button
              onClick={() => handleDownload(displayCode, language, 'generated')}
              size="sm"
            >
              <Download size={14} className="mr-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Code Display */}
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
            <code>{displayCode || '// No code generated yet'}</code>
          </pre>
        </div>

        {/* Line Count & Info */}
        <div className="flex justify-between items-center mt-3 text-xs text-gray-600 dark:text-gray-400">
          <div>
            {displayCode.split('\n').length} lines •{' '}
            {displayCode.length} characters
          </div>
          {selectedBlock && (
            <div>
              Generated {new Date(selectedBlock.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      </Card>

      {/* Code History */}
      {showHistory && codeHistory.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap size={20} />
            Generation History
          </h4>
          <div className="space-y-2">
            {codeHistory.map((block) => (
              <button
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  selectedBlockId === block.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sm">{block.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {block.language} • {block.code.split('\n').length} lines •{' '}
                      {new Date(block.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(block.code, block.id);
                      }}
                      className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
                      title="Copy"
                    >
                      {copied === block.id ? (
                        <Check size={14} className="text-green-600" />
                      ) : (
                        <Copy size={14} className="text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(block.code, block.language, block.name);
                      }}
                      className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
                      title="Download"
                    >
                      <Download size={14} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => addCodeBlock('// Add your code here', 'java', 'New Block')}
            variant="outline"
            className="w-full"
          >
            Add Block
          </Button>
          <Button
            onClick={() => {
              setCodeHistory([]);
              setSelectedBlockId(null);
            }}
            variant="outline"
            className="w-full text-red-600 dark:text-red-400"
          >
            Clear History
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CodeGenViewer;
