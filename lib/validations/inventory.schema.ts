import { z } from 'zod';

export const createProductSchema = z.object({
  brandName: z.string().min(1, 'Brand name is required').max(100),
  name: z.string().min(1, 'Product name is required').max(200),
  category: z.enum(['MOBILE', 'ACCESSORY']),
  accessoryType: z.string().max(100).optional(),
  purchasePrice: z.number().positive('Purchase price must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  initialStock: z.number().int().min(0).default(0),
  lowStockAlertQty: z.number().int().min(0).default(5),
  shopId: z.string().uuid('Invalid shop ID'),
})
  .refine(
    (data) => data.sellingPrice >= data.purchasePrice,
    {
      message: 'Selling price cannot be less than purchase price',
      path: ['sellingPrice'],
    }
  )
  .refine(
    (data) => !(data.category === 'ACCESSORY' && !data.accessoryType),
    {
      message: 'Accessory type is required for accessories',
      path: ['accessoryType'],
    }
  );

// Separate schema for update (can't use .omit on refined schema)
export const updateProductSchema = z.object({
  brandName: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(200).optional(),
  category: z.enum(['MOBILE', 'ACCESSORY']).optional(),
  accessoryType: z.string().max(100).optional().nullable(),
  purchasePrice: z.number().positive().optional(),
  sellingPrice: z.number().positive().optional(),
  lowStockAlertQty: z.number().int().min(0).optional(),
})
  .refine(
    (data) => !data.purchasePrice || !data.sellingPrice || data.sellingPrice >= data.purchasePrice,
    {
      message: 'Selling price cannot be less than purchase price',
      path: ['sellingPrice'],
    }
  );

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  movementType: z.enum(['PURCHASE_IN', 'RETURN', 'ADJUSTMENT']),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
  notes: z.string().min(3, 'Notes must be at least 3 characters').max(500),
})
  .refine(
    (data) => !(data.movementType === 'ADJUSTMENT' && data.notes.length < 10),
    {
      message: 'Adjustment reason must be at least 10 characters',
      path: ['notes'],
    }
  );

export const createBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(100).transform((val) => val.trim()),
  category: z.enum(['MOBILE', 'ACCESSORY', 'BOTH']),
});

export const productQuerySchema = z.object({
  category: z.enum(['MOBILE', 'ACCESSORY']).optional(),
  brandName: z.string().optional(),
  search: z.string().optional(),
  stockStatus: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).optional(),
  shopId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'stockQty', 'sellingPrice', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
