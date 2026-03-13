const { ApolloServer } = require('@apollo/server');
const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const prisma = new PrismaClient();

const typeDefs = `#graphql
  scalar JSON
  scalar DateTime

  type Dataset {
    id: ID!
    datasetId: String!
    name: String!
  }

  type Form {
    id: ID!
    name: String!
    useCase: String!
    datasetId: String
    schema: JSON
    uiSchema: JSON
    mapping: JSON
    craftState: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Submission {
    id: ID!
    formId: String!
    data: JSON!
    submittedAt: DateTime!
  }

  input FormInput {
    id: ID
    name: String!
    useCase: String!
    datasetId: String
    schema: JSON
    uiSchema: JSON
    mapping: JSON
    craftState: String
  }

  input SubmissionInput {
    formId: String!
    data: JSON!
  }

  type Query {
    getForms: [Form!]!
    getFormById(id: ID!): Form
    getSubmissionsByFormId(formId: String!): [Submission!]!
    getDatasets: [Dataset!]!
    getDatasetSchema(datasetId: String!): JSON
    getDatasetSample(datasetId: String!): JSON
    getDatasetFieldDistinctValues(datasetId: String!, field: String!): [String!]
  }

  type Mutation {
    saveForm(input: FormInput!): Form!
    deleteForm(id: ID!): Boolean!
    saveSubmission(input: SubmissionInput!): Submission!
    deleteSubmission(id: ID!): Boolean!
    seedDatasets: Boolean!
  }
`;

const resolvers = {
  Query: {
    getForms: async () => {
      return await prisma.form.findMany({
        orderBy: { updatedAt: 'desc' }
      });
    },
    getFormById: async (_, { id }) => {
      if (!id || id.length !== 24) return null;
      return await prisma.form.findUnique({ where: { id } });
    },
    getSubmissionsByFormId: async (_, { formId }) => {
      return await prisma.submission.findMany({
        where: { formId },
        orderBy: { submittedAt: 'desc' }
      });
    },
    getDatasets: async () => {
      try {
        const cmdResult = await prisma.$runCommandRaw({
            listCollections: 1,
            nameOnly: true
        });

        const collections = cmdResult?.cursor?.firstBatch || [];
        
        const validCollections = collections.filter(c => {
            const name = c.name;
            return !(name.startsWith('system.') || name === '_prisma_migrations');
        });

        const datasets = validCollections.map(c => {
            const name = c.name;
            return {
                id: name,
                datasetId: name,
                name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')
            };
        });
        
        return datasets.sort((a,b) => a.name.localeCompare(b.name));
      } catch (err) {
        console.error("Failed to fetch dynamic datasets via Prisma", err);
        return [];
      }
    },
    getDatasetSchema: async (_, { datasetId }) => {
        if (!datasetId) return null;
        try {
            const sampleCmd = await prisma.$runCommandRaw({
                aggregate: datasetId,
                pipeline: [{ $sample: { size: 1 } }],
                cursor: {}
            });
            
            const sampleDoc = sampleCmd?.cursor?.firstBatch?.[0];
            if (!sampleDoc) return []; // Empty collection
            
            const fields = [];
            for (const [key, val] of Object.entries(sampleDoc)) {
                if (key === '_id') continue;
                fields.push({
                    name: key,
                    type: typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : 'string',
                    required: false 
                });
            }
            return fields;
        } catch (err) {
            console.error(`Failed to fetch schema for dataset ${datasetId}`, err);
            return [];
        }
    },
    getDatasetSample: async (_, { datasetId }) => {
        if (!datasetId) return null;
        try {
            const sampleCmd = await prisma.$runCommandRaw({
                aggregate: datasetId,
                pipeline: [{ $sample: { size: 1 } }],
                cursor: {}
            });
            const sampleDoc = sampleCmd?.cursor?.firstBatch?.[0];
            
            // Remove MongoDB internal _id for cleaner frontend parsing if it exists
            if (sampleDoc && sampleDoc._id) {
                delete sampleDoc._id;
            }
            return sampleDoc || null;
        } catch (err) {
            console.error(`Failed to fetch sample for dataset ${datasetId}`, err);
            return null;
        }
    },
    getDatasetFieldDistinctValues: async (_, { datasetId, field }) => {
        if (!datasetId || !field) return [];
        try {
            const distinctCmd = await prisma.$runCommandRaw({
                distinct: datasetId,
                key: field
            });
            // MongoDB distinct command returns { values: [...] }
            return distinctCmd?.values?.filter(v => v != null).map(String) || [];
        } catch (err) {
            console.error(`Failed to fetch distinct values for ${datasetId}.${field}`, err);
            return [];
        }
    }
  },
  Mutation: {
    saveForm: async (_, { input }) => {
      const { id, ...data } = input;
      if (id) {
        // Update existing form
        // In MongoDB Prisma, if id doesn't match a 24 char hex, it might conflict, 
        // but Form Builder generates specific IDs sometimes. 
        // We'll use upsert or simply handle update/create cleanly.
        // Ensure id is present and is a valid 24 char hex string for MongoDB
        const existing = id && id.length === 24 ? await prisma.form.findUnique({ where: { id } }) : null;
        if (existing) {
          return await prisma.form.update({
            where: { id },
            data
          });
        } else {
            // Force ID injection if possible, otherwise let Prisma handle ObjectId
            return await prisma.form.create({
                data: { ...data, id }
            });
        }
      } else {
        return await prisma.form.create({ data });
      }
    },
    deleteForm: async (_, { id }) => {
      await prisma.form.delete({ where: { id } });
      // Optionally cascade delete submissions
      await prisma.submission.deleteMany({ where: { formId: id } });
      return true;
    },
    saveSubmission: async (_, { input }) => {
      return await prisma.submission.create({ data: input });
    },
    deleteSubmission: async (_, { id }) => {
      await prisma.submission.delete({ where: { id } });
      return true;
    },
    seedDatasets: async () => {
       // Deprecated explicitly seeded datasets as they are now dynamically fetched
       return true;
    }
  }
};

const createApolloServer = () => {
  return new ApolloServer({
    typeDefs,
    resolvers,
  });
};

module.exports = { createApolloServer, prisma };
