import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './index.js';
import { users, tweets, follows, likes } from './schema.js';

// Shared password for every demo account (documented in the README).
const DEMO_PASSWORD = 'password123';
const BCRYPT_ROUNDS = 10;

// Sentinel account: if it already exists we assume the demo data is loaded
// and skip, keeping the seed idempotent without wiping manually-created users.
const SENTINEL_USERNAME = 'martina';

interface SeedUser {
  username: string;
  email: string;
  display_name: string;
  bio: string;
}

const SEED_USERS: SeedUser[] = [
  {
    username: 'martina',
    email: 'martina@clontwitter.dev',
    display_name: 'Martina Rossi',
    bio: 'Diseñadora de producto 🎨 | mate y código',
  },
  {
    username: 'lucas_dev',
    email: 'lucas@clontwitter.dev',
    display_name: 'Lucas Fernández',
    bio: 'Full-stack dev. Hablo de JS, fútbol y asados.',
  },
  {
    username: 'sofia_g',
    email: 'sofia@clontwitter.dev',
    display_name: 'Sofía González',
    bio: 'Periodista. Cubriendo tecnología y cultura.',
  },
  {
    username: 'tomas',
    email: 'tomas@clontwitter.dev',
    display_name: 'Tomás Pérez',
    bio: 'Fanático del Liverpool 🔴 | gamer ocasional',
  },
  {
    username: 'valen',
    email: 'valen@clontwitter.dev',
    display_name: 'Valentina Díaz',
    bio: 'Estudiante de ciencia de datos. Curiosa serial.',
  },
  {
    username: 'nicolas_v',
    email: 'nico@clontwitter.dev',
    display_name: 'Nicolás Vargas',
    bio: 'Fotógrafo urbano 📷 | Buenos Aires de noche',
  },
  {
    username: 'carolina_l',
    email: 'caro@clontwitter.dev',
    display_name: 'Carolina López',
    bio: 'Lectora compulsiva. Recomiendo libros que no te van a gustar.',
  },
  {
    username: 'mateo_h',
    email: 'mateo@clontwitter.dev',
    display_name: 'Mateo Herrera',
    bio: 'UX researcher. Entiendo a los usuarios mejor que ellos mismos.',
  },
  {
    username: 'julieta_m',
    email: 'juli@clontwitter.dev',
    display_name: 'Julieta Moreno',
    bio: 'Maratonista amateur 🏃‍♀️ | Comida sana, vida caótica',
  },
  {
    username: 'pablo_c',
    email: 'pablo@clontwitter.dev',
    display_name: 'Pablo Castillo',
    bio: 'Machine learning engineer. Entreno modelos y también mis brazos.',
  },
];

interface SeedTweet {
  author: string;
  content: string;
}

