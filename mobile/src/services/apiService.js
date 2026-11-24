/**
 * Quick Sanjeevani - Mobile API Client
 * Facilitates communication with backend API endpoints:
 * - /health
 * - /api/auth (OTP send / verify, profile)
 * - /api/medicines (search, details)
 * - /api/prescriptions
 * - /api/sync (WatermelonDB delta sync)
 * Configurable baseUrl, authentication headers, network timeout, and offline detection.
 */

const http = require('http');
const https = require('https');
const url = require('url');

class ApiService {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:5000';
    this.timeout = options.timeout || 5000;
    this.authToken = options.authToken || null;
    this.customRequester = options.customRequester || null;
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  getAuthToken() {
    return this.authToken;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  setBaseUrl(newUrl) {
    this.baseUrl = newUrl;
  }

  /**
   * Core request dispatcher with offline fault-tolerance.
   */
  async request(method, path, body = null, headers = {}) {
    if (this.customRequester) {
      return this.customRequester(method, path, body, {
        Authorization: this.authToken ? `Bearer ${this.authToken}` : undefined,
        ...headers,
      });
    }

    const fullUrl = this.baseUrl.replace(/\/+$/, '') + (path.startsWith('/') ? path : '/' + path);
    const parsedUrl = url.parse(fullUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const reqHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };

    if (this.authToken && !reqHeaders.Authorization) {
      reqHeaders.Authorization = `Bearer ${this.authToken}`;
    }

    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const requestOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.path,
      method: method.toUpperCase(),
      headers: reqHeaders,
      timeout: this.timeout,
    };

    return new Promise((resolve, reject) => {
      const req = transport.request(requestOptions, (res) => {
        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsedData = rawData;
          try {
            parsedData = JSON.parse(rawData);
          } catch (e) {
            // Keep raw string if not JSON
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: parsedData,
            });
          } else {
            const err = new Error(
              parsedData && parsedData.detail
                ? parsedData.detail
                : parsedData && parsedData.error
                ? parsedData.error
                : `HTTP Error ${res.statusCode}`
            );
            err.status = res.statusCode;
            err.response = { status: res.statusCode, data: parsedData };
            reject(err);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const err = new Error('Network timeout');
        err.isTimeout = true;
        err.isOffline = true;
        reject(err);
      });

      req.on('error', (e) => {
        const err = new Error(`Network failure: ${e.message}`);
        err.isOffline = true;
        err.originalError = e;
        reject(err);
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

  // Endpoints

  async checkHealth() {
    const res = await this.request('GET', '/health');
    return res.data;
  }

  async sendOtp(phone) {
    const res = await this.request('POST', '/api/auth/otp/send', { phone });
    return res.data;
  }

  async verifyOtp(phone, otp) {
    const res = await this.request('POST', '/api/auth/otp/verify', { phone, otp });
    if (res.data && res.data.token) {
      this.setAuthToken(res.data.token);
    }
    return res.data;
  }

  async getProfile() {
    const res = await this.request('GET', '/api/auth/profile');
    return res.data;
  }

  async searchMedicines(query = '', options = {}) {
    const q = encodeURIComponent(query);
    const res = await this.request('GET', `/api/medicines/search?q=${q}`);
    return res.data;
  }

  async getPrescriptions() {
    const res = await this.request('GET', '/api/prescriptions');
    return res.data;
  }

  async createPrescription(data) {
    const res = await this.request('POST', '/api/prescriptions', data);
    return res.data;
  }

  async sync(lastPulledAt, changes = {}) {
    const res = await this.request('POST', '/api/sync', {
      lastPulledAt: lastPulledAt !== undefined ? lastPulledAt : 0,
      changes,
    });
    return res.data;
  }
}

const defaultApi = new ApiService();

module.exports = {
  ApiService,
  api: defaultApi,
};
