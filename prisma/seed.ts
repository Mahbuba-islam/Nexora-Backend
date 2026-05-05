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
// Image pools (per leaf category) — used to enrich every product to
// at least 3 images, matching industry-standard PDP carousels.
// ---------------------------------------------------------------

const CAT_IMG_POOL: Record<string, string[]> = {
  "men-tshirts": ["photo-1521572163474-6864f9cf17ab", "photo-1583743814966-8936f5b7be1a", "photo-1576566588028-4147f3842f27", "photo-1618354691373-d851c5c3a990"],
  "men-shirts": ["photo-1516257984-b1b4d707412e", "photo-1602810318383-e386cc2a3ccf", "photo-1603252109303-2751441dd157", "photo-1593030761757-71fae45fa0e7"],
  "men-pants": ["photo-1542272604-787c3835535d", "photo-1604176354204-9268737828e4", "photo-1473966968600-fa801b869a1a", "photo-1551854838-212c50b4c184"],
  "men-jackets": ["photo-1591047139829-d91aecb6caea", "photo-1551028719-00167b16eac5", "photo-1544966503-7cc5ac882d5f", "photo-1539533113208-f6df8cc8b543"],
  "men-shoes": ["photo-1542291026-7eec264c27ff", "photo-1600185365483-26d7a4cc7519", "photo-1595950653106-6c9ebd614d3a", "photo-1606107557195-0e29a4b5b4aa"],
  "women-dresses": ["photo-1572804013309-59a88b7e92f1", "photo-1539008835657-9e8e9680c956", "photo-1496747611176-843222e1e57c", "photo-1566174053879-31528523f8ae"],
  "women-tops": ["photo-1485231183945-fffde7cc051e", "photo-1583744946564-b52ac1c389c8", "photo-1551803091-e20673f15770", "photo-1564257631407-4deb1f99d992"],
  "women-bottoms": ["photo-1551489186-cf8726f514f8", "photo-1594633313593-bab3825d0caf", "photo-1582418702059-97ebafb35d09", "photo-1605518216938-7c31b7b14ad0"],
  "women-bags": ["photo-1584917865442-de89df76afd3", "photo-1548036328-c9fa89d128fa", "photo-1591561954557-26941169b49e", "photo-1566150905458-1bf1fc113f0d"],
  "women-shoes": ["photo-1543163521-1bf539c55dd2", "photo-1581101767113-1677fc2beaa8", "photo-1535043934128-cf0b28d52f95", "photo-1518049362265-d5b2a6467637"],
  "kids-boys": ["photo-1503454537195-1dcabb73ffb9", "photo-1519278409-1f56fdda7485", "photo-1622290291468-a28f7a7dc6a8", "photo-1518831959646-742c3a14ebf7"],
  "kids-girls": ["photo-1518831959646-742c3a14ebf7", "photo-1519689680058-324335c77eba", "photo-1503944168849-8bf86bdc8d8b", "photo-1572213426852-0e4ed8f41ed0"],
  "kids-toys": ["photo-1545558014-8692077e9b5c", "photo-1584824486509-112e4181ff6b", "photo-1566576912321-d58ddd7a6088", "photo-1558877385-81a1c7e67d72"],
  "kids-baby": ["photo-1522771930-78848d9293e8", "photo-1503454537195-1dcabb73ffb9", "photo-1519689680058-324335c77eba", "photo-1544717297-fa95b6ee9643"],
  "tech-smartphones": ["photo-1592286927505-c0a4d3f49f30", "photo-1610945265064-0e34e5519bbf", "photo-1565849904461-04a58ad377e0", "photo-1511707171634-5f897ff02aa9"],
  "tech-laptops": ["photo-1517336714731-489689fd1ca8", "photo-1496181133206-80ce9b88a853", "photo-1593642632559-0c6d3fc62b89", "photo-1525547719571-a2d4ac8945e2"],
  "tech-audio": ["photo-1583394838336-acd977736f90", "photo-1545127398-14699f92334b", "photo-1546435770-a3e426bf472b", "photo-1558379852-cce0deddd9ce"],
  "tech-wearables": ["photo-1546868871-7041f2a55e12", "photo-1579586337278-3befd40fd17a", "photo-1523275335684-37898b6baf30", "photo-1508685096489-7aacd43bd3b1"],
  "tech-accessories": ["photo-1609592424823-3d6e3a0f3f02", "photo-1606760227091-3dd870d97f1d", "photo-1583863788434-e58a36330cf0", "photo-1572569511254-d8f925fe2cbb"],
  "beauty-skincare": ["photo-1556228720-195a672e8a03", "photo-1620916566398-39f1143ab7be", "photo-1571781926291-c477ebfd024b", "photo-1608248543803-ba4f8c70ae0b"],
  "beauty-makeup": ["photo-1586495777744-4413f21062fa", "photo-1631214540242-3cd8c4b0b3b8", "photo-1522335789203-aaa6e0b8d96b", "photo-1512496015851-a90fb38ba796"],
  "beauty-fragrance": ["photo-1541643600914-78b084683601", "photo-1592945403244-b3fbafd7f539", "photo-1547887537-6158d64c35b3", "photo-1615634260167-c8cdede054de"],
  "beauty-hair": ["photo-1522338242992-e1a54906a8da", "photo-1526045478516-99145907023c", "photo-1571875257727-256c39da42af", "photo-1600948836101-f9ffda59d250"],
  "home-decor": ["photo-1533090481720-856c6e3c1fdc", "photo-1513519245088-0e12902e5a38", "photo-1578500494198-246f612d3b3d", "photo-1545454675-3531b543be5d"],
  "home-kitchen": ["photo-1556909114-44e3e9399c2b", "photo-1556909190-eccf4a8bf97a", "photo-1574269909862-7e1d70bb8078", "photo-1607894007-d35d40e1e0db"],
  "home-bedding": ["photo-1505691938895-1758d7feb511", "photo-1540518614846-7eded433c457", "photo-1522771930-78848d9293e8", "photo-1505693416388-ac5ce068fe85"],
};

