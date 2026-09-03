import { useNavigate } from "react-router-dom";
import CompanyLogo from "../components/CompanyLogo";
import "../App.css";

function Tariffs() {
  const navigate = useNavigate();

  const selectPlan = (plan) => {
    localStorage.setItem("selected_plan", plan);

    navigate("/create-company");
  };

  return (
    <div className="tariffs-page">

      <header className="tariffs-topbar">

        <button
          className="back-button"
          onClick={() => navigate("/dashboard")}
        >
          ←
        </button>

        <div>
          <div className="tariffs-brand">
            <CompanyLogo className="tariffs-brand-icon" />

            <div>
              <strong>Raqamli biznes nazorati</strong>
              <span>Tariflar</span>
            </div>
          </div>
        </div>

        <button
          className="tariffs-profile"
          onClick={() => navigate("/dashboard")}
        >
          Boshqaruv paneli
        </button>

      </header>


      <main className="tariffs-content">

        <div className="tariffs-heading">

          <span>
            KOMPANIYANGIZ UCHUN TARIFNI TANLANG
          </span>

          <h1>
            Biznesingizga mos
            <strong> tarifni tanlang</strong>
          </h1>

          <p>
            Kompaniyangizni yaratish va xodimlaringizni
            boshqarish uchun o‘zingizga mos tarifni tanlang.
          </p>

        </div>


        <div className="plans">

          {/* PRO */}

          <div className="plan-card">

            <div className="plan-header">

              <div className="plan-icon blue">
                ◆
              </div>

              <div>
                <span className="plan-label">
                  BOSHLANG‘ICH
                </span>

                <h2>
                  PRO
                </h2>
              </div>

            </div>

            <div className="plan-price">
              <strong>
                200 000
              </strong>

              <span>
                so‘m / oyiga
              </span>
            </div>

            <p className="plan-description">
              Kichik va o‘rta kompaniyalar uchun
              qulay boshqaruv imkoniyatlari.
            </p>

            <div className="plan-divider"></div>

            <ul className="plan-features">

              <li>
                <span>✓</span>
                1 ta kompaniya
              </li>

              <li>
                <span>✓</span>
                50 tagacha xodim
              </li>

              <li>
                <span>✓</span>
                Xodimlar nazorati
              </li>

              <li>
                <span>✓</span>
                Ish vaqtini nazorat qilish
              </li>

              <li>
                <span>✓</span>
                Kompaniya chat tizimi
              </li>

              <li>
                <span>✓</span>
                Yangiliklar bo‘limi
              </li>

            </ul>

            <button
              className="plan-button"
              onClick={() => selectPlan("pro")}
            >
              PRO tarifini tanlash
              <span>→</span>
            </button>

          </div>


          {/* PREMIUM */}

          <div className="plan-card premium">

            <div className="popular-badge">
              ENG MASHHUR
            </div>

            <div className="plan-header">

              <div className="plan-icon purple">
                ◆
              </div>

              <div>
                <span className="plan-label">
                  KENGAYTIRILGAN
                </span>

                <h2>
                  PRO PREMIUM
                </h2>
              </div>

            </div>

            <div className="plan-price">
              <strong>
                500 000
              </strong>

              <span>
                so‘m / oyiga
              </span>
            </div>

            <p className="plan-description">
              Bir nechta kompaniyani boshqaruvchi
              rahbarlar uchun keng imkoniyatlar.
            </p>

            <div className="plan-divider"></div>

            <ul className="plan-features">

              <li>
                <span>✓</span>
                5 tagacha kompaniya
              </li>

              <li>
                <span>✓</span>
                Har bir kompaniyada 300 tagacha xodim
              </li>

              <li>
                <span>✓</span>
                Xodimlar nazorati
              </li>

              <li>
                <span>✓</span>
                Ish vaqtini nazorat qilish
              </li>

              <li>
                <span>✓</span>
                Kompaniya chat tizimi
              </li>

              <li>
                <span>✓</span>
                Yangiliklar bo‘limi
              </li>

              <li>
                <span>✓</span>
                Kengaytirilgan boshqaruv
              </li>

            </ul>

            <button
              className="plan-button premium-button"
              onClick={() => selectPlan("pro_premium")}
            >
              PRO PREMIUM tanlash
              <span>→</span>
            </button>

          </div>

        </div>


        <div className="tariffs-note">

          <span>🔒</span>

          <p>
            Tarif sotib olinmaguncha kompaniya yaratish
            imkoniyati ochilmaydi. To‘lov amalga oshirilgandan
            so‘ng tanlangan tarif imkoniyatlari faollashadi.
          </p>

        </div>

      </main>

    </div>
  );
}

export default Tariffs;