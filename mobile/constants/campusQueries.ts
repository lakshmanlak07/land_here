/**
 * Unsplash search queries per destination country.
 * Used with RotatingImage to cycle through campus and city photos.
 * Queries are ordered: campus-flavoured first, then city/landmark.
 */
export const CAMPUS_QUERIES: Record<string, string[]> = {
  US: [
    'Harvard university campus',
    'Stanford university campus California',
    'New York City skyline aerial',
    'MIT campus Boston autumn',
  ],
  UK: [
    'Oxford University campus quadrangle',
    'Cambridge University punting river',
    'London skyline River Thames',
    'Edinburgh castle Scotland',
  ],
  GB: [
    'Oxford University campus quadrangle',
    'Cambridge University punting river',
    'London skyline River Thames',
    'Edinburgh castle Scotland',
  ],
  CA: [
    'University of Toronto campus',
    'McGill University Montreal',
    'Vancouver skyline mountains',
    'Banff National Park mountains lake',
  ],
  AU: [
    'University of Sydney sandstone campus',
    'Sydney Opera House harbour',
    'Melbourne skyline Yarra River',
    'Australian beach sunshine',
  ],
  DE: [
    'Heidelberg university campus Germany',
    'Berlin city architecture Germany',
    'Munich Bavaria Marienplatz',
    'Hamburg Germany waterfront',
  ],
  FR: [
    'Sorbonne Paris university',
    'Paris Eiffel Tower aerial',
    'Lyon France city riverside',
    'French university garden architecture',
  ],
  CN: [
    'Peking University campus Beijing',
    'Shanghai Pudong skyline night',
    'Beijing modern architecture',
    'Tsinghua University campus China',
  ],
  JP: [
    'University of Tokyo campus',
    'Tokyo city skyline night',
    'Kyoto Japan autumn temple',
    'Japan campus cherry blossom',
  ],
  NL: [
    'Leiden Netherlands historic campus',
    'Amsterdam canal houses',
    'Delft Netherlands cityscape',
    'Rotterdam modern architecture',
  ],
  IE: [
    'Trinity College Dublin campus',
    'Dublin city River Liffey',
    'Ireland cliffs coastline Atlantic',
    'Galway Ireland colourful',
  ],
  NZ: [
    'Victoria University Wellington',
    'Auckland New Zealand skyline',
    'Queenstown mountains lake reflection',
    'New Zealand green landscape fjord',
  ],
  SG: [
    'National University Singapore campus',
    'Singapore Marina Bay night skyline',
    'Singapore Gardens by the Bay',
    'Singapore city aerial view',
  ],
  KR: [
    'Seoul National University campus',
    'Seoul city skyline modern',
    'Korea campus cherry blossom spring',
    'Bukchon Hanok Village Seoul',
  ],
  AE: [
    'NYU Abu Dhabi campus modern',
    'Dubai skyline Burj Khalifa night',
    'Abu Dhabi architecture grand mosque',
    'Dubai desert modern city',
  ],
  IT: [
    'University of Bologna historic Italy',
    'Rome Colosseum skyline Italy',
    'Florence Duomo cathedral Italy',
    'Milan modern university Italy',
  ],
  IN: [
    'IIT Bombay campus India',
    'New Delhi India architecture',
    'Bangalore modern India city',
    'Indian Institute Science Bangalore',
  ],
};
