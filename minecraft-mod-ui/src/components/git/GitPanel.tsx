/**
 * Git Integration Panel
 * Built-in version control with visual diff, branch management, commit history
 * Inspired by VS Code Git sidebar and JetBrains commit tool
 */
import { useState, useCallback, type FC } from 'react';
import {
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Plus,
  Minus,
  FileText,
  Check,
  RefreshCw,
  Upload,
  Download,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Diff,
} from 'lucide-react';

// ==================== Types ====================

interface GitFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
  staged: boolean;
}

interface GitCommitEntry {
  hash: string;
  message: string;
  author: string;
  date: string;
  branch?: string;
}

type GitTab = 'changes' | 'history' | 'branches';

// ==================== Mock Data ====================

const mockFiles: GitFile[] = [
  { path: 'src/blocks/CustomBlock.java', status: 'modified', staged: true },
  { path: 'src/items/MagicSword.java', status: 'added', staged: true },
  { path: 'resources/textures/block_ore.png', status: 'modified', staged: false },
  { path: 'resources/models/block_ore.json', status: 'modified', staged: false },
  { path: 'src/events/PlayerHandler.java', status: 'deleted', staged: false },
  { path: 'build.gradle', status: 'modified', staged: false },
];

const mockHistory: GitCommitEntry[] = [
  { hash: 'a849a9a', message: 'feat: Add 3D model editor and pixel canvas', author: 'BobbleMMC', date: '2 hours ago', branch: 'feat/tauri-v2-migration' },
  { hash: '454c298', message: 'feat: Migrate to Tauri v2 + Visual Node Editor', author: 'BobbleMMC', date: '3 hours ago' },
  { hash: 'b7f2c11', message: 'fix: Recipe editor cook time validation', author: 'BobbleMMC', date: '1 day ago' },
  { hash: '9e3d4a2', message: 'feat: Entity editor with loot drops', author: 'BobbleMMC', date: '2 days ago' },
  { hash: 'c1a8b93', message: 'chore: Update dependencies', author: 'BobbleMMC', date: '3 days ago', branch: 'main' },
];

const mockBranches = [
  { name: 'feat/tauri-v2-migration', current: true, ahead: 3, behind: 0 },
  { name: 'main', current: false, ahead: 0, behind: 0 },
  { name: 'feat/phase-1-dockable', current: false, ahead: 0, behind: 2 },
  { name: 'fix/recipe-editor', current: false, ahead: 1, behind: 1 },
];

// ==================== Status Badge ====================

const statusColors: Record<GitFile['status'], { bg: string; text: string; letter: string }> = {
  modified: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', letter: 'M' },
  added: { bg: 'bg-green-900/30', text: 'text-green-400', letter: 'A' },
  deleted: { bg: 'bg-red-900/30', text: 'text-red-400', letter: 'D' },
  untracked: { bg: 'bg-slate-700', text: 'text-slate-400', letter: 'U' },
  renamed: { bg: 'bg-blue-900/30', text: 'text-blue-400', letter: 'R' },
};

// ==================== Main Component ====================

