export const CITY_DEFAULT_LOCALITIES: Record<string, string[]> = {
  gorakhpur: [
    'Junction Railway Station (gkp)',
    'Golghar (Main Market)',
    'Betiahata',
    'Basharatpur',
    'Fertilizer Colony',
    'Mohaddipur',
    'Azad Nagar',
    'Ashok Nagar',
    'Daudpur',
    'Bargadwa',
    'Basantpur',
    'Chhotey Kazipur Khurd',
    'Dayanand Nagar',
    'Hansupur',
    'Hotel Avantika',
    'Hotel Bobina',
    'Hotel Clarks Inn Grand',
    'Hotel Ganesh',
    'Hotel Marina',
    'Hotel Park Regency',
    'Hotel President',
    'Hotel Royal Residency',
    'Hotel Shivoy',
    'Hotel Upvan',
    'Hotel Vivek',
    'Hotel YarkInn',
    'Indira Nagar',
    'Maitripuram',
    'Mirzapur Pachpedwa',
    'Miyan Baza',
    'Mohripur',
    'Nanda Nagar',
    'Pawan Vihar',
    'Raiganj',
    'Rail Vihar Colony Phase 3rd',
    'Railway Stadium Colony',
    'Rajendra Nagar',
    'Ramjanki Nager',
    'Sainik Kunj',
    'Sainik Vihar',
    'Shahpur',
    'Shakti Nagar Colony',
    'Shri Krishna Puram Colony',
    'Siva Puram',
    'Surajkund',
    'Vikas Nagar',
    'Gorakhnath Temple Area',
    'Medical College Road (BRD)',
    'Taramandal (Planetarium)',
    'Asuran Chowk',
    'Kachhari (Civil Lines)',
    'AIIMS Gorakhpur',
    'GIDA Industrial Area',
  ],
  lucknow: [
    'Charbagh Railway Station (lko)',
    'Hazratganj (Main Market)',
    'Gomti Nagar (Patrakarpuram)',
    'Alambagh Bus Stand',
    'Indira Nagar',
    'Mahanagar',
    'Aminabad',
    'Chowk (Old Lucknow)',
    'Jankipuram',
    'Ashiyana Colony',
    'Vikas Nagar',
    'Rajajipuram',
    'Telibagh',
    'Chaudhary Charan Singh Airport (Amausi)',
    'Transport Nagar',
    'Hussainganj',
    'Kapoorthala',
    'Polytechnic Chauraha',
    'Munshipulia',
    'Lulu Mall (Sushant Golf City)',
    'BBD University (Faizabad Road)',
  ],
  delhi: [
    'Indira Gandhi International Airport (Terminal 3)',
    'Connaught Place (CP Central)',
    'New Delhi Railway Station (Paharganj / Ajmeri Gate)',
    'Old Delhi Railway Station (Chandni Chowk)',
    'Hazrat Nizamuddin Railway Station',
    'Anand Vihar ISBT',
    'Kashmere Gate ISBT',
    'DLF Cyber Hub (Gurugram)',
    'Sector 18 Atta Market (Noida)',
    'Saket (Select Citywalk)',
    'Hauz Khas Village',
    'Karol Bagh Market',
    'Lajpat Nagar Central Market',
    'Chandni Chowk',
    'Dwarka Sector 21',
    'Rohini Sector 10',
    'Rajouri Garden',
    'Vasant Kunj (Ambience Mall)',
  ],
  varanasi: [
    'Varanasi Junction (BSB Cantonment)',
    'Kashi Vishwanath Temple (Godowlia)',
    'Dashashwamedh Ghat',
    'Assi Ghat',
    'Banaras Hindu University (BHU Gate)',
    'Lal Bahadur Shastri International Airport (Babatpur)',
    'Sigra Market',
    'Lanka (BHU Road)',
    'Sarnath Buddhist Complex',
    'Pandeypur',
    'Bhelupur',
    'Mahmoorganj',
    'Shivpur',
  ],
};

export const CITY_FOCAL_COORDINATES: Record<string, [number, number]> = {
  gorakhpur: [26.7606, 83.3732],
  lucknow: [26.8467, 80.9462],
  delhi: [28.6139, 77.2090],
  varanasi: [25.3176, 82.9739],
  kanpur: [26.4499, 80.3319],
  prayagraj: [25.4358, 81.8463],
  bengaluru: [12.9716, 77.5946],
  mumbai: [19.0760, 72.8777],
  jaipur: [26.9124, 75.7873],
  kolkata: [22.5726, 88.3639],
  patna: [25.5941, 85.1376],
  noida: [28.5355, 77.3910],
  ghaziabad: [28.6692, 77.4538],
  agra: [27.1767, 78.0081],
  meerut: [28.9845, 77.7064],
};

