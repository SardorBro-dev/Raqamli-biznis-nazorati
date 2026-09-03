import { useState } from "react";
import { useNavigate } from "react-router-dom";

function CreateCompany() {
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [directorName, setDirectorName] = useState("");

  // Hozircha demo uchun Pro tarif
  const plan = "Pro";
  const maxEmployees = 50;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!companyName || !employeeCount || !directorName) {
      alert("Barcha maydonlarni to‘ldiring!");
      return;
    }

    if (Number(employeeCount) > maxEmployees) {
      alert(`Sizning tarifingizda maksimal ${maxEmployees} ta xodim bo‘lishi mumkin.`);
      return;
    }

    const company = {
      id: Date.now(),
      name: companyName,
      employees: Number(employeeCount),
      director: directorName,
      plan: plan,
      createdAt: new Date().toISOString(),
    };

    // Hozircha brauzer xotirasiga saqlaymiz
    const oldCompanies =
      JSON.parse(localStorage.getItem("companies")) || [];

    localStorage.setItem(
      "companies",
      JSON.stringify([...oldCompanies, company])
    );

    navigate("/dashboard");
  };

  return (
    <div className="create-company-page">

      <div className="create-company-container">

        <div className="create-company-card">

          <div className="create-company-header">
            <h1>Yangi kompaniya yaratish</h1>

            <p>
              Kompaniyangiz haqida asosiy ma'lumotlarni kiriting.
            </p>
          </div>

          <form
            className="company-form"
            onSubmit={handleSubmit}
          >

            <div className="form-field">
              <label>
                Kompaniya nomi
              </label>

              <input
                type="text"
                placeholder="Masalan: Digital Company"
                value={companyName}
                onChange={(e) =>
                  setCompanyName(e.target.value)
                }
              />
            </div>


            <div className="form-row">

              <div className="form-field">
                <label>
                  Kompaniya boshlig‘i
                </label>

                <input
                  type="text"
                  placeholder="Ism Familiya"
                  value={directorName}
                  onChange={(e) =>
                    setDirectorName(e.target.value)
                  }
                />
              </div>


              <div className="form-field">
                <label>
                  Xodimlar soni
                </label>

                <input
                  type="number"
                  min="1"
                  max={maxEmployees}
                  placeholder={`1-${maxEmployees}`}
                  value={employeeCount}
                  onChange={(e) =>
                    setEmployeeCount(e.target.value)
                  }
                />
              </div>

            </div>


            <div className="selected-plan">

              <div>
                <span>Tanlangan tarif</span>

                <strong>
                  {plan}
                </strong>
              </div>

              <div>
                <span>Oylik to‘lov</span>

                <strong>
                  200 000 so‘m
                </strong>
              </div>

              <div>
                <span>Limit</span>

                <strong>
                  {maxEmployees} xodim
                </strong>
              </div>

            </div>


            <button
              type="submit"
              className="company-submit"
            >
              Kompaniyani yaratish
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}

export default CreateCompany;