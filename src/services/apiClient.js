class ApiError extends Error {
  constructor(message, { status, method, url, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.method = method;
    this.url = url;
    this.data = data;
  }
}

const DEFAULT_TIMEOUT_MS = 12000;

const getErrorMessage = (data, fallback) => {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  return data.error || data.message || fallback;
};

export const requestJson = async (url, options = {}) => {
  const {
    method = 'GET',
    body,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const requestHeaders = { ...headers };
  const init = {
    method,
    headers: requestHeaders,
    signal: controller.signal
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      init.body = body;
    } else if (typeof body === 'string') {
      if (!requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
      init.body = body;
    } else {
      requestHeaders['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(url, init);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    if (!response.ok) {
      throw new ApiError(getErrorMessage(payload, `Request failed (${response.status})`), {
        status: response.status,
        method,
        url,
        data: payload
      });
    }

    return payload;
  } catch (error) {
    if (error.name === 'ApiError') {
      throw error;
    }
    if (error.name === 'AbortError') {
      throw new ApiError(`Request timed out: ${method} ${url}`, {
        status: 408,
        method,
        url
      });
    }
    throw new ApiError(error.message || `Network error: ${method} ${url}`, {
      method,
      url
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export { ApiError };
