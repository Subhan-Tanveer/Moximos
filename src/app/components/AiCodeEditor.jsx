import { useEffect, useRef, useState } from "react";
import { useAutoGrow } from "../utils/useAutoGrow";
import { ArrowLeft, ArrowUp, FileText, Loader2, Paperclip, Sparkles, X } from "lucide-react";
import api from "../api";

const SUGGESTIONS = [
    "Make the hero headline bigger and bolder",
    "Change the primary accent color to a deep green",
    "Add a testimonials section above the footer",
    "Make the nav links wrap better on tablet width",
];

// Accepted file types: images go through a vision model so the AI can
// actually see what's broken (a screenshot of a layout bug says more than
// any text description of it); text-ish files are inlined directly into
// the prompt as reference material (an error log, a competitor's copy, a
// CSV of data to render, etc.).
const ACCEPTED_FILE_TYPES =
    "image/png,image/jpeg,image/webp,image/gif,.txt,.md,.json,.csv,.log,.css,.js,.jsx,.ts,.tsx,.html";
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

/**
 * A chat interface for editing an existing project's code by describing the
 * change in plain English (and optionally attaching screenshots/files) —
 * wired to the same POST /api/projects/:id/chat -> reviseProject() pipeline
 * LivePreview's "Fix with AI" button uses, but for open-ended requests
 * instead of only error text.
 *
 * Two render modes:
 * - `embedded` (the normal case — see AppShell.jsx): fills whatever panel
 *   it's given (the project sidebar), with no header of its own — the
 *   surrounding page already has a back-to-projects control and the
 *   project name. This is what makes editing "live in front of the user":
 *   the chat sits directly beside the live preview, always visible while a
 *   project is open, not hidden behind a button or a separate screen.
 * - Full-screen (embedded=false): kept for any future standalone use: its
 *   own header with a back button and the project name.
 */
