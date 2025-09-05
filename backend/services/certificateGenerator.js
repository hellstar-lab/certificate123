const PDFDocument = require('pdfkit');
const { createCanvas, loadImage, registerFont } = require('canvas');
const sharp = require('sharp');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class CertificateGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../generated');
    this.fontMap = this.initializeFontMap();
    this.ensureOutputDir();
  }

  // Map Google Fonts to system-available fonts
  initializeFontMap() {
    return {
      canvas: {
        // Sans-serif fonts
        'Inter': 'Arial',
        'Roboto': 'Arial',
        'Open Sans': 'Arial',
        'Lato': 'Arial',
        'Montserrat': 'Arial',
        'Source Sans Pro': 'Arial',
        'Raleway': 'Arial',
        'Ubuntu': 'Arial',
        'Nunito': 'Arial',
        'Poppins': 'Arial',
        'Oswald': 'Arial',
        'Mukti': 'Arial',
        'Fira Sans': 'Arial',
        'PT Sans': 'Arial',
        'Dosis': 'Arial',
        'Quicksand': 'Arial',
        'Work Sans': 'Arial',
        'Rubik': 'Arial',
        'Barlow': 'Arial',
        'Oxygen': 'Arial',
        
        // Serif fonts
        'Playfair Display': 'Times New Roman',
        'Merriweather': 'Times New Roman',
        'Lora': 'Times New Roman',
        'PT Serif': 'Times New Roman',
        'Crimson Text': 'Times New Roman',
        'Libre Baskerville': 'Times New Roman',
        'Source Serif Pro': 'Times New Roman',
        'Cormorant Garamond': 'Times New Roman',
        'EB Garamond': 'Times New Roman',
        'Vollkorn': 'Times New Roman',
        'Bitter': 'Times New Roman',
        'Arvo': 'Times New Roman',
        'Rokkitt': 'Times New Roman',
        'Alegreya': 'Times New Roman',
        'Cardo': 'Times New Roman',
        
        // Monospace fonts
        'Fira Code': 'Courier New',
        'Source Code Pro': 'Courier New',
        'JetBrains Mono': 'Courier New',
        'Roboto Mono': 'Courier New',
        'Ubuntu Mono': 'Courier New',
        'Space Mono': 'Courier New',
        'Inconsolata': 'Courier New',
        'Anonymous Pro': 'Courier New',
        
        // Display/Decorative fonts
        'Dancing Script': 'Arial',
        'Pacifico': 'Arial',
        'Lobster': 'Arial',
        'Righteous': 'Arial',
        'Fredoka One': 'Arial',
        'Comfortaa': 'Arial',
        'Kalam': 'Arial',
        'Caveat': 'Arial',
        'Satisfy': 'Arial',
        'Great Vibes': 'Arial',
        'Amatic SC': 'Arial',
        'Bangers': 'Arial',
        
        // Default system fonts
        'Arial': 'Arial',
        'Times New Roman': 'Times New Roman',
        'Helvetica': 'Arial',
        'Georgia': 'Georgia',
        'Verdana': 'Verdana',
        'Courier New': 'Courier New'
      },
      pdf: {
        // Sans-serif fonts - PDFKit built-in fonts
        'Inter': 'Helvetica',
        'Roboto': 'Helvetica',
        'Open Sans': 'Helvetica',
        'Lato': 'Helvetica',
        'Montserrat': 'Helvetica',
        'Source Sans Pro': 'Helvetica',
        'Raleway': 'Helvetica',
        'Ubuntu': 'Helvetica',
        'Nunito': 'Helvetica',
        'Poppins': 'Helvetica',
        'Oswald': 'Helvetica',
        'Mukti': 'Helvetica',
        'Fira Sans': 'Helvetica',
        'PT Sans': 'Helvetica',
        'Dosis': 'Helvetica',
        'Quicksand': 'Helvetica',
        'Work Sans': 'Helvetica',
        'Rubik': 'Helvetica',
        'Barlow': 'Helvetica',
        'Oxygen': 'Helvetica',
        
        // Serif fonts
        'Playfair Display': 'Times-Roman',
        'Merriweather': 'Times-Roman',
        'Lora': 'Times-Roman',
        'PT Serif': 'Times-Roman',
        'Crimson Text': 'Times-Roman',
        'Libre Baskerville': 'Times-Roman',
        'Source Serif Pro': 'Times-Roman',
        'Cormorant Garamond': 'Times-Roman',
        'EB Garamond': 'Times-Roman',
        'Vollkorn': 'Times-Roman',
        'Bitter': 'Times-Roman',
        'Arvo': 'Times-Roman',
        'Rokkitt': 'Times-Roman',
        'Alegreya': 'Times-Roman',
        'Cardo': 'Times-Roman',
        
        // Monospace fonts
        'Fira Code': 'Courier',
        'Source Code Pro': 'Courier',
        'JetBrains Mono': 'Courier',
        'Roboto Mono': 'Courier',
        'Ubuntu Mono': 'Courier',
        'Space Mono': 'Courier',
        'Inconsolata': 'Courier',
        'Anonymous Pro': 'Courier',
        
        // Display/Decorative fonts
        'Dancing Script': 'Helvetica',
        'Pacifico': 'Helvetica',
        'Lobster': 'Helvetica',
        'Righteous': 'Helvetica',
        'Fredoka One': 'Helvetica',
        'Comfortaa': 'Helvetica',
        'Kalam': 'Helvetica',
        'Caveat': 'Helvetica',
        'Satisfy': 'Helvetica',
        'Great Vibes': 'Helvetica',
        'Amatic SC': 'Helvetica',
        'Bangers': 'Helvetica',
        
        // Default system fonts
        'Arial': 'Helvetica',
        'Times New Roman': 'Times-Roman',
        'Helvetica': 'Helvetica',
        'Georgia': 'Times-Roman',
        'Verdana': 'Helvetica',
        'Courier New': 'Courier'
      }
    };
  }

  // Get system font for a given font family
  getSystemFont(fontFamily, type = 'canvas') {
    return this.fontMap[type][fontFamily] || (type === 'pdf' ? 'Helvetica' : 'Arial');
  }

  async ensureOutputDir() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate certificate in both PDF and PNG formats
   * @param {Object} certificate - Certificate data
   * @param {Object} template - Template data with file path
   * @param {Object} placeholderValues - Values to replace placeholders
   * @returns {Object} Generated file paths
   */
  async generateCertificate(certificate, template, placeholderValues, containerDimensions) {
    try {
      const templateImagePath = path.join(__dirname, '../uploads', template.filename);
      
      // Generate PNG first
       const pngPath = await this.generatePNG(certificate, template, placeholderValues, templateImagePath, containerDimensions);
      
      // Generate PDF with direct text overlay
      const pdfPath = await this.generatePDF(certificate, template, placeholderValues, templateImagePath, containerDimensions);
      
      return {
        pdf: {
          path: pdfPath,
          filename: `${certificate.certificateId}.pdf`,
          size: (await fs.stat(pdfPath)).size
        },
        png: {
          path: pngPath,
          filename: `${certificate.certificateId}.png`,
          size: (await fs.stat(pngPath)).size
        }
      };
    } catch (error) {
      console.error('Certificate generation error:', error);
      throw new Error(`Failed to generate certificate: ${error.message}`);
    }
  }

  /**
   * Generate PNG certificate with overlaid text
   */
  async generatePNG(certificate, template, placeholderValues, templateImagePath, containerDimensions) {
    try {
      // Load the template image
      const templateImage = await loadImage(templateImagePath);
      
      // Create canvas with template dimensions
      const canvas = createCanvas(templateImage.width, templateImage.height);
      const ctx = canvas.getContext('2d');
      
      // Draw the template image
      ctx.drawImage(templateImage, 0, 0);
      
      // Calculate scaling factors using actual frontend container dimensions
      const actualWidth = templateImage.width;
      const actualHeight = templateImage.height;
      
      // Use actual frontend container dimensions if provided, otherwise fallback
      const frontendDisplayWidth = containerDimensions?.width || 800;
      const frontendDisplayHeight = containerDimensions?.height || (frontendDisplayWidth * actualHeight / actualWidth);
      
      // Scale factor to convert frontend coordinates to actual image coordinates
      const scaleX = actualWidth / frontendDisplayWidth;
      const scaleY = actualHeight / frontendDisplayHeight;
      
      console.log('=== PNG Generation Debug Info ===');
      console.log('Template dimensions:', { actualWidth, actualHeight });
      console.log('Container dimensions from frontend:', containerDimensions);
      console.log('Frontend display size:', { frontendDisplayWidth, frontendDisplayHeight });
      console.log('Scale factors:', { scaleX, scaleY });
      
      // Overlay placeholder text
        template.placeholders.forEach((placeholder, index) => {
          const value = placeholderValues[placeholder.type] || '';
          if (value) {
            // Scale the coordinates from frontend to actual image size
            const scaledX = placeholder.x * scaleX;
            const scaledY = placeholder.y * scaleY;
            const scaledFontSize = (placeholder.fontSize || 24) * scaleX;
            
            console.log(`Placeholder ${index} (${placeholder.type}):`);
            console.log('  Original coords:', { x: placeholder.x, y: placeholder.y });
            console.log('  Scaled coords:', { x: scaledX, y: scaledY });
            console.log('  Original font size:', placeholder.fontSize || 24);
            console.log('  Scaled font size:', scaledFontSize);
            console.log('  Value:', value);
            
            // Set font properties
            const fontFamily = placeholder.fontFamily || 'Arial';
            const systemFont = this.getSystemFont(fontFamily, 'canvas');
            const fontWeight = placeholder.fontWeight || 'normal';
            
            console.log(`  Font mapping: ${fontFamily} -> ${systemFont}`);
            ctx.font = `${fontWeight} ${scaledFontSize}px ${systemFont}`;
            ctx.fillStyle = placeholder.color || '#000000';
            ctx.textAlign = placeholder.textAlign || 'left';
            ctx.textBaseline = 'top';
            
            // Draw text at scaled placeholder position
            ctx.fillText(value, scaledX, scaledY);
          }
        });
      
      // Save PNG
      const pngPath = path.join(this.outputDir, `${certificate.certificateId}.png`);
      const buffer = canvas.toBuffer('image/png');
      await fs.writeFile(pngPath, buffer);
      
      return pngPath;
    } catch (error) {
      console.error('PNG generation error:', error);
      throw new Error(`Failed to generate PNG: ${error.message}`);
    }
  }

  /**
   * Generate PDF certificate with overlaid text using coordinate scaling
   */
  async generatePDF(certificate, template, placeholderValues, templateImagePath, containerDimensions) {
    try {
      const pdfPath = path.join(this.outputDir, `${certificate.certificateId}.pdf`);
      
      // Load the template image to get dimensions
      const templateImage = await loadImage(templateImagePath);
      
      // Create PDF document
      const doc = new PDFDocument({
        size: [templateImage.width, templateImage.height],
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      
      // Pipe to file
      const stream = fsSync.createWriteStream(pdfPath);
      doc.pipe(stream);
      
      // Draw the template image as background
      doc.image(templateImagePath, 0, 0, {
        width: templateImage.width,
        height: templateImage.height
      });
      
      // Calculate scaling factors using actual frontend container dimensions
      const actualWidth = templateImage.width;
      const actualHeight = templateImage.height;
      
      // Use actual frontend container dimensions if provided, otherwise fallback
      const frontendDisplayWidth = containerDimensions?.width || 800;
      const frontendDisplayHeight = containerDimensions?.height || (frontendDisplayWidth * actualHeight / actualWidth);
      
      // Scale factor to convert frontend coordinates to actual image coordinates
      const scaleX = actualWidth / frontendDisplayWidth;
      const scaleY = actualHeight / frontendDisplayHeight;
      
      // Add placeholder text
      template.placeholders.forEach(placeholder => {
        const value = placeholderValues[placeholder.type] || '';
        if (value) {
          // Scale the coordinates from frontend to actual image size
          const scaledX = placeholder.x * scaleX;
          const scaledY = placeholder.y * scaleY;
          const scaledFontSize = (placeholder.fontSize || 24) * scaleX;
          
          // Set font properties
          const fontFamily = placeholder.fontFamily || 'Arial';
          const systemFont = this.getSystemFont(fontFamily, 'pdf');
          
          console.log(`  PDF Font mapping: ${fontFamily} -> ${systemFont}`);
          doc.font(systemFont);
          doc.fontSize(scaledFontSize);
          doc.fillColor(placeholder.color || '#000000');
          
          // Position and draw text
          doc.text(value, scaledX, scaledY, {
            align: placeholder.textAlign || 'left'
          });
        }
      });
      
      // Finalize PDF
      doc.end();
      
      // Wait for PDF to be written
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
      
      return pdfPath;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Get generated file info
   */
  async getFileInfo(certificateId, format) {
    const filePath = path.join(this.outputDir, `${certificateId}.${format}`);
    try {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        filename: `${certificateId}.${format}`,
        size: stats.size,
        exists: true
      };
    } catch {
      return {
        path: filePath,
        filename: `${certificateId}.${format}`,
        size: 0,
        exists: false
      };
    }
  }

  /**
   * Delete generated files
   */
  async deleteFiles(certificateId) {
    try {
      const pdfPath = path.join(this.outputDir, `${certificateId}.pdf`);
      const pngPath = path.join(this.outputDir, `${certificateId}.png`);
      
      await Promise.allSettled([
        fs.unlink(pdfPath).catch(() => {}),
        fs.unlink(pngPath).catch(() => {})
      ]);
    } catch (error) {
      console.error('Error deleting certificate files:', error);
    }
  }
}

module.exports = new CertificateGenerator();