function enrichImages(p: ProductSeed): ImageSeed[] {
  const out: ImageSeed[] = p.images.slice();
  const seen = new Set(out.map((i) => i.url));
  const pool = CAT_IMG_POOL[p.categorySlug] ?? [];
  for (const id of pool) {
    if (out.length >= 3) break;
    const url = IMG(id);
    if (!seen.has(url)) {
      out.push({ url, alt: p.name });
      seen.add(url);
    }
  }
  // Fallback if pool was empty: pad to 3 by re-using primary
  while (out.length < 3 && out.length > 0) {
    out.push({ url: out[0].url, alt: p.name });
  }
  return out.map((img, idx) => ({
    url: img.url,
    alt: img.alt ?? p.name,
    isPrimary: idx === 0,
  }));
}

// ---------------------------------------------------------------
// Bonus products — fills out every category and brand for a
// production-grade catalog (varied counts per (category × brand)).
// ---------------------------------------------------------------

type QuickFlags = "feat" | "best" | "new" | "sale";

function mk(opts: {
  shop: string;
  slug: string;
  sku: string;
  name: string;
  short: string;
  desc: string;
  price: number;
  cmp?: number;
  stock: number;
  brand: string;
  cat: string;
  flags?: QuickFlags[];
  tags?: string[];
  specs?: SpecSeed[];
}): ProductSeed {
  const f = new Set<QuickFlags>(opts.flags ?? []);
  return {
    shopSlug: opts.shop,
    slug: opts.slug,
    sku: opts.sku,
    name: opts.name,
    shortDesc: opts.short,
    description: opts.desc,
    price: opts.price,
    compareAtPrice: opts.cmp,
    stock: opts.stock,
    isFeatured: f.has("feat"),
    isBestseller: f.has("best"),
    isNewArrival: f.has("new"),
    isOnSale: f.has("sale") || opts.cmp != null,
    brandSlug: opts.brand,
    categorySlug: opts.cat,
    tagSlugs: opts.tags,
    images: [], // filled by enrichImages()
    specifications: opts.specs,
  };
}

