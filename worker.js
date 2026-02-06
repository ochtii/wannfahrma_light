// Cloudflare Worker for CORS Proxy
// Deploy this to Cloudflare Workers for reliable API access

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      // Extract target URL from query parameter
      const url = new URL(request.url);
      const targetUrl = url.searchParams.get('url');
      
      if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // Retry logic with exponential backoff
      const MAX_RETRIES = 3;
      const RETRY_DELAY_MS = 200;
      let lastError = null;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          // Exponential backoff delay (except first attempt)
          if (attempt > 0) {
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          // Fetch from Wiener Linien API
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'WannfahrmaLight/1.0',
              'Accept': 'application/json'
            },
            // Add timeout
            signal: AbortSignal.timeout(10000) // 10s timeout
          });

          // If successful or non-retryable status, return immediately
          if (response.ok || (response.status !== 403 && response.status !== 500 && response.status !== 502 && response.status !== 503)) {
            const data = await response.text();
            
            return new Response(data, {
              status: response.status,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=30", // Cache for 30 seconds
                "X-Proxy-Attempts": String(attempt + 1)
              },
            });
          }
          
          // Store error for potential retry
          lastError = new Error(`HTTP ${response.status}`);
          
        } catch (err) {
          lastError = err;
          
          // If it's the last attempt, throw
          if (attempt === MAX_RETRIES - 1) {
            throw err;
          }
          // Otherwise, continue to next retry
        }
      }
      
      // If we exhausted all retries
      throw lastError || new Error('All retry attempts failed');
      
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message,
        type: 'proxy_error'
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
