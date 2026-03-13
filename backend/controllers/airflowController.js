const axios = require('axios');

const AIRFLOW_URL = process.env.AIRFLOW_URL;
const AIRFLOW_USER = process.env.AIRFLOW_USER;
const AIRFLOW_PASS = process.env.AIRFLOW_PASS;

const airflowClient = axios.create({
  baseURL: AIRFLOW_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add Basic Auth interceptor
airflowClient.interceptors.request.use((config) => {
  if (AIRFLOW_USER && AIRFLOW_PASS) {
    const token = Buffer.from(`${AIRFLOW_USER}:${AIRFLOW_PASS}`).toString('base64');
    config.headers.Authorization = `Basic ${token}`;
  }
  return config;
});

exports.triggerDag = async (req, res) => {
    const { dag_id, conf } = req.body;
    try {
        const { data } = await airflowClient.post(`/api/v1/dags/${dag_id}/dagRuns`, {
            conf: conf || {}
        });
        res.json(data);
    } catch (error) {
        console.error('Airflow Trigger Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to trigger DAG' });
    }
};

exports.checkStatus = async (req, res) => {
    const { dag_id, dag_run_id } = req.params;
    try {
        const { data } = await airflowClient.get(`/api/v1/dags/${dag_id}/dagRuns/${dag_run_id}`);
        res.json({ state: data.state });
    } catch (error) {
        console.error('Airflow Status Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to check status' });
    }
};
