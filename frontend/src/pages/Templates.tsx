import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Template } from '../types';
import { createNetworkErrorMessage } from '../utils/errorHandler';

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
  const { token } = useAuth();
  const { showToast } = useToast();
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTemplates();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        status: statusFilter === 'all' ? '' : statusFilter,
      });

      const response = await fetch(`${API_BASE_URL}/template?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data.templates);
        setTotalPages(data.data.pagination.pages);
      } else {
        showToast('Failed to load templates', 'error');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      const errorMessage = createNetworkErrorMessage('loading templates', error);
      showToast(errorMessage, 'error');
      setTemplates([]);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/bmp', 'image/webp', 'image/svg+xml', 
      'image/tiff', 'image/tif', 'application/pdf'
    ];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload a supported file format: JPEG, PNG, GIF, BMP, WebP, SVG, TIFF, or PDF', 'error');
      return;
    }

    // Validate file size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      showToast('File size must be less than 25MB', 'error');
      return;
    }

    if (!templateName.trim()) {
      showToast('Template name cannot be empty', 'error');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('template', file);
      formData.append('name', templateName.trim());
      formData.append('description', `Template uploaded on ${new Date().toLocaleDateString()}`);

      const response = await fetch(`${API_BASE_URL}/template/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Template uploaded successfully!', 'success');
        fetchTemplates(); // Refresh the list
      } else {
        showToast(data.message || 'Failed to upload template', 'error');
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      const errorMessage = createNetworkErrorMessage('uploading template', error);
      showToast(errorMessage, 'error');
    } finally {
      setIsUploading(false);
      // Reset the file input and template name
      event.target.value = '';
      setTemplateName('');
    }
  };

  const toggleTemplateStatus = async (templateId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/template/${templateId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        showToast(`Template ${!currentStatus ? 'activated' : 'deactivated'} successfully`, 'success');
        fetchTemplates();
      } else {
        showToast('Failed to update template status', 'error');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      const errorMessage = createNetworkErrorMessage('updating template', error);
      showToast(errorMessage, 'error');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && template.isActive) ||
                         (statusFilter === 'inactive' && !template.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage your certificate templates
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <input
              type="text"
              placeholder="Enter template name (required)"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className={`input input-bordered w-full max-w-xs ${
                templateName.trim() === '' ? 'border-red-300 focus:border-red-500' : ''
              }`}
              disabled={isUploading}
              required
            />
            {templateName.trim() === '' && (
              <span className="text-xs text-red-500 mt-1">Template name is required</span>
            )}
          </div>
          <input
            type="file"
            id="template-upload"
            accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.tiff,.tif,.pdf"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading || templateName.trim() === ''}
          />
          <label
            htmlFor="template-upload"
            className={`btn btn-primary btn-md cursor-pointer ${
              isUploading || templateName.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title={templateName.trim() === '' ? 'Please enter a template name first' : 'Upload template'}
          >
            {isUploading ? (
              <div className="flex items-center">
                <LoadingSpinner size="sm" className="mr-2" />
                Uploading...
              </div>
            ) : (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Upload Template
              </div>
            )}
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="input"
              >
                <option value="all">All Templates</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading templates..." />
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template._id} className="card">
              <div className="card-content">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      template.isActive 
                        ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
                        : 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20'
                    }`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex justify-between">
                    <span>File:</span>
                    <span>{template.filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span>{formatFileSize(template.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Placeholders:</span>
                    <span>{template.placeholders.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage:</span>
                    <span>{template.usageCount} times</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{formatDate(template.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex space-x-2">
                    <Link
                      to={`/templates/${template._id}/edit`}
                      className="btn btn-outline btn-sm"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => toggleTemplateStatus(template._id, template.isActive)}
                      className={`btn btn-sm ${
                        template.isActive ? 'btn-secondary' : 'btn-primary'
                      }`}
                    >
                      {template.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                  
                  <a
                    href={`${API_BASE_URL}/template/${template._id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors"
                    title="View template file"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-content">
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No templates match your search criteria'
                  : 'No templates uploaded yet'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <label htmlFor="template-upload" className="btn btn-primary btn-md cursor-pointer">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Upload Your First Template
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="btn btn-outline btn-sm"
          >
            Previous
          </button>
          
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="btn btn-outline btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Templates;