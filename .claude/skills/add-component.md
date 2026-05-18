---
name: add-component
description: Scaffold a new React component for the frontend
---

# Add a New Component

When adding a new UI component:

1. Create `frontend/src/components/{category}/{Name}.tsx`:
   - Use function component with TypeScript
   - Use Tailwind CSS for all styling
   - Use motion (framer-motion) for animations where appropriate
   - Follow the warm, scholarly design language (cream/muted blue palette)

2. If the component needs state:
   - Simple local state: useState/useReducer
   - Shared state: Create a hook in `frontend/src/hooks/`
   - Global state: Use zustand store

3. If the component needs API data:
   - Add API function to `frontend/src/lib/api.ts`
   - Create a custom hook in `frontend/src/hooks/`

4. Update the parent page or layout to include the new component

5. Match existing design patterns — serif headings (Playfair Display), sans body (Inter)
