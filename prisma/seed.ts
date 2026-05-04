/* eslint-disable no-console */
/**
 * Nexora — multi-vendor marketplace seed
 *
 * Idempotent: safe to run multiple times.
 *
 * Seeds:
 *   - admin
 *   - 5 sellers (each with their own user account, auto-APPROVED)
 *   - brands across fashion, beauty, tech, home
 *   - 6 root categories with sub-trees (Men, Women, Kids, Tech,
 *     Cosmetics & Beauty, Home & Living)
 *   - tags
 *   - products spread across the 5 sellers
 *
 * Run with:  npm run seed
 */

import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import {
  ProductCondition,
  ProductStatus,
  Role,
  SellerStatus,
  UserStatus,
} from "../src/generated/enums";
import { auth } from "../src/lib/auth";
import { seedAdmin } from "../src/utilis/seed";
import { slugify } from "../src/utilis/stringUtils";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

type BrandSeed = {
  name: string;
  slug: string;
  description?: string;
  isFeatured?: boolean;
};

type CategorySeed = {
  name: string;
  slug: string;
  description?: string;
  isFeatured?: boolean;
  sortOrder?: number;
  children?: CategorySeed[];
};

type SellerSeed = {
  email: string;
  password: string;
  ownerName: string;
  shopName: string;
  shopSlug: string;
  tagline: string;
  description: string;
  logo?: string;
  banner?: string;
  contactEmail: string;
  legalName: string;
  country: string;
  commissionRate?: number;
};

type TagSeed = { name: string; slug: string };
type SpecSeed = { group?: string; label: string; value: string };
type ImageSeed = { url: string; alt?: string; isPrimary?: boolean };

type ProductSeed = {
  shopSlug: string; // which seller owns this listing
  name: string;
  slug: string;
  sku: string;
  shortDesc: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
  brandSlug?: string;
  categorySlug: string;
  tagSlugs?: string[];
  images: ImageSeed[];
  specifications?: SpecSeed[];
};

// ---------------------------------------------------------------
// Data — Sellers
// ---------------------------------------------------------------

const sellers: SellerSeed[] = [
  {
    email: "vogue@nexora.dev",
    password: "Seller@123",
    ownerName: "Vogue Threads",
    shopName: "Vogue Threads",
    shopSlug: "vogue-threads",
    tagline: "Modern fashion for everyday wear",
    description:
      "Curated men's and women's collections — premium fabrics, ethical production.",
    logo: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80",
    banner:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
    contactEmail: "support@voguethreads.example",
    legalName: "Vogue Threads LLC",
    country: "US",
    commissionRate: 12,
  },
  {
    email: "techhub@nexora.dev",
    password: "Seller@123",
    ownerName: "TechHub",
    shopName: "TechHub",
    shopSlug: "techhub",
    tagline: "Smart gadgets for smart people",
    description:
      "Electronics, computing and accessories with a 30-day return guarantee.",
    logo: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
    banner:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1600&q=80",
    contactEmail: "hello@techhub.example",
    legalName: "TechHub Inc.",
    country: "US",
    commissionRate: 8,
  },
  {
    email: "glow@nexora.dev",
    password: "Seller@123",
    ownerName: "Glow & Bloom",
    shopName: "Glow & Bloom",
    shopSlug: "glow-and-bloom",
    tagline: "Clean beauty, every day",
    description:
      "Vegan, cruelty-free skincare and makeup — clinically tested, lovingly made.",
    logo: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80",
    banner:
      "https://images.unsplash.com/photo-1522335789203-aaa6e0b8d96b?auto=format&fit=crop&w=1600&q=80",
    contactEmail: "care@glowandbloom.example",
    legalName: "Glow & Bloom Cosmetics",
    country: "US",
    commissionRate: 15,
  },
  {
    email: "kidsworld@nexora.dev",
    password: "Seller@123",
    ownerName: "Kids World",
    shopName: "Kids World",
    shopSlug: "kids-world",
    tagline: "Where little adventures begin",
    description:
      "Clothing, toys and essentials for kids of every age — soft, safe, sustainable.",
    logo: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=400&q=80",
    banner:
      "https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=1600&q=80",
    contactEmail: "team@kidsworld.example",
    legalName: "Kids World Co.",
    country: "US",
    commissionRate: 10,
  },
  {
    email: "casa@nexora.dev",
    password: "Seller@123",
    ownerName: "Casa Nova",
    shopName: "Casa Nova",
    shopSlug: "casa-nova",
    tagline: "Beautiful things for beautiful homes",
    description:
      "Décor, kitchen, bedding and lifestyle pieces hand-picked from independent designers.",
    logo: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=400&q=80",
    banner:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80",
    contactEmail: "hello@casanova.example",
    legalName: "Casa Nova Studio",
    country: "US",
    commissionRate: 10,
  },
];

