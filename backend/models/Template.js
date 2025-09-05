const mongoose = require('mongoose');

const placeholderSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['name', 'id'],
    required: [true, 'Placeholder type is required']
  },
  x: {
    type: Number,
    required: [true, 'X coordinate is required'],
    min: [0, 'X coordinate must be non-negative']
  },
  y: {
    type: Number,
    required: [true, 'Y coordinate is required'],
    min: [0, 'Y coordinate must be non-negative']
  },
  fontSize: {
    type: Number,
    default: 24,
    min: [8, 'Font size must be at least 8px'],
    max: [200, 'Font size cannot exceed 200px']
  },
  fontFamily: {
    type: String,
    default: 'Arial',
    trim: true,
    maxlength: [50, 'Font family name cannot exceed 50 characters']
  },
  color: {
    type: String,
    default: '#000000',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color code']
  },
  fontWeight: {
    type: String,
    enum: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
    default: 'normal'
  },
  fontStyle: {
    type: String,
    enum: ['normal', 'italic', 'oblique'],
    default: 'normal'
  },
  textAlign: {
    type: String,
    enum: ['left', 'center', 'right'],
    default: 'left'
  },
  rotation: {
    type: Number,
    default: 0,
    min: [-360, 'Rotation cannot be less than -360 degrees'],
    max: [360, 'Rotation cannot exceed 360 degrees']
  },
  width: {
    type: Number,
    min: [1, 'Width must be at least 1px']
  },
  height: {
    type: Number,
    min: [1, 'Height must be at least 1px']
  }
}, {
  _id: false // Don't create separate _id for subdocuments
});

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    minlength: [2, 'Template name must be at least 2 characters long'],
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  filename: {
    type: String,
    required: [true, 'Template filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  filePath: {
    type: String,
    required: [true, 'File path is required'],
    trim: true
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1, 'File size must be greater than 0']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    enum: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/bmp', 'image/webp', 'image/svg+xml', 
      'image/tiff', 'image/tif', 'application/pdf'
    ]
  },
  dimensions: {
    width: {
      type: Number,
      required: [true, 'Template width is required'],
      min: [1, 'Width must be at least 1px']
    },
    height: {
      type: Number,
      required: [true, 'Template height is required'],
      min: [1, 'Height must be at least 1px']
    }
  },
  placeholders: {
    type: [placeholderSchema],
    validate: {
      validator: function(placeholders) {
        // Allow empty placeholders during initial upload
        // Only validate when placeholders array is not empty
        if (placeholders.length === 0) {
          return true;
        }
        // Ensure at least one name and one id placeholder when placeholders exist
        const hasName = placeholders.some(p => p.type === 'name');
        const hasId = placeholders.some(p => p.type === 'id');
        return hasName && hasId;
      },
      message: 'Template must have at least one name placeholder and one id placeholder'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Creator admin ID is required']
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Virtual for file URL
templateSchema.virtual('fileUrl').get(function() {
  if (this.filePath) {
    return `/uploads/${this.filename}`;
  }
  return null;
});

// Virtual for formatted file size
templateSchema.virtual('formattedFileSize').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Instance method to increment usage count
templateSchema.methods.incrementUsage = function() {
  return this.updateOne({ $inc: { usageCount: 1 } });
};

// Static method to find active templates
templateSchema.statics.findActive = function() {
  return this.find({ isActive: true }).populate('createdBy', 'name email');
};

// Static method to find by creator
templateSchema.statics.findByCreator = function(adminId) {
  return this.find({ createdBy: adminId }).populate('createdBy', 'name email');
};

// Pre-save middleware to update lastModifiedBy
templateSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModifiedBy = this.createdBy; // In a real app, this would come from the request context
  }
  next();
});

// Index for efficient queries
templateSchema.index({ createdBy: 1 });
templateSchema.index({ isActive: 1 });
templateSchema.index({ createdAt: -1 });
templateSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Template', templateSchema);