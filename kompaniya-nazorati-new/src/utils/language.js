import { useEffect, useState } from "react";

export const LANGUAGE_KEY = "app_language";
const languageEvent = "app-language-change";

export const translations = {
  uz: {
    loginTitle: "Hisobingizga kiring",
    username: "Username",
    password: "Parol",
    usernamePlaceholder: "Usernameingizni kiriting",
    passwordPlaceholder: "Parolingizni kiriting",
    login: "Kirish",
    noAccount: "Hisobingiz yo'qmi?",
    register: "Ro'yxatdan o'tish",
    recover: "Hisobni tiklash",
    accountProblem: "Parol yoki hisobingiz bilan muammo bormi?",
    registerTitle: "Yangi rahbar hisobini yarating", firstName: "Ism", lastName: "Familiya", firstNamePlaceholder: "Ismingizni kiriting", lastNamePlaceholder: "Familiyangizni kiriting", confirmPassword: "Parolni tasdiqlash", confirmPasswordPlaceholder: "Parolni qayta kiriting", agreeTerms: "Foydalanish shartlari bilan roziman", creating: "Yaratilmoqda...", hasAccount: "Hisobingiz bormi?", continue: "Davom etish", recoverTitle: "Username kiriting", recoverMessage: "Tiklash jarayoni demo rejimda tayyor. Parolni qayta tiklash uchun admin bilan bog'laning.", backToLogin: "← Kirish sahifasiga qaytish", allFieldsRequired: "Barcha maydonlarni to'ldiring.", invalidEmail: "Email formati noto'g'ri.", invalidUsername: "Username faqat lotin harf, raqam va _ belgisidan iborat bo'lsin.", passwordMin: "Parol kamida 8 ta belgidan iborat bo'lishi kerak.", passwordsMismatch: "Parollar bir xil emas.", acceptTerms: "Foydalanish shartlari bilan rozilik bildiring.", language: "Til", chooseLanguage: "Tilni tanlash", home: "Bosh sahifa", createCompany: "Kompaniya yaratish", tariffs: "Tariflar", monetization: "Monetizatsiya", logout: "Chiqish", services: "XIZMATLAR", main: "ASOSIY", owner: "Rahbar", employee: "Xodim", loading: "Ma'lumotlar yuklanmoqda...", back: "← Asosiy qismga qaytish", save: "Saqlash", cancel: "Bekor qilish", close: "Yopish", dashboardLoadError: "Ma'lumotlarni yuklab bo'lmadi. Backend serverini tekshiring.", companyName: "Kompaniya nomi", director: "Kompaniya boshlig'i", industry: "Faoliyat sohasi", address: "Manzil", selectedPlan: "Tanlangan tarif", createNewCompany: "Yangi kompaniya yaratish", companyIntro: "Kompaniyangiz haqida asosiy ma'lumotlarni kiriting.", companyNamePlaceholder: "Masalan: Digital Company", directorPlaceholder: "Ism Familiya", industryPlaceholder: "Masalan: IT, Savdo", addressPlaceholder: "Shahar, ko'cha va uy", createCompanyButton: "Kompaniyani yaratish", planPaymentRequired: "Kompaniya yaratish uchun avval tarif to'lovini tasdiqlang.", companyLimit: "Kompaniya limiti oshib ketdi. Tarifni yangilang.", sessionExpired: "Sessiya muddati tugagan. Qayta kiring.", companyCreatedError: "Kompaniya yaratishda xatolik yuz berdi.", choosePlan: "KOMPANIYANGIZ UCHUN TARIFNI TANLANG", chooseBusinessPlan: "Biznesingizga mos tarifni tanlang", paymentMethod: "To'lov usuli", securePayment: "Xavfsiz to'lov", walletLink: "Hamyon linki", walletId: "Hamyon ID", openWallet: "Hamyonni ochish", copyId: "ID ni nusxalash", paid: "Men to'lov qildim", popular: "ENG MASHHUR", currentPlan: "Joriy tarif", activatePlan: "faollashtirish", monitoring: "Monitoring", overview: "📊 Umumiy", employees: "👥 Xodimlar", chat: "💬 Chat", meeting: "🎥 Live Online Majlis", news: "📰 Yangiliklar", settings: "⚙️ Sozlamalar", companyStats: "Kompaniya statistikasi", totalEmployees: "Jami xodimlar", activeEmployees: "Faol xodimlar", offline: "Oflayn", addEmployee: "+ Yangi xodim", edit: "Tahrirlash", fire: "Ishdan bo'shatish", send: "Yuborish", messagePlaceholder: "Xabar yozing...", startMeeting: "Majlisni boshlash", endMeeting: "Majlisni tugatish", live: "Jonli", notStarted: "Boshlanmagan", postNews: "Yangilikni joylash", title: "Sarlavha", description: "Izoh", uploadImage: "📷 Rasm yuklash", delete: "O'chirish", card: "Company Card", openCard: "Karta ochish", myCards: "Kartalarim",
  },
  ru: {
    loginTitle: "Войдите в аккаунт",
    username: "Имя пользователя",
    password: "Пароль",
    usernamePlaceholder: "Введите имя пользователя",
    passwordPlaceholder: "Введите пароль",
    login: "Войти",
    noAccount: "Нет аккаунта?",
    register: "Регистрация",
    recover: "Восстановить аккаунт",
    accountProblem: "Проблема с паролем или аккаунтом?",
    registerTitle: "Создайте новый аккаунт руководителя", firstName: "Имя", lastName: "Фамилия", firstNamePlaceholder: "Введите имя", lastNamePlaceholder: "Введите фамилию", confirmPassword: "Подтвердите пароль", confirmPasswordPlaceholder: "Введите пароль повторно", agreeTerms: "Я согласен с условиями использования", creating: "Создание...", hasAccount: "Уже есть аккаунт?", continue: "Продолжить", recoverTitle: "Введите имя пользователя", recoverMessage: "Восстановление доступно в демо-режиме. Обратитесь к администратору для сброса пароля.", backToLogin: "← Вернуться на страницу входа", allFieldsRequired: "Заполните все поля.", invalidEmail: "Неверный формат email.", invalidUsername: "Имя пользователя может содержать только латинские буквы, цифры и _.", passwordMin: "Пароль должен содержать не менее 8 символов.", passwordsMismatch: "Пароли не совпадают.", acceptTerms: "Примите условия использования.", language: "Язык", chooseLanguage: "Выбор языка", home: "Главная", createCompany: "Создать компанию", tariffs: "Тарифы", monetization: "Монетизация", logout: "Выйти", services: "СЕРВИСЫ", main: "ОСНОВНОЕ", owner: "Руководитель", employee: "Сотрудник", loading: "Загрузка данных...", back: "← Вернуться к основному разделу", save: "Сохранить", cancel: "Отмена", close: "Закрыть", dashboardLoadError: "Не удалось загрузить данные. Проверьте сервер backend.", companyName: "Название компании", director: "Руководитель компании", industry: "Сфера деятельности", address: "Адрес", selectedPlan: "Выбранный тариф", createNewCompany: "Создать новую компанию", companyIntro: "Введите основные сведения о компании.", companyNamePlaceholder: "Например: Digital Company", directorPlaceholder: "Имя Фамилия", industryPlaceholder: "Например: IT, Торговля", addressPlaceholder: "Город, улица и дом", createCompanyButton: "Создать компанию", planPaymentRequired: "Сначала подтвердите оплату тарифа.", companyLimit: "Лимит компаний превышен. Обновите тариф.", sessionExpired: "Срок сессии истёк. Войдите снова.", companyCreatedError: "Ошибка создания компании.", choosePlan: "ВЫБЕРИТЕ ТАРИФ ДЛЯ КОМПАНИИ", chooseBusinessPlan: "Выберите тариф для бизнеса", paymentMethod: "Способ оплаты", securePayment: "Безопасная оплата", walletLink: "Ссылка на кошелёк", walletId: "ID кошелька", openWallet: "Открыть кошелёк", copyId: "Копировать ID", paid: "Я оплатил", popular: "ПОПУЛЯРНЫЙ", currentPlan: "Текущий тариф", activatePlan: "активировать", monitoring: "Мониторинг", overview: "📊 Обзор", employees: "👥 Сотрудники", chat: "💬 Чат", meeting: "🎥 Онлайн-встреча", news: "📰 Новости", settings: "⚙️ Настройки", companyStats: "Статистика компании", totalEmployees: "Всего сотрудников", activeEmployees: "Активные сотрудники", offline: "Офлайн", addEmployee: "+ Новый сотрудник", edit: "Изменить", fire: "Уволить", send: "Отправить", messagePlaceholder: "Введите сообщение...", startMeeting: "Начать встречу", endMeeting: "Завершить встречу", live: "В эфире", notStarted: "Не началась", postNews: "Опубликовать новость", title: "Заголовок", description: "Описание", uploadImage: "📷 Загрузить изображение", delete: "Удалить", card: "Company Card", openCard: "Открыть карту", myCards: "Мои карты",
  },
  en: {
    loginTitle: "Sign in to your account",
    username: "Username",
    password: "Password",
    usernamePlaceholder: "Enter your username",
    passwordPlaceholder: "Enter your password",
    login: "Sign in",
    noAccount: "Don't have an account?",
    register: "Register",
    recover: "Recover account",
    accountProblem: "Having trouble with your password or account?",
    registerTitle: "Create a new owner account", firstName: "First name", lastName: "Last name", firstNamePlaceholder: "Enter your first name", lastNamePlaceholder: "Enter your last name", confirmPassword: "Confirm password", confirmPasswordPlaceholder: "Re-enter your password", agreeTerms: "I agree to the terms of use", creating: "Creating...", hasAccount: "Already have an account?", continue: "Continue", recoverTitle: "Enter your username", recoverMessage: "Recovery is available in demo mode. Contact an administrator to reset your password.", backToLogin: "← Return to login", allFieldsRequired: "Please fill in all fields.", invalidEmail: "Invalid email format.", invalidUsername: "Username may contain only Latin letters, numbers, and _.", passwordMin: "Password must contain at least 8 characters.", passwordsMismatch: "Passwords do not match.", acceptTerms: "Please accept the terms of use.", language: "Language", chooseLanguage: "Choose language", home: "Home", createCompany: "Create company", tariffs: "Plans", monetization: "Monetization", logout: "Log out", services: "SERVICES", main: "MAIN", owner: "Owner", employee: "Employee", loading: "Loading data...", back: "← Back to main section", save: "Save", cancel: "Cancel", close: "Close", dashboardLoadError: "Could not load data. Check the backend server.", companyName: "Company name", director: "Company director", industry: "Industry", address: "Address", selectedPlan: "Selected plan", createNewCompany: "Create a new company", companyIntro: "Enter the basic information about your company.", companyNamePlaceholder: "Example: Digital Company", directorPlaceholder: "First name Last name", industryPlaceholder: "Example: IT, Retail", addressPlaceholder: "City, street and house", createCompanyButton: "Create company", planPaymentRequired: "Confirm the plan payment first.", companyLimit: "Company limit exceeded. Upgrade your plan.", sessionExpired: "Session expired. Please log in again.", companyCreatedError: "Could not create the company.", choosePlan: "CHOOSE A PLAN FOR YOUR COMPANY", chooseBusinessPlan: "Choose a plan for your business", paymentMethod: "Payment method", securePayment: "Secure payment", walletLink: "Wallet link", walletId: "Wallet ID", openWallet: "Open wallet", copyId: "Copy ID", paid: "I have paid", popular: "MOST POPULAR", currentPlan: "Current plan", activatePlan: "activate", monitoring: "Monitoring", overview: "📊 Overview", employees: "👥 Employees", chat: "💬 Chat", meeting: "🎥 Live online meeting", news: "📰 News", settings: "⚙️ Settings", companyStats: "Company statistics", totalEmployees: "Total employees", activeEmployees: "Active employees", offline: "Offline", addEmployee: "+ New employee", edit: "Edit", fire: "Dismiss", send: "Send", messagePlaceholder: "Write a message...", startMeeting: "Start meeting", endMeeting: "End meeting", live: "Live", notStarted: "Not started", postNews: "Publish news", title: "Title", description: "Description", uploadImage: "📷 Upload image", delete: "Delete", card: "Company Card", openCard: "Open card", myCards: "My cards",
  },
};

