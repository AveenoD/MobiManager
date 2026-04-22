import { z } from 'zod';

export const saleItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().positive("Price must be positive"),
});

export const createSaleSchema = z.object({
  shopId: z.string().uuid(),
  saleDate: z.string().datetime().optional(),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string()
    .regex(/^[6-9]\d{9}$/, "Invalid phone number")
    .optional(),
  items: z.array(saleItemSchema)
    .min(1, "At least 1 item required"),
  discountAmount: z.number().min(0).default(0),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'CREDIT']),
  notes: z.string().max(500).optional(),
})
.refine(
  (data) => {
    const total = data.items.reduce(
      (sum, item) => sum + (item.qty * item.unitPrice), 0
    );
    return data.discountAmount <= total;
  },
  {
    message: "Discount cannot exceed total amount",
    path: ["discountAmount"]
  }
);

export const salesFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'CREDIT']).optional(),
  shopId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['saleDate', 'totalAmount', 'createdAt']).default('saleDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const saleCancelSchema = z.object({
  reason: z.string().min(10, "Cancellation reason must be at least 10 characters"),
});

export type SaleItemInput = z.infer<typeof saleItemSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SalesFilterInput = z.infer<typeof salesFilterSchema>;
export type SaleCancelInput = z.infer<typeof saleCancelSchema>;
