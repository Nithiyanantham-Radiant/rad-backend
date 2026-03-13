const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { expressMiddleware } = require('@apollo/server/express4');
const { createApolloServer } = require('./graphql/formBuilderSchema');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Import Routes
const supersetRoutes = require('./routes/superset');
app.use('/api/superset', supersetRoutes);

const airflowRoutes = require('./routes/airflow');
app.use('/api/airflow', airflowRoutes);

const keystoneRoutes = require('./routes/keystone');
app.use('/api/keystone', keystoneRoutes);

const directusRoutes = require('./routes/directus');
app.use('/api/directus', directusRoutes);

const nifiRoutes = require('./routes/nifi');
app.use('/api/nifi', nifiRoutes);

const openlRoutes = require('./routes/openl');
app.use('/api/openl', openlRoutes);

const appApiRoutes = require('./routes/appApi');
app.use('/api/general', appApiRoutes);




const startServer = async () => {
  // Initialize GraphQL Apollo Server
  const apolloServer = createApolloServer();
  await apolloServer.start();
  app.use('/graphql', expressMiddleware(apolloServer));

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
};

startServer().catch(err => console.error(err));