translations.uz.openCompany = "Kompaniyaga kirish";
translations.ru.openCompany = "Открыть компанию";
translations.en.openCompany = "Open company";
translations.uz.editProfile = "Profilni tahrirlash";
translations.ru.editProfile = "Редактировать профиль";
translations.en.editProfile = "Edit profile";
translations.uz.confirmPaymentFirst = "Avval to'lovni tasdiqlang";
translations.ru.confirmPaymentFirst = "Сначала подтвердите оплату";
translations.en.confirmPaymentFirst = "Confirm payment first";
translations.uz.backgroundButton = "Fonni o'zgartirish";
translations.ru.backgroundButton = "Изменить фон";
translations.en.backgroundButton = "Change background";
translations.uz.backgroundShort = "Fon";
translations.ru.backgroundShort = "Фон";
translations.en.backgroundShort = "Background";
translations.uz.backgroundTitle = "Fon animatsiyasini o'zgartirish";
translations.ru.backgroundTitle = "Изменить анимацию фона";
translations.en.backgroundTitle = "Change background animation";
translations.uz.backgroundDescription = "Rasm yoki video tanlang. Tanlov Login va Dashboardda bir xil ishlaydi.";
translations.ru.backgroundDescription = "Выберите изображение или видео. Выбор будет одинаковым на входе и в Dashboard.";
translations.en.backgroundDescription = "Choose an image or video. It will be used on both Login and Dashboard.";
translations.uz.backgroundChoose = "Rasm yoki video tanlash";
translations.ru.backgroundChoose = "Выбрать изображение или видео";
translations.en.backgroundChoose = "Choose image or video";
translations.uz.backgroundReset = "Standart animatsiyaga qaytish";
translations.ru.backgroundReset = "Вернуть стандартную анимацию";
translations.en.backgroundReset = "Restore default animation";
translations.uz.backgroundCurrent = "Maxsus fon faol";
translations.ru.backgroundCurrent = "Пользовательский фон активен";
translations.en.backgroundCurrent = "Custom background is active";
translations.uz.backgroundTypeError = "Faqat rasm yoki video fayl tanlang.";
translations.ru.backgroundTypeError = "Выберите файл изображения или видео.";
translations.en.backgroundTypeError = "Choose an image or video file.";
translations.uz.backgroundReadError = "Faylni o'qib bo'lmadi.";
translations.ru.backgroundReadError = "Не удалось прочитать файл.";
translations.en.backgroundReadError = "Could not read the file.";
translations.uz.myCompanies = "Kompaniyalarim";
translations.ru.myCompanies = "Мои компании";
translations.en.myCompanies = "My companies";
translations.uz.noCompanies = "Kompaniya hali yaratilmagan";
translations.ru.noCompanies = "Компания еще не создана";
translations.en.noCompanies = "No company has been created yet";
translations.uz.noCompaniesDescription = "Kompaniyalar ko'rinishi uchun avval yangi kompaniya yarating.";
translations.ru.noCompaniesDescription = "Сначала создайте новую компанию, чтобы увидеть ее здесь.";
translations.en.noCompaniesDescription = "Create a company first to see it here.";
translations.uz.backToHome = "Bosh sahifaga qaytish";
translations.ru.backToHome = "Вернуться на главную";
translations.en.backToHome = "Back to home";

export function getLanguage() {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return translations[saved] ? saved : "uz";
}

export function setLanguage(language) {
  if (!translations[language]) return;
  localStorage.setItem(LANGUAGE_KEY, language);
  document.documentElement.lang = language;
  window.dispatchEvent(new CustomEvent(languageEvent, { detail: language }));
}

export function useLanguage() {
  const [language, setCurrentLanguage] = useState(getLanguage);
  useEffect(() => {
    const handleLanguageChange = (event) => setCurrentLanguage(event.detail);
    window.addEventListener(languageEvent, handleLanguageChange);
    return () => window.removeEventListener(languageEvent, handleLanguageChange);
  }, []);
  return translations[language];
}
