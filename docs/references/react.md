# React 19 — Official Reference

> **Version in use**: `19.2.x`
> **Official docs**: https://react.dev

---

## Key Docs Links

| Topic | URL |
|---|---|
| Quick Start | https://react.dev/learn |
| Thinking in React | https://react.dev/learn/thinking-in-react |
| Server Components | https://react.dev/reference/rsc/server-components |
| Server Actions (`use server`) | https://react.dev/reference/rsc/server-actions |
| Hooks Reference | https://react.dev/reference/react/hooks |
| `useState` | https://react.dev/reference/react/useState |
| `useEffect` | https://react.dev/reference/react/useEffect |
| `useTransition` | https://react.dev/reference/react/useTransition |
| `use` (React 19) | https://react.dev/reference/react/use |
| `useFormStatus` | https://react.dev/reference/react-dom/hooks/useFormStatus |
| `useActionState` | https://react.dev/reference/react/useActionState |
| `<form>` Actions | https://react.dev/reference/react-dom/components/form |
| Context API | https://react.dev/reference/react/createContext |
| `<Suspense>` | https://react.dev/reference/react/Suspense |
| Error Boundaries | https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary |

---

## React 19 Key Features Used in Dilnova

1. **Server Components** — Default rendering mode in Next.js App Router
2. **Server Actions** — Form submissions via `'use server'` functions
3. **`useActionState`** — Form state management for server actions
4. **`useFormStatus`** — Pending state for form submissions
5. **`use()`** — Reading promises and context in render

---

## Common Patterns

### Client Component
```tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Form with Server Action
```tsx
'use client';

import { useActionState } from 'react';
import { submitForm } from './actions';

export function MyForm() {
  const [state, formAction, isPending] = useActionState(submitForm, null);

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <button disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit'}
      </button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```
