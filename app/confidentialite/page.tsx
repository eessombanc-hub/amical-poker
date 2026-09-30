export default function ConfidentialitePage() {
  return (
    <div className="px-7 py-14">
      <div className="max-w-2xl mx-auto panel">
        <h1 className="text-3xl mb-6">Confidentialité (RGPD)</h1>
        <p className="text-sage text-sm mb-4">
          L&apos;association collecte les données nécessaires à la gestion des
          membres (identité, résultats sportifs) dans le cadre de son
          activité associative.
        </p>
        <p className="text-sage text-sm mb-4">
          Chaque membre choisit d&apos;autoriser ou non la publication
          publique de ses résultats et de son classement sur ce site
          (paramètre modifiable auprès du bureau).
        </p>
        <p className="text-sage text-sm">
          Pour exercer vos droits d&apos;accès, de rectification ou de
          suppression de vos données, contactez le bureau via la page{" "}
          <a href="/contact" className="text-forest underline underline-offset-4">
            Contact
          </a>
          .
        </p>
      </div>
    </div>
  );
}
