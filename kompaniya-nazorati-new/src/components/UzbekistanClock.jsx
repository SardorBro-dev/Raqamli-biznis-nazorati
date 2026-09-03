import { useEffect, useState } from "react";

function formatUzbekistanTime() {
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function UzbekistanClock() {
  const [time, setTime] = useState(formatUzbekistanTime);

  useEffect(() => {
    const timer = window.setInterval(() => setTime(formatUzbekistanTime()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="uzbekistan-clock" aria-label={`O'zbekiston vaqti ${time}`}>
      <span className="uzbekistan-clock-label" aria-hidden="true"><span className="uzbekistan-clock-center" /></span>
      <strong>{time}</strong>
    </div>
  );
}

export default UzbekistanClock;
