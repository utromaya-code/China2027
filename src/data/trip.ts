import { TODO_CONTENT, type Pending } from './content';
import { checkProductionContent } from './production';

/**
 * Базовые факты о путешествии — единственный источник правды.
 * Даты, города, контакты и всё, что связано с ценой, берутся отсюда.
 *
 * Поля со значением TODO_CONTENT организатор ещё не подтвердил:
 * на сайте их нет, а сборка печатает, чего не хватает.
 */
export const trip = {
  title: 'Путь в Шангри-Ла',
  country: 'Китай',
  brand: 'Китай 2027',

  dates: {
    start: '2027-03-22',
    end: '2027-04-01',
    human: '22 марта — 1 апреля 2027',
    humanShort: '22.03 — 01.04.2027',
    totalDays: 11,
  },

  start: 'Гуанчжоу',
  finish: 'Лицзян',

  /** Размер группы не подтверждён — на сайте не показываем. */
  groupSize: TODO_CONTENT as Pending<number>,

  /** Цена и её состав не подтверждены — блок стоимости показывает приглашение узнать её. */
  price: {
    amount: TODO_CONTENT as Pending<number>,
    currency: 'EUR',
    deposit: TODO_CONTENT as Pending<number>,
    singleSupplement: TODO_CONTENT as Pending<number>,
  },

  inclusions: {
    included: TODO_CONTENT as Pending<readonly string[]>,
    excluded: TODO_CONTENT as Pending<readonly string[]>,
  },

  payment: {
    refundPolicy: TODO_CONTENT as Pending<string>,
  },

  /**
   * Адрес приёма заявок — переменная окружения PUBLIC_LEAD_FORM_ENDPOINT.
   * Пока не задан, форма передаёт заявку готовым сообщением в Telegram.
   */
  formEndpoint: import.meta.env.PUBLIC_LEAD_FORM_ENDPOINT ?? '',

  contacts: {
    telegram: 'https://t.me/vsemaya',
    telegramHandle: '@vsemaya',
  },
} as const;

/** Первый экран. */
export const hero = {
  kicker: 'Авторское путешествие · Китай · весна 2027',
  title: 'Путь в Шангри-Ла',
  lead: 'Одиннадцать дней с юга на запад Поднебесной: ночные огни Гуанчжоу, винчун на родине Ип Мана, туманы над карстом Яншо — и тибетское нагорье',
  /** Продолжение лида — на телефоне скрывается, чтобы первый экран не переполнялся. */
  leadMore: ', где стоят монастыри и ветер читает молитвы на флагах.',
  route: 'Гуанчжоу → Яншо → Шангри-Ла → Лицзян',
  cta: 'Хочу поехать',
  secondary: 'Программа по дням',
  moon: {
    date: '22 марта',
    text: 'первое полнолуние весны — в первый же вечер',
  },
  /** Вертикальная подпись иероглифами: «путь в Шангри-Ла». */
  verticalHanzi: '香格里拉之路',
} as const;

/** Блок сразу после первого экрана: высота как сюжет маршрута. */
export const manifesto = {
  title: 'От неона до ледника',
  lead: 'Маршрут поднимается от берегов Жемчужной реки до ледника Нефритового дракона. Пять миров за одиннадцать дней: мегаполис, родина кунг-фу, карстовая страна, тибетское нагорье, земли наси и мосо.',
  note: 'Высоты — над уровнем моря. Ледник Юйлун — по желанию, в последний полный день.',
} as const;

checkProductionContent([
  { path: 'trip.price.amount', value: trip.price.amount, need: 'стоимость участия' },
  { path: 'trip.price.deposit', value: trip.price.deposit, need: 'размер предоплаты для брони' },
  {
    path: 'trip.price.singleSupplement',
    value: trip.price.singleSupplement,
    need: 'доплата за одноместное размещение',
  },
  {
    path: 'trip.inclusions.included',
    value: trip.inclusions.included,
    need: 'что входит в стоимость',
  },
  {
    path: 'trip.inclusions.excluded',
    value: trip.inclusions.excluded,
    need: 'что не входит в стоимость',
  },
  { path: 'trip.groupSize', value: trip.groupSize, need: 'размер группы' },
  { path: 'trip.payment.refundPolicy', value: trip.payment.refundPolicy, need: 'условия возврата предоплаты' },
  {
    path: 'trip.formEndpoint',
    value: trip.formEndpoint,
    need: 'адрес приёма заявок в переменной PUBLIC_LEAD_FORM_ENDPOINT',
  },
]);
