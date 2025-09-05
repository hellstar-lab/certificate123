import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { createNetworkErrorMessage } from '../utils/errorHandler';

interface Template {
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

interface PlaceholderValue {
  placeholderIndex: number;
  value: string;
}

const Generate: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { showToast } = useToast();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form data
  const [participantName, setParticipantName] = useState('');
  const [placeholderValues, setPlaceholderValues] = useState<PlaceholderValue[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      // Initialize placeholder values when template is selected
      setPlaceholderValues(
        selectedTemplate.placeholders.map((_, index) => ({
          placeholderIndex: index,
          value: '',
        }))
      );
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const response = await fetch(`${API_BASE_URL}/template?status=active&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data.templates || []);
      } else {
        showToast('Failed to load templates', 'error');
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      const errorMessage = createNetworkErrorMessage('loading templates', error);
      showToast(errorMessage, 'error');
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const updatePlaceholderValue = (placeholderIndex: number, value: string) => {
    setPlaceholderValues(prev => 
      prev.map(pv => 
        pv.placeholderIndex === placeholderIndex ? { ...pv, value } : pv
      )
    );
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const validateForm = () => {
    if (!selectedTemplate) {
      showToast('Please select a template', 'error');
      return false;
    }
    
    if (!participantName.trim()) {
      showToast('Please enter participant name', 'error');
      return false;
    }
    
    // Check if all placeholders have values
    const emptyPlaceholders = placeholderValues.filter(pv => !pv.value.trim());
    if (emptyPlaceholders.length > 0) {
      showToast('Please fill in all placeholder values', 'error');
      return false;
    }
    
    return true;
  };

  const generateCertificate = async () => {
    if (!validateForm()) return;
    
    try {
      setIsGenerating(true);
      
      // Get actual container dimensions from the template preview
      const templateContainer = document.querySelector('[data-template-container]') as HTMLElement;
      let containerDimensions = { width: 800, height: 600 }; // fallback
      
      if (templateContainer) {
        const rect = templateContainer.getBoundingClientRect();
        containerDimensions = {
          width: rect.width,
          height: rect.height
        };
      }
      
      const requestData = {
        templateId: selectedTemplate!._id,
        participantName: participantName.trim(),
        placeholderValues: placeholderValues.reduce((acc, pv) => {
          const placeholder = selectedTemplate!.placeholders[pv.placeholderIndex];
          acc[placeholder.type] = pv.value.trim();
          return acc;
        }, {} as Record<string, string>),
        containerDimensions,
        tags,
        notes: notes.trim(),
        issuedDate,
        expiryDate: expiryDate || undefined,
      };
      
      const response = await fetch(`${API_BASE_URL}/certificate/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        await response.json();
        showToast('Certificate generated successfully!', 'success');
        
        // Reset form
        setParticipantName('');
        setPlaceholderValues([]);
        setTags([]);
        setNotes('');
        setIssuedDate(new Date().toISOString().split('T')[0]);
        setExpiryDate('');
        setSelectedTemplate(null);
        
        // Navigate to certificates page
        navigate('/certificates');
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to generate certificate', 'error');
      }
    } catch (error) {
      console.error('Error generating certificate:', error);
      const errorMessage = createNetworkErrorMessage('generating certificate', error);
      showToast(errorMessage, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Generate Certificate</h1>
          <p className="text-muted-foreground mt-1">
            Create a new certificate from a template
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selection */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Select Template</h3>
              <p className="card-description">
                Choose a template to generate certificate
              </p>
            </div>
            <div className="card-content">
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" text="Loading templates..." />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No active templates found</p>
                  <button
                    onClick={() => navigate('/templates')}
                    className="btn btn-primary btn-sm"
                  >
                    Upload Template
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template._id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?._id === template._id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {template.description || 'No description'}
                          </p>
                          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                            <span>{template.placeholders.length} placeholders</span>
                            <span>{formatFileSize(template.fileSize)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Certificate Form */}
        <div className="lg:col-span-2">
          {!selectedTemplate ? (
            <div className="card">
              <div className="card-content">
                <div className="text-center py-12">
                  <svg className="w-12 h-12 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-muted-foreground">Select a template to start generating certificate</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Template Preview */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Template Preview</h3>
                  <p className="card-description">
                    {selectedTemplate.name} - {selectedTemplate.placeholders.length} placeholders
                  </p>
                </div>
                <div className="card-content">
                  <div 
                    className="relative border border-border rounded-lg overflow-hidden bg-white"
                    data-template-container
                    style={{
                      maxWidth: '800px',
                      aspectRatio: selectedTemplate.dimensions 
                        ? `${selectedTemplate.dimensions.width} / ${selectedTemplate.dimensions.height}`
                        : '16 / 9',
                    }}
                  >
                    <img
                      src={`${API_BASE_URL}/template/${selectedTemplate._id}/file`}
                      alt={selectedTemplate.name}
                      className="w-full h-auto max-h-96 object-contain"
                    />
                    
                    {/* Placeholder overlays */}
                    {selectedTemplate.placeholders.map((placeholder, index) => {
                      const placeholderValue = placeholderValues.find(pv => pv.placeholderIndex === index);
                      return (
                        <div
                          key={index}
                          className="absolute border-2 border-primary bg-primary/10 px-2 py-1 rounded pointer-events-none"
                          style={{
                            left: placeholder.x,
                            top: placeholder.y,
                            fontSize: Math.max(8, placeholder.fontSize * 0.5), // Scale down for preview
                            fontFamily: placeholder.fontFamily,
                            color: placeholder.color,
                            fontWeight: placeholder.fontWeight,
                          }}
                        >
                          {placeholderValue?.value || (placeholder.type === 'name' ? 'Name' : 'ID')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Certificate Form */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Certificate Details</h3>
                  <p className="card-description">
                    Fill in the details for the certificate
                  </p>
                </div>
                <div className="card-content space-y-6">
                  {/* Participant Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Participant Name *</label>
                    <input
                      type="text"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      placeholder="Enter participant's full name"
                      className="input"
                      required
                    />
                  </div>

                  {/* Placeholder Values */}
                  {selectedTemplate.placeholders.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Placeholder Values *</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedTemplate.placeholders.map((placeholder, index) => {
                          const placeholderValue = placeholderValues.find(pv => pv.placeholderIndex === index);
                          const displayName = placeholder.type === 'name' ? 'Name' : 'ID';
                          return (
                            <div key={index}>
                              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                                {displayName}
                              </label>
                              <input
                                type="text"
                                value={placeholderValue?.value || ''}
                                onChange={(e) => updatePlaceholderValue(index, e.target.value)}
                                placeholder={`Enter value for ${displayName}`}
                                className="input"
                                required
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Issued Date *</label>
                      <input
                        type="date"
                        value={issuedDate}
                        onChange={(e) => setIssuedDate(e.target.value)}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="input"
                        min={issuedDate}
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Tags (Optional)</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 text-sm bg-secondary text-secondary-foreground rounded"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-muted-foreground hover:text-foreground"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleTagInputKeyPress}
                        placeholder="Add a tag and press Enter"
                        className="input flex-1"
                      />
                      <button
                        onClick={addTag}
                        disabled={!tagInput.trim()}
                        className="btn btn-outline btn-md"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional notes about this certificate"
                      rows={3}
                      className="input resize-none"
                    />
                  </div>

                  {/* Generate Button */}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setSelectedTemplate(null);
                        setParticipantName('');
                        setPlaceholderValues([]);
                        setTags([]);
                        setNotes('');
                        setIssuedDate(new Date().toISOString().split('T')[0]);
                        setExpiryDate('');
                      }}
                      className="btn btn-outline btn-md"
                    >
                      Reset
                    </button>
                    <button
                      onClick={generateCertificate}
                      disabled={isGenerating}
                      className="btn btn-primary btn-md"
                    >
                      {isGenerating ? (
                        <div className="flex items-center">
                          <LoadingSpinner size="sm" className="mr-2" />
                          Generating...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Generate Certificate
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Generate;