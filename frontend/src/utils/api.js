/**
 * Performs an API request to the backend.
 * Uses relative paths since Vite proxy is configured.
 * 
 * @param {string} endpoint - The API endpoint (e.g. '/api/chat/2026-06-18')
 * @param {Object} [options] - Standard fetch options
 * @returns {Promise<any>} Response JSON data
 */
export async function apiRequest(endpoint, options = {}) {
  // Use VITE_API_URL if set, otherwise fallback to empty string (same domain)
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
      
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Request to ${url} failed:`, error);
    throw error;
  }
}
