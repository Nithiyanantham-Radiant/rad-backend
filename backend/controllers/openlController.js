const axios = require('axios');

const OPENL_TABLETS_API_URL = process.env.OPENL_TABLETS_API_URL;

const openlClient = axios.create({
  baseURL: OPENL_TABLETS_API_URL,
  headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'accept-language': 'en-GB'
    },
});

exports.proxy = async (req, res) => {
    const endpoint = req.params[0];
    const method = req.method.toLowerCase();

    try {
        const { data } = await openlClient({
            method: method,
            url: `/${endpoint}`,
            data: req.body,
            params: req.query
        });
        res.json(data);
    } catch (error) {
        console.error(`OpenL Proxy Error (${endpoint}):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'OpenL request failed' });
    }
};
