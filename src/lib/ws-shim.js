// WebSocket shim loader for browser environment
module.exports = function loader(source) {
  return `
    const WebSocketShim = class extends WebSocket {
      constructor(url, protocols, options = {}) {
        super(url, protocols);
        
        // Handle headers if provided
        if (options.headers) {
          // Headers are handled differently in browser WebSocket
          // We can't set them directly, but they're usually handled by the server
          console.debug('Headers in WebSocket are not supported in browser environment:', options.headers);
        }
      }
    };

    export default WebSocketShim;
  `;
} 