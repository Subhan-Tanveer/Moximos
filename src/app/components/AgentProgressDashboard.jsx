import { CheckCircle2Icon, CircleIcon, Loader2Icon } from "lucide-react";

const STAGE_COPY = {
    planning: ["Planning Architecture...", "Deciding which files this site needs"],
    building: ["AI Agent is Building...", "Writing production-ready React codebase"],
    animating: ["Adding Motion...", "A second pass adding scroll reveals and micro-interactions"],
    reviewing: ["Running QA Review...", "A senior-reviewer pass checking for real bugs before it ships"],
    verifying: ["Verifying...", "Checking every file actually parses and every import is a real package"],
};

export default function AgentProgressDashboard({ project }) {
    const planned = project.filesPlanned || [];
    const completed = project.filesGenerated || [];
    // An array, not a single path — files generate with real concurrency
    // (see MAX_CONCURRENCY in ai.js), so more than one can be genuinely
    // active at once and the checklist should show all of them as such.
    const currentFiles = project.currentFiles || [];
    const isFailed = project.status === "failed";
    const [heading, subheading] = STAGE_COPY[project.stage] || STAGE_COPY.building;

    return (
        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto p-6 md:p-12">
            <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[520px] max-w-[85vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[100px]"
                style={{
                    background: isFailed
                        ? "radial-gradient(circle, rgba(194,63,219,0.7) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(139,92,246,0.75) 0%, rgba(76,224,255,0.25) 45%, transparent 70%)",
                }}
                aria-hidden="true"
            />

            <div className="glass-panel relative w-full max-w-xl overflow-hidden rounded-2xl p-6 md:p-8">
                {/* Status Header */}
                <div className="mb-6 flex items-center gap-4">
                    <div>
                        <h2 className="text-base font-medium text-starlight">
                            {isFailed ? "Generation Failed" : heading}
                        </h2>
                        <p className="mt-0.5 text-xs text-faint">
                            {isFailed ? "An error occurred during build" : subheading}
                        </p>
                    </div>
                </div>

                {isFailed && project.error && (
                    <div className="mb-6 rounded-lg border border-magenta/30 bg-magenta/10 p-4 text-sm font-medium text-magenta">
                        Error: {project.error}
                    </div>
                )}

                {/* Progress bar */}
                {planned.length > 0 && !isFailed && (
                    <div className="mb-6">
                        <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-faint">
                            <span>Progress</span>
                            <span>{Math.round((completed.length / planned.length) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-ion to-violet transition-all duration-500 ease-out"
                                style={{ width: `${(completed.length / planned.length) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Files checklist */}
                {planned.length > 0 ? (
                    <div>
                        <span className="mb-3 block text-[10px] font-semibold uppercase tracking-widest text-faint">
                            Planned Files ({completed.length}/{planned.length})
                        </span>
                        <div className="max-h-75 space-y-2.5 overflow-y-auto pr-1">
                            {planned.map((file) => {
                                const isCompleted = completed.includes(file.path);
                                const isGenerating = currentFiles.includes(file.path);

                                return (
                                    <div
                                        key={file.path}
                                        className={`flex items-center gap-3 rounded-lg border p-2.5 transition-all ${
                                            isGenerating
                                                ? "border-violet/35 bg-violet/8"
                                                : isCompleted
                                                  ? "border-white/8 bg-white/[0.02]"
                                                  : "border-white/6 bg-white/[0.01] opacity-60"
                                        }`}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2Icon size={16} className="shrink-0 text-ion" />
                                        ) : isGenerating ? (
                                            <Loader2Icon size={16} className="shrink-0 animate-spin text-violet" />
                                        ) : (
                                            <CircleIcon size={16} className="shrink-0 text-faint/50" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className={`truncate font-mono text-xs font-medium ${
                                                    isGenerating ? "text-starlight" : "text-dust"
                                                }`}
                                            >
                                                {file.path}
                                            </p>
                                            <p className="mt-0.5 truncate text-[10px] text-faint">
                                                {file.description}
                                            </p>
                                        </div>
                                        {isGenerating && (
                                            <span className="animate-pulse whitespace-nowrap rounded bg-violet/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    !isFailed && (
                        <div className="flex flex-col items-center justify-center py-6 text-faint">
                            <Loader2Icon size={24} className="mb-2 animate-spin text-violet" />
                            <p className="text-xs">Analyzing requirements and designing project structure...</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