const bonusProducts: ProductSeed[] = [
  // -------- Men's T-Shirts --------
  mk({ shop: "vogue-threads", slug: "nike-dri-fit-tee", sku: "VT-MTSH-N01", name: "Nike Dri-FIT Performance Tee", short: "Sweat-wicking athletic tee.", desc: "Dri-FIT technology pulls moisture away from your skin so you stay dry. Lightweight knit with a relaxed athletic fit.", price: 35, cmp: 45, stock: 90, brand: "nike", cat: "men-tshirts", flags: ["best", "sale"], tags: ["bestseller", "on-sale"] }),
  mk({ shop: "vogue-threads", slug: "adidas-trefoil-tee", sku: "VT-MTSH-A02", name: "Adidas Trefoil Logo Tee", short: "Iconic trefoil cotton tee.", desc: "Soft cotton jersey tee featuring the classic Trefoil logo at the chest. Regular fit.", price: 30, stock: 110, brand: "adidas", cat: "men-tshirts", tags: ["trending"] }),
  mk({ shop: "vogue-threads", slug: "zara-striped-crew-tee", sku: "VT-MTSH-Z03", name: "Zara Striped Crew Tee", short: "Breton-stripe cotton tee.", desc: "Mid-weight cotton jersey tee with classic Breton stripes and ribbed crew neck.", price: 25, stock: 70, brand: "zara", cat: "men-tshirts" }),
  mk({ shop: "vogue-threads", slug: "levis-vintage-logo-tee", sku: "VT-MTSH-L04", name: "Levi's Vintage Logo Tee", short: "Soft-washed graphic tee.", desc: "Vintage-washed cotton tee with a retro chest logo. Pre-shrunk and pre-softened.", price: 28, stock: 85, brand: "levis", cat: "men-tshirts", flags: ["new"], tags: ["new-arrival"] }),

  // -------- Men's Shirts --------
  mk({ shop: "vogue-threads", slug: "hm-oxford-button-down", sku: "VT-MSH-H01", name: "H&M Oxford Button-Down", short: "Classic oxford in slim fit.", desc: "Pure cotton oxford with a button-down collar and mother-of-pearl buttons.", price: 40, stock: 60, brand: "hm", cat: "men-shirts" }),
  mk({ shop: "vogue-threads", slug: "levis-western-denim-shirt", sku: "VT-MSH-L02", name: "Levi's Western Denim Shirt", short: "Yoke-shoulder western shirt.", desc: "Classic western denim shirt with snap front and chest flap pockets.", price: 69, stock: 35, brand: "levis", cat: "men-shirts", tags: ["premium"] }),
  mk({ shop: "vogue-threads", slug: "adidas-track-polo", sku: "VT-MSH-A03", name: "Adidas Track Polo", short: "Performance pique polo.", desc: "Three-stripes pique polo with moisture-wicking fabric and ribbed collar.", price: 45, stock: 50, brand: "adidas", cat: "men-shirts" }),

  // -------- Men's Pants --------
  mk({ shop: "vogue-threads", slug: "zara-tapered-chinos", sku: "VT-MPN-Z01", name: "Zara Tapered Chinos", short: "Stretch-cotton chino pants.", desc: "Tapered chinos in a soft cotton-stretch twill with a clean, modern silhouette.", price: 55, stock: 40, brand: "zara", cat: "men-pants" }),
  mk({ shop: "vogue-threads", slug: "hm-slim-joggers", sku: "VT-MPN-H02", name: "H&M Slim Joggers", short: "Lounge-ready jersey joggers.", desc: "Brushed-back jersey joggers with elasticated waist and tapered leg.", price: 32, stock: 80, brand: "hm", cat: "men-pants", flags: ["sale"], cmp: 42 }),

  // -------- Men's Jackets --------
  mk({ shop: "vogue-threads", slug: "levis-trucker-denim-jacket", sku: "VT-MJK-L01", name: "Levi's Trucker Denim Jacket", short: "Iconic trucker denim jacket.", desc: "The original trucker silhouette in rigid denim. Button front, chest flap pockets.", price: 98, stock: 30, brand: "levis", cat: "men-jackets", flags: ["best"], tags: ["bestseller", "premium"] }),
  mk({ shop: "vogue-threads", slug: "nike-windbreaker", sku: "VT-MJK-N02", name: "Nike Windbreaker", short: "Packable lightweight windbreaker.", desc: "Water-repellent ripstop windbreaker that packs into its own pocket.", price: 89, cmp: 110, stock: 45, brand: "nike", cat: "men-jackets", flags: ["sale"], tags: ["on-sale"] }),

  // -------- Men's Shoes --------
  mk({ shop: "vogue-threads", slug: "adidas-ultraboost-22", sku: "VT-MSHO-A01", name: "Adidas Ultraboost 22", short: "Energy-returning running shoes.", desc: "Boost cushioning, Primeknit upper, and Continental rubber outsole. Built for long miles.", price: 179, stock: 40, brand: "adidas", cat: "men-shoes", flags: ["feat"], tags: ["premium"] }),
  mk({ shop: "vogue-threads", slug: "zara-leather-loafers", sku: "VT-MSHO-Z02", name: "Zara Leather Loafers", short: "Polished penny loafers.", desc: "Hand-finished leather penny loafers with leather soles. Made in Spain.", price: 99, stock: 25, brand: "zara", cat: "men-shoes" }),
  mk({ shop: "vogue-threads", slug: "nike-air-force-1", sku: "VT-MSHO-N03", name: "Nike Air Force 1 '07", short: "Iconic court sneaker.", desc: "The original AF1 silhouette in full-grain leather with classic Air cushioning.", price: 110, stock: 80, brand: "nike", cat: "men-shoes", flags: ["best"], tags: ["bestseller"] }),

  // -------- Women's Dresses --------
  mk({ shop: "vogue-threads", slug: "hm-linen-wrap-dress", sku: "VT-WDR-H01", name: "H&M Linen Wrap Dress", short: "Breezy linen-blend wrap.", desc: "Lightweight linen-blend dress with a self-tie wrap front and short flutter sleeves.", price: 49, stock: 55, brand: "hm", cat: "women-dresses" }),
  mk({ shop: "vogue-threads", slug: "adidas-tennis-dress", sku: "VT-WDR-A02", name: "Adidas Tennis Dress", short: "Performance tennis dress.", desc: "Built-in shorts, AEROREADY moisture management, and ribbed collar.", price: 79, stock: 30, brand: "adidas", cat: "women-dresses" }),
  mk({ shop: "vogue-threads", slug: "zara-satin-slip-dress", sku: "VT-WDR-Z03", name: "Zara Satin Slip Dress", short: "Bias-cut satin slip dress.", desc: "Liquid satin midi slip with adjustable straps and bias-cut silhouette.", price: 79, stock: 40, brand: "zara", cat: "women-dresses", flags: ["new"], tags: ["new-arrival", "trending"] }),
  mk({ shop: "vogue-threads", slug: "levis-denim-pinafore", sku: "VT-WDR-L04", name: "Levi's Denim Pinafore Dress", short: "Classic denim pinafore.", desc: "Heavyweight rigid denim pinafore with adjustable straps and patch pockets.", price: 89, stock: 25, brand: "levis", cat: "women-dresses" }),

  // -------- Women's Tops --------
  mk({ shop: "vogue-threads", slug: "zara-silk-blouse", sku: "VT-WTP-Z01", name: "Zara Silk Blouse", short: "Pure-silk button-up blouse.", desc: "100% mulberry silk blouse with a relaxed fit and shell buttons.", price: 69, stock: 60, brand: "zara", cat: "women-tops", tags: ["premium"] }),
  mk({ shop: "vogue-threads", slug: "hm-ribbed-tank", sku: "VT-WTP-H02", name: "H&M Ribbed Tank", short: "Stretch ribbed cotton tank.", desc: "Soft ribbed cotton-modal tank with scooped neckline. Wear alone or layered.", price: 19, stock: 200, brand: "hm", cat: "women-tops" }),
  mk({ shop: "vogue-threads", slug: "nike-sports-bra", sku: "VT-WTP-N03", name: "Nike Sports Bra", short: "Medium-support training bra.", desc: "Dri-FIT sports bra with removable pads and breathable mesh back panel.", price: 35, stock: 100, brand: "nike", cat: "women-tops", flags: ["best"], tags: ["bestseller"] }),
  mk({ shop: "vogue-threads", slug: "adidas-crop-hoodie", sku: "VT-WTP-A04", name: "Adidas Crop Hoodie", short: "Cropped fleece hoodie.", desc: "Brushed-back fleece cropped hoodie with kangaroo pocket and drawcord hood.", price: 65, stock: 50, brand: "adidas", cat: "women-tops" }),

  // -------- Women's Bottoms --------
  mk({ shop: "vogue-threads", slug: "levis-501-skinny", sku: "VT-WBT-L01", name: "Levi's 501 Skinny Jeans", short: "Iconic 501 in skinny fit.", desc: "Rigid stretch denim with the original 501 styling, reimagined in a modern skinny silhouette.", price: 89, cmp: 110, stock: 70, brand: "levis", cat: "women-bottoms", flags: ["sale", "best"], tags: ["bestseller", "on-sale"] }),
  mk({ shop: "vogue-threads", slug: "zara-pleated-midi-skirt", sku: "VT-WBT-Z02", name: "Zara Pleated Midi Skirt", short: "Sunray-pleated midi skirt.", desc: "Sunray-pleated satin midi skirt with elasticated waist.", price: 59, stock: 35, brand: "zara", cat: "women-bottoms" }),
  mk({ shop: "vogue-threads", slug: "hm-wide-leg-trousers", sku: "VT-WBT-H03", name: "H&M Wide-Leg Trousers", short: "High-rise wide-leg trousers.", desc: "Tailored wide-leg trousers with creased fronts and side pockets.", price: 49, stock: 60, brand: "hm", cat: "women-bottoms" }),

  // -------- Women's Bags --------
  mk({ shop: "vogue-threads", slug: "hm-mini-tote", sku: "VT-WBG-H01", name: "H&M Mini Tote", short: "Structured mini tote bag.", desc: "Vegan-leather mini tote with detachable crossbody strap and gold-tone hardware.", price: 35, stock: 80, brand: "hm", cat: "women-bags" }),
  mk({ shop: "vogue-threads", slug: "zara-chain-shoulder-bag", sku: "VT-WBG-Z02", name: "Zara Chain Shoulder Bag", short: "Quilted chain shoulder bag.", desc: "Quilted faux-leather shoulder bag with metal chain strap and turn-lock closure.", price: 79, stock: 30, brand: "zara", cat: "women-bags" }),

  // -------- Women's Shoes --------
  mk({ shop: "vogue-threads", slug: "nike-air-max-90-w", sku: "VT-WSHO-N01", name: "Nike Air Max 90 (Women)", short: "Iconic Air Max 90.", desc: "Visible Max Air cushioning, no-sew overlays, and waffle outsole. A timeless icon.", price: 130, stock: 55, brand: "nike", cat: "women-shoes", flags: ["best"], tags: ["bestseller"] }),
  mk({ shop: "vogue-threads", slug: "adidas-stan-smith-w", sku: "VT-WSHO-A02", name: "Adidas Stan Smith", short: "Classic court sneaker.", desc: "Iconic minimal court sneaker in soft leather with perforated 3-stripes.", price: 95, stock: 70, brand: "adidas", cat: "women-shoes" }),
  mk({ shop: "vogue-threads", slug: "zara-block-heel-sandals", sku: "VT-WSHO-Z03", name: "Zara Block-Heel Sandals", short: "Strappy block-heel sandals.", desc: "Square-toe leather sandals with adjustable ankle strap and 75mm block heel.", price: 69, stock: 40, brand: "zara", cat: "women-shoes", flags: ["new"], tags: ["new-arrival"] }),

  // -------- Kids Boys --------
  mk({ shop: "kids-world", slug: "ls-striped-polo", sku: "KW-BTS-005", name: "Striped Cotton Polo", short: "Soft pique polo for boys.", desc: "Combed cotton pique polo with embroidered chest detail. Ages 3-10.", price: 18, stock: 60, brand: "little-sprout", cat: "kids-boys", tags: ["eco-friendly"] }),
  mk({ shop: "kids-world", slug: "hm-boys-cargo-shorts", sku: "KW-BTS-006", name: "Boys' Cargo Shorts", short: "Durable cotton cargo shorts.", desc: "Cotton-twill cargo shorts with side pockets and adjustable waist. Ages 4-12.", price: 22, stock: 75, brand: "hm", cat: "kids-boys" }),

  // -------- Kids Girls --------
  mk({ shop: "kids-world", slug: "ls-floral-romper", sku: "KW-GDR-005", name: "Floral Cotton Romper", short: "Breezy floral romper.", desc: "Soft cotton romper in a sweet floral print with elastic waist. Ages 2-7.", price: 26, stock: 50, brand: "little-sprout", cat: "kids-girls", tags: ["eco-friendly"] }),
  mk({ shop: "kids-world", slug: "hm-girls-denim-jacket", sku: "KW-GDR-006", name: "Girls' Denim Jacket", short: "Classic kids' denim jacket.", desc: "Soft-washed denim jacket with chest pockets and metal buttons. Ages 4-10.", price: 36, stock: 40, brand: "hm", cat: "kids-girls" }),

  // -------- Kids Toys --------
  mk({ shop: "kids-world", slug: "ls-plush-bunny", sku: "KW-TY-006", name: "Plush Bunny Friend", short: "Super-soft plush bunny.", desc: "Hypoallergenic plush bunny with embroidered features (no small parts). 30cm tall.", price: 19, stock: 130, brand: "little-sprout", cat: "kids-toys", flags: ["best"], tags: ["bestseller"] }),
  mk({ shop: "kids-world", slug: "ls-building-blocks", sku: "KW-TY-007", name: "Wooden Building Blocks (50pc)", short: "50-piece wooden block set.", desc: "Beech-wood building blocks finished with non-toxic water-based stains.", price: 34, stock: 90, brand: "little-sprout", cat: "kids-toys", tags: ["eco-friendly"] }),
  mk({ shop: "kids-world", slug: "ls-magnetic-tiles", sku: "KW-TY-008", name: "Magnetic Tile Set (60pc)", short: "STEM magnetic building tiles.", desc: "Translucent magnetic tiles for endless 2D and 3D construction. STEM-approved.", price: 49, cmp: 59, stock: 70, brand: "little-sprout", cat: "kids-toys", flags: ["sale", "feat"], tags: ["on-sale"] }),

  // -------- Kids Baby --------
  mk({ shop: "kids-world", slug: "ls-muslin-swaddles-4pk", sku: "KW-BB-007", name: "Muslin Swaddles 4-Pack", short: "Breathable muslin swaddles.", desc: "Pre-washed organic cotton muslin swaddles. Generous 120x120cm size.", price: 32, stock: 120, brand: "little-sprout", cat: "kids-baby", tags: ["eco-friendly"] }),
  mk({ shop: "kids-world", slug: "ls-baby-booties", sku: "KW-BB-008", name: "Soft Baby Booties", short: "Anti-slip soft booties.", desc: "Knit booties with non-slip soles and stretch ankle. 0-12 months.", price: 14, stock: 150, brand: "little-sprout", cat: "kids-baby" }),

  // -------- Smartphones --------
  mk({ shop: "techhub", slug: "apple-iphone-15", sku: "TH-IP15-128", name: "Apple iPhone 15", short: "iPhone 15 with USB-C and 48MP camera.", desc: '6.1" Super Retina XDR, A16 Bionic chip, USB-C, 48MP main camera, Dynamic Island.', price: 799, stock: 60, brand: "apple", cat: "tech-smartphones", flags: ["best"], tags: ["bestseller"], specs: [{ group: "Display", label: "Size", value: '6.1" OLED' }, { group: "Performance", label: "Chip", value: "A16 Bionic" }, { group: "Storage", label: "Capacity", value: "128 GB" }] }),
  mk({ shop: "techhub", slug: "samsung-galaxy-a55", sku: "TH-A55-128", name: "Samsung Galaxy A55", short: "Mid-range with flagship-style design.", desc: "Super AMOLED 120Hz, Exynos 1480, 50MP triple camera, 5000mAh battery.", price: 499, stock: 90, brand: "samsung", cat: "tech-smartphones" }),

  // -------- Laptops --------
  mk({ shop: "techhub", slug: "samsung-galaxy-book4-pro", sku: "TH-GB4P-512", name: "Samsung Galaxy Book4 Pro", short: "Featherlight 14\" OLED laptop.", desc: 'Intel Core Ultra 7, 14" 3K AMOLED touch, 16GB LPDDR5X, 512GB SSD.', price: 1099, stock: 18, brand: "samsung", cat: "tech-laptops", flags: ["new"], tags: ["new-arrival"] }),
  mk({ shop: "techhub", slug: "sony-vaio-sx14", sku: "TH-VAIO-SX14", name: "Sony VAIO SX14", short: "Ultra-light premium business laptop.", desc: 'Magnesium chassis, 14" 4K, 13th-gen Core i7, 16GB RAM, 1TB SSD.', price: 1499, stock: 12, brand: "sony", cat: "tech-laptops", tags: ["premium"] }),

  // -------- Audio --------
  mk({ shop: "techhub", slug: "apple-airpods-pro-2", sku: "TH-APP2", name: "Apple AirPods Pro 2", short: "Active noise-cancelling earbuds.", desc: "H2 chip, adaptive transparency, personalized spatial audio, MagSafe USB-C case.", price: 249, stock: 200, brand: "apple", cat: "tech-audio", flags: ["best", "feat"], tags: ["bestseller", "premium"] }),
  mk({ shop: "techhub", slug: "sony-linkbuds-s", sku: "TH-LBS", name: "Sony LinkBuds S", short: "Compact ANC earbuds.", desc: "Integrated processor V1, adaptive ANC, multipoint Bluetooth, 20-hour total battery.", price: 179, stock: 80, brand: "sony", cat: "tech-audio" }),
  mk({ shop: "techhub", slug: "anker-soundcore-q45", sku: "TH-Q45", name: "Anker Soundcore Q45", short: "Hi-Res over-ear ANC headphones.", desc: "LDAC Hi-Res Wireless, adaptive ANC, 50-hour battery, custom EQ.", price: 99, stock: 150, brand: "anker", cat: "tech-audio", flags: ["sale"], cmp: 129, tags: ["on-sale"] }),

  // -------- Wearables --------
  mk({ shop: "techhub", slug: "samsung-galaxy-watch6", sku: "TH-GW6-44", name: "Samsung Galaxy Watch6 44mm", short: "Smart fitness companion.", desc: "Sapphire crystal, BioActive sensor, sleep coaching, advanced workout tracking.", price: 329, stock: 50, brand: "samsung", cat: "tech-wearables" }),
  mk({ shop: "techhub", slug: "apple-watch-se", sku: "TH-AWSE-44", name: "Apple Watch SE 44mm", short: "All the essentials.", desc: "Heart-rate monitoring, fitness tracking, fall detection, and crash detection.", price: 249, stock: 60, brand: "apple", cat: "tech-wearables" }),

  // -------- Tech Accessories --------
  mk({ shop: "techhub", slug: "anker-magsafe-power-bank-10k", sku: "TH-ANK-MPB10", name: "Anker MagSafe Power Bank 10K", short: "Magnetic 10000mAh battery.", desc: "Snaps to MagSafe iPhones, 7.5W wireless and 20W USB-C wired output.", price: 59, stock: 220, brand: "anker", cat: "tech-accessories", flags: ["best"], tags: ["bestseller"] }),
  mk({ shop: "techhub", slug: "apple-usbc-lightning-cable", sku: "TH-APL-USBC", name: "Apple USB-C to Lightning Cable 1m", short: "Genuine Apple charge cable.", desc: "Supports fast charging on supported iPhones with a USB-C power adapter.", price: 19, stock: 400, brand: "apple", cat: "tech-accessories" }),
  mk({ shop: "techhub", slug: "samsung-25w-travel-adapter", sku: "TH-S25W", name: "Samsung 25W Travel Adapter", short: "Super Fast Charging adapter.", desc: "USB-C 25W PD adapter for Samsung Galaxy Super Fast Charging.", price: 35, stock: 250, brand: "samsung", cat: "tech-accessories" }),
  mk({ shop: "techhub", slug: "sony-sd-128gb", sku: "TH-SD128", name: "Sony Tough SD Card 128GB", short: "Pro-grade UHS-II SD card.", desc: "Waterproof and shockproof V90 SD card with 300MB/s read speed.", price: 29, stock: 180, brand: "sony", cat: "tech-accessories" }),

  // -------- Beauty Skincare --------
  mk({ shop: "glow-and-bloom", slug: "nivea-soft-cream", sku: "GB-SK-006", name: "Nivea Soft Moisturizing Cream", short: "All-in-one moisturizer.", desc: "Light, fast-absorbing cream with vitamin E and jojoba oil for face, hands, and body.", price: 9, stock: 300, brand: "nivea", cat: "beauty-skincare" }),
  mk({ shop: "glow-and-bloom", slug: "loreal-revitalift-night-serum", sku: "GB-SK-007", name: "L'Oréal Revitalift Night Serum", short: "Pro-retinol overnight serum.", desc: "Concentrated pro-retinol & vitamin E night serum to visibly reduce wrinkles in 4 weeks.", price: 34, cmp: 42, stock: 90, brand: "loreal", cat: "beauty-skincare", flags: ["sale", "best"], tags: ["on-sale", "bestseller"] }),
  mk({ shop: "glow-and-bloom", slug: "maybelline-hydra-glow-toner", sku: "GB-SK-008", name: "Maybelline Hydra-Glow Toner", short: "Hydrating glow toner.", desc: "Alcohol-free toner with niacinamide and hyaluronic acid for an instant glow.", price: 14, stock: 150, brand: "maybelline", cat: "beauty-skincare", flags: ["new"], tags: ["new-arrival"] }),
  mk({ shop: "glow-and-bloom", slug: "mac-hyper-real-glow-pads", sku: "GB-SK-009", name: "MAC Hyper Real Glow Pads", short: "Resurfacing exfoliating pads.", desc: "Lactic + glycolic acid pads to gently resurface and brighten dull skin.", price: 39, stock: 80, brand: "mac", cat: "beauty-skincare", tags: ["premium"] }),

  // -------- Beauty Makeup --------
  mk({ shop: "glow-and-bloom", slug: "mac-studio-fix-foundation", sku: "GB-MK-006", name: "MAC Studio Fix Fluid Foundation", short: "Long-wear matte foundation.", desc: "24-hour wear, oil-free liquid foundation in a wide shade range. SPF 15.", price: 44, stock: 120, brand: "mac", cat: "beauty-makeup", flags: ["best"], tags: ["bestseller", "premium"] }),
  mk({ shop: "glow-and-bloom", slug: "maybelline-sky-high-mascara-brown", sku: "GB-MK-007", name: "Maybelline Sky High Mascara (Brown)", short: "Limitless lash length mascara.", desc: "Bamboo-extract formula and flex tower brush for sky-high length and volume.", price: 13, stock: 250, brand: "maybelline", cat: "beauty-makeup" }),
  mk({ shop: "glow-and-bloom", slug: "loreal-true-match-concealer", sku: "GB-MK-008", name: "L'Oréal True Match Concealer", short: "Lightweight everyday concealer.", desc: "Buildable medium coverage with hyaluronic acid in 12 true-to-skin shades.", price: 12, stock: 200, brand: "loreal", cat: "beauty-makeup" }),

  // -------- Beauty Fragrance --------
  mk({ shop: "glow-and-bloom", slug: "mac-velvet-teddy-edt", sku: "GB-FR-005", name: "MAC Velvet Teddy Eau de Toilette", short: "Warm vanilla EDT inspired by the iconic shade.", desc: "Notes of warm vanilla, amber, and white musk. 50ml.", price: 59, stock: 60, brand: "mac", cat: "beauty-fragrance", tags: ["premium"] }),
  mk({ shop: "glow-and-bloom", slug: "maybelline-floral-mist", sku: "GB-FR-006", name: "Maybelline Floral Body Mist", short: "Light floral body mist.", desc: "Refreshing daily-wear floral mist with notes of peony, lily, and white musk.", price: 25, stock: 110, brand: "maybelline", cat: "beauty-fragrance" }),

  // -------- Beauty Hair --------
  mk({ shop: "glow-and-bloom", slug: "loreal-elvive-shampoo", sku: "GB-HR-006", name: "L'Oréal Elvive Total Repair Shampoo", short: "Repairing daily shampoo.", desc: "Pro-keratin and ceramide formula repairs the 5 signs of damaged hair.", price: 11, stock: 250, brand: "loreal", cat: "beauty-hair" }),
  mk({ shop: "glow-and-bloom", slug: "nivea-volume-care-conditioner", sku: "GB-HR-007", name: "Nivea Volume Care Conditioner", short: "Volume-boosting conditioner.", desc: "Lightweight conditioner that adds volume without weighing hair down.", price: 9, stock: 220, brand: "nivea", cat: "beauty-hair" }),

  // -------- Home Decor --------
  mk({ shop: "casa-nova", slug: "cn-linen-pillow-set", sku: "CN-DC-004", name: "Linen Throw Pillow Set", short: "Stonewashed linen pillow covers.", desc: "Set of 2 stonewashed linen pillow covers with hidden zip closures. 18\"x18\".", price: 42, stock: 80, brand: "nexora-home", cat: "home-decor" }),
  mk({ shop: "casa-nova", slug: "cn-brass-candle-trio", sku: "CN-DC-005", name: "Brass Candle Holder Trio", short: "Sculptural brass candle holders.", desc: "Set of 3 solid-brass taper candle holders in graduated heights.", price: 54, stock: 50, brand: "nexora-home", cat: "home-decor", tags: ["trending"] }),
  mk({ shop: "casa-nova", slug: "cn-woven-wall-hanging", sku: "CN-DC-006", name: "Woven Wall Hanging", short: "Hand-woven cotton tapestry.", desc: "Bohemian cotton wall hanging with wooden dowel and cotton fringe. 60x80cm.", price: 79, stock: 30, brand: "nexora-home", cat: "home-decor", flags: ["new"], tags: ["new-arrival"] }),

  // -------- Home Kitchen --------
  mk({ shop: "casa-nova", slug: "cn-cast-iron-skillet-12", sku: "CN-KT-003", name: 'Cast-Iron Skillet 12"', short: "Pre-seasoned cast-iron skillet.", desc: "Heavy-gauge pre-seasoned cast-iron skillet. Oven, stove, grill, and campfire safe.", price: 79, stock: 60, brand: "nexora-home", cat: "home-kitchen", flags: ["best"], tags: ["bestseller"] }),
  mk({ shop: "casa-nova", slug: "cn-bamboo-cutting-set", sku: "CN-KT-004", name: "Bamboo Cutting Board Set", short: "Eco-friendly bamboo boards.", desc: "Set of 3 organic bamboo cutting boards with juice grooves. Knife-friendly surface.", price: 34, stock: 120, brand: "nexora-home", cat: "home-kitchen", tags: ["eco-friendly"] }),

  // -------- Home Bedding --------
  mk({ shop: "casa-nova", slug: "cn-linen-duvet-king", sku: "CN-BD-004", name: "Linen Duvet Cover (King)", short: "Stonewashed linen duvet cover.", desc: "100% European flax linen duvet cover with coconut-shell button closure.", price: 159, stock: 28, brand: "nexora-home", cat: "home-bedding", tags: ["premium"] }),
  mk({ shop: "casa-nova", slug: "cn-memory-foam-pillows-2pk", sku: "CN-BD-005", name: "Memory Foam Pillows 2-Pack", short: "Cooling memory-foam pillows.", desc: "Pair of cooling-gel memory-foam pillows with washable bamboo covers.", price: 69, cmp: 89, stock: 90, brand: "nexora-home", cat: "home-bedding", flags: ["sale"], tags: ["on-sale"] }),
];