const SEED_TWEETS: SeedTweet[] = [
  // martina (diseño)
  { author: 'martina', content: 'Arranco el día con mate y rediseñando la home. Menos es más 🎨' },
  { author: 'martina', content: 'Tip de diseño: el espacio en blanco no es espacio perdido.' },
  { author: 'martina', content: 'Hoy pasé 3 horas eligiendo una tipografía. No me arrepiento.' },
  { author: 'martina', content: 'El dark mode no es una feature, es una necesidad. Diseñen con los ojos de su usuario a las 2am.' },
  { author: 'martina', content: 'Reunión de diseño en 10 minutos. Spoiler: alguien va a pedir "que sea más moderno".' },
  { author: 'martina', content: 'Figma cayó y el mundo se detuvo por un momento ✨' },
  { author: 'martina', content: 'Recordatorio: el usuario nunca lee. Diseñen para quien escanea, no para quien lee.' },
  { author: 'martina', content: 'Primera vez que un cliente aprueba el diseño sin cambios. Histórico.' },
  { author: 'martina', content: 'El botón tiene que ser más grande. El botón siempre tiene que ser más grande.' },
  { author: 'martina', content: 'Nada como terminar el día sabiendo que el producto quedó mejor de lo que entró 💪' },

  // lucas_dev (dev)
  { author: 'lucas_dev', content: 'Hoy peleándome con un bug que resultó ser un punto y coma. Clásico.' },
  { author: 'lucas_dev', content: 'TypeScript te salva más veces de las que admitís.' },
  { author: 'lucas_dev', content: '¿Asado del finde confirmado? 🔥' },
  { author: 'lucas_dev', content: 'Después de 2 horas debuggeando: era un espacio de más en el nombre de la variable. Amo este trabajo.' },
  { author: 'lucas_dev', content: 'React 19 va a romper todo lo que escribimos. Como siempre. Como debe ser.' },
  { author: 'lucas_dev', content: 'El mejor comentario en código que leí hoy: "// Dios sabe por qué esto funciona".' },
  { author: 'lucas_dev', content: 'npm install lleva 4 minutos. La vida es corta. Usá bun.' },
  { author: 'lucas_dev', content: 'Fútbol y código: los dos te rompen el corazón con un bug en el minuto 90.' },
  { author: 'lucas_dev', content: 'Si tu PR tiene más de 500 líneas, hacelo en partes. Nadie lo va a reviewear bien así.' },
  { author: 'lucas_dev', content: 'Hoy aprendí algo nuevo. Eso sigue siendo lo mejor de este trabajo.' },

  // sofia_g (periodismo)
  { author: 'sofia_g', content: 'Nueva nota en camino: cómo la IA está cambiando el periodismo. Link pronto.' },
  { author: 'sofia_g', content: 'Lo mejor de cubrir tecnología es que nunca te aburrís.' },
  { author: 'sofia_g', content: 'Entrevista cancelada. La fuente "no puede hablar del tema". Siempre igual 🙃' },
  { author: 'sofia_g', content: 'La desinformación no se combate con más información, se combate con mejor contexto.' },
  { author: 'sofia_g', content: 'Publicado: mi análisis sobre cómo los algoritmos moldean qué noticias vemos.' },
  { author: 'sofia_g', content: 'Pregunta para periodistas: ¿cuándo fue la última vez que una historia los sorprendió de verdad?' },
  { author: 'sofia_g', content: 'Buenos Aires de noche, grabadora en mano. Esto es lo que me gusta de este laburo.' },
  { author: 'sofia_g', content: 'El titular tiene que generar una pregunta en la cabeza del lector, no responderla.' },
  { author: 'sofia_g', content: 'Tres años cubriendo startups: la mayoría prometía cambiar el mundo, pocas lo hicieron.' },
  { author: 'sofia_g', content: 'Nuevo episodio del podcast ya disponible. Hablamos de redes, privacidad y el precio de la atención.' },

  // tomas (gaming/fútbol)
  { author: 'tomas', content: 'Qué partido del Liverpool, no me quedan uñas 🔴' },
  { author: 'tomas', content: 'Recomiéndenme un juego para el finde, ando sin ideas 🎮' },
  { author: 'tomas', content: "Baldur's Gate 3 sigue siendo el mejor juego de los últimos 10 años. Fight me." },
  { author: 'tomas', content: 'El Liverpool ganó. Puedo dormir en paz esta semana.' },
  { author: 'tomas', content: "¿Cómo puede ser que siga sin haber una adaptación decente de Ender's Game?" },
  { author: 'tomas', content: 'Empecé Cyberpunk 2077 (sí, tarde). El mundo está increíble.' },
  { author: 'tomas', content: 'Noche de campaña en D&D. El dungeon master nos destruyó. Impresionante.' },
  { author: 'tomas', content: 'El Monumental lleno es uno de los mejores espectáculos que existe. Sin discusión.' },
  { author: 'tomas', content: 'Hotdog o sándwich. Esto no es debate, es filosofía.' },
  { author: 'tomas', content: 'Terminé Shogun. No voy a spoilear nada. Solo: vean Shogun.' },

  // valen (data science)
  { author: 'valen', content: 'Empezando un curso de ciencia de datos. Pandas, allá voy 🐼' },
  { author: 'valen', content: 'Visualizar datos es medio arte y medio matemática.' },
  { author: 'valen', content: 'Pregunta seria: ¿café o mate para programar de noche?' },
  { author: 'valen', content: 'Primer modelo en producción. Pequeño para el mundo, enorme para mí 🤖' },
  { author: 'valen', content: 'El overfitting no es solo un problema de ML. Es también un problema de vida.' },
  { author: 'valen', content: 'Hoy entendí qué es backpropagation de verdad. Solo tardé 3 meses.' },
  { author: 'valen', content: 'Los datos siempre mienten un poco. El trabajo es entender cuánto.' },
  { author: 'valen', content: 'Kaggle competition modo on. Dos días, mucho café, cero sueño ☕' },
  { author: 'valen', content: 'Si tus datos están limpios, desconfiá. Algo estás pasando por alto.' },
  { author: 'valen', content: 'Terminé el curso. Lo que sigue es aplicarlo. Eso da más miedo que el curso.' },

  // nicolas_v (fotografía)
  { author: 'nicolas_v', content: 'Hora dorada en el Riachuelo. La luz era perfecta esta tarde 📷' },
  { author: 'nicolas_v', content: 'Film vs digital: la discusión eterna que nunca voy a ganar.' },
  { author: 'nicolas_v', content: 'Cuatro rollos revelados. Tres fotos salvables. La fotografía analógica es así.' },
  { author: 'nicolas_v', content: 'El mejor momento del día: revisar fotos de noche con un café.' },
  { author: 'nicolas_v', content: 'Buenos Aires tiene una magia particular después de la lluvia.' },
  { author: 'nicolas_v', content: 'Gear no importa si no sabés mirar. Pero igual quiero esa lente.' },
  { author: 'nicolas_v', content: 'Retratando a personas desconocidas en el subte. La ciudad nunca para.' },
  { author: 'nicolas_v', content: 'La foto perfecta existe. Estás cinco segundos tarde siempre.' },
  { author: 'nicolas_v', content: 'Palermo de madrugada, sin turistas. La ciudad que más me gusta.' },
  { author: 'nicolas_v', content: 'Primer exposición propia el mes que viene. Nervios al 100%.' },

  // carolina_l (libros)
  { author: 'carolina_l', content: 'Terminé "Las correcciones" de Franzen. Uf.' },
  { author: 'carolina_l', content: 'La mejor inversión que podés hacer: un buen marcador de páginas.' },
  { author: 'carolina_l', content: 'Releyendo a Borges. Cada vez entiendo menos y disfruto más.' },
  { author: 'carolina_l', content: 'Hay un olor específico de los libros viejos que es básicamente serotonina.' },
  { author: 'carolina_l', content: 'Recomendación: "La uruguaya" de Pedro Mairal. Corta, perfecta.' },
  { author: 'carolina_l', content: '¿Alguien más tiene más libros comprados sin leer que años de vida le quedan?' },
  { author: 'carolina_l', content: 'Feria del libro próxima semana. Presupuesto: $5000. Realidad: $15000.' },
  { author: 'carolina_l', content: 'No existe el "libro difícil". Existe el libro para el que todavía no estás listo.' },
  { author: 'carolina_l', content: 'Salinger a los 20, Salinger a los 30: dos libros completamente distintos.' },
  { author: 'carolina_l', content: 'Recomiéndame el último libro que te dejó sin palabras. Necesito nuevas lecturas.' },

  // mateo_h (research)
  { author: 'mateo_h', content: 'Cinco entrevistas de usuarios en un día. Mi cabeza necesita un reset.' },
  { author: 'mateo_h', content: 'El insight más valioso de hoy: nadie entiende el onboarding. Nadie.' },
  { author: 'mateo_h', content: 'UX tip: preguntá "¿por qué?" cinco veces. Recién ahí vas a entender el problema real.' },
  { author: 'mateo_h', content: 'El mejor test de usabilidad es ver a tu mamá usar el producto.' },
  { author: 'mateo_h', content: 'Presentación de findings hoy. El equipo de producto se quedó callado. Éxito.' },
  { author: 'mateo_h', content: 'Diseñar para el usuario promedio es diseñar para nadie.' },
  { author: 'mateo_h', content: 'Heatmap nuevo del producto. El 90% de los clics van a un botón que queremos eliminar.' },
  { author: 'mateo_h', content: 'Accesibilidad no es un nice-to-have. Es parte del trabajo.' },
  { author: 'mateo_h', content: 'Tres horas de síntesis de research. Pero encontré el patrón que necesitaba.' },
  { author: 'mateo_h', content: 'La empatía es una herramienta de trabajo, no solo una cualidad personal.' },

  // julieta_m (running/fitness)
  { author: 'julieta_m', content: '21k completados esta mañana. Las piernas dicen que no, la cabeza dice que sí 🏃‍♀️' },
  { author: 'julieta_m', content: 'Meal prep domingo. La semana no me va a ganar.' },
  { author: 'julieta_m', content: 'El kilómetro 18 de un maratón es donde el cuerpo negocia con el alma.' },
  { author: 'julieta_m', content: 'Avena con frutas a las 6am. No me pregunten por qué, tampoco lo entiendo.' },
  { author: 'julieta_m', content: 'Lesión en la rodilla. Dos semanas sin correr. Existencial crisis activada.' },
  { author: 'julieta_m', content: 'Primer maratón de Buenos Aires registrada. Seis meses de entrenamiento en juego.' },
  { author: 'julieta_m', content: 'Correr de noche por el Rosedal: experiencia completamente distinta.' },
  { author: 'julieta_m', content: 'Hidratación. Siempre hidratación. Eso es todo lo que tengo para decir hoy.' },
  { author: 'julieta_m', content: 'PR nuevo en los 10k. No lo puedo creer todavía.' },
  { author: 'julieta_m', content: 'El running me enseñó más sobre perseverancia que cualquier libro de autoayuda.' },

  // pablo_c (ML)
  { author: 'pablo_c', content: 'Modelo nuevo en producción. F1-score: 0.94. Buenas noticias para un lunes.' },
  { author: 'pablo_c', content: 'Transformer attention es magia que entendés y no entendés a la vez.' },
  { author: 'pablo_c', content: 'El problema con los LLMs no es la alucinación. Es que confían demasiado en sí mismos.' },
  { author: 'pablo_c', content: 'CUDA out of memory. El villano final de todo proyecto de ML.' },
  { author: 'pablo_c', content: 'Feature engineering bien hecho > modelo complejo mal alimentado.' },
  { author: 'pablo_c', content: 'Revisando papers de 2019 que hoy son "básicos". El campo avanza rápido.' },
  { author: 'pablo_c', content: 'Experimento fallido hoy. Hipótesis incorrecta, pero aprendí el doble.' },
  { author: 'pablo_c', content: 'El bias en datos de entrenamiento no es un bug. Es un reflejo del mundo. Eso es peor.' },
  { author: 'pablo_c', content: 'Gym + modelo de clasificación: los dos me hacen sudar un martes.' },
  { author: 'pablo_c', content: 'Charla de ML mañana. Preparé 40 slides. Voy a usar 15.' },
];

