# 🚀 Tauri + React Agentic Implementation Plan

## 🎯 Goal

Build a cross-platform (Linux/Windows) desktop application using **Tauri v2**, **React**, and **Tailwind CSS** with a native-integrated **Dark Mode** system.

---

## 🛠 Tech Stack Requirements

* **Backend:** Rust (Tauri v2)
* **Frontend:** React + TypeScript + Vite
* **Styling:** Tailwind CSS (v4)
* **State/Theme:** React Context API + Lucide React for icons

---

## 📍 Milestone 1: Project Initialization

* [ ] **Step 1.1:** Initialize project using `npm create tauri-app@latest`.
* *Settings: Project Name: `my-tauri-app`, Recipe: `React`, Language: `TypeScript`, Package Manager: `npm`.*


* [ ] **Step 1.2:** Install Tailwind CSS and its Vite plugin.
* [ ] **Step 1.3:** Setup `tailwind.config.js` with `darkMode: 'class'`.
* [ ] **Step 1.4:** Verify the dev environment runs with `npm run tauri dev`.

## 📍 Milestone 2: Dark Mode Architecture

* [ ] **Step 2.1:** Create `src/hooks/useTheme.ts` to manage theme state (light/dark/system).
* [ ] **Step 2.2:** Implement a `ThemeProvider` in `src/context/ThemeContext.tsx` that:
* Persists choice to `localStorage`.
* Detects system preference via `window.matchMedia`.
* Injects the `.dark` class into `document.documentElement`.


* [ ] **Step 2.3:** Create a `ThemeToggle` component using `Lucide-React` icons.

## 📍 Milestone 3: Native Window Integration

* [ ] **Step 3.1:** Modify `src-tauri/tauri.conf.json` to allow "transparent" or "vibrant" window effects (distinction between Windows/Linux).
* [ ] **Step 3.2:** Implement a Rust command in `src-tauri/src/lib.rs` to fetch system information (OS version, uptime) to test IPC.
* [ ] **Step 3.3:** Update the React frontend to `invoke` this command and display the data in a themed card.

## 📍 Milestone 4: UI Shell & Styling

* [ ] **Step 4.1:** Build a responsive Sidebar + Main Content layout.
* [ ] **Step 4.2:** Apply `dark:` variants to all components to ensure 100% theme coverage.
* [ ] **Step 4.3:** Add a "Window Drag" region to the top bar so the app can be moved (Tauri-specific `data-tauri-drag-region`).

---

## 🤖 Special Instructions for the Agent

> **Context:** You are a Senior Rust & Frontend Engineer.
> **Rust Guidelines:**
> * Use **Tauri v2** syntax (check `src-tauri/src/lib.rs` for the `run()` function).
> * All Rust commands must return `Result<T, E>` for proper error handling on the frontend.
> * Keep `main.rs` minimal; put logic in `lib.rs`.
> 
> 
> **Frontend Guidelines:**
> * Use functional components and TypeScript interfaces.
> * Prefer **Tailwind** utility classes over custom CSS.
> * Ensure all interactive elements have `:hover` and `:active` states for both themes.
> 
> 
> **Error Handling:**
> * If a shell command fails (e.g., `cargo` not found), report it immediately and ask for user intervention.
