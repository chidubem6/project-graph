Read `AGENTS.md` before starting.

We're adding the design system and UI primitive components.

Install and configure `shadcn/ui`.

Add these shadcn components:
- Button
- Card
- Dialog
- Input
- Tabs
- Textarea
- ScrollArea

Do not modify the generated `components/ui/*` files after installation.

Also Install `lucide-react`.

Use `cn()` for merging Tailwind classes, imported directly from the `cn` package (`import { cn } from "cn"`). Superseded 2026-09-17: this originally specified a `lib/utils.ts` helper, which has been removed.

Ensure all components match the existing dark theme in `globals.css`.

### Check when done
- All components import without errors
- `cn()` works properly
- No default light styling appears