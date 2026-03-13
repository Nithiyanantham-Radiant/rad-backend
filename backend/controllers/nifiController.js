const axios = require('axios');

const NIFI_URL = process.env.NIFI_URL;

const nifiClient = axios.create({
  baseURL: NIFI_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

exports.proxy = async (req, res) => {
    const endpoint = req.params[0];
    const method = req.method.toLowerCase();

    try {
        const { data } = await nifiClient({
            method: method,
            url: `/${endpoint}`,
            data: req.body,
            params: req.query
        });
        res.json(data);
    } catch (error) {
        console.error(`NiFi Proxy Error (${endpoint}):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'NiFi request failed' });
    }
};