// Follows: each user follows a subset of the others (not all to keep it realistic)
// Format: [followerUsername, followingUsername]
const SEED_FOLLOWS: Array<[string, string]> = [
  // martina follows
  ['martina', 'lucas_dev'], ['martina', 'sofia_g'], ['martina', 'mateo_ux'],
  ['martina', 'caro_reads'], ['martina', 'nico_photo'],
  // lucas_dev follows
  ['lucas_dev', 'martina'], ['lucas_dev', 'tomas'], ['lucas_dev', 'valen'],
  ['lucas_dev', 'pablito_ml'], ['lucas_dev', 'mateo_ux'],
  // sofia_g follows
  ['sofia_g', 'martina'], ['sofia_g', 'lucas_dev'], ['sofia_g', 'caro_reads'],
  ['sofia_g', 'tomas'], ['sofia_g', 'nico_photo'],
  // tomas follows
  ['tomas', 'lucas_dev'], ['tomas', 'sofia_g'], ['tomas', 'juli_runs'],
  ['tomas', 'pablito_ml'], ['tomas', 'valen'],
  // valen follows
  ['valen', 'pablito_ml'], ['valen', 'lucas_dev'], ['valen', 'martina'],
  ['valen', 'mateo_ux'], ['valen', 'sofia_g'],
  // nicolas_v follows
  ['nicolas_v', 'martina'], ['nicolas_v', 'carolina_l'], ['nicolas_v', 'julieta_m'],
  ['nicolas_v', 'sofia_g'], ['nicolas_v', 'mateo_h'],
  // carolina_l follows
  ['carolina_l', 'sofia_g'], ['carolina_l', 'martina'], ['carolina_l', 'nicolas_v'],
  ['carolina_l', 'julieta_m'], ['carolina_l', 'tomas'],
  // mateo_h follows
  ['mateo_h', 'martina'], ['mateo_h', 'lucas_dev'], ['mateo_h', 'valen'],
  ['mateo_h', 'sofia_g'], ['mateo_h', 'pablo_c'],
  // julieta_m follows
  ['julieta_m', 'valen'], ['julieta_m', 'tomas'], ['julieta_m', 'nicolas_v'],
  ['julieta_m', 'carolina_l'], ['julieta_m', 'pablo_c'],
  // pablo_c follows
  ['pablo_c', 'valen'], ['pablo_c', 'lucas_dev'], ['pablo_c', 'mateo_h'],
  ['pablo_c', 'tomas'], ['pablo_c', 'sofia_g'],
];

