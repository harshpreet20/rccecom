import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "div", "span", "h1", "h2", "h3", "h4",
  "ul", "ol", "li",
  "strong", "em", "b", "i", "br",
  "table", "thead", "tbody", "tr", "td", "th",
  "a",
];

const ALLOWED_ATTR = ["href", "style", "class", "target", "rel"];

/**
 * Report HTML comes from Claude, which itself summarizes scraped
 * third-party captions/reviews -- so it must be treated as untrusted before
 * being rendered via dangerouslySetInnerHTML. This does the existing
 * fence-stripping/tag-extraction the report views used to do locally, then
 * runs the result through DOMPurify with a basic-formatting allowlist (no
 * script/iframe/on* attributes, no javascript: hrefs).
 */
export function sanitizeReportHtml(raw: string): string {
  let text = (raw || "").trim();
  text = text.replace(/^```(?:html)?\s*/i, "").replace(/\s*```\s*$/, "");
  const firstTag = text.indexOf("<");
  const lastTag = text.lastIndexOf(">");
  if (firstTag !== -1 && lastTag !== -1 && lastTag > firstTag) {
    text = text.substring(firstTag, lastTag + 1);
  }
  if (!text.startsWith("<")) {
    text = `<div style="font-family:-apple-system,sans-serif;font-size:14px;line-height:1.7;color:#374151;white-space:pre-wrap">${text
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</div>`;
  }

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
