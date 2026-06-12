# PoetiKa

PoetiKa es una app de escritura creativa con una estética editorial de papel y un reto rotativo de 3 palabras.

## Estado actual

- El reto cambia cada 5 minutos para testing.
- Las palabras siguen calculándose en local.
- Los usuarios, perfiles, relatos y likes ya persisten en Supabase.
- La app está preparada para desplegarse en Vercel.

## Funcionalidad activa

- Registro e inicio de sesión con Supabase Auth.
- Perfil editable con `display_name`, `username`, bio y avatar URL.
- Publicación de relatos reales asociados al usuario.
- Feed del reto activo con likes persistentes.
- Perfil público accesible desde `/profile?u=username`.

## Variables de entorno

Define estas variables tanto en local como en Vercel:

```bash
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

## Base de datos

La migración `supabase/migrations/20260612_user_portal_and_posts.sql` crea y protege:

- `profiles`
- `stories`
- `story_likes`

Incluye:

- trigger automático para crear perfil al registrarse
- políticas RLS para lectura pública y escritura solo del propietario
- soporte de `username` único

## Desarrollo

```bash
npm install
npm run dev
```

## Verificación

```bash
npx tsc --noEmit
npm run build
```
