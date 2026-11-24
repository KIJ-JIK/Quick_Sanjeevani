#!/usr/bin/env node
/**
 * Quick Sanjeevani — Standalone E2E Test Runner
 * wHACKiest 2026 Ideathon — Track 3: Know Thyself
 *
 * Invocation: node tests/e2e-runner.js [--tier=1|2|3|4|all] [--mock] [--live] [--verbose] [--bail]
 */

const http = require('http');
const path = require('path');
const { createMockServer } = require('./helpers/mock-server');
const { HttpClient } = require('./helpers/http-client');

// CLI Argument Parsing
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--tier=')) acc.tier = arg.split('=')[1];
  if (arg === '--mock') acc.forceMock = true;
  if (arg === '--live') acc.forceLive = true;
  if (arg === '--verbose') acc.verbose = true;
  if (arg === '--bail') acc.bail = true;
  if (arg.startsWith('--server=')) acc.serverUrl = arg.split('=')[1];
  if (arg.startsWith('--bot=')) acc.botUrl = arg.split('=')[1];
  if (arg.startsWith('--pipe=')) acc.customPipe = arg.split('=')[1];
  return acc;
}, { tier: 'all', forceMock: false, forceLive: false, verbose: false, bail: false });

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

async function checkLiveServer(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL('/health', url);
      const req = http.get(u.href, { timeout: 1000 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    } catch {
      resolve(false);
    }
  });
}

