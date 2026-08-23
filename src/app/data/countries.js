/**
 * Static country/city reference data for the Lead Search filters.
 *
 * Deliberately static, not fetched from any API: Places API has no cheap
 * "list cities in a country" endpoint, and calling it just to populate a
 * dropdown would burn paid requests for zero business value.
 *
 * No flag field here — flags render via CountryFlag.jsx (real SVGs, keyed
 * off `code`) rather than Unicode emoji, which don't render as actual
 * flags on Windows Chrome/Edge.
 */
export const COUNTRIES = [
    {
        code: "US",
        name: "United States",
        cities: [
            "Austin, TX", "Denver, CO", "Phoenix, AZ", "Tampa, FL", "Nashville, TN",
            "Dallas, TX", "Atlanta, GA", "Charlotte, NC", "Seattle, WA", "San Diego, CA",
            "Chicago, IL", "Houston, TX",
        ],
    },
    {
        code: "CA",
        name: "Canada",
        cities: ["Toronto, ON", "Vancouver, BC", "Calgary, AB", "Ottawa, ON", "Montreal, QC", "Edmonton, AB"],
    },
    {
        code: "GB",
        name: "United Kingdom",
        cities: ["London", "Manchester", "Birmingham", "Leeds", "Bristol", "Glasgow"],
    },
    {
        code: "AU",
        name: "Australia",
        cities: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast"],
    },
    {
        code: "IE",
        name: "Ireland",
        cities: ["Dublin", "Cork", "Galway", "Limerick"],
    },
    {
        code: "NZ",
        name: "New Zealand",
        cities: ["Auckland", "Wellington", "Christchurch"],
    },
    {
        code: "IN",
        name: "India",
        cities: ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune", "Chennai"],
    },
    {
        code: "DE",
        name: "Germany",
        cities: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne"],
    },
    {
        code: "FR",
        name: "France",
        cities: ["Paris", "Lyon", "Marseille", "Toulouse"],
    },
    {
        code: "ES",
        name: "Spain",
        cities: ["Madrid", "Barcelona", "Valencia", "Seville"],
    },
    {
        code: "NL",
        name: "Netherlands",
        cities: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht"],
    },
    {
        code: "MX",
        name: "Mexico",
        cities: ["Mexico City", "Guadalajara", "Monterrey", "Cancún"],
    },
    {
        code: "BR",
        name: "Brazil",
        cities: ["São Paulo", "Rio de Janeiro", "Brasília", "Belo Horizonte"],
    },
    {
        code: "ZA",
        name: "South Africa",
        cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria"],
    },
    {
        code: "AE",
        name: "United Arab Emirates",
        cities: ["Dubai", "Abu Dhabi", "Sharjah"],
    },
    {
        code: "SG",
        name: "Singapore",
        cities: ["Singapore"],
    },
    {
        code: "PH",
        name: "Philippines",
        cities: ["Manila", "Cebu City", "Davao City"],
    },
    {
        code: "PK",
        name: "Pakistan",
        cities: ["Karachi", "Lahore", "Islamabad"],
    },
];

/** Every city, tagged with the country it belongs to, for quick filtering. */
export function citiesForCountries(countryCodes) {
    if (!countryCodes || countryCodes.length === 0) return [];
    return COUNTRIES.filter((c) => countryCodes.includes(c.code)).flatMap((c) =>
        c.cities.map((city) => ({ city, countryCode: c.code, countryName: c.name }))
    );
}

/**
 * Every city across every country, for autocomplete suggestions before a
 * country is picked. This list is deliberately a small curated set of major
 * cities per country, not exhaustive — a real "every city in the world"
 * dataset is hundreds of thousands of rows and would bloat the bundle for
 * a feature that mainly needs suggestions. The city field itself is always
 * free text (see LeadSearch.jsx), so any city can still be searched even
 * when it's not in this list.
 */
export const ALL_CITIES = COUNTRIES.flatMap((c) =>
    c.cities.map((city) => ({ city, countryCode: c.code, countryName: c.name }))
);
