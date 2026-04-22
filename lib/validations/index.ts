import { NextResponse } from 'next/server';
import { ZodSchema } from 'zod';

export const validateRequest = <T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: NextResponse } => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.map(String).join('.'),
      message: issue.message,
    }));

    return {
      success: false,
      error: NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
};

export const formatZodErrors = (issues: { path: (string | number)[]; message: string }[]) => {
  return issues.map((issue) => ({
    field: issue.path.map(String).join('.'),
    message: issue.message,
  }));
};