// ---------------------------------------------------------------
// Customers (used for reviews and Q&A)
// ---------------------------------------------------------------

type CustomerSeed = { email: string; password: string; name: string };

const customers: CustomerSeed[] = [
  { email: "emma@nexora.dev", password: "Customer@123", name: "Emma Lopez" },
  { email: "liam@nexora.dev", password: "Customer@123", name: "Liam Chen" },
  { email: "sophia@nexora.dev", password: "Customer@123", name: "Sophia Patel" },
  { email: "noah@nexora.dev", password: "Customer@123", name: "Noah Garcia" },
  { email: "ava@nexora.dev", password: "Customer@123", name: "Ava Kim" },
  { email: "mason@nexora.dev", password: "Customer@123", name: "Mason Brown" },
];

// ---------------------------------------------------------------
// Review & Q&A content banks (kept short so all variants read well)
// ---------------------------------------------------------------

const reviewBank: Record<2 | 3 | 4 | 5, { title: string; comment: string }[]> = {
  5: [
    { title: "Absolutely love it!", comment: "Quality is outstanding and shipping was lightning-fast. Highly recommend." },
    { title: "Best purchase this year", comment: "Lives up to the hype — feels premium and worth every penny. I'll be back for more." },
    { title: "Exceeded expectations", comment: "Even better than the photos. Packaging was beautiful and product is flawless." },
    { title: "Top-tier quality", comment: "Materials, finish and attention to detail are excellent. 10/10 from me." },
    { title: "Five stars, easy", comment: "Exactly as described and delivered earlier than promised. Will repeat." },
  ],
  4: [
    { title: "Great product overall", comment: "Really happy with this. A couple of minor nitpicks but a strong buy at this price." },
    { title: "Solid choice", comment: "Does exactly what it promises and feels well-made. Would buy again." },
    { title: "Good value for money", comment: "Quality is on par with the price point. No complaints." },
    { title: "Recommended", comment: "Looks and works great. Took half a star off because shipping was a day late." },
  ],
  3: [
    { title: "Decent — does the job", comment: "It's okay. Works as expected but nothing about it is wow." },
    { title: "Average product", comment: "Mid-tier — fine for casual use but I expected slightly more for the price." },
    { title: "Mixed feelings", comment: "Some things are great, others are just okay. Probably won't repurchase." },
  ],
  2: [
    { title: "Not what I expected", comment: "Color and finish were noticeably different from the listing photos." },
    { title: "Some issues", comment: "Functional, but the build feels cheaper than I'd hoped at this price." },
    { title: "Just okay-ish", comment: "It works but quality control could be better. Won't be reordering." },
  ],
};