export default function AiCodeEditor({ project, onProjectUpdated, onClose, embedded = false }) {
    const [draft, setDraft] = useState("");
    // Chat box grows too, but capped lower — it shares a narrow sidebar.
    const draftRef = useAutoGrow(draft, 180);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [attachError, setAttachError] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);

    const messages = project.messages || [];

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages.length, sending]);

    const handleFilesSelected = async (fileList) => {
        setAttachError("");
        const incoming = Array.from(fileList || []);
        if (incoming.length === 0) return;

        if (pendingFiles.length + incoming.length > MAX_ATTACHMENTS) {
            setAttachError(`Up to ${MAX_ATTACHMENTS} files per message.`);
            return;
        }

        const oversized = incoming.find((f) => f.size > MAX_ATTACHMENT_BYTES);
        if (oversized) {
            setAttachError(`"${oversized.name}" is too large — 6MB max per file.`);
            return;
        }

        try {
            const read = await Promise.all(
                incoming.map(async (file) => {
                    const isImage = file.type.startsWith("image/");
                    const data = isImage ? await readFileAsDataUrl(file) : await readFileAsText(file);
                    return {
                        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
                        name: file.name,
                        kind: isImage ? "image" : "text",
                        mime: file.type,
                        data,
                    };
                })
            );
            setPendingFiles((prev) => [...prev, ...read]);
        } catch {
            setAttachError("Couldn't read one of those files — try again.");
        }
    };

    const removePendingFile = (id) => {
        setPendingFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const send = async (text) => {
        const trimmed = text.trim();
        if ((!trimmed && pendingFiles.length === 0) || sending) return;
        setSending(true);
        setError("");
        setAttachError("");
        setDraft("");
        const attachments = pendingFiles.map(({ id, ...rest }) => rest);
        setPendingFiles([]);
        try {
            const { data } = await api.post(`/api/projects/${project._id}/chat`, { prompt: trimmed, attachments });
            onProjectUpdated(data);
        } catch (err) {
            setError(err?.response?.data?.error || "That edit failed — try rephrasing the request.");
            setDraft(trimmed);
            setPendingFiles(attachments.map((a) => ({ ...a, id: `${a.name}-${Date.now()}-${Math.random()}` })));
        } finally {
            setSending(false);
        }
    };

    const contentMaxWidth = embedded ? "" : "mx-auto max-w-2xl";

    return (
        <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${embedded ? "" : "h-screen bg-void text-starlight"}`}>
            {!embedded && (
                <header className="flex shrink-0 items-center gap-3 border-b border-white/8 bg-abyss/70 px-4 py-3 backdrop-blur-sm">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-dust transition-colors hover:bg-white/8 hover:text-starlight"
                        aria-label="Back to project"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex min-w-0 items-center gap-2">
                        <Sparkles size={14} className="shrink-0 text-violet" />
                        <div className="min-w-0">
                            <h1 className="truncate text-[0.92rem] font-semibold text-starlight">AI Code Editor</h1>
                            <p className="truncate text-[0.72rem] text-faint">{project.name}</p>
                        </div>
                    </div>
                </header>
            )}

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
                <div className={`flex flex-col gap-4 px-4 py-5 ${contentMaxWidth}`}>
                    {messages.length === 0 && (
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                            <p className="text-[0.86rem] font-medium text-starlight">
                                Describe a change and watch the AI edit this project's real code.
                            </p>
                            <p className="mt-1.5 text-[0.78rem] leading-relaxed text-faint">
                                Attach a screenshot of a bug or a reference file with the{" "}
                                <Paperclip size={11} className="inline -translate-y-px" /> button below — the AI can
                                see it, not just read your description of it.
                            </p>
                            <div className="mt-3.5 flex flex-wrap gap-1.5">
                                {SUGGESTIONS.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setDraft(s)}
                                        className="rounded-full border border-white/12 bg-white/[0.02] px-2.5 py-1 text-[0.72rem] text-dust transition-colors hover:border-white/25 hover:text-starlight"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[0.84rem] leading-relaxed ${
                                    m.role === "user"
                                        ? "bg-violet text-white"
                                        : "border border-white/8 bg-white/[0.03] text-dust"
                                }`}
                            >
                                {m.attachments?.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-1.5">
                                        {m.attachments.map((a, j) => (
                                            <img
                                                key={j}
                                                src={a.data}
                                                alt={a.name}
                                                title={a.name}
                                                className="h-14 w-14 rounded-lg border border-white/20 object-cover"
                                            />
                                        ))}
                                    </div>
                                )}
                                {m.content}
                            </div>
                        </div>
                    ))}

                    {sending && (
                        <div className="flex justify-start">
                            <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-[0.84rem] text-faint">
                                <Loader2 size={13} className="animate-spin" />
                                Applying the change — this can take a minute or two on the free tier...
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[0.78rem] text-red-300">
                            {error}
                        </p>
                    )}
                </div>
            </div>

            <div className="shrink-0 border-t border-white/8 bg-abyss/70 px-3 py-3 backdrop-blur-sm">
                {attachError && (
                    <p className={`${contentMaxWidth} mb-2 text-[0.74rem] text-magenta`}>{attachError}</p>
                )}
                {pendingFiles.length > 0 && (
                    <div className={`${contentMaxWidth} mb-2 flex flex-wrap gap-1.5`}>
                        {pendingFiles.map((f) =>
                            f.kind === "image" ? (
                                <div key={f.id} className="group relative h-12 w-12 shrink-0">
                                    <img
                                        src={f.data}
                                        alt={f.name}
                                        title={f.name}
                                        className="h-full w-full rounded-lg border border-white/12 object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePendingFile(f.id)}
                                        aria-label={`Remove ${f.name}`}
                                        className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-abyss text-faint ring-1 ring-white/20 transition-colors hover:text-red-400"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ) : (
                                // Text files have no visual preview, so a name is the only way
                                // to tell attachments apart before sending — kept for those only.
                                <div
                                    key={f.id}
                                    className="group relative flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.03] py-1 pl-1.5 pr-2"
                                >
                                    <FileText size={13} className="shrink-0 text-faint" />
                                    <span className="max-w-[8rem] truncate text-[0.72rem] text-dust">{f.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removePendingFile(f.id)}
                                        aria-label={`Remove ${f.name}`}
                                        className="text-faint transition-colors hover:text-red-400"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            )
                        )}
                    </div>
                )}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        send(draft);
                    }}
                    className={contentMaxWidth}
                >
                    <div className="glass-panel flex items-end gap-1.5 rounded-2xl p-2 transition-colors duration-300 focus-within:border-violet/50">
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={ACCEPTED_FILE_TYPES}
                            className="hidden"
                            onChange={(e) => {
                                handleFilesSelected(e.target.files);
                                e.target.value = "";
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sending}
                            title="Attach a screenshot or file"
                            aria-label="Attach a screenshot or file"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:bg-white/8 hover:text-starlight disabled:opacity-50"
                        >
                            <Paperclip size={15} />
                        </button>
                        <textarea
                            ref={draftRef}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    send(draft);
                                }
                            }}
                            placeholder="Describe the change you want..."
                            rows={2}
                            disabled={sending}
                            className="w-full resize-none border-0 bg-transparent px-1.5 py-1 text-[0.86rem] text-starlight placeholder:text-faint focus:outline-none disabled:opacity-60"
                        />
                        <button
                            type="submit"
                            disabled={(!draft.trim() && pendingFiles.length === 0) || sending}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-solar text-void transition-opacity hover:opacity-90 disabled:opacity-30"
                            aria-label="Send"
                        >
                            {sending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
