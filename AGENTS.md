# Coding Standards for kiosko-pos

This document defines the quality guidelines and coding standards that must be verified on every commit.

## 1. React & Component Architecture
* **Functional Components**: Always use functional components and hooks. Avoid class components.
* **Component Responsibility**: Keep components single-purpose. Separate complex logic into custom hooks if a component exceeds 150 lines.
* **JSX Formatting**: Keep JSX clean, readable, and properly indented. Use semantic HTML tags (`<header>`, `<main>`, `<section>`, `<article>`, `<nav>`, `<footer>`) instead of generic `<div>`s where applicable.

## 2. State Management (Zustand)
* **Selective Subscriptions**: When consuming state from a Zustand store, prefer selectors instead of destructuring the entire hook to prevent unnecessary re-renders.
  * *Recommended:* `const carrito = useCarritoStore(state => state.carrito)`
  * *Avoid:* `const { carrito } = useCarritoStore()` (unless the component needs almost all values from the store)
* **Actions Separation**: Keep store actions defined inside the store. Do not mutate the store state directly from components.

## 3. Styling & Tailwind CSS
* **Utility Classes**: Use Tailwind CSS utility classes consistently.
* **Responsive Design**: Ensure mobile-first styling using Tailwind breakpoints (`sm:`, `md:`, `lg:`).
* **Class Ordering**: Keep classes grouped logically (e.g., Layout/Flexbox -> Spacing -> Sizing -> Typography -> Backgrounds -> Borders -> Effects/Interactions).

## 4. Code Quality & Syntax
* **Immutability**: Never mutate state or arrays directly. Use non-mutating methods like `.map()`, `.filter()`, and array/object spread syntax.
* **Constants**: Place configuration, quick-list products, and magic numbers in separate constant files or at the top of the file in `UPPER_SNAKE_CASE`.
* **TypeScript & JavaScript**: Use modern ES6+ features (const/let, destructuring, optional chaining `?.`, nullish coalescing `??`).
