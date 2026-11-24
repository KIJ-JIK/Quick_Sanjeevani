/**
 * Quick Sanjeevani — WhatsApp Bot Test Helper
 * Spins up Express app on Windows Named Pipes to bypass local TCP EACCES sandbox policy.
 */

const http = require('http');
const app = require('../src/index');

class TestClient {
  constructor() {
    this.server = null;
    this.pipeName = `\\\\.\\pipe\\qs_bot_test_${process.pid}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(app);
      this.server.listen(this.pipeName, () => {
        resolve(this);
      });
      this.server.on('error', reject);
    });
  }

  async close() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  request(method, reqPath, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const reqHeaders = { ...headers };

      let payload = null;
      if (data !== null && data !== undefined) {
        if (typeof data === 'object' && !(data instanceof Buffer)) {
          if (reqHeaders['Content-Type'] === 'application/x-www-form-urlencoded') {
            payload = new URLSearchParams(data).toString();
          } else {
            if (!reqHeaders['Content-Type']) {
              reqHeaders['Content-Type'] = 'application/json';
            }
            payload = JSON.stringify(data);
          }
        } else {
          payload = String(data);
        }
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const requestOptions = {
        socketPath: this.pipeName,
        path: reqPath,
        method: method.toUpperCase(),
        headers: reqHeaders,
        timeout: 5000
      };

      const req = http.request(requestOptions, (res) => {
        let respData = '';
        res.on('data', chunk => { respData += chunk; });
        res.on('end', () => {
          const duration = Date.now() - startTime;
          let body = respData;
          try {
            body = JSON.parse(respData);
          } catch {
            // retain raw string
          }

          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
            rawBody: respData,
            duration
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Test request timed out: ${reqPath}`));
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

  get(path, headers = {}) {
    return this.request('GET', path, null, headers);
  }

  post(path, data = null, headers = {}) {
    return this.request('POST', path, data, headers);
  }
}

module.exports = { TestClient };
