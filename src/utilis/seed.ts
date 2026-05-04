/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../lib/prisma";
import { envVars } from "../config/env";
import { auth } from "../lib/auth";
import {
    KycStatus,
    PayoutMethod,
    Role,
    SellerStatus,
    UserStatus,
} from "../generated/enums";

// =============================================================
// Demo accounts (idempotent) — used by /auth/demo-login so the
// frontend can showcase Customer / Seller / Admin dashboards
// without manual signup.
// =============================================================
export const DEMO_ACCOUNTS = {
    customer: {
        email: "demo.customer@nexora.dev",
        password: "Demo@1234",
        name: "Demo Customer",
    },
    seller: {
        email: "demo.seller@nexora.dev",
        password: "Demo@1234",
        name: "Demo Seller",
        shopName: "Demo Shop",
        shopSlug: "demo-shop",
    },
    admin: {
        email: "demo.admin@nexora.dev",
        password: "Demo@1234",
        name: "Demo Admin",
    },
} as const;

export type DemoRoleKey = keyof typeof DEMO_ACCOUNTS;

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

// -------------------------------------------------------------
// Demo account seeders
// -------------------------------------------------------------

const ensureBetterAuthUser = async (params: {
    email: string;
    password: string;
    name: string;
}) => {
    const existing = await prisma.user.findUnique({ where: { email: params.email } });
    if (existing) return existing;
    const created = await auth.api.signUpEmail({
        body: {
            email: params.email,
            password: params.password,
            name: params.name,
            rememberMe: false,
        },
    });
    return prisma.user.findUnique({ where: { id: created.user.id } });
};

export const seedDemoCustomer = async () => {
    const cfg = DEMO_ACCOUNTS.customer;
    try {
        const user = await ensureBetterAuthUser(cfg);
        if (!user) return;

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                role: Role.CUSTOMER,
                status: UserStatus.ACTIVE,
                isDeleted: false,
            },
        });

        await prisma.customer.upsert({
            where: { userId: user.id },
            update: { fullName: cfg.name, email: cfg.email, isDeleted: false },
            create: { userId: user.id, fullName: cfg.name, email: cfg.email },
        });

        await prisma.wishlist
            .upsert({
                where: { userId: user.id },
                update: {},
                create: { userId: user.id },
            })
            .catch(() => null);

        console.log("✅ Demo customer ready:", cfg.email);
    } catch (error: any) {
        console.error("Error seeding demo customer:", error?.message || error);
    }
};

export const seedDemoAdmin = async () => {
    const cfg = DEMO_ACCOUNTS.admin;
    try {
        const user = await ensureBetterAuthUser(cfg);
        if (!user) return;

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                role: Role.ADMIN,
                status: UserStatus.ACTIVE,
                isDeleted: false,
            },
        });

        await prisma.admin.upsert({
            where: { userId: user.id },
            update: { name: cfg.name, email: cfg.email, isDeleted: false },
            create: { userId: user.id, name: cfg.name, email: cfg.email },
        });

        console.log("✅ Demo admin ready:", cfg.email);
    } catch (error: any) {
        console.error("Error seeding demo admin:", error?.message || error);
    }
};

export const seedDemoSeller = async () => {
    const cfg = DEMO_ACCOUNTS.seller;
    try {
        const user = await ensureBetterAuthUser(cfg);
        if (!user) return;

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                role: Role.SELLER,
                status: UserStatus.ACTIVE,
                isDeleted: false,
            },
        });

        const existingSeller = await prisma.seller.findUnique({ where: { userId: user.id } });
        if (existingSeller) {
            await prisma.seller.update({
                where: { id: existingSeller.id },
                data: {
                    status: SellerStatus.APPROVED,
                    kycStatus: KycStatus.APPROVED,
                    isDeleted: false,
                    suspensionReason: null,
                    rejectionReason: null,
                    approvedAt: existingSeller.approvedAt ?? new Date(),
                },
            });
        } else {
            await prisma.seller.create({
                data: {
                    userId: user.id,
                    shopName: cfg.shopName,
                    shopSlug: cfg.shopSlug,
                    tagline: "Demo storefront for previewing the seller dashboard",
                    description:
                        "This is a demo seller account used for showcasing the marketplace dashboard.",
                    contactEmail: cfg.email,
                    legalName: "Nexora Demo LLC",
                    country: "US",
                    status: SellerStatus.APPROVED,
                    kycStatus: KycStatus.APPROVED,
                    payoutMethod: PayoutMethod.MANUAL_BANK,
                    approvedAt: new Date(),
                    commissionRate: 10,
                },
            });
        }

        console.log("✅ Demo seller ready:", cfg.email);
    } catch (error: any) {
        console.error("Error seeding demo seller:", error?.message || error);
    }
};

export const seedDemoAccounts = async () => {
    await seedDemoCustomer();
    await seedDemoSeller();
    await seedDemoAdmin();
};
