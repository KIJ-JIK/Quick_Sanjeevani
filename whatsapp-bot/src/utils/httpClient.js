/**
 * Quick Sanjeevani — Lightweight Axios-Compatible HTTP Client
 * Uses Node.js native fetch for zero-dependency operation in offline/sandboxed environments.
 */

class HttpClient {
  async get(url, options = {}) {
    const controller = new AbortController();
    const timeout = options.timeout || 10000;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: options.headers || {},
        signal: controller.signal
      });

      let data;
      if (options.responseType === 'arraybuffer') {
        const ab = await response.arrayBuffer();
        data = Buffer.from(ab);
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      clearTimeout(timer);

      if (!response.ok && options.validateStatus && !options.validateStatus(response.status)) {
        const err = new Error(`Request failed with status code ${response.status}`);
        err.response = { status: response.status, data };
        throw err;
      }

      return {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries())
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async post(url, body = {}, options = {}) {
    const controller = new AbortController();
    const timeout = options.timeout || 10000;
    const timer = setTimeout(() => controller.abort(), timeout);

    const headers = { ...(options.headers || {}) };
    let serializedBody;

    if (body instanceof URLSearchParams || typeof body === 'string') {
      serializedBody = body.toString();
    } else if (Buffer.isBuffer(body)) {
      serializedBody = body;
    } else {
      serializedBody = JSON.stringify(body);
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: serializedBody,
        signal: controller.signal
      });

      let data;
      if (options.responseType === 'arraybuffer') {
        const ab = await response.arrayBuffer();
        data = Buffer.from(ab);
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      clearTimeout(timer);

      if (!response.ok) {
        const err = new Error(`Request failed with status code ${response.status}`);
        err.response = { status: response.status, data };
        throw err;
      }

      return {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries())
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

const httpClient = new HttpClient();
module.exports = httpClient;
