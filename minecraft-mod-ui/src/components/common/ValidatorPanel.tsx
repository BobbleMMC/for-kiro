/**
 * ValidatorPanel — pre-export project validation UI.
 *
 * Displays a structured list of errors, warnings, and info messages from
 * the Rust `validate_project` command. Each issue shows:
 *   - Severity badge (Error / Warning / Info)
 *   - Human-readable message
 *   - Issue code (foldable, for bug reports)
 *   - "Go to" button that navigates the workspace to the offending editor
 *
 * Export / Build buttons are disabled while any errors exist.
 *
 * Usage:
 *   <ValidatorPanel
 *     projectId={project.id}
 *     onExport={() => handleExport()}
 *     onBuild={() => handleBuild()}
 *   />
 */

import { useState, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Hammer,
  PackageCheck,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type { ValidationReport, ValidationIssue, ValidationSeverity } from '../../lib/tauri-api';
import { validateProject, isTauri } from '../../lib/tauri-api';

// ============================================================================
// Props
// ============================================================================

interface ValidatorPanelProps {
  projectId: number;
  /** Called when the user clicks "Build" and the project has no errors. */
  onBuild?: () => void;
  /** Called when the user clicks "Export" and the project has no errors. */
  onExport?: () => void;
  /**
   * Optional: called when an issue's "Go to" button is clicked.
   * `editorPanelId` is the workspace panel to focus (e.g. "block-editor").
   * `entityId` is the DB row id of the offending entity, or null.
   */
  onNavigateToIssue?: (editorPanelId: string, entityId: number | null) => void;
}

// ============================================================================
// Severity helpers
// ============================================================================

const SEVERITY_CONFIG: Record<
  ValidationSeverity,
  { label: string; Icon: React.FC<{ className?: string }>; bg: string; text: string; border: string }
> = {
  error: {
    label: 'Error',
    Icon: AlertCircle,
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  warning: {
    label: 'Warning',
    Icon: AlertTriangle,
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  info: {
    label: 'Info',
    Icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
};

// ============================================================================
// Sub-components
// ============================================================================

function SeverityBadge({ severity }: { severity: ValidationSeverity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function IssueRow({
  issue,
  onNavigate,
}: {
  issue: ValidationIssue;
  onNavigate?: (editorPanelId: string, entityId: number | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity];

  return (
    <div className={`border rounded-lg ${cfg.border} overflow-hidden`}>
      {/* Main row */}
      <div
        className={`flex items-start gap-3 px-4 py-3 ${cfg.bg}`}
      >
        <cfg.Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.text}`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-gray-100 leading-snug">
            {issue.message}
          </p>
          {/* Code toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <code className="font-mono">{issue.code}</code>
          </button>
        </div>

        {/* Navigate button */}
        {issue.fix && onNavigate && (
          <button
            onClick={() => onNavigate(issue.fix!.editor_panel_id, issue.fix!.entity_id)}
            className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs rounded border
                       border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                       text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700
                       transition-colors"
            title={`Go to ${issue.fix.editor_panel_id}`}
          >
            <ExternalLink className="w-3 h-3" />
            Fix
          </button>
        )}
      </div>

      {/* Expanded code details */}
      {expanded && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            Code: <strong>{issue.code}</strong>
            {issue.fix && (
              <>
                {' '}| Editor: <strong>{issue.fix.editor_panel_id}</strong>
                {issue.fix.entity_id != null && (
                  <> | ID: <strong>{issue.fix.entity_id}</strong></>
                )}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryBar({ report }: { report: ValidationReport }) {
  const { error_count, warning_count, info_count, may_export } = report;

  if (may_export && error_count === 0 && warning_count === 0 && info_count === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          All checks passed — project is ready to export!
        </p>
      </div>
    );
  }

  const parts: string[] = [];
  if (error_count > 0) parts.push(`${error_count} error${error_count > 1 ? 's' : ''}`);
  if (warning_count > 0) parts.push(`${warning_count} warning${warning_count > 1 ? 's' : ''}`);
  if (info_count > 0) parts.push(`${info_count} hint${info_count > 1 ? 's' : ''}`);

  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg border ${
        !may_export
          ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
          : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
      }`}
    >
      {!may_export ? (
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
      )}
      <p
        className={`text-sm font-medium ${
          !may_export
            ? 'text-red-700 dark:text-red-400'
            : 'text-yellow-700 dark:text-yellow-400'
        }`}
      >
        {parts.join(', ')}{' '}
        {!may_export
          ? '— resolve all errors before exporting.'
          : '— export allowed but review warnings.'}
      </p>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

type Filter = 'all' | ValidationSeverity;

export function ValidatorPanel({
  projectId,
  onBuild,
  onExport,
  onNavigateToIssue,
}: ValidatorPanelProps) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const runValidation = useCallback(async () => {
    if (!isTauri()) {
      // Dev / browser mode: return a mock report so the component renders.
      setReport({
        project_id: projectId,
        error_count: 0,
        warning_count: 1,
        info_count: 1,
        may_export: true,
        issues: [
          {
            severity: 'warning',
            code: 'MISSING_BLOCK_TEXTURE',
            message: "Block 'copper_ore' has no texture assigned (browser preview).",
            fix: { editor_panel_id: 'block-editor', entity_id: 1 },
          },
          {
            severity: 'info',
            code: 'EMPTY_PROJECT',
            message: 'Running in browser mode — validation is a preview only.',
            fix: null,
          },
        ],
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await validateProject(projectId);
      setReport(result);
      setFilter('all');
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Filtered issue list
  const visibleIssues =
    report?.issues.filter((i) => filter === 'all' || i.severity === filter) ?? [];

  const filterCounts: Record<Filter, number> = {
    all: report?.issues.length ?? 0,
    error: report?.error_count ?? 0,
    warning: report?.warning_count ?? 0,
    info: report?.info_count ?? 0,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Pre-Export Validator
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Checks IDs, textures, recipes, and version compatibility before build.
          </p>
        </div>
        <button
          onClick={runValidation}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg
                     bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                     text-white font-medium transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Validating…' : report ? 'Re-validate' : 'Validate'}
        </button>
      </div>

      {/* Infrastructure error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">
            <strong>Validation failed to run:</strong> {error}
          </p>
        </div>
      )}

      {/* No report yet */}
      {!report && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <CheckCircle2 className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
            Click <strong>Validate</strong> to check your project for errors
            before exporting or building.
          </p>
        </div>
      )}

      {/* Report */}
      {report && (
        <>
          {/* Summary */}
          <SummaryBar report={report} />

          {/* Filter tabs */}
          {report.issues.length > 0 && (
            <div className="flex items-center gap-1">
              {(['all', 'error', 'warning', 'info'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                    filter === f
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  {filterCounts[f] > 0 && (
                    <span className="ml-1.5 tabular-nums">{filterCounts[f]}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Issue list */}
          {visibleIssues.length > 0 ? (
            <div className="flex flex-col gap-2">
              {visibleIssues.map((issue, idx) => (
                <IssueRow
                  key={`${issue.code}-${idx}`}
                  issue={issue}
                  onNavigate={onNavigateToIssue}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No {filter === 'all' ? 'issues' : `${filter}s`} found.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            {onBuild && (
              <button
                onClick={onBuild}
                disabled={!report.may_export}
                title={
                  !report.may_export
                    ? 'Resolve all errors before building'
                    : 'Run Gradle build'
                }
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                           bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
                           hover:bg-gray-700 dark:hover:bg-gray-200
                           disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Hammer className="w-4 h-4" />
                Build
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                disabled={!report.may_export}
                title={
                  !report.may_export
                    ? 'Resolve all errors before exporting'
                    : 'Export .jar file'
                }
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                           bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                           text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <PackageCheck className="w-4 h-4" />
                Export .jar
              </button>
            )}
            <p className="ml-auto text-xs text-gray-400 dark:text-gray-500">
              {report.issues.length === 0
                ? 'No issues'
                : `${report.error_count}E · ${report.warning_count}W · ${report.info_count}I`}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default ValidatorPanel;
