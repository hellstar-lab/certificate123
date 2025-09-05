const { body, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

// Certificate creation validation
const validateCertificateCreation = [
  body('participantName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Participant name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage('Participant name can only contain letters, spaces, dots, apostrophes, and hyphens'),
  handleValidationErrors
];

// Template placeholder validation
const validateTemplatePlaceholders = [
  body('placeholders')
    .isArray()
    .withMessage('Placeholders must be an array')
    .custom((placeholders) => {
      // Allow empty placeholders during initial setup
      if (placeholders.length === 0) {
        return true;
      }
      // When placeholders exist, ensure both name and id types are present
      const hasName = placeholders.some(p => p.type === 'name');
      const hasId = placeholders.some(p => p.type === 'id');
      if (!hasName || !hasId) {
        throw new Error('Template must have at least one name placeholder and one id placeholder');
      }
      return true;
    }),
  body('placeholders.*.type')
    .isIn(['name', 'id'])
    .withMessage('Placeholder type must be either "name" or "id"'),
  body('placeholders.*.x')
    .isNumeric()
    .withMessage('X coordinate must be a number'),
  body('placeholders.*.y')
    .isNumeric()
    .withMessage('Y coordinate must be a number'),
  body('placeholders.*.fontSize')
    .optional()
    .isInt({ min: 8, max: 200 })
    .withMessage('Font size must be between 8 and 200'),
  body('placeholders.*.fontFamily')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Font family must be between 1 and 50 characters'),
  body('placeholders.*.color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color code'),
  body('placeholders.*.fontWeight')
    .optional()
    .isIn(['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'])
    .withMessage('Font weight must be a valid CSS font-weight value'),
  handleValidationErrors
];

// Admin registration validation (for initial setup)
const validateAdminRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateCertificateCreation,
  validateTemplatePlaceholders,
  validateAdminRegistration,
  handleValidationErrors
};