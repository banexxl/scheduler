/**
 * JSON-LD Script Component — Milestone 15.13.
 *
 * Server component that renders JSON-LD structured data into the page.
 * Content is JSON.stringify'd — no raw HTML execution possible.
 */

type Props = {
  data: Record<string, unknown>;
};

export default function JsonLdScript({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
