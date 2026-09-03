function CompanyLogo({ className = "" }) {
  return (
    <div className={`company-logo ${className}`.trim()} aria-label="Raqamli biznes nazorati logo">
      <img src="/assets/AsosiyLogo.png" alt="Raqamli biznes nazorati logo" draggable="false" />
    </div>
  );
}

export default CompanyLogo;