const qaBank: { q: string; a: string }[] = [
  { q: "Is this exactly as shown in the pictures?", a: "Yes — colors and styling match the listing. Lighting may vary slightly between screens." },
  { q: "How long does shipping usually take?", a: "Most orders ship within 1-2 business days and arrive in 3-5 business days domestically." },
  { q: "Is it true to size / accurate to description?", a: "Yes, this is true to size and matches the listed specs. See the size chart for exact measurements." },
  { q: "What is the return policy on this item?", a: "30-day hassle-free returns on unused items in original packaging." },
  { q: "Is this 100% authentic and brand-new?", a: "Yes — every item is sourced directly from authorized channels and shipped brand-new in original packaging." },
  { q: "Does it come with a warranty?", a: "Yes, this product is covered by the manufacturer's standard warranty against defects." },
];

// Stable PRNG so the same product always produces the same ratings.
function fnv1a(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function makeRand(seed: number): () => number {
  let x = seed || 1;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 0xffffffff;
  };
}

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

  const allProducts = [...products, ...bonusProducts];
  for (const p of allProducts) {
    p.images = enrichImages(p);
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

  console.log(`✅ Products seeded (created: ${created}, updated: ${updated}, total: ${allProducts.length})`);
}

// ---------------------------------------------------------------
// Customers — used as authors of reviews and Q&A
// ---------------------------------------------------------------

