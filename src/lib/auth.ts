import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, emailOTP } from "better-auth/plugins";
import { envVars } from "../config/env";

import { prisma } from "./prisma";
import { Role, UserStatus } from "../generated/enums";
import { sendEmail } from "../utilis/email";
// If your Prisma file is located elsewhere, you can change the path

const ignoredBetterAuthMessages = new Set([
    "User not found",
    "Invalid password",
    "Credential account not found",
    "Password not found",
]);

const shouldIgnoreBetterAuthLog = (level: string, message: string) => {
    return level === "error" && ignoredBetterAuthMessages.has(message);
};

export const auth = betterAuth({
    baseURL: envVars.BETTER_AUTH_URL,
    secret: envVars.BETTER_AUTH_SECRET,
    logger: {
        level: "warn",
        log(level, message, ...args) {
            if (shouldIgnoreBetterAuthLog(level, message)) {
                return;
            }

            if (level === "error") {
                console.error(message, ...args);
                return;
            }

            if (level === "warn") {
                console.warn(message, ...args);
                return;
            }

            console.log(message, ...args);
        }
    },
    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },

    socialProviders:{
        google:{
            clientId: envVars.GOOGLE_CLIENT_ID,
            clientSecret: envVars.GOOGLE_CLIENT_SECRET,
            // callbackUrl: envVars.GOOGLE_CALLBACK_URL,
            mapProfileToUser: ()=>{
                return {
                    role : Role.CUSTOMER,
                    status : UserStatus.ACTIVE,
                    needPasswordChange : false,
                    emailVerified : true,
                    isDeleted : false,
                    deletedAt : null,
                }
            }
        }
    },

    emailVerification:{
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
    },

    user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                defaultValue: Role.CUSTOMER
            },

            status: {
                type: "string",
                required: true,
                defaultValue: UserStatus.ACTIVE
            },

            needPasswordChange: {
                type: "boolean",
                required: true,
                defaultValue: false
            },

            isDeleted: {
                type: "boolean",
                required: true,
                defaultValue: false
            },

            deletedAt: {
                type: "date",
                required: false,
                defaultValue: null
            },
        }
    },

    plugins: [
        bearer(),
        emailOTP({
            overrideDefaultEmailVerification: true,
            async sendVerificationOTP({email, otp, type}) {
                if(type === "email-verification"){
                  const user = await prisma.user.findUnique({
                    where : {
                        email,
                    }
                  })

                   if(!user){
                    console.error(`User with email ${email} not found. Cannot send verification OTP.`);
                    return;
                   }

                   if(user && user.role === Role.ADMIN){
                    console.log(`User with email ${email} is a super admin. Skipping sending verification OTP.`);
                    return;
                   }
                  
                    if (user && !user.emailVerified){
                    sendEmail({
                        to : email,
                        subject : "Verify your email",
                        templateName : "otp",
                        templateData :{
                            name : user.name,
                            otp,
                        }
                    })
                  }
                }else if(type === "forget-password"){
                    const user = await prisma.user.findUnique({
                        where : {
                            email,
                        }
                    })

                    if(user){
                        sendEmail({
                            to : email,
                            subject : "Password Reset OTP",
                            templateName : "otp",
                            templateData :{
                                name : user.name,
                                otp,
                            }
                        })
                    }
                }
            },
            expiresIn : 2 * 60, // 2 minutes in seconds
            otpLength : 6,
        })
    ],

    session: {
        expiresIn: 60 * 60 * 60 * 24, // 1 day in seconds
        updateAge: 60 * 60 * 60 * 24, // 1 day in seconds
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60 * 60 * 24, // 1 day in seconds
        }
    },

    redirectURLs:{
        signIn : `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success`,
    },

    trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:5000", envVars.FRONTEND_URL],

    advanced: {
        // Backend routes call Better Auth APIs server-to-server (no browser Origin header).
        // Keep CORS as the browser boundary and bypass Better Auth's Origin-based CSRF check.
        disableCSRFCheck: true,
        // In production (Render → Vercel cross-domain) the browser will only
        // accept Set-Cookie if Secure + SameSite=None. In dev (localhost) the
        // browser refuses Secure cookies on http://, so flip both off.
        useSecureCookies: envVars.NODE_ENV === "production",
        defaultCookieAttributes: {
            sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
            secure: envVars.NODE_ENV === "production",
            httpOnly: true,
            path: "/",
        },
        cookies:{
            state:{
                attributes:{
                    sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
                    secure: envVars.NODE_ENV === "production",
                    httpOnly: true,
                    path: "/",
                }
            },
            sessionToken:{
                attributes:{
                    sameSite: envVars.NODE_ENV === "production" ? "none" : "lax",
                    secure: envVars.NODE_ENV === "production",
                    httpOnly: true,
                    path: "/",
                }
            }
        }
    }

});