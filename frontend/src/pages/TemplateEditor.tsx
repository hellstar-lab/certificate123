import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { createNetworkErrorMessage, getErrorMessage } from '../utils/errorHandler';

const AuthenticatedImage: React.FC<{ src: string; alt: string; className?: string; token: string }> = ({ src, alt, className, token }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(src, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [src, token]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><LoadingSpinner size="sm" /></div>;
  }

  if (error || !imageUrl) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Failed to load image</div>;
  }

  return <img src={imageUrl} alt={alt} className={className} draggable={false} />;
};

interface Placeholder {
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
}

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
  placeholders: Placeholder[];
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

const TemplateEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { showToast } = useToast();
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/template/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplate(data.data.template);
      } else {
        showToast('Failed to load template', 'error');
        navigate('/templates');
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      const errorMessage = createNetworkErrorMessage('loading template', error);
      showToast(errorMessage, 'error');
      navigate('/templates');
    } finally {
      setIsLoading(false);
    }
  };

  const addPlaceholder = () => {
    if (!template) return;
    
    // Determine the type for the new placeholder
    // If there are no 'id' placeholders, create an 'id' placeholder
    // Otherwise, create a 'name' placeholder
    const hasIdPlaceholder = template.placeholders.some(p => p.type === 'id');
    const placeholderType = !hasIdPlaceholder ? 'id' : 'name';
    
    const newPlaceholder: Placeholder = {
      type: placeholderType,
      x: 100,
      y: 100,
      fontSize: 24,
      fontFamily: 'Arial',
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      rotation: 0,
    };
    
    setTemplate({
      ...template,
      placeholders: [...template.placeholders, newPlaceholder],
    });
  };

  const updatePlaceholder = (placeholderIndex: number, updates: Partial<Placeholder>) => {
    if (!template) return;
    
    setTemplate({
      ...template,
      placeholders: template.placeholders.map((p, index) => 
        index === placeholderIndex ? { ...p, ...updates } : p
      ),
    });
  };

  const deletePlaceholder = (placeholderIndex: number) => {
    if (!template) return;
    
    setTemplate({
      ...template,
      placeholders: template.placeholders.filter((_, index) => index !== placeholderIndex),
    });
    
    if (selectedPlaceholder === placeholderIndex) {
      setSelectedPlaceholder(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, placeholderIndex: number) => {
    e.preventDefault();
    const placeholder = template?.placeholders[placeholderIndex];
    if (!placeholder) return;
    
    setSelectedPlaceholder(placeholderIndex);
    setIsDragging(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || selectedPlaceholder === null || !template) return;
    
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;
    
    updatePlaceholder(selectedPlaceholder, {
      x: Math.max(0, newX),
      y: Math.max(0, newY),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const saveTemplate = async () => {
    console.log('🔥 SAVE BUTTON CLICKED! Function called at:', new Date().toISOString());
    
    if (!template) {
      console.error('No template found');
      showToast('No template loaded', 'error');
      return;
    }
    
    if (!id) {
      console.error('No template ID found');
      showToast('Template ID missing', 'error');
      return;
    }
    
    if (!token) {
      console.error('No authentication token found');
      showToast('Please log in again', 'error');
      return;
    }
    
    // Debug information
    console.log('=== SAVE TEMPLATE DEBUG ===');
    console.log('Template ID:', id);
    console.log('Token exists:', !!token);
    console.log('Template object:', template);
    console.log('Current placeholders:', template.placeholders.map(p => ({ type: p.type, x: p.x, y: p.y })));
    
    // Validate that we have at least one 'name' and one 'id' placeholder
    const hasNamePlaceholder = template.placeholders.some(p => p.type === 'name');
    const hasIdPlaceholder = template.placeholders.some(p => p.type === 'id');
    
    console.log('Has name placeholder:', hasNamePlaceholder);
    console.log('Has ID placeholder:', hasIdPlaceholder);
    
    if (!hasNamePlaceholder || !hasIdPlaceholder) {
      const missingTypes = [];
      if (!hasNamePlaceholder) missingTypes.push('Name');
      if (!hasIdPlaceholder) missingTypes.push('ID');
      
      console.log('Validation failed - missing types:', missingTypes);
      showToast(`Template must have at least one Name placeholder and one ID placeholder. Missing: ${missingTypes.join(', ')}. Current placeholders: ${template.placeholders.map(p => p.type).join(', ') || 'none'}`, 'error');
      return;
    }
    
    console.log('Validation passed, proceeding with save...');
    console.log('=== END DEBUG ===');
    
    try {
      setIsSaving(true);
      
      const requestData = {
        placeholders: template.placeholders,
        dimensions: template.dimensions,
      };
      
      console.log('=== API REQUEST DEBUG ===');
      console.log('Saving template with data:', requestData);
      console.log('API URL:', `${API_BASE_URL}/template/${id}/placeholders`);
      console.log('Request headers:', {
        'Authorization': `Bearer ${token?.substring(0, 10)}...`,
        'Content-Type': 'application/json',
      });
      console.log('Request body:', JSON.stringify(requestData, null, 2));
      
      // Test basic connectivity first
      console.log('Testing API connectivity...');
      try {
        const testResponse = await fetch(`${API_BASE_URL}/template/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log('Test GET request status:', testResponse.status);
      } catch (testError) {
        console.error('Test GET request failed:', testError);
      }
      
      console.log('Making actual save request...');
      const response = await fetch(`${API_BASE_URL}/template/${id}/placeholders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Success response data:', responseData);
        showToast('Template saved successfully!', 'success');
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = await response.text();
        }
        console.error('Save failed - Response:', errorData);
        console.error('Save failed - Status:', response.status);
        console.error('Save failed - Status Text:', response.statusText);
        
        // Show detailed error message
        let errorMessage = errorData?.message || 'Failed to save template';
        if (errorData?.errors && errorData.errors.length > 0) {
          errorMessage += ': ' + errorData.errors.map((err: any) => err.message).join(', ');
        }
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      const errorMessage = createNetworkErrorMessage('saving template', error);
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading template editor..." />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Template not found</p>
        <button
          onClick={() => navigate('/templates')}
          className="btn btn-primary btn-sm mt-4"
        >
          Back to Templates
        </button>
      </div>
    );
  }

  const selectedPlaceholderData = selectedPlaceholder !== null ? template.placeholders[selectedPlaceholder] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Template Editor</h1>
          <p className="text-muted-foreground mt-1">
            Editing: {template.name}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/templates')}
            className="btn btn-outline btn-md"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              console.log('🚀 Save button clicked - event handler triggered');
              alert('Save button clicked! Check console for details.');
              saveTemplate();
            }}
            disabled={isSaving}
            className="btn btn-primary btn-md"
          >
            {isSaving ? (
              <div className="flex items-center">
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </div>
            ) : (
              'Save Template'
            )}
          </button>
        </div>
        
        {/* DEBUG TEST SECTION */}
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">🔧 Debug Test Section</h3>
          <button
            onClick={async () => {
              console.log('🧪 TEST: Direct API call without validation');
              try {
                const testData = {
                  placeholders: [{ type: 'name', x: 100, y: 100, fontSize: 16, fontFamily: 'Arial', color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left', rotation: 0 }],
                  dimensions: { width: 800, height: 600 }
                };
                
                const response = await fetch(`${API_BASE_URL}/template/${id}/placeholders`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(testData),
                });
                
                console.log('🧪 TEST Response:', response.status, response.statusText);
                const data = await response.json();
                console.log('🧪 TEST Data:', data);
                alert(`Test API call: ${response.status} - ${response.statusText}`);
              } catch (error) {
                console.error('🧪 TEST Error:', error);
                const errorMessage = getErrorMessage(error);
                alert(`Test API call failed: ${errorMessage}`);
              }
            }}
            className="bg-yellow-500 text-white px-4 py-2 rounded mr-2"
          >
            🧪 Test Direct API Call
          </button>
          
          <button
             onClick={() => {
               console.log('🔍 Current State:');
               console.log('- Template ID:', id);
               console.log('- Token exists:', !!token);
               console.log('- Template loaded:', !!template);
               console.log('- API Base URL:', API_BASE_URL);
               if (template) {
                 console.log('- Placeholders count:', template.placeholders.length);
                 console.log('- Placeholders:', template.placeholders);
               }
             }}
             className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
           >
             🔍 Log Current State
           </button>
           
           <button
             onClick={async () => {
               console.log('🌐 Testing network connectivity...');
               try {
                 // Test basic connectivity to backend
                 const healthResponse = await fetch(`${API_BASE_URL}/health`);
                 console.log('Health check:', healthResponse.status, healthResponse.statusText);
                 
                 // Test authentication endpoint
                 const authResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
                   headers: { 'Authorization': `Bearer ${token}` }
                 });
                 console.log('Auth check:', authResponse.status, authResponse.statusText);
                 
                 alert(`Health: ${healthResponse.status}, Auth: ${authResponse.status}`);
               } catch (error) {
                 console.error('Network test failed:', error);
                 const errorMessage = getErrorMessage(error);
                alert(`Network test failed: ${errorMessage}`);
               }
             }}
             className="bg-green-500 text-white px-4 py-2 rounded"
           >
             🌐 Test Network
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Template Preview</h3>
              <p className="card-description">
                Click and drag to position placeholders
              </p>
            </div>
            <div className="card-content">
              <div 
                className="relative border-2 border-dashed border-border rounded-lg overflow-hidden bg-white"
                style={{
                  width: '100%',
                  maxWidth: '800px',
                  aspectRatio: template.dimensions 
                    ? `${template.dimensions.width} / ${template.dimensions.height}`
                    : '16 / 9',
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {token ? (
                  <AuthenticatedImage
                    src={`${API_BASE_URL}/template/${template._id}/file`}
                    alt={template.name}
                    className="w-full h-full object-contain"
                    token={token}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">Please log in to view template</div>
                )}
                
                {template.placeholders.map((placeholder, index) => (
                  <div
                    key={index}
                    className={`absolute cursor-move border-2 px-2 py-1 rounded ${
                      selectedPlaceholder === index
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-400 bg-gray-100/80'
                    }`}
                    style={{
                      left: placeholder.x,
                      top: placeholder.y,
                      fontSize: placeholder.fontSize,
                      fontFamily: placeholder.fontFamily,
                      color: placeholder.color,
                      fontWeight: placeholder.fontWeight,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, index)}
                    onClick={() => setSelectedPlaceholder(index)}
                  >
                    {placeholder.type === 'name' ? 'Name' : 'ID'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Placeholders</h3>
            </div>
            <div className="card-content">
              <button
                onClick={addPlaceholder}
                className="btn btn-primary btn-sm w-full mb-4"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Placeholder
              </button>
              
              <div className="space-y-2">
                {template.placeholders.map((placeholder, index) => (
                  <div
                    key={index}
                    className={`p-2 border rounded cursor-pointer ${
                      selectedPlaceholder === index
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                    onClick={() => setSelectedPlaceholder(index)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{placeholder.type === 'name' ? 'Name' : 'ID'}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlaceholder(index);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedPlaceholderData && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Properties</h3>
              </div>
              <div className="card-content space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={selectedPlaceholderData.type}
                    onChange={(e) => updatePlaceholder(selectedPlaceholder!, { type: e.target.value })}
                    className="input"
                  >
                    <option value="name">Name</option>
                    <option value="id">ID</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">X Position</label>
                    <input
                      type="number"
                      value={selectedPlaceholderData.x}
                      onChange={(e) => updatePlaceholder(selectedPlaceholder!, { x: parseInt(e.target.value) || 0 })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Y Position</label>
                    <input
                      type="number"
                      value={selectedPlaceholderData.y}
                      onChange={(e) => updatePlaceholder(selectedPlaceholder!, { y: parseInt(e.target.value) || 0 })}
                      className="input"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Font Size</label>
                  <input
                    type="number"
                    value={selectedPlaceholderData.fontSize}
                    onChange={(e) => updatePlaceholder(selectedPlaceholder!, { fontSize: parseInt(e.target.value) || 12 })}
                    className="input"
                    min="8"
                    max="72"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Font Family</label>
                  <select
                    value={selectedPlaceholderData.fontFamily}
                    onChange={(e) => updatePlaceholder(selectedPlaceholder!, { fontFamily: e.target.value })}
                    className="input"
                    style={{ fontFamily: selectedPlaceholderData.fontFamily }}
                  >
                    {/* Sans-serif fonts */}
                    <option value="Arial" style={{ fontFamily: 'Arial' }}>Arial</option>
                    <option value="Helvetica" style={{ fontFamily: 'Helvetica' }}>Helvetica</option>
                    <option value="Verdana" style={{ fontFamily: 'Verdana' }}>Verdana</option>
                    <option value="Calibri" style={{ fontFamily: 'Calibri' }}>Calibri</option>
                    <option value="Tahoma" style={{ fontFamily: 'Tahoma' }}>Tahoma</option>
                    <option value="Geneva" style={{ fontFamily: 'Geneva' }}>Geneva</option>
                    <option value="Lucida Sans" style={{ fontFamily: 'Lucida Sans' }}>Lucida Sans</option>
                    <option value="Trebuchet MS" style={{ fontFamily: 'Trebuchet MS' }}>Trebuchet MS</option>
                    <option value="Century Gothic" style={{ fontFamily: 'Century Gothic' }}>Century Gothic</option>
                    <option value="Franklin Gothic Medium" style={{ fontFamily: 'Franklin Gothic Medium' }}>Franklin Gothic Medium</option>
                    <option value="Segoe UI" style={{ fontFamily: 'Segoe UI' }}>Segoe UI</option>
                    <option value="Open Sans" style={{ fontFamily: 'Open Sans' }}>Open Sans</option>
                    <option value="Roboto" style={{ fontFamily: 'Roboto' }}>Roboto</option>
                    <option value="Lato" style={{ fontFamily: 'Lato' }}>Lato</option>
                    <option value="Montserrat" style={{ fontFamily: 'Montserrat' }}>Montserrat</option>
                    <option value="Source Sans Pro" style={{ fontFamily: 'Source Sans Pro' }}>Source Sans Pro</option>
                    <option value="Ubuntu" style={{ fontFamily: 'Ubuntu' }}>Ubuntu</option>
                    <option value="Nunito" style={{ fontFamily: 'Nunito' }}>Nunito</option>
                    <option value="Poppins" style={{ fontFamily: 'Poppins' }}>Poppins</option>
                    <option value="Inter" style={{ fontFamily: 'Inter' }}>Inter</option>
                    
                    {/* Serif fonts */}
                    <option value="Times New Roman" style={{ fontFamily: 'Times New Roman' }}>Times New Roman</option>
                    <option value="Georgia" style={{ fontFamily: 'Georgia' }}>Georgia</option>
                    <option value="Times" style={{ fontFamily: 'Times' }}>Times</option>
                    <option value="Book Antiqua" style={{ fontFamily: 'Book Antiqua' }}>Book Antiqua</option>
                    <option value="Palatino" style={{ fontFamily: 'Palatino' }}>Palatino</option>
                    <option value="Garamond" style={{ fontFamily: 'Garamond' }}>Garamond</option>
                    <option value="Baskerville" style={{ fontFamily: 'Baskerville' }}>Baskerville</option>
                    <option value="Cambria" style={{ fontFamily: 'Cambria' }}>Cambria</option>
                    <option value="Minion Pro" style={{ fontFamily: 'Minion Pro' }}>Minion Pro</option>
                    <option value="Caslon" style={{ fontFamily: 'Caslon' }}>Caslon</option>
                    <option value="Crimson Text" style={{ fontFamily: 'Crimson Text' }}>Crimson Text</option>
                    <option value="Playfair Display" style={{ fontFamily: 'Playfair Display' }}>Playfair Display</option>
                    <option value="Merriweather" style={{ fontFamily: 'Merriweather' }}>Merriweather</option>
                    <option value="Lora" style={{ fontFamily: 'Lora' }}>Lora</option>
                    <option value="PT Serif" style={{ fontFamily: 'PT Serif' }}>PT Serif</option>
                    
                    {/* Monospace fonts */}
                    <option value="Courier New" style={{ fontFamily: 'Courier New' }}>Courier New</option>
                    <option value="Monaco" style={{ fontFamily: 'Monaco' }}>Monaco</option>
                    <option value="Consolas" style={{ fontFamily: 'Consolas' }}>Consolas</option>
                    <option value="Lucida Console" style={{ fontFamily: 'Lucida Console' }}>Lucida Console</option>
                    <option value="Source Code Pro" style={{ fontFamily: 'Source Code Pro' }}>Source Code Pro</option>
                    <option value="Fira Code" style={{ fontFamily: 'Fira Code' }}>Fira Code</option>
                    
                    {/* Display/Decorative fonts */}
                    <option value="Impact" style={{ fontFamily: 'Impact' }}>Impact</option>
                    <option value="Bebas Neue" style={{ fontFamily: 'Bebas Neue' }}>Bebas Neue</option>
                    <option value="Oswald" style={{ fontFamily: 'Oswald' }}>Oswald</option>
                    <option value="Raleway" style={{ fontFamily: 'Raleway' }}>Raleway</option>
                    <option value="Quicksand" style={{ fontFamily: 'Quicksand' }}>Quicksand</option>
                    <option value="Comfortaa" style={{ fontFamily: 'Comfortaa' }}>Comfortaa</option>
                    <option value="Dancing Script" style={{ fontFamily: 'Dancing Script' }}>Dancing Script</option>
                    <option value="Pacifico" style={{ fontFamily: 'Pacifico' }}>Pacifico</option>
                    <option value="Lobster" style={{ fontFamily: 'Lobster' }}>Lobster</option>
                    <option value="Great Vibes" style={{ fontFamily: 'Great Vibes' }}>Great Vibes</option>
                    <option value="Amatic SC" style={{ fontFamily: 'Amatic SC' }}>Amatic SC</option>
                    <option value="Righteous" style={{ fontFamily: 'Righteous' }}>Righteous</option>
                  </select>
                  
                  {/* Font Preview */}
                  <div className="mt-2 p-3 border rounded bg-background">
                    <p className="text-sm text-muted-foreground mb-1">Preview:</p>
                    <p 
                      style={{ 
                        fontFamily: selectedPlaceholderData.fontFamily,
                        fontSize: `${Math.min(selectedPlaceholderData.fontSize, 24)}px`,
                        fontWeight: selectedPlaceholderData.fontWeight,
                        color: selectedPlaceholderData.color
                      }}
                      className="truncate"
                    >
                      {selectedPlaceholderData.type === 'name' ? 'John Doe' : 'CERT-2024-001'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Font Weight</label>
                  <select
                    value={selectedPlaceholderData.fontWeight}
                    onChange={(e) => updatePlaceholder(selectedPlaceholder!, { fontWeight: e.target.value })}
                    className="input"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Color</label>
                  <input
                    type="color"
                    value={selectedPlaceholderData.color}
                    onChange={(e) => updatePlaceholder(selectedPlaceholder!, { color: e.target.value })}
                    className="input h-10"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;