const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map to store client connections with admin IDs
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', async (ws, req) => {
      console.log('New WebSocket connection attempt');
      
      try {
        // Extract token from query parameters
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        
        if (!token) {
          console.log('WebSocket connection rejected: No token provided');
          ws.close(1008, 'No authentication token provided');
          return;
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select('-password');
        
        if (!admin) {
          console.log('WebSocket connection rejected: Invalid admin');
          ws.close(1008, 'Invalid authentication token');
          return;
        }

        // Store client connection
        const clientId = `${admin._id}_${Date.now()}`;
        this.clients.set(clientId, {
          ws,
          adminId: admin._id.toString(),
          connectedAt: new Date()
        });

        console.log(`WebSocket client connected: ${clientId} for admin ${admin.email}`);

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connection',
          message: 'Connected to real-time updates',
          timestamp: new Date().toISOString()
        }));

        // Handle client disconnect
        ws.on('close', () => {
          console.log(`WebSocket client disconnected: ${clientId}`);
          this.clients.delete(clientId);
        });

        // Handle client errors
        ws.on('error', (error) => {
          console.error(`WebSocket error for client ${clientId}:`, error);
          this.clients.delete(clientId);
        });

        // Handle ping/pong for connection health
        ws.on('pong', () => {
          ws.isAlive = true;
        });

      } catch (error) {
        console.error('WebSocket authentication error:', error);
        ws.close(1008, 'Authentication failed');
      }
    });

    // Ping clients periodically to check connection health
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });

    console.log('WebSocket server initialized on /ws');
  }

  // Send progress update to specific admin
  sendProgressUpdate(adminId, data) {
    const adminIdStr = adminId.toString();
    
    for (const [clientId, client] of this.clients.entries()) {
      if (client.adminId === adminIdStr && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify({
            type: 'progress',
            data,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error(`Error sending progress update to client ${clientId}:`, error);
          this.clients.delete(clientId);
        }
      }
    }
  }

  // Send bulk download progress
  sendBulkDownloadProgress(adminId, progress) {
    this.sendProgressUpdate(adminId, {
      operation: 'bulk_download',
      ...progress
    });
  }

  // Send completion notification
  sendBulkDownloadComplete(adminId, result) {
    this.sendProgressUpdate(adminId, {
      operation: 'bulk_download_complete',
      ...result
    });
  }

  // Send error notification
  sendBulkDownloadError(adminId, error) {
    this.sendProgressUpdate(adminId, {
      operation: 'bulk_download_error',
      error: error.message || 'Unknown error occurred'
    });
  }

  // Get connected clients count for admin
  getConnectedClientsCount(adminId) {
    const adminIdStr = adminId.toString();
    let count = 0;
    
    for (const client of this.clients.values()) {
      if (client.adminId === adminIdStr && client.ws.readyState === WebSocket.OPEN) {
        count++;
      }
    }
    
    return count;
  }

  // Broadcast to all connected clients (admin-specific)
  broadcastToAdmin(adminId, data) {
    const adminIdStr = adminId.toString();
    
    for (const [clientId, client] of this.clients.entries()) {
      if (client.adminId === adminIdStr && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify({
            type: 'broadcast',
            data,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error(`Error broadcasting to client ${clientId}:`, error);
          this.clients.delete(clientId);
        }
      }
    }
  }
}

// Export singleton instance
module.exports = new WebSocketService();