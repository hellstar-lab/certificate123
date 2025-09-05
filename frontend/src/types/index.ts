export interface Template {
  _id: string;
  name: string;
  description: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  dimensions: {
    width: number;
    height: number;
  };
  placeholders: Array<{
    type: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    fontWeight: string;
    fontStyle: string;
    textAlign: string;
    rotation: number;
    width?: number;
    height?: number;
  }>;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface Certificate {
  _id: string;
  certificateId: string;
  participantName: string;
  template: {
    _id: string;
    name: string;
  };
  templateSnapshot: {
    name: string;
    filename: string;
  };
  generatedFiles: {
    pdf: {
      filename: string;
      path: string;
      size: number;
    };
    png: {
      filename: string;
      path: string;
      size: number;
    };
  };
  status: 'generated' | 'downloaded' | 'archived';
  metadata: {
    generationTime: number;
    downloadCount: number;
  };
  issuedDate: string;
  expiryDate?: string;
  isActive: boolean;
  tags: string[];
  notes?: string;
  createdAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ message: string; field?: string }>;
}