// ---------------------------------------------------------------
// Data — Brands
// ---------------------------------------------------------------

const brands: BrandSeed[] = [
  // Fashion
  { name: "Nike", slug: "nike", description: "Athletic & lifestyle apparel.", isFeatured: true },
  { name: "Adidas", slug: "adidas", description: "Sport-inspired streetwear.", isFeatured: true },
  { name: "Levi's", slug: "levis", description: "Iconic American denim." },
  { name: "Zara", slug: "zara", description: "Fast-fashion essentials.", isFeatured: true },
  { name: "H&M", slug: "hm", description: "Affordable everyday clothing." },
  // Beauty
  { name: "L'Oréal", slug: "loreal", description: "World-leading beauty science.", isFeatured: true },
  { name: "MAC", slug: "mac", description: "Pro-grade makeup." },
  { name: "Maybelline", slug: "maybelline", description: "Trend-driven cosmetics." },
  { name: "Nivea", slug: "nivea", description: "Trusted skincare." },
  // Tech
  { name: "Apple", slug: "apple", description: "Premium consumer tech.", isFeatured: true },
  { name: "Samsung", slug: "samsung", description: "Mobile and home electronics." },
  { name: "Sony", slug: "sony", description: "Audio, imaging, gaming." },
  { name: "Anker", slug: "anker", description: "Charging & accessories." },
  // Generic / home
  { name: "Nexora Home", slug: "nexora-home", description: "Home essentials." },
  { name: "Little Sprout", slug: "little-sprout", description: "Kids & baby essentials." },
];

// ---------------------------------------------------------------
// Data — Categories (marketplace tree)
// ---------------------------------------------------------------

const categories: CategorySeed[] = [
  {
    name: "Men's Fashion",
    slug: "mens-fashion",
    description: "Clothing, footwear & accessories for men.",
    isFeatured: true,
    sortOrder: 1,
    children: [
      { name: "T-Shirts", slug: "men-tshirts", sortOrder: 1 },
      { name: "Shirts", slug: "men-shirts", sortOrder: 2 },
      { name: "Pants & Jeans", slug: "men-pants", sortOrder: 3 },
      { name: "Jackets", slug: "men-jackets", sortOrder: 4 },
      { name: "Shoes", slug: "men-shoes", sortOrder: 5 },
    ],
  },
  {
    name: "Women's Fashion",
    slug: "womens-fashion",
    description: "Clothing, bags & shoes for women.",
    isFeatured: true,
    sortOrder: 2,
    children: [
      { name: "Dresses", slug: "women-dresses", sortOrder: 1 },
      { name: "Tops", slug: "women-tops", sortOrder: 2 },
      { name: "Bottoms", slug: "women-bottoms", sortOrder: 3 },
      { name: "Bags", slug: "women-bags", sortOrder: 4 },
      { name: "Shoes", slug: "women-shoes", sortOrder: 5 },
    ],
  },
  {
    name: "Kids",
    slug: "kids",
    description: "Clothing, toys & essentials for kids.",
    isFeatured: true,
    sortOrder: 3,
    children: [
      { name: "Boys' Clothing", slug: "kids-boys", sortOrder: 1 },
      { name: "Girls' Clothing", slug: "kids-girls", sortOrder: 2 },
      { name: "Toys", slug: "kids-toys", sortOrder: 3 },
      { name: "Baby", slug: "kids-baby", sortOrder: 4 },
    ],
  },
  {
    name: "Tech",
    slug: "tech",
    description: "Electronics, gadgets & computing.",
    isFeatured: true,
    sortOrder: 4,
    children: [
      { name: "Smartphones", slug: "tech-smartphones", sortOrder: 1 },
      { name: "Laptops", slug: "tech-laptops", sortOrder: 2 },
      { name: "Audio", slug: "tech-audio", sortOrder: 3 },
      { name: "Wearables", slug: "tech-wearables", sortOrder: 4 },
      { name: "Accessories", slug: "tech-accessories", sortOrder: 5 },
    ],
  },
  {
    name: "Cosmetics & Beauty",
    slug: "beauty",
    description: "Skincare, makeup, fragrance, hair care.",
    isFeatured: true,
    sortOrder: 5,
    children: [
      { name: "Skincare", slug: "beauty-skincare", sortOrder: 1 },
      { name: "Makeup", slug: "beauty-makeup", sortOrder: 2 },
      { name: "Fragrance", slug: "beauty-fragrance", sortOrder: 3 },
      { name: "Hair Care", slug: "beauty-hair", sortOrder: 4 },
    ],
  },
  {
    name: "Home & Living",
    slug: "home",
    description: "Decor, kitchen, bedding & lifestyle.",
    sortOrder: 6,
    children: [
      { name: "Decor", slug: "home-decor", sortOrder: 1 },
      { name: "Kitchen", slug: "home-kitchen", sortOrder: 2 },
      { name: "Bedding", slug: "home-bedding", sortOrder: 3 },
    ],
  },
];

