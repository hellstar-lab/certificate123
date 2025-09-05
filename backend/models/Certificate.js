const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    required: [true, 'Certificate ID is required'],
    unique: true,
    trim: true,
    match: [/^CERT-\d{4}-\d{3,}$/, 'Certificate ID must follow format CERT-YYYY-XXX']
  },
  participantName: {
    type: String,
    required: [true, 'Participant name is required'],
    trim: true,
    minlength: [2, 'Participant name must be at least 2 characters long'],
    maxlength: [100, 'Participant name cannot exceed 100 characters'],
    match: [/^[a-zA-Z\s.'-]+$/, 'Participant name can only contain letters, spaces, dots, apostrophes, and hyphens']
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: [true, 'Template reference is required']
  },
  templateSnapshot: {
    name: String,
    filename: String,
    placeholders: [{
      type: {
        type: String,
        enum: ['name', 'id']
      },
      x: Number,
      y: Number,
      fontSize: Number,
      fontFamily: String,
      color: String,
      fontWeight: String,
      fontStyle: String,
      textAlign: String,
      rotation: Number,
      width: Number,
      height: Number
    }],
    dimensions: {
      width: Number,
      height: Number
    }
  },
  generatedFiles: {
    pdf: {
      filename: String,
      path: String,
      size: Number,
      url: String
    },
    png: {
      filename: String,
      path: String,
      size: Number,
      url: String
    }
  },
  status: {
    type: String,
    enum: ['pending', 'generated', 'failed', 'archived'],
    default: 'pending'
  },
  metadata: {
    generationTime: {
      type: Number, // Time in milliseconds
      min: [0, 'Generation time cannot be negative']
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: [0, 'Download count cannot be negative']
    },
    lastDownloaded: {
      type: Date
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Creator admin ID is required']
  },
  issuedDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Virtual for certificate age
certificateSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for formatted certificate ID
certificateSchema.virtual('formattedId').get(function() {
  return this.certificateId.replace('CERT-', 'Certificate #');
});

// Virtual for download URLs
certificateSchema.virtual('downloadUrls').get(function() {
  const urls = {};
  if (this.generatedFiles.pdf && this.generatedFiles.pdf.url) {
    urls.pdf = this.generatedFiles.pdf.url;
  }
  if (this.generatedFiles.png && this.generatedFiles.png.url) {
    urls.png = this.generatedFiles.png.url;
  }
  return urls;
});

// Instance method to increment download count
certificateSchema.methods.incrementDownloadCount = function() {
  return this.updateOne({
    $inc: { 'metadata.downloadCount': 1 },
    $set: { 'metadata.lastDownloaded': new Date() }
  });
};

// Instance method to mark as archived
certificateSchema.methods.archive = function() {
  return this.updateOne({
    $set: { 
      status: 'archived',
      isActive: false
    }
  });
};

// Static method to generate next certificate ID
certificateSchema.statics.generateNextId = async function() {
  const currentYear = new Date().getFullYear();
  const prefix = `CERT-${currentYear}-`;
  
  // Find the latest certificate for the current year
  const latestCert = await this.findOne({
    certificateId: { $regex: `^${prefix}` }
  }).sort({ certificateId: -1 });
  
  let nextNumber = 1;
  if (latestCert) {
    const lastNumber = parseInt(latestCert.certificateId.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  
  // Pad with zeros to ensure at least 3 digits
  const paddedNumber = nextNumber.toString().padStart(3, '0');
  return `${prefix}${paddedNumber}`;
};

// Static method to find by participant name
certificateSchema.statics.findByParticipant = function(name) {
  return this.find({
    participantName: { $regex: name, $options: 'i' },
    isActive: true
  }).populate('template', 'name').populate('createdBy', 'name email');
};

// Static method to find by date range
certificateSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    },
    isActive: true
  }).populate('template', 'name').populate('createdBy', 'name email');
};

// Static method to get statistics
certificateSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalCertificates: { $sum: 1 },
        totalDownloads: { $sum: '$metadata.downloadCount' },
        avgGenerationTime: { $avg: '$metadata.generationTime' },
        statusBreakdown: {
          $push: '$status'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalCertificates: 1,
        totalDownloads: 1,
        avgGenerationTime: { $round: ['$avgGenerationTime', 2] },
        statusBreakdown: 1
      }
    }
  ]);
  
  return stats[0] || {
    totalCertificates: 0,
    totalDownloads: 0,
    avgGenerationTime: 0,
    statusBreakdown: []
  };
};

// Pre-save middleware to ensure certificate ID is unique
certificateSchema.pre('save', async function(next) {
  if (this.isNew && !this.certificateId) {
    try {
      this.certificateId = await this.constructor.generateNextId();
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Indexes for efficient queries
certificateSchema.index({ certificateId: 1 }, { unique: true });
certificateSchema.index({ participantName: 1 });
certificateSchema.index({ createdBy: 1 });
certificateSchema.index({ template: 1 });
certificateSchema.index({ status: 1 });
certificateSchema.index({ isActive: 1 });
certificateSchema.index({ createdAt: -1 });
certificateSchema.index({ issuedDate: -1 });
certificateSchema.index({ participantName: 'text', notes: 'text' });

module.exports = mongoose.model('Certificate', certificateSchema);