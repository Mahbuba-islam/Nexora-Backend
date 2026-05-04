/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../lib/prisma";
import { envVars } from "../config/env";
import { auth } from "../lib/auth";
import { Role, UserStatus } from "../generated/enums";

export const seedAdmin = async () => {
    try {
        const isAdminExists = await prisma.user.findFirst({
            where: { role: Role.ADMIN },
        });

        if (isAdminExists) {
            console.log("Admin seed skipped: admin already exists");
            return;
        }

        const adminUser = await auth.api.signUpEmail({
            body: {
                email: envVars.ADMIN_EMAIL,
                password: envVars.ADMIN_PASSWORD,
                name: "Nexora Admin",
                role: Role.ADMIN,
                rememberMe: false,
            },
        });

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: adminUser.user.id },
                data: {
                    emailVerified: true,
                    role: Role.ADMIN,
                    status: UserStatus.ACTIVE,
                },
            });

            await tx.admin.create({
                data: {
                    userId: adminUser.user.id,
                    name: "Nexora Admin",
                    email: envVars.ADMIN_EMAIL,
                },
            });
        });

        console.log("✅ Nexora admin created:", envVars.ADMIN_EMAIL);
    } catch (error: any) {
        console.error("Error seeding admin:", error?.message || error);
        await prisma.user.delete({ where: { email: envVars.ADMIN_EMAIL } }).catch(() => null);
    }
};
