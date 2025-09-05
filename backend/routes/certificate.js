const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const Certificate = require('../models/Certificate');
const Template = require('../models/Template');
const auth = require('../middleware/auth');
const { validateCertificateCreation } = require('../middleware/validation');
const certificateGenerator = require('../services/certificateGenerator');
const websocketService = require('../services/websocketService');

const router = express.Router();

// @route   POST /api/certificate/create
// @desc    Create new certificate
// @access  Private
router.post('/create', auth, validateCertificateCreation, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { participantName, templateId, placeholderValues, containerDimensions, notes, tags } = req.body;

    // Find and validate template
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

    // Check if template has required placeholders
    if (!template.placeholders || template.placeholders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Template must have placeholders configured before generating certificates'
      });
    }

    const hasNamePlaceholder = template.placeholders.some(p => p.type === 'name');
    const hasIdPlaceholder = template.placeholders.some(p => p.type === 'id');

    if (!hasNamePlaceholder || !hasIdPlaceholder) {
      return res.status(400).json({
        success: false,
        message: 'Template must have both name and ID placeholders configured'
      });
    }

    // Generate unique certificate ID
    const certificateId = await Certificate.generateNextId();

    // Create certificate record
    const certificate = new Certificate({
      certificateId,
      participantName: participantName.trim(),
      template: template._id,
      templateSnapshot: {
        name: template.name,
        filename: template.filename,
        placeholders: template.placeholders,
        dimensions: template.dimensions
      },
      status: 'pending',
      metadata: {
        generationTime: 0, // Will be updated after generation
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      createdBy: req.admin.id,
      notes: notes?.trim() || '',
      tags: tags || []
    });

    await certificate.save();

    // Increment template usage count
    await template.incrementUsage();

    // Generate actual certificate files
    try {
      const generatedFiles = await certificateGenerator.generateCertificate(
        certificate,
        template,
        placeholderValues,
        containerDimensions
      );
      
      // Calculate generation time
      const generationTime = Date.now() - startTime;
      certificate.metadata.generationTime = generationTime;
      certificate.status = 'generated';
      
      // Set generated files info
      certificate.generatedFiles = {
        pdf: {
          filename: generatedFiles.pdf.filename,
          path: generatedFiles.pdf.path,
          size: generatedFiles.pdf.size,
          url: `/api/certificate/${certificate._id}/download/pdf`
        },
        png: {
          filename: generatedFiles.png.filename,
          path: generatedFiles.png.path,
          size: generatedFiles.png.size,
          url: `/api/certificate/${certificate._id}/download/png`
        }
      };
    } catch (genError) {
      console.error('Certificate file generation failed:', genError);
      certificate.status = 'failed';
      certificate.generatedFiles = {};
    }

    await certificate.save();

    // Populate references for response
    await certificate.populate([
      { path: 'template', select: 'name description' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Certificate created successfully',
      data: {
        certificate: certificate.toJSON()
      }
    });

  } catch (error) {
    console.error('Certificate creation error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Certificate ID already exists. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during certificate creation'
    });
  }
});

// @route   GET /api/certificate
// @desc    Get all certificates for current admin
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      templateId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    const query = {
      createdBy: req.admin.id,
      isActive: true
    };

    if (status && ['pending', 'generated', 'failed', 'archived'].includes(status)) {
      query.status = status;
    }

    if (templateId) {
      query.template = templateId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { participantName: { $regex: search, $options: 'i' } },
        { certificateId: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get certificates with pagination
    const certificates = await Certificate.find(query)
      .populate('template', 'name description')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Certificate.countDocuments(query);

    res.json({
      success: true,
      data: {
        certificates,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching certificates'
    });
  }
});

// @route   GET /api/certificate/:id
// @desc    Get single certificate
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      _id: req.params.id,
      createdBy: req.admin.id
    }).populate([
      { path: 'template', select: 'name description' },
      { path: 'createdBy', select: 'name email' }
    ]);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or access denied'
      });
    }

    res.json({
      success: true,
      data: {
        certificate: certificate.toJSON()
      }
    });

  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching certificate'
    });
  }
});

// @route   GET /api/certificate/:id/download/:format
// @desc    Download certificate in specified format
// @access  Private
router.get('/:id/download/:format', auth, async (req, res) => {
  try {
    const { id, format } = req.params;
    
    if (!['pdf', 'png'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Supported formats: pdf, png'
      });
    }

    const certificate = await Certificate.findOne({
      _id: id,
      createdBy: req.admin.id,
      isActive: true
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or access denied'
      });
    }

    if (certificate.status !== 'generated') {
      return res.status(400).json({
        success: false,
        message: 'Certificate is not ready for download'
      });
    }

    const fileInfo = certificate.generatedFiles[format];
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: `${format.toUpperCase()} file not found`
      });
    }

    // Check if file exists and serve it
    const actualFileInfo = await certificateGenerator.getFileInfo(certificate.certificateId, format);
    
    if (!actualFileInfo.exists) {
      return res.status(404).json({
        success: false,
        message: `${format.toUpperCase()} file not found on disk`
      });
    }
    
    // Increment download count
    await certificate.incrementDownloadCount();

    // Set headers for file download
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);
    res.setHeader('Content-Length', actualFileInfo.size);
    
    // Serve the actual file
    res.sendFile(path.resolve(actualFileInfo.path));

  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during certificate download'
    });
  }
});

