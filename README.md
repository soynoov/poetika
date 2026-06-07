# PoetiKa

PoetiKa es una plataforma de escritura creativa donde cada día se publica un reto nuevo con 3 palabras sacadas de 3 categorías distintas. La idea es convertir la escritura corta en una experiencia social, rápida y competitiva.

## Qué hace

- Genera un reto diario con 3 palabras aleatorias.
- Guarda las palabras en Supabase para que se puedan crear, editar, desactivar o eliminar.
- Persiste el reto diario para que se mantenga estable durante 24 horas.
- Muestra una home editorial con el reto activo, el feed de relatos y acceso al perfil.
- Está pensada para desplegarse en Vercel.

## Cómo funciona el reto diario

1. Las palabras viven en una base de datos.
2. Cada palabra pertenece a una categoría.
3. Una vez al día se seleccionan 3 palabras de 3 categorías distintas.
4. Esa combinación se guarda como el reto del día.
5. La web lee ese reto y lo muestra en la home y en la pantalla del desafío.

## Estructura del proyecto

- `src/pages/`: páginas públicas del sitio.
- `src/components/`: bloques reutilizables de la interfaz.
- `src/lib/`: cliente y lógica de datos.
- `supabase/migrations/`: esquema SQL de la base de datos.
- `.codex/poetika.md`: notas internas de desarrollo.

## Stack

- Astro
- TypeScript
- Tailwind CSS
- Supabase

## Variables de entorno

Necesitas definir estas variables para conectar la app con Supabase:

```bash
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

## Base de datos

La migración principal crea:

- `challenge_categories`
- `challenge_words`
- `daily_challenges`
- la función `get_daily_challenge(requested_date)`

## Desarrollo

```bash
npm install
npm run dev
```

## Publicación

El proyecto está preparado para publicarse en Vercel usando el repositorio de GitHub y las variables de entorno de Supabase.

## Estado

En desarrollo activo.
