export interface AuthResult {
  token: string;
  user: { id: string; username: string };
}

export interface DocumentSummary {
  id: string;
  title: string;
  version: number;
  updatedAt: number;
}

export class ApiError extends Error {}

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async register(username: string, password: string): Promise<AuthResult> {
    return this.postJson('/api/register', { username, password });
  }

  async login(username: string, password: string): Promise<AuthResult> {
    return this.postJson('/api/login', { username, password });
  }

  async listDocuments(token: string): Promise<DocumentSummary[]> {
    const res = await fetch(`${this.baseUrl}/api/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!res.ok) throw new ApiError(body.error || 'Failed to load documents.');
    return body.documents;
  }

  async createDocument(token: string, title: string): Promise<DocumentSummary> {
    const res = await fetch(`${this.baseUrl}/api/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title }),
    });
    const body = await res.json();
    if (!res.ok) throw new ApiError(body.error || 'Failed to create document.');
    return body.document;
  }

  private async postJson(path: string, payload: unknown): Promise<AuthResult> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) throw new ApiError(body.error || 'Request failed.');
    return body;
  }
}
