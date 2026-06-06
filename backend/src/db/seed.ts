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
];

interface SeedTweet {
  author: string;
  content: string;
}

// 50 tweets spread across the 5 accounts (10 each).
const SEED_TWEETS: SeedTweet[] = [
  // martina
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

  // lucas_dev
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

  // sofia_g
  { author: 'sofia_g', content: 'Nueva nota en camino: cómo la IA está cambiando el periodismo. Link pronto.' },
  { author: 'sofia_g', content: 'Lo mejor de cubrir tecnología es que nunca te aburrís.' },
  { author: 'sofia_g', content: 'Entrevista cancelada. La fuente "no puede hablar del tema". Siempre igual 🙃' },
  { author: 'sofia_g', content: 'La desinformación no se combate con más información, se combate con mejor contexto.' },
  { author: 'sofia_g', content: 'Publicado: mi análisis sobre cómo los algoritmos moldean qué noticias vemos. Fue un trabajo largo.' },
  { author: 'sofia_g', content: 'Pregunta para periodistas: ¿cuándo fue la última vez que una historia los sorprendió de verdad?' },
  { author: 'sofia_g', content: 'Buenos Aires de noche, grabadora en mano. Esto es lo que me gusta de este laburo.' },
  { author: 'sofia_g', content: 'El titular tiene que generar una pregunta en la cabeza del lector, no responderla.' },
  { author: 'sofia_g', content: 'Tres años cubriendo startups: la mayoría prometía cambiar el mundo, pocas lo hicieron.' },
  { author: 'sofia_g', content: 'Nuevo episodio del podcast ya disponible. Hablamos de redes, privacidad y el precio de la atención.' },

  // tomas
  { author: 'tomas', content: 'Qué partido del Liverpool, no me quedan uñas 🔴' },
  { author: 'tomas', content: 'Recomiéndenme un juego para el finde, ando sin ideas 🎮' },
  { author: 'tomas', content: 'Baldur\'s Gate 3 sigue siendo el mejor juego de los últimos 10 años. Fight me.' },
  { author: 'tomas', content: 'El Liverpool ganó. Puedo dormir en paz esta semana.' },
  { author: 'tomas', content: '¿Cómo puede ser que siga sin haber una adaptación decente de Ender\'s Game?' },
  { author: 'tomas', content: 'Empecé Cyberpunk 2077 (sí, tarde). El mundo está increíble.' },
  { author: 'tomas', content: 'Noche de campaña en D&D. El dungeon master nos destruyó. Impresionante.' },
  { author: 'tomas', content: 'El Monumental lleno es uno de los mejores espectáculos que existe. Sin discusión.' },
  { author: 'tomas', content: 'Hotdog o sándwich. Esto no es debate, es filosofía.' },
  { author: 'tomas', content: 'Terminé Shogun. No voy a spoilear nada. Solo: vean Shogun.' },

  // valen
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
];

// Likes as [likerUsername, tweetIndex] pairs (index into SEED_TWEETS).
const SEED_LIKES: Array<[string, number]> = [
  ['lucas_dev', 0], ['sofia_g', 0], ['tomas', 0],
  ['valen', 1], ['tomas', 2],
  ['martina', 10], ['sofia_g', 11], ['valen', 13],
  ['lucas_dev', 14], ['tomas', 15],
  ['martina', 20], ['valen', 21], ['lucas_dev', 22],
  ['tomas', 24], ['martina', 25],
  ['sofia_g', 30], ['valen', 31], ['martina', 33],
  ['lucas_dev', 35], ['sofia_g', 36],
  ['tomas', 40], ['martina', 41], ['lucas_dev', 43],
  ['sofia_g', 45], ['tomas', 48],
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
        created_at: new Date(now - i * 3 * 60 * 1000), // 3 min apart, newest first
      })),
    )
    .returning({ id: tweets.id });

  // 3) Follows — full mesh: every demo user follows the other four
  const followRows: Array<{ follower_id: string; following_id: string }> = [];
  for (const follower of insertedUsers) {
    for (const following of insertedUsers) {
      if (follower.id !== following.id) {
        followRows.push({ follower_id: follower.id, following_id: following.id });
      }
    }
  }
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