async function main() {
  console.log(`\n${COLORS.bold}${COLORS.cyan}=======================================================`);
  console.log(`  Quick Sanjeevani — End-to-End Test Suite Runner`);
  console.log(`  wHACKiest 2026 Ideathon — Track 3: Know Thyself`);
  console.log(`=======================================================${COLORS.reset}\n`);

  // Validate CLI tier argument
  const validTiers = ['1', '2', '3', '4', 'all'];
  const tier = String(args.tier || 'all').toLowerCase();
  if (!validTiers.includes(tier)) {
    console.error(`${COLORS.red}[ERROR] Invalid --tier specified: "${args.tier}". Valid options are: 1, 2, 3, 4, all.${COLORS.reset}\n`);
    process.exit(1);
  }

  let serverUrl = args.serverUrl || 'http://localhost:5000';
  let botUrl = args.botUrl || 'http://localhost:5001';
  let mockServerInstance = null;
  let socketPath = null;

  // Auto-detect environment mode
  // If Windows and not explicitly --live, default to Windows Named Pipe mock server to bypass sandbox TCP EACCES
  const isWindows = process.platform === 'win32';
  let isLiveServerUp = false;

  if (args.forceLive) {
    isLiveServerUp = await checkLiveServer(serverUrl);
    if (!isLiveServerUp) {
      console.log(`${COLORS.yellow}[WARN] --live specified but live server at ${serverUrl} unreachable.${COLORS.reset}`);
    }
  } else if (!args.forceMock && !isWindows) {
    isLiveServerUp = await checkLiveServer(serverUrl);
  }

  if (!isLiveServerUp || args.forceMock) {
    const useNamedPipe = isWindows && !args.serverUrl;
    const pipeMsg = useNamedPipe ? 'via Windows Named Pipe IPC' : 'via ephemeral TCP port';
    console.log(`${COLORS.yellow}[INFO] Starting ephemeral mock test harness (${pipeMsg})...${COLORS.reset}`);

    mockServerInstance = await createMockServer({
      useNamedPipe,
      socketPath: args.customPipe || null,
      port: useNamedPipe ? null : 5099
    });

    if (mockServerInstance.pipeName) {
      socketPath = mockServerInstance.pipeName;
      serverUrl = `pipe:${socketPath}`;
      botUrl = `pipe:${socketPath}`;
      console.log(`${COLORS.green}[INFO] Ephemeral mock test harness running on Named Pipe: ${socketPath}${COLORS.reset}\n`);
    } else {
      serverUrl = `http://localhost:${mockServerInstance.port}`;
      botUrl = `http://localhost:${mockServerInstance.port}`;
      console.log(`${COLORS.green}[INFO] Ephemeral mock test harness running on TCP port ${mockServerInstance.port}${COLORS.reset}\n`);
    }
  } else {
    console.log(`${COLORS.green}[INFO] Connected to live backend at ${serverUrl} and bot at ${botUrl}${COLORS.reset}\n`);
  }

  const client = new HttpClient({
    baseUrl: serverUrl,
    botUrl,
    socketPath,
    verbose: args.verbose
  });

  const testContext = {
    client,
    mockServer: mockServerInstance,
    verbose: args.verbose,
    serverUrl,
    botUrl,
    socketPath
  };

  const results = [];
  const suitesToRun = [];

  if (tier === 'all' || tier === '1') {
    suitesToRun.push({
      tier: 'Tier 1',
      name: 'Feature Coverage (Happy Path)',
      file: './suites/tier1_features.test.js'
    });
  }
  if (tier === 'all' || tier === '2') {
    suitesToRun.push({
      tier: 'Tier 2',
      name: 'Boundaries & Fault Injection',
      file: './suites/tier2_boundaries.test.js'
    });
  }
  if (tier === 'all' || tier === '3') {
    suitesToRun.push({
      tier: 'Tier 3',
      name: 'Pairwise Combinations',
      file: './suites/tier3_combinations.test.js'
    });
  }
  if (tier === 'all' || tier === '4') {
    suitesToRun.push({
      tier: 'Tier 4',
      name: 'Real-World Elderly Workloads',
      file: './suites/tier4_real_world.test.js'
    });
  }

  const startTime = Date.now();
  let anyFailure = false;

  try {
    for (const suite of suitesToRun) {
      console.log(`${COLORS.bold}--- Running ${suite.tier}: ${suite.name} ---${COLORS.reset}`);
      try {
        const suiteModule = require(suite.file);
        const suiteResults = await suiteModule.run(testContext);

        for (const res of suiteResults) {
          results.push({ ...res, tier: suite.tier });
          const statusSymbol = res.passed
            ? `${COLORS.green}PASS${COLORS.reset}`
            : `${COLORS.red}FAIL${COLORS.reset}`;
          console.log(`  [${statusSymbol}] ${res.name} ${COLORS.dim}(${res.duration}ms)${COLORS.reset}`);
          if (!res.passed) {
            anyFailure = true;
            console.log(`         ${COLORS.red}Error: ${res.error}${COLORS.reset}`);
            if (args.bail) break;
          }
        }
      } catch (err) {
        anyFailure = true;
        console.log(`  ${COLORS.red}[SUITE CRASH] Failed executing suite ${suite.name}: ${err.message}${COLORS.reset}`);
        results.push({
          tier: suite.tier,
          name: `Suite Crash: ${suite.name}`,
          passed: false,
          duration: 0,
          error: err.message
        });
        if (args.bail) break;
      }
      console.log('');
      if (anyFailure && args.bail) break;
    }
  } finally {
    // Cleanup ephemeral mock server if started
    if (mockServerInstance) {
      await mockServerInstance.close();
    }
  }

  const totalTime = Date.now() - startTime;

  // Print Summary Table
  console.log(`${COLORS.bold}========================================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}  E2E Test Execution Summary${COLORS.reset}`);
  console.log(`${COLORS.bold}========================================================================================${COLORS.reset}`);
  console.log(`${'Tier'.padEnd(10)} | ${'Test Case'.padEnd(52)} | ${'Time'.padEnd(8)} | ${'Status'}`);
  console.log(`----------------------------------------------------------------------------------------`);

  let totalPassed = 0;
  let totalFailed = 0;

  for (const r of results) {
    if (r.passed) totalPassed++; else totalFailed++;
    const statusCol = r.passed
      ? `${COLORS.green}PASS${COLORS.reset}`
      : `${COLORS.red}FAIL${COLORS.reset}`;
    const truncatedName = r.name.length > 50 ? r.name.substring(0, 47) + '...' : r.name;
    console.log(`${r.tier.padEnd(10)} | ${truncatedName.padEnd(52)} | ${(r.duration + 'ms').padEnd(8)} | ${statusCol}`);
  }

  console.log(`----------------------------------------------------------------------------------------`);
  console.log(`Total Suites:  ${suitesToRun.length}`);
  console.log(`Total Tests:   ${results.length}`);
  console.log(`Passed:        ${COLORS.green}${totalPassed}${COLORS.reset}`);
  console.log(`Failed:        ${totalFailed > 0 ? COLORS.red : COLORS.green}${totalFailed}${COLORS.reset}`);
  console.log(`Total Duration: ${totalTime}ms`);
  console.log(`Final Result:  ${totalFailed === 0 ? COLORS.green + 'ALL TESTS PASSED (100%)' : COLORS.red + 'FAILURES DETECTED'}${COLORS.reset}`);
  console.log(`${COLORS.bold}========================================================================================${COLORS.reset}\n`);

  process.exit(totalFailed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`Fatal Test Runner Error:`, err);
  process.exit(1);
});
