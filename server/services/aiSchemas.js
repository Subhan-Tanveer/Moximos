import { z } from "zod";


export const GenerationResultSchema = z.object({
    files: z.record(z.string(),  z.string()),
    description: z.string().default('Generated project')
})

export const FileOpSchema = z.object({
    op: z.enum(["create", "update", "delete"]),
    path: z.string(),
    content: z.string().nullable().optional(),
    search: z.string().nullable().optional(),
    replace: z.string().nullable().optional(),
})

export const RevisionResultSchema = z.object({
    operations: z.array(FileOpSchema),
    description: z.string().default('Applied revisions')
})

export const FilePlanSchema = z.object({
    files: z.array(
        z.object({
            path: z.string(),
            description: z.string(),
            exports: z.string().optional().default(""),
            imports: z.array(z.string()).optional().default([]),
        })
    ),
    projectName: z.string().default('Generated Project'),
    projectDescription: z.string().default('A React project'),
    // Picked once, up front, so every file (built now, animated later) draws
    // from the same visual direction instead of each generation call
    // guessing its own — see STYLE_ARCHETYPES in prompts.js for the options.
    styleArchetype: z.string().default('Minimal'),
    styleRationale: z.string().optional().default(''),
    // Picked once, up front, same reasoning as styleArchetype — every file
    // generated after this plan needs to already know which tech stack it's
    // writing for. See STACKS in prompts.js.
    stack: z.enum(["html", "react", "nextjs"]).default("react"),
    stackRationale: z.string().optional().default(''),
})

export const FileCodeSchema = z.object({
    code: z.string(),
})

// Animation pass: takes an already-generated file and returns it enhanced
// with motion. Same shape as FileCodeSchema deliberately — it's the same
// kind of edit, just a second pass with a narrower job.
export const AnimationPassSchema = z.object({
    code: z.string(),
})

// QA pass: a senior-reviewer read of one file. `hasChanges` lets the
// orchestrator skip re-validating/re-saving a file the reviewer left alone,
// rather than treating "no bugs found" as if code had changed.
export const QAReviewSchema = z.object({
    issues: z.array(z.string()).default([]),
    hasChanges: z.boolean().default(false),
    code: z.string(),
})

// Lead ranking: an AI opinion on a business's existing website, used only
// for the ambiguous middle band the fast heuristics can't confidently call
// either way. 0 = looks modern and professional, 100 = looks outdated and
// neglected — matching the heuristic score's scale so the two can be
// compared/substituted directly.
export const SiteQualitySchema = z.object({
    outdatedScore: z.number().min(0).max(100),
    reason: z.string(),
})
/*
 * Content plan — the schema for the section-library path.
 *
 * The model no longer returns code. It returns which sections this business
 * needs and the copy for each, and sectionLibrary.js renders them into
 * hand-written, responsive markup. Layout stops being something a 30B model
 * improvises per request (measured failure: a services grid whose cards came
 * out ~100px wide, one word per line) and becomes something a human wrote
 * once.
 *
 * Fields are shared across section types rather than split into a union:
 * strict json_schema mode dislikes discriminated unions, and unused fields
 * simply go unrendered by the template that receives them.
 */
const LinkSchema = z.object({ label: z.string(), href: z.string() });

const SectionItemSchema = z.object({
    title: z.string().optional(),
    body: z.string().optional(),
    meta: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    value: z.string().optional(),
    label: z.string().optional(),
});

export const ContentPlanSchema = z.object({
    brand: z.string().describe("The business name exactly as it should appear"),
    title: z.string().describe("<title> text"),
    metaDescription: z.string(),
    styleArchetype: z.enum(["Luxury", "Minimal", "Bold", "Organic", "Corporate", "Playful", "Editorial", "Futuristic"]),
    sections: z.array(
        z.object({
            type: z.enum(["nav", "heroImage", "heroSplit", "heroEditorial", "artBand", "numberedList", "marquee", "gallery", "process", "faq", "stats", "cardGrid", "split", "testimonial", "ctaBand", "footer"]),
            id: z.string().optional(),
            variant: z.string().optional(),
            hours: z.string().optional(),
            serviceAreas: z.array(z.string()).optional(),
            brand: z.string().optional(),
            eyebrow: z.string().optional(),
            title: z.string().optional(),
            subtitle: z.string().optional(),
            titleAccent: z.string().optional(),
            caption: z.string().optional(),
            separator: z.string().optional(),
            meta: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
            texts: z.array(z.string()).optional(),
            intro: z.string().optional(),
            tagline: z.string().optional(),
            body: z.array(z.string()).optional(),
            image: z.string().optional(),
            imageAlt: z.string().optional(),
            columns: z.number().optional(),
            reverse: z.boolean().optional(),
            quote: z.string().optional(),
            author: z.string().optional(),
            role: z.string().optional(),
            items: z.array(SectionItemSchema).optional(),
            links: z.array(LinkSchema).optional(),
            linkColumns: z.array(z.object({ title: z.string(), links: z.array(LinkSchema) })).optional(),
            social: z.array(LinkSchema).optional(),
            cta: LinkSchema.optional(),
            primaryCta: LinkSchema.optional(),
            secondaryCta: LinkSchema.optional(),
            contact: z.object({ address: z.string().optional(), phone: z.string().optional(), email: z.string().optional() }).optional(),
        })
    ),
});
