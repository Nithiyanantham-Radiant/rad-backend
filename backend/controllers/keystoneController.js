const axios = require('axios');

const KEYSTONE_URL = process.env.KEYSTONE_URL;

const keystoneClient = axios.create({
  baseURL: KEYSTONE_URL,
  headers: { 'Content-Type': 'application/json' },
});

exports.proxyGraphQL = async (req, res) => {
    try {
        const { data } = await keystoneClient.post('', req.body);
        res.json(data);
    } catch (error) {
        console.error('Keystone Proxy Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Keystone request failed' });
    }
};
