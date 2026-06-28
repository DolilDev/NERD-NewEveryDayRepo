import type { DocumentModel, Snapshot } from "./types";

class ApiError extends Error {
  status: number;
  body: any;

  constructor(status: number, body: any) {
    super("API Error");
    this.status = status;
    this.body = body;
  }
}

const API_BASE = "/api";
let token = "";

export function setToken(value: string) {
  token = value;
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const content = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, content);
  }
  return content;
}

export function register(username: string, password: string) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function login(username: string, password: string) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function getDocs(): Promise<DocumentModel[]> {
  return request("/documents");
}

export function createDoc(title: string, content: string, collaborators: string[] = []) {
  return request("/documents", {
    method: "POST",
    body: JSON.stringify({ title, content, collaborators }),
  });
}

export function getDoc(id: string) {
  return request(`/documents/${id}`);
}

export function updateDoc(id: string, payload: Partial<Pick<DocumentModel, "title" | "collaborators">>) {
  return request(`/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteDoc(id: string) {
  return request(`/documents/${id}`, { method: "DELETE" });
}

export function getHistory(id: string): Promise<Snapshot[]> {
  return request(`/documents/${id}/history`);
}

export function restoreSnapshot(docId: string, snapshotId: string) {
  return request(`/documents/${docId}/history/${snapshotId}/restore`, { method: "POST" });
}

export { ApiError };
