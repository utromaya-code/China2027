import { TODO_CONTENT, type Pending } from './content';
import { checkProductionContent } from './production';

export interface PriceTier {
  amount: number;
  /** Для кого эта цена — подпись рядом с суммой. */
  label: string;
}

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
    start: '2027-03-23',
    end: '2027-04-02',
    human: '23 марта — 2 апреля 2027',
    humanShort: '23.03 — 02.04.2027',
    totalDays: 11,
  },

  start: 'Гуанчжоу',
  finish: 'Лицзян',

  /** Небольшая группа — до 20 человек. Подтверждено организатором. */
  groupSize: 20 as Pending<number>,

  /** Цена за участие: первые пять мест дешевле. Подтверждено организатором. */
  price: {
    tiers: [
      { amount: 2000, label: 'для первых пяти участников' },
      { amount: 2300, label: 'для остальных' },
    ] as Pending<readonly PriceTier[]>,
    currency: 'EUR',
    deposit: 1000 as Pending<number>,
    /** Одноместный номер — по запросу. */
    singleSupplement: 600 as Pending<number>,
  },

  /** Состав — со слов организатора. */
  inclusions: {
    included: [
      'Проживание в отелях на всём маршруте, двухместные номера',
      'Завтраки',
      'Трансферы из аэропорта Гуанчжоу (при прилёте рекомендованным рейсом) и в аэропорт Лицзяна',
      'Все переезды по программе: трансферы, поезд Фошань — Яншо, перелёт Гуйлинь — Лицзян',
      'Тренировка винчуна, пуджа в Сонгцзанлине и практики по программе',
      'Сопровождение ведущих от первого до последнего дня',
    ] as Pending<readonly string[]>,
    excluded: [
      'Перелёт в Китай и обратно',
      'Входные билеты в парки, монастыри и на канатную дорогу Юйлуна',
      'Обеды и ужины',
      'Страховка',
      'Активности по выбору: аренда скутера, пещера, квадроциклы',
      'Сувениры и личные расходы',
    ] as Pending<readonly string[]>,
  },

  payment: {
    schedule: 'Остаток — по графику, детали при записи.' as Pending<string>,
    refundPolicy: 'Предоплату вернём, если вы откажетесь от поездки не позднее чем за два месяца до старта — до 23 января 2027 года.' as Pending<string>,
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
    date: '23 марта',
    text: 'старт под полной луной весны',
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
  { path: 'trip.price.tiers', value: trip.price.tiers, need: 'стоимость участия' },
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
