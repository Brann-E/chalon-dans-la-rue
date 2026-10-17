// Couleurs exactes extraites du fichier Figma (par catégorie, utilisées uniquement
// dans la feuille de filtres — l'accent de chaque spectacle est indépendant, voir SHOWS).
const FILTER_CATEGORY_COLORS = {
  'Spectacle musical': '#5B6BFA',
  'Clown': '#FF4444',
  'Danse': '#E59CCE',
  'Théâtre pour enfants': '#4CC9FE',
  'Performance': '#A267FC',
  'Marionnette': '#0D7C66',
  'Cirque': '#54C392',
  'Déambulation': '#FABC3F',
  'Théâtre de rue': '#FF9F00',
  'Cabaret': '#FF1493',
  'Concert': '#708090',
  'Lieux du festival': '#654092',
  'Lieux de convivialité': '#00A7B6'
};

const SHOWS = [
  {
    id: 'lepd',
    title: 'LE P*D*',
    company: 'Jeanine Machine',
    duration: '2h15',
    age: 'Dès 12 ans',
    category: 'Déambulation',
    programme: 'IN',
    location: 'Rue d’Uxelles',
    spot: 73,
    color: '#A267FC',
    images: ['assets/show-lepd.jpg'],
    summary: 'Au milieu de l’espace public, un homme nous raconte les luttes qui ont fait l’histoire de la culture homosexuelle du 20ème siècle et qui participent à la culture queer d’aujourd’hui. Il traverse le temps pour...',
    description: 'Au milieu de l’espace public, un homme nous raconte les luttes qui ont fait l’histoire de la culture homosexuelle du 20ème siècle et qui participent à la culture queer d’aujourd’hui. Il traverse le temps pour...',
    dates: [
      { date: '10/07', time: '17h00' },
      { date: '11/07', time: '17h00' },
      { date: '12/07', time: '17h00' },
      { date: '13/07', time: '17h00' }
    ]
  },
  {
    id: 'fidji',
    title: 'FIDJI',
    company: 'La Dépliante',
    duration: '0h50',
    age: 'Dès 10 ans',
    category: 'Théâtre de rue',
    programme: 'OFF',
    location: 'Place de l’Hôtel de ville',
    spot: 68,
    color: '#FF9F00',
    images: ['assets/show-fidji5.jpg', 'assets/show-fidji-carousel1.jpg'],
    summary: 'Mordant, grinçant, badass, un personnage décapant entre la comédie sociale anglaise et l’antihéros de Marvel. Strasky attend son chat, l’occasion pour lui de partager avec philosophie ses réflexions...',
    description: 'Mordant, grinçant et drôle, un personnage décapant entre la comédie sociale anglaise et l’anti-héros de Marvel. Starsky cherche son chat, l’occasion pour lui de partager ses réflexions sur la vie, le monde et les félins. Entre deux exercices de musculation, Starsky tire le fil de ses raisonnements « félinosophiques » et nous plonge au cœur d’un monde absurde, à la frontière du stand up, du conte et du cirque dans lequel le vrai et le faux ne font désormais plus qu’un : le vraux.\n\nUn spectacle tiré au cordeau avec des punchlines percutantes et surtout l’idée assumée qu’on peut dire beaucoup grâce au rire.',
    dates: [
      { date: '10/07', time: '9h30' },
      { date: '11/07', time: '9h30' },
      { date: '12/07', time: '9h30' },
      { date: '13/07', time: '9h30' }
    ],
    siteShow: '#',
    siteCompany: '#',
    distribution: 'De et Avec : Antoine Nicaud\nRegards extérieurs : Jatta Borg, Marek Kastelnik, Dominique Bettenfeld, Stéphane Dutournier\nProduction, diffusion et administration : L’Envoleur – Adeline Morin et Guillaume Cornu',
    technique: 'Espace de jeu : 8 mètres par 8 mètres\nDisposition : Frontal, la Cie fournit un gradin de 100 places.\nJauge : la jauge maximale est de 250 personnes\nTemps de montage : 2 heures environ\nTemps de démontage : 1 heure environ',
    soutiens: 'La Cascade à Bourg Saint Andéol, Le Kiwi – Festival de Ramonville, La Commanderie à Vaour, Le Daki Ling à Marseille, Le Carroi à la Flèche, L’Interlude à Cholet, Furies à Chalon en Champagne, la Cie du Courcirkoui, L’Eau Vive en partenariat avec La Verrerie d’Alès, La Centrifugeuse à Pau, Les Quinconces L’Espal – scène nationale du Mans, Centre Culturel Bonnefoy à Toulouse.\n\nSoutiens institutionnels : Le préfet de région – Drac Pays de la Loire, la région des Pays de la Loire'
  },
  {
    id: 'clap',
    title: 'CLAP!',
    company: 'SopaLoca',
    duration: '1h20',
    age: 'Tout public',
    category: 'Spectacle musical',
    programme: 'OFF',
    location: 'Place Sainte-Marie',
    spot: 68,
    color: '#5B6BFA',
    images: ['assets/show-generic.jpg'],
    summary: 'Fini la fanfare ! Les sept membres de SopaLoca, révoltés par leurs conditions de travail d’orchestre de rue, décident de changer de plan de carrière : arrêter la fanfare et faire du...',
    description: 'Fini la fanfare ! Les sept membres de SopaLoca, révoltés par leurs conditions de travail d’orchestre de rue, décident de changer de plan de carrière : arrêter la fanfare et faire du...',
    dates: [
      { date: '10/07', time: '15h00' },
      { date: '11/07', time: '15h00' },
      { date: '12/07', time: '15h00' },
      { date: '13/07', time: '15h00' }
    ]
  },
  {
    id: 'hypothese',
    title: 'Hypothèse',
    company: 'Pudding théâtre',
    duration: '1h20',
    age: 'Tout public',
    category: 'Théâtre de rue',
    programme: 'IN',
    location: 'Place Sainte-Marie',
    spot: 68,
    color: '#FF9F00',
    images: ['assets/show-screenshot.jpg'],
    summary: 'Hypothèse, c’est un spectacle en mouvement qui voyage sur l’échelle du temps et fait se croiser les univers du savoir et de l’imaginaire. Hypothèse, c’est 7 artistes au plateau qui...',
    description: 'Hypothèse, c’est un spectacle en mouvement qui voyage sur l’échelle du temps et fait se croiser les univers du savoir et de l’imaginaire. Hypothèse, c’est 7 artistes au plateau qui...',
    dates: [
      { date: '10/07', time: '9h30' },
      { date: '11/07', time: '9h30' },
      { date: '12/07', time: '9h30' },
      { date: '13/07', time: '9h30' }
    ]
  },
  {
    id: 'singer',
    title: 'FEU MADAME SINGER',
    company: 'Grand colossal théâtre',
    duration: '2h00',
    age: 'Dès 12 ans',
    category: 'Théâtre de rue',
    programme: 'IN',
    location: 'Place Sainte-Marie',
    spot: 68,
    color: '#FF9F00',
    images: ['assets/show-colossal.jpg'],
    summary: 'La série théâtrale La Chienlit retrace l’histoire d’une ville en proie à une grève des éboueurs. Nous suivons l’équipe municipale et les habitants d’un écoquartier… Tous pris dans la tourmente du...',
    description: 'La série théâtrale La Chienlit retrace l’histoire d’une ville en proie à une grève des éboueurs. Nous suivons l’équipe municipale et les habitants d’un écoquartier… Tous pris dans la tourmente du...',
    dates: [
      { date: '10/07', time: '18h00' }
    ]
  }
];

