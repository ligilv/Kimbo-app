import { z } from 'zod';

// The server's reply to POST /reports/extract, checked before the app uses it.
export const reportValueSchema = z.object({
  key: z.string().min(1), // stable id for comparing reports, e.g. "vitamin_d"
  label: z.string().min(1), // "Vitamin D"
  value: z.number(),
  unit: z.string(),
  low: z.number().nullable(),
  high: z.number().nullable(),
  status: z.enum(['low', 'high', 'normal']),
  note: z.string().nullable(), // one plain-language line, flagged values only
  why: z.array(z.string()),
  foods: z.object({ veg: z.array(z.string()), nonveg: z.array(z.string()) }),
});

export const extractReportResponseSchema = z.object({
  notAReport: z.boolean(),
  takenOn: z.string().nullable(),
  values: z.array(reportValueSchema),
});

export type ReportValue = z.infer<typeof reportValueSchema>;
export type ExtractReportResponse = z.infer<typeof extractReportResponseSchema>;
