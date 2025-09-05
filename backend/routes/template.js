const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const Template = require('../models/Template');
const auth = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { validateTemplatePlaceholders } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/template/upload
// @desc    Upload certificate template
// @access  Private
router.post('/upload', auth, upload.single('template'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a template file.'
      });
    }

    const { name, description } = req.body;

    // Validate template name
    if (!name || name.trim().length < 2) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(400).json({
        success: false,
        message: 'Template name is required and must be at least 2 characters long'
      });
    }

    // Check if template with same name already exists
    const existingTemplate = await Template.findOne({ 
      name: name.trim(),
      createdBy: req.admin.id,
      isActive: true 
    });

    if (existingTemplate) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(400).json({
        success: false,
        message: 'A template with this name already exists'
      });
    }

    // Get actual image dimensions using Sharp
    let dimensions;
    try {
      const metadata = await sharp(req.file.path).metadata();
      dimensions = {
        width: metadata.width,
        height: metadata.height
      };
    } catch (error) {
      console.error('Error getting image dimensions:', error);
      // Fallback to default dimensions if Sharp fails
      dimensions = {
        width: 800,
        height: 600
      };
    }

    // Create template record
    const template = new Template({
      name: name.trim(),
      description: description?.trim() || '',
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      dimensions,
      placeholders: [], // Will be set later via placeholders endpoint
      createdBy: req.admin.id
    });

    await template.save();

    // Populate creator info for response
    await template.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Template uploaded successfully',
      data: {
        template: template.toJSON()
      }
    });

  } catch (error) {
    console.error('Template upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }

    res.status(500).json({
      success: false,
      message: 'Server error during template upload'
    });
  }
});

// @route   POST /api/template/:id/placeholders
// @desc    Save template placeholders
// @access  Private
router.post('/:id/placeholders', auth, validateTemplatePlaceholders, async (req, res) => {
  try {
    const { placeholders, dimensions } = req.body;
    const templateId = req.params.id;

    // Find template
    const template = await Template.findOne({
      _id: templateId,
      createdBy: req.admin.id,
      isActive: true
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied'
      });
    }

    // Update template with placeholders and dimensions
    template.placeholders = placeholders;
    if (dimensions) {
      template.dimensions = dimensions;
    }
    template.lastModifiedBy = req.admin.id;

    await template.save();

    // Populate creator info for response
    await template.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Template placeholders saved successfully',
      data: {
        template: template.toJSON()
      }
    });

  } catch (error) {
    console.error('Save placeholders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving placeholders'
    });
  }
});

// @route   GET /api/template
// @desc    Get all templates for current admin
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    
    // Build query
    const query = {
      createdBy: req.admin.id
    };

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get templates with pagination
    const templates = await Template.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Template.countDocuments(query);

    res.json({
      success: true,
      data: {
        templates,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching templates'
    });
  }
});

// @route   GET /api/template/:id
// @desc    Get single template
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      createdBy: req.admin.id
    }).populate('createdBy', 'name email');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied'
      });
    }

    res.json({
      success: true,
      data: {
        template: template.toJSON()
      }
    });

  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching template'
    });
  }
});

// @route   PUT /api/template/:id
// @desc    Update template details
// @access  Private
router.put('/:id', auth, async (req, res) => {
  console.log('=== TEMPLATE UPDATE REQUEST ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Raw body:', req.body);
  try {
    const { name, description, tags, isActive } = req.body;
    const templateId = req.params.id;

    console.log('Template update request body:', req.body);
    console.log('Extracted fields:', { name, description, tags, isActive });

    // If only updating isActive status (activation/deactivation)
    if (isActive !== undefined && !name && !description && !tags) {
      console.log('Processing isActive-only update');
      const template = await Template.findOne({
        _id: templateId,
        createdBy: req.admin.id
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found or access denied'
        });
      }

      template.isActive = isActive;
      template.lastModifiedBy = req.admin.id;
      await template.save();

      await template.populate('createdBy', 'name email');

      return res.json({
        success: true,
        message: `Template ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: {
          template: template.toJSON()
        }
      });
    }

    // Validate input for full update
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Template name is required and must be at least 2 characters long'
      });
    }

    // Find template
    const template = await Template.findOne({
      _id: templateId,
      createdBy: req.admin.id
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied'
      });
    }

    // Check if name is already taken by another template
    if (name.trim() !== template.name) {
      const existingTemplate = await Template.findOne({
        name: name.trim(),
        createdBy: req.admin.id,
        _id: { $ne: templateId },
        isActive: true
      });

      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          message: 'A template with this name already exists'
        });
      }
    }

    // Update template
    template.name = name.trim();
    template.description = description?.trim() || '';
    template.tags = tags || [];
    if (isActive !== undefined) {
      template.isActive = isActive;
    }
    template.lastModifiedBy = req.admin.id;

    await template.save();

    // Populate creator info for response
    await template.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: {
        template: template.toJSON()
      }
    });

  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating template'
    });
  }
});

// @route   DELETE /api/template/:id
// @desc    Delete template (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      createdBy: req.admin.id
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied'
      });
    }

    // Soft delete - mark as inactive
    template.isActive = false;
    await template.save();

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting template'
    });
  }
});

// @route   OPTIONS /api/template/:id/file
// @desc    Handle CORS preflight for template file
// @access  Public
router.options('/:id/file', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// @route   GET /api/template/:id/file
// @desc    Serve template file
// @access  Private
router.get('/:id/file', auth, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      createdBy: req.admin.id,
      isActive: true
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied'
      });
    }

    // Check if file exists
    try {
      await fs.access(template.filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Template file not found on server'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', template.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${template.originalName}"`);
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Send file
    res.sendFile(path.resolve(template.filePath));

  } catch (error) {
    console.error('Serve template file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while serving template file'
    });
  }
});

module.exports = router;