// DokAssist — API URL. Change this to your Railway backend URL after deployment.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Practice {
  id: string;
  name: string;
  join_code: string;
  conditions: string;
}

export interface Document {
  id: number;
  filename: string;
  original_filename: string;
  chunk_count: number;
  uploaded_at: string;
}

export interface ChatResponse {
  answer: string;
  sources: string[];
}

// ---------- API helpers ----------
export async function createPractice(name: string): Promise<Practice> {
  const res = await fetch(`${API_URL}/api/practice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Failed to create practice");
  return res.json();
}

export async function getPracticeByCode(code: string): Promise<Practice> {
  const res = await fetch(`${API_URL}/api/practice/${code}`);
  if (!res.ok) throw new Error((await res.json()).detail || "Practice not found");
  return res.json();
}

export async function listDocuments(practiceId: string): Promise<{ documents: Document[] }> {
  const res = await fetch(`${API_URL}/api/practice/${practiceId}/documents`);
  if (!res.ok) throw new Error("Failed to list documents");
  return res.json();
}

export async function uploadDocuments(
  practiceId: string,
  files: File[]
): Promise<{ status: string; files_processed: number; total_chunks: number; files: any[] }> {
  const formData = new FormData();
  formData.append("files", files[0]); // FastAPI expects repeated 'files' field
  for (let i = 1; i < files.length; i++) {
    formData.append("files", files[i]);
  }
  const res = await fetch(`${API_URL}/api/practice/${practiceId}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function deleteDocument(practiceId: string, docId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/practice/${practiceId}/documents/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

export async function updateConditions(
  practiceId: string,
  conditions: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/practice/${practiceId}/conditions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conditions }),
  });
  if (!res.ok) throw new Error("Failed to update conditions");
}

export async function chat(
  practiceId: string,
  message: string,
  userName: string,
  history: { role: string; content: string }[]
): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/practice/${practiceId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, user_name: userName, history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Chat failed");
  }
  return res.json();
}
