import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExecutionJobData, ExecutionJobResult } from '../types.js';
import { LANGUAGE_CONFIGS, type SupportedLanguage } from './languages.js';

const STARTUP_GRACE_MS = 5_000;

export class DockerRunner {
  constructor(
    private readonly _dockerSocket: string,
    private readonly _seccompProfile: string,
  ) {}

  async run(job: ExecutionJobData): Promise<ExecutionJobResult> {
    const lang = job.language as SupportedLanguage;
    const cfg = LANGUAGE_CONFIGS[lang];
    if (cfg === undefined) {
      return {
        stdout: '',
        stderr: `Unsupported language: ${job.language}`,
        exitCode: 1,
        durationMs: 0,
        timedOut: false,
      };
    }

    const tmpDir = await mkdtemp(join(tmpdir(), 'sandbox-'));
    try {
      await writeFile(join(tmpDir, cfg.filename), job.code, 'utf8');
      return await this._runContainer(job, cfg.image, cfg.cmd, tmpDir);
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private _runContainer(
    job: ExecutionJobData,
    image: string,
    cmd: readonly string[],
    tmpDir: string,
  ): Promise<ExecutionJobResult> {
    return new Promise<ExecutionJobResult>((resolve) => {
      const start = Date.now();
      const containerName = `sandbox-${job.executionId}`;
      let timedOut = false;

      const args: string[] = [
        'run', '--rm',
        '--name', containerName,
        '--memory', '50m',
        '--cpus', '0.1',
        '--network', 'none',
        '--security-opt', 'no-new-privileges',
        '--security-opt', `seccomp=${this._seccompProfile}`,
        '--cap-drop', 'ALL',
        '--mount', `type=bind,source=${tmpDir},target=/app,readonly`,
      ];

      for (const [k, v] of Object.entries(job.env ?? {})) {
        args.push('--env', `${k}=${v}`);
      }

      args.push(image, ...cmd);

      // SANDBOX_DOCKER_SOCKET used only for the daemon socket path; the CLI
      // picks it up via DOCKER_HOST env var if non-default.
      const proc = spawn('docker', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...(this._dockerSocket !== '/var/run/docker.sock'
            ? { DOCKER_HOST: `unix://${this._dockerSocket}` }
            : {}),
        },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      if (job.stdin !== undefined) {
        proc.stdin.end(job.stdin, 'utf8');
      } else {
        proc.stdin.end();
      }

      const killTimer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGKILL');
        // Best-effort removal; the container may have already exited.
        spawn('docker', ['rm', '-f', containerName]).unref();
      }, job.timeoutMs + STARTUP_GRACE_MS);

      proc.on('close', (code) => {
        clearTimeout(killTimer);
        resolve({
          stdout: stdout.slice(0, 1_000_000),
          stderr: stderr.slice(0, 1_000_000),
          exitCode: timedOut ? 124 : (code ?? 1),
          durationMs: Date.now() - start,
          timedOut,
        });
      });
    });
  }
}
