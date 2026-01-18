# Descope SolidJS SDK - Basic Example

This example demonstrates how to use the Descope SolidJS SDK in a SolidStart application.

## Setup

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Add your Descope Project ID to `.env`:

   ```
   VITE_DESCOPE_PROJECT_ID=your-project-id-here
   ```

3. Install dependencies (from the monorepo root):

   ```bash
   pnpm install
   ```

4. Run the development server:

   ```bash
   pnpm --filter solid-sdk-example dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- Login/Signup with Descope flows
- Session management with SolidJS signals
- User profile display
- Logout functionality
- SSR-compatible (client-side auth)
