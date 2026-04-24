import { z } from 'zod'

const SUPPORTED_LANGUAGES = [
  'HINGLISH', 'HINDI', 'ENGLISH',
  'MARATHI', 'GUJARATI', 'TAMIL',
  'TELUGU', 'KANNADA'
] as const

export const languageSchema = z.enum(SUPPORTED_LANGUAGES).default('HINGLISH')

export const updateLanguageSchema = z.object({
  language: languageSchema,
})

export const festivalOffersSchema = z.object({
  festivalName: z.string().min(1).max(100),
  daysUntilFestival: z.number().int().min(0).max(90),
  shopCity: z.string().min(1),
  budget: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  language: languageSchema,
})

export const slowStockSchema = z.object({
  timeframeDays: z.number().int().min(7).max(90).default(30),
  language: languageSchema,
})

export const socialMediaSchema = z.object({
  postType: z.enum([
    'PRODUCT_LAUNCH', 'FESTIVAL_OFFER',
    'DISCOUNT_SALE', 'NEW_STOCK',
    'REPAIR_SERVICE', 'GENERAL_PROMOTION'
  ]),
  productName: z.string().max(200).optional(),
  offerDetails: z.string().max(500).optional(),
  platform: z.enum(['WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'ALL']).default('ALL'),
  tone: z.enum(['PROFESSIONAL', 'CASUAL', 'FESTIVE', 'URGENT']).default('CASUAL'),
  language: languageSchema,
})

export const monthlyStrategySchema = z.object({
  language: languageSchema,
})