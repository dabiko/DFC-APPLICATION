/**
 * Countries Data
 * List of countries with phone codes (European, American, and African countries)
 */

export interface Country {
  code: string // ISO 3166-1 alpha-2
  name: string
  phoneCode: string
  flag: string // emoji flag
}

export const COUNTRIES: Country[] = [
  // European Countries
  { code: 'AL', name: 'Albania', phoneCode: '+355', flag: '🇦🇱' },
  { code: 'AD', name: 'Andorra', phoneCode: '+376', flag: '🇦🇩' },
  { code: 'AT', name: 'Austria', phoneCode: '+43', flag: '🇦🇹' },
  { code: 'BY', name: 'Belarus', phoneCode: '+375', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', phoneCode: '+32', flag: '🇧🇪' },
  { code: 'BA', name: 'Bosnia and Herzegovina', phoneCode: '+387', flag: '🇧🇦' },
  { code: 'BG', name: 'Bulgaria', phoneCode: '+359', flag: '🇧🇬' },
  { code: 'HR', name: 'Croatia', phoneCode: '+385', flag: '🇭🇷' },
  { code: 'CY', name: 'Cyprus', phoneCode: '+357', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', phoneCode: '+420', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', phoneCode: '+45', flag: '🇩🇰' },
  { code: 'EE', name: 'Estonia', phoneCode: '+372', flag: '🇪🇪' },
  { code: 'FI', name: 'Finland', phoneCode: '+358', flag: '🇫🇮' },
  { code: 'FR', name: 'France', phoneCode: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', phoneCode: '+49', flag: '🇩🇪' },
  { code: 'GR', name: 'Greece', phoneCode: '+30', flag: '🇬🇷' },
  { code: 'HU', name: 'Hungary', phoneCode: '+36', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', phoneCode: '+354', flag: '🇮🇸' },
  { code: 'IE', name: 'Ireland', phoneCode: '+353', flag: '🇮🇪' },
  { code: 'IT', name: 'Italy', phoneCode: '+39', flag: '🇮🇹' },
  { code: 'XK', name: 'Kosovo', phoneCode: '+383', flag: '🇽🇰' },
  { code: 'LV', name: 'Latvia', phoneCode: '+371', flag: '🇱🇻' },
  { code: 'LI', name: 'Liechtenstein', phoneCode: '+423', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', phoneCode: '+370', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', phoneCode: '+352', flag: '🇱🇺' },
  { code: 'MT', name: 'Malta', phoneCode: '+356', flag: '🇲🇹' },
  { code: 'MD', name: 'Moldova', phoneCode: '+373', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', phoneCode: '+377', flag: '🇲🇨' },
  { code: 'ME', name: 'Montenegro', phoneCode: '+382', flag: '🇲🇪' },
  { code: 'NL', name: 'Netherlands', phoneCode: '+31', flag: '🇳🇱' },
  { code: 'MK', name: 'North Macedonia', phoneCode: '+389', flag: '🇲🇰' },
  { code: 'NO', name: 'Norway', phoneCode: '+47', flag: '🇳🇴' },
  { code: 'PL', name: 'Poland', phoneCode: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', phoneCode: '+351', flag: '🇵🇹' },
  { code: 'RO', name: 'Romania', phoneCode: '+40', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', phoneCode: '+7', flag: '🇷🇺' },
  { code: 'SM', name: 'San Marino', phoneCode: '+378', flag: '🇸🇲' },
  { code: 'RS', name: 'Serbia', phoneCode: '+381', flag: '🇷🇸' },
  { code: 'SK', name: 'Slovakia', phoneCode: '+421', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', phoneCode: '+386', flag: '🇸🇮' },
  { code: 'ES', name: 'Spain', phoneCode: '+34', flag: '🇪🇸' },
  { code: 'SE', name: 'Sweden', phoneCode: '+46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', phoneCode: '+41', flag: '🇨🇭' },
  { code: 'UA', name: 'Ukraine', phoneCode: '+380', flag: '🇺🇦' },
  { code: 'GB', name: 'United Kingdom', phoneCode: '+44', flag: '🇬🇧' },
  { code: 'VA', name: 'Vatican City', phoneCode: '+379', flag: '🇻🇦' },

  // American Countries (North, Central, South America)
  { code: 'AG', name: 'Antigua and Barbuda', phoneCode: '+1268', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', phoneCode: '+54', flag: '🇦🇷' },
  { code: 'BS', name: 'Bahamas', phoneCode: '+1242', flag: '🇧🇸' },
  { code: 'BB', name: 'Barbados', phoneCode: '+1246', flag: '🇧🇧' },
  { code: 'BZ', name: 'Belize', phoneCode: '+501', flag: '🇧🇿' },
  { code: 'BO', name: 'Bolivia', phoneCode: '+591', flag: '🇧🇴' },
  { code: 'BR', name: 'Brazil', phoneCode: '+55', flag: '🇧🇷' },
  { code: 'CA', name: 'Canada', phoneCode: '+1', flag: '🇨🇦' },
  { code: 'CL', name: 'Chile', phoneCode: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', phoneCode: '+57', flag: '🇨🇴' },
  { code: 'CR', name: 'Costa Rica', phoneCode: '+506', flag: '🇨🇷' },
  { code: 'CU', name: 'Cuba', phoneCode: '+53', flag: '🇨🇺' },
  { code: 'DM', name: 'Dominica', phoneCode: '+1767', flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic', phoneCode: '+1809', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', phoneCode: '+593', flag: '🇪🇨' },
  { code: 'SV', name: 'El Salvador', phoneCode: '+503', flag: '🇸🇻' },
  { code: 'GD', name: 'Grenada', phoneCode: '+1473', flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala', phoneCode: '+502', flag: '🇬🇹' },
  { code: 'GY', name: 'Guyana', phoneCode: '+592', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', phoneCode: '+509', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', phoneCode: '+504', flag: '🇭🇳' },
  { code: 'JM', name: 'Jamaica', phoneCode: '+1876', flag: '🇯🇲' },
  { code: 'MX', name: 'Mexico', phoneCode: '+52', flag: '🇲🇽' },
  { code: 'NI', name: 'Nicaragua', phoneCode: '+505', flag: '🇳🇮' },
  { code: 'PA', name: 'Panama', phoneCode: '+507', flag: '🇵🇦' },
  { code: 'PY', name: 'Paraguay', phoneCode: '+595', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', phoneCode: '+51', flag: '🇵🇪' },
  { code: 'KN', name: 'Saint Kitts and Nevis', phoneCode: '+1869', flag: '🇰🇳' },
  { code: 'LC', name: 'Saint Lucia', phoneCode: '+1758', flag: '🇱🇨' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', phoneCode: '+1784', flag: '🇻🇨' },
  { code: 'SR', name: 'Suriname', phoneCode: '+597', flag: '🇸🇷' },
  { code: 'TT', name: 'Trinidad and Tobago', phoneCode: '+1868', flag: '🇹🇹' },
  { code: 'US', name: 'United States', phoneCode: '+1', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', phoneCode: '+598', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', phoneCode: '+58', flag: '🇻🇪' },

  // African Countries
  { code: 'DZ', name: 'Algeria', phoneCode: '+213', flag: '🇩🇿' },
  { code: 'AO', name: 'Angola', phoneCode: '+244', flag: '🇦🇴' },
  { code: 'BJ', name: 'Benin', phoneCode: '+229', flag: '🇧🇯' },
  { code: 'BW', name: 'Botswana', phoneCode: '+267', flag: '🇧🇼' },
  { code: 'BF', name: 'Burkina Faso', phoneCode: '+226', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', phoneCode: '+257', flag: '🇧🇮' },
  { code: 'CV', name: 'Cabo Verde', phoneCode: '+238', flag: '🇨🇻' },
  { code: 'CM', name: 'Cameroon', phoneCode: '+237', flag: '🇨🇲' },
  { code: 'CF', name: 'Central African Republic', phoneCode: '+236', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', phoneCode: '+235', flag: '🇹🇩' },
  { code: 'KM', name: 'Comoros', phoneCode: '+269', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', phoneCode: '+242', flag: '🇨🇬' },
  { code: 'CD', name: 'Congo (DRC)', phoneCode: '+243', flag: '🇨🇩' },
  { code: 'CI', name: "Côte d'Ivoire", phoneCode: '+225', flag: '🇨🇮' },
  { code: 'DJ', name: 'Djibouti', phoneCode: '+253', flag: '🇩🇯' },
  { code: 'EG', name: 'Egypt', phoneCode: '+20', flag: '🇪🇬' },
  { code: 'GQ', name: 'Equatorial Guinea', phoneCode: '+240', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', phoneCode: '+291', flag: '🇪🇷' },
  { code: 'SZ', name: 'Eswatini', phoneCode: '+268', flag: '🇸🇿' },
  { code: 'ET', name: 'Ethiopia', phoneCode: '+251', flag: '🇪🇹' },
  { code: 'GA', name: 'Gabon', phoneCode: '+241', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', phoneCode: '+220', flag: '🇬🇲' },
  { code: 'GH', name: 'Ghana', phoneCode: '+233', flag: '🇬🇭' },
  { code: 'GN', name: 'Guinea', phoneCode: '+224', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', phoneCode: '+245', flag: '🇬🇼' },
  { code: 'KE', name: 'Kenya', phoneCode: '+254', flag: '🇰🇪' },
  { code: 'LS', name: 'Lesotho', phoneCode: '+266', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', phoneCode: '+231', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', phoneCode: '+218', flag: '🇱🇾' },
  { code: 'MG', name: 'Madagascar', phoneCode: '+261', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', phoneCode: '+265', flag: '🇲🇼' },
  { code: 'ML', name: 'Mali', phoneCode: '+223', flag: '🇲🇱' },
  { code: 'MR', name: 'Mauritania', phoneCode: '+222', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', phoneCode: '+230', flag: '🇲🇺' },
  { code: 'MA', name: 'Morocco', phoneCode: '+212', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', phoneCode: '+258', flag: '🇲🇿' },
  { code: 'NA', name: 'Namibia', phoneCode: '+264', flag: '🇳🇦' },
  { code: 'NE', name: 'Niger', phoneCode: '+227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', phoneCode: '+234', flag: '🇳🇬' },
  { code: 'RW', name: 'Rwanda', phoneCode: '+250', flag: '🇷🇼' },
  { code: 'ST', name: 'São Tomé and Príncipe', phoneCode: '+239', flag: '🇸🇹' },
  { code: 'SN', name: 'Senegal', phoneCode: '+221', flag: '🇸🇳' },
  { code: 'SC', name: 'Seychelles', phoneCode: '+248', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', phoneCode: '+232', flag: '🇸🇱' },
  { code: 'SO', name: 'Somalia', phoneCode: '+252', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', phoneCode: '+27', flag: '🇿🇦' },
  { code: 'SS', name: 'South Sudan', phoneCode: '+211', flag: '🇸🇸' },
  { code: 'SD', name: 'Sudan', phoneCode: '+249', flag: '🇸🇩' },
  { code: 'TZ', name: 'Tanzania', phoneCode: '+255', flag: '🇹🇿' },
  { code: 'TG', name: 'Togo', phoneCode: '+228', flag: '🇹🇬' },
  { code: 'TN', name: 'Tunisia', phoneCode: '+216', flag: '🇹🇳' },
  { code: 'UG', name: 'Uganda', phoneCode: '+256', flag: '🇺🇬' },
  { code: 'ZM', name: 'Zambia', phoneCode: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', phoneCode: '+263', flag: '🇿🇼' },
]

/**
 * Get country by code
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code)
}

/**
 * Get country by phone code
 */
export function getCountryByPhoneCode(phoneCode: string): Country | undefined {
  return COUNTRIES.find((c) => c.phoneCode === phoneCode)
}

/**
 * Format phone number with country code
 */
export function formatPhoneNumber(phoneCode: string, number: string): string {
  return `${phoneCode} ${number.replace(/\D/g, '')}`
}
