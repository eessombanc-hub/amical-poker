import { splitWithGlossary } from "@/lib/glossary";

/**
 * Affiche un paragraphe en soulignant les termes techniques reconnus
 * (voir lib/glossary.ts) avec leur définition au survol — sans avoir à
 * ouvrir l'article "Lexique du poker" à côté. Désactivable via `disabled`
 * (utilisé sur l'article lexique lui-même, pour éviter les liens circulaires).
 */
export default function GlossaryText({
  text,
  disabled = false,
}: {
  text: string;
  disabled?: boolean;
}) {
  if (disabled) return <>{text}</>;

  const segments = splitWithGlossary(text);
  return (
    <>
      {segments.map((seg, i) =>
        seg.definition ? (
          <abbr
            key={i}
            title={seg.definition}
            className="underline decoration-dotted decoration-sage underline-offset-2 cursor-help"
          >
            {seg.text}
          </abbr>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}
