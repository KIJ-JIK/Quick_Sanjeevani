/**
 * Quick Sanjeevani — Native Promise-based HTTP Test Client
 * Supports both Windows Named Pipes and TCP network sockets.
 * wHACKiest 2026 Ideathon — Track 3: Know Thyself
 */

const http = require('http');
const https = require('https');

class HttpClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:5000';
    this.botUrl = options.botUrl || 'http://localhost:5001';
    this.socketPath = options.socketPath || null;
    this.verbose = options.verbose || false;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  request(method, urlStr, data = null, headers = {}, maxRetries = 5) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const reqHeaders = { ...headers };

      if (this.token && !reqHeaders['Authorization'] && !reqHeaders['authorization']) {
        reqHeaders['Authorization'] = `Bearer ${this.token}`;
      }

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

      let attempt = 0;

      const execute = () => {
        attempt++;

        const requestOptions = {
          method: method.toUpperCase(),
          headers: reqHeaders,
          timeout: 8000,
        };

        let transport = http;

        if (this.socketPath) {
          // Transport via Named Pipe (Windows IPC)
          let reqPath = urlStr;
          if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
            try {
              const parsed = new URL(urlStr);
              reqPath = parsed.pathname + parsed.search;
            } catch {
              reqPath = urlStr;
            }
          }
          requestOptions.socketPath = this.socketPath;
          requestOptions.path = reqPath;
        } else {
          // Transport via TCP Sockets
          const targetUrl = urlStr.startsWith('http') ? urlStr : `${this.baseUrl}${urlStr}`;
          const parsed = new URL(targetUrl);
          transport = parsed.protocol === 'https:' ? https : http;
          requestOptions.hostname = parsed.hostname;
          requestOptions.port = parsed.port || (parsed.protocol === 'https:' ? 443 : 80);
          requestOptions.path = parsed.pathname + parsed.search;
        }

        const req = transport.request(requestOptions, (res) => {
          let respData = '';
          res.on('data', chunk => { respData += chunk; });
          res.on('end', () => {
            const duration = Date.now() - startTime;
            let body = respData;
            try {
              body = JSON.parse(respData);
            } catch {
              // retain string body
            }

            if (this.verbose) {
              console.log(`[HTTP] ${method} ${urlStr} -> ${res.statusCode} (${duration}ms)`);
            }

            resolve({
              status: res.statusCode,
              headers: res.headers,
              body,
              rawBody: respData,
              duration,
            });
          });
        });

        req.on('error', (err) => {
          if (this.socketPath && err.code === 'ENOENT' && attempt < maxRetries) {
            setTimeout(execute, 5 * attempt);
          } else {
            reject(err);
          }
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`HTTP request timed out (${urlStr})`));
        });

        if (payload) {
          req.write(payload);
        }
        req.end();
      };

      execute();
    });
  }

  get(url, headers = {}) { return this.request('GET', url, null, headers); }
  post(url, data = null, headers = {}) { return this.request('POST', url, data, headers); }
  patch(url, data = null, headers = {}) { return this.request('PATCH', url, data, headers); }
  put(url, data = null, headers = {}) { return this.request('PUT', url, data, headers); }
  delete(url, headers = {}) { return this.request('DELETE', url, null, headers); }
}

module.exports = { HttpClient };
