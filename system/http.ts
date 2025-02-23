interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
}

interface HttpError extends Error {
  code: string;
  status: number;
  details?: any;
}

export class HttpClient {
  private baseHeaders: Record<string, string>;

  constructor(
    private baseURL: string,
    headers: Record<string, string> = {}
  ) {
    this.baseHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      let error: HttpError;
      
      try {
        const data = await response.json();
        error = new Error(data.message || 'Request failed') as HttpError;
        error.code = data.code || 'UNKNOWN_ERROR';
        error.status = response.status;
        error.details = data.details;
      } catch {
        error = new Error(response.statusText) as HttpError;
        error.code = 'NETWORK_ERROR';
        error.status = response.status;
      }

      throw error;
    }

    try {
      return await response.json();
    } catch {
      return null; // For empty responses
    }
  }

  private buildURL(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(
            key, 
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          );
        }
      });
    }
    
    return url.toString();
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { 
      method = 'GET',
      params,
      data,
      headers = {}
    } = config;

    const url = this.buildURL(endpoint, params);

    const response = await fetch(url, {
      method,
      headers: {
        ...this.baseHeaders,
        ...headers
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include' // Include cookies
    });

    return this.handleResponse(response);
  }

  get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request(endpoint, { params });
  }

  post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request(endpoint, { method: 'POST', data });
  }

  put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request(endpoint, { method: 'PUT', data });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Utility method to update base headers (e.g., after auth)
  setHeader(key: string, value: string | null): void {
    if (value === null) {
      delete this.baseHeaders[key];
    } else {
      this.baseHeaders[key] = value;
    }
  }

  // Method to create an authenticated client
  static createAuthenticatedClient(baseURL: string, token: string): HttpClient {
    return new HttpClient(baseURL, {
      'Authorization': `Bearer ${token}`
    });
  }
}

// Default client instance
export const http = new HttpClient('/api');
