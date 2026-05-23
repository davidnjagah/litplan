#!/usr/bin/env bash
# LitPlanz — markdown to PDF converter (for App Store review notes etc.)
#
# Uses Python's `markdown` package to render Markdown → styled HTML, then
# uses AppKit's NSPrintOperation (via inline Swift) to convert HTML → PDF.
# All built into macOS — no Homebrew or external dependencies needed.
#
# Usage:
#   tools/md-to-pdf.sh INPUT.md OUTPUT.pdf
#
# Example:
#   tools/md-to-pdf.sh \
#     app-store/review-notes-v2.1.md \
#     app-store/pdf/review-notes-v2.1.pdf

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 INPUT.md OUTPUT.pdf" >&2
  exit 1
fi

INPUT="$1"
OUTPUT="$2"

if [[ ! -f "$INPUT" ]]; then
  echo "❌ Input not found: $INPUT" >&2
  exit 1
fi

# Ensure output directory exists
mkdir -p "$(dirname "$OUTPUT")"

# Temp files
TMP_HTML="$(mktemp -t mdtopdf).html"
TMP_SWIFT="$(mktemp -t mdtopdf).swift"
trap 'rm -f "$TMP_HTML" "$TMP_SWIFT"' EXIT

# Step 1 — render Markdown → styled HTML
INPUT="$INPUT" TMP_HTML="$TMP_HTML" python3 - <<'PY'
import os, markdown
md = open(os.environ['INPUT']).read()
body = markdown.markdown(md, extensions=['tables', 'fenced_code', 'attr_list'])
template = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 60px 50px; }}
body {{ font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
       font-size: 11.5pt; line-height: 1.55; color: #222; max-width: 720px; margin: 0 auto; }}
h1 {{ font-size: 22pt; margin-top: 0; color: #111; border-bottom: 2px solid #4a4a4a; padding-bottom: 8px; }}
h2 {{ font-size: 15pt; margin-top: 28px; color: #1a1a1a; border-bottom: 1px solid #ddd; padding-bottom: 4px; }}
h3 {{ font-size: 12.5pt; margin-top: 20px; color: #2a2a2a; }}
p, li {{ font-size: 11.5pt; }}
code {{ background: #f3f3f3; padding: 1px 5px; border-radius: 3px; font-size: 10.5pt;
       font-family: "SF Mono", Menlo, Consolas, monospace; }}
pre code {{ display: block; padding: 10px; }}
blockquote {{ border-left: 3px solid #aaa; padding: 4px 14px; margin: 12px 0;
             background: #f7f7f7; color: #555; font-size: 11pt; }}
table {{ border-collapse: collapse; margin: 10px 0; width: 100%; font-size: 10.5pt; }}
th, td {{ border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: top; }}
th {{ background: #f0f0f0; font-weight: 600; }}
hr {{ border: none; border-top: 1px solid #e0e0e0; margin: 22px 0; }}
ul, ol {{ padding-left: 22px; }}
a {{ color: #1d4ed8; text-decoration: none; }}
strong {{ color: #111; }}
</style></head><body>
{body}
</body></html>
"""
open(os.environ['TMP_HTML'], 'w').write(template)
PY

# Step 2 — HTML → PDF via AppKit NSPrintOperation
cat > "$TMP_SWIFT" <<'SWIFT'
import AppKit
import Foundation
let inputPath = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]
guard let html = try? String(contentsOfFile: inputPath, encoding: .utf8),
      let data = html.data(using: .utf8) else { exit(1) }
var docAttrs: NSDictionary? = nil
guard let attr = NSAttributedString(
    html: data,
    options: [.documentType: NSAttributedString.DocumentType.html,
              .characterEncoding: String.Encoding.utf8.rawValue],
    documentAttributes: &docAttrs) else { exit(1) }
let pageSize = NSSize(width: 612, height: 792)
let margin: CGFloat = 50
let textWidth = pageSize.width - margin * 2
let textView = NSTextView(frame: NSRect(x: 0, y: 0, width: textWidth, height: 100))
textView.textContainer?.containerSize = NSSize(width: textWidth, height: .greatestFiniteMagnitude)
textView.textContainer?.widthTracksTextView = true
textView.isHorizontallyResizable = false
textView.isVerticallyResizable = true
textView.autoresizingMask = [.width]
textView.textStorage?.setAttributedString(attr)
textView.layoutManager?.ensureLayout(for: textView.textContainer!)
let h = textView.layoutManager!.usedRect(for: textView.textContainer!).size.height
textView.frame = NSRect(x: 0, y: 0, width: textWidth, height: h)
let info = NSPrintInfo()
info.paperSize = pageSize
info.topMargin = margin; info.bottomMargin = margin
info.leftMargin = margin; info.rightMargin = margin
info.horizontalPagination = .fit
info.verticalPagination = .automatic
info.jobDisposition = .save
info.dictionary()[NSPrintInfo.AttributeKey.jobSavingURL] = URL(fileURLWithPath: outputPath)
let op = NSPrintOperation(view: textView, printInfo: info)
op.showsPrintPanel = false; op.showsProgressPanel = false
exit(op.run() ? 0 : 1)
SWIFT

swift "$TMP_SWIFT" "$TMP_HTML" "$OUTPUT" 2>/dev/null
echo "✅ Wrote $OUTPUT"
