const axios = require('axios');
const FormData = require('form-data');

const SUPERSET_URL = process.env.SUPERSET_URL;
const SUPERSET_USER = process.env.SUPERSET_USER;
const SUPERSET_PASS = process.env.SUPERSET_PASS;

let accessToken = null;
let refreshToken = null;

const supersetClient = axios.create({
  baseURL: SUPERSET_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

function isTokenExpired(token) {
    if (!token) return true;
    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return true;
        
        // Base64 decode (handle url-safe base64 if needed, but standard usually works for JWT in Node)
        const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
        const payload = JSON.parse(payloadJson);
        
        if (!payload.exp) return true;
        
        // Check if expired (exp is in seconds, Date.now() in ms). Add 30s buffer.
        return (Date.now() >= (payload.exp * 1000) - 30000);
    } catch (e) {
        console.error('Error parsing token:', e);
        return true;
    }
}

// Helper to get valid access token
async function getAccessToken(forceRefresh = false) {
  // 1. Check if current access token is valid
  if (!forceRefresh && accessToken) {
      if (!isTokenExpired(accessToken)) {
          console.log('Access token is valid. Reusing.');
          return accessToken;
      } else {
          console.log('Access token expired.');
      }
  }

  // 2. Try refreshing if we have a refresh token
  if (refreshToken) {
      try {
          if (isTokenExpired(refreshToken)) {
             console.log('Refresh token also expired, proceeding to full login.');
             throw new Error('Refresh token expired');
          }

          console.log('Refreshing access token using refresh token...');
          const { data } = await supersetClient.post('/api/v1/security/refresh', {}, {
              headers: { Authorization: `Bearer ${refreshToken}` }
          });
          
          if (!data.access_token) throw new Error('No access token returned from refresh');

          console.log('Token refresh successful.');
          accessToken = data.access_token;
          if (data.refresh_token) refreshToken = data.refresh_token; 
          
          return accessToken;
      } catch (refreshError) {
          console.warn('Token refresh failed:', refreshError.message);
          refreshToken = null; 
      }
  }

  // 3. Fallback to Full Login
  try {
    const loginBody = {
      username: SUPERSET_USER,
      password: SUPERSET_PASS,
      provider: 'db',
      refresh: true,
    };
    
    console.log('Initiating full login to Superset...');
    const { data } = await supersetClient.post('/api/v1/security/login', loginBody);
    
    if (!data.access_token) throw new Error('No access token returned');
    
    console.log('Superset login successful.');
    accessToken = data.access_token;
    refreshToken = data.refresh_token; 
    return accessToken;
  } catch (error) {
    console.error('Superset Login Error:', error.response?.data || error.message);
    throw error;
  }
}

// Helper to get CSRF Token
async function getCsrfToken(token) {
    try {
        const {data} = await supersetClient.get('/api/v1/security/csrf_token/', {
            headers: { Authorization: `Bearer ${token}` }
        });
        return data.result;
    } catch (error) {
        console.error('CSRF Fetch Error:', error.response?.data || error.message);
        throw error;
    }
}

// Wrapper to handle 401 retries
async function makeRequest(method, endpoint, data = null, params = null, retrying = false) {
    try {
        const token = await getAccessToken(retrying); // Force refresh if retrying
        const config = {
            method,
            url: `/api/v1/${endpoint}`,
            headers: { Authorization: `Bearer ${token}` },
            params
        };

        if (['post', 'put', 'delete'].includes(method.toLowerCase())) {
             const csrf = await getCsrfToken(token);
             config.headers['X-CSRFToken'] = csrf;
             config.data = data;
        }

        const response = await supersetClient(config);
        return response.data;
    } catch (error) {
        if (error.response?.status === 401 && !retrying) {
            console.log('Superset token expired (401). Retrying with fresh token...');
            return makeRequest(method, endpoint, data, params, true);
        }
        throw error;
    }
}

exports.login = async (req, res) => {
    try {
        await getAccessToken();
        res.json({ message: 'Superset session initialized' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to login to Superset' });
    }
};

exports.guestToken = async (req, res) => {
    const { dashboardId, user } = req.body;
    try {
        const token = await getAccessToken();
        const csrf = await getCsrfToken(token);

      console.log("CSRF Token: ",csrf);

        const guestUser = {
            username: user?.username || 'guest',
            first_name: user?.first_name || 'Guest',
            last_name: user?.last_name || 'User',
        };

      console.log("Guest User Details: ",guestUser);

        const { data } = await supersetClient.post('/api/v1/security/guest_token/', {
            resources: [{ type: 'dashboard', id: dashboardId }],
            user: guestUser,
            rls: [],
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                'X-CSRFToken': csrf,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        res.json({ token: data.token });
    } catch (error) {
        console.error('Guest Token Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to get guest token' });
    }
};

exports.proxyGet = async (req, res) => {
    const endpoint = req.params[0]; 
    try {
        const data = await makeRequest('get', endpoint, null, req.query);
        res.json({ result: data.result || data });
    } catch (error) {
         console.error(`Proxy GET Error (${endpoint}):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy request failed' });
    }
};

exports.proxyPost = async (req, res) => {
     const endpoint = req.params[0];
     try {
         const data = await makeRequest('post', endpoint, req.body);
         res.json(data);
     } catch (error) {
        console.error(`Proxy POST Error (${endpoint}):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy request failed' });
     }
}

exports.proxyPut = async (req, res) => {
    const endpoint = req.params[0];
    try {
        const data = await makeRequest('put', endpoint, req.body);
        res.json(data);
    } catch (error) {
        console.error(`Proxy PUT Error (${endpoint}):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Proxy request failed' });
    }
};
