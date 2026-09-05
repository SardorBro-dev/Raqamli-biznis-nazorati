import companyLogo from "../../assets/AsosiyLogo.png";

function CompanyLogo({ className = "" }) {
  return (
    <div className={`company-logo ${className}`.trim()} aria-label="Raqamli biznes nazorati logo">
      <span
        className="company-logo-image"
        aria-hidden="true"
        style={{ WebkitMaskImage: `url(${companyLogo})`, maskImage: `url(${companyLogo})` }}
      />
    </div>
  );
}

export default CompanyLogo;