const MENU_ITEMS = [
  { icon: 'assets/chapiteau.png', label: 'Découvrir les lieux du festival' },
  { icon: 'assets/decoration.png', label: 'Découvrir les lieux de convivialité' },
  { icon: 'assets/carte-icon.png', label: 'Découvrir les zones du festival' },
  { icon: 'assets/pierre-rosette.png', label: 'Lire l’histoire du festival' },
  { icon: 'assets/entente.png', label: 'Ils nous soutiennent' },
  { icon: 'assets/internet.png', label: 'Visiter le site officiel' }
];

const SETTINGS_ITEMS = ['Notifications', 'Carte', 'Accessibilité', 'Préférences', 'Changer d’avatar'];

const FILTER_CATEGORIES = Object.keys(FILTER_CATEGORY_COLORS);

const MAP_LAYERS = [
  { icon: 'assets/pitre.png', label: 'Ma position', checked: true },
  { color: '#ED6361', label: 'Spectacles', checked: true },
  { color: '#82FF9D', label: 'Restauration', checked: false },
  { color: '#EB6460', label: 'Buvette', checked: false },
  { color: '#654092', label: 'Lieux du festival', checked: false },
  { color: '#00A7B6', label: 'Lieux de convivialité', checked: false },
  { color: '#3099CD', label: 'Points d’eau', checked: false },
  { color: '#006E95', label: 'Sanitaires', checked: false },
  { color: '#006E95', label: 'Sanitaires accessibles aux PMR', checked: false },
  { color: '#46BDE7', label: 'Douches', checked: false },
  { color: '#46BDE7', label: 'Parking', checked: false },
  { color: '#46BDE7', label: 'Places véhicules réservées aux PMR', checked: false }
];
