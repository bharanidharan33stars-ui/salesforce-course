import { z } from "zod";

/**
 * Shared request schemas.
 * The frontend mirrors these rules (src/lib/validators.ts) for fast feedback,
 * but the backend is the only place where validation is authoritative.
 */

const email = z
  .string()
  .trim()
  .min(5, "Enter a valid e-mail address.")
  .max(190, "E-mail address is too long.")
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Enter a valid e-mail address.");

export const passwordPolicy = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.")
  .refine((v) => /[A-Za-z]/.test(v), "Password must contain at least one letter.")
  .refine((v) => /[0-9]/.test(v), "Password must contain at least one number.");

const fullName = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(150, "Name is too long.")
  .refine((v) => /^[A-Za-zÀ-ÿ' .-]+$/.test(v), "Name may only contain letters, spaces, hyphens and apostrophes.");

export const registerSchema = z.object({
  fullName,
  email,
  password: passwordPolicy,
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, { message: "You must accept the terms and privacy policy." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128),
  remember: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "This reset link is not valid."),
  password: passwordPolicy,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const verifyEmailSchema = z.object({ token: z.string().min(10) });

export const courseSlugParam = z.object({ courseSlug: z.string().min(1).max(190) });
export const unitSlugParam = z.object({
  unitSlug: z.string().min(1).max(190),
  lessonSlug: z.string().min(1).max(190).optional(),
});
export const lessonSlugParam = z.object({
  unitSlug: z.string().min(1).max(190),
  lessonSlug: z.string().min(1).max(190),
});
export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const quizSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.coerce.number().int().positive(),
        optionIds: z.array(z.coerce.number().int().positive()).max(10),
      }),
    )
    .min(1, "Answer at least one question before submitting.")
    .max(100),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  sort: z.enum(["newest", "name", "progress"]).optional(),
  status: z.string().max(30).optional(),
});

// ------------------------------------------------------------ admin input

const slug = z
  .string()
  .trim()
  .min(2)
  .max(190)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.");

export const adminCourseSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug,
  description: z.string().trim().max(5000).nullable().optional().default(null),
  published: z.boolean().default(false),
});

export const adminUnitSchema = z.object({
  courseId: z.coerce.number().int().positive(),
  title: z.string().trim().min(3).max(200),
  slug,
  description: z.string().trim().max(5000).nullable().optional().default(null),
  sortOrder: z.coerce.number().int().min(0).default(0),
  published: z.boolean().default(false),
});

const resourceUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Resources must be http(s) URLs.")
  .nullable()
  .optional()
  .default(null);

export const adminLessonSchema = z.object({
  unitId: z.coerce.number().int().positive(),
  title: z.string().trim().min(3).max(200),
  slug,
  summary: z.string().trim().max(500).nullable().optional().default(null),
  content: z.string().max(200_000).nullable().optional().default(null),
  contentType: z.enum(["article", "video", "code", "document"]).default("article"),
  resourceUrl,
  isRequired: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
  published: z.boolean().default(false),
});

export const adminQuizSchema = z.object({
  unitId: z.coerce.number().int().positive(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).nullable().optional().default(null),
  passingPercentage: z.coerce.number().int().min(1).max(100).default(70),
  maxAttempts: z.coerce.number().int().min(1).max(20).default(3),
  published: z.boolean().default(false),
  isRequired: z.boolean().default(true),
});

export const adminQuestionSchema = z.object({
  questionText: z.string().trim().min(5).max(2000),
  questionType: z.enum(["multiple_choice", "true_false", "multiple_select"]).default("multiple_choice"),
  explanation: z.string().trim().max(2000).nullable().optional().default(null),
  sortOrder: z.coerce.number().int().min(0).default(0),
  options: z
    .array(
      z.object({
        optionText: z.string().trim().min(1).max(500),
        isCorrect: z.boolean(),
      }),
    )
    .min(2, "A question needs at least two options.")
    .max(10),
}).refine((data) => data.options.some((o) => o.isCorrect), {
  message: "Mark at least one option as correct.",
  path: ["options"],
}).refine(
  (data) => {
    if (data.questionType === "true_false") return data.options.length === 2;
    return true;
  },
  { message: "True/false questions must have exactly two options.", path: ["options"] },
);

export const adminSettingsSchema = z.object({
  academy_name: z.string().trim().min(2).max(150),
  academy_logo_text: z.string().trim().min(1).max(6),
  // Deliberately looser than .email(): the shipped default for local setups is
  // "support@localhost", which RFC-style email patterns reject (no dot in the
  // domain) - admins must be able to save the default value unchanged.
  support_email: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .refine((v) => /^[^\s@]+@[^\s@]+$/.test(v), "Enter a valid e-mail address."),
  course_title: z.string().trim().min(2).max(200),
  certificate_signer: z.string().trim().min(2).max(150),
  certificate_footer_note: z.string().trim().max(300),
  lesson_completion_rule: z.enum(["manual", "auto"]),
  require_email_verification_for_certificate: z.enum(["true", "false"]),
  email_verification_required_for_login: z.enum(["true", "false"]),
  quiz_default_passing_percentage: z.string().regex(/^\d{1,3}$/).refine((v) => Number(v) >= 1 && Number(v) <= 100, "Must be between 1 and 100."),
  ai_assistant_enabled: z.enum(["true", "false"]),
});

export const adminStudentActionSchema = z.object({
  status: z.enum(["active", "disabled"]),
});
