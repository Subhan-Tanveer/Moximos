// Fix double-escaped newlines/quotes from AI JSON string output
export function normalizeContent(content) {
    if (!content) return "";

    // Remove BOM if present
    if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
    }

    // Some models (seen consistently on NVIDIA NIM's multilingual-trained
    // models) substitute visually-similar non-ASCII punctuation for plain
    // ASCII in generated code — Arabic semicolon ؛ instead of ;, fullwidth
    // ； ， ： instead of ; , : — which is invisible in a code review but a
    // hard syntax error to any JS parser. The "Fullwidth Forms" Unicode
    // block (U+FF01–U+FF5E) mirrors ASCII 0x21–0x7E at a fixed offset, so
    // the whole block converts in one pass; a few Arabic punctuation
    // lookalikes outside that block are handled individually.
    content = content.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
    content = content.replace(/؛/g, ";").replace(/،/g, ",").replace(/؟/g, "?");
    // Smart/curly quotes are a second common substitution — also a hard
    // syntax error inside a JS string literal or JSX attribute.
    content = content.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

    // Numeric character references standing in for real formatting.
    // Confirmed live on a real generated project: the entire index.html
    // arrived as ONE 7,828-character line with a literal "&#10;" at every
    // point a newline belonged. It renders (a browser decodes &#10; to
    // whitespace) which is exactly why it slipped through — but the file is
    // unreadable, undiffable, and unpatchable, and every search/replace
    // revision against it has to match inside one enormous line, which is
    // how a single bad edit corrupts the whole document.
    //
    // Only whitespace references are decoded here — &#10; (LF), &#13; (CR),
    // &#9; (tab), and their hex forms. Content entities (&amp; &lt; &gt;
    // &quot; &nbsp;) are deliberately left alone: those are legitimate,
    // often REQUIRED markup, and decoding them would corrupt valid HTML.
    content = content.replace(/&#(?:0*10|x0*a);/gi, "\n");
    content = content.replace(/&#(?:0*13|x0*d);/gi, "");
    content = content.replace(/&#(?:0*9|x0*9);/gi, "\t");

    // Normalize \r\n to \n
    content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const realNewlines = (content.match(/\n/g) || []).length;
    const literalBackslashN = (content.match(/\\n/g) || []).length;

    if (literalBackslashN > realNewlines) {
        // Triple-escaped first: \\\\n → \\n (leave as literal), then \\n → \n
        content = content
            .replace(/\\\\n/g, "%%PRESERVED_ESCAPED_N%%")
            .replace(/\\n/g, "\n")
            .replace(/%%PRESERVED_ESCAPED_N%%/g, "\\n")
            .replace(/\\t/g, "\t")
            .replace(/\\r/g, "")
            .replace(/\\\\/g, "\\");
    }

    // Always clean up backslash-escaped quotes (e.g. className=\"relative\") in code.
    // This is safe because "contains escaped quotes" is always invalid syntax in JSX/React.
    content = content.replace(/(\w+)=\\"([^"]*?)\\"/g, '$1="$2"');

    // Stray backslashes immediately before a tag.
    //
    // Measured on a real generated page: 37 of them, e.g.
    //   <a href="#menu" class="nav-link">Menu\</a>
    //   <i class="fa-solid fa-bars"\</i>
    // A backslash is never valid immediately before "<" in markup, and it
    // isn't meaningful there in JS either, so this is always a leftover
    // escaping artifact — but it renders as a visible "\" in the page text,
    // which is exactly how it reached a user's screen.
    //
    // The two forms mean different things and are repaired separately:
    //   1. quote + \ + "</"  — the backslash replaced the ">" that should
    //      have closed the opening tag, so the element never closes.
    //   2. anything else + \< — a purely spurious backslash to drop.
    // Order matters: the specific case must run before the general one.
    content = content.replace(/(["'])\\(<\/)/g, "$1>$2");
    content = content.replace(/\\(<)/g, "$1");

    // Escaped apostrophes/quotes left in PROSE. Seen live as a heading
    // reading `Chef\'s Special` on a rendered page: the model escaped the
    // apostrophe as it would inside a JS string literal, but this text sits
    // in markup, where the backslash is just a visible character.
    //
    // Scoped to text between tags (">...<") so genuine escapes inside real
    // JS string literals — where \' and \" ARE meaningful — are untouched.
    content = content.replace(/>([^<]*)</g, (match, text) =>
        text.includes("\\") ? ">" + text.replace(/\\(['"])/g, "$1") + "<" : match
    );

    return content;
}
