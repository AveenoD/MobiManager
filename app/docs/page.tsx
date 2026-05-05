import { redirect } from 'next/navigation';

/** Friendly URL: `/docs` → API docs (Swagger UI at `/api/docs`). */
export default function DocsAliasPage() {
  redirect('/api/docs');
}
