/**
 * System information types
 */

export interface SystemInfo {
  homeDir: string;
  platform: string;
  cwd: string;
}

export interface SystemInfoResponse {
  info: SystemInfo;
}
