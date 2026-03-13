const axios = require('axios');

const API_URL = process.env.API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

exports.proxy = async (req, res) => {
    const endpoint = req.params[0];
    const method = req.method.toLowerCase();
    
    // Forward Authorization header if present
    const headers = {};
    if (req.headers.authorization) {
        headers.Authorization = req.headers.authorization;
    }

    try {
        const { data } = await apiClient({
            method: method,
            url: `/${endpoint}`,
            data: req.body,
            params: req.query,
            headers: headers
        });
        
        // Debug Log
        console.log(`[AppApi] Proxied ${method.toUpperCase()} /${endpoint} to ${API_URL}/${endpoint}`);
        // console.log('Body:', JSON.stringify(req.body)); 

        res.json(data);
    } catch (error) {
        console.error(`App API Proxy Error (${endpoint}):`, error.response?.data || error.message);
        if (error.response?.data) console.error('Error Data:', JSON.stringify(error.response.data)); // Log full error body
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'API request failed' });
    }
};