// @route   PUT /api/certificate/:id
// @desc    Update certificate details
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { notes, tags } = req.body;
    const certificateId = req.params.id;

    const certificate = await Certificate.findOne({
      _id: certificateId,
      createdBy: req.admin.id
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or access denied'
      });
    }

    // Update certificate
    if (notes !== undefined) certificate.notes = notes.trim();
    if (tags !== undefined) certificate.tags = tags;

    await certificate.save();

    // Populate references for response
    await certificate.populate([
      { path: 'template', select: 'name description' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Certificate updated successfully',
      data: {
        certificate: certificate.toJSON()
      }
    });

  } catch (error) {
    console.error('Update certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating certificate'
    });
  }
});

// @route   DELETE /api/certificate/bulk
// @desc    Delete all certificates for current admin (hard delete)
// @access  Private
router.delete('/bulk', auth, async (req, res) => {
  try {
    console.log('=== BULK DELETE REQUEST RECEIVED ===');
    console.log('Request body:', req.body);
    console.log('Admin ID:', req.admin.id);
    
    const { confirmText } = req.body;
    console.log('Confirmation text received:', confirmText);
    
    // Require confirmation text for safety
    if (confirmText !== 'DELETE ALL CERTIFICATES') {
      console.log('Invalid confirmation text, rejecting request');
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation text. Please type "DELETE ALL CERTIFICATES" to confirm.'
      });
    }
    
    console.log('Confirmation text valid, proceeding with deletion');

    // Find all active certificates for this admin (excluding already archived ones)
    const certificates = await Certificate.find({
      createdBy: req.admin.id,
      $and: [
        {
          $or: [
            { isActive: { $exists: false } },
            { isActive: true }
          ]
        },
        {
          $or: [
            { isArchived: { $exists: false } },
            { isArchived: false },
            { isArchived: null }
          ]
        }
      ]
    });

    console.log(`Found ${certificates.length} certificates to delete`);

    if (certificates.length === 0) {
      return res.json({
        success: true,
        message: 'No certificates found to delete',
        data: {
          deletedCount: 0
        }
      });
    }

    // Delete associated files first
    let filesDeleted = 0;
    for (const certificate of certificates) {
      try {
        if (certificate.pdfPath) {
          const pdfFullPath = path.join(__dirname, '..', certificate.pdfPath);
          await fs.unlink(pdfFullPath);
          console.log(`Deleted PDF: ${pdfFullPath}`);
          filesDeleted++;
        }
        if (certificate.pngPath) {
          const pngFullPath = path.join(__dirname, '..', certificate.pngPath);
          await fs.unlink(pngFullPath);
          console.log(`Deleted PNG: ${pngFullPath}`);
          filesDeleted++;
        }
      } catch (fileError) {
        console.error(`Error deleting files for certificate ${certificate._id}:`, fileError);
        // Continue with other certificates even if file deletion fails
      }
    }

    // Hard delete all certificates from database
    const result = await Certificate.deleteMany({
      createdBy: req.admin.id,
      isActive: true,
      $or: [
        { isArchived: { $exists: false } },
        { isArchived: false }
      ]
    });

    console.log(`Permanently deleted ${result.deletedCount} certificates and ${filesDeleted} files`);

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} certificates`,
      data: {
        deletedCount: result.deletedCount,
        filesDeleted: filesDeleted
      }
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while archiving certificates'
    });
  }
});

// @route   DELETE /api/certificate/:id
// @desc    Archive certificate
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      _id: req.params.id,
      createdBy: req.admin.id
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or access denied'
      });
    }

    // Archive certificate
    await certificate.archive();

    res.json({
      success: true,
      message: 'Certificate archived successfully'
    });

  } catch (error) {
    console.error('Archive certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while archiving certificate'
    });
  }
});

// @route   GET /api/certificate/stats/dashboard
// @desc    Get certificate statistics for dashboard
// @access  Private
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    // Get overall statistics
    const totalCertificates = await Certificate.countDocuments({
      createdBy: req.admin.id,
      isActive: true
    });

    const totalDownloads = await Certificate.aggregate([
      { $match: { createdBy: req.admin.id, isActive: true } },
      { $group: { _id: null, total: { $sum: '$metadata.downloadCount' } } }
    ]);

    const recentCertificates = await Certificate.find({
      createdBy: req.admin.id,
      isActive: true
    })
    .populate('template', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

    // Get certificates by status
    const statusStats = await Certificate.aggregate([
      { $match: { createdBy: req.admin.id, isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get certificates by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await Certificate.aggregate([
      { 
        $match: { 
          createdBy: req.admin.id, 
          isActive: true,
          createdAt: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalCertificates,
          totalDownloads: totalDownloads[0]?.total || 0,
          recentCertificates
        },
        statusBreakdown: statusStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        monthlyTrend: monthlyStats
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
});

// @route   DELETE /api/certificate/bulk

// Bulk download certificates as ZIP
router.post('/bulk-download', auth, async (req, res) => {
  try {
    console.log('=== BULK DOWNLOAD REQUEST RECEIVED ===');
    console.log('Request body:', req.body);
    console.log('Admin ID:', req.admin.id);
    
    const { certificateIds, format = 'pdf' } = req.body;
    
    if (!certificateIds || !Array.isArray(certificateIds) || certificateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of certificate IDs to download'
      });
    }
    
    if (!['pdf', 'png'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use "pdf" or "png"'
      });
    }
    
    console.log(`Processing bulk download for ${certificateIds.length} certificates in ${format} format`);
    
    // Find certificates
    const certificates = await Certificate.find({
      _id: { $in: certificateIds },
      createdBy: req.admin.id,
      isActive: true
    });
    
    if (certificates.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid certificates found for download'
      });
    }
    
    console.log(`Found ${certificates.length} valid certificates`);
    
    // Send initial progress update
    websocketService.sendBulkDownloadProgress(req.admin.id, {
      status: 'started',
      total: certificates.length,
      processed: 0,
      added: 0,
      message: 'Starting bulk download preparation...'
    });
    
    // Set response headers for ZIP download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipFileName = `certificates-${format}-${timestamp}.zip`;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      websocketService.sendBulkDownloadError(req.admin.id, err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error creating ZIP archive'
        });
      }
    });
    
    // Pipe archive to response
    archive.pipe(res);
    
    let processedCount = 0;
    let addedCount = 0;
    
    // Process each certificate
    for (const certificate of certificates) {
      try {
        const filePath = format === 'pdf' ? certificate.pdfPath : certificate.pngPath;
        
        if (!filePath) {
          console.log(`No ${format} file found for certificate ${certificate.certificateId}`);
          processedCount++;
          continue;
        }
        
        const fullPath = path.join(__dirname, '..', filePath);
        
        // Check if file exists
        try {
          await fs.access(fullPath);
        } catch (fileError) {
          console.log(`File not found: ${fullPath}`);
          processedCount++;
          continue;
        }
        
        // Create a safe filename
        const safeFileName = `${certificate.participantName.replace(/[^a-zA-Z0-9\s-_]/g, '')}_${certificate.certificateId}.${format}`;
        
        // Add file to archive
        archive.file(fullPath, { name: safeFileName });
        addedCount++;
        processedCount++;
        
        console.log(`Added ${safeFileName} to archive (${processedCount}/${certificates.length})`);
        
        // Send progress update
        websocketService.sendBulkDownloadProgress(req.admin.id, {
          status: 'processing',
          total: certificates.length,
          processed: processedCount,
          added: addedCount,
          currentFile: safeFileName,
          message: `Processing ${processedCount}/${certificates.length} certificates...`,
          percentage: Math.round((processedCount / certificates.length) * 100)
        });
        
        // Increment download count
        await Certificate.findByIdAndUpdate(
          certificate._id,
          { $inc: { downloadCount: 1 } }
        );
        
      } catch (certError) {
        console.error(`Error processing certificate ${certificate._id}:`, certError);
        processedCount++;
      }
    }
    
    if (addedCount === 0) {
      archive.destroy();
      return res.status(404).json({
        success: false,
        message: 'No valid certificate files found for download'
      });
    }
    
    console.log(`Finalizing archive with ${addedCount} files`);
    
    // Send finalizing progress update
    websocketService.sendBulkDownloadProgress(req.admin.id, {
      status: 'finalizing',
      total: certificates.length,
      processed: processedCount,
      added: addedCount,
      message: 'Finalizing ZIP archive...',
      percentage: 95
    });
    
    // Finalize the archive
    await archive.finalize();
    
    // Send completion notification
    websocketService.sendBulkDownloadComplete(req.admin.id, {
      status: 'completed',
      total: certificates.length,
      processed: processedCount,
      added: addedCount,
      zipFileName,
      message: `Successfully created ZIP archive with ${addedCount} certificates`,
      percentage: 100
    });
    
    console.log('Bulk download completed successfully');
    
  } catch (error) {
    console.error('Bulk download error:', error);
    
    // Send error notification via WebSocket
    websocketService.sendBulkDownloadError(req.admin.id, error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error during bulk download'
      });
    }
  }
});

module.exports = router;