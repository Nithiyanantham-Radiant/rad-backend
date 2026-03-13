const axios = require('axios');

const DIRECTUS_URL = process.env.DIRECTUS_URL;

const directusClient = axios.create({
  baseURL: DIRECTUS_URL,
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
        const { data } = await directusClient({
            method: method,
            url: `/${endpoint}`,
            data: req.body,
            params: req.query,
            headers: headers
        });
        res.json(data);
    } catch (error) {
        console.error(`Directus Proxy Error (${endpoint}):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Directus request failed' });
    }
};