export const GitPanel: FC = () => {
  const [activeTab, setActiveTab] = useState<GitTab>('changes');
  const [files, setFiles] = useState<GitFile[]>(mockFiles);
  const [commitMessage, setCommitMessage] = useState('');
  const [currentBranch] = useState('feat/tauri-v2-migration');
  const [expandStaged, setExpandStaged] = useState(true);
  const [expandUnstaged, setExpandUnstaged] = useState(true);

  // Stage/unstage file
  const toggleStage = useCallback((path: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, staged: !f.staged } : f))
    );
  }, []);

  // Stage all
  const stageAll = useCallback(() => {
    setFiles((prev) => prev.map((f) => ({ ...f, staged: true })));
  }, []);

  // Unstage all
  const unstageAll = useCallback(() => {
    setFiles((prev) => prev.map((f) => ({ ...f, staged: false })));
  }, []);

  const stagedFiles = files.filter((f) => f.staged);
  const unstagedFiles = files.filter((f) => !f.staged);

  // ===== Render =====
  return (
    <div className="flex flex-col h-full bg-slate-900 text-sm">
      {/* Header with branch */}
      <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-purple-400" />
          <span className="text-xs font-bold text-slate-200">{currentBranch}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Pull">
            <Download size={12} />
          </button>
          <button className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Push">
            <Upload size={12} />
          </button>
          <button className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Refresh">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {([
          { tab: 'changes' as GitTab, label: 'Changes', count: files.length },
          { tab: 'history' as GitTab, label: 'History', count: mockHistory.length },
          { tab: 'branches' as GitTab, label: 'Branches', count: mockBranches.length },
        ]).map(({ tab, label, count }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {/* ===== Changes Tab ===== */}
        {activeTab === 'changes' && (
          <div className="flex flex-col h-full">
            {/* Commit input */}
            <div className="p-2 border-b border-slate-700">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                className="w-full h-14 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-white placeholder-slate-500 resize-none"
              />
              <button
                disabled={!commitMessage.trim() || stagedFiles.length === 0}
                className="w-full mt-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-[10px] font-bold rounded transition-colors flex items-center justify-center gap-1.5"
              >
                <Check size={11} />
                Commit ({stagedFiles.length} files)
              </button>
            </div>

            {/* Staged files */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-2 py-1">
                <button
                  onClick={() => setExpandStaged(!expandStaged)}
                  className="flex items-center gap-1 w-full text-left"
                >
                  {expandStaged ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  <span className="text-[10px] font-bold text-green-400">
                    Staged ({stagedFiles.length})
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={(e) => { e.stopPropagation(); unstageAll(); }}
                    className="text-[9px] text-slate-500 hover:text-white"
                  >
                    Unstage All
                  </button>
                </button>
              </div>

              {expandStaged && stagedFiles.map((file) => (
                <FileRow key={file.path} file={file} onToggle={() => toggleStage(file.path)} />
              ))}

              {/* Unstaged files */}
              <div className="px-2 py-1 mt-1">
                <button
                  onClick={() => setExpandUnstaged(!expandUnstaged)}
                  className="flex items-center gap-1 w-full text-left"
                >
                  {expandUnstaged ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  <span className="text-[10px] font-bold text-orange-400">
                    Changes ({unstagedFiles.length})
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={(e) => { e.stopPropagation(); stageAll(); }}
                    className="text-[9px] text-slate-500 hover:text-white"
                  >
                    Stage All
                  </button>
                </button>
              </div>

              {expandUnstaged && unstagedFiles.map((file) => (
                <FileRow key={file.path} file={file} onToggle={() => toggleStage(file.path)} />
              ))}
            </div>
          </div>
        )}

        {/* ===== History Tab ===== */}
        {activeTab === 'history' && (
          <div className="p-2 space-y-1">
            {mockHistory.map((commit) => (
              <div
                key={commit.hash}
                className="px-2 py-2 rounded border border-slate-700 hover:border-slate-600 bg-slate-800/30 cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <GitCommit size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-200 font-medium truncate">{commit.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-slate-500 font-mono">{commit.hash}</span>
                      <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                        <User size={8} /> {commit.author}
                      </span>
                      <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                        <Clock size={8} /> {commit.date}
                      </span>
                    </div>
                    {commit.branch && (
                      <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 bg-purple-900/30 text-purple-300 text-[8px] rounded">
                        <GitBranch size={8} /> {commit.branch}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== Branches Tab ===== */}
        {activeTab === 'branches' && (
          <div className="p-2 space-y-1">
            {mockBranches.map((branch) => (
              <div
                key={branch.name}
                className={`px-2 py-2 rounded border cursor-pointer transition-colors ${
                  branch.current
                    ? 'border-blue-500/50 bg-blue-900/10'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GitBranch size={12} className={branch.current ? 'text-blue-400' : 'text-slate-500'} />
                  <span className={`text-[11px] font-medium flex-1 ${branch.current ? 'text-blue-200' : 'text-slate-300'}`}>
                    {branch.name}
                  </span>
                  {branch.current && (
                    <span className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
                      CURRENT
                    </span>
                  )}
                </div>
                {(branch.ahead > 0 || branch.behind > 0) && (
                  <div className="flex items-center gap-2 mt-1 ml-5">
                    {branch.ahead > 0 && (
                      <span className="text-[9px] text-green-400">↑{branch.ahead}</span>
                    )}
                    {branch.behind > 0 && (
                      <span className="text-[9px] text-orange-400">↓{branch.behind}</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            <button className="w-full mt-2 px-3 py-2 border border-dashed border-slate-600 text-slate-500 hover:text-white hover:border-slate-400 rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-colors">
              <Plus size={11} /> New Branch
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== File Row Component =====

const FileRow: FC<{ file: GitFile; onToggle: () => void }> = ({ file, onToggle }) => {
  const statusInfo = statusColors[file.status];
  const fileName = file.path.split('/').pop() || file.path;
  const dirPath = file.path.split('/').slice(0, -1).join('/');

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-800 rounded mx-1 group cursor-pointer">
      <button
        onClick={onToggle}
        className="p-0.5 rounded hover:bg-slate-600 text-slate-500 hover:text-white flex-shrink-0"
        title={file.staged ? 'Unstage' : 'Stage'}
      >
        {file.staged ? <Minus size={10} /> : <Plus size={10} />}
      </button>

      <FileText size={11} className="text-slate-500 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-slate-200 truncate block">{fileName}</span>
        <span className="text-[8px] text-slate-500 truncate block">{dirPath}</span>
      </div>

      <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${statusInfo.bg} ${statusInfo.text}`}>
        {statusInfo.letter}
      </span>

      <button className="p-0.5 rounded hover:bg-slate-600 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
        <Diff size={10} />
      </button>
    </div>
  );
};
