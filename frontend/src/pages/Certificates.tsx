import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { createNetworkErrorMessage } from '../utils/errorHandler';

import ConfirmationModal from '../components/ConfirmationModal';
import BulkDownloadProgress from '../components/BulkDownloadProgress';
import { CertificateTableRowSkeleton } from '../components/SkeletonLoader';
import { useWebSocket } from '../hooks/useWebSocket';
import { Certificate } from '../types';



interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCertificates: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const Certificates: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { isConnected, bulkDownloadProgress } = useWebSocket();
  
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCertificates: 0,
    hasNext: false,
    hasPrev: false,
  });
  
  // Bulk download state
  const [selectedCertificates, setSelectedCertificates] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [showBulkProgress, setShowBulkProgress] = useState(false);
  const [bulkDownloadFormat, setBulkDownloadFormat] = useState<'pdf' | 'png'>('pdf');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Available templates for filter
  const [templates, setTemplates] = useState<Array<{ _id: string; name: string }>>([]);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchCertificates();
    fetchTemplates();
  }, [pagination.currentPage, searchTerm, statusFilter, templateFilter, sortBy, sortOrder]);

  const fetchCertificates = async () => {
    try {
      setIsLoading(true);
      
      // Don't fetch if no token available
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: '10',
        sortBy,
        sortOrder,
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (templateFilter !== 'all') params.append('template', templateFilter);
      
      const response = await fetch(`${API_BASE_URL}/certificate?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCertificates(data.data.certificates || []);
        setPagination(data.data.pagination || { currentPage: 1, totalPages: 1, totalCertificates: 0, hasNext: false, hasPrev: false });
      } else {
        showToast('Failed to load certificates', 'error');
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      
      const errorMessage = createNetworkErrorMessage('loading certificates', error);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/template?limit=100&status=active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const downloadCertificate = async (certificateId: string, format: 'pdf' | 'png') => {
    try {
      const response = await fetch(`${API_BASE_URL}/certificate/${certificateId}/download/${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate_${certificateId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast(`Certificate downloaded as ${format.toUpperCase()}`, 'success');
        fetchCertificates(); // Refresh to update download count
      } else {
        showToast('Failed to download certificate', 'error');
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      
      // Safe error handling to prevent toString errors
      let errorMessage = 'Unknown network error';
      try {
        if (error && typeof error === 'object') {
          if ('message' in error && error.message) {
            errorMessage = String(error.message);
          } else if ('toString' in error && typeof error.toString === 'function') {
            errorMessage = error.toString();
          }
        } else if (error) {
          errorMessage = String(error);
        }
      } catch (stringifyError) {
        console.error('Error while processing error message:', stringifyError);
        errorMessage = 'Network error occurred';
      }
      
      showToast(`Network error while downloading certificate: ${errorMessage}`, 'error');
    }
  };

  const archiveCertificate = async (certificateId: string) => {
    if (!confirm('Are you sure you want to archive this certificate?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/certificate/${certificateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showToast('Certificate archived successfully', 'success');
        fetchCertificates();
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to archive certificate', 'error');
      }
    } catch (error) {
      console.error('Error archiving certificate:', error);
      
      // Safe error handling to prevent toString errors
      let errorMessage = 'Unknown network error';
      try {
        if (error && typeof error === 'object') {
          if ('message' in error && error.message) {
            errorMessage = String(error.message);
          } else if ('toString' in error && typeof error.toString === 'function') {
            errorMessage = error.toString();
          }
        } else if (error) {
          errorMessage = String(error);
        }
      } catch (stringifyError) {
        console.error('Error while processing error message:', stringifyError);
        errorMessage = 'Network error occurred';
      }
      
      showToast(`Network error while archiving certificate: ${errorMessage}`, 'error');
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };



  const handleClearAllCertificates = () => {
    console.log('Clear all certificates button clicked');
    setShowConfirmModal(true);
    setConfirmationInput('');
  };
  
  const handleConfirmClearAll = async () => {
    console.log('User confirmed deletion with text:', confirmationInput);
    
    if (confirmationInput !== 'DELETE ALL CERTIFICATES') {
      console.log('Confirmation text did not match, cancelling deletion');
      showToast('Deletion cancelled. Confirmation text did not match.', 'error');
      setShowConfirmModal(false);
      return;
    }

    console.log('Confirmation text matched, proceeding with deletion');
    console.log('API URL:', `${API_BASE_URL}/certificate/bulk`);
    console.log('Token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      showToast('Authentication required. Please log in again.', 'error');
      setShowConfirmModal(false);
      return;
    }

    // Set loading state and immediately clear UI
    setIsLoading(true);
    
    // Optimistically clear the certificates list for immediate UI feedback
    setCertificates([]);
    setPagination({
      currentPage: 1,
      totalPages: 0,
      totalCertificates: 0,
      hasNext: false,
      hasPrev: false
    });

    try {
      const response = await fetch(`${API_BASE_URL}/certificate/bulk`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmText: 'DELETE ALL CERTIFICATES'
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        const deletedCount = data.data.deletedCount || 0;
        const filesDeleted = data.data.filesDeleted || 0;
        
        showToast(
          `Successfully deleted ${deletedCount} certificates and ${filesDeleted} files`, 
          'success'
        );
        
        // Refresh the certificates list to ensure UI is synchronized with database
        await fetchCertificates();
        console.log('Bulk deletion completed successfully');
      } else {
        console.error('Delete failed with response:', data);
        showToast(data.message || 'Failed to delete certificates', 'error');
        
        // Restore certificates list if deletion failed
        await fetchCertificates();
      }
    } catch (error) {
      console.error('Error deleting all certificates:', error);
      
      // Safe error handling to prevent toString errors
      let errorMessage = 'Unknown network error';
      try {
        if (error && typeof error === 'object') {
          if ('message' in error && error.message) {
            errorMessage = String(error.message);
          } else if ('toString' in error && typeof error.toString === 'function') {
            errorMessage = error.toString();
          }
        } else if (error) {
          errorMessage = String(error);
        }
      } catch (stringifyError) {
        console.error('Error while processing error message:', stringifyError);
        errorMessage = 'Network error occurred';
      }
      
      showToast(`Network error while deleting certificates: ${errorMessage}`, 'error');
      
      // Restore certificates list if network error occurred
      await fetchCertificates();
    } finally {
      setIsLoading(false);
      setShowConfirmModal(false);
      setConfirmationInput('');
    }
  };
  
  const handleCancelClearAll = () => {
    setShowConfirmModal(false);
    setConfirmationInput('');
  };

  // Bulk download functions
  const handleSelectCertificate = (certificateId: string) => {
    const newSelected = new Set(selectedCertificates);
    if (newSelected.has(certificateId)) {
      newSelected.delete(certificateId);
    } else {
      newSelected.add(certificateId);
    }
    setSelectedCertificates(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCertificates.size === certificates.length) {
      setSelectedCertificates(new Set());
    } else {
      setSelectedCertificates(new Set(certificates.map(cert => cert._id)));
    }
  };

  const handleBulkDownload = async () => {
    if (selectedCertificates.size === 0) {
      showToast('Please select certificates to download', 'error');
      return;
    }

    try {
      setIsBulkDownloading(true);
      setShowBulkProgress(true);

      const response = await fetch(`${API_BASE_URL}/certificate/bulk-download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificateIds: Array.from(selectedCertificates),
          format: bulkDownloadFormat
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `certificates-${bulkDownloadFormat}-${new Date().toISOString().slice(0, 10)}.zip`;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/); 
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast(`Successfully downloaded ${selectedCertificates.size} certificates as ${bulkDownloadFormat.toUpperCase()}`, 'success');
        setSelectedCertificates(new Set());
        fetchCertificates(); // Refresh to update download counts
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Failed to download certificates', 'error');
      }
    } catch (error) {
      console.error('Error during bulk download:', error);
      showToast('Network error during bulk download', 'error');
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const closeBulkProgress = () => {
    setShowBulkProgress(false);
  };

  // Show progress modal when bulk download progress is received
  React.useEffect(() => {
    if (bulkDownloadProgress) {
      setShowBulkProgress(true);
      
      // Auto-close progress modal after completion (with delay)
      if (bulkDownloadProgress.operation === 'bulk_download_complete') {
        setTimeout(() => {
          setShowBulkProgress(false);
        }, 3000);
      }
    }
  }, [bulkDownloadProgress]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="animate-slide-up">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Certificates
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Manage and download your generated certificates with ease
          </p>
        </div>
        
        <div className="flex items-center space-x-4 animate-slide-up">
          {certificates.length > 0 && (
            <button
              onClick={handleClearAllCertificates}
              className="btn btn-destructive btn-md hover-lift"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          )}
          
          <Link
            to="/generate"
            className="btn btn-gradient btn-md hover-lift shadow-glow-purple"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Generate Certificate
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card-glass animate-slide-up">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Search Certificates</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by participant name or certificate ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10 shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                {/* Bulk Download Controls */}
                {selectedCertificates.size > 0 && (
                  <div className="flex items-center gap-3 animate-scale-in">
                    <select
                      value={bulkDownloadFormat}
                      onChange={(e) => setBulkDownloadFormat(e.target.value as 'pdf' | 'png')}
                      className="input shadow-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="pdf">PDF Format</option>
                      <option value="png">PNG Format</option>
                    </select>
                    <button
                      onClick={handleBulkDownload}
                      disabled={isBulkDownloading || !isConnected}
                      className="btn btn-success btn-sm whitespace-nowrap hover-lift shadow-glow-green"
                    >
                      {isBulkDownloading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download {selectedCertificates.size} Certificate{selectedCertificates.size > 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Status</option>
                <option value="generated">Generated</option>
                <option value="downloaded">Downloaded</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            {/* Template Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Template</label>
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Templates</option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Sort */}
            <div>
              <label className="block text-sm font-medium mb-1">Sort By</label>
              <div className="flex space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input flex-1"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="participantName">Participant</option>
                  <option value="certificateId">Certificate ID</option>
                  <option value="downloadCount">Downloads</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="btn btn-outline btn-sm px-2"
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  <svg className={`w-4 h-4 transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certificates List */}
      <div className="card-elevated animate-slide-up">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="card-title flex items-center">
              <svg className="w-6 h-6 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Certificates
            </h3>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 dark:from-blue-900 dark:to-purple-900 dark:text-blue-200 rounded-full text-sm font-semibold">
                {pagination.totalCertificates} Total
              </span>
              {selectedCertificates.size > 0 && (
                <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900 dark:to-emerald-900 dark:text-green-200 rounded-full text-sm font-semibold animate-pulse-slow">
                  {selectedCertificates.size} Selected
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="card-content">
          {isLoading ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Select
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Certificate
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Participant
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Template
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Status
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Downloads
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10a2 2 0 002 2h4a2 2 0 002-2V11m-6 0h6" />
                        </svg>
                        Created
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                        Actions
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {Array.from({ length: 5 }, (_, index) => (
                    <CertificateTableRowSkeleton key={index} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No certificates found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Get started by generating your first certificate</p>
              <Link to="/generate" className="btn btn-gradient btn-md hover-lift shadow-glow-purple">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Generate Your First Certificate
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCertificates.size === certificates.length && certificates.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 transition-all duration-200"
                        />
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">All</span>
                      </div>
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Certificate
                      </div>
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Participant
                      </div>
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                        Template
                      </div>
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Status
                      </div>
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        Downloads
                      </div>
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Created
                      </div>
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                        Actions
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((certificate, index) => (
                    <tr key={certificate._id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all duration-300 hover:shadow-md animate-fade-in hover-lift`} style={{animationDelay: `${index * 50}ms`}}>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedCertificates.has(certificate._id)}
                            onChange={() => handleSelectCertificate(certificate._id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 transition-all duration-200 hover:scale-110"
                          />
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse-slow"></div>
                            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{certificate.certificateId}</span>
                          </div>
                          <div className="ml-5">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {certificate.generatedFiles?.pdf ? (
                                <span className="inline-flex items-center px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-medium mr-2">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                  </svg>
                                  PDF: {formatFileSize(certificate.generatedFiles.pdf.size)}
                                </span>
                              ) : null}
                              {certificate.generatedFiles?.png ? (
                                <span className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                  </svg>
                                  PNG: {formatFileSize(certificate.generatedFiles.png.size)}
                                </span>
                              ) : null}
                              {!certificate.generatedFiles?.pdf && !certificate.generatedFiles?.png && (
                                <span className="inline-flex items-center px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-medium">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Generation failed
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-y-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mr-3 shadow-md">
                            <span className="text-white font-semibold text-sm">{certificate.participantName.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{certificate.participantName}</p>
                            {certificate.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {certificate.tags.slice(0, 2).map((tag, index) => (
                                  <span key={index} className="px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700 text-blue-800 dark:text-blue-200 text-xs rounded-full font-medium hover:scale-105 transition-transform duration-200">
                                    {tag}
                                  </span>
                                ))}
                                {certificate.tags.length > 2 && (
                                  <span className="px-2 py-1 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-full font-medium">
                                    +{certificate.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-purple-500 rounded mr-2 shadow-sm"></div>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{certificate.template.name}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 ml-5">{certificate.templateSnapshot.filename}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className={`flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                            certificate.status === 'generated' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900 dark:to-emerald-900 dark:text-green-200' :
                            certificate.status === 'downloaded' ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 dark:from-blue-900 dark:to-cyan-900 dark:text-blue-200' :
                            certificate.status === 'archived' ? 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 dark:from-gray-900 dark:to-slate-900 dark:text-gray-200' :
                            'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 dark:from-yellow-900 dark:to-orange-900 dark:text-yellow-200'
                          }`}>
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              certificate.status === 'generated' ? 'bg-green-500 animate-pulse' :
                              certificate.status === 'downloaded' ? 'bg-blue-500' :
                              certificate.status === 'archived' ? 'bg-gray-500' :
                              'bg-yellow-500 animate-pulse'
                            }`}></div>
                            {certificate.status.charAt(0).toUpperCase() + certificate.status.slice(1)}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="flex items-center px-3 py-1 bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900 dark:to-blue-900 text-indigo-800 dark:text-indigo-200 rounded-full shadow-sm">
                            <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold text-sm">{certificate.metadata.downloadCount}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-1">downloads</p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(certificate.createdAt)}</span>
                          </div>
                          <div className="flex items-center ml-6">
                            <svg className="w-3 h-3 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Issued: {formatDate(certificate.issuedDate)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end space-x-2">
                          {certificate.status !== 'archived' && certificate.status === 'generated' && (
                            <>
                              {certificate.generatedFiles?.pdf && (
                                <button
                                  onClick={() => downloadCertificate(certificate._id, 'pdf')}
                                  className="btn btn-outline btn-sm hover-lift shadow-glow transition-all duration-200 hover:shadow-glow-red"
                                  title="Download PDF"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                  </svg>
                                  PDF
                                </button>
                              )}
                              {certificate.generatedFiles?.png && (
                                <button
                                  onClick={() => downloadCertificate(certificate._id, 'png')}
                                  className="btn btn-outline btn-sm hover-lift shadow-glow transition-all duration-200 hover:shadow-glow-green"
                                  title="Download PNG"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                  </svg>
                                  PNG
                                </button>
                              )}
                            </>
                          )}
                          {certificate.status !== 'archived' && (
                            <button
                              onClick={() => archiveCertificate(certificate._id)}
                              className="btn btn-outline btn-sm text-red-600 hover:text-red-700 hover-lift transition-all duration-200 hover:scale-105"
                              title="Archive Certificate"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-medium">
              Showing <span className="text-blue-600 dark:text-blue-400 font-semibold">{((pagination.currentPage - 1) * 10) + 1}</span> to <span className="text-blue-600 dark:text-blue-400 font-semibold">{Math.min(pagination.currentPage * 10, pagination.totalCertificates)}</span> of <span className="text-blue-600 dark:text-blue-400 font-semibold">{pagination.totalCertificates}</span> certificates
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrev}
              className="btn btn-outline btn-sm hover-lift transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover-lift ${
                      pageNum === pagination.currentPage
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-glow-purple'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-600 shadow-sm'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNext}
              className="btn btn-outline btn-sm hover-lift transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCancelClearAll}
        onConfirm={handleConfirmClearAll}
        title="Delete All Certificates"
        message="This action will permanently delete ALL certificates. This cannot be undone.\n\nTo confirm, please type: DELETE ALL CERTIFICATES"
        confirmButtonText="Delete All"
        cancelButtonText="Cancel"
        requiresTextConfirmation={true}
        requiredText="DELETE ALL CERTIFICATES"
        userInput={confirmationInput}
        onInputChange={setConfirmationInput}
      />
      
      {/* Bulk Download Progress Modal */}
      {showBulkProgress && (
        <BulkDownloadProgress
          onClose={closeBulkProgress}
          progress={bulkDownloadProgress}
        />
      )}
    </div>
  );
};

export default Certificates;