// Likes as [likerUsername, tweetIndex] pairs (index into SEED_TWEETS)
const SEED_LIKES: Array<[string, number]> = [
  // likes on martina's tweets (0-9)
  ['lucas_dev', 0], ['sofia_g', 0], ['mateo_h', 0],
  ['carolina_l', 1], ['nicolas_v', 2],
  ['tomas', 3], ['valen', 4], ['pablo_c', 5],
  // likes on lucas_dev's tweets (10-19)
  ['martina', 10], ['sofia_g', 11], ['valen', 13],
  ['pablo_c', 14], ['tomas', 15], ['mateo_h', 16],
  // likes on sofia_g's tweets (20-29)
  ['martina', 20], ['valen', 21], ['lucas_dev', 22],
  ['tomas', 24], ['carolina_l', 25], ['nicolas_v', 27],
  // likes on tomas's tweets (30-39)
  ['sofia_g', 30], ['valen', 31], ['martina', 33],
  ['lucas_dev', 35], ['julieta_m', 36], ['pablo_c', 38],
  // likes on valen's tweets (40-49)
  ['pablo_c', 40], ['martina', 41], ['lucas_dev', 43],
  ['mateo_h', 45], ['tomas', 48],
  // likes on nicolas_v's tweets (50-59)
  ['martina', 50], ['sofia_g', 51], ['carolina_l', 52],
  ['mateo_h', 54], ['julieta_m', 55],
  // likes on carolina_l's tweets (60-69)
  ['sofia_g', 60], ['martina', 62], ['nicolas_v', 64],
  ['tomas', 65], ['julieta_m', 67],
  // likes on mateo_h's tweets (70-79)
  ['martina', 70], ['lucas_dev', 71], ['valen', 72],
  ['sofia_g', 74], ['pablo_c', 76],
  // likes on julieta_m's tweets (80-89)
  ['tomas', 80], ['valen', 81], ['nicolas_v', 83],
  ['carolina_l', 85], ['pablo_c', 88],
  // likes on pablo_c's tweets (90-99)
  ['valen', 90], ['lucas_dev', 91], ['mateo_h', 92],
  ['tomas', 94], ['sofia_g', 96],
];