async function seedCustomers(): Promise<string[]> {
  const ids: string[] = [];
  for (const c of customers) {
    let user = await prisma.user.findUnique({ where: { email: c.email } });
    if (!user) {
      try {
        const signup = await auth.api.signUpEmail({
          body: {
            email: c.email,
            password: c.password,
            name: c.name,
            role: Role.CUSTOMER,
            rememberMe: false,
          },
        });
        user = await prisma.user.findUnique({ where: { id: signup.user.id } });
      } catch (err) {
        console.error(`  ! Failed signing up ${c.email}:`, (err as Error).message);
        continue;
      }
    }
    if (!user) continue;
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, role: Role.CUSTOMER, status: UserStatus.ACTIVE },
    });
    // Ensure a Customer profile row exists so the user can review.
    await prisma.customer.upsert({
      where: { userId: user.id },
      update: { fullName: c.name, email: c.email },
      create: { userId: user.id, fullName: c.name, email: c.email },
    });
    ids.push(user.id);
  }
  console.log(`✅ Customers seeded (${ids.length})`);
  return ids;
}

// ---------------------------------------------------------------
// Reviews + Q&A — generated deterministically per product
// ---------------------------------------------------------------

async function seedReviewsAndQuestions(customerIds: string[]) {
  if (customerIds.length === 0) {
    console.warn("  ! No customers available — skipping reviews & Q&A.");
    return;
  }

  const allDbProducts = await prisma.product.findMany({
    where: { isDeleted: false },
    select: { id: true, slug: true, name: true, sellerId: true },
  });

  // Cache seller user-ids so seller "official" answers come from the seller account.
  const sellerUserCache = new Map<string, string>();
  async function sellerUserId(sellerId: string): Promise<string | null> {
    const cached = sellerUserCache.get(sellerId);
    if (cached) return cached;
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { userId: true },
    });
    if (!seller) return null;
    sellerUserCache.set(sellerId, seller.userId);
    return seller.userId;
  }

  let reviewsCreated = 0;
  let questionsCreated = 0;
  let answersCreated = 0;

  for (const product of allDbProducts) {
    const seed = fnv1a(product.slug);
    const rand = makeRand(seed);

    // ----- Reviews -----
    // 3..7 reviews per product, varied ratings 2..5 (weighted toward 4-5).
    const reviewCount = 3 + Math.floor(rand() * 5); // 3..7
    const ratingPool: (2 | 3 | 4 | 5)[] = [5, 5, 5, 4, 4, 4, 3, 5, 4, 2, 5, 4];
    // Always guarantee at least one of each common rating across the catalog
    // by rotating the pool start using the seed.
    const start = seed % ratingPool.length;
    const userOrder = [...customerIds].sort(() => (rand() < 0.5 ? -1 : 1));

    for (let i = 0; i < reviewCount && i < userOrder.length; i++) {
      const userId = userOrder[i];
      const rating = ratingPool[(start + i) % ratingPool.length];
      const tpl = reviewBank[rating][i % reviewBank[rating].length];

      const existing = await prisma.review.findFirst({
        where: { productId: product.id, userId },
        select: { id: true },
      });
      if (existing) continue;

      try {
        await prisma.review.create({
          data: {
            productId: product.id,
            userId,
            rating,
            title: tpl.title,
            comment: tpl.comment,
            status: "APPROVED",
            helpfulCount: Math.floor(rand() * 30),
          },
        });
        reviewsCreated += 1;
      } catch {
        /* ignore unique-constraint clashes from re-runs */
      }
    }

    // ----- Q&A -----
    // 1..3 questions per product, each with one answer (often official).
    const qCount = 1 + Math.floor(rand() * 3); // 1..3
    const sellerUid = await sellerUserId(product.sellerId);

    for (let i = 0; i < qCount; i++) {
      const tpl = qaBank[(start + i) % qaBank.length];
      const askerId = userOrder[(i + 1) % userOrder.length];

      // Idempotency: skip if an identical question already exists.
      const dupe = await prisma.productQuestion.findFirst({
        where: { productId: product.id, userId: askerId, question: tpl.q },
        select: { id: true },
      });
      if (dupe) continue;

      const isOfficial = rand() > 0.3 && !!sellerUid;
      const answererId = isOfficial && sellerUid ? sellerUid : userOrder[(i + 2) % userOrder.length];

      const created = await prisma.productQuestion.create({
        data: {
          productId: product.id,
          userId: askerId,
          question: tpl.q,
          isAnswered: true,
          answers: {
            create: [
              {
                userId: answererId,
                answer: tpl.a,
                isOfficial,
              },
            ],
          },
        },
      });
      void created;
      questionsCreated += 1;
      answersCreated += 1;
    }
  }

  console.log(
    `✅ Reviews seeded (${reviewsCreated}); Q&A seeded (${questionsCreated} questions, ${answersCreated} answers)`,
  );
}

// Recompute denormalised review aggregates on each product.
async function recomputeProductAggregates() {
  const all = await prisma.product.findMany({ select: { id: true } });
  for (const { id } of all) {
    const agg = await prisma.review.aggregate({
      where: { productId: id, status: "APPROVED" },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const avg = agg._avg.rating;
    await prisma.product.update({
      where: { id },
      data: {
        avgRating: avg != null ? Number(avg.toFixed(2)) : null,
        reviewCount: agg._count._all,
      },
    });
  }
  console.log(`✅ Product review aggregates recomputed (${all.length} products)`);
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
  const customerIds = await seedCustomers();
  await seedReviewsAndQuestions(customerIds);
  await recomputeProductAggregates();
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
