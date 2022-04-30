import dotenv from "dotenv";
dotenv.config();
import "reflect-metadata";
import express from "express";
import { buildSchema } from "type-graphql";
import cookieParser from "cookie-parser";
import { ApolloServer } from "apollo-server-express";
import {
  ApolloServerPluginLandingPageGraphQLPlayground,
  ApolloServerPluginLandingPageProductionDefault,
} from "apollo-server-core";
import { resolvers } from "./resolvers";
import { connectToMongo } from "./utils/mongo";
import { verifyJwt } from "./utils/jwt";
import { User } from "./schema/user.schema";
import Context from "./types/context";
import authChecker from "./utils/authChecker";

async function bootstrap() {
  // Build the schema

  const schema = await buildSchema({
    resolvers,
    authChecker,
  });

  // Init express
  const app = express();
  const PORT = process.env.PORT || 5000;

  app.use(cookieParser());
  app.get('/*', (req, res) => {
    res.status(200).json({
      message: 'Welcome to the Graphql auth API',
    });
  });

  // Create the apollo server
  const server = new ApolloServer({
    schema,
    context: async (ctx: Context) => {
      const context = ctx;

      if (ctx.req.cookies.accessToken) {
        const user = await verifyJwt<User>(ctx.req.cookies.accessToken);
        context.user = user;
      }
      return context;
    },
    plugins: [
      process.env.NODE_ENV === "production"
        ? ApolloServerPluginLandingPageProductionDefault()
        : ApolloServerPluginLandingPageGraphQLPlayground(),
    ],
  });

  await server.start();
  // apply middleware to server

  server.applyMiddleware({ app });

  // app.listen on express server
  app.listen(PORT, () => {
    console.log("App is listening on http://localhost:5000");
  });
  connectToMongo();
}

bootstrap();