export async function seed(): Promise<void> {
  const sentinel = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, SENTINEL_USERNAME))
    .limit(1);

  if (sentinel.length > 0) {
    console.log('[seed] Seed skipped: demo data already present.');
    return;
  }

  const password_hash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  // 1) Users
  const insertedUsers = await db
    .insert(users)
    .values(
      SEED_USERS.map((u) => ({
        username: u.username,
        email: u.email,
        password_hash,
        display_name: u.display_name,
        bio: u.bio,
      })),
    )
    .returning({ id: users.id, username: users.username });

  const userIdByUsername = new Map(insertedUsers.map((u) => [u.username, u.id]));

  // 2) Tweets — stagger created_at so the timeline ordering looks natural
  const now = Date.now();
  const insertedTweets = await db
    .insert(tweets)
    .values(
      SEED_TWEETS.map((t, i) => ({
        user_id: userIdByUsername.get(t.author)!,
        content: t.content,
        created_at: new Date(now - i * 3 * 60 * 1000), // 3 min apart
      })),
    )
    .returning({ id: tweets.id });

  // 3) Follows
  const followRows = SEED_FOLLOWS.map(([follower, following]) => ({
    follower_id: userIdByUsername.get(follower)!,
    following_id: userIdByUsername.get(following)!,
  }));
  await db.insert(follows).values(followRows);

  // 4) Likes
  const likeRows = SEED_LIKES.map(([username, tweetIndex]) => ({
    user_id: userIdByUsername.get(username)!,
    tweet_id: insertedTweets[tweetIndex].id,
  }));
  await db.insert(likes).values(likeRows);

  console.log(
    `[seed] Seeded ${insertedUsers.length} users, ${insertedTweets.length} tweets, ` +
      `${followRows.length} follows, ${likeRows.length} likes. ` +
      `Login with any demo email (e.g. "${SEED_USERS[0].email}") / password "${DEMO_PASSWORD}".`,
  );
}

// Run directly when executed as a script
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed.ts')) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] Seed failed:', err);
      process.exit(1);
    });
}
