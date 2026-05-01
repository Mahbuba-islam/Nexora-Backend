import dotenv from "dotenv";

import status from "http-status";
import AppError from "../errorHelpers/AppError";

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: string;
  DATABASE_URL: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  ACCESS_TOKEN_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  ACCESS_TOKEN_EXPIRY: string;
  REFRESH_TOKEN_EXPIRY: string;
  EMAIL_SENDER:{
    SMTP_USER:string;
    SMTP_PASSWORD:string;
    SMTP_HOST:string;
    SMTP_PORT:string;
    SMTP_FROM:string
  }
  
  GOOGLE_CLIENT_ID:string
 GOOGLE_CLIENT_SECRET:string
 GOOGLE_CALLBACK_URL:string
 FRONTEND_URL:string


 CLOUDINARY:{
      CLOUDINARY_CLOUD_NAME:string,
      CLOUDINARY_API_KEY:string,
     CLOUDINARY_API_SECRET:string,
    }
  // BETTER_AUTH_SESSION_TOKEN_EXPIRY: string;
  // BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE: string;
  STRIPE:{
    STRIPE_SECRET_KEY:string,
    STRIPE_WEBHOOK_SECRET:string
  }
ADMIN_EMAIL:string
ADMIN_PASSWORD:string
OPENAI_API_KEY?: string
OPENAI_MODEL?: string
ABLY_API_KEY?: string
AI_PROVIDER?: "gemini" | "openai"
GEMINI_API_KEY?: string
GEMINI_MODEL?: string
}

const loadEnvVariables = (): EnvConfig => {
  const requiredEnvVariables = [
    "NODE_ENV",
    "PORT",
    "DATABASE_URL",
    "BETTER_AUTH_URL",
    "BETTER_AUTH_SECRET",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRY",
    "REFRESH_TOKEN_EXPIRY",
    "EMAIL_SENDER_SMTP_USER",
    "EMAIL_SENDER_SMTP_PASSWORD",
    "EMAIL_SENDER_SMTP_HOST",
    "EMAIL_SENDER_SMTP_PORT",
    "EMAIL_SENDER_SMTP_FROM",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL",
    "FRONTEND_URL",
     "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
     "CLOUDINARY_API_SECRET",
      "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD"
    
    // "BETTER_AUTH_SESSION_TOKEN_EXPIRY",
    // "BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE"
  ];

  requiredEnvVariables.forEach((variable) => {
    if (!process.env[variable]) {
      throw new AppError(status.INTERNAL_SERVER_ERROR, `Environment variable "${variable}" is required but missing in the .env file.`)
      
    }
  });

  return {
    NODE_ENV: process.env.NODE_ENV as string,
    PORT: process.env.PORT as string,
    DATABASE_URL: process.env.DATABASE_URL as string,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL as string,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET as string,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET as string,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET as string,
    ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY as string,
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY as string,
    EMAIL_SENDER:{
    SMTP_USER:process.env.EMAIL_SENDER_SMTP_USER as string,
    SMTP_PASSWORD:process.env.EMAIL_SENDER_SMTP_PASSWORD as string,
    SMTP_HOST:process.env.EMAIL_SENDER_SMTP_HOST as string,
    SMTP_PORT:process.env.EMAIL_SENDER_SMTP_PORT as string,
    SMTP_FROM:process.env.EMAIL_SENDER_SMTP_FROM as string,
     
    },
     GOOGLE_CLIENT_ID:process.env.GOOGLE_CLIENT_ID as string,
   GOOGLE_CLIENT_SECRET:process.env.GOOGLE_CLIENT_SECRET as string,
   GOOGLE_CALLBACK_URL:process.env.GOOGLE_CALLBACK_URL as string,
   FRONTEND_URL:process.env.FRONTEND_URL as string,

   CLOUDINARY:{
      CLOUDINARY_CLOUD_NAME:process.env.CLOUDINARY_CLOUD_NAME as string,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY as string,
     CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET as string,
    },
   STRIPE:{
       STRIPE_SECRET_KEY:process.env.STRIPE_SECRET_KEY as string,
    STRIPE_WEBHOOK_SECRET:process.env.STRIPE_WEBHOOK_SECRET as string,
     
    },
    ADMIN_EMAIL:process.env.ADMIN_EMAIL as string,
   ADMIN_PASSWORD:process.env.ADMIN_PASSWORD as string,
   OPENAI_API_KEY: process.env.OPENAI_API_KEY,
   OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
   ABLY_API_KEY: process.env.ABLY_API_KEY,
   AI_PROVIDER: (process.env.AI_PROVIDER as "gemini" | "openai" | undefined) || (process.env.NODE_ENV === "production" ? "openai" : "gemini"),
   GEMINI_API_KEY: process.env.GEMINI_API_KEY,
   GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.0-flash"


    // BETTER_AUTH_SESSION_TOKEN_EXPIRY: process.env.BETTER_AUTH_SESSION_TOKEN_EXPIRY as string,
    // BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE: process.env.BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE as string

  };
};

export const envVars = loadEnvVariables();