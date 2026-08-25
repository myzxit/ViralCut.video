import { z } from 'zod';
import {
  MAX_TARGET_MINUTES,
  MIN_TARGET_MINUTES,
} from '@/lib/reconstruct-plan';
import { isLikelyVideoUrl } from '@/lib/video-url';

export const aspectRatios = ['9:16', '1:1', '16:9'] as const;
export const captionStyles = ['clean', 'bold', 'outline', 'boxed'] as const;
export const speechRates = ['slow', 'normal', 'fast'] as const;

export const createProjectSchema = z
  .object({
    mode: z.enum(['SHORTS', 'RECONSTRUCT']),
    sourceUrl: z.string().trim().optional(),
    /** Set by the upload route after a file lands on disk. */
    uploadPath: z.string().trim().optional(),
    title: z.string().trim().max(120).optional(),

    targetMinutes: z.coerce
      .number()
      .int()
      .min(MIN_TARGET_MINUTES)
      .max(MAX_TARGET_MINUTES)
      .optional(),
    voiceId: z.string().trim().max(64).optional(),
    speechRate: z.enum(speechRates).optional(),
    captionStyle: z.enum(captionStyles).optional(),
    aspectRatio: z.enum(aspectRatios).default('9:16'),
    language: z.string().trim().min(2).max(8).default('ko'),
  })
  .refine((value) => Boolean(value.sourceUrl) !== Boolean(value.uploadPath), {
    message: '영상 주소 또는 업로드 파일 중 하나만 지정해야 합니다.',
    path: ['sourceUrl'],
  })
  .refine((value) => !value.sourceUrl || isLikelyVideoUrl(value.sourceUrl), {
    message: '지원하지 않는 영상 주소입니다.',
    path: ['sourceUrl'],
  })
  .refine(
    (value) => value.mode !== 'RECONSTRUCT' || value.targetMinutes !== undefined,
    {
      message: '재구성은 결과물 길이를 지정해야 합니다.',
      path: ['targetMinutes'],
    },
  );

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