export const CITY_LOCALITY_COORDINATES: Record<string, Record<string, [number, number]>> = {
  gorakhpur: {
    'junction railway station (gkp)': [26.7575, 83.3813],
    'railway station': [26.7575, 83.3813],
    'golghar (main market)': [26.7562, 83.3712],
    'golghar': [26.7562, 83.3712],
    'gorakhnath temple area': [26.7863, 83.3533],
    'gorakhnath': [26.7863, 83.3533],
    'medical college road (brd)': [26.7925, 83.3982],
    'taramandal (planetarium)': [26.7328, 83.3854],
    'taramandal': [26.7328, 83.3854],
    'aiims gorakhpur': [26.7388, 83.4470],
    'aiims': [26.7388, 83.4470],
    'mohaddipur': [26.7547, 83.3948],
    'betiahata': [26.7490, 83.3660],
    'basharatpur': [26.7820, 83.3850],
    'fertilizer colony': [26.8090, 83.3620],
    'gida industrial area': [26.7450, 83.2450],
    'gida': [26.7450, 83.2450],
    'kachhari (civil lines)': [26.7530, 83.3760],
    'asuran chowk': [26.7725, 83.3800],
    'asuran': [26.7725, 83.3800],
    'ashok nagar': [26.7650, 83.3850],
    'azad nagar': [26.7620, 83.3910],
    'daudpur': [26.7480, 83.3720],
    'bargadwa': [26.8120, 83.3510],
    'surajkund': [26.7500, 83.3420],
    'shahpur': [26.7780, 83.3790],
    'vikas nagar': [26.7850, 83.3820],
    'nanda nagar': [26.7420, 83.4180],
  },
  lucknow: {
    'charbagh railway station (lko)': [26.8322, 80.9234],
    'charbagh station': [26.8322, 80.9234],
    'hazratganj (main market)': [26.8532, 80.9472],
    'hazratganj': [26.8532, 80.9472],
    'gomti nagar (patrakarpuram)': [26.8510, 80.9995],
    'gomti nagar': [26.8510, 80.9995],
    'alambagh bus stand': [26.8155, 80.9080],
    'alambagh': [26.8155, 80.9080],
    'chaudhary charan singh airport (amausi)': [26.7606, 80.8893],
    'lucknow airport': [26.7606, 80.8893],
    'lulu mall (sushant golf city)': [26.7797, 81.0118],
    'lulu mall': [26.7797, 81.0118],
    'munshipulia': [26.8830, 80.9940],
    'polytechnic chauraha': [26.8715, 80.9902],
    'indira nagar': [26.8820, 80.9850],
    'mahanagar': [26.8730, 80.9520],
    'aminabad': [26.8450, 80.9320],
    'chowk (old lucknow)': [26.8680, 80.9080],
    'jankipuram': [26.9150, 80.9450],
    'ashiyana colony': [26.7980, 80.9150],
    'vikas nagar': [26.8920, 80.9630],
    'rajajipuram': [26.8380, 80.8850],
  },
  delhi: {
    'indira gandhi international airport (terminal 3)': [28.5562, 77.1000],
    'delhi airport': [28.5562, 77.1000],
    'connaught place (cp central)': [28.6315, 77.2167],
    'connaught place': [28.6315, 77.2167],
    'new delhi railway station (paharganj / ajmeri gate)': [28.6430, 77.2195],
    'new delhi railway station': [28.6430, 77.2195],
    'old delhi railway station (chandni chowk)': [28.6570, 77.2300],
    'hazrat nizamuddin railway station': [28.5880, 77.2530],
    'anand vihar isbt': [28.6470, 77.3160],
    'kashmere gate isbt': [28.6670, 77.2280],
    'dlf cyber hub (gurugram)': [28.4950, 77.0890],
    'cyber hub': [28.4950, 77.0890],
    'sector 18 atta market (noida)': [28.5700, 77.3210],
    'noida sector 18': [28.5700, 77.3210],
    'saket (select citywalk)': [28.5280, 77.2190],
    'hauz khas village': [28.5490, 77.1930],
    'karol bagh market': [28.6520, 77.1900],
    'lajpat nagar central market': [28.5680, 77.2430],
    'chandni chowk': [28.6560, 77.2300],
    'dwarka sector 21': [28.5520, 77.0580],
    'rohini sector 10': [28.7180, 77.1150],
    'rajouri garden': [28.6480, 77.1230],
    'vasant kunj (ambience mall)': [28.5420, 77.1550],
  },
  varanasi: {
    'varanasi junction (bsb cantonment)': [25.3280, 82.9860],
    'kashi vishwanath temple (godowlia)': [25.3109, 83.0107],
    'dashashwamedh ghat': [25.3070, 83.0100],
    'assi ghat': [25.2885, 83.0060],
    'banaras hindu university (bhu gate)': [25.2750, 82.9990],
    'lal bahadur shastri international airport (babatpur)': [25.4520, 82.8590],
    'sigra market': [25.3190, 82.9880],
    'lanka (bhu road)': [25.2810, 82.9990],
    'sarnath buddhist complex': [25.3715, 83.0250],
  },
};

export function getCoordinatesForLocality(
  localityName: string,
  cityName: string
): { lat: number; lon: number } {
  const citySlug = cityName.split(',')[0].trim().toLowerCase();
  const cityFocal = CITY_FOCAL_COORDINATES[citySlug] || [26.7606, 83.3732];
  const locSlug = localityName.toLowerCase().trim();

  // 1. Direct match in known coordinates
  const cityMap = CITY_LOCALITY_COORDINATES[citySlug];
  if (cityMap) {
    if (cityMap[locSlug]) {
      const [lat, lon] = cityMap[locSlug];
      return { lat, lon };
    }

    // Partial key match
    for (const [key, coords] of Object.entries(cityMap)) {
      if (locSlug.includes(key) || key.includes(locSlug)) {
        return { lat: coords[0], lon: coords[1] };
      }
    }
  }

  // 2. Deterministic high-entropy city-centric offset (1.2km - 4.5km radius)
  const hash = Array.from(locSlug).reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
  const latOffset = (((hash % 70) - 35) / 1100);
  const lonOffset = (((((hash * 13) % 70) - 35) / 1100));

  return {
    lat: Number((cityFocal[0] + latOffset).toFixed(5)),
    lon: Number((cityFocal[1] + lonOffset).toFixed(5)),
  };
}

export function getLocalitiesForCity(cityName: string): string[] {
  const slug = cityName.split(',')[0].trim().toLowerCase();
  return CITY_DEFAULT_LOCALITIES[slug] || CITY_DEFAULT_LOCALITIES['gorakhpur'];
}