const tags: TagSeed[] = [
  { name: "Bestseller", slug: "bestseller" },
  { name: "New Arrival", slug: "new-arrival" },
  { name: "On Sale", slug: "on-sale" },
  { name: "Premium", slug: "premium" },
  { name: "Eco-Friendly", slug: "eco-friendly" },
  { name: "Trending", slug: "trending" },
];

// ---------------------------------------------------------------
// Data — Products
// ---------------------------------------------------------------

const IMG = (id: string, kw = "") =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80${kw ? `&kw=${kw}` : ""}`;

const products: ProductSeed[] = [
  // ============== Vogue Threads (Men + Women fashion) ==============
  {
    shopSlug: "vogue-threads",
    name: "Classic Cotton Crew Tee",
    slug: "classic-cotton-crew-tee",
    sku: "VT-MTSH-001",
    shortDesc: "Premium 100% cotton crew-neck tee in classic fit.",
    description:
      "Soft, breathable, pre-shrunk cotton tee that gets better with every wash. Available in five colours, made in Portugal.",
    price: 24.0,
    compareAtPrice: 32.0,
    stock: 120,
    isBestseller: true,
    isOnSale: true,
    brandSlug: "hm",
    categorySlug: "men-tshirts",
    tagSlugs: ["bestseller", "on-sale"],
    images: [
      { url: IMG("photo-1521572163474-6864f9cf17ab"), alt: "White cotton tee", isPrimary: true },
      { url: IMG("photo-1583743814966-8936f5b7be1a"), alt: "Tee on hanger" },
    ],
    specifications: [
      { label: "Material", value: "100% Combed Cotton" },
      { label: "Fit", value: "Classic" },
      { label: "Care", value: "Machine wash cold" },
    ],
  },
  {
    shopSlug: "vogue-threads",
    name: "Slim Fit Denim Jeans",
    slug: "slim-fit-denim-jeans",
    sku: "VT-MJN-002",
    shortDesc: "Stretch denim with a tapered slim leg.",
    description: "Comfortable stretch denim with a tapered slim silhouette. Iconic 5-pocket styling.",
    price: 79.0,
    stock: 60,
    isFeatured: true,
    brandSlug: "levis",
    categorySlug: "men-pants",
    tagSlugs: ["premium"],
    images: [{ url: IMG("photo-1542272604-787c3835535d"), isPrimary: true }],
    specifications: [
      { label: "Material", value: "98% Cotton, 2% Elastane" },
      { label: "Fit", value: "Slim" },
    ],
  },
  {
    shopSlug: "vogue-threads",
    name: "Linen Casual Shirt",
    slug: "linen-casual-shirt",
    sku: "VT-MSH-003",
    shortDesc: "Lightweight linen shirt for warm days.",
    description: "Breathable, garment-washed pure linen shirt with mother-of-pearl buttons.",
    price: 59.0,
    stock: 45,
    isNewArrival: true,
    brandSlug: "zara",
    categorySlug: "men-shirts",
    tagSlugs: ["new-arrival"],
    images: [{ url: IMG("photo-1516257984-b1b4d707412e"), isPrimary: true }],
  },
  {
    shopSlug: "vogue-threads",
    name: "Floral Midi Dress",
    slug: "floral-midi-dress",
    sku: "VT-WDR-004",
    shortDesc: "Flowing midi dress in a soft floral print.",
    description: "Lightweight viscose dress with a flattering wrap silhouette and tie waist.",
    price: 89.0,
    compareAtPrice: 119.0,
    stock: 35,
    isFeatured: true,
    isBestseller: true,
    isOnSale: true,
    brandSlug: "zara",
    categorySlug: "women-dresses",
    tagSlugs: ["bestseller", "on-sale", "trending"],
    images: [{ url: IMG("photo-1572804013309-59a88b7e92f1"), isPrimary: true }],
  },
  {
    shopSlug: "vogue-threads",
    name: "Leather Crossbody Bag",
    slug: "leather-crossbody-bag",
    sku: "VT-WBG-005",
    shortDesc: "Compact leather crossbody with adjustable strap.",
    description: "Made from full-grain Italian leather with antique brass hardware.",
    price: 149.0,
    stock: 22,
    brandSlug: "zara",
    categorySlug: "women-bags",
    tagSlugs: ["premium"],
    images: [{ url: IMG("photo-1584917865442-de89df76afd3"), isPrimary: true }],
  },
  {
    shopSlug: "vogue-threads",
    name: "Running Sneakers",
    slug: "running-sneakers",
    sku: "VT-MSH-006",
    shortDesc: "Lightweight cushioned running shoes.",
    description: "Engineered mesh upper with responsive foam midsole. 8mm drop.",
    price: 119.0,
    compareAtPrice: 139.0,
    stock: 50,
    isOnSale: true,
    brandSlug: "nike",
    categorySlug: "men-shoes",
    tagSlugs: ["on-sale", "bestseller"],
    images: [{ url: IMG("photo-1542291026-7eec264c27ff"), isPrimary: true }],
  },
  {
    shopSlug: "vogue-threads",
    name: "Bomber Jacket",
    slug: "bomber-jacket",
    sku: "VT-MJK-007",
    shortDesc: "Classic bomber with ribbed cuffs.",
    description: "Lightweight nylon bomber, full zip, side pockets, ribbed hem.",
    price: 129.0,
    stock: 28,
    brandSlug: "adidas",
    categorySlug: "men-jackets",
    images: [{ url: IMG("photo-1591047139829-d91aecb6caea"), isPrimary: true }],
  },

  // ============== TechHub (Tech) ==============
  {
    shopSlug: "techhub",
    name: "Apple iPhone 15 Pro",
    slug: "apple-iphone-15-pro",
    sku: "TH-IP15P-256",
    shortDesc: "Titanium-finish iPhone with the A17 Pro chip.",
    description: "6.1\" Super Retina XDR display, A17 Pro chip, ProMotion, 48MP main camera.",
    price: 1099.0,
    stock: 35,
    isFeatured: true,
    isBestseller: true,
    brandSlug: "apple",
    categorySlug: "tech-smartphones",
    tagSlugs: ["bestseller", "premium"],
    images: [{ url: IMG("photo-1592286927505-c0a4d3f49f30"), isPrimary: true }],
    specifications: [
      { group: "Display", label: "Size", value: "6.1\" OLED" },
      { group: "Performance", label: "Chip", value: "Apple A17 Pro" },
      { group: "Storage", label: "Capacity", value: "256 GB" },
    ],
  },
  {
    shopSlug: "techhub",
    name: "Samsung Galaxy S24",
    slug: "samsung-galaxy-s24",
    sku: "TH-GS24-128",
    shortDesc: "Flagship Android with AI-first features.",
    description: "Dynamic AMOLED 2X, Snapdragon 8 Gen 3, 50MP triple camera, Galaxy AI.",
    price: 899.0,
    stock: 40,
    brandSlug: "samsung",
    categorySlug: "tech-smartphones",
    images: [{ url: IMG("photo-1610945265064-0e34e5519bbf"), isPrimary: true }],
  },
  {
    shopSlug: "techhub",
    name: "MacBook Air 13\" M3",
    slug: "macbook-air-13-m3",
    sku: "TH-MBA13-M3",
    shortDesc: "Featherlight Mac with Apple silicon.",
    description: "13.6\" Liquid Retina, M3 chip, up to 18 hours battery, fanless design.",
    price: 1199.0,
    compareAtPrice: 1299.0,
    stock: 20,
    isOnSale: true,
    isFeatured: true,
    brandSlug: "apple",
    categorySlug: "tech-laptops",
    tagSlugs: ["on-sale", "premium"],
    images: [{ url: IMG("photo-1517336714731-489689fd1ca8"), isPrimary: true }],
  },
  {
    shopSlug: "techhub",
    name: "Sony WH-1000XM5",
    slug: "sony-wh-1000xm5",
    sku: "TH-WH1000XM5",
    shortDesc: "Industry-leading noise-cancelling headphones.",
    description: "30-hour battery life, multipoint Bluetooth, premium ANC, lightweight design.",
    price: 379.0,
    compareAtPrice: 399.0,
    stock: 60,
    isBestseller: true,
    brandSlug: "sony",
    categorySlug: "tech-audio",
    tagSlugs: ["bestseller", "on-sale"],
    images: [{ url: IMG("photo-1583394838336-acd977736f90"), isPrimary: true }],
  },
  {
    shopSlug: "techhub",
    name: "Apple Watch Series 9",
    slug: "apple-watch-series-9",
    sku: "TH-AW9-45",
    shortDesc: "Smartwatch with double tap & S9 chip.",
    description: "Always-on Retina display, ECG, blood-oxygen, fitness coaching.",
    price: 429.0,
    stock: 30,
    brandSlug: "apple",
    categorySlug: "tech-wearables",
    images: [{ url: IMG("photo-1546868871-7041f2a55e12"), isPrimary: true }],
  },
  {
    shopSlug: "techhub",
    name: "Anker 65W GaN Charger",
    slug: "anker-65w-gan-charger",
    sku: "TH-ANK65",
    shortDesc: "Compact 65W USB-C wall charger.",
    description: "GaN II tech, foldable plug, charges laptop and phone simultaneously.",
    price: 39.0,
    stock: 200,
    brandSlug: "anker",
    categorySlug: "tech-accessories",
    images: [{ url: IMG("photo-1609592424823-3d6e3a0f3f02"), isPrimary: true }],
  },

  // ============== Glow & Bloom (Beauty) ==============
  {
    shopSlug: "glow-and-bloom",
    name: "Hydrating Vitamin C Serum",
    slug: "hydrating-vitamin-c-serum",
    sku: "GB-SK-001",
    shortDesc: "Brightening serum with 15% vitamin C.",
    description: "Lightweight serum that brightens, evens tone, and hydrates with hyaluronic acid.",
    price: 38.0,
    stock: 80,
    isBestseller: true,
    brandSlug: "loreal",
    categorySlug: "beauty-skincare",
    tagSlugs: ["bestseller", "trending"],
    images: [{ url: IMG("photo-1556228720-195a672e8a03"), isPrimary: true }],
  },
  {
    shopSlug: "glow-and-bloom",
    name: "Velvet Matte Lipstick",
    slug: "velvet-matte-lipstick",
    sku: "GB-MK-002",
    shortDesc: "Long-wear creamy matte lipstick.",
    description: "8-hour wear, smooth glide, infused with vitamin E and shea butter.",
    price: 22.0,
    stock: 150,
    brandSlug: "mac",
    categorySlug: "beauty-makeup",
    tagSlugs: ["new-arrival"],
    images: [{ url: IMG("photo-1586495777744-4413f21062fa"), isPrimary: true }],
  },
  {
    shopSlug: "glow-and-bloom",
    name: "Mascara Volume Express",
    slug: "mascara-volume-express",
    sku: "GB-MK-003",
    shortDesc: "Black mascara for instant volume.",
    description: "Big-brush mascara delivering up to 8x more volume.",
    price: 12.0,
    stock: 200,
    brandSlug: "maybelline",
    categorySlug: "beauty-makeup",
    images: [{ url: IMG("photo-1631214540242-3cd8c4b0b3b8"), isPrimary: true }],
  },
  {
    shopSlug: "glow-and-bloom",
    name: "Rose Eau de Parfum 50ml",
    slug: "rose-eau-de-parfum-50ml",
    sku: "GB-FR-004",
    shortDesc: "Floral fragrance with rose & musk.",
    description: "Top notes of rose petal, heart of jasmine, base of warm musk.",
    price: 79.0,
    stock: 35,
    brandSlug: "loreal",
    categorySlug: "beauty-fragrance",
    tagSlugs: ["premium"],
    images: [{ url: IMG("photo-1541643600914-78b084683601"), isPrimary: true }],
  },
  {
    shopSlug: "glow-and-bloom",
    name: "Argan Hair Oil",
    slug: "argan-hair-oil",
    sku: "GB-HR-005",
    shortDesc: "Nourishing argan-infused hair oil.",
    description: "Tames frizz, adds shine, protects from heat damage. Lightweight, non-greasy.",
    price: 18.0,
    stock: 120,
    brandSlug: "nivea",
    categorySlug: "beauty-hair",
    images: [{ url: IMG("photo-1522338242992-e1a54906a8da"), isPrimary: true }],
  },

  // ============== Kids World (Kids) ==============
  {
    shopSlug: "kids-world",
    name: "Boys' Dinosaur T-Shirt",
    slug: "boys-dinosaur-tshirt",
    sku: "KW-BTS-001",
    shortDesc: "Soft cotton tee with dino print.",
    description: "100% organic cotton tee with playful dinosaur graphic. Ages 3-10.",
    price: 14.0,
    stock: 80,
    isBestseller: true,
    brandSlug: "little-sprout",
    categorySlug: "kids-boys",
    tagSlugs: ["bestseller", "eco-friendly"],
    images: [{ url: IMG("photo-1503454537195-1dcabb73ffb9"), isPrimary: true }],
  },
  {
    shopSlug: "kids-world",
    name: "Girls' Tulle Dress",
    slug: "girls-tulle-dress",
    sku: "KW-GDR-002",
    shortDesc: "Pastel pink tulle party dress.",
    description: "Sparkle bodice, full tulle skirt. Ages 4-9.",
    price: 39.0,
    stock: 40,
    brandSlug: "little-sprout",
    categorySlug: "kids-girls",
    images: [{ url: IMG("photo-1518831959646-742c3a14ebf7"), isPrimary: true }],
  },
  {
    shopSlug: "kids-world",
    name: "Wooden Puzzle Set",
    slug: "wooden-puzzle-set",
    sku: "KW-TY-003",
    shortDesc: "12-piece wooden animal puzzle.",
    description: "Sustainably sourced wood, non-toxic paints. Develops fine motor skills.",
    price: 24.0,
    stock: 100,
    brandSlug: "little-sprout",
    categorySlug: "kids-toys",
    tagSlugs: ["eco-friendly"],
    images: [{ url: IMG("photo-1545558014-8692077e9b5c"), isPrimary: true }],
  },
  {
    shopSlug: "kids-world",
    name: "Baby Onesie 3-Pack",
    slug: "baby-onesie-3-pack",
    sku: "KW-BB-004",
    shortDesc: "Soft cotton onesies (newborn to 12m).",
    description: "Pack of 3 organic cotton onesies with snap closures.",
    price: 28.0,
    stock: 75,
    isOnSale: true,
    compareAtPrice: 36.0,
    brandSlug: "little-sprout",
    categorySlug: "kids-baby",
    tagSlugs: ["on-sale", "eco-friendly"],
    images: [{ url: IMG("photo-1522771930-78848d9293e8"), isPrimary: true }],
  },

  // ============== Casa Nova (Home) ==============
  {
    shopSlug: "casa-nova",
    name: "Ceramic Vase Set",
    slug: "ceramic-vase-set",
    sku: "CN-DC-001",
    shortDesc: "Hand-thrown ceramic vases (set of 3).",
    description: "Minimalist sand-toned ceramics, perfect for dried flowers or as standalone art.",
    price: 65.0,
    stock: 25,
    isFeatured: true,
    brandSlug: "nexora-home",
    categorySlug: "home-decor",
    tagSlugs: ["trending"],
    images: [{ url: IMG("photo-1533090481720-856c6e3c1fdc"), isPrimary: true }],
  },
  {
    shopSlug: "casa-nova",
    name: "Stainless Steel Cookware Set",
    slug: "stainless-steel-cookware-set",
    sku: "CN-KT-002",
    shortDesc: "10-piece tri-ply stainless cookware.",
    description: "Even heat distribution, oven-safe to 500°F, dishwasher safe.",
    price: 299.0,
    compareAtPrice: 399.0,
    stock: 18,
    isOnSale: true,
    brandSlug: "nexora-home",
    categorySlug: "home-kitchen",
    tagSlugs: ["on-sale", "premium"],
    images: [{ url: IMG("photo-1556909114-44e3e9399c2b"), isPrimary: true }],
  },
  {
    shopSlug: "casa-nova",
    name: "Egyptian Cotton Bedsheet Set",
    slug: "egyptian-cotton-bedsheet-set",
    sku: "CN-BD-003",
    shortDesc: "400-thread-count Egyptian cotton sheets.",
    description: "Queen size, fitted + flat sheet + 2 pillowcases. Hypoallergenic.",
    price: 119.0,
    stock: 40,
    brandSlug: "nexora-home",
    categorySlug: "home-bedding",
    tagSlugs: ["premium"],
    images: [{ url: IMG("photo-1505691938895-1758d7feb511"), isPrimary: true }],
  },
];

// ---------------------------------------------------------------
// Seed runners
// ---------------------------------------------------------------

async function seedSellers() {
  for (const s of sellers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: s.email },
    });

    let userId = existingUser?.id;

    if (!existingUser) {
      try {
        const signup = await auth.api.signUpEmail({
          body: {
            email: s.email,
            password: s.password,
            name: s.ownerName,
            role: Role.SELLER,
            rememberMe: false,
          },
        });
        userId = signup.user.id;
      } catch (err) {
        console.error(`  ! Failed signing up ${s.email}:`, (err as Error).message);
        continue;
      }
    }
    if (!userId) continue;

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        role: Role.SELLER,
        status: UserStatus.ACTIVE,
      },
    });

    const existingSeller = await prisma.seller.findUnique({
      where: { userId },
    });

    if (existingSeller) {
      await prisma.seller.update({
        where: { id: existingSeller.id },
        data: {
          shopName: s.shopName,
          shopSlug: s.shopSlug,
          tagline: s.tagline,
          description: s.description,
          logo: s.logo,
          banner: s.banner,
          contactEmail: s.contactEmail,
          legalName: s.legalName,
          country: s.country,
          status: SellerStatus.APPROVED,
          approvedAt: existingSeller.approvedAt ?? new Date(),
          commissionRate: s.commissionRate ?? 10,
          isDeleted: false,
        },
      });
    } else {
      await prisma.seller.create({
        data: {
          userId,
          shopName: s.shopName,
          shopSlug: s.shopSlug,
          tagline: s.tagline,
          description: s.description,
          logo: s.logo,
          banner: s.banner,
          contactEmail: s.contactEmail,
          legalName: s.legalName,
          country: s.country,
          status: SellerStatus.APPROVED,
          approvedAt: new Date(),
          commissionRate: s.commissionRate ?? 10,
          applicationData: { seeded: true } as never,
        },
      });
    }
  }
  console.log(`✅ Sellers seeded (${sellers.length})`);
}

async function seedBrands() {
  for (const b of brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {
        name: b.name,
        description: b.description,
        isFeatured: b.isFeatured ?? false,
        isActive: true,
        isDeleted: false,
      },
      create: {
        name: b.name,
        slug: b.slug,
        description: b.description,
        isFeatured: b.isFeatured ?? false,
      },
    });
  }
  console.log(`✅ Brands seeded (${brands.length})`);
}

async function upsertCategoryTree(
  node: CategorySeed,
  parentId: string | null
): Promise<void> {
  const cat = await prisma.category.upsert({
    where: { slug: node.slug },
    update: {
      name: node.name,
      description: node.description,
      isFeatured: node.isFeatured ?? false,
      sortOrder: node.sortOrder ?? 0,
      isActive: true,
      isDeleted: false,
      parentId,
    },
    create: {
      name: node.name,
      slug: node.slug,
      description: node.description,
      isFeatured: node.isFeatured ?? false,
      sortOrder: node.sortOrder ?? 0,
      parentId,
    },
  });

  for (const child of node.children ?? []) {
    await upsertCategoryTree(child, cat.id);
  }
}

async function seedCategories() {
  for (const root of categories) {
    await upsertCategoryTree(root, null);
  }
  console.log(`✅ Categories seeded`);
}

async function seedTags() {
  for (const t of tags) {
    await prisma.productTag.upsert({
      where: { slug: t.slug },
      update: { name: t.name },
      create: { name: t.name, slug: t.slug },
    });
  }
  console.log(`✅ Tags seeded (${tags.length})`);
}

async function seedProducts() {
  let created = 0;
  let updated = 0;

  for (const p of products) {
    const seller = await prisma.seller.findUnique({
      where: { shopSlug: p.shopSlug },
    });
    if (!seller) {
      console.warn(`  ! Skipping ${p.slug} — seller ${p.shopSlug} not found`);
      continue;
    }
    const category = await prisma.category.findUnique({
      where: { slug: p.categorySlug },
    });
    if (!category) {
      console.warn(`  ! Skipping ${p.slug} — category ${p.categorySlug} not found`);
      continue;
    }
    const brand = p.brandSlug
      ? await prisma.brand.findUnique({ where: { slug: p.brandSlug } })
      : null;

    const tagConnect =
      p.tagSlugs && p.tagSlugs.length > 0
        ? { connect: p.tagSlugs.map((slug) => ({ slug })) }
        : undefined;

    const existing = await prisma.product.findUnique({
      where: { slug: p.slug },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          sku: p.sku,
          shortDesc: p.shortDesc,
          description: p.description,
          price: p.price,
          compareAtPrice: p.compareAtPrice ?? null,
          stock: p.stock,
          condition: ProductCondition.NEW,
          status: ProductStatus.ACTIVE,
          isFeatured: p.isFeatured ?? false,
          isBestseller: p.isBestseller ?? false,
          isNewArrival: p.isNewArrival ?? false,
          isOnSale: p.isOnSale ?? false,
          publishedAt: existing.publishedAt ?? new Date(),
          isDeleted: false,
          deletedAt: null,
          sellerId: seller.id,
          brandId: brand?.id ?? existing.brandId,
          categoryId: category.id,
          tags: tagConnect ? { set: [], connect: tagConnect.connect } : { set: [] },
        },
      });

      await prisma.productImage.deleteMany({
        where: { productId: existing.id },
      });
      await prisma.productSpecification.deleteMany({
        where: { productId: existing.id },
      });

      await prisma.productImage.createMany({
        data: p.images.map((img, idx) => ({
          productId: existing.id,
          url: img.url,
          alt: img.alt ?? p.name,
          sortOrder: idx,
          isPrimary: img.isPrimary ?? idx === 0,
        })),
      });

      if (p.specifications && p.specifications.length > 0) {
        await prisma.productSpecification.createMany({
          data: p.specifications.map((s, idx) => ({
            productId: existing.id,
            group: s.group,
            label: s.label,
            value: s.value,
            sortOrder: idx,
          })),
        });
      }

      updated += 1;
    } else {
      if (!brand) {
        console.warn(`  ! Skipping ${p.slug} — brand ${p.brandSlug} not found`);
        continue;
      }
      await prisma.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          shortDesc: p.shortDesc,
          description: p.description,
          price: p.price,
          compareAtPrice: p.compareAtPrice ?? null,
          stock: p.stock,
          condition: ProductCondition.NEW,
          status: ProductStatus.ACTIVE,
          isFeatured: p.isFeatured ?? false,
          isBestseller: p.isBestseller ?? false,
          isNewArrival: p.isNewArrival ?? false,
          isOnSale: p.isOnSale ?? false,
          publishedAt: new Date(),
          seller: { connect: { id: seller.id } },
          brand: { connect: { id: brand.id } },
          category: { connect: { id: category.id } },
          tags: tagConnect,
          images: {
            create: p.images.map((img, idx) => ({
              url: img.url,
              alt: img.alt ?? p.name,
              sortOrder: idx,
              isPrimary: img.isPrimary ?? idx === 0,
            })),
          },
          specifications: p.specifications
            ? {
                create: p.specifications.map((s, idx) => ({
                  group: s.group,
                  label: s.label,
                  value: s.value,
                  sortOrder: idx,
                })),
              }
            : undefined,
        },
      });
      created += 1;
    }
  }

  // Recompute productCount per seller
  for (const s of sellers) {
    const seller = await prisma.seller.findUnique({
      where: { shopSlug: s.shopSlug },
    });
    if (!seller) continue;
    const count = await prisma.product.count({
      where: { sellerId: seller.id, isDeleted: false },
    });
    await prisma.seller.update({
      where: { id: seller.id },
      data: { productCount: count },
    });
  }

  console.log(`✅ Products seeded (created: ${created}, updated: ${updated})`);
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------

async function main() {
  console.log("🚀 Nexora multi-vendor seed starting…");
  // Quiet a possible unused-import warning if slugify is not used elsewhere.
  void slugify;

  await seedAdmin();
  await seedSellers();
  await seedBrands();
  await seedCategories();
  await seedTags();
  await seedProducts();
  console.log("🎉 Nexora seed complete.");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
