// Default SG cards for new-user onboarding.
// Category IDs match the fixed UUIDs in seed.sql.

const CAT = {
  dining:         '00000000-0000-0000-0000-000000000001',
  groceries:      '00000000-0000-0000-0000-000000000002',
  petrol:         '00000000-0000-0000-0000-000000000003',
  onlineShopping: '00000000-0000-0000-0000-000000000004',
  overseas:       '00000000-0000-0000-0000-000000000005',
  travel:         '00000000-0000-0000-0000-000000000006',
  transport:      '00000000-0000-0000-0000-000000000008',
}

export interface StarterRate {
  category_id: string
  label: string        // human-readable label for onboarding UI
  mpd: number
}
export interface StarterCap {
  category_id: string | null
  cap_period: string
  spend_limit: number
}

export interface StarterCard {
  name: string
  bank: string
  card_network: string
  base_mpd: number
  color: string
  rates: StarterRate[]
  caps: StarterCap[]
}

export const STARTER_CARDS: StarterCard[] = [
  {
    name: 'Altitude Visa Signature', bank: 'DBS', card_network: 'Visa',
    base_mpd: 1.2, color: '#E31E35',
    rates: [
      { category_id: CAT.overseas, label: 'Overseas',       mpd: 2.0 },
      { category_id: CAT.travel,   label: 'Travel bookings',mpd: 3.0 },
    ],
    caps: [
      { category_id: CAT.travel, cap_period: 'monthly', spend_limit: 5000 },
    ],
  },
  {
    name: "Woman's World Card", bank: 'DBS', card_network: 'Mastercard',
    base_mpd: 1.5, color: '#C0162E',
    rates: [
      { category_id: CAT.onlineShopping, label: 'Online shopping', mpd: 4.0 },
      { category_id: CAT.overseas,       label: 'Overseas',        mpd: 2.0 },
    ],
    caps: [
      { category_id: CAT.onlineShopping, cap_period: 'monthly', spend_limit: 1500 },
    ],
  },
  {
    name: 'PRVI Miles Visa', bank: 'UOB', card_network: 'Visa',
    base_mpd: 1.4, color: '#00427E',
    rates: [
      { category_id: CAT.overseas, label: 'Overseas', mpd: 2.4 },
      { category_id: CAT.travel,   label: 'Travel',   mpd: 3.0 },
    ],
    caps: [],
  },
  {
    name: 'Journey Credit Card', bank: 'Standard Chartered', card_network: 'Visa',
    base_mpd: 1.2, color: '#00854A',
    rates: [
      { category_id: CAT.dining,    label: 'Dining',    mpd: 3.0 },
      { category_id: CAT.groceries, label: 'Groceries', mpd: 3.0 },
      { category_id: CAT.petrol,    label: 'Petrol',    mpd: 3.0 },
      { category_id: CAT.overseas,  label: 'Overseas',  mpd: 2.0 },
    ],
    caps: [
      { category_id: CAT.dining,    cap_period: 'monthly', spend_limit: 1000 },
      { category_id: CAT.groceries, cap_period: 'monthly', spend_limit: 1000 },
      { category_id: CAT.petrol,    cap_period: 'monthly', spend_limit: 1000 },
    ],
  },
  {
    name: 'PremierMiles Visa', bank: 'Citibank', card_network: 'Visa',
    base_mpd: 1.2, color: '#003882',
    rates: [
      { category_id: CAT.overseas, label: 'Overseas', mpd: 2.0 },
    ],
    caps: [],
  },
  {
    name: '90°N Visa', bank: 'OCBC', card_network: 'Visa',
    base_mpd: 1.2, color: '#BE1833',
    rates: [
      { category_id: CAT.overseas, label: 'Overseas', mpd: 2.1 },
    ],
    caps: [],
  },
  {
    name: 'TravelOne Visa', bank: 'HSBC', card_network: 'Visa',
    base_mpd: 1.2, color: '#DB0011',
    rates: [
      { category_id: CAT.overseas, label: 'Overseas', mpd: 2.4 },
    ],
    caps: [],
  },
  {
    name: 'Horizon Visa Signature', bank: 'Maybank', card_network: 'Visa',
    base_mpd: 0.4, color: '#F7A900',
    rates: [
      { category_id: CAT.petrol,    label: 'Petrol',    mpd: 3.2 },
      { category_id: CAT.dining,    label: 'Dining',    mpd: 2.0 },
      { category_id: CAT.overseas,  label: 'Overseas',  mpd: 2.0 },
      { category_id: CAT.travel,    label: 'Travel',    mpd: 2.0 },
      { category_id: CAT.transport, label: 'Transport', mpd: 2.0 },
    ],
    caps: [
      { category_id: CAT.petrol,    cap_period: 'monthly', spend_limit: 200 },
      { category_id: CAT.dining,    cap_period: 'monthly', spend_limit: 800 },
      { category_id: CAT.travel,    cap_period: 'monthly', spend_limit: 800 },
      { category_id: CAT.transport, cap_period: 'monthly', spend_limit: 800 },
    ],
  },
]
