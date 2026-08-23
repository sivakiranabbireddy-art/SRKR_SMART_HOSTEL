/**
 * Master repository of 36 student hobbies and interests across various categories
 */
const HOBBIES_DATABASE = [
  // Tech & Coding
  'Competitive Coding',
  'Web & App Development',
  'AI & Machine Learning',
  'Cybersecurity & Ethical Hacking',
  'Robotics & Arduino',
  'Game Development & 3D Modeling',

  // Sports & Fitness
  'Cricket',
  'Football / Soccer',
  'Badminton',
  'Basketball',
  'Table Tennis',
  'Gym & Weightlifting',
  'Running & Marathon',
  'Swimming',
  'Yoga & Meditation',

  // Creative & Arts
  'Photography & Videography',
  'Guitar & Music Production',
  'Singing & Vocals',
  'Sketching & Digital Art',
  'Creative Writing & Poetry',
  'Cooking & Culinary Arts',
  'Blogging & Podcasting',

  // Entertainment & Gaming
  'Video Games & Esports',
  'Anime & Manga',
  'Sci-Fi & Fantasy Novels',
  'Watching Movies & Web Series',
  'Chess & Strategy Games',
  'Board Games & Rubik\'s Cube',

  // Social, Outdoor & Lifestyle
  'Traveling & Backpacking',
  'Trekking & Hiking',
  'Astronomy & Stargazing',
  'Stock Market & Crypto Trading',
  'Debating & Public Speaking',
  'Volunteering & Community Service',
  'Book Club & Reading',
  'Stand-up Comedy & Theater',
];

/**
 * Returns n randomly sampled hobbies from the database
 */
function getRandomHobbies(count = 5) {
  const shuffled = [...HOBBIES_DATABASE].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

module.exports = {
  HOBBIES_DATABASE,
  getRandomHobbies,
};
