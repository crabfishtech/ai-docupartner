// Define the file info type to match the API response
export type FileInfo = {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  groupId?: string;
  conversationId?: string;
  type: string;
};

// Define a type for document groups
export type DocumentGroup = {
  guid: string;
  name: string;
  createdAt: string;
  documentCount: number;
};
