/**
 * bubble-harness
 * 
 * Lightweight agent harness for constrained JavaScript runtimes.
 * Designed to run in environments like Chrome extension sandboxes where
 * filesystem, shell, and stdio MCP are unavailable.
 */

export const PACKAGE_NAME = 'bubble-harness';
export const PACKAGE_VERSION = '0.1.0-dev';

/**
 * Placeholder export for initial scaffold.
 * Implementation will follow the roadmap version workflow.
 */
export function getVersion(): string {
  return PACKAGE_VERSION;
}
